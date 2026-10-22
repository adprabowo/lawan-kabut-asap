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

/**
 * Kolom skema yang belum ada di Sheet beserta posisi sisipnya (1-based, diterapkan berurutan):
 * tepat setelah kolom skema sebelumnya, sehingga kolom baru tidak jatuh di belakang kolom
 * verifikasi dan privat. Kolom tambahan buatan relawan tetap di tempatnya.
 */
function rencanaKolomBaru(ada, header) {
  const susunan = ada.slice();
  const rencana = [];
  header.forEach(function (k, i) {
    if (susunan.indexOf(k) !== -1) return;
    const posisi = i === 0 ? 1 : susunan.indexOf(header[i - 1]) + 2;
    susunan.splice(posisi - 1, 0, k);
    rencana.push({ kolom: k, posisi: posisi });
  });
  return rencana;
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
function susunDataPublik(lembar, laporUrl, formUrl) {
  const hasil = { versi: 1 };
  Object.keys(SKEMA).forEach(function (tab) {
    if (!tabPublik(tab)) return;
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
  if (hasil.info) {
    // Terbaru di atas; web dan bot menampilkan beberapa yang teratas.
    hasil.info.sort(function (a, b) { return String(b.tanggal || '').localeCompare(String(a.tanggal || '')); });
  }
  hasil.lapor_url = laporUrl || null;
  hasil.form_url = formUrl || {};
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

// ---------- Dasbor admin (/admin di web; hanya lewat Worker yang memegang token) ----------

// Tab yang dikelola dasbor: semua tab direktori, plus pendaftar relawan (privat).
function tabAdmin() {
  return Object.keys(SKEMA).filter(function (t) { return SKEMA[t].direktori || t === 'relawan'; });
}

/**
 * Susun JSON dasbor admin. `lembar` sama seperti susunDataPublik, ditambah `gid` per tab dan
 * `log` (baris tab log). Berisi kolom privat, jadi hanya keluar untuk Worker yang memegang token.
 * - antrean: entri direktori yang belum dicentang `tampil` (kiriman warga menunggu dicek)
 * - cek_ulang: entri tayang yang `cek_ulang_sebelum`-nya sudah lewat
 * - relawan: semua pendaftar, terbaru di atas
 * - statistik: jumlah tayang/antrean/cek ulang per tab, dan entri tayang per kabupaten
 */
function susunDataAdmin(lembar, sekarang, sheetUrl) {
  const hasil = {
    ok: true, admin: true, dibuat: sekarang.toISOString(), sheet_url: sheetUrl || null,
    tab: {}, antrean: [], cek_ulang: [], relawan: [], statistik: { tab: {}, kabupaten: {} }, log: [],
  };
  const jadiObjek = function (isi, tab) {
    return isi.baris.map(function (r, i) {
      const o = { _tab: tab, _baris: i + 2 };
      isi.header.forEach(function (k, j) { o[k] = nilaiJson_(r[j]); });
      return o;
    }).filter(function (o) { return o.id; });
  };

  tabAdmin().forEach(function (tab) {
    const s = SKEMA[tab];
    const isi = lembar[tab] || { header: [], baris: [] };
    hasil.tab[tab] = {
      judul: s.judul, gid: isi.gid === undefined ? null : isi.gid,
      cek_ulang_hari: s.cekUlangHari || null, pilihan_status: (s.pilihan && s.pilihan.status) || null,
    };
    const daftar = jadiObjek(isi, tab);
    if (tab === 'relawan') {
      hasil.relawan = daftar.sort(function (a, b) { return String(b.waktu || '').localeCompare(String(a.waktu || '')); });
      return;
    }
    const st = { tayang: 0, antrean: 0, cek_ulang: 0 };
    daftar.forEach(function (o) {
      if (o.tampil !== true) {
        st.antrean++;
        hasil.antrean.push(o);
        return;
      }
      st.tayang++;
      if (o.kabupaten) hasil.statistik.kabupaten[o.kabupaten] = (hasil.statistik.kabupaten[o.kabupaten] || 0) + 1;
      const batas = Date.parse(o.cek_ulang_sebelum || '');
      if (!isNaN(batas) && batas < sekarang.getTime()) {
        st.cek_ulang++;
        hasil.cek_ulang.push(o);
      }
    });
    hasil.statistik.tab[tab] = st;
  });

  // Kiriman terbaru dulu; cek ulang yang paling lama lewat dulu.
  hasil.antrean.sort(function (a, b) { return String(b.diubah_pada || '').localeCompare(String(a.diubah_pada || '')); });
  hasil.cek_ulang.sort(function (a, b) { return String(a.cek_ulang_sebelum).localeCompare(String(b.cek_ulang_sebelum)); });

  const log = lembar.log || { header: [], baris: [] };
  hasil.log = log.baris.slice(-40).reverse().map(function (r) {
    const o = {};
    log.header.forEach(function (k, j) { o[k] = nilaiJson_(r[j]); });
    return o;
  });
  return hasil;
}

/**
 * Kolom yang diubah oleh satu aksi dasbor admin, atau {galat}. `oleh` = email admin.
 * tampilkan/sudah_dicek mengisi kolom verifikasi seperti centang `tampil` di Sheet.
 */
function perubahanAdmin(tab, aksi, nilai, sekarang, oleh) {
  if (tabAdmin().indexOf(tab) === -1) return { galat: 'tab' };
  const s = SKEMA[tab];
  const verifikasi = function () {
    return {
      terverifikasi_pada: sekarang,
      terverifikasi_oleh: oleh,
      cek_ulang_sebelum: tambahHari(sekarang, s.cekUlangHari),
    };
  };
  if (aksi === 'catatan') return { catatan_internal: String(nilai === undefined || nilai === null ? '' : nilai).slice(0, 1000) };
  if (tab === 'relawan') {
    if (aksi !== 'status' || s.pilihan.status.indexOf(nilai) === -1) return { galat: 'aksi' };
    return { status: nilai };
  }
  if (aksi === 'tampilkan') {
    const p = verifikasi();
    p.tampil = true;
    return p;
  }
  if (aksi === 'sembunyikan') return { tampil: false };
  if (aksi === 'sudah_dicek') return verifikasi();
  return { galat: 'aksi' };
}
