-- HOME OFFICE V63 - ACCOUNT VAULT
-- Admin-only storage for account/credential rows imported from spreadsheets.

create table if not exists public.account_vault (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Lainnya',
  account_label text not null,
  username text,
  secret_value text,
  notes text,
  status text not null default 'available'
    check (status in ('available','used','inactive')),
  source_file text,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_vault enable row level security;

grant select,insert,update,delete on public.account_vault to authenticated;

drop policy if exists "account_vault_admin_select" on public.account_vault;
create policy "account_vault_admin_select"
on public.account_vault
for select to authenticated
using (public.is_homeoffice_admin());

drop policy if exists "account_vault_admin_insert" on public.account_vault;
create policy "account_vault_admin_insert"
on public.account_vault
for insert to authenticated
with check (public.is_homeoffice_admin());

drop policy if exists "account_vault_admin_update" on public.account_vault;
create policy "account_vault_admin_update"
on public.account_vault
for update to authenticated
using (public.is_homeoffice_admin())
with check (public.is_homeoffice_admin());

drop policy if exists "account_vault_admin_delete" on public.account_vault;
create policy "account_vault_admin_delete"
on public.account_vault
for delete to authenticated
using (public.is_homeoffice_admin());

create index if not exists account_vault_status_idx on public.account_vault(status);
create index if not exists account_vault_category_idx on public.account_vault(category);
create index if not exists account_vault_created_at_idx on public.account_vault(created_at desc);
