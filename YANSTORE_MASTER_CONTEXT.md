# YANSTORE MASTER CONTEXT
> Dokumen handover lintas chat/model untuk melanjutkan pendampingan YANSTORE tanpa mengulang cerita dari awal.
>
> Diperbarui: 21 November 2026 (WIB). Status fitur mencerminkan percakapan pemilik dan inspeksi repository pada tanggal ini. **Selalu cek GitHub dan status deployment terbaru sebelum bekerja.**

## 1. Kenal pemilik dan perjalanan usahanya

- **Nama usaha:** YANSTORE.
- **Didirikan:** **2022**, berdasarkan cerita langsung pemilik. Jangan menyebut YANSTORE sebagai bisnis yang baru berdiri pada 2026.
- **Konteks:** pemilik sedang mengembangkan bisnis penjualan produk/layanan digital yang sudah berjalan beberapa tahun, sambil membangun infrastruktur operasional sendiri.
- **Harapan terhadap asisten:** mengenali proyek dan progres sebelumnya, menyambung pekerjaan tanpa perlu cerita berulang, bantu eksekusi teknis secara konkret, dan jujur tentang hasil tes.
- **Gaya komunikasi:** bahasa Indonesia santai/gaul, akrab seperti "bro", "wkwkwk"; tetap jelas dan serius saat menyangkut keamanan data, uang, atau operasional. Jangan mengarang kedekatan, prestasi, atau fakta baru.
- **Preferensi produk/UI:** premium, minimalis, rapi, terasa seperti command center, **tidak ramai**. Mengutamakan fitur yang langsung menghemat kerja atau membantu bisnis. Jangan menambah kartu/dashboard yang tidak perlu.
- **Pola kolaborasi:** sering meminta ide, menyeleksi dengan ketat, lalu meminta implementasi langsung ke GitHub ketika setuju. Jangan mengimplementasikan ide yang masih sebatas diskusi.

## Kisah awal YANSTORE — cerita pemilik, 21 November 2026

> Bagian ini berdasarkan cerita langsung pemilik. Catat sebagai sejarah pribadi bisnis; jangan menambahkan detail yang belum pernah diceritakan.

- Minat jualan produk digital sudah ada **jauh sebelum tahun 2022**, tetapi pada waktu itu pemilik belum mengerti cara memulai atau menjualnya.
- Sebelum berjualan layanan aplikasi premium, pemilik sempat mencoba **menjual followers Instagram dan TikTok**. Pengalaman tersebut berakhir dengan **ditipu**, sehingga ia menjadi lebih berhati-hati dan sulit percaya kepada orang lain dalam urusan jualan.
- Pada **2022**, YANSTORE menjadi **usaha sampingan**. Pada awalnya pemilik berperan sebagai **seller/reseller**, bukan penyedia langsung.
- Dalam perjalanan ini pemilik mengenal seorang mentor/supplier yang ia panggil **Bang Wan**. Awalnya pemilik sempat khawatir ditipu lagi, bahkan bertanya kepadanya, **"Ini nggak nipu kan, Kak?"** Bang Wan menjawab bahwa itu aman.
- Pemilik mengatakan ia **belajar banyak selama sekitar satu tahun**. **Bang Wan secara langsung mengenalkan produk dan menjelaskan cara menjadi seller.** Selebihnya, pemilik **belajar, mencoba, dan mengembangkan kemampuan secara mandiri** (ia menyebutnya "ngegrounding sendiri"). Jangan menggambarkan Bang Wan sebagai pengajar seluruh aspek bisnis ataupun mengabaikan perannya di awal.
- Contoh model usaha awal: membeli akses **Netflix seharga Rp20.000 dari Bang Wan**, lalu menjualnya **Rp30.000**, dengan selisih harga **Rp10.000** sebelum pengeluaran lain. Ini contoh pengalaman masa lalu, **bukan** harga aktif saat ini.
- Seiring waktu, pemilik membangun jaringan lebih luas dan kini menggambarkan dirinya sebagai **first hand**, yakni mampu membuat/menyediakan akun sendiri. Ia tidak lagi sering membeli stok dari Bang Wan karena sumber/jaringannya sudah lebih banyak.
- Hal yang sangat berarti bagi pemilik: **ia tetap mengingat dan menghargai Bang Wan** sebagai orang yang mengenalkannya pada dunia bisnis ini dan membantunya belajar, meskipun kini sudah lebih mandiri.
- Pemilik secara eksplisit meminta agar **kisah ini masuk ke YANSTORE MASTER CONTEXT**, supaya kelak asisten baru tidak membuatnya bercerita ulang.

