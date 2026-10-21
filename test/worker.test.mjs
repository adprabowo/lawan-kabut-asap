// Menguji Worker dengan KV dan Apps Script palsu: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { jarakKm, terdekat } from '../worker/src/geo.js';
import { URL_BMKG, ispuDariPm25, kategoriIspu, uraiBmkg, waktuPengukuran } from '../worker/src/bmkg.js';

function kvPalsu() {
  const isi = new Map();
  return {
    tulis: 0,
    async getWithMetadata(k) {
      const v = isi.get(k);
      return v ? { value: v.value, metadata: v.metadata } : { value: null, metadata: null };
    },
    async put(k, value, opsi = {}) {
      this.tulis++;
      isi.set(k, { value, metadata: opsi.metadata });
    },
  };
}

const DATA = {
  versi: 1,
  ruang: [
    { id: 'R001', kode: 'R001', nama: 'Dekat penuh', lat: -1.6000, lng: 103.6000, status: 'PENUH' },
    { id: 'R002', kode: 'R002', nama: 'Dekat buka', lat: -1.6020, lng: 103.6020, status: 'BUKA' },
    { id: 'R003', kode: 'R003', nama: 'Tutup', lat: -1.6001, lng: 103.6001, status: 'TUTUP' },
    { id: 'R004', kode: 'R004', nama: 'Jauh', lat: -1.9, lng: 103.9, status: 'BUKA' },
    { id: 'R005', kode: 'R005', nama: 'Tanpa koordinat', lat: null, lng: null, status: 'BUKA' },
  ],
  oksigen: [], air_bersih: [], kontak_darurat: [], udara: [], faq: [], lapor_url: null,
};

// Halaman PM2.5 BMKG tiruan: payload Nuxt datar, objek stasiun menunjuk nilainya lewat indeks.
function htmlBmkg(stasiun) {
  const isi = [['ShallowReactive', 1], { data: 2 }, []];
  for (const s of stasiun) {
    const i = isi.length;
    isi.push({ nama_file: i + 1, LOKASI: i + 2, JAM: i + 3, PM25: i + 4, KONDISI: i + 5 }, s.file, s.lokasi, s.jam, s.pm25, '');
    isi[2].push(i);
  }
  return '<html><body><script type="application/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">' +
    JSON.stringify(isi) + '</script></body></html>';
}

const STASIUN = [
  { file: 'pm25_jm3.xml', lokasi: 'Kota Jambi', jam: 20, pm25: 207.8 },
  { file: 'pm25_jm4.xml', lokasi: 'Muaro Jambi', jam: 20, pm25: 191.1 },
  { file: 'pm25_plb4.xml', lokasi: 'Musi 2 Palembang', jam: 20, pm25: 640.5 },
  { file: 'pm25_jm9.xml', lokasi: 'Kerinci', jam: 20, pm25: null },
];
const KINI = Date.UTC(2026, 9, 21, 14, 15); // 21 Okt 2026 pukul 21.15 WIB
const jadwal = (menitUtc) => ({ scheduledTime: Date.UTC(2026, 9, 21, 14, menitUtc) });

let env, ctx, panggilan, balasanAppsScript, balasanBmkg;
beforeEach(() => {
  env = {
    DATA: kvPalsu(),
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/x/exec',
    APPS_SCRIPT_TOKEN: 'rahasia-as',
    BOT_TOKEN: 'rahasia-bot',
    WEB_URL: 'https://web',
  };
  const tunggu = [];
  ctx = { waitUntil: (p) => tunggu.push(p), selesai: () => Promise.all(tunggu) };
  panggilan = [];
  balasanAppsScript = () => JSON.stringify(DATA);
  balasanBmkg = () => htmlBmkg(STASIUN);
  globalThis.fetch = async (url, opsi = {}) => {
    panggilan.push({ url: String(url), opsi });
    return new Response(String(url) === URL_BMKG ? balasanBmkg() : balasanAppsScript(String(url), opsi));
  };
});

const req = (path, opsi) => new Request(`https://api${path}`, opsi);

