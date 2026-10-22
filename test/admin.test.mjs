// Menguji dasbor admin Worker: login Google, sesi, izin, dan penerusan ke Apps Script. npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiAdmin, verifikasiTokenGoogle } from '../worker/src/admin.js';

const enc = new TextEncoder();
const b64url = (b) => Buffer.from(b).toString('base64url');
const CLIENT = '123-abc.apps.googleusercontent.com';
const ASAL = 'https://lawanasap.iaitbjambi.org';
const KINI = Date.parse('2026-10-22T05:00:00Z');

const pasangan = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pasangan.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
const ambilKunci = async () => [jwk];

async function tokenGoogle(isi = {}, { kid = 'k1', kunci = pasangan.privateKey } = {}) {
  const kepala = b64url(enc.encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })));
  const badan = b64url(enc.encode(JSON.stringify({
    iss: 'https://accounts.google.com', aud: CLIENT, exp: KINI / 1000 + 3600, iat: KINI / 1000,
    email: 'hello.iaitbjambi@gmail.com', email_verified: true, ...isi,
  })));
  const tanda = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kunci, enc.encode(`${kepala}.${badan}`));
  return `${kepala}.${badan}.${b64url(new Uint8Array(tanda))}`;
}

let env;
let ctx;
let panggilan;

beforeEach(() => {
  env = {
    ADMIN_EMAIL: 'Hello.IAITBJambi@gmail.com',
    ADMIN_CLIENT_ID: CLIENT,
    ADMIN_SESSION_KEY: 'kunci-uji',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/X/exec',
    APPS_SCRIPT_TOKEN: 'tok',
    DATA: {
      async getWithMetadata() {
        return { value: JSON.stringify({ ruang: [], udara: [{ lokasi: 'Kota Jambi', ispu: 180 }], form_url: { info: 'https://f' } }), metadata: { disimpan_pada: '2026-10-22T04:55:00Z' } };
      },
      async put() {},
    },
  };
  const tunggu = [];
  ctx = { waitUntil: (p) => tunggu.push(p), selesai: () => Promise.all(tunggu) };
  panggilan = [];
  globalThis.fetch = async (url, opsi = {}) => {
    panggilan.push({ url: String(url), opsi });
    const u = new URL(url);
    if (opsi.method === 'POST') {
      const m = JSON.parse(opsi.body);
      if (m.aksi === 'admin') return new Response(JSON.stringify({ ok: true, tab: m.tab, id: m.id }));
    }
    if (u.searchParams.get('mode') === 'admin') {
      return new Response(JSON.stringify({ ok: true, admin: true, antrean: [{ id: 'R002', pengelola_wa: '6282' }] }));
    }
    return new Response(JSON.stringify({ versi: 1, ruang: [] }));
  };
});

