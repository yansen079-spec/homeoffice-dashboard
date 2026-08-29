-- HomeOffice V24 - Seller Listings + Public Marketplace (SAFE MODE)
-- Jalankan SETELAH V23.
-- Seller dapat membuat listing dari produk stok HomeOffice dan menentukan harga jual.
-- Seller TIDAK dapat mengubah stok asli. Marketplace publik hanya membaca field aman.
-- Checkout/pembayaran otomatis BELUM dibuat pada V24.

create table if not exists public.seller_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_id uuid not null references public.product_stock(id) on delete restrict,
  title text not null,
  description text,
  sell_price numeric(14,2) not null check (sell_price > 0),
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(seller_id, product_id)
);

create index if not exists seller_listings_seller_idx
  on public.seller_listings(seller_id, updated_at desc);
create index if not exists seller_listings_public_idx
  on public.seller_listings(status, updated_at desc);

alter table public.seller_listings enable row level security;

drop policy if exists v24_admin_listings on public.seller_listings;
drop policy if exists v24_seller_own_listings_select on public.seller_listings;

create policy v24_admin_listings on public.seller_listings
for all to authenticated
using (public.is_homeoffice_admin())
with check (public.is_homeoffice_admin());

create policy v24_seller_own_listings_select on public.seller_listings
for select to authenticated
using (seller_id = public.current_seller_id());

grant select on public.seller_listings to authenticated;
grant select, insert, update, delete on public.seller_listings to authenticated;

-- Seller membuat / memperbarui listing lewat RPC agar seller_id dan product_id tervalidasi.
create or replace function public.upsert_seller_listing(
  p_product_id uuid,
  p_title text,
  p_description text,
  p_sell_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_product_name text;
  v_active boolean;
  v_id uuid;
begin
  v_seller := public.current_seller_id();
  if v_seller is null then
    raise exception 'Akun seller tidak aktif atau belum terhubung.';
  end if;

  if p_sell_price is null or p_sell_price <= 0 then
    raise exception 'Harga jual harus lebih dari 0.';
  end if;

  select product_name, active into v_product_name, v_active
  from public.product_stock
  where id = p_product_id;

  if v_product_name is null or coalesce(v_active,false) = false then
    raise exception 'Produk tidak tersedia di katalog.';
  end if;

  if length(trim(coalesce(p_title,''))) < 2 then
    p_title := v_product_name;
  end if;

  insert into public.seller_listings(
    seller_id, product_id, title, description, sell_price, status, updated_at
  ) values (
    v_seller, p_product_id, trim(p_title), nullif(trim(coalesce(p_description,'')),''), p_sell_price, 'active', now()
  )
  on conflict (seller_id, product_id)
  do update set
    title = excluded.title,
    description = excluded.description,
    sell_price = excluded.sell_price,
    status = 'active',
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_seller_listing(uuid,text,text,numeric) from public;
grant execute on function public.upsert_seller_listing(uuid,text,text,numeric) to authenticated;

create or replace function public.set_seller_listing_status(
  p_listing_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  v_seller := public.current_seller_id();
  if v_seller is null then
    raise exception 'Akun seller tidak aktif atau belum terhubung.';
  end if;
  if p_status not in ('active','paused') then
    raise exception 'Status listing tidak valid.';
  end if;

  update public.seller_listings
  set status = p_status, updated_at = now()
  where id = p_listing_id and seller_id = v_seller;

  if not found then
    raise exception 'Listing tidak ditemukan.';
  end if;
end;
$$;

revoke all on function public.set_seller_listing_status(uuid,text) from public;
grant execute on function public.set_seller_listing_status(uuid,text) to authenticated;

-- RPC publik: hanya field aman untuk halaman marketplace.
create or replace function public.get_marketplace_listings()
returns table (
  listing_id uuid,
  seller_id uuid,
  seller_name text,
  store_name text,
  product_id uuid,
  product_name text,
  title text,
  description text,
  sell_price numeric,
  stock bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    s.id,
    s.display_name,
    coalesce(nullif(trim(s.store_name),''), s.display_name),
    p.id,
    p.product_name,
    l.title,
    l.description,
    l.sell_price,
    greatest(coalesce(p.stock,0),0)::bigint,
    l.updated_at
  from public.seller_listings l
  join public.sellers s on s.id = l.seller_id
  join public.product_stock p on p.id = l.product_id
  where l.status = 'active'
    and s.status = 'approved'
    and p.active = true
    and coalesce(p.stock,0) > 0
  order by l.updated_at desc;
$$;

revoke all on function public.get_marketplace_listings() from public;
grant execute on function public.get_marketplace_listings() to anon, authenticated;