test('jarakKm kira-kira benar', () => {
  // Kota Jambi ke Muara Bulian sekitar 50 km garis lurus.
  const d = jarakKm(-1.6101, 103.6131, -1.7136, 103.2614);
  assert.ok(d > 35 && d < 45, String(d));
});

test('terdekat: lewati TUTUP dan tanpa koordinat, BUKA didahulukan dari PENUH yang hampir sama dekat', () => {
  const h = terdekat(DATA.ruang, -1.6, 103.6, 5);
  assert.deepEqual(h.map((e) => e.id), ['R002', 'R001', 'R004']);
  assert.equal(h[1].jarak_km, 0);
});

test('/api/data 503 sebelum cron pertama', async () => {
  const res = await worker.fetch(req('/api/data'), env, ctx);
  assert.equal(res.status, 503);
});

test('cron menulis KV hanya kalau data berubah', async () => {
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  assert.equal(env.DATA.tulis, 1);
  assert.ok(panggilan[0].url.includes('token=rahasia-as'));

  const res = await worker.fetch(req('/api/data'), env, ctx);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ruang.length, 5);
  assert.ok(res.headers.get('X-Data-Disimpan-Pada'));

  balasanAppsScript = () => JSON.stringify({ ...DATA, udara: [{ lokasi: 'Kota Jambi', ispu: 303 }] });
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  assert.equal(env.DATA.tulis, 2);
});

test('cron tidak menimpa data lama kalau Apps Script galat', async () => {
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  for (const buruk of ['<html>login</html>', '{"ok":false,"galat":"token"}']) {
    balasanAppsScript = () => buruk;
    await worker.scheduled({}, env, ctx); await ctx.selesai();
  }
  assert.equal(env.DATA.tulis, 1);
  const res = await worker.fetch(req('/api/data'), env, ctx);
  assert.equal((await res.json()).ruang.length, 5);
});

test('/api/terdekat', async () => {
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  let res = await worker.fetch(req('/api/terdekat?lat=-1.6&lng=103.6&n=2'), env, ctx);
  assert.deepEqual((await res.json()).hasil.map((e) => e.id), ['R002', 'R001']);
  res = await worker.fetch(req('/api/terdekat?lat=abc&lng=103.6'), env, ctx);
  assert.equal(res.status, 400);
  res = await worker.fetch(req('/api/terdekat?lat=-1.6&lng=103.6&jenis=log'), env, ctx);
  assert.equal(res.status, 400);
});

test('/api/status butuh token bot, meneruskan ke Apps Script, lalu menyegarkan', async () => {
  const body = JSON.stringify({ kode: 'R001', status: 'buka', dari: '6281234567890' });
  let res = await worker.fetch(req('/api/status', { method: 'POST', body }), env, ctx);
  assert.equal(res.status, 401);
  res = await worker.fetch(req('/api/status', {
    method: 'POST', body, headers: { Authorization: 'Bearer salah-panjangnya-beda' },
  }), env, ctx);
  assert.equal(res.status, 401);

  balasanAppsScript = (url, opsi) => (opsi.method === 'POST'
    ? JSON.stringify({ ok: true, kode: 'R001', nama: 'Dekat penuh', status: 'BUKA', status_lama: 'PENUH' })
    : JSON.stringify(DATA));
  res = await worker.fetch(req('/api/status', {
    method: 'POST', body, headers: { Authorization: 'Bearer rahasia-bot' },
  }), env, ctx);
  await ctx.selesai();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'BUKA');
  const post = JSON.parse(panggilan[0].opsi.body);
  assert.deepEqual(post, { token: 'rahasia-as', aksi: 'status', kode: 'R001', status: 'BUKA', dari: '6281234567890' });
  assert.equal(env.DATA.tulis, 1, 'segarkan setelah status berubah');
});

