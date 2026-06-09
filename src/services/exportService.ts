/**
 * 导出服务
 * 处理视频导出的完整流程
 */

import { confirmTimeline, getTaskProgress, getDownloadUrl } from '@/api/backendApi';
import { useProjectState } from '@/stores/projectState';
import { useTrackState } from '@/stores/trackState';
import { useTrackAttrState } from '@/stores/trackAttribute';
import { toConfirmPayload } from '@/utils/timelineConverter';
import { notifyParent } from './aiGenerationService';

/**
 * 轮询导出进度
 */
async function pollExportProgress() {
  const projectState = useProjectState();
  const taskUuid = projectState.taskUuid;
  if (!taskUuid) return;

  try {
    const result = await getTaskProgress(taskUuid);

    if (result.status !== 0 || !result.data) {
      throw new Error(result.message || '查询进度失败');
    }

    const data = result.data;
    projectState.setProgress(data.progress, data.currentStage || '视频合成中');

    if (data.status === 'COMPLETED') {
      projectState.stopPolling();
      projectState.setResult(data.fileName || '');
      notifyParent('generation-complete', { fileName: data.fileName });
    } else if (data.status === 'FAILED') {
      projectState.stopPolling();
      projectState.setError(data.errorMessage || '导出失败');
    }
  } catch (error: any) {
    console.error('轮询导出进度失败:', error);
  }
}

/**
 * 确认时间线并开始导出
 */
export async function startExport(): Promise<void> {
  const projectState = useProjectState();
  const trackState = useTrackState();
  const trackAttrState = useTrackAttrState();

  if (!projectState.taskUuid) {
    throw new Error('任务ID不存在');
  }

  projectState.setStatus('exporting');

  try {
    // 1. 转换数据
    const payload = toConfirmPayload(
      trackState.trackList,
      projectState.taskUuid,
      projectState.videoTitle,
      trackAttrState.trackAttrMap
    );

    // 2. 提交确认
    const result = await confirmTimeline(payload);

    if (result.status !== 0) {
      throw new Error(result.message || '确认失败');
    }

    // 3. 开始轮询导出进度
    projectState.startPolling(pollExportProgress);
  } catch (error: any) {
    projectState.setError(error.message || '导出失败');
    throw error;
  }
}

/**
 * 获取下载地址
 */
export function getExportDownloadUrl(): string {
  const projectState = useProjectState();
  if (!projectState.resultFileName) {
    return '';
  }
  return getDownloadUrl(projectState.resultFileName);
}
