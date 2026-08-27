HOME OFFICE DASHBOARD V5 ONLINE

Supabase project:
https://ltffbxrggflevlilqmze.supabase.co

Fitur:
- Login online via Supabase Auth
- Admin profile dari tabel employees
- Data karyawan online
- Edit/detail/nonaktifkan karyawan
- Absensi online
- Sinkron antar perangkat
- GitHub Pages compatible

PENTING:
- Publishable key dipakai di frontend dan dilindungi oleh RLS.
- Jangan pernah menaruh database password / service_role / secret key di GitHub.
- Tambah akun login karyawan masih dilakukan melalui Supabase Auth terlebih dahulu, lalu auth_user_id perlu dihubungkan ke row employees.

Cara update:
Replace index.html, absensi.html, README.txt di repo homeoffice-dashboard lalu commit.
