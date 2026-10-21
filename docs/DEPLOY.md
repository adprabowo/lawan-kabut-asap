# Deploy Lawan Kabut Asap

Urutannya dibuat supaya web bisa online lebih dulu dengan **data contoh** (Bagian A), lalu
disambungkan ke data asli dari Google Sheet (Bagian B). Bagian A cukup sekitar 10 menit.

```
Relawan → Google Form → Google Sheet → Apps Script (/exec, ber-token)
                                              ↑ tiap 5 menit
            Warga → lawanasap.iaitbjambi.org  (satu Worker: web + /api)
```

Alamat resmi adalah custom domain `lawanasap.iaitbjambi.org` (variabel `DOMAIN_UTAMA` di
`worker/wrangler.toml`). Halaman di alamat `*.workers.dev` dialihkan permanen (301) ke sana, dengan
path, query, dan bagian `#` tetap; `/api/*` tetap dilayani di kedua alamat.

---

## Bagian A. Cloudflare: web online dengan data contoh

### A1. Pilih subdomain workers.dev (sekali per akun)

1. Login ke <https://dash.cloudflare.com>.
2. Menu kiri **Compute (Workers) → Workers & Pages**. Di panel kanan ada **Subdomain**
   (`<sesuatu>.workers.dev`).
3. Kalau belum ada, klik **Set up** atau **Change** dan isi, misalnya `adityaprabowo`.
   Alamat web nanti: `https://lawan-kabut-asap.adityaprabowo.workers.dev`.

   Mengganti subdomain akan mengubah alamat **semua** Worker di akun itu, jadi kalau sudah ada,
   biarkan saja.

### A2. Buat API token

1. Klik ikon profil di kanan atas → **Profile** → tab **API Tokens** → **Create Token**.
2. Cari template **Edit Cloudflare Workers** → **Use template**.
3. Isi bagian berikut:
   - **Account Resources:** `Include` → pilih akun Anda.
   - **Zone Resources:** `Include` → `All zones` (diminta template; Worker ini tidak memakai zona).
   - **TTL** (opsional): beri tanggal berakhir, misalnya 31 Desember 2026.
4. **Continue to summary** → **Create Token**.
5. **Salin tokennya sekarang.** Cloudflare hanya menampilkannya sekali.
6. Masih di dashboard: buka **Workers & Pages**, salin **Account ID** di panel kanan.

### A3. Simpan token di VPS

Ketik di prompt Claude Code (ganti dua nilai di dalamnya):

```
! printf 'CLOUDFLARE_API_TOKEN=TOKEN_ANDA\nCLOUDFLARE_ACCOUNT_ID=ACCOUNT_ID_ANDA\n' > /root/.cloudflare-token && chmod 600 /root/.cloudflare-token
```

Perintah ini membuat token terlihat di riwayat percakapan. Kalau keberatan, buat file yang sama
lewat SSH. Kalau token bocor, cabut di halaman API Tokens (**Roll** atau **Delete**).

### A4. Deploy

```
scripts/deploy.sh
```

Skrip ini mengecek token, membuat KV namespace (sekali saja), lalu men-deploy web dan API.
Di akhir, wrangler mencetak alamat web.

Cek:

- `https://lawan-kabut-asap.<subdomain>.workers.dev/` → web dengan pita "Data contoh untuk demo"
- `.../api/data` → JSON data contoh

---

## Bagian B. Google: data asli dari Sheet

### B1. Tentukan akun Google

Sheet, Form, dan Apps Script akan dimiliki akun yang menjalankan langkah ini. Pilih akun yang akan
dipakai selama kampanye, sebaiknya akun organisasi (misalnya `siagaasap.iaitbjambi@gmail.com`)
supaya bisa diserahterimakan. Akun pribadi juga bisa dipakai sekarang; kepemilikan Sheet dan Form
bisa dipindahkan nanti, tapi Apps Script perlu dibuat ulang.

**Penting:** kalau browser Anda login ke beberapa akun Google sekaligus, Apps Script sering
salah memakai akun dan izin gagal. Pakai jendela Incognito atau profil Chrome terpisah yang
hanya login ke akun pilihan tadi.

### B2. Buat proyek Apps Script

1. Buka <https://script.google.com> → **New project**. Ganti nama `Untitled project` menjadi
   `Lawan Kabut Asap`.
2. Klik ikon roda gigi **Project Settings** → centang
   **Show "appsscript.json" manifest file in editor**. Di bagian yang sama, pastikan
   **Time zone** = `(GMT+07:00) Jakarta`.
3. Kembali ke **Editor** (ikon `< >`). Untuk setiap file di folder
   [`apps-script/`](../apps-script), klik **+ → Script**, beri nama tanpa `.gs`, lalu salin isinya:
   `Skema`, `Util`, `Setup`, `Pemicu`, `Api`. Hapus isi `Code.gs` bawaan (atau hapus filenya).
   Isi `appsscript.json` diganti dengan isi [`apps-script/appsscript.json`](../apps-script/appsscript.json).
   Ambil isinya dari tombol **Raw** di GitHub.
4. Klik **Save** (ikon disket).

### B3. Jalankan `siapkan`

