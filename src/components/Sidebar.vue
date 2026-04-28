<script setup lang="ts">
import { ref } from 'vue';
import {
  PhTimer as PhTimerIcon,
  PhMapPin,
  PhInfo,
  PhCheckCircle,
  PhFloppyDisk,
  PhArrowCounterClockwise,
  PhCaretLeft,
  PhCaretRight,
} from '@phosphor-icons/vue';
import type { TrajectoryResult } from '../utils/physics';

defineProps<{
  results: TrajectoryResult | null;
  isSaving: boolean;
}>();

defineEmits<(e: 'save') => void>();

const isOpen = ref(true);
</script>

<template>
  <aside
    class="relative z-10 flex flex-col shrink-0 transition-[height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-base-100 border-t lg:border-t-0 lg:border-r border-base-content/10 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.3)] lg:shadow-2xl overflow-hidden"
    :class="{
      'h-[45vh] lg:h-full lg:w-[400px] xl:w-[450px] resize-panel': isOpen,
      'h-12 lg:h-full lg:w-0 lg:opacity-0 lg:px-0 lg:border-none lg:overflow-hidden lg:!w-0 lg:!min-w-0':
        !isOpen,
    }"
  >
    <div
      class="h-12 w-full lg:hidden flex justify-center items-center cursor-pointer shrink-0 border-b border-base-content/5 bg-base-200/30 transition-colors hover:bg-base-200/50"
      @click="isOpen = !isOpen"
    >
      <div class="w-12 h-1.5 bg-base-content/20 rounded-full pointer-events-none"></div>
      <span
        v-if="!isOpen && results"
        class="absolute right-4 text-primary font-bold text-sm pointer-events-none"
        >{{ results.totalTime?.toFixed(1) }}s</span
      >
    </div>

    <button
      class="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-4 translate-x-full z-[450] bg-base-200/90 text-base-content p-1.5 rounded-r-xl shadow-md border border-l-0 border-base-content/10 hover:bg-base-300 transition-colors"
      aria-label="Toggle Sidebar"
      @click="isOpen = !isOpen"
    >
      <PhCaretLeft v-if="isOpen" class="w-5 h-5" />
      <PhCaretRight v-else class="w-5 h-5" />
    </button>

    <div
      class="flex-grow overflow-y-auto overflow-x-hidden p-5 lg:p-6 flex flex-col gap-5 scrollbar-thin min-w-[300px]"
    >
      <div>
        <h2
          class="text-2xl font-black mb-1 text-base-content drop-shadow-sm tracking-tight flex items-center justify-between"
        >
          <span>Drop timing</span>
          <span v-if="!isOpen && results" class="lg:hidden text-primary text-sm"
            >{{ results.totalTime?.toFixed(1) }}s</span
          >
        </h2>
        <p class="text-sm text-base-content/70">
          View your estimated bus wait, freefall, and gliding times.
        </p>
      </div>

      <div class="bg-base-200/50 p-5 rounded-2xl border border-base-content/5 shadow-inner">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <PhTimerIcon class="w-5 h-5 text-primary" weight="bold" />
            Time estimates
          </h3>
          <Transition name="fade" mode="out-in">
            <span v-if="!results" key="waiting" class="badge badge-ghost badge-sm font-bold"
              >Select points</span
            >
            <span
              v-else-if="results.reachable"
              key="possible"
              class="badge badge-success badge-sm text-success-content font-bold shadow-sm px-3"
              >Auto Deploy Glider</span
            >
            <span
              v-else
              key="not-possible"
              class="badge badge-error badge-sm text-error-content font-bold shadow-sm"
              >Out of reach</span
            >
          </Transition>
        </div>

        <div
          v-if="!results"
          class="flex flex-col items-center justify-center py-6 text-center text-base-content/50 gap-2"
        >
          <PhMapPin class="w-8 h-8 opacity-50" />
          <p class="text-sm font-medium">Set your bus path and destination on the map.</p>
        </div>
        <div
          v-else-if="!results.reachable"
          class="text-error bg-error/10 p-4 rounded-xl border border-error/20 text-sm font-medium text-center"
        >
          The destination is too far from the bus path.
        </div>
        <div v-else class="flex flex-col gap-3">
          <ul class="steps steps-vertical w-full">
            <li class="step step-neutral !text-base-content" data-content=" ">
              <div class="flex w-full justify-between items-center text-left ml-2">
                <span class="text-sm font-medium text-base-content/80">Bus travel</span>
                <span
                  class="font-mono text-base-content bg-base-100 px-2 py-1 rounded-md text-sm border border-base-content/5 shadow-sm"
                  >{{ results.busTime?.toFixed(1) }}s</span
                >
              </div>
            </li>
            <li class="step step-error !text-base-content" data-content=" ">
              <div class="flex w-full justify-between items-center text-left ml-2">
                <span class="text-sm font-medium text-base-content/80">Freefall</span>
                <span
                  class="font-mono text-base-content bg-base-100 px-2 py-1 rounded-md text-sm border border-base-content/5 shadow-sm"
                  >{{ results.fallTime?.toFixed(1) }}s</span
                >
              </div>
            </li>
            <li class="step step-accent !text-base-content" data-content=" ">
              <div class="flex w-full justify-between items-center text-left ml-2">
                <span class="text-sm font-medium text-base-content/80">Gliding</span>
                <span
                  class="font-mono text-base-content bg-base-100 px-2 py-1 rounded-md text-sm border border-base-content/5 shadow-sm"
                  >{{ results.glideTime?.toFixed(1) }}s</span
                >
              </div>
            </li>
          </ul>
          <div class="divider my-0 opacity-50"></div>
          <div class="flex justify-between items-center">
            <span class="font-black text-base-content">Total time</span>
            <span
              class="font-black font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm"
              >{{ results.totalTime?.toFixed(1) }}s</span
            >
          </div>

          <div
            class="tooltip tooltip-bottom w-full mt-2"
            data-tip="Save this location for next time"
          >
            <button
              class="btn btn-sm btn-block transition-all"
              :class="isSaving ? 'btn-success text-success-content border-success' : 'btn-outline'"
              aria-label="Save current drop spot"
              @click="$emit('save')"
            >
              <PhCheckCircle v-if="isSaving" class="w-4 h-4" weight="fill" />
              <PhFloppyDisk v-else class="w-4 h-4" />
              {{ isSaving ? 'Spot saved' : 'Save location' }}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3
          class="font-bold text-sm uppercase tracking-widest text-base-content/50 mb-3 px-1 flex items-center gap-2"
        >
          <PhInfo class="w-4 h-4" />
          Map legend
        </h3>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 pb-6 lg:pb-0"
        >
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-success flex items-center justify-center text-xs font-black text-success-content shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              S
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Bus start</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Drag point</span
              >
            </div>
          </div>
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-info flex items-center justify-center text-xs font-black text-info-content shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              E
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Bus end</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Drag point</span
              >
            </div>
          </div>
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              <PhArrowCounterClockwise class="w-4 h-4" weight="bold" />
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Reverse bus</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Swap start/end</span
              >
            </div>
          </div>
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-warning flex items-center justify-center text-xs font-black text-warning-content shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              <PhMapPin class="w-4 h-4" weight="fill" />
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Target</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Click or drag</span
              >
            </div>
          </div>
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-error flex items-center justify-center text-xs font-black text-error-content shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              J
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Jump point</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Calculated</span
              >
            </div>
          </div>
          <div
            class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
          >
            <div
              class="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-black text-accent-content shadow-sm relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-base-100 after:scale-[0.8] after:pointer-events-none"
            >
              D
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold leading-none">Deploy glider</span>
              <span class="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider font-bold"
                >Calculated</span
              >
            </div>
          </div>
        </div>
        <div
          class="mt-4 p-3 bg-base-200/30 rounded-xl text-xs text-base-content/60 border border-base-content/5"
        >
          <strong>Disclaimer:</strong> This tool uses a 2D map. It does not account for the
          elevation of your landing spot.
        </div>
      </div>
    </div>
  </aside>
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

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.2);
  border-radius: 10px;
}
.scrollbar-thin:hover::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.4);
}

@media (max-width: 1023px) {
  .resize-panel {
    resize: vertical;
    max-height: 80vh;
    min-height: 20vh;
  }
}

@media (min-width: 1024px) {
  .resize-panel {
    resize: horizontal;
    max-width: 50vw;
    min-width: 320px;
  }
}
</style>
