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

function withThumbWidth(url: string, width: number) {
  if (!url || !url.includes('/api/image/thumb/')) return url;
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  params.set('width', String(width));
  return `${path}?${params.toString()}`;
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

  // 后端 audioFileName 可能已含扩展名，需要去掉以避免与 format 拼接时产生双扩展名
  const rawAudioName = preview.audioFileName;
  const audioName = rawAudioName.replace(/\.(mp3|wav|aac|m4a|ogg|flac)$/i, '');

  // 1. 创建音频轨道（整条音频）
  const audioTrack: AudioTractItem = {
    id: getId('audio'),
    type: 'audio',
    name: audioName,
    start: 0,
    end: Math.floor(preview.audioDuration * baseFps),
    frameCount: Math.floor(preview.audioDuration * baseFps),
    offsetL: 0,
    offsetR: 0,
    time: preview.audioDuration * 1000,
    format: 'mp3',
    source: preview.audioUrl || '',
    cover: ''
  };
  trackList.push({
    type: 'audio',
    list: [audioTrack]
  });

  // 2. 为每个字幕段创建文本轨道和图片轨道
  const textTracks: TextTractItem[] = [];
  const imageTracks: ImageTractItem[] = [];

  const segments = preview.timelineSegments || [];

  segments.forEach((segment, segmentIndex) => {
    // 字幕轨道
    const text = segment.subtitleText || '';
    const segStart = segment.startTime;
    const segEnd = segment.endTime;

    const textTrack: TextTractItem = {
      id: getId('text'),
      type: 'text',
      name: text.substring(0, 20),
      start: Math.floor(segStart * baseFps),
      end: Math.floor(segEnd * baseFps),
      frameCount: Math.floor((segEnd - segStart) * baseFps),
      offsetL: 0,
      offsetR: 0,
      cover: '',
      templateId: 0
    };
    textTracks.push(textTrack);

    // 为字幕轨道设置属性（包含样式信息）
    trackAttrMap[textTrack.id] = {
      text,
      content: text,
      templateId: 0,
      fontSize: 40,
      color: { r: 255, g: 255, b: 255, a: 1 },
      outlineColor: { r: 0, g: 0, b: 0, a: 0.9 },
      outlineWidth: 3,
      // 默认标题样式（如果是第一段，应用多行标题样式）
      ...(segmentIndex === 0 ? { titleStyles: getTitleLineStylesForSegment(text) } : {})
    };

    // 图片窗口由后端按整条音频规划，不能再按字幕片段重新切分。
    if (segment.images && segment.images.length > 0) {
      segment.images.forEach((img, imgIndex) => {
        const fallbackDuration = (segEnd - segStart) / segment.images.length;
        const imgStart = img.startTime ?? (segStart + imgIndex * fallbackDuration);
        const imgEnd = img.endTime ?? (imgStart + fallbackDuration);
        const timelineThumbUrl = withThumbWidth(img.thumbUrl || img.previewThumbUrl || img.imageUrl || '', 100);
        const previewUrl = withThumbWidth(img.previewThumbUrl || img.thumbUrl || img.imageUrl || '', 1080);
        const imgStartFrame = Math.max(0, Math.floor(imgStart * baseFps));
        const imgEndFrame = Math.max(imgStartFrame + 1, Math.floor(imgEnd * baseFps));
        const imgFrameCount = imgEndFrame - imgStartFrame;

        const uniqueName = `img-${segmentIndex}-${imgIndex}`;

        const imageTrack: ImageTractItem = {
          id: getId('image'),
          type: 'image',
          name: uniqueName,
          start: imgStartFrame,
          end: imgEndFrame,
          frameCount: imgFrameCount,
          offsetL: 0,
          offsetR: 0,
          source: previewUrl,
          format: 'jpg',
          width: preview.videoWidth || 1080,
          height: preview.videoHeight || 1920,
          sourceFrame: 1,
          cover: timelineThumbUrl
        };
        imageTracks.push(imageTrack);

        // 为图片轨道设置属性
        trackAttrMap[imageTrack.id] = {
          x: 0,
          y: 0,
          scale: 100,
          opacity: 100,
          imageId: img.imageId || img.id || 0,
          imageUrl: img.imageUrl,
          thumbUrl: timelineThumbUrl,
          previewUrl
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
    const totalFrames = Math.floor(preview.audioDuration * baseFps);
    imageTracks.sort((a, b) => a.start - b.start);
    if (imageTracks[0].start > 0) {
      imageTracks[0].start = 0;
      imageTracks[0].frameCount = imageTracks[0].end - imageTracks[0].start;
    }
    imageTracks.forEach((image, index) => {
      const nextImage = imageTracks[index + 1];
      if (nextImage && image.end !== nextImage.start) {
        image.end = nextImage.start;
        image.frameCount = image.end - image.start;
      }
    });
    const lastImage = imageTracks[imageTracks.length - 1];
    lastImage.end = totalFrames;
    lastImage.frameCount = totalFrames - lastImage.start;

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
  videoTitle?: string,
  trackAttrMap: Record<string, Record<string, any>> = {}
): {
  taskUuid: string;
  videoTitle?: string;
  timelineSegmentsJson?: string;
} {
  // 找到字幕轨道
  const textTrackLine = trackList.find(t => t.type === 'text');
  // 找到图片轨道
  const imageTrackLine = trackList.find(t => t.type === 'image');

  if (!textTrackLine || !textTrackLine.list) {
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
    if (imageTrackLine && imageTrackLine.list) {
      const imageTracks = imageTrackLine.list as ImageTractItem[];
      imageTracks
        .filter(img => {
          const imgStart = img.start / baseFps;
          const imgEnd = img.end / baseFps;
          // 图片与字幕有时间重叠
          return imgStart < endSeconds && imgEnd > startSeconds;
        })
        .forEach(img => {
          const attr = trackAttrMap[img.id] || {};
          segmentImages.push({
            id: attr.imageId || 0,
            imageId: attr.imageId || 0,
            imageUrl: attr.imageUrl || (img as any).source || '',
            startTime: img.start / baseFps,
            endTime: img.end / baseFps
          });
        });
    }

    // 获取字幕内容（从 trackAttrMap 中获取，如果没有则使用 name）
    const textAttr = trackAttrMap[textTrack.id] || {};
    const content = textAttr.text || textAttr.content || (textTrack as any).content || textTrack.name;

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
