<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFortniteMap } from './composables/useFortniteMap';
import Navbar from './components/Navbar.vue';
import Sidebar from './components/Sidebar.vue';
import MapViewer from './components/MapViewer.vue';
import ThemeModal from './components/ThemeModal.vue';
import GuideDrawer from './components/GuideDrawer.vue';

const {
  initMap,
  toggleLabels,
  apiLabels,
  results,
  saveCurrentTarget,
  zoomIn,
  zoomOut,
  resetView,
  isMapLoading,
  flipBusDirection,
} = useFortniteMap();
const isSaving = ref(false);

const handleSave = async () => {
  isSaving.value = true;
  await saveCurrentTarget();
  setTimeout(() => {
    isSaving.value = false;
  }, 2000);
};

onMounted(() => {
  initMap('fortnite-map');
});

const openThemeModal = () => {
  setTimeout(() => {
    const themeModal = document.getElementById('theme_modal') as HTMLDialogElement | null;
    if (themeModal) themeModal.showModal();
  }, 10);
};
</script>

<template>
  <div class="drawer drawer-end h-[100dvh] w-screen overflow-hidden bg-base-100 text-base-content">
    <input id="help-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content h-full flex flex-col font-sans">
      <Navbar @open-theme="openThemeModal" />

      <main
        class="flex-grow flex flex-col-reverse lg:flex-row w-full overflow-hidden bg-base-100"
        style="height: calc(100dvh - 4rem)"
      >
        <Sidebar :results="results" :is-saving="isSaving" @save="handleSave" />

        <MapViewer
          :is-map-loading="isMapLoading"
          :api-labels="apiLabels"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @reset-view="resetView"
          @toggle-labels="toggleLabels"
          @flip-bus="flipBusDirection"
        />
      </main>
    </div>

    <GuideDrawer />
  </div>

  <ThemeModal id="theme_modal" />
</template>

<style>
#app {
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

.map-container-wrapper {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

#fortnite-map {
  backface-visibility: hidden;
  transform: translateZ(0);
}

.pointer-events-auto {
  isolation: isolate;
}

.leaflet-container {
  background: transparent !important;
  cursor: crosshair !important;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
}

.leaflet-image-layer {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
  -ms-interpolation-mode: bicubic;
}

.leaflet-bar {
  border: none !important;
}

.leaflet-fade-anim .leaflet-tile,
.leaflet-zoom-anim .leaflet-tile {
  will-change: transform;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
