<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useScreenGuard } from '../composables/useScreenGuard'

const props = defineProps({
  blob: { type: Blob, required: true },
  name: { type: String, default: '' },
  mime: { type: String, default: '' },
  watermark: { type: String, default: 'shareonce' },
})

const { hidden, reason, resume } = useScreenGuard()

const canvas = ref(null)
const media = ref(null)
const mediaUrl = ref('')
const text = ref('')
const loadError = ref('')

const TEXT_EXT = /\.(txt|md|csv|log|json|xml|yml|yaml)$/i
const kind = computed(() => {
  const t = props.mime || props.blob.type || ''
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t.startsWith('text/') || t === 'application/json' || t === 'application/xml' || TEXT_EXT.test(props.name))
    return 'text'
  return 'other'
})

// Tiled diagonal watermark so any leaked capture can be traced back.
const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)
const watermarkBg = computed(() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="180">` +
    `<text x="170" y="90" text-anchor="middle" transform="rotate(-24 170 90)" ` +
    `font-family="sans-serif" font-size="13" font-weight="600" ` +
    `fill="rgba(255,255,255,.30)" stroke="rgba(0,0,0,.22)" stroke-width=".5">${escapeXml(props.watermark)}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})

async function drawImage() {
  const url = URL.createObjectURL(props.blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = canvas.value
    c.width = img.naturalWidth || 1200
    c.height = img.naturalHeight || 800
    c.getContext('2d').drawImage(img, 0, 0)
  } finally {
    URL.revokeObjectURL(url)
  }
}

onMounted(async () => {
  try {
    if (kind.value === 'image') await drawImage()
    else if (kind.value === 'video' || kind.value === 'audio') mediaUrl.value = URL.createObjectURL(props.blob)
    else if (kind.value === 'text') text.value = (await props.blob.text()).slice(0, 200000)
  } catch {
    loadError.value = "This file couldn't be displayed."
  }
})

onBeforeUnmount(() => {
  if (mediaUrl.value) URL.revokeObjectURL(mediaUrl.value)
})

watch(hidden, (h) => {
  if (h) media.value?.pause?.()
})

function download() {
  const url = URL.createObjectURL(props.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = props.name || 'file'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <div
    class="guard relative min-h-64 overflow-hidden rounded-2xl"
    :class="kind === 'text' || kind === 'other' ? 'border border-line bg-surface' : 'bg-ink'"
  >
    <div class="guard-content" :class="{ 'is-hidden': hidden }">
      <p v-if="loadError" class="p-8 text-center text-sm text-burn">{{ loadError }}</p>

      <canvas
        v-else-if="kind === 'image'"
        ref="canvas"
        class="mx-auto block h-auto max-h-[75vh] w-auto max-w-full"
        role="img"
        :aria-label="name"
      />

      <video
        v-else-if="kind === 'video' && mediaUrl"
        ref="media"
        :src="mediaUrl"
        class="mx-auto block max-h-[75vh] w-full"
        controls
        playsinline
        controlslist="nodownload noremoteplayback"
        disablepictureinpicture
        disableremoteplayback
      />

      <div v-else-if="kind === 'audio' && mediaUrl" class="p-8">
        <audio ref="media" :src="mediaUrl" class="w-full" controls controlslist="nodownload" />
      </div>

      <pre
        v-else-if="kind === 'text'"
        class="max-h-[75vh] overflow-auto whitespace-pre-wrap wrap-break-word p-6 font-mono text-sm leading-relaxed"
        >{{ text }}</pre
      >

      <div v-else-if="kind === 'other'" class="p-10 text-center">
        <p class="font-medium">This file type can't be previewed.</p>
        <p class="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
          You can download it once. Screenshot protection doesn't apply to downloaded files.
        </p>
        <button
          type="button"
          class="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
          @click="download"
        >
          Download {{ name }}
        </button>
      </div>
    </div>

    <div class="watermark" :style="{ backgroundImage: watermarkBg }" aria-hidden="true" />

    <div
      v-if="hidden"
      class="absolute inset-0 z-10 grid place-items-center bg-ink/30 p-6 text-center"
      role="alertdialog"
      aria-label="File hidden"
    >
      <div class="max-w-xs rounded-2xl bg-surface p-6 shadow-xl">
        <div class="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-tint text-accent">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <p class="font-semibold">Hidden to protect this file</p>
        <p class="mt-1 text-sm text-ink-soft">{{ reason }}</p>
        <button
          type="button"
          class="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
          @click="resume"
        >
          Show file
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guard {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.guard :is(canvas, img, video) {
  -webkit-user-drag: none;
}
.guard-content {
  transition: filter 0.2s;
}
/* No transition when hiding: the blur has to be instant. */
.guard-content.is-hidden {
  filter: blur(40px) brightness(0.7);
  transition: none;
  pointer-events: none;
}
.watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
}
</style>
