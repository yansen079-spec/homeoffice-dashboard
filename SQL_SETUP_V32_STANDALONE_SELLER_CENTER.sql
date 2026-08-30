-- ============================================================
-- YANSTORE V32 — STANDALONE SELLER CENTER
-- Jalankan SETELAH V31.1.
-- Tujuan:
-- 1) Seller publik punya produk + stok sendiri (tidak bergantung Gudang HomeOffice)
-- 2) Seller Center dapat tambah/edit/nonaktifkan produk sendiri
-- 3) Marketplace membaca produk seller V32, tetap kompatibel dengan listing lama
-- 4) Seller dapat memproses status order miliknya; payment status tetap admin/HomeOffice
-- 5) HomeOffice tetap dapat membaca/memonitor data lewat policy admin yang sudah ada
-- Tidak menghapus data lama.
-- ============================================================
begin;

create extension if not exists pgcrypto;

create table if not exists public.seller_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  name text not null,
  category text,
  description text,
  image_url text,
  sell_price numeric(14,2) not null default 0 check (sell_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_products_seller_idx
  on public.seller_products(seller_id, updated_at desc);
create index if not exists seller_products_status_idx
  on public.seller_products(status, updated_at desc);

alter table public.seller_products enable row level security;

drop policy if exists v32_admin_seller_products on public.seller_products;
drop policy if exists v32_seller_products_self on public.seller_products;
create policy v32_admin_seller_products on public.seller_products
for all to authenticated
using (public.is_homeoffice_admin())
with check (public.is_homeoffice_admin());
create policy v32_seller_products_self on public.seller_products
for select to authenticated
using (seller_id = public.current_seller_id());

grant select on public.seller_products to authenticated;

-- Extend legacy listing/order tables so V32 can coexist with old data.
alter table public.seller_listings
  add column if not exists seller_product_id uuid references public.seller_products(id) on delete restrict;

-- Legacy product_id was required. V32 products no longer depend on product_stock.
alter table public.seller_listings alter column product_id drop not null;

create unique index if not exists seller_listings_seller_product_once
  on public.seller_listings(seller_id, seller_product_id)
  where seller_product_id is not null;

alter table public.marketplace_orders
  add column if not exists seller_product_id uuid references public.seller_products(id) on delete restrict;
alter table public.marketplace_orders alter column product_id drop not null;

-- Seller adds/edits one of their own products. Listing is created/updated automatically.
create or replace function public.upsert_seller_product_v32(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_image_url text,
  p_sell_price numeric,
  p_stock integer,
  p_minimum_stock integer,
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_seller uuid := public.current_seller_id();
  v_id uuid;
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Nama produk minimal 2 karakter.'; end if;
  if coalesce(p_sell_price,0) <= 0 then raise exception 'Harga jual harus lebih dari 0.'; end if;
  if coalesce(p_stock,0) < 0 then raise exception 'Stok tidak boleh negatif.'; end if;
  if coalesce(p_minimum_stock,0) < 0 then raise exception 'Minimum stok tidak boleh negatif.'; end if;
  if p_status not in ('active','paused','archived') then raise exception 'Status produk tidak valid.'; end if;

  if p_product_id is null then
    insert into public.seller_products(
      seller_id,name,category,description,image_url,sell_price,stock,minimum_stock,status
    ) values (
      v_seller,trim(p_name),nullif(trim(coalesce(p_category,'')),''),
      nullif(trim(coalesce(p_description,'')),''),nullif(trim(coalesce(p_image_url,'')),''),
      p_sell_price,p_stock,p_minimum_stock,p_status
    ) returning id into v_id;
  else
    update public.seller_products
    set name=trim(p_name),
        category=nullif(trim(coalesce(p_category,'')),''),
        description=nullif(trim(coalesce(p_description,'')),''),
        image_url=nullif(trim(coalesce(p_image_url,'')),''),
        sell_price=p_sell_price,
        stock=p_stock,
        minimum_stock=p_minimum_stock,
        status=p_status,
        updated_at=now()
    where id=p_product_id and seller_id=v_seller
    returning id into v_id;
    if v_id is null then raise exception 'Produk tidak ditemukan.'; end if;
  end if;

  insert into public.seller_listings(
    seller_id,product_id,seller_product_id,title,description,sell_price,status,updated_at
  )
  select v_seller,null,v_id,p.name,p.description,p.sell_price,
         case when p.status='active' and p.stock>0 then 'active' else 'paused' end,now()
  from public.seller_products p where p.id=v_id
  on conflict (seller_id,seller_product_id) where seller_product_id is not null
  do update set
    title=excluded.title,
    description=excluded.description,
    sell_price=excluded.sell_price,
    status=excluded.status,
    updated_at=now();

  return v_id;
end;
$$;
revoke all on function public.upsert_seller_product_v32(uuid,text,text,text,text,numeric,integer,integer,text) from public;
grant execute on function public.upsert_seller_product_v32(uuid,text,text,text,text,numeric,integer,integer,text) to authenticated;

create or replace function public.set_seller_product_status_v32(p_product_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_seller uuid := public.current_seller_id();
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if p_status not in ('active','paused','archived') then raise exception 'Status produk tidak valid.'; end if;
  update public.seller_products set status=p_status,updated_at=now()
  where id=p_product_id and seller_id=v_seller;
  if not found then raise exception 'Produk tidak ditemukan.'; end if;
  update public.seller_listings
  set status=case when p_status='active' and exists(select 1 from public.seller_products p where p.id=p_product_id and p.stock>0) then 'active' else 'paused' end,
      updated_at=now()
  where seller_id=v_seller and seller_product_id=p_product_id;
end;
$$;
revoke all on function public.set_seller_product_status_v32(uuid,text) from public;
grant execute on function public.set_seller_product_status_v32(uuid,text) to authenticated;

create or replace function public.adjust_seller_product_stock_v32(p_product_id uuid,p_stock integer)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_seller uuid := public.current_seller_id(); v_status text;
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if coalesce(p_stock,0) < 0 then raise exception 'Stok tidak boleh negatif.'; end if;
  update public.seller_products set stock=p_stock,updated_at=now()
  where id=p_product_id and seller_id=v_seller
  returning status into v_status;
  if v_status is null then raise exception 'Produk tidak ditemukan.'; end if;
  update public.seller_listings
  set status=case when v_status='active' and p_stock>0 then 'active' else 'paused' end,updated_at=now()
  where seller_id=v_seller and seller_product_id=p_product_id;
end;
$$;
revoke all on function public.adjust_seller_product_stock_v32(uuid,integer) from public;
grant execute on function public.adjust_seller_product_stock_v32(uuid,integer) to authenticated;

create or replace function public.update_seller_store_profile_v32(
  p_store_name text,p_display_name text,p_contact text,p_store_description text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_seller uuid := public.current_seller_id();
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if length(trim(coalesce(p_store_name,'')))<3 then raise exception 'Nama toko minimal 3 karakter.'; end if;
  if length(trim(coalesce(p_display_name,'')))<2 then raise exception 'Nama seller minimal 2 karakter.'; end if;
  if length(trim(coalesce(p_contact,'')))<5 then raise exception 'Kontak belum lengkap.'; end if;
  update public.sellers set store_name=trim(p_store_name),display_name=trim(p_display_name),
    contact=trim(p_contact),store_description=nullif(trim(coalesce(p_store_description,'')),''),updated_at=now()
  where id=v_seller;
end;
$$;
revoke all on function public.update_seller_store_profile_v32(text,text,text,text) from public;
grant execute on function public.update_seller_store_profile_v32(text,text,text,text) to authenticated;

-- Public marketplace: V32 products first, plus legacy listing compatibility.
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
set search_path=public
as $$
  select l.id,s.id,s.display_name,coalesce(nullif(trim(s.store_name),''),s.display_name),
         coalesce(sp.id,l.product_id),coalesce(sp.name,p.product_name,l.title),l.title,l.description,l.sell_price,
         greatest(coalesce(sp.stock,p.stock,0),0)::bigint,l.updated_at
  from public.seller_listings l
  join public.sellers s on s.id=l.seller_id
  left join public.seller_products sp on sp.id=l.seller_product_id
  left join public.product_stock p on p.id=l.product_id
  where l.status='active' and s.status='approved'
    and (
      (sp.id is not null and sp.status='active' and sp.stock>0)
      or
      (sp.id is null and p.id is not null and p.active=true and coalesce(p.stock,0)>0)
    )
  order by l.updated_at desc;
$$;
revoke all on function public.get_marketplace_listings() from public;
grant execute on function public.get_marketplace_listings() to anon,authenticated;

-- Checkout V32: lock seller-owned stock for V32, fallback to legacy product_stock.
create or replace function public.create_marketplace_order_v30(
  p_listing_id uuid,p_quantity integer,p_buyer_name text,p_buyer_contact text,
  p_buyer_email text default null,p_buyer_note text default null
)
returns table(order_code text,quantity integer,unit_price numeric,total_amount numeric)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_listing public.seller_listings%rowtype;
  v_seller public.sellers%rowtype;
  v_product public.product_stock%rowtype;
  v_sp public.seller_products%rowtype;
  v_qty integer := greatest(coalesce(p_quantity,1),1);
  v_code text; v_product_name text; v_stock integer;
begin
  if v_qty>999 then raise exception 'Jumlah pesanan terlalu besar.'; end if;
  if length(trim(coalesce(p_buyer_name,'')))<2 then raise exception 'Nama buyer belum lengkap.'; end if;
  if length(trim(coalesce(p_buyer_contact,'')))<5 then raise exception 'Kontak buyer belum lengkap.'; end if;
  if p_buyer_email is not null and trim(p_buyer_email)<>'' and position('@' in trim(p_buyer_email))=0 then raise exception 'Format email buyer tidak valid.'; end if;

  select * into v_listing from public.seller_listings where id=p_listing_id and status='active';
  if not found then raise exception 'Listing tidak tersedia.'; end if;
  select * into v_seller from public.sellers where id=v_listing.seller_id and status='approved';
  if not found then raise exception 'Seller sedang tidak aktif.'; end if;

  if v_listing.seller_product_id is not null then
    select * into v_sp from public.seller_products where id=v_listing.seller_product_id and seller_id=v_listing.seller_id for update;
    if not found or v_sp.status<>'active' then raise exception 'Produk sedang tidak tersedia.'; end if;
    v_stock:=v_sp.stock; v_product_name:=v_sp.name;
    if v_stock<v_qty then raise exception 'Stok tidak cukup. Tersedia %',greatest(v_stock,0); end if;
  else
    select * into v_product from public.product_stock where id=v_listing.product_id for update;
    if not found or coalesce(v_product.active,false)=false then raise exception 'Produk sedang tidak tersedia.'; end if;
    v_stock:=coalesce(v_product.stock,0); v_product_name:=v_product.product_name;
    if v_stock<v_qty then raise exception 'Stok tidak cukup. Tersedia %',greatest(v_stock,0); end if;
  end if;

  v_code:='YS-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,8));
  insert into public.marketplace_orders(
    order_code,listing_id,seller_id,product_id,seller_product_id,buyer_name,buyer_contact,buyer_email,buyer_note,
    product_name,listing_title,store_name,sell_price,quantity,unit_price,total_amount,status,payment_status,stock_reserved
  ) values (
    v_code,v_listing.id,v_listing.seller_id,v_listing.product_id,v_listing.seller_product_id,
    trim(p_buyer_name),trim(p_buyer_contact),nullif(trim(coalesce(p_buyer_email,'')),''),nullif(trim(coalesce(p_buyer_note,'')),''),
    v_product_name,v_listing.title,coalesce(nullif(trim(v_seller.store_name),''),v_seller.display_name),v_listing.sell_price,
    v_qty,v_listing.sell_price,v_listing.sell_price*v_qty,'Menunggu','Belum Dibayar',true
  );

  if v_listing.seller_product_id is not null then
    update public.seller_products set stock=stock-v_qty,updated_at=now() where id=v_listing.seller_product_id;
    if v_stock-v_qty<=0 then update public.seller_listings set status='paused',updated_at=now() where id=v_listing.id; end if;
  else
    update public.product_stock set stock=stock-v_qty where id=v_listing.product_id;
  end if;

  return query select v_code,v_qty,v_listing.sell_price::numeric,(v_listing.sell_price*v_qty)::numeric;
end;
$$;
revoke all on function public.create_marketplace_order_v30(uuid,integer,text,text,text,text) from public;
grant execute on function public.create_marketplace_order_v30(uuid,integer,text,text,text,text) to anon,authenticated;

-- Seller may process their own order, but cannot change payment verification.
create or replace function public.seller_set_marketplace_order_status_v32(p_order_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_seller uuid:=public.current_seller_id(); v_order public.marketplace_orders%rowtype;
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if p_status not in ('Menunggu','Diproses','Selesai','Dibatalkan') then raise exception 'Status order tidak valid.'; end if;
  select * into v_order from public.marketplace_orders where id=p_order_id and seller_id=v_seller for update;
  if not found then raise exception 'Order tidak ditemukan.'; end if;
  if v_order.status='Dibatalkan' and p_status<>'Dibatalkan' then raise exception 'Order yang sudah dibatalkan tidak dapat diaktifkan kembali.'; end if;
  if p_status='Dibatalkan' and coalesce(v_order.stock_reserved,false)=true then
    if v_order.seller_product_id is not null then
      update public.seller_products set stock=stock+greatest(coalesce(v_order.quantity,1),1),updated_at=now() where id=v_order.seller_product_id;
      update public.seller_listings l set status='active',updated_at=now()
      where l.id=v_order.listing_id and exists(select 1 from public.seller_products sp where sp.id=v_order.seller_product_id and sp.status='active' and sp.stock>0);
    elsif v_order.product_id is not null then
      update public.product_stock set stock=stock+greatest(coalesce(v_order.quantity,1),1) where id=v_order.product_id;
    end if;
    v_order.stock_reserved:=false;
  end if;
  update public.marketplace_orders set status=p_status,stock_reserved=v_order.stock_reserved,updated_at=now(),
    completed_at=case when p_status='Selesai' then coalesce(completed_at,now()) else completed_at end
  where id=p_order_id;
end;
$$;
revoke all on function public.seller_set_marketplace_order_status_v32(uuid,text) from public;
grant execute on function public.seller_set_marketplace_order_status_v32(uuid,text) to authenticated;

-- Keep admin cancellation compatible with V32 seller-owned stock.
create or replace function public.admin_set_marketplace_order_status(p_order_id uuid,p_status text,p_payment_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_order public.marketplace_orders%rowtype;
begin
  if not public.is_homeoffice_admin() then raise exception 'Akses admin diperlukan.'; end if;
  if p_status not in ('Menunggu','Diproses','Selesai','Dibatalkan') then raise exception 'Status order tidak valid.'; end if;
  if p_payment_status not in ('Belum Dibayar','Menunggu Verifikasi','Dibayar','Gagal','Dikembalikan') then raise exception 'Status pembayaran tidak valid.'; end if;
  select * into v_order from public.marketplace_orders where id=p_order_id for update;
  if not found then raise exception 'Order tidak ditemukan.'; end if;
  if p_status='Dibatalkan' and coalesce(v_order.stock_reserved,false)=true then
    if v_order.seller_product_id is not null then
      update public.seller_products set stock=stock+greatest(coalesce(v_order.quantity,1),1),updated_at=now() where id=v_order.seller_product_id;
      update public.seller_listings l set status='active',updated_at=now()
      where l.id=v_order.listing_id and exists(select 1 from public.seller_products sp where sp.id=v_order.seller_product_id and sp.status='active' and sp.stock>0);
    elsif v_order.product_id is not null then
      update public.product_stock set stock=stock+greatest(coalesce(v_order.quantity,1),1) where id=v_order.product_id;
    end if;
    v_order.stock_reserved:=false;
  end if;
  if v_order.status='Dibatalkan' and p_status<>'Dibatalkan' then raise exception 'Order yang sudah dibatalkan tidak dapat diaktifkan kembali.'; end if;
  update public.marketplace_orders set status=p_status,payment_status=p_payment_status,stock_reserved=v_order.stock_reserved,updated_at=now(),
    completed_at=case when p_status='Selesai' then coalesce(completed_at,now()) else completed_at end
  where id=p_order_id;
end;
$$;
revoke all on function public.admin_set_marketplace_order_status(uuid,text,text) from public;
grant execute on function public.admin_set_marketplace_order_status(uuid,text,text) to authenticated;

commit;
