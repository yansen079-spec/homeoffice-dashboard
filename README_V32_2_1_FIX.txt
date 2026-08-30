YANSTORE V32.2.1 CHECKOUT FIX

Problem fixed:
  function gen_random_bytes(integer) does not exist

How to install:
1. Open Supabase > SQL Editor > New query.
2. Copy all contents of SQL_FIX_V32_2_1_CHECKOUT_RANDOM_BYTES.sql.
3. Click Run.
4. At the bottom you should see random_test containing a hexadecimal value.
5. Refresh marketplace.html and retry checkout once.

This patch DOES NOT reset/delete products, stock, sellers, orders, or HomeOffice data.
No website HTML replacement is required for this specific database error.
