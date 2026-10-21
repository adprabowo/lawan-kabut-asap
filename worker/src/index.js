/**
 * Worker Siaga Asap Jambi: satu API untuk web dan bot WhatsApp (Baileys di VPS).
 *
 * GET  /api/data                         seluruh data publik (dari satu key KV)
 * GET  /api/terdekat?lat=&lng=&jenis=&n=  entri terdekat: ruang | oksigen
 * POST /api/status   (Bearer BOT_TOKEN)  {kode, status, dari} dari pengelola ruang
 * POST /api/segarkan (Bearer BOT_TOKEN)  tarik ulang data sekarang
 * cron tiap 5 menit                      tarik data dari Apps Script
 */
import { bacaData, kirimStatus, segarkan } from './data.js';
import { terdekat } from './geo.js';

const JENIS_TERDEKAT = ['ruang', 'oksigen'];
const STATUS_RUANG = ['BUKA', 'PENUH', 'TUTUP'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(isi, status = 200, header = {}) {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...header },
  });
}

function samaPersis(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

function botSah(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return Boolean(env.BOT_TOKEN) && samaPersis(auth, `Bearer ${env.BOT_TOKEN}`);
}

async function apiData(env) {
  const data = await bacaData(env);
  if (!data) return json({ galat: 'Data belum tersedia' }, 503);
  return new Response(data.teks, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Data-Disimpan-Pada': data.metadata.disimpan_pada || '',
      ...CORS,
    },
  });
}

async function apiTerdekat(url, env) {
  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const jenis = url.searchParams.get('jenis') || 'ruang';
  const n = Math.min(Math.max(parseInt(url.searchParams.get('n'), 10) || 5, 1), 20);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ galat: 'lat dan lng wajib diisi dengan angka' }, 400);
  }
  if (!JENIS_TERDEKAT.includes(jenis)) {
    return json({ galat: `jenis harus salah satu dari: ${JENIS_TERDEKAT.join(', ')}` }, 400);
  }
  const data = await bacaData(env);
  if (!data) return json({ galat: 'Data belum tersedia' }, 503);
  const semua = JSON.parse(data.teks)[jenis] || [];
  return json({ jenis, hasil: terdekat(semua, lat, lng, n) }, 200, { 'Cache-Control': 'public, max-age=60' });
}

async function apiStatus(request, env, ctx) {
  if (!botSah(request, env)) return json({ galat: 'Tidak berwenang' }, 401);
  let masukan;
  try {
    masukan = await request.json();
  } catch {
    return json({ galat: 'Body harus JSON' }, 400);
  }
  const status = String(masukan.status || '').toUpperCase();
  if (!masukan.kode || !masukan.dari || !STATUS_RUANG.includes(status)) {
    return json({ galat: 'kode, status (BUKA/PENUH/TUTUP), dan dari wajib diisi' }, 400);
  }
  const hasil = await kirimStatus(env, { kode: masukan.kode, status, dari: masukan.dari });
  // Segarkan segera supaya web dan bot tidak menunggu cron berikutnya.
  if (hasil.ok) ctx.waitUntil(segarkan(env).catch((err) => console.error('segarkan', err)));
  return json(hasil, hasil.ok ? 200 : 422);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const rute = `${request.method} ${url.pathname}`;
    switch (rute) {
      case 'GET /':
        return json({ layanan: 'Siaga Asap Jambi API', web: env.WEB_URL });
      case 'GET /api/data':
        return apiData(env);
      case 'GET /api/terdekat':
        return apiTerdekat(url, env);
      case 'POST /api/status':
        return apiStatus(request, env, ctx);
      case 'POST /api/segarkan':
        if (!botSah(request, env)) return json({ galat: 'Tidak berwenang' }, 401);
        try {
          return json(await segarkan(env));
        } catch (err) {
          return json({ galat: err.message }, 502);
        }
      default:
        return json({ galat: 'Tidak ditemukan' }, 404);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(segarkan(env).then(
      (h) => console.log(h.berubah ? `data diperbarui ${h.hash.slice(0, 8)}` : 'data tetap'),
      (err) => console.error('segarkan gagal:', err.message),
    ));
  },
};
