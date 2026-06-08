<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-content">
      <!-- 提交中 -->
      <div v-if="status === 'submitting'" class="status-step">
        <el-icon class="is-loading" size="48"><Loading /></el-icon>
        <p class="step-title">正在提交任务...</p>
      </div>

      <!-- 处理中 -->
      <div v-else-if="status === 'processing'" class="status-step">
        <div class="progress-container">
          <el-progress
            :percentage="progress"
            :stroke-color="{ '0%': '#1890ff', '100%': '#52c41a' }"
            :stroke-width="8"
            :format="() => `${currentStageText} ${progress}%`"
          />
        </div>
        <div class="stage-list">
          <div v-for="stage in stages" :key="stage.key" class="stage-item" :class="getStageClass(stage.key)">
            <span class="stage-icon">{{ getStageIcon(stage.key) }}</span>
            <span class="stage-name">{{ stage.label }}</span>
          </div>
        </div>
      </div>

      <!-- 等待确认（数据已加载） -->
      <div v-else-if="status === 'waiting_confirm'" class="status-step">
        <el-icon color="#67c23a" size="48"><CircleCheck /></el-icon>
        <p class="step-title">AI 处理完成</p>
        <p class="step-hint">正在加载编辑器...</p>
      </div>

      <!-- 失败 -->
      <div v-else-if="status === 'failed'" class="status-step">
        <el-icon color="#f56c6c" size="48"><CircleClose /></el-icon>
        <p class="step-title">处理失败</p>
        <p class="error-message">{{ errorMessage }}</p>
        <el-button type="primary" @click="handleRetry">重试</el-button>
      </div>

      <!-- 空闲 -->
      <div v-else-if="status === 'idle'" class="status-step">
        <el-icon size="48"><VideoCamera /></el-icon>
        <p class="step-title">准备就绪</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { Loading, CircleCheck, CircleClose, VideoCamera } from '@element-plus/icons-vue';
  import { useProjectState } from '@/stores/projectState';
  import { startFromArticle } from '@/services/aiGenerationService';

  const projectState = useProjectState();

  const status = computed(() => projectState.status);
  const progress = computed(() => projectState.progress);
  const currentStageText = computed(() => projectState.currentStage || '处理中');
  const errorMessage = computed(() => projectState.errorMessage);

  /** 是否显示加载覆盖层 */
  const visible = computed(() => {
    const s = projectState.status;
    return s === 'submitting' || s === 'processing' || s === 'waiting_confirm' || s === 'failed' || s === 'idle';
  });

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
    return '';
  }

  function handleRetry() {
    if (projectState.articleId) {
      startFromArticle(projectState.articleId);
    }
  }
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background: #fff;
  border-radius: 8px;
  padding: 40px 60px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.step-hint {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.progress-container {
  width: 100%;
}

.stage-list {
  width: 100%;
  margin-top: 20px;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  color: #909399;
  font-size: 14px;
}

.stage-item.done {
  color: #67c23a;
}

.stage-item.active {
  color: #409eff;
}

.stage-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin: 0;
}
</style>
