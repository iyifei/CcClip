<template>
  <el-dialog
    v-model="visible"
    title="导出视频"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!isExporting"
  >
    <div v-if="isExporting" class="export-progress">
      <el-progress :percentage="projectState.progress" :stroke-width="20" text-inside />
      <p class="stage-text">{{ projectState.currentStage }}</p>
    </div>

    <div v-else-if="isCompleted" class="export-success">
      <el-icon color="#67c23a" size="48"><CircleCheck /></el-icon>
      <p class="success-title">视频导出成功</p>
      <p class="file-name">{{ projectState.resultFileName }}</p>
      <el-button type="primary" @click="handleDownload">
        <el-icon><Download /></el-icon>
        下载视频
      </el-button>
    </div>

    <div v-else-if="isFailed" class="export-failed">
      <el-icon color="#f56c6c" size="48"><CircleClose /></el-icon>
      <p class="error-title">导出失败</p>
      <p class="error-message">{{ projectState.errorMessage }}</p>
    </div>

    <template #footer>
      <el-button v-if="isCompleted || isFailed" @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { CircleCheck, CircleClose, Download } from '@element-plus/icons-vue';
  import { useProjectState } from '@/stores/projectState';
  import { getExportDownloadUrl } from '@/services/exportService';

  const props = defineProps<{
    modelValue: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();

  const projectState = useProjectState();

  const visible = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value)
  });

  const isExporting = computed(() => projectState.status === 'exporting');
  const isCompleted = computed(() => projectState.status === 'completed');
  const isFailed = computed(() => projectState.status === 'failed');

  function handleDownload() {
    const url = getExportDownloadUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  function handleClose() {
    visible.value = false;
  }
</script>

<style scoped>
.export-progress,
.export-success,
.export-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.stage-text {
  font-size: 14px;
  color: #606266;
}

.success-title,
.error-title {
  font-size: 18px;
  font-weight: 600;
}

.success-title {
  color: #67c23a;
}

.error-title {
  color: #f56c6c;
}

.file-name {
  font-size: 14px;
  color: #909399;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
}
</style>
