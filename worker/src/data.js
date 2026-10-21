import { SUMBER_BMKG, URL_BMKG, uraiBmkg } from './bmkg.js';

export const KUNCI_DATA = 'data'; // Seluruh data disimpan di SATU key KV.
// Pembacaan BMKG terakhir dipakai ulang selama BMKG belum terbaca lagi, asal tidak lebih tua dari ini.
const UMUR_MAKS_BMKG_MS = 6 * 3600e3;

async function sha256(teks) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ambilBmkg(kini) {
  const res = await fetch(URL_BMKG, {
    headers: { 'User-Agent': 'LawanKabutAsap/1.0 (+https://lawan-kabut-asap.adprabowo-id.workers.dev)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`BMKG HTTP ${res.status}`);
  return uraiBmkg(await res.text(), kini);
}

function bmkgTerakhir(teks) {
  try {
    return (JSON.parse(teks).udara || []).filter((u) => u && u.sumber === SUMBER_BMKG);
  } catch {
    return [];
  }
}

/** Satu pembacaan udara per lokasi: yang waktunya paling baru; bila sama, yang belakangan di daftar. */
export function terbaruPerLokasi(daftar) {
  const waktu = (u) => Date.parse(u.waktu) || -Infinity;
  const per = new Map();
  for (const u of daftar) {
    if (!u || !u.lokasi) continue;
    const lama = per.get(u.lokasi);
    if (!lama || waktu(u) >= waktu(lama)) per.set(u.lokasi, u);
  }
  return [...per.values()].sort((a, b) => (a.lokasi < b.lokasi ? -1 : a.lokasi > b.lokasi ? 1 : 0));
}

/**
 * Tarik JSON dari Apps Script, gabungkan PM2.5 BMKG ke `udara`, dan simpan ke KV hanya kalau
 * isinya berubah. Kalau Apps Script galat, data lama di KV tetap dipakai. Dengan `bmkg: true`
 * BMKG dibaca sekarang; tanpa itu, atau bila BMKG gagal, pembacaan BMKG terakhir dipakai ulang.
 * Per lokasi yang tampil adalah pembacaan paling baru, dari BMKG maupun isian relawan di Sheet.
 */
export async function segarkan(env, { bmkg = false, kini = Date.now() } = {}) {
  const url = new URL(env.APPS_SCRIPT_URL);
  url.searchParams.set('token', env.APPS_SCRIPT_TOKEN);
  const res = await fetch(url, { redirect: 'follow' });
  const teks = await res.text();

  let data;
  try {
    data = JSON.parse(teks);
  } catch {
    throw new Error(`Apps Script tidak mengembalikan JSON (HTTP ${res.status})`);
  }
  if (data.ok === false || !Array.isArray(data.ruang)) {
    throw new Error(`Apps Script menolak: ${data.galat || 'format tidak dikenal'}`);
  }

  const { value: teksLama, metadata } = await env.DATA.getWithMetadata(KUNCI_DATA);
  let baru = [];
  if (bmkg) {
    try {
      baru = await ambilBmkg(kini);
    } catch (err) {
      console.error('BMKG gagal:', err.message);
    }
  }
  const otomatis = terbaruPerLokasi([...bmkgTerakhir(teksLama), ...baru])
    .filter((u) => kini - Date.parse(u.waktu) <= UMUR_MAKS_BMKG_MS);
  data.udara = terbaruPerLokasi([...otomatis, ...(data.udara || [])]);

  const isi = JSON.stringify(data);
  const hash = await sha256(isi);
  if (metadata && metadata.hash === hash) return { berubah: false, hash, bmkg: baru.length };

  await env.DATA.put(KUNCI_DATA, isi, {
    metadata: { hash, disimpan_pada: new Date().toISOString() },
  });
  return { berubah: true, hash, bmkg: baru.length };
}

export async function bacaData(env) {
  const { value, metadata } = await env.DATA.getWithMetadata(KUNCI_DATA, 'text');
  if (!value) return null;
  return { teks: value, metadata: metadata || {} };
}

/** Teruskan perubahan status ruang dari bot ke Apps Script doPost. */
export async function kirimStatus(env, { kode, status, dari }) {
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: env.APPS_SCRIPT_TOKEN, aksi: 'status', kode, status, dari }),
    redirect: 'follow',
  });
  try {
    return JSON.parse(await res.text());
  } catch {
    return { ok: false, galat: `apps_script_http_${res.status}` };
  }
}
