/**
 * PM2.5 terukur per jam dari BMKG untuk kab/kota di Jambi, dikonversi ke ISPU (Permen LHK P.14/2020).
 * BMKG tidak menyediakan API untuk ini; angkanya dibaca dari payload __NUXT_DATA__ halaman
 * https://www.bmkg.go.id/kualitas-udara/pm25. Kalau BMKG mengubah halamannya, uraiBmkg() melempar
 * galat dan pembacaan BMKG terakhir tetap dipakai sementara (lihat segarkan() di data.js).
 */
export const URL_BMKG = 'https://www.bmkg.go.id/kualitas-udara/pm25';
export const SUMBER_BMKG = 'PM2.5 BMKG';

// Nama stasiun BMKG → nama kab/kota di web (sama dengan KABUPATEN di apps-script/Skema.gs).
const LOKASI_JAMBI = {
  'Kota Jambi': 'Kota Jambi',
  'Kota Sungai Penuh': 'Kota Sungai Penuh',
  'Sungai Penuh': 'Kota Sungai Penuh',
  'Batang Hari': 'Batang Hari',
  Bungo: 'Bungo',
  Kerinci: 'Kerinci',
  Merangin: 'Merangin',
  'Muaro Jambi': 'Muaro Jambi',
  Sarolangun: 'Sarolangun',
  'Tanjung Jabung Barat': 'Tanjung Jabung Barat',
  'Tanjung Jabung Timur': 'Tanjung Jabung Timur',
  Tebo: 'Tebo',
};

// Batas atas tiap kategori sebagai [PM2.5 µg/m³, ISPU], Permen LHK P.14/2020.
const BATAS_PM25 = [[0, 0], [15.5, 50], [55.4, 100], [150.4, 200], [250.4, 300], [500, 500]];

/** ISPU dari PM2.5, dibulatkan ke atas supaya kategorinya tidak pernah lebih ringan dari konsentrasinya. */
export function ispuDariPm25(pm25) {
  if (!Number.isFinite(pm25) || pm25 < 0) return null;
  for (let i = 1; i < BATAS_PM25.length; i++) {
    const [xa, ia] = BATAS_PM25[i];
    if (pm25 <= xa) {
      const [xb, ib] = BATAS_PM25[i - 1];
      return Math.max(0, Math.ceil(((ia - ib) / (xa - xb)) * (pm25 - xb) + ib - 1e-9));
    }
  }
  return 500; // di atas skala ISPU
}

/** Sama dengan kategoriIspu() di apps-script/Util.gs. */
export function kategoriIspu(ispu) {
  if (ispu <= 50) return 'Baik';
  if (ispu <= 100) return 'Sedang';
  if (ispu <= 200) return 'Tidak Sehat';
  if (ispu <= 300) return 'Sangat Tidak Sehat';
  return 'Berbahaya';
}

/** BMKG hanya menyebut jam (WIB). Jam yang belum tiba hari ini berarti pengukuran kemarin. */
export function waktuPengukuran(jam, kini) {
  const wib = new Date(kini + 7 * 3600e3);
  let hari = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  if (jam > wib.getUTCHours()) hari -= 86400e3;
  return new Date(hari + (jam - 7) * 3600e3).toISOString();
}

/**
 * Pembacaan Jambi dari HTML halaman PM2.5 BMKG, satu per lokasi:
 * [{waktu, lokasi, ispu, kategori, sumber, pm25}]. Payload Nuxt berupa array datar; tiap objek
 * stasiun ({nama_file, LOKASI, JAM, PM25, ...}) menunjuk nilainya lewat indeks di array yang sama.
 */
export function uraiBmkg(html, kini = Date.now()) {
  const m = /<script[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('BMKG: payload __NUXT_DATA__ tidak ditemukan');
  const isi = JSON.parse(m[1]);
  const nilai = (i) => (Number.isInteger(i) && i >= 0 ? isi[i] : undefined);
  // Stasiun mati bisa berisi null, "" atau "-"; itu bukan angka, jangan sampai terbaca 0 µg/m³ (udara "Baik").
  const angka = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN);
  const per = new Map();
  let stasiun = 0;
  for (const o of isi) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || !('LOKASI' in o) || !('PM25' in o)) continue;
    stasiun++;
    const lokasi = LOKASI_JAMBI[String(nilai(o.LOKASI) ?? '').trim()];
    const pm25 = angka(nilai(o.PM25));
    const jam = angka(nilai(o.JAM));
    if (!lokasi || !Number.isFinite(pm25) || pm25 <= 0 || !Number.isInteger(jam) || jam < 0 || jam > 23) continue;
    const ispu = ispuDariPm25(pm25);
    const baca = { waktu: waktuPengukuran(jam, kini), lokasi, ispu, kategori: kategoriIspu(ispu), sumber: SUMBER_BMKG, pm25 };
    const lama = per.get(lokasi);
    if (!lama || baca.waktu > lama.waktu) per.set(lokasi, baca);
  }
  if (!stasiun) throw new Error('BMKG: tidak ada data stasiun di halaman');
  return [...per.values()];
}
