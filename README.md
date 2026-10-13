# Twibbon Gelora Pahlawan

Aplikasi web statis untuk membuat twibbon Kemah Besar Penggalang Titian Kuranji. Pengguna cukup mengisi **Nama**, **Jabatan / Pangkalan**, dan **Foto**, mengatur posisi foto, lalu mengunduh hasil PNG berukuran **1080 × 1350 piksel**.

React + TypeScript + Vite. Tidak memerlukan backend, database, akun, atau variabel lingkungan. Foto dan isi formulir diproses oleh Canvas di browser dan tidak diunggah ke server.

## Menjalankan di komputer

Gunakan Node.js 22.12 atau yang lebih baru.

```sh
npm install
npm run dev
```

## Build produksi

```sh
npm run build
npm run preview
```

Hasil website statis berada di folder `dist`. `npm run preview` dipakai untuk memeriksa hasil build di komputer.

## Deploy ke Vercel

1. Masukkan folder proyek ini ke repository GitHub, GitLab, atau Bitbucket milik Anda.
2. Di Vercel, pilih **Add New → Project** lalu impor repository tersebut.
3. Gunakan **Framework Preset: Vite**, **Build Command: npm run build**, dan **Output Directory: dist**. Konfigurasi tersebut juga disimpan di `vercel.json`.
4. Pilih **Deploy**. Tidak ada environment variable yang perlu diisi.

Setelah terhubung dengan repository, perubahan pada branch produksi akan dibangun dan diterbitkan kembali oleh Vercel. Proyek ini belum diterbitkan ke akun Vercel.

Sesuai permintaan terakhir, hasil disiapkan sebagai proyek lokal siap deploy.

## Template

Template bersumber dari gambar yang disediakan pemilik proyek, berukuran **1080 × 1350**. Area foto dan dua bidang teks disiapkan agar nama dan jabatan atau pangkalan dapat diganti tanpa mengubah desain acara. Simpan aset template bersama proyek agar hasil unduhan selalu tersedia dari sumber yang sama.

Pratinjau dan unduhan memakai proses penggambaran yang sama. Foto dapat digeser dan diperbesar, dan teks menyesuaikan ruang yang tersedia. Unggahan foto JPG, PNG, dan WebP diproses secara lokal.

Foto juga dapat diputar dengan kelipatan 90°. Geser foto di dalam bingkai menggunakan mouse/sentuhan, atau fokuskan pratinjau lalu gunakan tombol panah. Foto transparan memakai latar putih. Foto lebih besar dari 2400 piksel pada sisi terpanjang diperkecil untuk pemrosesan di perangkat.

Detail aset dan prompt persiapan pita tersedia di [TEMPLATE-NOTES.md](TEMPLATE-NOTES.md).
