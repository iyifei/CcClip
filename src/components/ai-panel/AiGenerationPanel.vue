<template>
  <div class="ai-generation-panel">
    <div v-if="projectState.status === 'submitting'" class="status-submitting">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在提交任务...</p>
    </div>

    <div v-else-if="projectState.status === 'processing'" class="status-processing">
      <div class="progress-info">
        <p class="stage-text">{{ projectState.currentStage }}</p>
        <el-progress :percentage="projectState.progress" :stroke-width="20" text-inside />
      </div>
      <div class="stage-list">
        <div v-for="stage in stages" :key="stage.key" class="stage-item" :class="getStageClass(stage.key)">
          <span class="stage-icon">{{ getStageIcon(stage.key) }}</span>
          <span class="stage-name">{{ stage.label }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="projectState.status === 'waiting_confirm'" class="status-ready">
      <el-icon color="#67c23a"><CircleCheck /></el-icon>
      <p>AI 处理完成，可以开始编辑</p>
      <p class="hint">在时间线上调整字幕和图片，然后点击"导出视频"</p>
    </div>

    <div v-else-if="projectState.status === 'failed'" class="status-failed">
      <el-icon color="#f56c6c"><CircleClose /></el-icon>
      <p>处理失败</p>
      <p class="error-message">{{ projectState.errorMessage }}</p>
      <el-button type="primary" @click="handleRetry">重试</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue';
  import { useProjectState } from '@/stores/projectState';
  import { startFromArticle } from '@/services/aiGenerationService';

  const projectState = useProjectState();

  const stages = [
    { key: 'asr', label: '语音识别', progress: 20 },
    { key: 'ai_plan', label: 'AI 镜头规划', progress: 35 },
    { key: 'image_match', label: '图片匹配', progress: 80 }
  ];

  function getStageClass(stageKey: string) {
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    const currentProgress = projectState.progress;

    if (stageIndex === 0 && currentProgress >= 20) return 'done';
    if (stageIndex === 1 && currentProgress >= 35) return 'done';
    if (stageIndex === 2 && currentProgress >= 80) return 'done';

    const prevProgress = stageIndex > 0 ? stages[stageIndex - 1].progress : 0;
    if (currentProgress > prevProgress && currentProgress <= stages[stageIndex].progress) return 'active';

    return 'pending';
  }

  function getStageIcon(stageKey: string) {
    const cls = getStageClass(stageKey);
    if (cls === 'done') return '✅';
    if (cls === 'active') return '⏳';
    return '⚪';
  }

  function handleRetry() {
    // 重新触发 AI 生成
    if (projectState.articleId) {
      startFromArticle(projectState.articleId);
    }
  }
</script>

<style scoped>
.ai-generation-panel {
  padding: 20px;
  text-align: center;
}

.status-submitting,
.status-processing,
.status-ready,
.status-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.progress-info {
  width: 100%;
  max-width: 400px;
}

.stage-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.stage-list {
  margin-top: 20px;
  text-align: left;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #909399;
}

.stage-item.done {
  color: #67c23a;
}

.stage-item.active {
  color: #409eff;
}

.stage-icon {
  font-size: 16px;
}

.hint {
  font-size: 12px;
  color: #909399;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
}
</style>