test('/api/status menolak status tidak dikenal dan meneruskan penolakan Apps Script', async () => {
  const kirim = (isi) => worker.fetch(req('/api/status', {
    method: 'POST', body: JSON.stringify(isi), headers: { Authorization: 'Bearer rahasia-bot' },
  }), env, ctx);
  let res = await kirim({ kode: 'R001', status: 'LIBUR', dari: '62812' });
  assert.equal(res.status, 400);
  balasanAppsScript = () => JSON.stringify({ ok: false, galat: 'bukan_pengelola' });
  res = await kirim({ kode: 'R001', status: 'PENUH', dari: '62812' });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).galat, 'bukan_pengelola');
});

test('/api/data memakai data contoh hanya bila MODE_CONTOH=1 dan KV kosong', async () => {
  globalThis.fetch = async () => { throw new Error('tidak boleh memanggil Apps Script'); };
  let res = await worker.fetch(req('/api/data'), { ...env, MODE_CONTOH: '1' }, ctx);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).contoh, true);
  res = await worker.fetch(req('/api/data'), { ...env, MODE_CONTOH: '0' }, ctx);
  assert.equal(res.status, 503);
});

test('?contoh=1 memberi data contoh hanya bila MODE_CONTOH=1, walau KV sudah berisi', async () => {
  await worker.scheduled({}, env, ctx); await ctx.selesai();
  let res = await worker.fetch(req('/api/data?contoh=1'), { ...env, MODE_CONTOH: '1' }, ctx);
  assert.equal((await res.json()).contoh, true);
  res = await worker.fetch(req('/api/data?contoh=1'), { ...env, MODE_CONTOH: '0' }, ctx);
  const d = await res.json();
  assert.equal(d.contoh, undefined);
  assert.equal(d.ruang.length, 5);
});

test('ispuDariPm25 mengikuti batas Permen LHK P.14/2020', () => {
  const kasus = [[0, 0], [15.5, 50], [15.6, 51], [55.4, 100], [55.5, 101], [150.4, 200], [191.1, 241],
    [207.8, 258], [250.4, 300], [250.5, 301], [500, 500], [640.5, 500]];
  for (const [pm25, ispu] of kasus) assert.equal(ispuDariPm25(pm25), ispu, `PM2.5 ${pm25}`);
  assert.equal(ispuDariPm25(-1), null);
  assert.equal(kategoriIspu(ispuDariPm25(55.4)), 'Sedang');
  assert.equal(kategoriIspu(ispuDariPm25(55.5)), 'Tidak Sehat');
  assert.equal(kategoriIspu(ispuDariPm25(207.8)), 'Sangat Tidak Sehat');
  assert.equal(kategoriIspu(ispuDariPm25(250.5)), 'Berbahaya');
});

test('waktuPengukuran: jam BMKG yang belum tiba hari ini (WIB) berarti kemarin', () => {
  assert.equal(waktuPengukuran(20, KINI), '2026-10-21T13:00:00.000Z');
  assert.equal(waktuPengukuran(22, KINI), '2026-10-20T15:00:00.000Z');
  assert.equal(waktuPengukuran(23, Date.UTC(2026, 9, 21, 17, 30)), '2026-10-21T16:00:00.000Z');
});

test('uraiBmkg: hanya stasiun Jambi yang berangka, lengkap dengan ISPU dan waktu', () => {
  assert.deepEqual(uraiBmkg(htmlBmkg(STASIUN), KINI), [
    { waktu: '2026-10-21T13:00:00.000Z', lokasi: 'Kota Jambi', ispu: 258, kategori: 'Sangat Tidak Sehat', sumber: 'PM2.5 BMKG', pm25: 207.8 },
    { waktu: '2026-10-21T13:00:00.000Z', lokasi: 'Muaro Jambi', ispu: 241, kategori: 'Sangat Tidak Sehat', sumber: 'PM2.5 BMKG', pm25: 191.1 },
  ]);
  const mati = [{ lokasi: 'Kota Jambi', jam: 20, pm25: '-' }, { lokasi: 'Muaro Jambi', jam: null, pm25: 80 }];
  assert.deepEqual(uraiBmkg(htmlBmkg(mati), KINI), [], 'stasiun tanpa angka atau jam diabaikan, bukan dibaca 0');
  assert.throws(() => uraiBmkg('<html>pemeliharaan</html>', KINI), /__NUXT_DATA__/);
  assert.throws(() => uraiBmkg(htmlBmkg([]), KINI), /tidak ada data stasiun/);
});

