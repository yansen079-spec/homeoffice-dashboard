YANSTORE V32 — STANDALONE SELLER CENTER

Tujuan utama:
- seller.html adalah web publik Seller Center mandiri.
- Publik daftar/login langsung di seller.html, tidak perlu membuka HomeOffice.
- Seller approved dapat tambah produk sendiri, mengatur harga, stok, status tayang, memproses order, melihat penjualan, saldo/withdrawal, dan mengubah profil toko.
- Marketplace tetap di marketplace.html.
- HomeOffice/index.html tetap dashboard internal dan hanya menerima/memonitor data seller/order/withdrawal.

INSTALL DARI V31.1:
1. Upload/replace semua file web dari ZIP V32.
2. Supabase > SQL Editor > New Query.
3. Jalankan HANYA SQL_SETUP_V32_STANDALONE_SELLER_CENTER.sql.
4. Jangan mengulang SQL lama jika database sudah sampai V31.1.

ALUR PUBLIK SELLER:
marketplace.html -> seller.html -> daftar/login -> ajukan toko -> admin approve -> login seller.html -> dashboard Seller Center.

CATATAN:
- Produk seller V32 memakai tabel seller_products sehingga stok tiap seller terpisah.
- Checkout marketplace memakai stok seller_products secara atomik.
- Order lama yang masih memakai product_stock tetap didukung sebagai legacy fallback.
- Seller bisa mengubah status order miliknya, tetapi payment_status tetap dikontrol admin.
