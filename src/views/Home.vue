<script setup>
import { ref } from 'vue'
import DropZone from '../components/DropZone.vue'
import UploadItem from '../components/UploadItem.vue'
import { useUploads } from '../composables/useUploads'
import { EXPIRY_OPTIONS } from '../lib/shares'
import { isConfigured } from '../lib/supabase'

const { uploads, addFiles, remove } = useUploads()

const viewOnce = ref(true)
const expiresInHours = ref(24)

function onFiles(files) {
  addFiles(files, { viewOnce: viewOnce.value, expiresInHours: expiresInHours.value })
}
</script>

<template>
  <section>
    <h1 class="text-5xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-7xl">
      Share it once.<br />Then it's gone.
    </h1>
    <p class="mt-5 max-w-md text-lg text-ink-soft">
      Upload a file and send the link. The first person to open it sees it, and then it's deleted.
    </p>

    <div
      v-if="!isConfigured"
      class="mt-8 rounded-xl border border-burn/30 bg-burn-tint p-4 text-sm text-burn"
      role="alert"
    >
      Supabase isn't configured. Copy <code class="font-mono">.env.example</code> to
      <code class="font-mono">.env</code>, add your project URL and anon key, then restart
      <code class="font-mono">npm run dev</code>.
    </div>

    <div class="mt-10">
      <DropZone @files="onFiles" />
    </div>

    <div
      class="mt-3 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          :aria-checked="viewOnce"
          aria-labelledby="burn-label"
          class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          :class="viewOnce ? 'bg-accent' : 'bg-line-strong'"
          @click="viewOnce = !viewOnce"
        >
          <span
            class="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform"
            :class="viewOnce ? 'translate-x-5' : ''"
          />
        </button>
        <div>
          <p id="burn-label" class="text-sm font-medium">Delete after one view</p>
          <p class="text-xs text-ink-soft">
            {{
              viewOnce
                ? "The first person to open the link sees it, then it's gone."
                : "Anyone with the link can open it until it expires."
            }}
          </p>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm text-ink-soft">
        Expires after
        <select
          v-model.number="expiresInHours"
          class="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink"
        >
          <option v-for="o in EXPIRY_OPTIONS" :key="o.hours" :value="o.hours">{{ o.label }}</option>
        </select>
      </label>
    </div>

    <ul v-if="uploads.length" class="mt-6 space-y-3" aria-label="Your uploads">
      <UploadItem v-for="item in uploads" :key="item.id" :item="item" @remove="remove" />
    </ul>
  </section>
</template>
