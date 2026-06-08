/**
 * 项目状态管理
 * 管理 AI 生成任务的完整生命周期
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ProjectStatus = 'idle' | 'submitting' | 'processing' | 'waiting_confirm' | 'exporting' | 'completed' | 'failed';

export const useProjectState = defineStore('projectState', () => {
  const status = ref<ProjectStatus>('idle');
  const taskUuid = ref<string>('');
  const progress = ref(0);
  const currentStage = ref('');
  const errorMessage = ref('');
  const articleId = ref<number | null>(null);
  const videoTitle = ref('');
  const resultFileName = ref('');

  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  const isProcessing = computed(() => status.value === 'processing');
  const isWaitingConfirm = computed(() => status.value === 'waiting_confirm');
  const isCompleted = computed(() => status.value === 'completed');
  const isExporting = computed(() => status.value === 'exporting');
  const isFailed = computed(() => status.value === 'failed');

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  function setStatus(newStatus: ProjectStatus) {
    status.value = newStatus;
  }

  function setTaskUuid(uuid: string) {
    taskUuid.value = uuid;
  }

  function setArticleId(id: number) {
    articleId.value = id;
  }

  function setVideoTitle(title: string) {
    videoTitle.value = title;
  }

  function setProgress(value: number, stage: string) {
    progress.value = value;
    currentStage.value = stage;
  }

  function setError(message: string) {
    errorMessage.value = message;
    status.value = 'failed';
  }

  function setResult(fileName: string) {
    resultFileName.value = fileName;
    status.value = 'completed';
  }

  function reset() {
    status.value = 'idle';
    taskUuid.value = '';
    progress.value = 0;
    currentStage.value = '';
    errorMessage.value = '';
    resultFileName.value = '';
    stopPolling();
  }

  function startPolling(pollFn: () => Promise<void>) {
    stopPolling();
    pollingTimer = setInterval(pollFn, 2000);
  }

  return {
    status,
    taskUuid,
    progress,
    currentStage,
    errorMessage,
    articleId,
    videoTitle,
    resultFileName,
    isProcessing,
    isWaitingConfirm,
    isCompleted,
    isExporting,
    isFailed,
    setStatus,
    setTaskUuid,
    setArticleId,
    setVideoTitle,
    setProgress,
    setError,
    setResult,
    reset,
    startPolling,
    stopPolling
  };
});
