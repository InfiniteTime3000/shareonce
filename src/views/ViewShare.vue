<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ProtectedViewer from '../components/ProtectedViewer.vue'
import { peekShare, claimShare, downloadShareFile, burnFile } from '../lib/shares'
import { formatSize } from '../utils'

const props = defineProps({ id: { type: String, required: true } })

// loading | ready | opening | viewing | consumed | expired | missing | error
const state = ref('loading')
const share = ref(null)
const claim = ref(null)
const blob = ref(null)
const errorMsg = ref('')
const openedAt = ref(new Date())

const watermark = computed(
  () => `${props.id} · ${openedAt.value.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`,
)

async function load() {
  state.value = 'loading'
  blob.value = null
  claim.value = null
  try {
    const row = await peekShare(props.id)
    if (!row) {
      state.value = 'missing'
      return
    }
    share.value = row
    state.value = row.status === 'available' ? 'ready' : row.status
  } catch (e) {
    errorMsg.value = e.message
    state.value = 'error'
  }
}

async function open() {
  state.value = 'opening'
  try {
    if (!claim.value) {
      claim.value = await claimShare(props.id)
      if (!claim.value) return load() // someone else got there first, or it expired
    }
    const file = await downloadShareFile(claim.value.storage_path)
    blob.value = new Blob([file], { type: claim.value.mime_type || file.type })
    openedAt.value = new Date()
    if (share.value.view_once) burnFile(claim.value.storage_path).catch(() => {})
    state.value = 'viewing'
  } catch (e) {
    errorMsg.value = e.message
    state.value = 'error'
  }
}

watch(() => props.id, load, { immediate: true })

const messages = {
  consumed: ['This file has already been opened', 'Links from shareonce can only be opened once, and this one has been used.'],
  expired: ['This link has expired', 'The file is no longer available.'],
  missing: ["We couldn't find this file', 'Check the link, or ask the sender to share it again."],
}
</script>

<template>
  <section>
    <!-- loading -->
    <p v-if="state === 'loading'" class="py-24 text-center text-ink-soft">Checking link…</p>

    <!-- ready / opening -->
    <div
      v-else-if="state === 'ready' || state === 'opening'"
      class="mx-auto mt-6 max-w-md rounded-3xl border border-line bg-surface p-8 text-center sm:mt-14"
    >
      <div class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent-tint text-accent">
        <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </div>
      <h1 class="wrap-break-word text-2xl font-semibold tracking-tight">{{ share.name }}</h1>
      <p class="mt-1 text-sm text-ink-soft">{{ formatSize(share.size) }}</p>

      <p
        v-if="share.view_once"
        class="mt-5 rounded-xl bg-burn-tint px-4 py-3 text-sm text-burn"
      >
        This link works once. After you open the file, it's deleted and can't be opened again.
      </p>
      <p v-else class="mt-5 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
        Available until {{ new Date(share.expires_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }}.
      </p>

      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        :disabled="state === 'opening'"
        @click="open"
      >
        {{ state === 'opening' ? 'Opening…' : 'Open file' }}
      </button>
      <p class="mt-4 text-xs text-ink-soft">
        The file is hidden if you switch apps or try to capture the screen.
      </p>
    </div>

    <!-- viewing -->
    <div v-else-if="state === 'viewing'" class="pt-2">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold tracking-tight">{{ share.name }}</h1>
          <p v-if="share.view_once" class="text-sm text-burn">
            One-time link: once you leave, it can't be opened again.
          </p>
        </div>
        <RouterLink
          to="/"
          class="shrink-0 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-line-strong"
        >
          Close
        </RouterLink>
      </div>
      <ProtectedViewer :blob="blob" :name="share.name" :mime="claim.mime_type" :watermark="watermark" />
    </div>

    <!-- consumed / expired / missing -->
    <div
      v-else-if="messages[state]"
      class="mx-auto mt-6 max-w-md rounded-3xl border border-line bg-surface p-8 text-center sm:mt-14"
    >
      <h1 class="text-2xl font-semibold tracking-tight">{{ messages[state][0] }}</h1>
      <p class="mt-2 text-ink-soft">{{ messages[state][1] }}</p>
      <RouterLink
        to="/"
        class="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        Share a file
      </RouterLink>
    </div>

    <!-- error -->
    <div
      v-else
      class="mx-auto mt-6 max-w-md rounded-3xl border border-line bg-surface p-8 text-center sm:mt-14"
      role="alert"
    >
      <h1 class="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p class="mt-2 text-ink-soft">{{ errorMsg }}</p>
      <button
        type="button"
        class="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
        @click="claim ? open() : load()"
      >
        Try again
      </button>
    </div>
  </section>
</template>
