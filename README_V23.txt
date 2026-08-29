HomeOffice V23 - Seller Catalog + Password Recovery

1. Jalankan SQL_SETUP_V23_CATALOG_PASSWORD.sql di Supabase SQL Editor (New query).
2. Upload semua isi folder ini ke repository GitHub Pages dan commit.
3. Seller buka seller.html.
4. Fitur baru:
   - Katalog Produk read-only dari product_stock.
   - Seller tidak dapat menambah/mengurangi/edit stok.
   - Rahasia Gudang Digital tidak dibuka ke seller.
   - Tombol Lupa Password mengirim email recovery ke seller.html.
   - Link recovery meminta seller membuat password baru.

Catatan keamanan:
V23 belum mengurangi stok otomatis dari order marketplace. Itu harus dibuat melalui RPC/backend tervalidasi pada tahap berikutnya.
