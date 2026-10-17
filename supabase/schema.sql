-- Kasir Batang Garing: tabel cloud untuk sinkron data kasir.
-- Jalankan sekali di Supabase → SQL Editor → New query → tempel → Run.

create table if not exists public.kasir_data (
  owner      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  coll       text        not null,               -- menu, trx, shifts, stok, dst.
  id         text        not null,               -- id catatan di aplikasi
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner, coll, id)
);

create index if not exists kasir_data_owner_updated on public.kasir_data (owner, updated_at);

-- updated_at selalu diisi server, supaya urutan sinkron tidak bergantung jam tablet
create or replace function public.kasir_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists kasir_data_touch on public.kasir_data;
create trigger kasir_data_touch before insert or update on public.kasir_data
  for each row execute function public.kasir_touch();

-- Keamanan: setiap akun hanya bisa membaca dan menulis datanya sendiri
alter table public.kasir_data enable row level security;

drop policy if exists "kasir baca milik sendiri" on public.kasir_data;
create policy "kasir baca milik sendiri" on public.kasir_data
  for select to authenticated using (owner = (select auth.uid()));

drop policy if exists "kasir tambah milik sendiri" on public.kasir_data;
create policy "kasir tambah milik sendiri" on public.kasir_data
  for insert to authenticated with check (owner = (select auth.uid()));

drop policy if exists "kasir ubah milik sendiri" on public.kasir_data;
create policy "kasir ubah milik sendiri" on public.kasir_data
  for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

revoke all on public.kasir_data from anon;
grant select, insert, update on public.kasir_data to authenticated;
