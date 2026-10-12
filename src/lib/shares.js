import { supabase, supabaseUrl, supabaseKey, BUCKET, isConfigured } from './supabase'
import { shortId } from '../utils'

export const MAX_SIZE = 50 * 1024 * 1024 // keep in sync with schema.sql + Supabase plan limit
export const EXPIRY_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
]

function assertConfigured() {
  if (!isConfigured) {
    throw new Error('Supabase isn’t configured yet. Add your keys to .env and restart the dev server.')
  }
}

/** Upload with real progress (supabase-js doesn't expose upload progress, so we hit the REST endpoint). */
function putObject(path, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('apikey', supabaseKey)
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = 'Upload failed.'
      try {
        msg = JSON.parse(xhr.responseText).message || msg
      } catch {}
      reject(new Error(msg))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading.'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort())

    xhr.send(file)
  })
}

export async function createShare(file, { viewOnce, expiresInHours }, { onProgress, signal } = {}) {
  assertConfigured()
  const id = shortId(10)

  await putObject(id, file, onProgress, signal)

  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000)
  const { error } = await supabase.from('shares').insert({
    id,
    storage_path: id,
    name: file.name,
    size: file.size,
    mime_type: file.type || null,
    view_once: viewOnce,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw new Error(error.message)

  return { id, link: `${location.origin}/s/${id}`, expiresAt }
}

/** Look at a share without consuming it. Returns null if it doesn't exist. */
export async function peekShare(id) {
  assertConfigured()
  const { data, error } = await supabase.rpc('peek_share', { p_id: id })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

/** Atomically claim a share (this is what "uses up" a one-time link). Returns null if not claimable. */
export async function claimShare(id) {
  assertConfigured()
  const { data, error } = await supabase.rpc('claim_share', { p_id: id })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

export async function downloadShareFile(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw new Error(error.message)
  return data
}

export async function burnFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}
