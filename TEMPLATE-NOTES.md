# Persiapan template

Sumber: gambar PNG milik pengguna, disalin tanpa perubahan ke `public/templates/gelora-pahlawan-original.png` (1080 × 1350 piksel, RGB).

Gambar sumber memiliki contoh foto dan tulisan yang sudah menyatu dengan gambar. Editor menutup area foto menggunakan Canvas, lalu menggambar foto pengguna di dalam bingkai. Nama dan jabatan/pangkalan digambar di atas pita.

## Aset pita kosong

`public/templates/gelora-pahlawan-clean.png` dibuat dengan alat **Imagegen bawaan** dari sumber tersebut. Renderer hanya mengambil dua bidang kecil yang menghapus tulisan contoh. Semua logo, tulisan acara, bingkai emas, daun, bendera, dan latar kayu memakai piksel gambar sumber asli.

Prompt yang digunakan:

> Use case: precise-object-edit. Input image is the edit target, an Indonesian event Twibbon poster measuring 1080 x 1350. Create a same-composition edited copy. Change ONLY the two white placeholder texts on the brown burlap ribbons near the bottom: remove 'Nama' on the first ribbon (letters around x460-617 y1055-1097) and remove 'Jabatan / Pangkalan' on the second ribbon (letters around x348-734 y1176-1210). Inpaint these two text areas with seamless brown burlap woven texture matching each ribbon. Both ribbon faces must be completely blank with no letters, and all their white dashed stitching and ribbon tails must stay untouched. Preserve all event texts, logos, gold frame, blue sky/cloud photo placeholder, flags, wooden background and leaves EXACTLY, at the same positions and scale. No new text, no new objects, no redesign. Keep 4:5 portrait composition and the full original image bounds. We will use only small ribbon patches from this edit so prioritize seamless texture and unchanged stitching.

Hasil Imagegen berukuran 1122 × 1402 piksel. Koordinat bidang pita dipetakan proporsional ke ukuran template asli; keseluruhan gambar hasil generasi tidak dipakai sebagai template baru.

## Verifikasi

Build produksi berhasil. Pemeriksaan browser mencakup isian identitas, file foto rusak, foto valid, zoom, rotasi, pergeseran dengan keyboard, unduhan PNG, dan tampilan HP lebar 390 piksel.

Pemeriksaan renderer 31/31 lulus: empat rotasi, pelestarian semua piksel di luar area yang dapat diedit, dimensi 1080 × 1350, kesamaan seluruh nilai RGBA antara pratinjau dan PNG, serta foto transparan dengan latar putih.

Pratinjau tersimpan di `artifacts/preview-desktop.jpg` dan `artifacts/preview-mobile.jpg`; hasil pemeriksaan di `artifacts/qa-results.txt`. Berkas QA dan pratinjau tidak ikut build produksi.