1. Di toolbar, pilih fungsi **`siapkan`** → **Run**.
2. Muncul **Authorization required** → **Review permissions** → pilih akun dari B1.
3. Muncul **Google hasn't verified this app**. Ini normal untuk skrip buatan sendiri: klik
   **Advanced** → **Go to Lawan Kabut Asap (unsafe)** → **Allow**.
   Izin yang diminta: Sheets, Forms, Drive (untuk membuat file dan menaruh Form di folder Sheet),
   serta menjalankan pemicu.
4. Tunggu sampai **Execution completed**. Buka **Execution log**. Isinya:
   - tautan Sheet **Siaga Asap Jambi — Data**,
   - tautan 4 Form input dan Form lapor,
   - **API_TOKEN** (deretan huruf dan angka panjang). **Simpan, ini rahasia.**

   Kalau log sudah tertutup, jalankan fungsi `cetakRingkasan` untuk tautan. API_TOKEN ada di
   **Project Settings → Script Properties**.

### B4. Deploy web app Apps Script

1. Klik **Deploy → New deployment**.
2. Klik ikon roda gigi di samping *Select type* → **Web app**.
3. Isi:
   - **Description:** `API v1`
   - **Execute as:** `Me (<akun Anda>)`
   - **Who has access:** `Anyone`

   "Anyone" aman: tanpa API_TOKEN, URL ini hanya membalas `{"ok":false,"galat":"token"}`.
   Kolom privat seperti nomor pengelola dan catatan internal tidak pernah keluar.
4. **Deploy** → salin **Web app URL** (berakhiran `/exec`).
5. Uji di browser: `<URL /exec>?token=<API_TOKEN>`. Hasilnya JSON berisi `"ruang":[]` dan
   seterusnya (kosong karena belum ada data yang dicentang `tampil`).

Kalau kode Apps Script diubah nanti: **Deploy → Manage deployments → ✏️ → Version: New version
→ Deploy**. URL `/exec` tidak berubah.

### B5. Sambungkan ke Worker

Ketik di prompt Claude Code (ganti dua nilai):

```
! printf 'APPS_SCRIPT_URL=URL_EXEC\nAPPS_SCRIPT_TOKEN=API_TOKEN\n' > /root/.lawan-kabut-asap.env && chmod 600 /root/.lawan-kabut-asap.env
```

Lalu jalankan lagi `scripts/deploy.sh`. Dalam 5 menit, cron Worker menarik data dari Sheet dan
data contoh otomatis hilang. Kalau Sheet belum punya entri yang dicentang `tampil`, web
menampilkan "Belum ada data".

### B6. Sebelum diumumkan ke publik

1. Ubah `MODE_CONTOH = "1"` menjadi `"0"` di `worker/wrangler.toml`, lalu deploy ulang.
   Setelah itu data contoh tidak pernah muncul lagi.
2. Minta nakes mitra mereview halaman Panduan (`web/panduan.js`).
3. Coba di 2–3 HP berbeda, termasuk HP kelas bawah dan sinyal lemah.

---

## Bagian C. Deploy Apps Script otomatis

Dilakukan sekali. Setelah itu `scripts/deploy.sh` juga memperbarui Apps Script, dan perubahan
skema (tab, kolom, pertanyaan Form) diterapkan sendiri oleh web app dalam 5 menit.

1. Login sebagai pemilik Apps Script (hello.iaitbjambi@gmail.com), buka
   <https://script.google.com/home/usersettings>, lalu nyalakan **Google Apps Script API**.
2. Di VPS jalankan `npx clasp login --no-localhost` dari folder repo. Buka tautan yang muncul di
   browser yang hanya login ke akun pemilik (Incognito), setujui, lalu salin seluruh alamat dari
   address bar (halaman `localhost:8888` memang gagal dimuat) dan tempel ke clasp. Token tersimpan
   di `/root/.clasprc.json`; cabut kapan saja di <https://myaccount.google.com/permissions>.
3. Buat `apps-script/.clasp.json` dari `.clasp.json.example` dengan `scriptId` proyek
   (`npx clasp list` menampilkan ID-nya).
4. Jalankan `scripts/deploy.sh`. Bila web app membutuhkan izin baru, skrip memberi tahu: buka editor
   Apps Script, jalankan `siapkan()` sekali, dan setujui. Izin sudah dicantumkan di
   `appsscript.json`, jadi ini hanya terjadi bila daftar izin itu berubah.

---

## Alur kerja relawan

Lihat [SETUP.md](SETUP.md#3-alur-kerja-relawan): isi Form → relawan verifikasi mencentang
`tampil` di Sheet → muncul di web paling lambat 5 menit kemudian.

## Gangguan umum

| Gejala | Penyebab dan solusi |
| --- | --- |
| `wrangler whoami`: *not authenticated* | Isi `/root/.cloudflare-token` belum benar, atau token sudah dicabut |
| Deploy gagal *workers.dev subdomain* | Langkah A1 belum dilakukan |
| `/exec?token=…` membalas halaman login Google | B4 belum memilih *Who has access: Anyone* |
| `/exec?token=…` membalas `galat: token` | Token salah; cek Script Properties `API_TOKEN` |
| Data Sheet tidak muncul di web | Kolom `tampil` belum dicentang, atau tunggu cron 5 menit |
| Izin Apps Script gagal terus | Login lebih dari satu akun Google; pakai Incognito (B1) |
| `clasp push`: *User has not enabled the Apps Script API* | Langkah C1 belum dilakukan |
| deploy.sh: *web app Apps Script tidak mengirim data* | Kode butuh izin baru; jalankan `siapkan()` sekali di editor |
