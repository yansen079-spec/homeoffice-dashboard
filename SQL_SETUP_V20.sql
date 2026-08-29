-- HOME OFFICE V20 - REKAP PENJUALAN EXCEL

alter table public.employees
add column if not exists can_manage_sales boolean not null default false;

update public.employees
set can_manage_sales = true
where username = 'aping';

create table if not exists public.sales_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  product_name text not null,
  customer_name text not null,
  amount numeric(15,2) not null check (amount > 0),
  uploaded_by uuid not null references public.employees(id) on delete restrict,
  source_file text,
  source_row integer,
  import_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_by uuid not null references public.employees(id) on delete restrict,
  row_count integer not null default 0,
  revenue_total numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sales_transactions enable row level security;
alter table public.sales_import_batches enable row level security;

grant select,insert on public.sales_transactions to authenticated;
grant select,insert on public.sales_import_batches to authenticated;

create or replace function public.can_manage_sales_recap()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.employees
    where auth_user_id=auth.uid()
      and active=true
      and (role='admin' or can_manage_sales=true)
  );
$$;

drop policy if exists "sales_select" on public.sales_transactions;
create policy "sales_select" on public.sales_transactions
for select to authenticated
using (
  public.is_homeoffice_admin()
  or uploaded_by=(select id from public.employees where auth_user_id=auth.uid() limit 1)
);

drop policy if exists "sales_insert" on public.sales_transactions;
create policy "sales_insert" on public.sales_transactions
for insert to authenticated
with check (
  public.can_manage_sales_recap()
  and uploaded_by=(select id from public.employees where auth_user_id=auth.uid() limit 1)
);

drop policy if exists "sales_batches_select" on public.sales_import_batches;
create policy "sales_batches_select" on public.sales_import_batches
for select to authenticated
using (
  public.is_homeoffice_admin()
  or uploaded_by=(select id from public.employees where auth_user_id=auth.uid() limit 1)
);

drop policy if exists "sales_batches_insert" on public.sales_import_batches;
create policy "sales_batches_insert" on public.sales_import_batches
for insert to authenticated
with check (
  public.can_manage_sales_recap()
  and uploaded_by=(select id from public.employees where auth_user_id=auth.uid() limit 1)
);

do $$
begin
  alter publication supabase_realtime add table public.sales_transactions;
exception when duplicate_object then null;
end $$;

select full_name,username,role,can_manage_sales
from public.employees
where username='aping' or role='admin'
order by role,full_name;
