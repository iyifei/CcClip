<template>
  <header class="h-12 w-full flex flex-nowrap flex-row items-center justify-center border-b dark:border-gray-600 border-gray-300">
    <div class="flex w-1/3 pl-2 items-center">
      <div class="w20">
        <img class="h-8" :src="logoImage" alt="">
      </div>
      <span class="text-xs select-none ml-4">自动保存：2023-02-10 00:51</span>
    </div>
    <h2 class="align-middle w-1/5 text-center flex-1 select-none text-sm">
      {{ store.pageTitle }}
    </h2>
    <div class="flex w-1/3 flex-row-reverse pr-10 items-center">
      <ElButton
        color="#626aef"
        :disabled="exportDisabled"
        :loading="projectState.isExporting"
        @click="handleExport"
      >
        <ElIcon :size="size" :color="color" class="mr-1">
          <Download />
        </ElIcon>
        导出
      </ElButton>
      <el-switch
        class="mr-10"
        size="large"
        :active-icon="Moon"
        :inactive-icon="Sunny"
        :inline-prompt="inner"
        v-model="store.isDark"
        :style="switchClass"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
  import logoImage from '@/assets/ccLogo.png';
  import { ref, computed } from 'vue';
  import { ElMessage } from 'element-plus';
  import { Download, Sunny, Moon } from '@element-plus/icons-vue';
  import { usePageState } from '@/stores/pageState';
  import { useProjectState } from '@/stores/projectState';
  import { startExport } from '@/services/exportService';
  const store = usePageState();
  const projectState = useProjectState();
  const size = ref(14);
  const color = '#fff';
  const inner = ref(true);
  const exportDisabled = computed(() => {
    return !projectState.taskUuid
      || projectState.status === 'submitting'
      || projectState.status === 'processing'
      || projectState.status === 'exporting';
  });
  const switchClass = computed(() => ({
    '--el-switch-border-color': store.isDark ? '#4B5563' : '#D1D5DB',
    '--el-color-white': store.isDark ? '#F3F4F6' : '#374151'
  }));

  async function handleExport() {
    try {
      await startExport();
      ElMessage.success('已开始合成视频');
    } catch (error: any) {
      ElMessage.error(error.message || '导出失败');
    }
  }
</script>
