# shareonce (frontend)

Vue 3 + Vite + Tailwind v4 + vue-router + Supabase.

## Setup
1. Create a Supabase project.
2. SQL Editor → paste and run `supabase/schema.sql` (bucket, table, functions, policies).
3. `cp .env.example .env` and fill in the project URL + anon key (Settings → API).
4. `npm install && npm run dev`

## Routes
- `/` – upload + get link
- `/s/:id` – "Open file" gate → protected viewer

## How one-time links work
- The `shares` table is locked down; the client only talks to `peek_share` / `claim_share`.
- `claim_share` is a single atomic UPDATE, so only one caller can ever claim a view-once link.
- Claiming opens a 2-minute window where storage RLS lets the file be downloaded; the client then deletes it.

## Screenshot protection: what it does and doesn't do
The viewer blurs/hides the file when the tab loses focus or is hidden (app switching, notification shade,
snipping tools), on PrintScreen / Cmd+Shift+3/4/5 / Win+Shift+S, on printing, and on 3-finger gestures.
It also blocks copy, save, right-click, drag and print, renders images to a canvas, and tiles a
watermark (link id + time) over everything.

A web page cannot detect or block OS-level screenshots, screen recording, or a phone camera pointed at
the screen. Treat this as a deterrent. Truly blocking capture needs a native app (e.g. Android FLAG_SECURE).

## TODO / hardening
- Add a scheduled cleanup (Edge Function with the service role) for expired and orphaned files.
- Add rate limiting (Supabase Edge Function / CAPTCHA) before going public.
