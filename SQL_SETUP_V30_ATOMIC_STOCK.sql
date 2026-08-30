-- YANSTORE V30 — ATOMIC QUANTITY + STOCK RESERVATION
-- Jalankan setelah SQL_SETUP_V25_BUYER_ORDERS.sql
begin;
alter table if exists public.marketplace_orders
 add column if not exists quantity integer not null default 1,
 add column if not exists unit_price numeric,
 add column if not exists total_amount numeric,
 add column if not exists stock_reserved boolean not null default false;
update public.marketplace_orders set quantity=coalesce(quantity,1),
 unit_price=coalesce(unit_price,sell_price),
 total_amount=coalesce(total_amount,sell_price*coalesce(quantity,1))
where unit_price is null or total_amount is null;

create or replace function public.create_marketplace_order_v30(
 p_listing_id uuid,p_quantity integer,p_buyer_name text,p_buyer_contact text,
 p_buyer_email text default null,p_buyer_note text default null)
returns table(order_code text,quantity integer,unit_price numeric,total_amount numeric)
language plpgsql security definer set search_path=public as $$
declare v_listing record; v_qty integer:=greatest(coalesce(p_quantity,1),1); v_code text;
begin
 if length(trim(coalesce(p_buyer_name,'')))<2 then raise exception 'Nama buyer belum lengkap'; end if;
 if length(trim(coalesce(p_buyer_contact,'')))<5 then raise exception 'Kontak buyer belum lengkap'; end if;
 select l.* into v_listing from public.seller_listings l
 join public.sellers s on s.id=l.seller_id
 where l.id=p_listing_id and l.is_active=true and s.status='approved'
 for update of l;
 if not found then raise exception 'Listing tidak tersedia'; end if;
 if coalesce(v_listing.stock,0)<v_qty then raise exception 'Stok tidak cukup. Tersedia %',coalesce(v_listing.stock,0); end if;
 v_code:='YS-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.marketplace_orders(order_code,listing_id,seller_id,buyer_name,buyer_contact,buyer_email,buyer_note,
 sell_price,quantity,unit_price,total_amount,payment_status,order_status,stock_reserved)
 values(v_code,v_listing.id,v_listing.seller_id,trim(p_buyer_name),trim(p_buyer_contact),
 nullif(trim(coalesce(p_buyer_email,'')),''),nullif(trim(coalesce(p_buyer_note,'')),''),
 v_listing.sell_price,v_qty,v_listing.sell_price,v_listing.sell_price*v_qty,'pending','pending',true);
 update public.seller_listings set stock=stock-v_qty,updated_at=now() where id=v_listing.id;
 return query select v_code,v_qty,v_listing.sell_price::numeric,(v_listing.sell_price*v_qty)::numeric;
end $$;
grant execute on function public.create_marketplace_order_v30(uuid,integer,text,text,text,text) to anon,authenticated;
commit;
