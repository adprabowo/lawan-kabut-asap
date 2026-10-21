// Menguji Worker dengan KV dan Apps Script palsu: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { jarakKm, terdekat } from '../worker/src/geo.js';

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

let env, ctx, panggilan, balasanAppsScript;
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
  globalThis.fetch = async (url, opsi = {}) => {
    panggilan.push({ url: String(url), opsi });
    return new Response(balasanAppsScript(String(url), opsi));
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

test('rute tidak dikenal 404', async () => {
  assert.equal((await worker.fetch(req('/api/webhook'), env, ctx)).status, 404);
});
