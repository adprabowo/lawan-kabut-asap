export const KUNCI_DATA = 'data'; // Seluruh data disimpan di SATU key KV.

async function sha256(teks) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tarik JSON dari Apps Script dan simpan ke KV hanya kalau isinya berubah.
 * Kalau Apps Script galat, data lama di KV tetap dipakai.
 */
export async function segarkan(env) {
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

  const hash = await sha256(teks);
  const { metadata } = await env.DATA.getWithMetadata(KUNCI_DATA);
  if (metadata && metadata.hash === hash) return { berubah: false, hash };

  await env.DATA.put(KUNCI_DATA, teks, {
    metadata: { hash, disimpan_pada: new Date().toISOString() },
  });
  return { berubah: true, hash };
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
