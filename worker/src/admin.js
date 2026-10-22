/**
 * Dasbor admin (/admin). Masuk dengan Google; hanya email di ADMIN_EMAIL yang diterima.
 *
 * GET  /api/admin/konfig  client ID Google untuk tombol masuk (publik)
 * POST /api/admin/masuk   {credential} ID token dari Google → cookie sesi 8 jam
 * POST /api/admin/keluar  hapus cookie sesi
 * GET  /api/admin/data    data dasbor dari Apps Script (?mode=admin), termasuk kolom privat
 * POST /api/admin/ubah    {tab, id, ubah, nilai} diteruskan ke Apps Script doPost aksi "admin"
 *
 * Data admin tidak pernah disimpan di KV maupun cache: diambil langsung dari Apps Script tiap
 * kali diminta. Cookie sesi ditandatangani HMAC dengan secret ADMIN_SESSION_KEY.
 */
import { bacaData, segarkan } from './data.js';

export const ASAL_ADMIN = ['https://lawanasap.iaitbjambi.org'];
const URL_KUNCI_GOOGLE = 'https://www.googleapis.com/oauth2/v3/certs';
const PENERBIT_GOOGLE = ['accounts.google.com', 'https://accounts.google.com'];
const NAMA_COOKIE = '__Host-lka_admin';
const UMUR_SESI_DETIK = 8 * 3600;
const AKSI = ['tampilkan', 'sembunyikan', 'sudah_dicek', 'status', 'catatan'];

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function dariB64url(teks) {
  const s = atob(teks.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (teks.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Daftar email admin dari var ADMIN_EMAIL (boleh lebih dari satu, dipisah koma). */
export function daftarAdmin(env) {
  return String(env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

// Kunci publik Google disimpan di memori isolate selama masa berlaku dari header Cache-Control.
let simpananKunci = null;

async function kunciGoogle(kini) {
  if (simpananKunci && simpananKunci.sampai > kini) return simpananKunci.kunci;
  const res = await fetch(URL_KUNCI_GOOGLE);
  if (!res.ok) throw new Error(`kunci Google HTTP ${res.status}`);
  const umur = Number((/max-age=(\d+)/.exec(res.headers.get('Cache-Control') || '') || [])[1]) || 3600;
  const kunci = (await res.json()).keys || [];
  simpananKunci = { kunci, sampai: kini + umur * 1000 };
  return kunci;
}

/**
 * Verifikasi ID token Google (JWT RS256): tanda tangan, penerbit, audiens (client ID kita),
 * masa berlaku, dan email terverifikasi. Mengembalikan payload atau melempar galat.
 */
export async function verifikasiTokenGoogle(token, { clientId, kini = Date.now(), ambilKunci = kunciGoogle }) {
  if (!clientId) throw new Error('client ID belum diatur');
  const bagian = String(token || '').split('.');
  if (bagian.length !== 3) throw new Error('format token');
  const kepala = JSON.parse(new TextDecoder().decode(dariB64url(bagian[0])));
  const isi = JSON.parse(new TextDecoder().decode(dariB64url(bagian[1])));
  if (kepala.alg !== 'RS256') throw new Error('algoritma token');

  const jwk = (await ambilKunci(kini)).find((k) => k.kid === kepala.kid);
  if (!jwk) throw new Error('kunci token tidak dikenal');
  const kunci = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const sah = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', kunci, dariB64url(bagian[2]),
    enc.encode(`${bagian[0]}.${bagian[1]}`));
  if (!sah) throw new Error('tanda tangan token');

  const detik = Math.floor(kini / 1000);
  if (!PENERBIT_GOOGLE.includes(isi.iss)) throw new Error('penerbit token');
  if (isi.aud !== clientId) throw new Error('audiens token');
  if (!(isi.exp > detik - 60)) throw new Error('token kedaluwarsa');
  if (isi.email_verified !== true && isi.email_verified !== 'true') throw new Error('email belum terverifikasi');
  return isi;
}

async function kunciSesi(env) {
  return crypto.subtle.importKey('raw', enc.encode(`lka-admin:${env.ADMIN_SESSION_KEY}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function buatSesi(env, email, kini = Date.now()) {
  const isi = b64url(enc.encode(JSON.stringify({ e: email, x: Math.floor(kini / 1000) + UMUR_SESI_DETIK })));
  const tanda = new Uint8Array(await crypto.subtle.sign('HMAC', await kunciSesi(env), enc.encode(isi)));
  return `${isi}.${b64url(tanda)}`;
}

/** Email admin dari cookie sesi yang sah dan belum kedaluwarsa, atau null. */
export async function bacaSesi(env, request, kini = Date.now()) {
  if (!env.ADMIN_SESSION_KEY) return null;
  const cookie = request.headers.get('Cookie') || '';
  const m = new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)`).exec(cookie);
  if (!m) return null;
  try {
    const sah = await crypto.subtle.verify('HMAC', await kunciSesi(env), dariB64url(m[2]), enc.encode(m[1]));
    if (!sah) return null;
    const isi = JSON.parse(new TextDecoder().decode(dariB64url(m[1])));
    if (!(isi.x > Math.floor(kini / 1000))) return null;
    // Email yang dicabut dari ADMIN_EMAIL langsung kehilangan akses walau cookie masih berlaku.
    return daftarAdmin(env).includes(isi.e) ? isi.e : null;
  } catch {
    return null;
  }
}

function jsonAdmin(isi, status = 200, header = {}) {
  return new Response(JSON.stringify(isi), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      ...header,
    },
  });
}

function cookieSesi(nilai, umur) {
  return `${NAMA_COOKIE}=${nilai}; Path=/; Max-Age=${umur}; HttpOnly; Secure; SameSite=Strict`;
}

// POST hanya dari halaman admin sendiri (selain cookie SameSite=Strict).
function asalSah(request, url) {
  const asal = request.headers.get('Origin');
  return Boolean(asal) && (ASAL_ADMIN.includes(asal) || asal === url.origin);
}

async function bacaJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function adminSiap(env) {
  return Boolean(env.ADMIN_CLIENT_ID && env.ADMIN_SESSION_KEY && daftarAdmin(env).length);
}

async function masuk(request, env, opsi) {
  if (!adminSiap(env)) return jsonAdmin({ galat: 'Dasbor admin belum dikonfigurasi' }, 503);
  const masukan = await bacaJson(request);
  let isi;
  try {
    isi = await verifikasiTokenGoogle(masukan && masukan.credential, { clientId: env.ADMIN_CLIENT_ID, ...opsi });
  } catch (err) {
    return jsonAdmin({ galat: 'Login Google tidak sah', alasan: err.message }, 401);
  }
  const email = String(isi.email || '').toLowerCase();
  if (!daftarAdmin(env).includes(email)) {
    return jsonAdmin({ galat: `${email} tidak punya akses admin` }, 403);
  }
  return jsonAdmin({ email }, 200, { 'Set-Cookie': cookieSesi(await buatSesi(env, email, opsi.kini), UMUR_SESI_DETIK) });
}

async function dataAdmin(env) {
  const url = new URL(env.APPS_SCRIPT_URL);
  url.searchParams.set('token', env.APPS_SCRIPT_TOKEN);
  url.searchParams.set('mode', 'admin');
  const res = await fetch(url, { redirect: 'follow' });
  let data;
  try {
    data = JSON.parse(await res.text());
  } catch {
    return jsonAdmin({ galat: `Apps Script tidak mengembalikan JSON (HTTP ${res.status})` }, 502);
  }
  if (!data.admin) {
    // Kode Apps Script lama mengabaikan mode=admin dan mengirim data publik.
    return jsonAdmin({ galat: 'Apps Script belum diperbarui untuk dasbor admin (jalankan scripts/deploy.sh)' }, 502);
  }
  // Ringkasan dari KV: kapan data publik terakhir disinkronkan dan ISPU yang sedang tampil di web.
  const simpanan = await bacaData(env);
  let publik = {};
  try { publik = simpanan ? JSON.parse(simpanan.teks) : {}; } catch { /* tanpa ringkasan */ }
  data.web = {
    disimpan_pada: (simpanan && simpanan.metadata.disimpan_pada) || null,
    udara: publik.udara || [],
    form_url: publik.form_url || {},
  };
  return jsonAdmin(data);
}

async function ubah(request, env, ctx, email) {
  const m = await bacaJson(request);
  if (!m || typeof m.tab !== 'string' || typeof m.id !== 'string' || !AKSI.includes(m.ubah)) {
    return jsonAdmin({ galat: 'tab, id, dan ubah wajib diisi' }, 400);
  }
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: env.APPS_SCRIPT_TOKEN, aksi: 'admin', tab: m.tab, id: m.id, ubah: m.ubah, nilai: m.nilai ?? '', oleh: email,
    }),
    redirect: 'follow',
  });
  let hasil;
  try {
    hasil = JSON.parse(await res.text());
  } catch {
    hasil = { ok: false, galat: `apps_script_http_${res.status}` };
  }
  // Perubahan tayang/sembunyi langsung terlihat di web dan bot, tanpa menunggu cron.
  if (hasil.ok) ctx.waitUntil(segarkan(env).catch((err) => console.error('segarkan', err)));
  return jsonAdmin(hasil, hasil.ok ? 200 : 422);
}

