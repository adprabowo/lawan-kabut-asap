# Penyiapan Hari 1

Semua akun dibuat atas nama organisasi (misalnya `siagaasap.iaitbjambi@gmail.com`), bukan pribadi,
supaya bisa diserahterimakan.

## 1. Akun

- [ ] Google (Gmail organisasi)
- [ ] GitHub: buat organisasi atau akun, lalu repo publik `siaga-asap-jambi`
- [ ] Cloudflare (gratis)
- [ ] Meta Business: daftar di business.facebook.com, mulai verifikasi bisnis, siapkan nomor bot
      yang belum pernah dipakai WhatsApp

## 2. Sheet dan Form (sekitar 10 menit)

Cara cepat lewat editor web (tanpa clasp):

1. Login akun Google organisasi, buka <https://script.google.com>, **New project**, beri nama
   `Siaga Asap Jambi`.
2. Buat file sesuai isi folder `apps-script/`: `Skema.gs`, `Util.gs`, `Setup.gs`, `Pemicu.gs`
   (tombol **+** → Script, salin isinya). Di **Project Settings** centang
   *Show "appsscript.json"*, lalu salin `appsscript.json`.
3. Pilih fungsi `siapkan` di toolbar, klik **Run**, dan setujui izin (Sheets, Forms, Drive).
   Karena aplikasinya belum diverifikasi Google, klik *Advanced → Go to Siaga Asap Jambi*.
4. Buka **Execution log**: di situ ada tautan Sheet, 4 Form input, Form lapor, dan templat
   tautan lapor. Simpan tautan-tautan ini.

Atau lewat clasp: `npm i -g @google/clasp`, `clasp login`, `clasp create --type standalone
--rootDir apps-script`, `clasp push`, lalu jalankan `siapkan` dari editor.

`siapkan()` aman dijalankan ulang. Hasilnya:

- Sheet **Siaga Asap Jambi — Data** dengan tab `ruang`, `oksigen`, `air_bersih`,
  `kontak_darurat`, `udara`, `faq`, `log`. Header merah = kolom privat.
- Form **Input Data** untuk 4 tab direktori, dan Form **Laporkan Data Salah**.
- Pemicu: jawaban Form masuk ke tab dengan ID tetap (`R001`, `O001`, `A001`, `K001`);
  setiap suntingan Sheet mencatat waktu ubah dan riwayat di `log`.

## 3. Alur kerja relawan

1. Relawan pengumpul data mengisi **Form input**. Entri masuk dengan `tampil` belum dicentang.
2. Relawan verifikasi menelepon/mengecek tempat, lalu mencentang `tampil`.
   `terverifikasi_pada` dan `cek_ulang_sebelum` terisi otomatis
   (ruang dan oksigen 1 hari, air bersih 3 hari, kontak darurat 14 hari).
3. Laporan dari warga lewat Form lapor masuk ke `log`, ditambahkan ke `catatan_internal`, dan
   `cek_ulang_sebelum` entri itu diset ke hari ini supaya segera dicek.
4. Tab `udara`: isi `lokasi` dan `ispu`; `waktu` dan `kategori` terisi otomatis.
5. Tab `faq`: isi pertanyaan dan jawaban; isi `direview_oleh` setelah nakes menyetujui.
   Hanya FAQ yang sudah direview yang nanti ditampilkan.

Bagikan Sheet (Editor) hanya ke relawan verifikasi. Relawan lain cukup diberi tautan Form.
