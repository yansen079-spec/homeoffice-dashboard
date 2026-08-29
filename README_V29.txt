YANSTORE V29 — Checkout Safe Order
==================================
V29 menambahkan pengalaman checkout ke Marketplace tanpa merombak sistem V28.2.

BARU
- Tombol produk menjadi Checkout.
- Modal checkout dengan ringkasan produk, data buyer, jumlah, dan total estimasi.
- Setelah order dibuat, buyer mendapatkan kode order dan instruksi langkah selanjutnya.
- UI tetap mengikuti dark-neon YANSTORE.

AMAN / TETAP DIPERTAHANKAN
- RPC create_marketplace_order dari V25 tetap digunakan.
- Harga/listing tetap divalidasi oleh database.
- Payment gateway BELUM diaktifkan.
- Pembayaran BELUM otomatis dianggap lunas.
- Stok BELUM dipotong otomatis.
- Ledger/profit seller BELUM otomatis dikreditkan.
- Verifikasi pembayaran tetap melalui HomeOffice.
- Seller Portal, HomeOffice, absensi, payroll, withdrawal, RLS, dan SQL lama tidak diubah.

CATATAN JUMLAH
RPC V25 membuat satu order per listing dan belum memiliki parameter quantity.
Jika buyer memilih jumlah >1, V29 mencatat jumlah tersebut ke catatan order agar tidak mengubah schema database lama.
Untuk quantity/stok atomik yang sebenarnya, diperlukan migrasi SQL versi berikutnya.
