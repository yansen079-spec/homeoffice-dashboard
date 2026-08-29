-- HomeOffice V23 - Katalog Seller + Password Recovery
-- Jalankan SETELAH SQL V22.
-- Katalog ini sengaja hanya mengekspos nama produk dan jumlah stok.
-- Credential/secret Gudang Digital TIDAK ikut dibuka ke seller.

-- View read-only seller untuk stok produk umum HomeOffice.
-- security_invoker memastikan RLS tabel sumber tetap dihormati bila tersedia.
create or replace view public.seller_product_catalog
with (security_invoker = true)
as
select id, product_name, stock, minimum_stock
from public.product_stock
where active = true;

grant select on public.seller_product_catalog to authenticated;

-- Seller aktif boleh membaca product_stock, tetapi tidak diberi INSERT/UPDATE/DELETE.
alter table public.product_stock enable row level security;
drop policy if exists v23_seller_product_stock_select on public.product_stock;
create policy v23_seller_product_stock_select
on public.product_stock
for select to authenticated
using (public.current_seller_id() is not null);

grant select on public.product_stock to authenticated;

-- Tidak ada policy seller untuk digital_inventory_secrets.
-- Password/kode akun gudang tetap hanya untuk role yang sudah diizinkan sebelumnya.
