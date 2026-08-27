HOME OFFICE DASHBOARD V6 - ROLE ACCESS

Fokus V6 tahap 1:
- Bos/Admin punya akses penuh
- Karyawan punya akses terbatas
- Karyawan hanya:
  * Dashboard pribadi
  * Absen Masuk
  * Absen Pulang
  * Melihat riwayat absensi sendiri
  * Melihat profil sendiri
- Karyawan tidak bisa membuka Data Karyawan
- Admin dapat melihat semua karyawan dan semua absensi
- Semua data tetap online di Supabase

PENTING:
Agar karyawan bisa login, akun mereka harus ada di Supabase Auth dan field auth_user_id
di tabel employees harus dihubungkan ke UID akun tersebut.

Supabase project:
https://ltffbxrggflevlilqmze.supabase.co

Cara update:
Replace index.html, absensi.html, README.txt di repo homeoffice-dashboard lalu commit.
GitHub Pages akan update otomatis.
