<script setup lang="ts">
import { PhX, PhBus, PhMapPin, PhNavigationArrow } from '@phosphor-icons/vue';
</script>

<template>
  <div class="drawer-side z-[1000]">
    <label for="help-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
    <div
      class="p-6 w-80 md:w-96 min-h-full bg-base-100 text-base-content flex flex-col gap-6 shadow-2xl"
    >
      <div class="flex items-center justify-between mt-4">
        <h2 class="text-3xl font-black tracking-tight">Instructions</h2>
        <label for="help-drawer" aria-label="close sidebar" class="btn btn-ghost btn-circle btn-sm">
          <PhX class="w-5 h-5" />
        </label>
      </div>

      <div class="space-y-4 mt-4">
        <div class="bg-base-200/50 p-4 rounded-box border border-base-content/5">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <PhBus class="w-5 h-5 text-success" />
            1. Set the bus path
          </h3>
          <p class="text-sm text-base-content/70 leading-relaxed">
            Drag the start (S) and end (E) points on the map to match the bus path.
          </p>
        </div>

        <div class="bg-base-200/50 p-4 rounded-box border border-base-content/5">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <PhMapPin class="w-5 h-5 text-warning" weight="fill" />
            2. Pick a drop spot
          </h3>
          <p class="text-sm text-base-content/70 leading-relaxed">
            Click the map or drag the target (T) icon to where you want to land.
          </p>
        </div>

        <div class="bg-base-200/50 p-4 rounded-box border border-base-content/5">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <PhNavigationArrow class="w-5 h-5 text-primary" weight="fill" />
            3. Follow the markers
          </h3>
          <p class="text-sm text-base-content/70 leading-relaxed">
            Exit the bus at the jump (J) point and you should aim to auto deploy your glider at the deploy (D) point.
          </p>
        </div>

        <div
          class="mt-4 p-4 bg-base-200/30 rounded-xl text-xs text-base-content/60 border border-base-content/5"
        >
          <strong>Disclaimer:</strong> This tool uses a 2D map. It does not account for the
          elevation of your landing spot.
        </div>
      </div>

      <div class="mt-auto pt-8 pb-4"></div>
    </div>
  </div>
</template>
