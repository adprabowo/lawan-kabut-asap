# Siaga Asap Jambi

Web app dan bot WhatsApp untuk warga terdampak kabut asap di Provinsi Jambi: ruang aman asap,
oksigen, air bersih, kontak darurat, status udara, dan panduan ISPA. Bagian dari Program Siaga
Asap IA-ITB Jambi 2026. Dibangun di paket gratis Google dan Cloudflare.

```
Relawan ─ Google Form ─ Google Sheet (privat) ─ Apps Script doGet (kolom publik, ber-token)
                                                             │ cron 5 menit → 1 key KV
              Warga ─ lawan-kabut-asap.<subdomain>.workers.dev (satu Worker: web/ + /api/*)
              Bot WhatsApp ─ /api/data, /api/status
```

| Folder | Isi |
| --- | --- |
| `apps-script/` | Skema Sheet, pembuat Form, pemicu ID/waktu/log; nanti `doGet` dan `doPost` |
| `worker/` | Cloudflare Worker: melayani web dan API, cron tarik data |
| `web/` | Web statis + PWA (dilayani Worker lewat static assets) |
| `scripts/` | `deploy.sh` |
| `test/` | Uji fungsi murni (`npm test`, Node 20+) |
| `docs/` | Panduan penyiapan dan deploy |
| `aset/` | Berkas sumber logo (tidak dideploy) |

## Status

- [x] Hari 1: kerangka repo, skema Sheet 7 tab, Form input relawan dan Form lapor, pemicu ID/log
- [x] Hari 2: `doGet`/`doPost`, cron Worker ke KV, `/api/data`, `/api/terdekat`, `/api/status`
- [x] Hari 3: web MVP + PWA (data contoh sampai Sheet tersambung)
- [ ] Hari 4: bot WhatsApp v1
- [ ] Hari 5–7: uji, peluncuran, peta, FAQ, serah terima

Langkah deploy: [docs/DEPLOY.md](docs/DEPLOY.md). Alur relawan: [docs/SETUP.md](docs/SETUP.md).

## Data dan privasi

Sheet adalah satu-satunya sumber data. Kolom `pengelola_wa`, `terverifikasi_oleh`,
`catatan_internal`, `tampil`, dan seluruh tab `log` tidak pernah keluar dari Apps Script.
Entri baru dari Form tidak tampil sampai relawan verifikasi mencentang kolom `tampil`.
Definisi kolom ada di [`apps-script/Skema.gs`](apps-script/Skema.gs).

## Tampilan

Beranda dibuka dengan "jendela langit": warna langit, kepekatan kabut, dan cahaya matahari mengikuti
kategori ISPU lokasi yang dipilih, dengan skala lima kategori resmi. Gerak (kabut, angka, penanda
skala, perpindahan halaman) dimatikan otomatis bila HP meminta gerak dikurangi. Untuk presentasi,
buka web dengan `?demo=1` selama `MODE_CONTOH = "1"`: data contoh tampil dengan label yang jelas.

## Lisensi

Kode: MIT. Daerah lain yang terdampak asap dipersilakan memakai dan menyesuaikan.

Bukan bagian dari lisensi MIT:

- Logo IA-ITB Jambi, Jambi Digital Movement (JDM), dan Bakastra BPD HIPMI Jambi
  (`web/logo/`, `aset/logo-asli/`) adalah milik organisasi masing-masing.
- Huruf Archivo dan Plus Jakarta Sans: SIL Open Font License 1.1 (`web/fonts/LICENSE-*.txt`).
- Sebagian besar ikon dari [Lucide](https://lucide.dev), lisensi ISC (keterangan di `web/ikon.js`).
