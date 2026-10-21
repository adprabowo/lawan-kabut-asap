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
  `kontak_darurat`, `donasi`, `udara`, `faq`, `log`. Header merah = kolom privat.
- Form **Input Data** untuk 4 tab direktori, dan Form **Laporkan Data Salah**.
- Pemicu: jawaban Form masuk ke tab dengan ID tetap (`R001`, `O001`, `A001`, `K001`);
  setiap suntingan Sheet mencatat waktu ubah dan riwayat di `log`.

## 3. Alur kerja relawan

1. Relawan pengumpul data mengisi **Form input**. Entri masuk dengan `tampil` belum dicentang.
   Untuk titik lokasi, tempel tautan dari tombol **Bagikan** di Google Maps (`maps.app.goo.gl/...`)
   atau koordinat; keduanya otomatis diubah menjadi `lat` dan `lng`.
2. Relawan verifikasi menelepon/mengecek tempat, lalu mencentang `tampil`.
   `terverifikasi_pada` dan `cek_ulang_sebelum` terisi otomatis
   (ruang dan oksigen 1 hari, air bersih 3 hari, kontak darurat 14 hari).
3. Laporan dari warga lewat Form lapor masuk ke `log`, ditambahkan ke `catatan_internal`, dan
   `cek_ulang_sebelum` entri itu diset ke hari ini supaya segera dicek.
4. Tab `udara`: isi `lokasi`, `ispu`, dan `sumber`; `waktu` dan `kategori` terisi otomatis.
   Kota Jambi dan Muaro Jambi sudah terisi otomatis oleh Worker dari PM2.5 per jam BMKG
   (dibaca tiap 15 menit, dikonversi ke ISPU menurut Permen LHK P.14/2020; tidak masuk ke Sheet).
   Per lokasi, web menampilkan pembacaan paling baru, dari BMKG maupun isian di tab ini.
5. Tab `faq`: isi pertanyaan dan jawaban; isi `direview_oleh` setelah nakes menyetujui.
   Hanya FAQ yang sudah direview yang nanti ditampilkan.

Bagikan Sheet (Editor) hanya ke relawan verifikasi. Relawan lain cukup diberi tautan Form.

## 4. Faskes, ambulans, dan kontak darurat

Ketiganya diisi lewat satu Form, **Input Data: Faskes, Ambulans, dan Kontak Darurat**. Web memecahnya
menurut pilihan **Jenis**:

| Jenis | Muncul di menu web |
| --- | --- |
| Rumah sakit, Puskesmas, Klinik, Posko kesehatan | Rumah sakit |
| Ambulans | Ambulans |
| BPBD, Damkar, Polisi, Lainnya | Kontak darurat |

Isi **titik lokasi** untuk faskes supaya warga bisa mengurutkan dari yang terdekat dan membuka
petunjuk arah. Centang **IGD 24 jam** di bagian layanan bila ada. Untuk ambulans, isi
**wilayah layanan** dan **biaya**. Nomor darurat nasional (112, 119, 113, 110) sudah tampil otomatis,
jadi tidak perlu dimasukkan.

## 5. Donasi (khusus pengurus)

Tab `donasi` tidak punya Form publik. Pengurus mengisinya langsung di Sheet, lalu relawan
verifikasi mencentang `tampil` setelah mengecek.

| Kolom | Jenis "Barang" | Jenis "Rekening" |
| --- | --- | --- |
| `nama` | Nama barang, misalnya Masker N95 | Nama bank atau dompet digital |
| `detail` | Keterangan, misalnya ukuran | Nomor rekening |
| `atas_nama` | (kosong) | Nama pemilik rekening resmi |
| `target`, `terkumpul`, `satuan` | Angka kebutuhan dan yang sudah terkumpul | (kosong) |
| `prioritas` | Mendesak, Tinggi, atau Biasa | (kosong) |
| `lokasi_antar` | Alamat posko penerima barang | (kosong) |
| `kontak_publik` | WhatsApp koordinator logistik | WhatsApp untuk konfirmasi donasi |

Perbarui `terkumpul` setiap ada barang masuk; web menampilkannya sebagai batang progres. Hanya
masukkan rekening atas nama organisasi, bukan rekening pribadi.

## 6. Memperbarui Apps Script dari repo

Setelah penyiapan sekali di [DEPLOY.md bagian C](DEPLOY.md#bagian-c-deploy-apps-script-otomatis),
`scripts/deploy.sh` mengirim kode Apps Script, memperbarui versi web app (URL `/exec` tetap sama),
dan Sheet serta Form menyesuaikan diri dengan skema baru dalam 5 menit. Tidak ada langkah manual.
Kolom baru disisipkan tepat setelah kolom skema sebelumnya, jadi tidak jatuh di belakang kolom
verifikasi dan privat; kolom yang sudah ada tidak dipindah.

Cara manual (bila clasp belum disiapkan): salin semua file `apps-script/` ke editor, jalankan
`siapkan()`, lalu **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
