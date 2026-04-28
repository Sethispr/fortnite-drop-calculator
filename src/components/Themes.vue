<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue';
import { THEMES } from '../constants/themes';

defineProps<{
  id: string;
}>();
</script>

<template>
  <dialog :id="id" class="modal modal-bottom sm:modal-middle">
    <div
      class="modal-box max-w-4xl bg-base-200 p-0 overflow-hidden rounded-3xl border border-base-content/5 shadow-2xl"
    >
      <div
        class="bg-base-100/50 backdrop-blur-xl border-b border-base-content/5 p-6 flex items-center justify-between sticky top-0 z-10"
      >
        <div>
          <h3 class="text-2xl font-black tracking-tight">Appearance</h3>
          <p class="text-sm text-base-content/60 font-medium mt-1">Select a DaisyUI theme</p>
        </div>
        <form method="dialog">
          <button class="btn btn-ghost btn-circle btn-sm" aria-label="Close">
            <PhX class="w-5 h-5" />
          </button>
        </form>
      </div>
      <div class="p-6 max-h-[60vh] overflow-y-auto">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <label
            v-for="theme in THEMES"
            :key="theme"
            class="cursor-pointer group relative rounded-2xl overflow-hidden border-2 border-transparent has-[:checked]:border-primary transition-all hover:scale-105 shadow-sm hover:shadow-xl"
            :data-theme="theme"
          >
            <input
              type="radio"
              name="theme-radios"
              class="theme-controller hidden"
              :value="theme"
            />
            <div class="bg-base-100 text-base-content w-full h-full p-4 flex flex-col gap-4">
              <span class="font-bold capitalize tracking-tight">{{ theme }}</span>
              <div class="flex gap-2 h-6 w-full rounded-box overflow-hidden shadow-inner">
                <div class="bg-primary flex-1"></div>
                <div class="bg-secondary flex-1"></div>
                <div class="bg-accent flex-1"></div>
                <div class="bg-neutral flex-1"></div>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
