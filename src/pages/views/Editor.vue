<template>
  <!-- AI 加载覆盖层 -->
  <AiLoadingOverlay v-if="showLoadingOverlay" />

  <HeaderContainer />
  <div class="flex flex-1 overflow-hidden">
    <ResourcesContainer />
    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="flex flex-1 flex-row flex-nowrapf">
        <CanvasPlayer />
        <AttributeContainer />
      </div>
      <TrackContainer />
    </div>
  </div>
  <!-- 导出进度对话框 -->
  <ExportDialog v-model="showExportDialog" />
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import AttributeContainer from '@/components/container/AttributeContainer.vue';
  import CanvasPlayer from '@/components/container/CanvasPlayer.vue';
  import HeaderContainer from '@/components/container/HeaderContainer.vue';
  import ResourcesContainer from '@/components/container/ResourcesContainer.vue';
  import TrackContainer from '@/components/container/TrackContainer.vue';
  import ExportDialog from '@/components/export/ExportDialog.vue';
  import AiLoadingOverlay from '@/components/ai-panel/AiLoadingOverlay.vue';
  import { useProjectState } from '@/stores/projectState';
  import { startFromArticle } from '@/services/aiGenerationService';
  import { useTrackState } from '@/stores/trackState';
  import { initHotKey } from '@/utils/initHotKey';

  const route = useRoute();
  const projectState = useProjectState();
  const trackState = useTrackState();
  const showExportDialog = ref(false);

  initHotKey();

  /** 是否显示加载覆盖层 */
  const showLoadingOverlay = computed(() => {
    const s = projectState.status;
    // 数据已加载到轨道后隐藏
    if (s === 'waiting_confirm' && trackState.trackList.length > 0) return false;
    return s === 'submitting' || s === 'processing' || s === 'waiting_confirm' || s === 'failed';
  });

  onMounted(async() => {
    const articleId = route.query.articleId as string;
    const audioSource = route.query.audioSource as string;

    if (articleId) {
      // 自动启动 AI 生成
      await startFromArticle(Number(articleId), audioSource);
    }
  });

  // 监听状态变化，显示导出对话框
  watch(() => projectState.status, newStatus => {
    if (newStatus === 'exporting' || newStatus === 'completed' || newStatus === 'failed') {
      showExportDialog.value = true;
    }
  });
</script>
