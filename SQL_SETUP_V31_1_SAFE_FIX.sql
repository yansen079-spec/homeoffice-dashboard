-- ============================================================
-- YANSTORE / HomeOffice V31.1 — SAFE FIX
-- Jalankan SETELAH V31.
-- Memperbaiki V30 Atomic Stock agar kompatibel dengan struktur V24/V25,
-- mengembalikan stok sekali saat order dibatalkan, dan merapikan re-apply seller.
-- Tidak menghapus data lama.
-- ============================================================
begin;

create extension if not exists pgcrypto;

-- Kolom tambahan V30, aman jika sudah pernah dibuat.
alter table if exists public.marketplace_orders
  add column if not exists quantity integer not null default 1,
  add column if not exists unit_price numeric,
  add column if not exists total_amount numeric,
  add column if not exists stock_reserved boolean not null default false;

update public.marketplace_orders
set quantity = greatest(coalesce(quantity,1),1),
    unit_price = coalesce(unit_price,sell_price),
    total_amount = coalesce(total_amount,sell_price * greatest(coalesce(quantity,1),1))
where unit_price is null or total_amount is null;

-- V31.1: checkout quantity + reservation atomik pada product_stock.
create or replace function public.create_marketplace_order_v30(
  p_listing_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_contact text,
  p_buyer_email text default null,
  p_buyer_note text default null
)
returns table(order_code text, quantity integer, unit_price numeric, total_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.seller_listings%rowtype;
  v_seller public.sellers%rowtype;
  v_product public.product_stock%rowtype;
  v_qty integer := greatest(coalesce(p_quantity,1),1);
  v_code text;
begin
  if v_qty > 999 then
    raise exception 'Jumlah pesanan terlalu besar.';
  end if;
  if length(trim(coalesce(p_buyer_name,''))) < 2 then
    raise exception 'Nama buyer belum lengkap.';
  end if;
  if length(trim(coalesce(p_buyer_contact,''))) < 5 then
    raise exception 'Kontak buyer belum lengkap.';
  end if;
  if p_buyer_email is not null and trim(p_buyer_email) <> ''
     and position('@' in trim(p_buyer_email)) = 0 then
    raise exception 'Format email buyer tidak valid.';
  end if;

  select * into v_listing
  from public.seller_listings
  where id = p_listing_id
    and status = 'active';

  if not found then
    raise exception 'Listing tidak tersedia.';
  end if;

  select * into v_seller
  from public.sellers
  where id = v_listing.seller_id
    and status = 'approved';

  if not found then
    raise exception 'Seller sedang tidak aktif.';
  end if;

  -- Lock baris stok produk. Dua checkout bersamaan tidak dapat oversell.
  select * into v_product
  from public.product_stock
  where id = v_listing.product_id
  for update;

  if not found or coalesce(v_product.active,false) = false then
    raise exception 'Produk sedang tidak tersedia.';
  end if;
  if coalesce(v_product.stock,0) < v_qty then
    raise exception 'Stok tidak cukup. Tersedia %', greatest(coalesce(v_product.stock,0),0);
  end if;

  v_code := 'YS-' || to_char(clock_timestamp(),'YYMMDD') || '-' ||
            upper(substr(encode(gen_random_bytes(4),'hex'),1,8));

  insert into public.marketplace_orders(
    order_code, listing_id, seller_id, product_id,
    buyer_name, buyer_contact, buyer_email, buyer_note,
    product_name, listing_title, store_name, sell_price,
    quantity, unit_price, total_amount,
    status, payment_status, stock_reserved
  ) values (
    v_code, v_listing.id, v_listing.seller_id, v_listing.product_id,
    trim(p_buyer_name), trim(p_buyer_contact),
    nullif(trim(coalesce(p_buyer_email,'')),''),
    nullif(trim(coalesce(p_buyer_note,'')),''),
    v_product.product_name, v_listing.title,
    coalesce(nullif(trim(v_seller.store_name),''),v_seller.display_name),
    v_listing.sell_price,
    v_qty, v_listing.sell_price, v_listing.sell_price * v_qty,
    'Menunggu', 'Belum Dibayar', true
  );

  update public.product_stock
  set stock = stock - v_qty
  where id = v_product.id;

  return query
    select v_code, v_qty, v_listing.sell_price::numeric,
           (v_listing.sell_price * v_qty)::numeric;
end;
$$;

revoke all on function public.create_marketplace_order_v30(uuid,integer,text,text,text,text) from public;
grant execute on function public.create_marketplace_order_v30(uuid,integer,text,text,text,text) to anon, authenticated;

-- V31.1: admin update status + restore reservation tepat satu kali bila dibatalkan.
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
declare
  v_order public.marketplace_orders%rowtype;
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

  select * into v_order
  from public.marketplace_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order tidak ditemukan.';
  end if;

  -- Jika reservation masih aktif dan order dibatalkan, kembalikan stok sekali saja.
  if p_status = 'Dibatalkan' and coalesce(v_order.stock_reserved,false) = true then
    update public.product_stock
    set stock = stock + greatest(coalesce(v_order.quantity,1),1)
    where id = v_order.product_id;

    v_order.stock_reserved := false;
  end if;

  -- Order yang sudah dibatalkan tidak boleh dihidupkan lagi melalui RPC ini,
  -- karena stoknya sudah dikembalikan.
  if v_order.status = 'Dibatalkan' and p_status <> 'Dibatalkan' then
    raise exception 'Order yang sudah dibatalkan tidak dapat diaktifkan kembali.';
  end if;

  update public.marketplace_orders
  set status = p_status,
      payment_status = p_payment_status,
      stock_reserved = v_order.stock_reserved,
      updated_at = now(),
      completed_at = case
        when p_status = 'Selesai' then coalesce(completed_at,now())
        else completed_at
      end
  where id = p_order_id;
end;
$$;

revoke all on function public.admin_set_marketplace_order_status(uuid,text,text) from public;
grant execute on function public.admin_set_marketplace_order_status(uuid,text,text) to authenticated;

-- V31.1: seller suspended boleh mengajukan ulang dan kembali ke pending.
create or replace function public.apply_public_seller(
  p_display_name text,
  p_store_name text,
  p_contact text,
  p_store_description text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_id uuid;
  v_status text;
  v_slug text;
begin
  if v_uid is null then raise exception 'Silakan login terlebih dahulu.'; end if;
  if v_email='' then raise exception 'Email akun tidak tersedia.'; end if;
  if length(trim(coalesce(p_display_name,'')))<2 then raise exception 'Nama seller belum lengkap.'; end if;
  if length(trim(coalesce(p_store_name,'')))<3 then raise exception 'Nama toko minimal 3 karakter.'; end if;
  if length(trim(coalesce(p_contact,'')))<5 then raise exception 'Kontak belum lengkap.'; end if;

  v_slug := lower(regexp_replace(trim(p_store_name),'[^a-zA-Z0-9]+','-','g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug='' then v_slug := 'toko'; end if;
  v_slug := v_slug || '-' || substr(replace(v_uid::text,'-',''),1,6);

  select id,status into v_id,v_status
  from public.sellers
  where auth_user_id=v_uid
  limit 1;

  if v_id is not null then
    update public.sellers
    set display_name=trim(p_display_name),
        store_name=trim(p_store_name),
        contact=trim(p_contact),
        email=v_email,
        store_slug=coalesce(store_slug,v_slug),
        store_description=nullif(trim(coalesce(p_store_description,'')),''),
        status=case when v_status='approved' then 'approved' else 'pending' end,
        applied_at=case when v_status='approved' then coalesce(applied_at,now()) else now() end,
        approved_at=case when v_status='approved' then approved_at else null end,
        updated_at=now()
    where id=v_id;
    return v_id;
  end if;

  insert into public.sellers(
    auth_user_id,display_name,store_name,contact,email,status,
    store_slug,store_description,applied_at
  ) values (
    v_uid,trim(p_display_name),trim(p_store_name),trim(p_contact),v_email,'pending',
    v_slug,nullif(trim(coalesce(p_store_description,'')),''),now()
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.apply_public_seller(text,text,text,text) from public;
grant execute on function public.apply_public_seller(text,text,text,text) to authenticated;

commit;