- **Penjualan pertama (menurut ingatan pemilik):** promosi awal dilakukan lewat **WhatsApp**, terutama dari teman ke teman. Pembeli pertamanya adalah **teman SMP**. Ia membeli **YouTube Premium**, kemungkinan paket **3 bulan** (pemilik tidak sepenuhnya yakin pada durasinya). Saat itu pemilik mendapat produk dari Bang Wan seharga sekitar **Rp10.000** lalu menjualnya sekitar **Rp25.000**, selisih sekitar **Rp15.000** sebelum biaya lain. Angka dan detail durasi bersifat ingatan historis, bukan data transaksi yang telah diverifikasi atau harga sekarang. Identitas pribadi temannya sengaja tidak ditulis dalam repo publik.

- **Prinsip utama bisnis yang pemilik pegang sampai sekarang:** **"Kita jualan, kita pasti ada yang beli."** Ia tidak terlalu takut saat penjualan sepi atau belum ada pembeli; yang paling ia khawatirkan adalah **kehilangan kepercayaan pelanggan**. Pemilik mengutamakan rasa aman, transparansi, dan kepercayaan customer karena pernah mengalami penipuan saat mencoba berdagang, sehingga ia paham bahwa kehilangan uang akibat ditipu bisa sangat menyakitkan, terlebih saat uang itu seharusnya dipakai untuk keperluan lain. Ia mengenang penjualan pertama dengan rasa sangat senang. Jangan sekadar menyarankan pertumbuhan omzet; jadikan **kepercayaan pelanggan** sebagai pertimbangan sentral dalam rekomendasi strategi, pengelolaan pesanan, garansi yang benar-benar dapat dipenuhi, keamanan stok, dan layanan pelanggan.

**Panduan untuk asisten:** jangan memanggil YANSTORE bisnis yang baru dirintis dari nol pada 2026; hormati sejarah sejak 2022 dan peranan Bang Wan. Jika pemilik kelak bercerita lebih lanjut, tambahkan fakta baru secara akurat tanpa menebak.

## 2. Repo, aplikasi, dan tautan utama

| Komponen | Alamat / lokasi | Keterangan |
| --- | --- | --- |
| Home Office Dashboard | https://github.com/yansen079-spec/homeoffice-dashboard | Repository pengembangan utama untuk aplikasi operasional |
| Website Home Office | https://yansen079-spec.github.io/homeoffice-dashboard/ | GitHub Pages, menggunakan PWA/service worker |
| Toko online YANSTORE | https://github.com/yansen079-spec/YANSTORE | Repository terpisah untuk storefront YANSTORE |
| Kode aplikasi Home Office | `homeoffice-dashboard/index.html` | HTML besar dengan CSS & JavaScript inline, terintegrasi Supabase |
| PWA | `homeoffice-dashboard/sw.js` | Mengelola cache app shell; perlu perhatian saat deployment |
| Panduan historis | `README*.txt`, `SQL_SETUP_*.sql` di Home Office | Beberapa README adalah dokumentasi versi lama, **bukan** kebenaran versi sekarang |

**Sumber data aplikasi:** Supabase. Detail otorisasi, RLS, skema dan keberhasilan operasi harus diperiksa pada kondisi terkini. Repository yang memuat dokumen ini bersifat **publik**; jangan menuliskan credential, token, data pelanggan, atau rahasia lainnya di sini.

## 3. Fitur Home Office yang telah dibangun/dibahas

