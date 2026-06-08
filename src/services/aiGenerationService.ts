/**
 * AI 生成服务
 * 处理 AI 视频生成的完整流程
 */

import { submitByArticle, getTaskProgress, getTimelinePreview } from '@/api/backendApi';
import { useProjectState } from '@/stores/projectState';
import { useTrackState } from '@/stores/trackState';
import { useTrackAttrState } from '@/stores/trackAttribute';
import { fromTimelinePreview } from '@/utils/timelineConverter';

/**
 * 通知父页面（通过 postMessage）
 * @param event 事件名称
 * @param data 事件数据
 */
export function notifyParent(event: string, data?: any) {
  if (window.parent !== window) {
    window.parent.postMessage({ source: 'ccclip', event, data }, '*');
  }
}

/**
 * 根据文章ID启动 AI 生成任务
 * @param articleId 文章 ID
 * @param audioSource 音频来源
 */
export async function startFromArticle(articleId: number, audioSource?: string): Promise<void> {
  const projectState = useProjectState();
  const trackState = useTrackState();
  const trackAttribute = useTrackAttrState();

  projectState.reset();
  projectState.setArticleId(articleId);
  projectState.setStatus('submitting');

  /**
   * 加载时间线数据
   */
  async function loadTimelineData() {
    const taskUuid = projectState.taskUuid;
    if (!taskUuid) return;

    try {
      const result = await getTimelinePreview(taskUuid);

      if (result.status !== 0 || !result.data) {
        throw new Error(result.message || '加载时间线失败');
      }

      const preview = result.data;

      // 转换为 CcClip 格式
      const { trackList, trackAttrMap } = fromTimelinePreview(preview);

      // 更新 store
      trackState.trackList.length = 0;
      trackList.forEach(item => trackState.trackList.push(item));

      // 更新属性
      Object.keys(trackAttribute.trackAttrMap).forEach(key => {
        delete trackAttribute.trackAttrMap[key];
      });
      Object.assign(trackAttribute.trackAttrMap, trackAttrMap);
    } catch (error: any) {
      projectState.setError(error.message || '加载时间线失败');
    }
  }

  /**
   * 轮询一次进度
   */
  async function pollProgress() {
    const taskUuid = projectState.taskUuid;
    if (!taskUuid) return;

    try {
      const result = await getTaskProgress(taskUuid);

      if (result.status !== 0 || !result.data) {
        throw new Error(result.message || '查询进度失败');
      }

      const data = result.data;
      projectState.setProgress(data.progress, data.currentStage);

      switch (data.status) {
        case 'COMPLETED':
          projectState.stopPolling();
          projectState.setResult(data.fileName || '');
          // 通知父页面
          notifyParent('generation-complete', { fileName: data.fileName });
          break;

        case 'WAITING_CONFIRM':
          projectState.stopPolling();
          projectState.setStatus('waiting_confirm');
          // 加载时间线数据
          await loadTimelineData();
          break;

        case 'FAILED':
          projectState.stopPolling();
          projectState.setError(data.errorMessage || '任务失败');
          break;

        default:
          // 继续轮询
          break;
      }
    } catch (error: any) {
      console.error('轮询进度失败:', error);
      // 不中断轮询，继续重试
    }
  }

  try {
    // 1. 提交任务
    const result = await submitByArticle({
      articleId,
      audioSource: audioSource || 'final',
      aspectRatio: 'VERTICAL'
    });

    if (result.status !== 0 || !result.data?.taskUuid) {
      throw new Error(result.message || result.error || '任务提交失败');
    }

    projectState.setTaskUuid(result.data.taskUuid);
    projectState.setStatus('processing');

    // 2. 开始轮询进度
    projectState.startPolling(pollProgress);
  } catch (error: any) {
    projectState.setError(error.message || '任务提交失败');
  }
}
