/**
 * Worker Lawan Kabut Asap: web statis (folder web/, lewat [assets]) dan API untuk web dan bot.
 *
 * GET  /api/data                         seluruh data publik (dari satu key KV)
 * GET  /api/terdekat?lat=&lng=&jenis=&n=  entri terdekat: ruang | oksigen
 * POST /api/status   (Bearer BOT_TOKEN)  {kode, status, dari} dari pengelola ruang
 * POST /api/segarkan (Bearer BOT_TOKEN)  tarik ulang data sekarang, termasuk PM2.5 BMKG
 * /api/admin/*                           dasbor admin, masuk dengan Google (admin.js)
 * cron tiap 5 menit                      tarik data dari Apps Script; PM2.5 BMKG tiap 15 menit
 *
 * Halaman (/, /ruang, /panduan/ispa, …) dan /sitemap.xml juga lewat sini: index.html diberi judul,
 * deskripsi, JSON-LD, dan isi untuk mesin pencari (halaman.js). File web lain dilayani langsung.
 */
import { bacaData, kirimStatus, segarkan } from './data.js';
import { dataContoh } from './data-contoh.js';
import { terdekat } from './geo.js';
import { htmlAwal, ruteHalaman, sitemap } from './halaman.js';
import { apiAdmin } from './admin.js';

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

/**
 * Data dari KV. Selama MODE_CONTOH = "1", data contoh dipakai kalau KV masih kosong
 * atau kalau diminta lewat ?contoh=1 (web dengan ?demo=1, untuk presentasi).
 */
async function ambilData(env, url) {
  const contohDiminta = url && url.searchParams.get('contoh') === '1';
  if (env.MODE_CONTOH === '1' && contohDiminta) return { teks: JSON.stringify(dataContoh()), metadata: {} };
  const data = await bacaData(env);
  if (data || env.MODE_CONTOH !== '1') return data;
  return { teks: JSON.stringify(dataContoh()), metadata: {} };
}

async function apiData(url, env) {
  const data = await ambilData(env, url);
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
  const data = await ambilData(env);
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

async function halamanWeb(request, env, url) {
  const rute = ruteHalaman(url.pathname);
  if (!rute) return env.ASSETS.fetch(request);
  if (rute.alihkan) return new Response(null, { status: 301, headers: { Location: rute.alihkan + url.search } });

  // Hanya data asli dari KV; data contoh tidak boleh masuk HTML yang dibaca mesin pencari.
  const simpanan = await bacaData(env);
  let data = null;
  try { data = simpanan ? JSON.parse(simpanan.teks) : null; } catch (e) { /* tampilkan tanpa data */ }
  const awal = htmlAwal(rute.rute, data, rute.tidakAda);

  const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: { Accept: 'text/html' } }));
  const atur = (nilai) => ({ element(el) { el.setAttribute('content', nilai); } });
  const hasil = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(awal.judul); } })
    .on('meta[name="description"]', atur(awal.deskripsi))
    .on('meta[property="og:title"]', atur(awal.judul))
    .on('meta[property="og:description"]', atur(awal.deskripsi))
    .on('link[rel="canonical"]', { element(el) { if (awal.kanonik) el.setAttribute('href', awal.kanonik); else el.remove(); } })
    .on('head', { element(el) { el.append(awal.kepala, { html: true }); } })
    .on('main#isi', { element(el) { el.prepend(awal.isi, { html: true }); } })
    .transform(shell);
  const header = new Headers(hasil.headers);
  header.set('Content-Type', 'text/html; charset=utf-8');
  header.set('Cache-Control', 'public, max-age=0, must-revalidate');
  header.delete('ETag');
  return new Response(request.method === 'HEAD' ? null : hasil.body, { status: awal.status, headers: header });
}

async function apiSitemap(env) {
  const simpanan = await bacaData(env);
  let data = null;
  try { data = simpanan ? JSON.parse(simpanan.teks) : null; } catch (e) { /* sitemap tanpa data */ }
  return new Response(sitemap(data, simpanan && simpanan.metadata.disimpan_pada), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/sitemap.xml') return apiSitemap(env);
    if (!url.pathname.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
      return halamanWeb(request, env, url);
    }

    if (url.pathname.startsWith('/api/admin/')) return apiAdmin(request, env, ctx, url);

    const rute = `${request.method} ${url.pathname}`;
    switch (rute) {
      case 'GET /api/data':
        return apiData(url, env);
      case 'GET /api/terdekat':
        return apiTerdekat(url, env);
      case 'POST /api/status':
        return apiStatus(request, env, ctx);
      case 'POST /api/segarkan':
        if (!botSah(request, env)) return json({ galat: 'Tidak berwenang' }, 401);
        try {
          return json(await segarkan(env, { bmkg: true }));
        } catch (err) {
          return json({ galat: err.message }, 502);
        }
      default:
        return json({ galat: 'Tidak ditemukan' }, 404);
    }
  },

  async scheduled(event, env, ctx) {
    // BMKG memperbarui PM2.5 tiap jam; cukup dibaca pada menit 0, 15, 30, dan 45.
    const bmkg = new Date(event.scheduledTime).getUTCMinutes() % 15 === 0;
    ctx.waitUntil(segarkan(env, { bmkg, kini: event.scheduledTime || Date.now() }).then(
      (h) => console.log((h.berubah ? `data diperbarui ${h.hash.slice(0, 8)}` : 'data tetap') +
        (bmkg ? `, BMKG ${h.bmkg} lokasi` : '')),
      (err) => console.error('segarkan gagal:', err.message),
    ));
  },
};
