<script setup lang="ts">
import { PhPalette } from '@phosphor-icons/vue';

defineEmits<(e: 'openTheme') => void>();
</script>

<template>
  <div
    class="navbar bg-base-100/80 backdrop-blur-xl sticky top-0 z-50 border-b border-base-content/5 px-4 sm:px-8 shadow-sm"
  >
    <div class="flex-1">
      <a class="btn btn-ghost px-2 hover:bg-transparent group">
        <div class="flex gap-2 items-center font-black tracking-tighter">
          <span
            class="hidden md:inline-block bg-primary text-primary-content px-3 py-1 -rotate-3 transform transition-all group-hover:-rotate-6 group-hover:scale-105 shadow-md rounded-lg"
            >FN</span
          >
          <span class="text-xl md:text-2xl text-base-content">Drop Calculator</span>
        </div>
      </a>
    </div>
    <div class="flex-none gap-2">
      <div class="tooltip tooltip-left" data-tip="Select Theme">
        <button
          class="btn btn-ghost btn-circle"
          aria-label="Select Theme"
          @click="$emit('openTheme')"
        >
          <PhPalette class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
