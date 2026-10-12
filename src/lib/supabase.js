import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const BUCKET = 'shares'
export const isConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null
