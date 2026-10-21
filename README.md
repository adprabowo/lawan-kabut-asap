# Siaga Asap Jambi

Web app dan bot WhatsApp untuk warga terdampak kabut asap di Provinsi Jambi: ruang aman asap,
oksigen, air bersih, kontak darurat, status udara, dan panduan ISPA. Bagian dari Program Siaga
Asap IA-ITB Jambi 2026. Dibangun di paket gratis Google dan Cloudflare.

```
Relawan ─ Google Form ─┐
                       ├─ Google Sheet (privat) ─ Apps Script doGet (kolom publik, ber-token)
Pengelola ruang (WA) ──┘                                     │
                                                  Cloudflare Worker (cron 5 menit → 1 key KV)
                                                    ├─ /api/data, /api/terdekat ─ Web (Pages)
                                                    └─ /webhook ─ WhatsApp Cloud API
```

| Folder | Isi |
| --- | --- |
| `apps-script/` | Skema Sheet, pembuat Form, pemicu ID/waktu/log; nanti `doGet` dan `doPost` |
| `worker/` | Cloudflare Worker: API, cron, webhook WhatsApp |
| `web/` | Web statis + PWA untuk Cloudflare Pages |
| `test/` | Uji fungsi murni (`npm test`, Node 20+) |
| `docs/` | Panduan penyiapan dan runbook |

## Status

- [x] Hari 1: kerangka repo, skema Sheet 7 tab, Form input relawan dan Form lapor, pemicu ID/log
- [x] Hari 2: `doGet`/`doPost`, cron Worker ke KV, `/api/data`, `/api/terdekat`, `/api/status`
- [ ] Hari 3: web v1 + PWA
- [ ] Hari 4: bot WhatsApp v1
- [ ] Hari 5–7: uji, peluncuran, peta, FAQ, serah terima

Langkah penyiapan akun dan Sheet ada di [docs/SETUP.md](docs/SETUP.md).

## Data dan privasi

Sheet adalah satu-satunya sumber data. Kolom `pengelola_wa`, `terverifikasi_oleh`,
`catatan_internal`, `tampil`, dan seluruh tab `log` tidak pernah keluar dari Apps Script.
Entri baru dari Form tidak tampil sampai relawan verifikasi mencentang kolom `tampil`.
Definisi kolom ada di [`apps-script/Skema.gs`](apps-script/Skema.gs).

## Lisensi

MIT. Daerah lain yang terdampak asap dipersilakan memakai dan menyesuaikan.
