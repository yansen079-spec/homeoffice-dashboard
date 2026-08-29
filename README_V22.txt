HOMEOFFICE V22 - SELLER PORTAL SAFE MODE

1. Jalankan SQL_SETUP_V22_SELLER_PORTAL.sql di Supabase SQL Editor.
2. Pastikan seller di Seller Center sudah status AKTIF/approved dan email seller benar.
3. Deploy semua file V22 seperti biasa, termasuk seller.html.
4. Seller buka seller.html (contoh GitHub Pages: https://domain-anda/seller.html).
5. Pertama kali: seller isi email yang terdaftar + password miliknya lalu klik "Aktifkan Akun Pertama Kali".
6. Sesudah akun aktif, seller login dengan tombol "Masuk Seller".

KEAMANAN V22:
- Seller hanya SELECT data seller/order/ledger/withdrawal miliknya sendiri melalui RLS.
- Seller tidak dapat mengubah order, ledger, status seller, atau menandai withdrawal dibayar.
- Request withdrawal wajib lewat RPC database yang menghitung saldo ledger dan pending withdrawal.
- Pending withdrawal mengurangi "Saldo Tersedia" di portal, tetapi ledger baru didebit setelah Bos menandai pembayaran sebagai dibayar.
- Tidak ada auto-transfer / auto-payout.

CATATAN EMAIL:
- Email saat seller aktivasi/login HARUS sama dengan kolom email di Seller Center.
- Seller harus sudah berstatus approved/Aktif sebelum claim akun pertama.
- Jika Supabase Auth > Email Confirmations aktif, seller perlu klik email konfirmasi sebelum login.
