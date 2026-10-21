/**
 * Fungsi murni tanpa layanan Google, supaya bisa diuji dengan Node (lihat test/).
 */

/** ID berikutnya untuk awalan tertentu, misalnya R001 setelah R000 atau dari kosong. */
function idBerikutnya(awalan, idYangAda) {
  let maks = 0;
  const pola = new RegExp('^' + awalan + '(\\d+)$');
  idYangAda.forEach(function (id) {
    const m = pola.exec(String(id).trim());
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  const n = String(maks + 1);
  return awalan + (n.length < 3 ? ('000' + n).slice(-3) : n);
}

/**
 * Ambil koordinat dari teks bebas: "-1.61, 103.61", tautan Google Maps
 * (@lat,lng / ?q=lat,lng / !3dlat!4dlng), atau tautan OpenStreetMap.
 * Mengembalikan {lat, lng} atau null. Tautan pendek maps.app.goo.gl tidak
 * bisa diurai tanpa membukanya, jadi hasilnya null.
 */
function uraiKoordinat(teks) {
  if (!teks) return null;
  const s = String(teks);
  const pola = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|mlat)=(-?\d+(?:\.\d+)?)(?:,|%2C|&mlon=)\s*(-?\d+(?:\.\d+)?)/i,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (let i = 0; i < pola.length; i++) {
    const m = pola[i].exec(s);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: lat, lng: lng };
    }
  }
  return null;
}

/**
 * Indeks baris pertama (0 = baris 2 di Sheet) yang kolom id dan namanya kosong.
 * Bila semua terisi, mengembalikan panjang daftar (baris setelah yang terakhir).
 */
function indeksBarisKosong(ids, nama) {
  for (let i = 0; i < ids.length; i++) {
    if (!ids[i] && !(nama && nama[i])) return i;
  }
  return ids.length;
}

/** Tautan pendek Google Maps (dari tombol "Bagikan") di dalam teks, atau '' bila tidak ada. */
function ambilTautanPendek(teks) {
  const m = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[A-Za-z0-9_-]+/.exec(String(teks || ''));
  return m ? m[0] : '';
}

/** Kategori ISPU menurut Permen LHK P.14/2020. */
function kategoriIspu(ispu) {
  const n = Number(ispu);
  if (ispu === '' || ispu === null || isNaN(n)) return '';
  if (n <= 50) return 'Baik';
  if (n <= 100) return 'Sedang';
  if (n <= 200) return 'Tidak Sehat';
  if (n <= 300) return 'Sangat Tidak Sehat';
  return 'Berbahaya';
}

function tambahHari(tanggal, hari) {
  const d = new Date(tanggal.getTime());
  d.setDate(d.getDate() + hari);
  return d;
}

/** Nomor WhatsApp ke format internasional tanpa tanda plus: 0812... menjadi 62812... */
function normalkanNomorWa(nomor) {
  let s = String(nomor || '').replace(/[^\d]/g, '');
  if (s.indexOf('0') === 0) s = '62' + s.slice(1);
  else if (s.indexOf('8') === 0) s = '62' + s;
  return s;
}

/** Nilai sel ke JSON: tanggal jadi ISO, sel kosong jadi null. */
function nilaiJson_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  if (v === '' || v === undefined) return null;
  return v;
}

/**
 * Susun JSON publik dari isi Sheet. `lembar` berbentuk {tab: {header: [...], baris: [[...]]}}.
 * Hanya kolom publik yang keluar; entri direktori hanya yang dicentang `tampil`;
 * FAQ hanya yang sudah direview; udara hanya pembacaan terbaru per lokasi.
 */
function susunDataPublik(lembar, laporUrl) {
  const hasil = { versi: 1 };
  Object.keys(SKEMA).forEach(function (tab) {
    if (tab === 'log') return;
    const isi = lembar[tab] || { header: [], baris: [] };
    const publik = kolomPublik(tab);
    let baris = isi.baris.map(function (r) {
      const o = {};
      isi.header.forEach(function (k, i) { o[k] = r[i]; });
      return o;
    });

    if (SKEMA[tab].direktori) {
      baris = baris.filter(function (o) { return o.tampil === true && o.id; });
    } else if (tab === 'faq') {
      baris = baris.filter(function (o) { return o.direview_pada && o.pertanyaan && o.jawaban; });
    } else if (tab === 'udara') {
      const terbaru = {};
      baris.forEach(function (o) {
        if (!o.lokasi || o.ispu === '' || !(o.waktu instanceof Date)) return;
        const lama = terbaru[o.lokasi];
        if (!lama || o.waktu > lama.waktu) terbaru[o.lokasi] = o;
      });
      baris = Object.keys(terbaru).sort().map(function (k) { return terbaru[k]; });
    }

    hasil[tab] = baris.map(function (o) {
      const p = {};
      publik.forEach(function (k) { if (k in o) p[k] = nilaiJson_(o[k]); });
      return p;
    });
  });
  hasil.lapor_url = laporUrl || null;
  return hasil;
}

/** Apakah nomor `dari` terdaftar di kolom pengelola_wa (boleh lebih dari satu, dipisah koma). */
function bolehUbahStatus(pengelolaWa, dari) {
  const pengirim = normalkanNomorWa(dari);
  if (!pengirim) return false;
  return String(pengelolaWa || '').split(/[,;\/]+/).some(function (n) {
    return n && normalkanNomorWa(n) === pengirim;
  });
}
