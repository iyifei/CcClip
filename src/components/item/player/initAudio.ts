import { watch, ref, reactive, inject, toRaw } from 'vue';
import type { Ref } from 'vue';
import { usePlayerState } from '@/stores/playerState';
import type FFManager from '@/utils/ffmpegManager';
import { useTrackAttrState } from '@/stores/trackAttribute';
import { debounce } from 'lodash-es';

export function audioSetup(ffmLoading: Ref<boolean>) {
    const ffmpeg = inject('ffmpeg') as FFManager;
    const audio = ref();
    const audioLoading = ref(true);
    const audioInfo = reactive({
        start: -1,
        end: -1
    });
    const store = usePlayerState();
    const attrStore = useTrackAttrState();
    let syncAnimationFrame = 0;
    function setTime(playStartFrame: number) {
        const audioTime = Math.max((playStartFrame - audioInfo.start) / 30, 0);
        if (audio.value && Math.abs(audio.value.currentTime - audioTime) > 0.15) {
            audio.value.currentTime = audioTime;
        }
    }
    function syncVideoToAudio() {
        if (!audio.value || store.isPause) return;
        store.playStartFrame = Math.min(
            Math.round(audioInfo.start + audio.value.currentTime * 30),
            store.frameCount
        );
        if (audio.value.ended || store.playStartFrame >= store.frameCount) {
            store.isPause = true;
            return;
        }
        syncAnimationFrame = requestAnimationFrame(syncVideoToAudio);
    }
    const getAudio = debounce(async() => {
        const playableTracks = store.audioPlayData;
        const directAudio = playableTracks.length === 1 && playableTracks[0].type === 'audio'
            ? playableTracks[0]
            : null;
        const audioResult = directAudio?.source
            ? { start: directAudio.start, end: directAudio.end, audioUrl: directAudio.source }
            : await ffmpeg.getAudio(playableTracks, toRaw(attrStore.trackAttrMap));
        const { start, end, audioUrl } = audioResult;
        audioInfo.start = start;
        audioInfo.end = end;
        const resolvedUrl = new URL(audioUrl, window.location.href).href;
        if (audio.value.src !== resolvedUrl) {
            audio.value.src = audioUrl;
            audio.value.preload = 'auto';
        }
        setTime(store.playStartFrame);
    }, 100);
    // 音频初始化
    async function initAudio() {
        audioLoading.value = true;
        if (ffmpeg.isLoaded.value && store.ingLoadingCount === 0 && !ffmLoading.value) {
            if (store.audioPlayData.length > 0) {
                getAudio();
            } else {
                audio.value.src = '';
            }
            audioLoading.value = false;
        }
    }
    watch(
        [ffmpeg.isLoaded, () => store.ingLoadingCount, ffmLoading],
        initAudio,
        { immediate: true, flush: 'post' }
    );
    watch(() => store.audioPlayData, newData => {
        if (newData.length > 0 && ffmpeg.isLoaded.value && store.ingLoadingCount === 0) {
            getAudio();
        }
    }, { deep: true });
    watch(() => store.isPause, () => {
        if (store.isPause) {
            cancelAnimationFrame(syncAnimationFrame);
            audio.value.pause();
        } else {
            setTime(store.playStartFrame);
            audio.value.play().then(() => {
                cancelAnimationFrame(syncAnimationFrame);
                syncAnimationFrame = requestAnimationFrame(syncVideoToAudio);
            })
.catch(() => {
                store.isPause = true;
            });
        }
    });
    // 播放跳转时间
    watch(() => store.playAudioFrame, () => {
        setTime(store.playAudioFrame);
    });
    return {
        audio,
        audioLoading
    };
}
