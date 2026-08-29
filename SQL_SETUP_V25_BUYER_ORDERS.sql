-- HomeOffice V25 - Buyer Marketplace Orders (SAFE MODE)
-- Jalankan SETELAH V24.
-- V25 menambahkan order buyer dari marketplace TANPA payment otomatis dan TANPA pengurangan stok.
-- seller_orders / seller_ledger / withdrawal_requests versi lama TIDAK diubah.

create extension if not exists pgcrypto;

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  listing_id uuid not null references public.seller_listings(id) on delete restrict,
  seller_id uuid not null references public.sellers(id) on delete restrict,
  product_id uuid not null references public.product_stock(id) on delete restrict,
  buyer_name text not null,
  buyer_contact text not null,
  buyer_email text,
  buyer_note text,
  product_name text not null,
  listing_title text not null,
  store_name text not null,
  sell_price numeric(14,2) not null check (sell_price > 0),
  status text not null default 'Menunggu' check (status in ('Menunggu','Diproses','Selesai','Dibatalkan')),
  payment_status text not null default 'Belum Dibayar' check (payment_status in ('Belum Dibayar','Menunggu Verifikasi','Dibayar','Gagal','Dikembalikan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists marketplace_orders_seller_idx
  on public.marketplace_orders(seller_id, created_at desc);
create index if not exists marketplace_orders_status_idx
  on public.marketplace_orders(status, created_at desc);

alter table public.marketplace_orders enable row level security;

drop policy if exists v25_admin_marketplace_orders on public.marketplace_orders;
drop policy if exists v25_seller_marketplace_orders_select on public.marketplace_orders;

create policy v25_admin_marketplace_orders on public.marketplace_orders
for all to authenticated
using (public.is_homeoffice_admin())
with check (public.is_homeoffice_admin());

create policy v25_seller_marketplace_orders_select on public.marketplace_orders
for select to authenticated
using (seller_id = public.current_seller_id());

grant select, insert, update, delete on public.marketplace_orders to authenticated;
grant select on public.marketplace_orders to anon;

-- Buyer membuat order hanya lewat RPC. Harga/seller/product selalu diambil ulang dari database,
-- jadi browser tidak dapat memalsukan harga atau seller_id.
create or replace function public.create_marketplace_order(
  p_listing_id uuid,
  p_buyer_name text,
  p_buyer_contact text,
  p_buyer_email text default null,
  p_buyer_note text default null
)
returns table (order_id uuid, order_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.seller_listings%rowtype;
  v_seller public.sellers%rowtype;
  v_product public.product_stock%rowtype;
  v_id uuid;
  v_code text;
begin
  if length(trim(coalesce(p_buyer_name,''))) < 2 then
    raise exception 'Nama buyer minimal 2 karakter.';
  end if;
  if length(trim(coalesce(p_buyer_contact,''))) < 5 then
    raise exception 'Nomor WhatsApp / kontak belum lengkap.';
  end if;
  if p_buyer_email is not null and trim(p_buyer_email) <> ''
     and position('@' in trim(p_buyer_email)) = 0 then
    raise exception 'Format email buyer tidak valid.';
  end if;

  select * into v_listing
  from public.seller_listings
  where id = p_listing_id and status = 'active';

  if not found then
    raise exception 'Listing sudah tidak tersedia.';
  end if;

  select * into v_seller from public.sellers where id = v_listing.seller_id;
  if not found or v_seller.status <> 'approved' then
    raise exception 'Seller sedang tidak aktif.';
  end if;

  select * into v_product from public.product_stock where id = v_listing.product_id;
  if not found or coalesce(v_product.active,false) = false or coalesce(v_product.stock,0) <= 0 then
    raise exception 'Stok produk sedang tidak tersedia.';
  end if;

  v_code := 'YS-' || to_char(clock_timestamp(),'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4),'hex'),1,8));

  insert into public.marketplace_orders(
    order_code, listing_id, seller_id, product_id,
    buyer_name, buyer_contact, buyer_email, buyer_note,
    product_name, listing_title, store_name, sell_price,
    status, payment_status
  ) values (
    v_code, v_listing.id, v_listing.seller_id, v_listing.product_id,
    trim(p_buyer_name), trim(p_buyer_contact), nullif(trim(coalesce(p_buyer_email,'')),''), nullif(trim(coalesce(p_buyer_note,'')),''),
    v_product.product_name, v_listing.title,
    coalesce(nullif(trim(v_seller.store_name),''), v_seller.display_name),
    v_listing.sell_price,
    'Menunggu','Belum Dibayar'
  ) returning id into v_id;

  return query select v_id, v_code;
end;
$$;

revoke all on function public.create_marketplace_order(uuid,text,text,text,text) from public;
grant execute on function public.create_marketplace_order(uuid,text,text,text,text) to anon, authenticated;

-- Admin saja yang dapat memperbarui status order marketplace.
create or replace function public.admin_set_marketplace_order_status(
  p_order_id uuid,
  p_status text,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_homeoffice_admin() then
    raise exception 'Akses admin diperlukan.';
  end if;
  if p_status not in ('Menunggu','Diproses','Selesai','Dibatalkan') then
    raise exception 'Status order tidak valid.';
  end if;
  if p_payment_status not in ('Belum Dibayar','Menunggu Verifikasi','Dibayar','Gagal','Dikembalikan') then
    raise exception 'Status pembayaran tidak valid.';
  end if;

  update public.marketplace_orders
  set status = p_status,
      payment_status = p_payment_status,
      updated_at = now(),
      completed_at = case when p_status = 'Selesai' then coalesce(completed_at,now()) else completed_at end
  where id = p_order_id;

  if not found then raise exception 'Order tidak ditemukan.'; end if;
end;
$$;

revoke all on function public.admin_set_marketplace_order_status(uuid,text,text) from public;
grant execute on function public.admin_set_marketplace_order_status(uuid,text,text) to authenticated;
