<script setup>
import { ref } from 'vue'

const emit = defineEmits(['files'])
const input = ref(null)
const dragging = ref(false)
let depth = 0

function pick() {
  input.value?.click()
}
function onChange(e) {
  if (e.target.files?.length) emit('files', Array.from(e.target.files))
  e.target.value = ''
}
function onDrop(e) {
  depth = 0
  dragging.value = false
  if (e.dataTransfer?.files?.length) emit('files', Array.from(e.dataTransfer.files))
}
function onEnter() {
  depth++
  dragging.value = true
}
function onLeave() {
  depth = Math.max(0, depth - 1)
  if (depth === 0) dragging.value = false
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    aria-label="Upload files. Drop files here or press Enter to browse."
    class="group flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-150"
    :class="
      dragging
        ? 'border-accent bg-accent-tint'
        : 'border-line-strong bg-surface hover:border-accent hover:bg-accent-tint/50'
    "
    @click="pick"
    @keydown.enter.prevent="pick"
    @keydown.space.prevent="pick"
    @dragenter.prevent="onEnter"
    @dragover.prevent
    @dragleave.prevent="onLeave"
    @drop.prevent="onDrop"
  >
    <input ref="input" type="file" multiple class="sr-only" tabindex="-1" @change="onChange" />

    <div class="mb-5 grid size-14 place-items-center rounded-2xl bg-accent-tint text-accent">
      <svg
        class="size-7 transition-transform duration-200 group-hover:-translate-y-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    </div>

    <p class="text-xl font-semibold tracking-tight">
      {{ dragging ? 'Release to upload' : 'Drop files here' }}
    </p>
    <p class="mt-1.5 text-sm text-ink-soft">
      or <span class="font-medium text-accent underline underline-offset-4">browse your device</span>
      · up to 50 MB each
    </p>
  </div>
</template>
