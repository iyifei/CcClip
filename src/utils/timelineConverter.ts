/**
 * 时间线数据转换层
 * 在后端 timeline-preview 格式和 CcClip 轨道格式之间转换
 */

import type { TimelinePreviewResult, SegmentImage } from '@/api/backendTypes';
import type { TrackLineItem, AudioTractItem, TextTractItem, ImageTractItem } from '@/stores/trackState';
import { baseFps } from '@/data/trackConfig';
import { getId } from '@/utils/common';
import { getTitleLineStyle } from './titleStyleDefaults';

/**
 * 生成唯一 ID 的计数器
 */
let idCounter = 0;

/**
 * 重置 ID 计数器
 */
export function resetIdCounter() {
  idCounter = 0;
}

/**
 * 获取标题多行样式
 */
function getTitleLineStylesForSegment(text: string) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.map((_, index) => getTitleLineStyle(index));
}

/**
 * 将后端 timeline-preview 数据转换为 CcClip 轨道格式
 * @param preview 后端时间线预览数据
 * @returns 轨道列表和属性映射
 */
export function fromTimelinePreview(preview: TimelinePreviewResult): {
  trackList: TrackLineItem[];
  trackAttrMap: Record<string, Record<string, any>>;
} {
  resetIdCounter();
  const trackList: TrackLineItem[] = [];
  const trackAttrMap: Record<string, Record<string, any>> = {};

  // 1. 创建音频轨道（整条音频）
  const audioTrack: AudioTractItem = {
    id: getId('audio'),
    type: 'audio',
    name: preview.audioFileName,
    start: 0,
    end: Math.floor(preview.audioDuration * baseFps),
    frameCount: Math.floor(preview.audioDuration * baseFps),
    offsetL: 0,
    offsetR: 0,
    time: preview.audioDuration * 1000,
    format: 'mp3',
    source: preview.audioUrl,
    cover: ''
  };
  trackList.push({
    type: 'audio',
    list: [audioTrack]
  });

  // 2. 为每个字幕段创建文本轨道和图片轨道
  const textTracks: TextTractItem[] = [];
  const imageTracks: ImageTractItem[] = [];

  preview.segments.forEach((segment, segmentIndex) => {
    // 字幕轨道
    const textTrack: TextTractItem = {
      id: getId('text'),
      type: 'text',
      name: segment.text.substring(0, 20),
      start: Math.floor(segment.start * baseFps),
      end: Math.floor(segment.end * baseFps),
      frameCount: Math.floor((segment.end - segment.start) * baseFps),
      offsetL: 0,
      offsetR: 0,
      cover: '',
      templateId: 0
    };
    textTracks.push(textTrack);

    // 为字幕轨道设置属性（包含样式信息）
    trackAttrMap[textTrack.id] = {
      content: segment.text,
      templateId: 0,
      // 默认标题样式（如果是第一段，应用多行标题样式）
      ...(segmentIndex === 0 ? { titleStyles: getTitleLineStylesForSegment(segment.text) } : {})
    };

    // 图片轨道（每段字幕可能有多张图片）
    if (segment.images.length > 0) {
      const imgDuration = (segment.end - segment.start) / segment.images.length;
      segment.images.forEach((img, imgIndex) => {
        const imgStart = segment.start + imgIndex * imgDuration;
        const imgEnd = imgStart + imgDuration;

        const imageTrack: ImageTractItem = {
          id: getId('image'),
          type: 'image',
          name: `image-${img.id}`,
          start: Math.floor(imgStart * baseFps),
          end: Math.floor(imgEnd * baseFps),
          frameCount: Math.floor(imgDuration * baseFps),
          offsetL: 0,
          offsetR: 0,
          source: img.imageUrl,
          format: 'jpg',
          width: preview.videoWidth,
          height: preview.videoHeight,
          sourceFrame: 1,
          cover: img.imageUrl
        };
        imageTracks.push(imageTrack);

        // 为图片轨道设置属性
        trackAttrMap[imageTrack.id] = {
          x: 0,
          y: 0,
          scale: 100,
          opacity: 100,
          imageId: img.id,
          imageUrl: img.imageUrl
        };
      });
    }
  });

  // 文本轨道放在一行
  if (textTracks.length > 0) {
    trackList.push({
      type: 'text',
      list: textTracks
    });
  }

  // 图片轨道放在主轨道位置
  if (imageTracks.length > 0) {
    trackList.push({
      type: 'image',
      main: true,
      list: imageTracks
    });
  }

  // 3. 为音频轨道设置属性
  trackAttrMap[audioTrack.id] = {
    x: 0,
    y: 0,
    scale: 100,
    opacity: 100
  };

  return { trackList, trackAttrMap };
}

/**
 * 将 CcClip 轨道数据转换为后端 confirm 格式
 * @param trackList CcClip 轨道列表
 * @param taskUuid 任务 UUID
 * @param videoTitle 视频标题
 * @returns 确认 payload
 */
export function toConfirmPayload(
  trackList: TrackLineItem[],
  taskUuid: string,
  videoTitle?: string
): {
  taskUuid: string;
  videoTitle?: string;
  timelineSegmentsJson?: string;
} {
  // 找到字幕轨道
  const textTrackLine = trackList.find(t => t.type === 'text');
  // 找到图片轨道
  const imageTrackLine = trackList.find(t => t.type === 'image');

  if (!textTrackLine) {
    return { taskUuid, videoTitle };
  }

  const textTracks = textTrackLine.list as TextTractItem[];

  // 按时间排序字幕
  const sortedTexts = [...textTracks].sort((a, b) => a.start - b.start);

  // 构建 segments
  const segments = sortedTexts.map((textTrack, index) => {
    const startSeconds = textTrack.start / baseFps;
    const endSeconds = textTrack.end / baseFps;

    // 找到在该时间段内的图片
    const segmentImages: SegmentImage[] = [];
    if (imageTrackLine) {
      const imageTracks = imageTrackLine.list as ImageTractItem[];
      imageTracks
        .filter(img => {
          const imgStart = img.start / baseFps;
          const imgEnd = img.end / baseFps;
          // 图片与字幕有时间重叠
          return imgStart < endSeconds && imgEnd > startSeconds;
        })
        .forEach(img => {
          const imageUrl = (img as any).source || '';
          segmentImages.push({
            id: 0, // 图片 ID 在转换时可能丢失，后端会根据 URL 处理
            imageUrl
          });
        });
    }

    // 获取字幕内容（从 trackAttrMap 中获取，如果没有则使用 name）
    const content = (textTrack as any).content || textTrack.name;

    return {
      index,
      start: startSeconds,
      end: endSeconds,
      text: content,
      images: segmentImages
    };
  });

  return {
    taskUuid,
    videoTitle,
    timelineSegmentsJson: JSON.stringify({ segments })
  };
}

/**
 * 从轨道列表中提取文本内容
 */
export function extractTextContent(trackList: TrackLineItem[]): string[] {
  const textTrackLine = trackList.find(t => t.type === 'text');
  if (!textTrackLine) return [];

  const textTracks = textTrackLine.list as TextTractItem[];
  return textTracks.map(t => (t as any).content || t.name);
}
