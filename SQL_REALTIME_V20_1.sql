-- HOME OFFICE V20.1 - FULL REALTIME
-- Jalankan sekali di Supabase SQL Editor.

do $$
declare
  t text;
begin
  foreach t in array array[
    'attendance',
    'employees',
    'leave_requests',
    'tasks',
    'routine_jobs',
    'routine_job_checks',
    'product_stock',
    'digital_inventory',
    'sales_transactions'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- Opsional tapi disarankan agar payload UPDATE/DELETE lebih lengkap.
alter table public.attendance replica identity full;
alter table public.employees replica identity full;
alter table public.leave_requests replica identity full;
alter table public.tasks replica identity full;
alter table public.routine_jobs replica identity full;
alter table public.routine_job_checks replica identity full;
alter table public.product_stock replica identity full;
alter table public.digital_inventory replica identity full;
alter table public.sales_transactions replica identity full;
