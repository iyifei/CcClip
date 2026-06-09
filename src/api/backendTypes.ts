/**
 * 后端 API 响应基础类型
 */
export interface BackendResult<T> {
  status: number;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 提交任务响应
 */
export interface SubmitTaskResult {
  taskUuid: string;
  estimatedSeconds?: number;
}

/**
 * 任务进度响应
 */
export interface TaskProgressResult {
  taskUuid: string;
  status: 'PENDING' | 'RUNNING' | 'WAITING_CONFIRM' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStage: string;
  errorMessage?: string;
  audioDurationSeconds?: number;
  subtitleCount?: number;
  imageCount?: number;
  fileName?: string;
}

/**
 * 片段图片（与后端 ImageThumb 对齐）
 */
export interface SegmentImage {
  id?: number;
  imageId?: number;
  imageUrl: string;
  thumbUrl?: string;
  previewThumbUrl?: string;
  localPath?: string;
  imageCategoryName?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * 时间线段（与后端 TimelineSegment 对齐）
 */
export interface TimelineSegment {
  index: number;
  startTime: number;
  endTime: number;
  subtitleText: string;
  images: SegmentImage[];
}

/**
 * 时间线预览响应（与后端 TimelinePreviewResult 对齐）
 */
export interface TimelinePreviewResult {
  taskUuid?: string;
  audioFileName: string;
  audioDuration: number;
  audioUrl?: string;
  timelineSegments: TimelineSegment[];
  videoWidth?: number;
  videoHeight?: number;
}

/**
 * 图片项
 */
export interface ImageItem {
  id: number;
  imageUrl: string;
  tags?: string;
}

/**
 * 图片列表响应
 */
export interface ImageListResult {
  value: ImageItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 图片分类
 */
export interface ImageCategory {
  id: number;
  name: string;
}
