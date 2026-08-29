-- HomeOffice V21 - Seller Center SAFE MODE
-- Tujuan: seller, order, ledger profit, withdrawal manual.
-- Tidak ada auto payout / auto withdraw.

create extension if not exists pgcrypto;

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique null,
  display_name text not null,
  store_name text,
  contact text,
  email text,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete restrict,
  buyer_name text,
  product_name text not null,
  sell_price numeric(14,2) not null default 0 check (sell_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  seller_profit numeric(14,2) not null default 0 check (seller_profit >= 0),
  status text not null default 'Pending' check (status in ('Pending','Diproses','Selesai','Dibatalkan')),
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.seller_ledger (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete restrict,
  entry_type text not null check (entry_type in ('order_profit','adjustment','withdrawal')),
  amount numeric(14,2) not null,
  reference_id uuid,
  note text,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Satu profit hanya boleh dikreditkan sekali per order, dan satu debit sekali per withdrawal.
create unique index if not exists seller_ledger_order_profit_once
  on public.seller_ledger(reference_id, entry_type)
  where reference_id is not null and entry_type='order_profit';
create unique index if not exists seller_ledger_withdrawal_once
  on public.seller_ledger(reference_id, entry_type)
  where reference_id is not null and entry_type='withdrawal';

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  destination_type text not null,
  destination_account text not null,
  destination_name text not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  requested_by uuid references public.employees(id) on delete set null,
  processed_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists sellers_status_idx on public.sellers(status);
create index if not exists seller_orders_seller_idx on public.seller_orders(seller_id, created_at desc);
create index if not exists seller_ledger_seller_idx on public.seller_ledger(seller_id, created_at desc);
create index if not exists withdrawal_requests_seller_idx on public.withdrawal_requests(seller_id, created_at desc);

alter table public.sellers enable row level security;
alter table public.seller_orders enable row level security;
alter table public.seller_ledger enable row level security;
alter table public.withdrawal_requests enable row level security;

-- Helper: hanya akun HomeOffice ber-role admin yang boleh mengubah modul finansial tahap 1.
create or replace function public.is_homeoffice_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.auth_user_id = auth.uid()
      and e.role = 'admin'
      and coalesce(e.active,true) = true
  );
$$;

revoke all on function public.is_homeoffice_admin() from public;
grant execute on function public.is_homeoffice_admin() to authenticated;

-- Drop policy dengan nama V21 saja agar script aman dijalankan ulang.
drop policy if exists v21_admin_sellers on public.sellers;
drop policy if exists v21_admin_orders on public.seller_orders;
drop policy if exists v21_admin_ledger on public.seller_ledger;
drop policy if exists v21_admin_withdrawals on public.withdrawal_requests;

create policy v21_admin_sellers on public.sellers
for all to authenticated using (public.is_homeoffice_admin()) with check (public.is_homeoffice_admin());
create policy v21_admin_orders on public.seller_orders
for all to authenticated using (public.is_homeoffice_admin()) with check (public.is_homeoffice_admin());
create policy v21_admin_ledger on public.seller_ledger
for all to authenticated using (public.is_homeoffice_admin()) with check (public.is_homeoffice_admin());
create policy v21_admin_withdrawals on public.withdrawal_requests
for all to authenticated using (public.is_homeoffice_admin()) with check (public.is_homeoffice_admin());

-- Tidak memberi akses anon. Seller login sendiri akan ditambahkan pada tahap berikutnya
-- dengan policy terpisah dan hanya dapat membaca data miliknya sendiri.
