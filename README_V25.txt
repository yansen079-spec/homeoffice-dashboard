HomeOffice V25 - YANSTORE Marketplace Buyer Orders (SAFE MODE)

V25 dibuat sebagai kelanjutan additive dari V24. File dan fitur lama dipertahankan.

BARU DI V25
- Marketplace: tombol "Buat Order" menggantikan preview alert.
- Modal buyer: nama, WhatsApp/kontak, email opsional, catatan opsional.
- Database baru: marketplace_orders.
- RPC create_marketplace_order memvalidasi ulang listing, seller, stok, dan harga dari database.
- Order memiliki kode unik YS-YYMMDD-XXXXXXXX.
- Seller Portal dapat melihat order marketplace miliknya (setelah patch V25 di seller.html).
- Bug inline onclick pada card marketplace diperbaiki menggunakan data-id + addEventListener.

SAFE MODE TETAP DIPERTAHANKAN
- Tidak ada pembayaran otomatis.
- Tidak ada pengurangan stok otomatis saat buyer mengirim order.
- Buyer tidak dapat menentukan seller_id, product_id, atau harga sendiri.
- Seller tidak dapat mengubah status/payment order marketplace.
- seller_orders lama, seller_ledger, withdrawal_requests, dan seluruh modul HomeOffice lama tidak dihapus.

CARA PASANG
1. Pastikan SQL V21, V22, V23, dan V24 sudah pernah dijalankan.
2. Jalankan SQL_SETUP_V25_BUYER_ORDERS.sql di Supabase SQL Editor.
3. Deploy file HTML V25.
4. Tes marketplace.html: pilih listing -> Buat Order -> isi buyer -> Kirim Order.
5. Login seller.html dan cek tab Order Saya.

CATATAN
Order V25 hanya permintaan order. Status awal Menunggu + Belum Dibayar. Pembayaran dan fulfillment otomatis sengaja belum dibuat agar tidak mengganggu stok/ledger lama.