/** Tangani /api/admin/*. `opsi` hanya untuk tes (kini, ambilKunci). */
export async function apiAdmin(request, env, ctx, url, opsi = {}) {
  const rute = `${request.method} ${url.pathname}`;
  if (request.method === 'POST' && !asalSah(request, url)) return jsonAdmin({ galat: 'Asal permintaan ditolak' }, 403);

  switch (rute) {
    case 'GET /api/admin/konfig':
      return jsonAdmin({ client_id: env.ADMIN_CLIENT_ID || null, siap: adminSiap(env) });
    case 'POST /api/admin/masuk':
      return masuk(request, env, opsi);
    case 'POST /api/admin/keluar':
      return jsonAdmin({ ok: true }, 200, { 'Set-Cookie': cookieSesi('', 0) });
  }

  const email = await bacaSesi(env, request, opsi.kini);
  if (!email) return jsonAdmin({ galat: 'Belum masuk' }, 401);
  switch (rute) {
    case 'GET /api/admin/sesi':
      return jsonAdmin({ email });
    case 'GET /api/admin/data':
      return dataAdmin(env);
    case 'POST /api/admin/ubah':
      return ubah(request, env, ctx, email);
    default:
      return jsonAdmin({ galat: 'Tidak ditemukan' }, 404);
  }
}