### LIVE SALES (sekitar V70.7)
- Panel navy yang relatif ringkas dengan statistik omzet hari ini, jumlah transaksi, top 3 produk terlaris hari ini.
- Grafik perbandingan pada area waktu yang sama: **hijau = hari ini**, **biru = kemarin**, dengan interval 15/30/60 menit.
- **Ringkasan Transaksi Kemarin di kanan bawah** tetap ada: omzet, jumlah transaksi, produk terlaris. Pemilik secara khusus meminta kartu ini **jangan dihilangkan** saat grafik perbandingan ditambahkan.
- Panel desktop pernah disetel sekitar tinggi 410px supaya tidak terpotong. **Jaga proporsi/tampilan yang sudah disetujui.**
- Data berasal dari tabel `sales_transactions`. Grafik jam menggunakan waktu transaksi nyata `created_at`; import Excel yang tidak punya jam beli sesungguhnya dapat masuk rekap omzet tetapi tidak dipaksakan menjadi titik grafik.
- Status realtime tergantung Supabase dan mekanisme refresh yang sudah ada. Jangan membuat subscription duplikat.

### Produk Saya (sekitar V70.8)
- Menu yang tadinya disebut **Gudang Digital** kini menggunakan label **Produk Saya**.
- Penggantian dilakukan pada label UI; ID teknis, nama tabel, sumber transaksi, dan alur tidak boleh diubah hanya demi mengganti tulisan.
- Pada satu tahap pemilik melihat versi lama karena PWA caching; cache `sw.js` diperbarui dan UI akhirnya tampil benar pada screenshot yang dikirim.

### Target Omzet Bulanan (sekitar V70.9)
- Kartu kompak di bawah **Ringkasan Produk Saya**, agar panel LIVE SALES tidak penuh.
- Target awal Rp5.000.000/bulan, dapat diubah, ada progress bar, persentase, sisa target, dan pilihan bulan.
- Pemilik memilih **target Desember 2026 Rp10.000.000** sebagai sasaran bisnis. **Ini sasaran yang dibicarakan, bukan bukti bahwa angka sudah tersimpan di semua perangkat.**
- Kode yang diterapkan mengambil transaksi dari `sales_transactions` dengan paginasi. Perhitungan adalah **omzet, bukan laba**.
- Pengaturan nominal disimpan pada **localStorage browser/perangkat**. Belum tersinkron otomatis antar-perangkat; jangan klaim sudah server-side.

### Quick Actions / Ctrl + K (sekitar V71)
- Palet perintah untuk berpindah halaman via pencarian, keyboard Ctrl+K, panah, Enter, Esc.
- Navigasi mempertimbangkan tampilan/menu sesuai role; ada tindakan cepat tambah stok digital dan menuju target omzet.
- Desain tersembunyi ketika tidak dipakai. Pemilik sudah menyatakan fitur ini sesuai / "sudah best".
- Jika bermasalah, cek login, role, keyboard shortcut, cache dan deployment.

### Backup Center (sekitar V72)
- Kartu berada di **Pengaturan Kantor**, bukan dashboard utama.
- Tombol mengunduh **JSON backup operasional terbatas** (produk, stok, riwayat stok, sebagian daftar produk digital dan transaksi) dari database.
- Admin-only di UI, ekspor read-only, sengaja mengecualikan password, token, isi credential stok digital, serta data pribadi pelanggan/karyawan.
- **Bukan backup lengkap database. Belum ada restore otomatis.** Unduhan file, integritas hasil ekspor, RLS dan prosedur pemulihan perlu diuji nyata.
- Screenshot pemilik menunjukkan kartu Backup Center tampil bagus. Jangan mengasumsikan pengunduhan data sudah sukses hanya berdasarkan screenshot tampilan.

### Fitur lain dalam Home Office
Ada berbagai modul historis di repository: pengelolaan stok, rekap penjualan, seller center, absensi dan karyawan, pengaturan kantor, keuangan usaha, data akun, dan modul lainnya. **Periksa kode dan izin akses terbaru sebelum menjelaskan detail perilakunya.**

