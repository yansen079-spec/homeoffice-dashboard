-- HOME OFFICE V20.3 - GUDANG DIGITAL PRO

alter table public.digital_inventory
add column if not exists category text not null default 'Lainnya';

alter table public.digital_inventory
alter column secret_value drop not null;

create table if not exists public.digital_inventory_secrets (
  item_id uuid primary key references public.digital_inventory(id) on delete cascade,
  secret_value text not null,
  updated_at timestamptz not null default now()
);

insert into public.digital_inventory_secrets(item_id,secret_value)
select id,secret_value
from public.digital_inventory
where secret_value is not null and trim(secret_value) <> ''
on conflict (item_id) do update
set secret_value=excluded.secret_value, updated_at=now();

update public.digital_inventory
set secret_value=null
where secret_value is not null;

alter table public.digital_inventory_secrets enable row level security;
grant select,insert,update,delete on public.digital_inventory_secrets to authenticated;

drop policy if exists "digital_secrets_select_privileged" on public.digital_inventory_secrets;
create policy "digital_secrets_select_privileged"
on public.digital_inventory_secrets
for select to authenticated
using (
  public.is_homeoffice_admin()
  or exists (
    select 1 from public.employees e
    where e.auth_user_id=auth.uid()
      and e.username='paqih'
      and e.active=true
  )
);

drop policy if exists "digital_secrets_admin_insert" on public.digital_inventory_secrets;
create policy "digital_secrets_admin_insert"
on public.digital_inventory_secrets
for insert to authenticated
with check (public.is_homeoffice_admin());

drop policy if exists "digital_secrets_admin_update" on public.digital_inventory_secrets;
create policy "digital_secrets_admin_update"
on public.digital_inventory_secrets
for update to authenticated
using (public.is_homeoffice_admin())
with check (public.is_homeoffice_admin());

drop policy if exists "digital_secrets_admin_delete" on public.digital_inventory_secrets;
create policy "digital_secrets_admin_delete"
on public.digital_inventory_secrets
for delete to authenticated
using (public.is_homeoffice_admin());

select full_name,username,role,active
from public.employees
where role='admin' or username='paqih';
