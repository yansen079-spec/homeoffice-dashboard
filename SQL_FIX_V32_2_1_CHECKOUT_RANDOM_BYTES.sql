-- =========================================================
-- YANSTORE V32.2.1 - FIX CHECKOUT gen_random_bytes()
-- Safe compatibility patch. No table/data reset.
-- =========================================================

begin;

-- Some Supabase projects keep pgcrypto outside the function search_path.
-- The existing checkout RPC calls gen_random_bytes(integer) without a schema.
-- This public compatibility function removes that dependency for order-code generation.
create or replace function public.gen_random_bytes(p_length integer)
returns bytea
language plpgsql
volatile
as $$
declare
  v_result bytea := ''::bytea;
  v_seed text;
begin
  if p_length is null or p_length < 1 then
    raise exception 'length must be greater than 0';
  end if;

  -- Match pgcrypto's practical upper bound and prevent accidental huge allocations.
  if p_length > 1024 then
    raise exception 'length must not exceed 1024 bytes';
  end if;

  while octet_length(v_result) < p_length loop
    v_seed := random()::text
      || clock_timestamp()::text
      || pg_backend_pid()::text
      || octet_length(v_result)::text;
    v_result := v_result || decode(md5(v_seed), 'hex');
  end loop;

  return substring(v_result from 1 for p_length);
end;
$$;

-- Allow the checkout RPC to call it regardless of invoker role.
grant execute on function public.gen_random_bytes(integer) to anon, authenticated, service_role;

commit;

-- Quick smoke test (should return a hex string, not an error):
select encode(public.gen_random_bytes(8), 'hex') as random_test;
