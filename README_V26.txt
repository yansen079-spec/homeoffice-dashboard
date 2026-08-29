YANSTORE HomeOffice V26 — Marketplace Dark Neon Redesign

Basis: V25 Marketplace Orders Safe.

Perubahan V26:
- Seluruh fungsi V25 dipertahankan.
- marketplace.html didesain ulang dengan branding YANSTORE.
- Tema dark navy + neon ungu, header modern, hero banner ganda, search besar, kategori, kartu listing modern, trust section, dan statistik marketplace.
- Marketplace tetap mengambil data melalui RPC get_marketplace_listings().
- Order buyer tetap menggunakan RPC create_marketplace_order() dari SQL V25.
- Tidak ada perubahan pada tabel/order/ledger/withdrawal/stok lama.
- Pembayaran otomatis dan pemotongan stok tetap belum diaktifkan.
- seller.html, index.html, absensi.html, dan seluruh SQL V20-V25 dipertahankan.

Setup database:
Jalankan SQL berurutan sampai SQL_SETUP_V25_BUYER_ORDERS.sql seperti sebelumnya. V26 hanya redesign frontend marketplace dan tidak memerlukan SQL baru.
