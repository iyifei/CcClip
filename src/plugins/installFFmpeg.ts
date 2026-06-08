import FFManager from '@/utils/ffmpegManager';
import type { App } from 'vue';

const installFFmpeg = {
    install(app: App) {
        // 注册全局ffmpeg接口
        const ffmpegIns = new FFManager({
            Hooks: {
                beforeInit: () => {
                    app.config.globalProperties.$ElLoading.visible.value = true;
                },
                afterInit: () => {
                    app.config.globalProperties.$ElLoading.visible.value = false;
                }
            }
        });
        // SharedArrayBuffer 不可用时（如 iframe 未设置 COOP/COEP）跳过 FFmpeg 初始化
        // 我们的流程中视频编码由后端 FFmpeg 处理，前端 FFmpeg 仅用于本地预览，非必须
        if (typeof SharedArrayBuffer === 'undefined') {
            console.warn('[FFmpeg] SharedArrayBuffer 不可用，跳过 FFmpeg 初始化。如需本地预览，请确保页面设置了 COOP/COEP 响应头。');
            app.config.globalProperties.$ElLoading.visible.value = false;
        } else {
            ffmpegIns.init().catch((err: any) => {
                console.error('[FFmpeg] 初始化失败:', err);
                app.config.globalProperties.$ElLoading.visible.value = false;
            });
        }
        app.provide('ffmpeg', ffmpegIns);
        console.log(ffmpegIns);
    }
};
export default installFFmpeg;