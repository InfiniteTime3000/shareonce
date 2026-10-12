<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-3xl flex-col px-5 sm:px-8">
    <header class="py-6">
      <RouterLink to="/" class="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight">
        <span class="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">1</span>
        shareonce
      </RouterLink>
    </header>

    <main class="flex-1 pb-16 pt-6 sm:pt-12">
      <RouterView />
    </main>

    <footer class="py-6 text-sm text-ink-soft">
      Files are deleted once opened, or when they expire.
    </footer>
  </div>
</template>
