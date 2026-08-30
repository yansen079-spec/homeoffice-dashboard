YANSTORE V33 - MIDTRANS SANDBOX PAYMENT

Status setup yang sudah dilakukan:
- MIDTRANS_SERVER_KEY tersimpan di Supabase Edge Function Secrets.
- Edge Function midtrans-create-snap sudah dideploy (Verify JWT ON).
- Edge Function midtrans-webhook sudah dideploy (Verify JWT OFF).
- Midtrans Sandbox Notification URL sudah diarahkan ke midtrans-webhook.

Yang berubah di website:
- marketplace.html: tombol checkout menjadi "Buat & Bayar".
- Setelah order tersimpan dan stok direservasi, browser meminta payment URL ke midtrans-create-snap.
- Buyer diarahkan ke Midtrans Sandbox hosted checkout.
- Status pembayaran tidak dipercayai dari browser; webhook Midtrans yang mengubah marketplace_orders.payment_status.

Tidak ada SQL baru untuk patch frontend ini.
Jangan taruh MIDTRANS_SERVER_KEY di HTML/GitHub.

TEST:
1. Upload project ini ke GitHub Pages.
2. Buka marketplace.html dan checkout 1 produk.
3. Isi buyer lalu klik Buat & Bayar.
4. Harus berpindah ke Midtrans Sandbox.
5. Selesaikan transaksi test dari simulator Midtrans.
6. Cek marketplace_orders: payment_status harus menjadi Dibayar dan status Diproses setelah webhook settlement.
