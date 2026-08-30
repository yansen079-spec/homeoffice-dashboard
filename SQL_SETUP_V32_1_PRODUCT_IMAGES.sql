-- ============================================================
-- YANSTORE V32.1 — PRODUCT IMAGE UPLOAD (MAX 5)
-- Jalankan SETELAH SQL_SETUP_V32_STANDALONE_SELLER_CENTER.sql
-- Aman untuk data lama: image_url lama tetap dipakai sebagai cover fallback.
-- ============================================================
begin;

alter table public.seller_products
  add column if not exists image_urls text[] not null default '{}'::text[];

update public.seller_products
set image_urls = array[image_url]
where image_url is not null and trim(image_url) <> '' and coalesce(array_length(image_urls,1),0)=0;

-- Public bucket untuk foto produk seller.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'seller-product-images','seller-product-images',true,5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=true,
  file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Folder pertama wajib auth.uid(), jadi seller tidak dapat menulis folder seller lain.
drop policy if exists v321_product_images_public_read on storage.objects;
drop policy if exists v321_product_images_insert_own on storage.objects;
drop policy if exists v321_product_images_update_own on storage.objects;
drop policy if exists v321_product_images_delete_own on storage.objects;

create policy v321_product_images_public_read on storage.objects
for select to public
using (bucket_id='seller-product-images');

create policy v321_product_images_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id='seller-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy v321_product_images_update_own on storage.objects
for update to authenticated
using (
  bucket_id='seller-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id='seller-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy v321_product_images_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id='seller-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.upsert_seller_product_v32_1(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_image_urls text[],
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
  v_images text[] := coalesce(p_image_urls,'{}'::text[]);
  v_cover text;
begin
  if v_seller is null then raise exception 'Akun seller belum aktif.'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Nama produk minimal 2 karakter.'; end if;
  if coalesce(p_sell_price,0) <= 0 then raise exception 'Harga jual harus lebih dari 0.'; end if;
  if coalesce(p_stock,0) < 0 then raise exception 'Stok tidak boleh negatif.'; end if;
  if coalesce(p_minimum_stock,0) < 0 then raise exception 'Minimum stok tidak boleh negatif.'; end if;
  if p_status not in ('active','paused','archived') then raise exception 'Status produk tidak valid.'; end if;
  if coalesce(array_length(v_images,1),0) > 5 then raise exception 'Maksimal 5 foto produk.'; end if;

  select array_agg(trim(x)) into v_images
  from unnest(v_images) x
  where x is not null and trim(x)<>'';
  v_images := coalesce(v_images,'{}'::text[]);
  if coalesce(array_length(v_images,1),0) > 5 then raise exception 'Maksimal 5 foto produk.'; end if;
  v_cover := case when coalesce(array_length(v_images,1),0)>0 then v_images[1] else null end;

  if p_product_id is null then
    insert into public.seller_products(
      seller_id,name,category,description,image_url,image_urls,sell_price,stock,minimum_stock,status
    ) values (
      v_seller,trim(p_name),nullif(trim(coalesce(p_category,'')),''),
      nullif(trim(coalesce(p_description,'')),''),v_cover,v_images,
      p_sell_price,p_stock,p_minimum_stock,p_status
    ) returning id into v_id;
  else
    update public.seller_products
    set name=trim(p_name),
        category=nullif(trim(coalesce(p_category,'')),''),
        description=nullif(trim(coalesce(p_description,'')),''),
        image_url=v_cover,
        image_urls=v_images,
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
revoke all on function public.upsert_seller_product_v32_1(uuid,text,text,text,text[],numeric,integer,integer,text) from public;
grant execute on function public.upsert_seller_product_v32_1(uuid,text,text,text,text[],numeric,integer,integer,text) to authenticated;

create or replace function public.get_marketplace_listings_v32_1()
returns table (
  listing_id uuid,
  seller_id uuid,
  seller_name text,
  store_name text,
  product_id uuid,
  product_name text,
  title text,
  description text,
  image_url text,
  image_urls text[],
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
         coalesce(sp.id,l.product_id),coalesce(sp.name,p.product_name,l.title),l.title,l.description,
         sp.image_url,coalesce(sp.image_urls,'{}'::text[]),l.sell_price,
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
revoke all on function public.get_marketplace_listings_v32_1() from public;
grant execute on function public.get_marketplace_listings_v32_1() to anon,authenticated;

commit;
