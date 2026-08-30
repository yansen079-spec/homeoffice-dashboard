YANSTORE / HomeOffice V31.1 SAFE FIX
===================================

Perbaikan utama:
1. Checkout V30 sekarang kompatibel dengan struktur V24/V25.
2. Stok diambil dari product_stock.stock, bukan seller_listings.stock.
3. Listing aktif memakai seller_listings.status='active', bukan is_active.
4. marketplace_orders memakai status/payment_status sesuai constraint V25.
5. product_stock dikunci FOR UPDATE saat checkout untuk mencegah overselling.
6. Order dibatalkan mengembalikan reserved stock tepat satu kali.
7. Seller suspended dapat mengajukan ulang dan kembali ke pending.
8. Approval dari dashboard Bos mengisi approved_at.
9. absensi.html yang sebelumnya 0 byte sekarang menjadi redirect aman ke index.html.

URUTAN SQL UNTUK PROJECT YANG SUDAH SAMPAI V31:
- JANGAN ulang semua SQL lama.
- Jalankan hanya: SQL_SETUP_V31_1_SAFE_FIX.sql

Catatan:
- SQL_SETUP_V30_ATOMIC_STOCK.sql lama tetap disimpan sebagai arsip versi.
- Untuk instalasi baru, jalankan SQL V20 -> V31 sesuai urutan, lalu terakhir V31.1.
