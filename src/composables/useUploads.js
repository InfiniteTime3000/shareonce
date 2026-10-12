import { ref, reactive } from 'vue'
import { createShare, MAX_SIZE } from '../lib/shares'

export function useUploads() {
  const uploads = ref([])
  const controllers = new Map() // kept outside reactive state on purpose

  function addFiles(fileList, options) {
    for (const file of fileList) {
      const item = reactive({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        status: 'uploading', // 'uploading' | 'done' | 'error'
        progress: 0,
        link: null,
        error: null,
        viewOnce: options.viewOnce,
        expiresAt: null,
      })
      uploads.value.unshift(item)

      if (file.size > MAX_SIZE) {
        item.status = 'error'
        item.error = 'This file is over the 50 MB limit.'
        continue
      }

      const controller = new AbortController()
      controllers.set(item.id, controller)

      createShare(file, options, {
        signal: controller.signal,
        onProgress: (p) => (item.progress = p),
      })
        .then(({ link, expiresAt }) => {
          item.link = link
          item.expiresAt = expiresAt
          item.status = 'done'
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          item.status = 'error'
          item.error = err.message
        })
        .finally(() => controllers.delete(item.id))
    }
  }

  function remove(id) {
    controllers.get(id)?.abort()
    uploads.value = uploads.value.filter((u) => u.id !== id)
  }

  return { uploads, addFiles, remove }
}
