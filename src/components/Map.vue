<script setup lang="ts">
import {
  PhPlus,
  PhMinus,
  PhCornersOut,
  PhMapTrifold,
  PhQuestion,
  PhArrowCounterClockwise,
} from '@phosphor-icons/vue';

defineProps<{
  isMapLoading: boolean;
  apiLabels: boolean;
}>();

defineEmits<{
  (e: 'zoomIn'): void;
  (e: 'zoomOut'): void;
  (e: 'resetView'): void;
  (e: 'toggleLabels'): void;
  (e: 'flipBus'): void;
}>();
</script>

<template>
  <div
    class="bg-base-300 z-0 flex items-center justify-center overflow-hidden w-full h-full relative"
  >
    <div
      id="fortnite-map"
      class="absolute inset-0 outline-none w-full h-full transition-opacity duration-300"
      :style="{ opacity: isMapLoading ? 0.3 : 1 }"
    ></div>

    <Transition name="fade">
      <div
        v-if="isMapLoading"
        class="absolute inset-0 z-[500] flex items-center justify-center bg-transparent backdrop-blur-[2px]"
      >
        <div
          class="flex flex-col items-center gap-4 bg-base-300/80 p-8 rounded-3xl shadow-2xl border border-white/5"
        >
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <div class="animate-pulse flex flex-col items-center gap-2 text-primary">
            <PhMapTrifold class="w-12 h-12" weight="duotone" />
            <span class="text-xs font-black uppercase tracking-widest">Loading Map</span>
          </div>
        </div>
      </div>
    </Transition>

    <div
      class="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 z-[400] flex flex-col items-start gap-4 pointer-events-none"
    >
      <div class="tooltip tooltip-right font-bold" data-tip="Flip bus direction">
        <button
          class="btn btn-circle btn-primary shadow-2xl pointer-events-auto border-2 border-white/20 transition-all hover:scale-110 active:scale-95"
          @click="$emit('flipBus')"
        >
          <PhArrowCounterClockwise class="w-6 h-6" weight="bold" />
        </button>
      </div>
    </div>

    <div
      class="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 z-[400] flex flex-col items-end gap-5 pointer-events-none"
    >
      <div class="flex flex-col gap-4 pointer-events-auto">
        <div
          class="join join-vertical shadow-2xl bg-base-100/95 backdrop-blur-xl border border-base-content/10 rounded-2xl overflow-hidden isolation-auto"
        >
          <div class="tooltip tooltip-left font-bold join-item border-none" data-tip="Zoom In">
            <button
              class="btn btn-ghost btn-square h-12 w-12 hover:bg-primary/15 active:bg-primary/25 transition-all border-none focus:outline-none rounded-none"
              aria-label="Zoom in"
              @click="$emit('zoomIn')"
            >
              <PhPlus class="w-5 h-5" weight="bold" />
            </button>
          </div>
          <div
            class="tooltip tooltip-left font-bold join-item border-t border-base-content/5"
            data-tip="Zoom Out"
          >
            <button
              class="btn btn-ghost btn-square h-12 w-12 hover:bg-primary/15 active:bg-primary/25 transition-all border-none focus:outline-none rounded-none"
              aria-label="Zoom out"
              @click="$emit('zoomOut')"
            >
              <PhMinus class="w-5 h-5" weight="bold" />
            </button>
          </div>
          <div
            class="tooltip tooltip-left font-bold join-item border-t border-base-content/5"
            data-tip="Reset View"
          >
            <button
              class="btn btn-ghost btn-square h-12 w-12 hover:bg-primary/15 active:bg-primary/25 transition-all border-none focus:outline-none rounded-none"
              aria-label="Reset view"
              @click="$emit('resetView')"
            >
              <PhCornersOut class="w-5 h-5" weight="bold" />
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 items-end">
          <div class="tooltip tooltip-left font-bold" data-tip="Toggle Map Names">
            <button
              class="btn btn-square btn-md h-12 w-12 shadow-2xl transition-all border border-base-content/10 backdrop-blur-xl rounded-2xl"
              :class="[
                apiLabels
                  ? 'btn-primary text-primary-content border-none shadow-primary/20'
                  : 'bg-base-100/95 text-base-content hover:bg-primary/10 active:bg-primary/20 border-base-content/10',
                isMapLoading ? 'loading' : '',
              ]"
              :disabled="isMapLoading"
              aria-label="Toggle map names"
              @click="$emit('toggleLabels')"
            >
              <PhMapTrifold
                v-if="!isMapLoading"
                class="w-5 h-5"
                :weight="apiLabels ? 'fill' : 'bold'"
              />
            </button>
          </div>

          <div class="tooltip tooltip-left font-bold" data-tip="Instructions">
            <label
              for="help-drawer"
              class="btn btn-ghost btn-square btn-md h-12 w-12 shadow-2xl bg-base-100/95 hover:bg-primary/10 active:bg-primary/20 transition-all border border-base-content/10 backdrop-blur-xl cursor-pointer flex items-center justify-center rounded-2xl"
              aria-label="Open instructions"
            >
              <PhQuestion class="w-5 h-5" weight="bold" />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#fortnite-map {
  backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
