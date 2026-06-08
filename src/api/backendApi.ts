/**
 * 后端 API 封装
 * 与 ai-voice-api 后端交互
 */

import type {
  BackendResult,
  SubmitTaskResult,
  TaskProgressResult,
  TimelinePreviewResult,
  ImageListResult,
  ImageCategory
} from './backendTypes';

const BASE_URL = ''; // 使用 Vite 代理

/**
 * 根据文章ID提交视频生成任务
 */
export async function submitByArticle(params: {
  articleId: number;
  audioSource?: string;
  videoTitle?: string;
  aspectRatio?: string;
  imageCategoryId?: number;
}): Promise<BackendResult<SubmitTaskResult>> {
  const response = await fetch(`${BASE_URL}/api/audio-video/submit-by-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

/**
 * 查询任务进度
 */
export async function getTaskProgress(taskUuid: string): Promise<BackendResult<TaskProgressResult>> {
  const response = await fetch(`${BASE_URL}/api/audio-video/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskUuid })
  });
  return response.json();
}

/**
 * 获取时间线预览数据
 */
export async function getTimelinePreview(taskUuid: string): Promise<BackendResult<TimelinePreviewResult>> {
  const response = await fetch(`${BASE_URL}/api/audio-video/timeline-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskUuid })
  });
  return response.json();
}

/**
 * 确认时间线并开始生成视频
 */
export async function confirmTimeline(params: {
  taskUuid: string;
  videoTitle?: string;
  timelineSegmentsJson?: string;
}): Promise<BackendResult<null>> {
  const response = await fetch(`${BASE_URL}/api/audio-video/confirm-timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

/**
 * 获取视频下载地址
 */
export function getDownloadUrl(fileName: string): string {
  return `${BASE_URL}/api/audio-video/download/${encodeURIComponent(fileName)}`;
}

/**
 * 获取图片列表（分页）
 */
export async function getImageList(page = 1, size = 20, categoryId?: number): Promise<BackendResult<ImageListResult>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size)
  });
  if (categoryId) {
    params.append('categoryId', String(categoryId));
  }
  const response = await fetch(`${BASE_URL}/api/image/list?${params}`);
  return response.json();
}

/**
 * 获取图片分类列表
 */
export async function getImageCategories(): Promise<BackendResult<ImageCategory[]>> {
  const response = await fetch(`${BASE_URL}/api/image-category/list`);
  return response.json();
}
