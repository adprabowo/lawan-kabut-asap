#!/usr/bin/env node
// Menyusun AGENTS.md bot WhatsApp (OpenClaw): persona bot/persona/AGENTS.md + bagian "Data terkini"
// dari web Lawan Kabut Asap. Bot tidak punya tools/internet, dan OpenClaw hanya menyisipkan AGENTS.md,
// SOUL.md, IDENTITY.md, USER.md, dan MEMORY.md ke prompt (TOOLS.md tidak lagi), jadi data harus ada di
// AGENTS.md. Inilah satu-satunya sumber nama tempat, alamat, telepon, status, dan ISPU yang disebut bot.
// Pakai: node bot/data-bot.mjs [berkas-tujuan]   (dijalankan cron tiap 15 menit, lihat bot/pasang.sh)
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

const ASAL = 'https://lawanasap.iaitbjambi.org';
const TUJUAN = process.argv[2] || '/root/.openclaw/workspace/lawan-kabut-asap/AGENTS.md';
const PERSONA = new URL('./persona/AGENTS.md', import.meta.url);
const JENIS_FASKES = ['Rumah sakit', 'Puskesmas', 'Klinik', 'Posko kesehatan'];
const NASIONAL = ['112', '119', '113', '110'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const wib = (ms) => new Date(ms + 7 * 3600e3);
const dua = (n) => String(n).padStart(2, '0');
export function waktuWib(iso, kini = Date.now()) {
  const d = wib(typeof iso === 'number' ? iso : Date.parse(iso));
  return `${dua(d.getUTCHours())}.${dua(d.getUTCMinutes())} WIB, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
const tanggal = (iso) => { const d = wib(Date.parse(iso)); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`; };
const nomorTel = (t) => String(t || '').replace(/[^\d+]/g, '');
const kosong = (v) => v === null || v === undefined || (typeof v === 'string' && /^[\s\-–—?]*$/.test(v));
const ada = (v) => !kosong(v);

// Sama dengan diLuarJamBuka di web/app.js.
export function diLuarJamBuka(jam, kini = Date.now()) {
  const pola = /(\d{1,2})[.:](\d{2})\s*(?:-|–|—|s\/d|sampai)\s*(\d{1,2})[.:](\d{2})/gi;
  const w = wib(kini);
  const menit = w.getUTCHours() * 60 + w.getUTCMinutes();
  let m; let adaRentang = false;
  while ((m = pola.exec(String(jam || '')))) {
    adaRentang = true;
    const buka = m[1] * 60 + Number(m[2]);
    const tutup = m[3] * 60 + Number(m[4]);
    if (buka < tutup ? menit >= buka && menit < tutup : menit >= buka || menit < tutup) return false;
  }
  return adaRentang;
}

const LABEL_STATUS = {
  BUKA: 'BUKA', PENUH: 'PENUH', TUTUP: 'TUTUP', DI_LUAR_JAM: 'DI LUAR JAM BUKA (tutup saat ini)',
  Tersedia: 'stok tersedia', Terbatas: 'stok terbatas', Habis: 'stok habis',
};

// Tanpa tanda = belum dicek relawan (dari direktori publik); keterangan ini ada di kepala berkas.
function cek(e) {
  return e.terverifikasi_pada ? `✓ dicek relawan ${tanggal(e.terverifikasi_pada)}` : null;
}

function baris(e, { status, kini } = {}) {
  const bagian = [];
  const tempat = [e.kecamatan, e.kabupaten].filter(ada).join(', ');
  bagian.push(`*${e.nama}*` + (ada(e.jenis) ? ` (${e.jenis})` : '') + (tempat ? `, ${tempat}` : ''));
  if (ada(e.alamat)) bagian.push(`alamat ${e.alamat}`);
  if (status) {
    const s = e.status === 'BUKA' && diLuarJamBuka(e.jam_buka, kini) ? 'DI_LUAR_JAM' : e.status;
    bagian.push('status ' + (LABEL_STATUS[s] || 'belum dikonfirmasi'));
  }
  if (ada(e.stok)) bagian.push(LABEL_STATUS[e.stok] || `stok ${e.stok}`);
  if (ada(e.jam_buka)) bagian.push(`jam buka ${e.jam_buka}`);
  if (ada(e.jam_layanan)) bagian.push(`jam layanan ${e.jam_layanan}`);
  if (ada(e.kapasitas)) bagian.push(`kapasitas ${e.kapasitas} orang`);
  if (ada(e.layanan)) bagian.push(`layanan: ${e.layanan}`);
  if (ada(e.harga)) bagian.push(`harga ${e.harga}`);
  if (ada(e.biaya)) bagian.push(`biaya ${e.biaya}`);
  if (ada(e.wilayah_antar)) bagian.push(`antar ke ${e.wilayah_antar}`);
  if (ada(e.wilayah_layanan)) bagian.push(`melayani ${e.wilayah_layanan}`);
  const tel = ada(e.telepon) ? e.telepon : ada(e.kontak_publik) ? e.kontak_publik : null;
  if (tel) bagian.push(`telp ${tel}`);
  if (typeof e.lat === 'number' && typeof e.lng === 'number') bagian.push(`peta maps.google.com/?q=${e.lat},${e.lng}`);
  if (cek(e)) bagian.push(cek(e));
  return '- ' + bagian.join('; ');
}

function perKabupaten(daftar, opsi) {
  const kelompok = new Map();
  for (const e of daftar) {
    const k = ada(e.kabupaten) ? e.kabupaten : 'Kabupaten belum tercatat';
    if (!kelompok.has(k)) kelompok.set(k, []);
    kelompok.get(k).push(e);
  }
  return [...kelompok.keys()].sort((a, b) => a.localeCompare(b, 'id')).map((k) =>
    `#### ${k}\n` + kelompok.get(k).sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id')).map((e) => baris(e, opsi)).join('\n'),
  ).join('\n\n');
}

function bagianDaftar(judul, daftar, kosongTeks, opsi) {
  return `### ${judul} (${daftar.length})\n` + (daftar.length ? perKabupaten(daftar, opsi) : kosongTeks);
}

export function susun(data, kini = Date.now()) {
  const udara = data.udara || [];
  const kontak = (data.kontak_darurat || []).filter((e) => !NASIONAL.includes(nomorTel(e.telepon)));
  const faskes = kontak.filter((e) => JENIS_FASKES.includes(e.jenis));
  const ambulans = kontak.filter((e) => e.jenis === 'Ambulans');
  const lain = kontak.filter((e) => !JENIS_FASKES.includes(e.jenis) && e.jenis !== 'Ambulans');
  const donasi = data.donasi || [];
  const info = (data.info || []).filter((k) => ada(k.judul)).slice(0, 5);
  const form = data.form_url || {};
  const urlForm = (tab) => (/^https?:\/\//.test(String(form[tab] || '')) ? form[tab] : null);
  const FORM = [['relawan', 'Daftar jadi relawan'], ['info', 'Kirim informasi terbaru'], ['ruang', 'Tambah Ruang Aman Asap'],
    ['oksigen', 'Tambah penyedia oksigen'], ['air_bersih', 'Tambah penyedia air bersih'],
    ['kontak_darurat', 'Tambah faskes, ambulans, atau kontak darurat']].filter(([tab]) => urlForm(tab));

  const ispu = udara.length ? udara.map((u) => {
    const asal = u.sumber === 'PM2.5 BMKG' && typeof u.pm25 === 'number'
      ? `dihitung dari PM2.5 ${String(u.pm25).replace('.', ',')} µg/m³ stasiun BMKG` : `sumber ${u.sumber}`;
    const umurJam = (kini - Date.parse(u.waktu)) / 3600e3;
    return `- *${u.lokasi}*: ISPU ${u.ispu}, kategori *${u.kategori}* (${asal}; pengukuran ${waktuWib(u.waktu)}` +
      (umurJam > 3 ? `; SUDAH ${Math.floor(umurJam)} JAM, sebut bahwa angkanya mungkin sudah berubah` : '') + ')';
  }).join('\n') : '- Belum ada angka ISPU di data.';

  return `# Data terkini

Dibuat otomatis tiap 15 menit dari web Lawan Kabut Asap. Ini SATU-SATUNYA sumber nama tempat, alamat, telepon, status,
stok, dan angka ISPU yang boleh kamu sebut. Jangan mengubah, menebak, atau melengkapi isinya.
Tempat bertanda ✓ sudah dicek relawan. Tanpa ✓ = BELUM dicek relawan (dari direktori publik RS Online
Kemenkes/OpenStreetMap): sarankan menelepon dulu bila ada nomornya. Tanpa "telp" = nomornya tidak ada di data.

*Data dibuat: ${waktuWib(kini)}*

### ISPU terkini
${ispu}
Kabupaten/kota lain: belum ada alat ukur di data ini. Sarankan melihat langit/jarak pandang dan ikuti panduan kategori.
Web: ${ASAL}

${bagianDaftar('Ruang Aman Asap', data.ruang || [], 'Belum ada Ruang Aman Asap yang terverifikasi relawan.', { status: true, kini })}
Web: ${ASAL}/ruang

${bagianDaftar('Oksigen', data.oksigen || [], 'Belum ada penyedia oksigen yang terverifikasi relawan. Oksigen medis darurat: telepon 119 atau datangi IGD terdekat.')}
Web: ${ASAL}/oksigen

${bagianDaftar('Air bersih', data.air_bersih || [], 'Belum ada penyedia air bersih yang terverifikasi relawan.')}
Web: ${ASAL}/air-bersih

${bagianDaftar('Rumah sakit dan faskes', faskes, 'Belum ada data faskes.')}
Web: ${ASAL}/faskes

${bagianDaftar('Ambulans setempat', ambulans, 'Belum ada layanan ambulans setempat di data. Ambulans gawat darurat: 119.')}
Web: ${ASAL}/ambulans

${bagianDaftar('Kontak darurat lain (BPBD, damkar, dll.)', lain, 'Belum ada kontak setempat di data. Pakai nomor nasional 112, 119, 113, 110.')}
Web: ${ASAL}/kontak

### Informasi terbaru (${info.length})
${info.length ? info.map((k) => `- *${k.judul}* (${[k.sumber, ada(k.tanggal) ? tanggal(k.tanggal) : null, k.kabupaten].filter(ada).join(', ')})` +
  `${ada(k.isi) ? ': ' + String(k.isi).replace(/\s+/g, ' ') : ''}${/^https?:\/\//.test(String(k.tautan || '')) ? ' Tautan: ' + k.tautan : ''}`).join('\n')
    : 'Belum ada informasi terbaru yang sudah dicek relawan.'}
Web: ${ASAL}/info

### Formulir untuk warga yang ingin membantu (${FORM.length})
${FORM.length ? FORM.map(([tab, teks]) => `- ${teks}: ${urlForm(tab)}`).join('\n')
    : 'Formulir relawan dan tambah info sedang disiapkan pengurus. JANGAN memberi tautan formulir apa pun.'}
Semua kiriman dicek relawan dulu sebelum tampil. Data salah: tombol "Laporkan data salah" di kartu tempat di web.
Web: ${ASAL}/kontribusi

### Donasi (${donasi.length})
${donasi.length ? donasi.map((e) => `- ${e.jenis === 'Rekening' ? 'Rekening' : 'Barang'}: ${e.nama}${ada(e.detail) ? ', ' + e.detail : ''}` +
  `${ada(e.atas_nama) ? ', a.n. ' + e.atas_nama : ''}${ada(e.terkumpul) && ada(e.target) ? `, terkumpul ${e.terkumpul}/${e.target} ${e.satuan || ''}`.trimEnd() : ''}` +
  `${ada(e.lokasi_antar) ? ', antar ke ' + e.lokasi_antar : ''}${ada(e.kontak_publik) ? ', konfirmasi ' + e.kontak_publik : ''}`).join('\n')
    : 'Belum ada. Pengurus IA-ITB Jambi sedang menyusun daftar kebutuhan dan saluran donasi resmi. JANGAN menyebut rekening apa pun.'}
Web: ${ASAL}/donasi
`;
}

async function utama() {
  const res = await fetch(`${ASAL}/api/data`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'LawanKabutAsap-bot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Data contoh (MODE_CONTOH) tidak boleh sampai ke warga lewat bot.
  if (data.contoh) throw new Error('API mengirim data contoh; AGENTS.md tidak diubah');
  const isi = readFileSync(PERSONA, 'utf8').trimEnd() + '\n\n' + susun(data);
  let lama = '';
  try { lama = readFileSync(TUJUAN, 'utf8'); } catch { /* berkas baru */ }
  const tanpaWaktu = (t) => t.replace(/^\*Data dibuat: .*\*$/m, '');
  // Tetap ditulis bila hanya waktunya berubah, supaya umur data yang dilihat bot benar.
  const sementara = `${TUJUAN}.baru`;
  writeFileSync(sementara, isi);
  renameSync(sementara, TUJUAN);
  console.log(`${new Date().toISOString()} AGENTS.md ${tanpaWaktu(lama) === tanpaWaktu(isi) ? 'tetap' : 'berubah'} (${isi.length} karakter)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  utama().catch((err) => { console.error(`${new Date().toISOString()} gagal: ${err.message}`); process.exit(1); });
}
