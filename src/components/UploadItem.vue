<script setup>
import { ref, computed } from 'vue'
import { formatSize } from '../utils'

const props = defineProps({ item: { type: Object, required: true } })
defineEmits(['remove'])

const copied = ref(false)

const expiryText = computed(() =>
  props.item.expiresAt
    ? `expires ${props.item.expiresAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
    : '',
)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.item.link)
  } catch {
    const el = document.createElement('textarea')
    el.value = props.item.link
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    el.remove()
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}
</script>

<template>
  <li class="rounded-2xl border border-line bg-surface p-4 sm:p-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="truncate font-medium">{{ item.name }}</p>
        <p class="text-sm text-ink-soft">{{ formatSize(item.size) }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        :aria-label="`${item.status === 'uploading' ? 'Cancel' : 'Dismiss'} ${item.name}`"
        @click="$emit('remove', item.id)"
      >
        {{ item.status === 'uploading' ? 'Cancel' : 'Dismiss' }}
      </button>
    </div>

    <div v-if="item.status === 'uploading'" class="mt-4">
      <div
        class="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        :aria-valuenow="Math.round(item.progress)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Uploading ${item.name}`"
      >
        <div
          class="h-full rounded-full bg-accent transition-[width] duration-150"
          :style="{ width: item.progress + '%' }"
        />
      </div>
      <p class="mt-2 text-sm text-ink-soft">Uploading… {{ Math.round(item.progress) }}%</p>
    </div>

    <div v-else-if="item.status === 'done'" class="mt-4">
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          :value="item.link"
          readonly
          class="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 font-mono text-sm"
          :aria-label="`Share link for ${item.name}`"
          @focus="$event.target.select()"
        />
        <button
          type="button"
          class="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          :class="copied ? 'bg-ok' : 'bg-accent hover:bg-accent-deep'"
          @click="copy"
        >
          {{ copied ? 'Copied' : 'Copy link' }}
        </button>
      </div>
      <p class="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-live="polite">
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="item.viewOnce ? 'bg-burn-tint text-burn' : 'bg-ok-tint text-ok'"
        >
          {{ item.viewOnce ? 'Deleted after first view' : 'Multiple views' }}
        </span>
        <span class="text-ink-soft">{{ expiryText }}</span>
      </p>
    </div>

    <p v-else class="mt-3 text-sm text-burn" role="alert">{{ item.error }}</p>
  </li>
</template>