test('cron menit 15 menggabungkan PM2.5 BMKG ke udara; isian relawan yang lebih baru diutamakan', async () => {
  balasanAppsScript = () => JSON.stringify({ ...DATA, udara: [
    { waktu: '2026-10-21T13:30:00.000Z', lokasi: 'Kota Jambi', ispu: 303, kategori: 'Berbahaya', sumber: 'ISPU KLHK' },
    { waktu: '2026-10-21T12:00:00.000Z', lokasi: 'Muaro Jambi', ispu: 150, kategori: 'Tidak Sehat', sumber: 'relawan' },
    { waktu: '2026-10-21T10:00:00.000Z', lokasi: 'Bungo', ispu: 180, kategori: 'Tidak Sehat', sumber: 'DLH Bungo' },
  ] });
  await worker.scheduled(jadwal(15), env, ctx); await ctx.selesai();
  assert.equal(panggilan.filter((p) => p.url === URL_BMKG).length, 1);
  const udara = (await (await worker.fetch(req('/api/data'), env, ctx)).json()).udara;
  assert.deepEqual(udara.map((u) => [u.lokasi, u.ispu, u.sumber]), [
    ['Bungo', 180, 'DLH Bungo'], ['Kota Jambi', 303, 'ISPU KLHK'], ['Muaro Jambi', 241, 'PM2.5 BMKG'],
  ]);
});

test('BMKG hanya dibaca tiap 15 menit; pembacaan terakhir dipakai saat BMKG gagal, paling lama 6 jam', async () => {
  const keBmkg = () => panggilan.filter((p) => p.url === URL_BMKG).length;
  const udara = async () => (await (await worker.fetch(req('/api/data'), env, ctx)).json()).udara;
  await worker.scheduled(jadwal(15), env, ctx); await ctx.selesai();
  await worker.scheduled(jadwal(20), env, ctx); await ctx.selesai();
  assert.equal(keBmkg(), 1, 'menit 20 tidak membaca BMKG');
  balasanBmkg = () => '<html>pemeliharaan</html>';
  await worker.scheduled(jadwal(30), env, ctx); await ctx.selesai();
  assert.equal(keBmkg(), 2);
  assert.deepEqual((await udara()).map((u) => [u.lokasi, u.ispu]), [['Kota Jambi', 258], ['Muaro Jambi', 241]]);
  assert.equal(env.DATA.tulis, 1, 'data tidak berubah sejak pembacaan pertama');
  // Lebih dari 6 jam setelah pengukuran 20.00 WIB angkanya tidak ditampilkan lagi.
  await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 21, 19, 5) }, env, ctx); await ctx.selesai();
  assert.deepEqual(await udara(), []);
});

test('rute tidak dikenal 404', async () => {
  assert.equal((await worker.fetch(req('/api/webhook'), env, ctx)).status, 404);
});

test('halaman di workers.dev dialihkan ke domain utama, API tetap dilayani', async () => {
  const e = { ...env, DOMAIN_UTAMA: 'lawanasap.iaitbjambi.org', ASSETS: { fetch: async () => new Response('web') } };
  const lama = (p) => new Request(`https://lawan-kabut-asap.contoh.workers.dev${p}`);
  let res = await worker.fetch(lama('/?demo=1'), e, ctx);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://lawanasap.iaitbjambi.org/?demo=1');
  res = await worker.fetch(lama('/index.html'), e, ctx);
  assert.equal(res.headers.get('Location'), 'https://lawanasap.iaitbjambi.org/index.html');
  assert.equal((await worker.fetch(lama('/api/data'), e, ctx)).headers.get('Content-Type'), 'application/json; charset=utf-8');
  res = await worker.fetch(new Request('https://lawanasap.iaitbjambi.org/'), e, ctx);
  assert.equal(await res.text(), 'web');
});
