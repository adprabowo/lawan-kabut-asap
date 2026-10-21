/**
 * Worker Siaga Asap Jambi: satu API untuk web dan bot WhatsApp.
 * Kerangka Hari 1. Bagian bertanda "Hari N" diisi sesuai rencana pengembangan.
 */

const KUNCI_DATA = 'data'; // Seluruh data disimpan di SATU key KV.

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

async function apiData(env) {
  const data = await env.DATA.get(KUNCI_DATA, 'text');
  if (!data) return json({ galat: 'Data belum tersedia' }, 503);
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ...CORS,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    switch (url.pathname) {
      case '/':
        return json({ layanan: 'Siaga Asap Jambi API', web: env.WEB_URL });
      case '/api/data':
        return apiData(env);
      case '/api/terdekat':
        // Hari 2: ?lat=&lng=&jenis= → entri terdekat dari data di KV.
        return json({ galat: 'Belum tersedia' }, 501);
      case '/webhook':
        // Hari 4: GET verifikasi Meta, POST pesan dengan cek X-Hub-Signature-256.
        return json({ galat: 'Belum tersedia' }, 501);
      default:
        return json({ galat: 'Tidak ditemukan' }, 404);
    }
  },

  async scheduled(event, env, ctx) {
    // Hari 2: tarik JSON dari Apps Script, tulis ke KV hanya kalau berubah.
  },
};
