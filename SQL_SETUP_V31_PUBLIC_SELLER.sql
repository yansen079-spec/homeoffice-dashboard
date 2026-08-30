-- ============================================================
-- YANSTORE V31 — PUBLIC SELLER REGISTRATION & STORE APPLICATION
-- Jalankan setelah setup Seller Portal V22+.
-- Tidak menghapus seller/listing/order lama.
-- ============================================================
begin;

alter table public.sellers
  add column if not exists store_slug text,
  add column if not exists store_description text,
  add column if not exists application_note text,
  add column if not exists applied_at timestamptz,
  add column if not exists approved_at timestamptz;

create unique index if not exists sellers_store_slug_unique
  on public.sellers(lower(store_slug)) where store_slug is not null;

-- Public/authenticated user submits their own store application.
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

  select id into v_id from public.sellers where auth_user_id=v_uid limit 1;
  if v_id is not null then
    update public.sellers
      set display_name=trim(p_display_name), store_name=trim(p_store_name),
          contact=trim(p_contact), email=v_email, store_description=nullif(trim(coalesce(p_store_description,'')),''),
          applied_at=coalesce(applied_at,now()), updated_at=now()
    where id=v_id;
    return v_id;
  end if;

  insert into public.sellers(auth_user_id,display_name,store_name,contact,email,status,store_slug,store_description,applied_at)
  values(v_uid,trim(p_display_name),trim(p_store_name),trim(p_contact),v_email,'pending',v_slug,
         nullif(trim(coalesce(p_store_description,'')),''),now())
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.apply_public_seller(text,text,text,text) from public;
grant execute on function public.apply_public_seller(text,text,text,text) to authenticated;

-- Allow an authenticated applicant to read ONLY their own seller/application row.
drop policy if exists v31_seller_self_application_select on public.sellers;
create policy v31_seller_self_application_select on public.sellers
for select to authenticated
using (auth_user_id=auth.uid());

-- Public signup must not grant marketplace management rights while pending.
-- Existing current_seller_id() already returns approved sellers only.

commit;