function minta(jalur, { method = 'GET', body, cookie, origin = method === 'POST' ? ASAL : null } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  const request = new Request(`https://lawan-kabut-asap.x.workers.dev${jalur}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return apiAdmin(request, env, ctx, new URL(request.url), { kini: KINI, ambilKunci });
}

async function masuk(isi) {
  const res = await minta('/api/admin/masuk', { method: 'POST', body: { credential: await tokenGoogle(isi) } });
  const setCookie = res.headers.get('Set-Cookie') || '';
  return { res, cookie: setCookie.split(';')[0], setCookie };
}

test('verifikasiTokenGoogle menolak token yang dipalsukan, kedaluwarsa, atau untuk aplikasi lain', async () => {
  const opsi = { clientId: CLIENT, kini: KINI, ambilKunci };
  assert.equal((await verifikasiTokenGoogle(await tokenGoogle(), opsi)).email, 'hello.iaitbjambi@gmail.com');

  const lain = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({}, { kunci: lain.privateKey }), opsi), /tanda tangan/);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({}, { kid: 'k9' }), opsi), /tidak dikenal/);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({ aud: 'lain' }), opsi), /audiens/);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({ iss: 'https://evil' }), opsi), /penerbit/);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({ exp: KINI / 1000 - 3600 }), opsi), /kedaluwarsa/);
  await assert.rejects(verifikasiTokenGoogle(await tokenGoogle({ email_verified: false }), opsi), /terverifikasi/);

  // Isi diubah setelah ditandatangani.
  const [k, , t] = (await tokenGoogle()).split('.');
  const badanPalsu = b64url(enc.encode(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, exp: KINI / 1000 + 60, email: 'x@y', email_verified: true })));
  await assert.rejects(verifikasiTokenGoogle(`${k}.${badanPalsu}.${t}`, opsi), /tanda tangan/);
});

test('hanya email admin yang bisa masuk; cookie sesi aman', async () => {
  const lain = await masuk({ email: 'orang.lain@gmail.com' });
  assert.equal(lain.res.status, 403);
  assert.equal(lain.setCookie, '');

  const { res, setCookie } = await masuk();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'hello.iaitbjambi@gmail.com');
  assert.match(setCookie, /^__Host-lka_admin=/);
  for (const a of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=28800']) assert.ok(setCookie.includes(a), a);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('tanpa sesi, data admin ditolak dan Apps Script tidak dipanggil', async () => {
  assert.equal((await minta('/api/admin/data')).status, 401);
  assert.equal((await minta('/api/admin/data', { cookie: '__Host-lka_admin=abc.def' })).status, 401);
  const { cookie } = await masuk();
  const [nama, nilai] = cookie.split('=');
  const [isi, tanda] = nilai.split('.');
  const isiPalsu = Buffer.from(JSON.stringify({ e: 'hello.iaitbjambi@gmail.com', x: KINI / 1000 + 99999 })).toString('base64url');
  assert.equal((await minta('/api/admin/data', { cookie: `${nama}=${isiPalsu}.${tanda}` })).status, 401);
  assert.ok(isi);
  assert.equal(panggilan.filter((p) => p.url.includes('mode=admin')).length, 0);
});

test('sesi berakhir bila kedaluwarsa atau email dicabut dari ADMIN_EMAIL', async () => {
  const { cookie } = await masuk();
  const nanti = new Request('https://x.workers.dev/api/admin/sesi', { headers: { Cookie: cookie } });
  assert.equal((await apiAdmin(nanti, env, ctx, new URL(nanti.url), { kini: KINI + 9 * 3600e3 })).status, 401);
  assert.equal((await minta('/api/admin/sesi', { cookie })).status, 200);
  env.ADMIN_EMAIL = 'pengurus.baru@gmail.com';
  assert.equal((await minta('/api/admin/sesi', { cookie })).status, 401);
});

test('data admin diambil dari Apps Script mode=admin, ditambah ringkasan web dari KV', async () => {
  const { cookie } = await masuk();
  const res = await minta('/api/admin/data', { cookie });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null, 'tanpa CORS terbuka');
  const d = await res.json();
  assert.equal(d.antrean[0].pengelola_wa, '6282');
  assert.equal(d.web.disimpan_pada, '2026-10-22T04:55:00Z');
  assert.equal(d.web.udara[0].ispu, 180);
  const url = new URL(panggilan.find((p) => p.url.includes('mode=admin')).url);
  assert.equal(url.searchParams.get('token'), 'tok');
});

test('Apps Script lama (tanpa mode admin) dilaporkan jelas', async () => {
  const { cookie } = await masuk();
  globalThis.fetch = async () => new Response(JSON.stringify({ versi: 1, ruang: [] }));
  const res = await minta('/api/admin/data', { cookie });
  assert.equal(res.status, 502);
  assert.match((await res.json()).galat, /belum diperbarui/);
});

test('aksi admin diteruskan dengan email admin sebagai pelaku, lalu data publik disegarkan', async () => {
  const { cookie } = await masuk();
  const res = await minta('/api/admin/ubah', { method: 'POST', cookie, body: { tab: 'ruang', id: 'R002', ubah: 'tampilkan' } });
  assert.equal(res.status, 200);
  await ctx.selesai();
  const kirim = JSON.parse(panggilan.find((p) => p.opsi.method === 'POST').opsi.body);
  assert.deepEqual(kirim, { token: 'tok', aksi: 'admin', tab: 'ruang', id: 'R002', ubah: 'tampilkan', nilai: '', oleh: 'hello.iaitbjambi@gmail.com' });
  assert.ok(panggilan.some((p) => !p.opsi.method && !p.url.includes('mode=admin')), 'segarkan dipanggil');

  assert.equal((await minta('/api/admin/ubah', { method: 'POST', cookie, body: { tab: 'ruang', id: 'R002', ubah: 'hapus' } })).status, 400);
});

test('POST dari situs lain ditolak walau membawa cookie', async () => {
  const { cookie } = await masuk();
  const res = await minta('/api/admin/ubah', {
    method: 'POST', cookie, origin: 'https://jahat.example', body: { tab: 'ruang', id: 'R002', ubah: 'tampilkan' },
  });
  assert.equal(res.status, 403);
  assert.equal((await minta('/api/admin/masuk', { method: 'POST', origin: '', body: { credential: 'x' } })).status, 403);
});

test('konfig publik dan dasbor nonaktif bila belum dikonfigurasi', async () => {
  assert.deepEqual(await (await minta('/api/admin/konfig')).json(), { client_id: CLIENT, siap: true });
  env.ADMIN_CLIENT_ID = '';
  assert.equal((await (await minta('/api/admin/konfig')).json()).siap, false);
  const res = await minta('/api/admin/masuk', { method: 'POST', body: { credential: await tokenGoogle() } });
  assert.equal(res.status, 503);
});
