HOME OFFICE V21 - SELLER CENTER SAFE MODE

1. Jalankan SQL_SETUP_V21_SELLER_CENTER.sql di Supabase SQL Editor.
2. Upload seluruh isi folder ini ke hosting seperti versi sebelumnya.
3. Login sebagai Bos/Admin lalu buka menu Seller Center.

FITUR V21:
- Tambah / approve / suspend seller.
- Catat order seller.
- Profit otomatis dicatat ke immutable-style ledger saat order selesai.
- Saldo dihitung dari ledger, bukan kolom saldo yang dapat diedit frontend.
- Withdrawal hanya PENDING lalu Bos verifikasi manual.
- Tombol "Tandai Dibayar" dipakai SETELAH transfer dilakukan di bank/e-wallet.
- Tidak ada auto payout dan tidak ada data kartu/rekening bank yang diproses otomatis.

CATATAN KEAMANAN:
- RLS Seller Center tahap 1 = admin HomeOffice saja.
- Jangan menaruh service_role key Supabase di index.html.
- Publishable key boleh berada di frontend selama RLS benar.
- Tahap seller login/public marketplace membutuhkan policy tambahan dan sebaiknya dibuat setelah tahap admin ini stabil.
