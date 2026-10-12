-- shareonce backend. Paste into Supabase -> SQL Editor -> Run.

-- 1) Private storage bucket (50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('shares', 'shares', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 2) Metadata table. RLS on, and NO select/update/delete policies for anon:
--    the table can only be touched through the functions below.
create table if not exists public.shares (
  id            text primary key,
  storage_path  text not null,
  name          text not null,
  size          bigint not null,
  mime_type     text,
  view_once     boolean not null default true,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  access_until  timestamptz
);
alter table public.shares enable row level security;

drop policy if exists "anon can create shares" on public.shares;
create policy "anon can create shares" on public.shares
  for insert to anon
  with check (
    consumed_at is null
    and access_until is null
    and storage_path = id
    and char_length(id) between 8 and 32
    and size between 0 and 52428800
    and expires_at > now()
    and expires_at <= now() + interval '8 days'
  );

-- 3) Look at a share without using it up
create or replace function public.peek_share(p_id text)
returns table (id text, name text, size bigint, mime_type text, view_once boolean, expires_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.size, s.mime_type, s.view_once, s.expires_at,
         case when s.expires_at <= now() then 'expired'
              when s.view_once and s.consumed_at is not null then 'consumed'
              else 'available' end
  from public.shares s
  where s.id = p_id;
$$;

-- 4) Atomically claim a share. For view-once links only ONE caller ever gets a row back.
--    Claiming opens a 2-minute window in which the file can be downloaded.
create or replace function public.claim_share(p_id text)
returns table (storage_path text, name text, size bigint, mime_type text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.shares s
     set consumed_at  = coalesce(s.consumed_at, now()),
         access_until = now() + interval '2 minutes'
   where s.id = p_id
     and s.expires_at > now()
     and (not s.view_once or s.consumed_at is null)
  returning s.storage_path, s.name, s.size, s.mime_type;
end;
$$;

-- 5) Helpers used by storage policies (security definer so they can see the locked-down table)
create or replace function public.share_object_readable(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shares s where s.storage_path = p_path and s.access_until > now());
$$;

create or replace function public.share_object_deletable(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shares s
    where s.storage_path = p_path
      and ((s.view_once and s.consumed_at is not null) or s.expires_at <= now())
  );
$$;

grant execute on function public.peek_share(text) to anon;
grant execute on function public.claim_share(text) to anon;
grant execute on function public.share_object_readable(text) to anon;
grant execute on function public.share_object_deletable(text) to anon;

-- 6) Storage policies: anyone can upload, but can only read a file during its claim window,
--    and can only delete files that are already used up / expired.
drop policy if exists "shareonce upload" on storage.objects;
create policy "shareonce upload" on storage.objects
  for insert to anon with check (bucket_id = 'shares');

drop policy if exists "shareonce read claimed" on storage.objects;
create policy "shareonce read claimed" on storage.objects
  for select to anon using (bucket_id = 'shares' and public.share_object_readable(name));

drop policy if exists "shareonce delete burned" on storage.objects;
create policy "shareonce delete burned" on storage.objects
  for delete to anon using (bucket_id = 'shares' and public.share_object_deletable(name));
