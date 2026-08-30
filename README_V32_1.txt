YANSTORE V32.1 — PRODUCT IMAGE UPLOAD

1. Jalankan SQL_SETUP_V32_1_PRODUCT_IMAGES.sql setelah V32.
2. Replace/upload file web V32.1.
3. Seller Center sekarang menerima maksimal 5 foto JPG/PNG/WEBP, maksimal 5 MB per foto.
4. Foto pertama otomatis menjadi cover Marketplace.
5. Seller dapat menghapus/mengganti foto saat Edit Produk.
6. File disimpan di Supabase Storage bucket seller-product-images dengan folder per auth user.
7. Data produk lama tetap aman; image_url lama otomatis dimigrasikan menjadi foto pertama bila ada.
