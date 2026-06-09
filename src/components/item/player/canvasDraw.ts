import { usePlayerState } from '@/stores/playerState';
import { useTrackAttrState } from '@/stores/trackAttribute';
import type FFManager from '@/utils/ffmpegManager';
import { computedItemShowArea, isVideo } from '@/utils/common';
import { watch, ref, reactive, onMounted } from 'vue';
import { throttle } from 'lodash-es';
import type { Ref } from 'vue';
export class CanvasPlayer {
    player: Ref<HTMLCanvasElement>; // 播放器
    playerContext: CanvasRenderingContext2D | null = null;
    renderContext: CanvasRenderingContext2D | null = null;
    renderPlayer: HTMLCanvasElement = document.createElement('canvas'); // 预渲染播放器
    playerStore: Record<string, any>;
    attrStore: Record<string, any>;
    containerSize: Record<string, any>;
    ffmpeg: FFManager;
    imageCache = new Map<string, Promise<HTMLImageElement>>();
    loading = ref(true);
    canvasSize = reactive({
        width: 0,
        height: 0
    });
    textOptions = {
        // eslint-disable-next-line
        textBaseline: 'middle' as 'middle',
        // eslint-disable-next-line
        textAlign: 'center' as 'center',
        bgColor: '#111827'
    };
    constructor(options: Record<string, any>) {
        this.ffmpeg = options.ffmpeg;
        this.player = options.player;
        this.containerSize = options.containerSize;
        this.playerStore = usePlayerState();
        this.attrStore = useTrackAttrState();
        this.initWatch();
    }
    async initPlayer() {
        this.loading.value = true;
        // FFmpeg 不可用时（iframe 嵌入场景），跳过 canvas 绘制但解除 loading 状态
        if (!this.ffmpeg.isLoaded.value) {
            this.loading.value = false;
            return;
        }
        if (this.playerStore.ingLoadingCount === 0) {
            this.drawCanvas();
            this.loading.value = false;
        }
    }
    initContent() {
        this.playerContext = this.player.value.getContext('2d');
        this.renderContext = this.renderPlayer.getContext('2d');
        if (this.renderContext) {
            this.renderContext.font = this.getFont();
            this.renderContext.textBaseline = this.textOptions.textBaseline;
            this.renderContext.textAlign = this.textOptions.textAlign;
        }
    }
    getFont(size = 14) {
        return `${size}px -apple-system, ".SFNSText-Regular", "SF UI Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", "WenQuanYi Zen Hei", "Microsoft YaHei", Arial, sans-serif`;
    }
    initWatch() {
        onMounted(() => {
            this.initContent();
        });
        // 属性变化后重新渲染
        watch([this.attrStore.trackAttrMap, () => this.playerStore.playTargetTrackMap, () => this.canvasSize], throttle(async() => this.drawCanvas(), 30), { deep: true });
        // 容器大小变化
        watch([this.containerSize, () => this.playerStore.playerWidth, () => this.playerStore.playerHeight], () => {
            let { width: containerW, height: containerH } = this.containerSize;
            containerH -= 96; // 上下功能栏
            containerW -= 16; // 左右功能栏
            this.updateCanvasSize({ width: containerW, height: containerH });
        });
        // 前置依赖加载完成
        watch([this.ffmpeg.isLoaded, () => this.playerStore.ingLoadingCount], () => this.initPlayer(), {
            flush: 'post',
            immediate: true
        });
        watch(() => this.playerStore.playStartFrame, async() => this.drawCanvas());
    }
    // 更新尺寸
    updateCanvasSize({ width, height }: Record<string, number>) {
        const { playerWidth, playerHeight } = this.playerStore;
        const scaleWidth = playerWidth !== 0 ? Math.floor(height / playerHeight * playerWidth) : width; // 等高情况下的宽度
        const scaleHeight = playerHeight !== 0 ? Math.floor(width / playerWidth * playerHeight) : height; // 等宽情况啊下的高度
        const canvasWidth = Math.min(scaleWidth, width);
        const canvasHeight = Math.min(scaleHeight, height);
        if (this.canvasSize.width !== canvasWidth || this.canvasSize.height !== canvasHeight) {
            this.canvasSize.width = canvasWidth;
            this.canvasSize.height = canvasHeight;
            this.player.value.width = canvasWidth;
            this.player.value.height = canvasHeight;
            this.renderPlayer.width = canvasWidth;
            this.renderPlayer.height = canvasHeight;
        }
    }
    clearCanvas() {
        if (this.renderContext) {
            this.renderContext.fillStyle = this.textOptions.bgColor;
            this.renderContext.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
        }
    }
    // 绘制
    async drawCanvas() {
        if (this.playerStore.ingLoadingCount !== 0) return;

        // FFmpeg 不可用时，绘制背景色和提示文字
        if (!this.ffmpeg.isLoaded.value) {
            this.clearCanvas();
            if (this.renderContext) {
                this.renderContext.fillStyle = '#666';
                this.renderContext.font = this.getFont(16);
                this.renderContext.textAlign = 'center';
                this.renderContext.textBaseline = 'middle';
                this.renderContext.fillText(
                    'FFmpeg 未加载，视频预览不可用',
                    this.canvasSize.width / 2,
                    this.canvasSize.height / 2
                );
            }
            await this.drawToPlayerCanvas();
            return;
        }

        const videoList: Array<any> = [];
        const imageList: Array<any> = [];
        const overlayList: Array<any> = [];
        const textList: Array<any> = [];
        this.playerStore.playTargetTrackMap.forEach((trackItem: Record<string, any>, id: number) => {
            if (this.attrStore.trackAttrMap[id]) {
                const { type } = trackItem;
                const drawTask = () => this.drawToRenderCanvas(trackItem, id, this.playerStore.playStartFrame);
                if (isVideo(type)) {
                    videoList.push(drawTask);
                } else if (type === 'image') {
                    imageList.push(drawTask);
                } else if (type === 'text') {
                    textList.push(drawTask);
                } else {
                    overlayList.push(drawTask);
                }
            }
        });
        this.clearCanvas();
        await videoList.reduce((chain, nextPromise) => chain.then(() => nextPromise()).catch(() => {}), Promise.resolve());
        await imageList.reduce((chain, nextPromise) => chain.then(() => nextPromise()).catch(() => {}), Promise.resolve());
        await overlayList.reduce((chain, nextPromise) => chain.then(() => nextPromise()).catch(() => {}), Promise.resolve());
        await textList.reduce((chain, nextPromise) => chain.then(() => nextPromise()).catch(() => {}), Promise.resolve());
        await this.drawToPlayerCanvas();
    }
    // 预渲染canvas先加载
    drawToRenderCanvas(trackItem: Record<string, any>, id: number, frameIndex: number) {
        return new Promise(resolve => {
            const { sourceWidth, sourceHeight, drawL, drawT, drawW, drawH } = this.computedRect(trackItem, id);
            const { type, start, end, offsetL, name, sourceFrame } = trackItem;
            if (frameIndex > end) {
                resolve(true);
            } else if (isVideo(type)) {
                const frame = Math.max(frameIndex - start + offsetL, 1); // 默认展示首帧
                try {
                    const blobFrame = this.ffmpeg.getFrame(name, frame);
                    createImageBitmap(blobFrame as Blob).then(imageBitmap => {
                        this.renderContext?.drawImage(imageBitmap, 0, 0, sourceWidth, sourceHeight, drawL, drawT, drawW, drawH);
                        resolve(true);
                    })
.catch(() => resolve(true));
                } catch {
                    resolve(true);
                }
            } else if (type === 'image') {
                this.loadImage(trackItem.source).then(image => {
                    const sourceRatio = image.naturalWidth / image.naturalHeight;
                    const targetRatio = drawW / drawH;
                    let sourceX = 0;
                    let sourceY = 0;
                    let cropWidth = image.naturalWidth;
                    let cropHeight = image.naturalHeight;
                    if (sourceRatio > targetRatio) {
                        cropWidth = image.naturalHeight * targetRatio;
                        sourceX = (image.naturalWidth - cropWidth) / 2;
                    } else {
                        cropHeight = image.naturalWidth / targetRatio;
                        sourceY = (image.naturalHeight - cropHeight) / 2;
                    }
                    this.renderContext?.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, drawL, drawT, drawW, drawH);
                    resolve(true);
                })
.catch(() => resolve(true));
            } else if (type === 'text') {
                const {
                    text = this.attrStore.trackAttrMap[id]?.content || '',
                    color = { r: 255, g: 255, b: 255, a: 1 },
                    fontSize = 40,
                    outlineColor = { r: 0, g: 0, b: 0, a: 0.9 },
                    outlineWidth = 3
                } = this.attrStore.trackAttrMap[id] || {};
                if (this.renderContext) {
                    if (!text) {
                        resolve(true);
                        return;
                    }
                    this.renderContext.font = this.getFont(fontSize);
                    this.renderContext.textAlign = 'center';
                    this.renderContext.textBaseline = 'middle';
                    this.renderContext.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
                    this.renderContext.strokeStyle = `rgba(${outlineColor.r},${outlineColor.g},${outlineColor.b},${outlineColor.a})`;
                    this.renderContext.lineWidth = outlineWidth;
                    this.renderContext.lineJoin = 'round';
                    const centerX = drawL + drawW / 2;
                    const centerY = drawT + drawH / 2;
                    const lines = this.wrapText(text, this.canvasSize.width * 0.9);
                    const lineHeight = fontSize * 1.2;
                    const firstLineY = centerY - (lines.length - 1) * lineHeight / 2;
                    lines.forEach((line, index) => {
                        const lineY = firstLineY + index * lineHeight;
                        if (outlineWidth > 0) {
                            this.renderContext?.strokeText(line, centerX, lineY);
                        }
                        this.renderContext?.fillText(line, centerX, lineY);
                    });
                }
                resolve(true);
            } else {
                resolve(true);
            }
        });
    }
    wrapText(text: string, maxWidth: number) {
        if (!this.renderContext || !text) return [];

        const lines: string[] = [];
        let currentLine = '';
        for (const character of text) {
            const nextLine = currentLine + character;
            if (currentLine && this.renderContext.measureText(nextLine).width > maxWidth) {
                lines.push(currentLine);
                currentLine = character;
            } else {
                currentLine = nextLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
    loadImage(source: string) {
        const cached = this.imageCache.get(source);
        if (cached) return cached;

        const pending = new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
        });
        this.imageCache.set(source, pending);
        pending.catch(() => this.imageCache.delete(source));
        return pending;
    }
    // 将预渲染好的canvas进行渲播放器渲染
    async drawToPlayerCanvas() {
        return new Promise(resolve => {
            this.playerContext?.drawImage(this.renderPlayer, 0, 0, this.canvasSize.width, this.canvasSize.height, 0, 0, this.canvasSize.width, this.canvasSize.height);
            resolve(true);
        });
    }
    /**
     * 预抽帧
     * */
    async preGenFrame() {
        return new Promise(resolve => {
            this.playerStore.isPause && (this.loading.value = true);
            const promiseList: Array<any> = [];
            this.playerStore.playTargetTrackMap.forEach((trackItem: Record<string, any>, id: number) => {
                if (isVideo(trackItem.type)) {
                    const { name, format, width, height, start } = trackItem;
                    const diffFrame = this.playerStore.playStartFrame - start;
                    const targetTime = Math.floor(diffFrame / 30);
                    promiseList.push(() => this.ffmpeg.genPlayFrame(name, format, {
                        w: width,
                        h: height
                    }, targetTime)); // 预加载当前秒
                    promiseList.push(() => this.ffmpeg.genPlayFrame(name, format, {
                        w: width,
                        h: height
                    }, targetTime + 1)); // 预加载 + 1秒
                    promiseList.push(() => this.ffmpeg.genPlayFrame(name, format, {
                        w: width,
                        h: height
                    }, targetTime + 2)); // 预加载 + 2秒
                }
            });
            promiseList.push(() => resolve(true));
            promiseList.reduce((chain, nextPromise) => chain.then(() => {
                return nextPromise();
            }), Promise.resolve());
            this.playerStore.isPause && (this.loading.value = false);
        });
    }
    // 计算渲染区域
    computedRect(trackItem: Record<string, any>, id: number) {
        return computedItemShowArea(trackItem, this.canvasSize, this.attrStore.trackAttrMap[id]);
    }
}
