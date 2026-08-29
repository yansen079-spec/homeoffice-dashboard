-- HomeOffice V22 - Seller Portal SAFE MODE
-- Jalankan SETELAH SQL V21 dan GRANT V21 yang sudah dipakai.
-- Seller hanya dapat membaca data miliknya dan meminta withdrawal.
-- Seller TIDAK dapat menandai withdrawal dibayar, mengubah ledger, atau mengubah order.

-- 1) Helper untuk mengambil seller aktif milik user yang sedang login.
create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.sellers s
  where s.auth_user_id = auth.uid()
    and s.status = 'approved'
  limit 1;
$$;

revoke all on function public.current_seller_id() from public;
grant execute on function public.current_seller_id() to authenticated;

-- 2) Login pertama: hubungkan akun Supabase Auth dengan seller berdasarkan email.
-- Hanya seller APPROVED dan email yang sama persis yang boleh melakukan claim.
create or replace function public.claim_seller_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_count integer;
  v_id uuid;
  v_linked uuid;
begin
  if v_uid is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;
  if v_email = '' then
    raise exception 'Email akun tidak tersedia.';
  end if;

  select count(*) into v_count
  from public.sellers
  where lower(trim(coalesce(email,''))) = v_email
    and status = 'approved';

  if v_count = 0 then
    raise exception 'Email ini belum terdaftar sebagai seller aktif.';
  elsif v_count > 1 then
    raise exception 'Email seller ganda. Hubungi Bos untuk merapikan data.';
  end if;

  select id, auth_user_id into v_id, v_linked
  from public.sellers
  where lower(trim(coalesce(email,''))) = v_email
    and status = 'approved'
  limit 1;

  if v_linked is not null and v_linked <> v_uid then
    raise exception 'Seller ini sudah terhubung ke akun lain.';
  end if;

  if v_linked is null then
    update public.sellers
      set auth_user_id = v_uid, updated_at = now()
      where id = v_id and auth_user_id is null;
  end if;

  return v_id;
end;
$$;

revoke all on function public.claim_seller_account() from public;
grant execute on function public.claim_seller_account() to authenticated;

-- 3) Policy seller: READ ONLY untuk data sendiri.
drop policy if exists v22_seller_self_select on public.sellers;
drop policy if exists v22_seller_orders_select on public.seller_orders;
drop policy if exists v22_seller_ledger_select on public.seller_ledger;
drop policy if exists v22_seller_withdrawals_select on public.withdrawal_requests;

create policy v22_seller_self_select on public.sellers
for select to authenticated
using (id = public.current_seller_id());

create policy v22_seller_orders_select on public.seller_orders
for select to authenticated
using (seller_id = public.current_seller_id());

create policy v22_seller_ledger_select on public.seller_ledger
for select to authenticated
using (seller_id = public.current_seller_id());

create policy v22_seller_withdrawals_select on public.withdrawal_requests
for select to authenticated
using (seller_id = public.current_seller_id());

-- 4) Withdrawal seller harus lewat RPC ini supaya nominal dicek di database.
create or replace function public.request_seller_withdrawal(
  p_amount numeric,
  p_destination_type text,
  p_destination_account text,
  p_destination_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_balance numeric(14,2);
  v_pending numeric(14,2);
  v_available numeric(14,2);
  v_id uuid;
begin
  v_seller := public.current_seller_id();
  if v_seller is null then
    raise exception 'Akun seller tidak aktif atau belum terhubung.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal withdrawal harus lebih dari 0.';
  end if;
  if length(trim(coalesce(p_destination_type,''))) < 2
     or length(trim(coalesce(p_destination_account,''))) < 3
     or length(trim(coalesce(p_destination_name,''))) < 2 then
    raise exception 'Data tujuan withdrawal belum lengkap.';
  end if;

  select coalesce(sum(amount),0) into v_balance
  from public.seller_ledger
  where seller_id = v_seller;

  select coalesce(sum(amount),0) into v_pending
  from public.withdrawal_requests
  where seller_id = v_seller and status = 'pending';

  v_available := v_balance - v_pending;
  if p_amount > v_available then
    raise exception 'Nominal melebihi saldo tersedia.';
  end if;

  insert into public.withdrawal_requests(
    seller_id, amount, destination_type, destination_account,
    destination_name, status, requested_by
  ) values (
    v_seller, p_amount, trim(p_destination_type), trim(p_destination_account),
    trim(p_destination_name), 'pending', null
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.request_seller_withdrawal(numeric,text,text,text) from public;
grant execute on function public.request_seller_withdrawal(numeric,text,text,text) to authenticated;

-- 5) Izin dasar SELECT tetap diperlukan; RLS menentukan baris yang terlihat.
grant select on table public.sellers to authenticated;
grant select on table public.seller_orders to authenticated;
grant select on table public.seller_ledger to authenticated;
grant select on table public.withdrawal_requests to authenticated;