## 4. Proyek toko online terpisah

Repo `yansen079-spec/YANSTORE` berisi website toko. Pemilik sebelumnya meminta stok produk terlihat pada storefront dan berkali-kali mencoba perbaikan; jangan otomatis mengklaim sinkronisasi toko dengan Home Office sudah beres. Bila mulai pekerjaan di storefront, inspeksi repo dan integrasi Supabase serta status deploy terlebih dahulu.

## 5. Ide yang dinilai dan keputusan pemilik

**Diterima/disukai:**
- LIVE SALES dan perbandingan hari ini vs kemarin, dengan desain ringkas.
- Target Omzet Bulanan.
- Ctrl+K Quick Actions.
- Backup Center.

**Ditolak/ditunda, jangan tawarkan ulang sebagai ide baru tanpa alasan kuat:**
- Live Transaction Feed: contoh visual dianggap **terlalu ramai**.
- Profit Tracker: biaya modal dan pengeluaran masih rumit untuk dicatat akurat; jangan membuat angka laba semu.
- Daily Sales Target, Prediksi Omzet Akhir Bulan, Sales Milestones: dianggap pengulangan fitur target/omzet.
- Customer Repeat Rate: dianggap ribet.
- Smart Command Search versi lain: terlalu mirip Ctrl+K.
- Undo stok: tak perlu karena stok masih dapat diedit manual.
- One-Click Copy Stock: **sudah ada/diimplementasikan**, jangan mengusulkan ulang.
- Recently Opened: tidak perlu.

## 6. Prinsip kerja untuk asisten berikutnya

1. Mulailah dengan membaca dokumen ini lalu **cek konteks permintaan terbaru**. Dokumen ini adalah ringkasan, bukan pengganti data repo terkini.
2. Bila pemilik meminta perubahan Home Office, lihat kode `main`, file relevan, dan GitHub Actions terbaru sebelum mengedit.
3. **Pertahankan desain yang sudah disukai**; jangan memodifikasi grafik, layout, stok, atau database di luar permintaan.
4. Pastikan perubahan UI tidak membuat versi lama terus terlihat akibat PWA cache; audit `sw.js`, proses deployment, dan bila relevan sarankan refresh tab.
5. Validasi JavaScript/HTML dan status build/smoke test. Bedakan: **kode committed**, **CI lulus**, **Pages deployed**, **sudah dites di browser**, dan **terbukti berjalan dengan data riil**.
6. Hindari duplikasi transaksi, perubahan skema/RLS tanpa verifikasi, kebocoran credentials, dan backup palsu/tidak lengkap.
7. Jangan menebak saldo, omzet, jumlah pelanggan, status penjualan, atau perkembangan usaha. Gunakan data aktual atau nyatakan belum diverifikasi.
8. Tidak semua ide perlu fitur baru. Solusi sederhana dan bersih lebih disukai. Ketika pemilik hanya meminta ide, **diskusikan dulu**, jangan langsung push kode.
9. Jika chat/model baru tidak punya koneksi GitHub, jelaskan keterbatasannya dan minta pemilik membagikan tautan/konten relevan, bukan mengarang implementasi.
10. **Update dokumen ini setelah milestone penting**, dengan tanggal, keputusan, keterbatasan, tautan commit relevan bila berguna. Jangan menulis password atau informasi sensitif di repo publik.

## 7. Mulai percakapan baru dengan cepat

Pemilik dapat mengirim:

> Bro, lanjut proyek YANSTORE. Baca `YANSTORE_MASTER_CONTEXT.md` di https://github.com/yansen079-spec/homeoffice-dashboard dan cek kondisi terbaru repo `main`. YANSTORE berdiri sejak 2022; jangan suruh gue cerita dari nol. Gue suka desain minimalis dan jangan ubah fitur yang udah bagus. Sekarang tugasnya: [isi permintaan].

**Catatan:** dokumen handover ini membantu menjaga kesinambungan lintas model/chat, **bukan** jaminan bahwa memori atau semua isi percakapan akan otomatis terbawa.
