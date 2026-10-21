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
