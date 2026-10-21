// Web app Lawan Kabut Asap: satu halaman, rute lewat hash, data dari /api/data.
(function () {
  'use strict';

  const KUNCI_SIMPAN = 'lka:data';
  const KUNCI_KABUPATEN = 'lka:kabupaten';
  const KUNCI_LOKASI = 'lka:lokasi-udara';
  const SEGARKAN_MS = 5 * 60 * 1000;
  const DEMO = new URLSearchParams(location.search).get('demo') === '1';
  const gerakDikurangi = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ikon = window.ikon;

  // `judulLapor` harus sama dengan SKEMA[tab].judul di apps-script/Skema.gs (pilihan "Bagian" di Form lapor).
  const DIREKTORI = {
    ruang: {
      tab: 'ruang', judul: 'Ruang Aman Asap', judulLapor: 'Ruang Aman Asap', ikon: 'ruang-aman',
      label: 'status', terdekat: true, satuan: 'tempat',
      kosong: {
        judul: 'Belum ada ruang aman yang terverifikasi',
        teks: 'Relawan sedang mendata dan mengecek tempat. Sambil menunggu, siapkan satu ruangan bersih di rumah.',
        tautan: '#/panduan/ruang-bersih', label: 'Cara membuat ruang bersih',
      },
    },
    oksigen: {
      tab: 'oksigen', judul: 'Oksigen', judulLapor: 'Penyedia Oksigen', ikon: 'oksigen',
      label: 'stok', terdekat: true, satuan: 'penyedia',
      kosong: {
        judul: 'Belum ada penyedia oksigen yang terverifikasi',
        teks: 'Untuk oksigen medis darurat, telepon 119 atau datangi IGD rumah sakit terdekat.',
        tautan: 'tel:119', label: 'Telepon 119',
      },
    },
    'air-bersih': {
      tab: 'air_bersih', judul: 'Air Bersih', judulLapor: 'Penyedia Air Bersih', ikon: 'tetes', satuan: 'penyedia',
      kosong: {
        judul: 'Belum ada penyedia air bersih yang terverifikasi',
        teks: 'Relawan sedang mendata depot, tangki air, serta layanan PDAM dan BPBD.',
        tautan: '#/', label: 'Kembali ke beranda',
      },
    },
    kontak: {
      tab: 'kontak_darurat', judul: 'Kontak Darurat', judulLapor: 'Kontak Darurat', ikon: 'sirene', satuan: 'kontak',
      kosong: {
        judul: 'Daftar faskes sedang disiapkan',
        teks: 'Nomor darurat nasional di atas bisa dipakai kapan saja.',
        tautan: '#/panduan/ispa', label: 'Kenali tanda bahaya ISPA',
      },
    },
  };

  const NOMOR_NASIONAL = [
    { nomor: '112', nama: 'Layanan darurat terpadu', ket: 'Kebakaran, kecelakaan, kriminal, darurat medis' },
    { nomor: '119', nama: 'Ambulans dan gawat darurat medis', ket: 'Sesak berat, nyeri dada, pingsan' },
    { nomor: '113', nama: 'Pemadam kebakaran', ket: 'Laporkan titik api di dekat Anda' },
    { nomor: '110', nama: 'Polisi', ket: 'Gangguan keamanan' },
  ];

  const KATEGORI = {
    'Baik': { kelas: 'baik', warna: 'var(--ispu-baik)', saran: 'Udara baik. Aktivitas di luar aman.' },
    'Sedang': { kelas: 'sedang', warna: 'var(--ispu-sedang)', saran: 'Kelompok sensitif sebaiknya mengurangi aktivitas berat di luar.' },
    'Tidak Sehat': { kelas: 'tidak-sehat', warna: 'var(--ispu-tidak-sehat)', saran: 'Kurangi aktivitas di luar. Pakai masker N95 atau KN95 bila harus keluar.' },
    'Sangat Tidak Sehat': { kelas: 'sangat', warna: 'var(--ispu-sangat)', saran: 'Hindari aktivitas di luar. Tutup pintu dan jendela, lalu gunakan ruang bersih.', ruangAman: true },
    'Berbahaya': { kelas: 'berbahaya', warna: 'var(--ispu-berbahaya)', saran: 'Tetap di ruang bersih. Bayi, lansia, ibu hamil, dan penderita asma sebaiknya pindah ke Ruang Aman Asap.', ruangAman: true },
  };

  const STATUS = {
    BUKA: ['Buka', 'hijau'], PENUH: ['Penuh', 'kuning'], TUTUP: ['Tutup', 'abu'],
    Tersedia: ['Stok tersedia', 'hijau'], Terbatas: ['Stok terbatas', 'kuning'], Habis: ['Stok habis', 'abu'],
  };
  const URUTAN_STATUS = { BUKA: 0, Tersedia: 0, PENUH: 1, Terbatas: 1, TUTUP: 2, Habis: 2 };

  const isi = document.getElementById('isi');
  const pita = document.getElementById('pita');
  const elToast = document.getElementById('toast');

  let data = null;
  let teksData = '';
  let diambilPada = 0;
  let dariSimpanan = false;
  let posisi = null; // {lat, lng} setelah warga menekan "Terdekat"
  let lokasiUdara = baca(KUNCI_LOKASI) || '';
  let filterKab = baca(KUNCI_KABUPATEN) || '';
  let filterKec = '';
  let ruteTerakhir = null;

  // ---------- util ----------

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function simpan(kunci, nilai) {
    try { localStorage.setItem(kunci, nilai); } catch (e) { /* mode privat */ }
  }

  function baca(kunci) {
    try { return localStorage.getItem(kunci); } catch (e) { return null; }
  }

  function relatif(iso) {
    const t = Date.parse(iso);
    if (!t) return '';
    const menit = Math.round((Date.now() - t) / 60000);
    if (menit < 2) return 'baru saja';
    if (menit < 60) return menit + ' menit lalu';
    const jam = Math.round(menit / 60);
    if (jam < 24) return jam + ' jam lalu';
    return Math.round(jam / 24) + ' hari lalu';
  }

  function jarakKm(a, b) {
    const rad = (d) => d * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }

  function formatJarak(km) {
    if (km < 1) return Math.max(10, Math.round(km * 100) * 10) + ' m';
    return km.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' km';
  }

  function nomorTel(n) { return String(n || '').replace(/[^\d+]/g, ''); }

  function nomorWa(n) {
    let s = String(n || '').replace(/\D/g, '');
    if (s.startsWith('0')) s = '62' + s.slice(1);
    return s.startsWith('62') && s.length >= 10 ? s : '';
  }

  function tautanLapor(cfg, id) {
    if (!data || !data.lapor_url) return '';
    return data.lapor_url
      .replace('{bagian}', encodeURIComponent(cfg.judulLapor))
      .replace('{kode}', encodeURIComponent(id));
  }

  function toast(pesan) {
    elToast.textContent = pesan;
    elToast.classList.add('tampak');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { elToast.classList.remove('tampak'); }, 3400);
  }

  // ---------- udara ----------

  function kategoriDari(u) {
    if (u.kategori && KATEGORI[u.kategori]) return u.kategori;
    const n = Number(u.ispu);
    if (n <= 50) return 'Baik';
    if (n <= 100) return 'Sedang';
    if (n <= 200) return 'Tidak Sehat';
    if (n <= 300) return 'Sangat Tidak Sehat';
    return 'Berbahaya';
  }

  // Lima kategori digambar sama lebar; posisi di dalam kategori mengikuti nilainya.
  function posisiSkala(v) {
    const batas = [0, 50, 100, 200, 300, 500];
    for (let i = 0; i < 5; i++) {
      if (v <= batas[i + 1] || i === 4) {
        const f = (Math.min(v, batas[i + 1]) - batas[i]) / (batas[i + 1] - batas[i]);
        return (i + Math.max(0, Math.min(1, f))) / 5;
      }
    }
    return 1;
  }

  function dataUdara() {
    return ((data && data.udara) || [])
      .filter(function (u) { return u.lokasi && u.ispu !== null && u.ispu !== '' && isFinite(Number(u.ispu)); })
      .sort(function (a, b) { return Number(b.ispu) - Number(a.ispu); });
  }

  function udaraAktif(daftar) {
    return daftar.find(function (u) { return u.lokasi === lokasiUdara; }) ||
      daftar.find(function (u) { return u.lokasi === 'Kota Jambi'; }) || daftar[0];
  }

  // Garis hutan dibuat dari angka acak berbenih, jadi bentuknya selalu sama di setiap kunjungan.
  function acakBerbenih(benih) {
    return function () {
      benih = (benih + 0x6d2b79f5) | 0;
      let t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function garisHutan(benih, dasar, variasi) {
    const acak = acakBerbenih(benih);
    let x = 0;
    let y = dasar;
    let d = 'M0 60L0 ' + y.toFixed(1);
    while (x < 400) {
      const x2 = Math.min(400, x + 9 + acak() * 20);
      const y2 = dasar - acak() * 4;
      const tinggi = acak() < 0.12 ? variasi * 1.6 : variasi * (0.4 + acak() * 0.6);
      const puncak = (Math.min(y, y2) - tinggi).toFixed(1);
      d += 'C' + x.toFixed(1) + ' ' + puncak + ' ' + x2.toFixed(1) + ' ' + puncak + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
      x = x2;
      y = y2;
    }
    return d + 'L400 60Z';
  }

  const HUTAN_JAUH = garisHutan(7, 40, 16);
  const HUTAN_DEKAT = garisHutan(23, 48, 13);

  function htmlLukisan() {
    const hutan = function (kelas, d) {
      return '<svg class="pohon ' + kelas + '" viewBox="0 0 400 60" preserveAspectRatio="none" focusable="false"><path d="' + d + '"/></svg>';
    };
    return '<div class="lukisan" aria-hidden="true"><div class="matahari"></div>' +
      '<div class="asap asap-1"></div><div class="asap asap-2"></div>' + hutan('pohon-jauh', HUTAN_JAUH) +
      '<div class="kepul kepul-1"></div><div class="kepul kepul-2"></div><div class="kepul kepul-3"></div>' +
      hutan('pohon-dekat', HUTAN_DEKAT) + '<div class="asap asap-3"></div></div>';
  }

  function htmlSkala(nilai) {
    const label = '<div class="skala-label" aria-hidden="true"><span style="left:0">0</span><span style="left:20%">50</span>' +
      '<span style="left:40%">100</span><span style="left:60%">200</span><span style="left:80%">300</span></div>';
    const pita = '<div class="skala-pita"><span></span><span></span><span></span><span></span><span></span></div>';
    if (nilai === null) return '<div class="skala" aria-hidden="true">' + pita + label + '</div>';
    return '<div class="skala" role="img" aria-label="Posisi ISPU ' + nilai + ' pada skala 0 sampai lebih dari 300">' + pita +
      '<div class="skala-jalur" id="skala-jalur" data-pos="' + posisiSkala(nilai).toFixed(4) + '"><span class="skala-penanda"></span></div>' +
      label + '</div>';
  }

  function htmlSaran(kat) {
    return esc(kat.saran) + (kat.ruangAman ? ' <a href="#/ruang">Cari ruang aman</a>' : '');
  }

  function htmlPilihLokasi(daftar, aktif) {
    if (daftar.length < 2) return '';
    return '<div class="lokasi-pilih" role="group" aria-label="Pilih lokasi">' + daftar.map(function (u) {
      const k = KATEGORI[kategoriDari(u)];
      return '<button type="button" class="lokasi-tombol" data-lokasi="' + esc(u.lokasi) + '" aria-pressed="' + (u.lokasi === aktif) + '">' +
        '<span class="lokasi-titik" style="--warna:' + k.warna + '"></span>' + esc(u.lokasi) + ' <b>' + esc(Number(u.ispu)) + '</b></button>';
    }).join('') + '</div>';
  }

  function htmlLangit() {
    const daftar = dataUdara();
    if (!daftar.length) {
      return '<section class="langit kat-kosong muncul" id="langit" aria-labelledby="langit-kategori">' +
        '<div class="langit-atas">' + htmlLukisan() + '<div class="langit-isi">' +
        '<p class="alis">Udara Jambi</p>' +
        '<p class="kategori kategori-kosong" id="langit-kategori">Angka ISPU belum masuk</p>' +
        '<p class="langit-ket">Relawan memperbarui angka ISPU tiga kali sehari.</p></div></div>' +
        '<div class="tanah">' + htmlSkala(null) +
        '<p class="saran">Sambil menunggu, <a href="#/panduan/ispu">pelajari arti setiap angka ISPU</a> dan apa yang perlu dilakukan.</p>' +
        '</div></section>';
    }
    const u = udaraAktif(daftar);
    const nama = kategoriDari(u);
    const kat = KATEGORI[nama];
    return '<section class="langit kat-' + kat.kelas + ' muncul" id="langit" aria-labelledby="langit-judul">' +
      '<div class="langit-atas">' + htmlLukisan() + '<div class="langit-isi">' +
      '<p class="alis"><span class="titik-hidup" aria-hidden="true"></span><span id="langit-lokasi">Udara · ' + esc(u.lokasi) + '</span>' +
      '<span class="alis-waktu" id="langit-waktu">' + esc(relatif(u.waktu)) + '</span></p>' +
      '<p class="angka" id="langit-judul"><span class="angka-nilai" id="langit-angka" data-nilai="' + Number(u.ispu) + '">' +
      Number(u.ispu) + '</span><span class="angka-satuan">ISPU</span></p>' +
      '<p class="kategori" id="langit-kategori">' + esc(nama) + '</p></div></div>' +
      '<div class="tanah">' + htmlSkala(Number(u.ispu)) + '<p class="saran" id="langit-saran">' + htmlSaran(kat) + '</p>' +
      htmlPilihLokasi(daftar, u.lokasi) + '</div></section>';
  }

  function animasiAngka(el, dari, ke) {
    cancelAnimationFrame(el._raf);
    if (gerakDikurangi.matches || !isFinite(dari)) { el.textContent = ke; return; }
    const mulai = performance.now();
    const durasi = 1100;
    el.textContent = dari;
    const langkah = function (t) {
      const p = Math.min(1, (t - mulai) / durasi);
      el.textContent = Math.round(dari + (ke - dari) * (1 - Math.pow(1 - p, 4)));
      if (p < 1) el._raf = requestAnimationFrame(langkah);
    };
    el._raf = requestAnimationFrame(langkah);
  }

  function geserPenanda(pos) {
    const jalur = document.getElementById('skala-jalur');
    if (!jalur) return;
    // Dua frame supaya posisi awal 0 sempat tergambar dan transisinya berjalan.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { jalur.style.setProperty('--pos', pos); });
    });
  }

  function hidupkanLangit() {
    const angka = document.getElementById('langit-angka');
    if (!angka) return;
    animasiAngka(angka, 0, Number(angka.dataset.nilai));
    geserPenanda(document.getElementById('skala-jalur').dataset.pos);
    const aktif = document.querySelector('.lokasi-tombol[aria-pressed="true"]');
    if (aktif && aktif.scrollIntoView) aktif.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function gantiLokasi(nama) {
    const u = dataUdara().find(function (x) { return x.lokasi === nama; });
    const langit = document.getElementById('langit');
    if (!u || !langit) return;
    lokasiUdara = nama;
    simpan(KUNCI_LOKASI, nama);
    const namaKat = kategoriDari(u);
    const kat = KATEGORI[namaKat];
    langit.className = 'langit kat-' + kat.kelas;
    document.getElementById('langit-lokasi').textContent = 'Udara · ' + u.lokasi;
    document.getElementById('langit-waktu').textContent = relatif(u.waktu);
    document.getElementById('langit-kategori').textContent = namaKat;
    document.getElementById('langit-saran').innerHTML = htmlSaran(kat);
    const angka = document.getElementById('langit-angka');
    animasiAngka(angka, Number(angka.textContent), Number(u.ispu));
    angka.dataset.nilai = Number(u.ispu);
    const skala = langit.querySelector('.skala');
    skala.setAttribute('aria-label', 'Posisi ISPU ' + Number(u.ispu) + ' pada skala 0 sampai lebih dari 300');
    document.getElementById('skala-jalur').style.setProperty('--pos', posisiSkala(Number(u.ispu)).toFixed(4));
    langit.querySelectorAll('.lokasi-tombol').forEach(function (t) {
      t.setAttribute('aria-pressed', String(t.dataset.lokasi === nama));
    });
  }

  // ---------- beranda ----------

  function hitung(daftar, kolom, nilai) {
    return daftar.filter(function (e) { return e[kolom] === nilai; }).length;
  }

  function halamanBeranda() {
    const ruang = (data && data.ruang) || [];
    const oksigen = (data && data.oksigen) || [];
    const air = (data && data.air_bersih) || [];
    const kontak = (data && data.kontak_darurat) || [];

    const buka = hitung(ruang, 'status', 'BUKA');
    const penuh = hitung(ruang, 'status', 'PENUH');
    const ringkasRuang = ruang.length
      ? (buka ? '<b>' + buka + ' buka sekarang</b>' : 'Belum ada yang buka') + (penuh ? ' · ' + penuh + ' penuh' : '') + ' · ' + ruang.length + ' tempat'
      : 'Relawan sedang mendata tempat';

    const ubin = function (href, namaIkon, judul, ket, i) {
      return '<a class="ubin muncul" style="--i:' + i + '" href="' + href + '">' + ikon(namaIkon) +
        '<strong>' + judul + '</strong><span>' + ket + '</span></a>';
    };
    const ket = function (n, satuan) { return n ? n + ' ' + satuan : 'Belum ada data'; };

    const bahaya = '<div class="bahaya muncul" style="--i:5"><p class="bahaya-judul">' + ikon('bahaya') +
      'Segera ke IGD atau telepon 119 bila:</p><ul>' +
      window.TANDA_BAHAYA.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      '</ul><a href="#/panduan/ispa">Lihat semua tanda bahaya</a></div>';

    const panduan = window.PANDUAN.map(function (p) {
      return '<li><a href="#/panduan/' + p.slug + '"><span class="panduan-ikon">' + ikon(p.ikon) + '</span>' +
        '<span class="panduan-teks"><strong>' + esc(p.judul) + '</strong><span>' + esc(p.ringkas) + '</span></span>' +
        ikon('kanan', 'kanan') + '</a></li>';
    }).join('');

    const mitra = '<div class="mitra">' +
      '<p>Program Siaga Asap menghubungkan warga dengan ruang aman, oksigen, air bersih, dan informasi kesehatan selama musim asap 2026.</p>' +
      '<div class="mitra-kelompok"><p class="mitra-label">Penyelenggara</p>' +
      '<div class="plat plat-utama"><img src="/logo/ia-itb-jambi.webp" alt="Ikatan Alumni ITB Jambi" width="110" height="72" loading="lazy"></div></div>' +
      '<div class="mitra-kelompok"><p class="mitra-label">Mitra</p><div class="mitra-baris">' +
      '<div class="plat"><img src="/logo/jdm.webp" alt="Jambi Digital Movement" width="120" height="52" loading="lazy"></div>' +
      '<div class="plat"><img src="/logo/bakastra-hipmi-jambi.webp" alt="Bakastra, Badan Kajian Strategis BPD HIPMI Jambi" width="202" height="52" loading="lazy"></div>' +
      '</div></div></div>';

    return htmlLangit() +
      '<section class="bagian" aria-labelledby="h-bantuan"><h2 class="judul-bagian muncul" style="--i:1" id="h-bantuan">Cari bantuan</h2>' +
      '<a class="ubin-utama muncul" style="--i:1" href="#/ruang/terdekat"><span class="ubin-ikon">' + ikon('ruang-aman') + '</span>' +
      '<strong>Ruang Aman Asap</strong><span class="ubin-ringkas">' + ringkasRuang + '</span>' +
      '<span class="ubin-aksi">Cari yang terdekat dari saya' + ikon('kanan') + '</span></a>' +
      '<div class="ubin-baris">' +
      ubin('#/oksigen', 'oksigen', 'Oksigen', ket(oksigen.length, 'penyedia'), 2) +
      ubin('#/air-bersih', 'tetes', 'Air bersih', ket(air.length, 'penyedia'), 3) +
      ubin('#/kontak', 'sirene', 'Kontak darurat', (NOMOR_NASIONAL.length + kontak.length) + ' nomor penting', 4) +
      '</div>' + bahaya + '</section>' +
      '<section class="bagian muncul" style="--i:6" aria-labelledby="h-panduan"><h2 class="judul-bagian" id="h-panduan">Lindungi diri dan keluarga</h2>' +
      '<ul class="daftar-panduan">' + panduan + '</ul></section>' +
      '<section class="bagian muncul" style="--i:7" aria-labelledby="h-mitra"><h2 class="judul-bagian" id="h-mitra">Penyelenggara dan mitra</h2>' +
      mitra + '</section>';
  }

  // ---------- direktori ----------

  function kartuEntri(cfg, e, i) {
    const st = cfg.label && STATUS[e[cfg.label]];
    const adaJarak = typeof e._jarak === 'number';
    const atas = st || adaJarak ? '<div class="entri-atas">' +
      (st ? '<span class="status status-' + st[1] + '"><span class="status-titik" aria-hidden="true"></span>' + st[0] + '</span>' : '<span></span>') +
      (adaJarak ? '<span class="jarak">' + formatJarak(e._jarak) + '</span>' : '') + '</div>' : '';
    const sub = [e.jenis, [e.kecamatan, e.kabupaten].filter(Boolean).join(', ')].filter(Boolean).map(esc).join(' · ');

    const fakta = [];
    if (e.alamat) fakta.push(['pin', esc(e.alamat)]);
    if (e.jam_buka) fakta.push(['jam', 'Buka ' + esc(e.jam_buka)]);
    if (e.jam_layanan) fakta.push(['jam', 'Layanan ' + esc(e.jam_layanan)]);
    if (e.kapasitas) fakta.push(['orang', 'Kapasitas ' + esc(e.kapasitas) + ' orang']);
    if (e.harga) fakta.push(['dompet', esc(e.harga)]);
    if (e.wilayah_antar) fakta.push(['truk', 'Antar ke ' + esc(e.wilayah_antar)]);
    if (e.wilayah_layanan) fakta.push(['rute', 'Melayani ' + esc(e.wilayah_layanan)]);
    const htmlFakta = fakta.length ? '<ul class="fakta">' + fakta.map(function (f) {
      return '<li>' + ikon(f[0]) + '<span>' + f[1] + '</span></li>';
    }).join('') + '</ul>' : '';

    let pm25 = '';
    if (e.pm25_dalam !== null && e.pm25_dalam !== undefined && e.pm25_dalam !== '' && isFinite(Number(e.pm25_dalam))) {
      const v = Number(e.pm25_dalam);
      const lewat = v > 55;
      pm25 = '<div class="pm25' + (lewat ? ' pm25-lewat' : '') + '">' +
        '<div class="pm25-teks"><span>PM2.5 di dalam ruangan</span><b>' + v + ' µg/m³</b></div>' +
        '<div class="pm25-batang" role="img" aria-label="' + v + ' mikrogram per meter kubik, batas aman 55">' +
        '<span class="pm25-isi" style="--isi:' + Math.min(v / 110, 1).toFixed(3) + '"></span><span class="pm25-batas"></span></div>' +
        '<div class="pm25-teks pm25-catatan"><span>' + (lewat ? 'Di atas batas aman' : 'Memenuhi target udara bersih') + '</span><span>batas 55</span></div></div>';
    }

    const layanan = e.layanan ? '<ul class="chip-baris">' + String(e.layanan).split(',').map(function (s) {
      return '<li>' + esc(s.trim()) + '</li>';
    }).join('') + '</ul>' : '';

    const basi = e.cek_ulang_sebelum && Date.parse(e.cek_ulang_sebelum) < Date.now();
    const segar = e.terverifikasi_pada
      ? '<p class="segar' + (basi ? ' basi' : '') + '">' + ikon(basi ? 'bahaya' : 'centang') +
        (basi ? 'Perlu dicek ulang · terakhir dicek ' : 'Dicek relawan ') + esc(relatif(e.terverifikasi_pada)) + '</p>'
      : '';

    const aksi = [];
    if (typeof e.lat === 'number' && typeof e.lng === 'number') {
      aksi.push('<a class="tombol tombol-utama" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + e.lat + ',' + e.lng +
        '" target="_blank" rel="noopener">' + ikon('arah') + 'Petunjuk arah</a>');
    }
    const tel = e.telepon || e.kontak_publik;
    if (tel) aksi.push('<a class="tombol' + (cfg.tab === 'kontak_darurat' ? ' tombol-darurat-kecil' : '') + '" href="tel:' + esc(nomorTel(tel)) + '">' + ikon('telepon') + esc(tel) + '</a>');
    const wa = nomorWa(e.kontak_publik);
    if (wa) aksi.push('<a class="tombol" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' + ikon('pesan') + 'WhatsApp</a>');
    const lapor = tautanLapor(cfg, e.id);

    return '<article class="entri muncul" style="--i:' + Math.min(i, 8) + '">' + atas +
      '<h3>' + esc(e.nama) + '</h3>' + (sub ? '<p class="entri-sub">' + sub + '</p>' : '') +
      htmlFakta + pm25 + layanan + segar + (aksi.length ? '<div class="aksi">' + aksi.join('') + '</div>' : '') +
      (lapor ? '<a class="lapor" href="' + esc(lapor) + '" target="_blank" rel="noopener">' + ikon('bendera') + 'Laporkan data salah</a>' : '') +
      '</article>';
  }

  function ringkasDirektori(cfg, semua) {
    if (cfg.tab === 'kontak_darurat') {
      return NOMOR_NASIONAL.length + ' nomor darurat nasional' + (semua.length ? ' · ' + semua.length + ' faskes dan posko' : '');
    }
    if (!semua.length) return 'Belum ada data terverifikasi';
    let teks = semua.length + ' ' + cfg.satuan;
    if (cfg.tab === 'ruang') {
      const buka = hitung(semua, 'status', 'BUKA');
      if (buka) teks += ' · ' + buka + ' buka sekarang';
    }
    if (cfg.tab === 'oksigen') {
      const ada = semua.filter(function (e) { return e.stok === 'Tersedia' || e.stok === 'Terbatas'; }).length;
      if (ada) teks += ' · ' + ada + ' ada stok';
    }
    return teks;
  }

  function htmlNasional() {
    return '<div class="nasional">' + NOMOR_NASIONAL.map(function (n, i) {
      return '<a class="muncul" style="--i:' + i + '" href="tel:' + n.nomor + '"><span class="nasional-nomor">' + n.nomor + '</span>' +
        '<span><strong>' + esc(n.nama) + '</strong><span>' + esc(n.ket) + '</span></span>' + ikon('telepon') + '</a>';
    }).join('') + '</div>';
  }

  function halamanDirektori(kunci) {
    const cfg = DIREKTORI[kunci];
    let semua = (data && data[cfg.tab]) || [];
    if (cfg.tab === 'kontak_darurat') {
      const nasional = NOMOR_NASIONAL.map(function (n) { return n.nomor; });
      semua = semua.filter(function (e) { return nasional.indexOf(nomorTel(e.telepon)) === -1; });
    }

    const daftarKab = Array.from(new Set(semua.map(function (e) { return e.kabupaten; }).filter(Boolean))).sort();
    const kab = daftarKab.indexOf(filterKab) === -1 ? '' : filterKab;
    const daftarKec = Array.from(new Set(semua
      .filter(function (e) { return !kab || e.kabupaten === kab; })
      .map(function (e) { return e.kecamatan; }).filter(Boolean))).sort();
    const kec = daftarKec.indexOf(filterKec) === -1 ? '' : filterKec;

    const entri = semua.filter(function (e) {
      return (!kab || e.kabupaten === kab) && (!kec || e.kecamatan === kec);
    }).map(function (e) {
      const salin = Object.assign({}, e);
      if (posisi && cfg.terdekat && typeof e.lat === 'number' && typeof e.lng === 'number') salin._jarak = jarakKm(posisi, e);
      return salin;
    }).sort(function (a, b) {
      const sa = URUTAN_STATUS[a[cfg.label]] || 0;
      const sb = URUTAN_STATUS[b[cfg.label]] || 0;
      if (sa !== sb) return sa - sb;
      const ja = typeof a._jarak === 'number' ? a._jarak : Infinity;
      const jb = typeof b._jarak === 'number' ? b._jarak : Infinity;
      if (ja !== jb) return ja - jb;
      return String(a.nama).localeCompare(String(b.nama), 'id');
    });

    const opsi = function (daftar, pilih, label) {
      return '<option value="">' + label + '</option>' + daftar.map(function (v) {
        return '<option' + (v === pilih ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('');
    };

    const alat = semua.length ? '<div class="alat">' +
      '<div class="pilih"><select id="pilih-kab" aria-label="Kabupaten atau kota">' + opsi(daftarKab, kab, 'Semua kab/kota') + '</select>' + ikon('kanan') + '</div>' +
      (daftarKec.length > 1 ? '<div class="pilih"><select id="pilih-kec" aria-label="Kecamatan">' + opsi(daftarKec, kec, 'Semua kecamatan') + '</select>' + ikon('kanan') + '</div>' : '') +
      (cfg.terdekat ? '<button type="button" class="tombol-terdekat" id="tombol-terdekat" aria-pressed="' + Boolean(posisi) + '">' +
        '<span class="radar">' + ikon('lokasi') + '</span><span>' + (posisi ? 'Urut terdekat' : 'Terdekat') + '</span></button>' : '') +
      '</div>' : '';

    const kosong = cfg.kosong;
    const tautanKosong = kosong.tautan.indexOf('tel:') === 0
      ? '<a class="tombol tombol-darurat-kecil" href="' + kosong.tautan + '">' + ikon('telepon') + esc(kosong.label) + '</a>'
      : '<a class="tombol" href="' + kosong.tautan + '">' + esc(kosong.label) + ikon('kanan') + '</a>';
    const daftar = entri.length
      ? '<div class="daftar">' + entri.map(function (e, i) { return kartuEntri(cfg, e, i); }).join('') + '</div>'
      : '<div class="kosong muncul"><span class="kosong-ikon">' + ikon(cfg.ikon) + '</span>' +
        '<h2>' + (semua.length ? 'Tidak ada data untuk pilihan ini' : esc(kosong.judul)) + '</h2>' +
        '<p>' + (semua.length ? 'Coba pilih kabupaten atau kecamatan lain.' : esc(kosong.teks)) + '</p>' +
        (semua.length ? '' : tautanKosong) + '</div>';

    return '<div class="halaman-kepala muncul"><a class="tombol-ikon" href="#/" aria-label="Kembali ke beranda">' + ikon('kiri') + '</a>' +
      '<div><h1>' + esc(cfg.judul) + '</h1><p>' + esc(ringkasDirektori(cfg, semua)) + '</p></div></div>' +
      (cfg.tab === 'kontak_darurat' ? htmlNasional() + (semua.length ? '<h2 class="judul-bagian">Faskes dan posko</h2>' : '') : '') +
      alat + daftar;
  }

  // ---------- panduan ----------

  function halamanPanduan(slug) {
    const p = window.PANDUAN.find(function (x) { return x.slug === slug; });
    if (!p) return halamanTidakAda();
    return '<div class="halaman-kepala muncul"><a class="tombol-ikon" href="#/" aria-label="Kembali ke beranda">' + ikon('kiri') + '</a>' +
      '<div><h1>' + esc(p.judul) + '</h1><p>' + esc(p.ringkas) + '</p></div></div>' +
      '<article class="artikel muncul" style="--i:1">' + p.html + '</article>' +
      '<div class="artikel-kaki muncul" style="--i:2"><button type="button" class="tombol" data-bagikan="' + esc(p.judul) + '">' +
      ikon('bagikan') + 'Bagikan panduan ini</button></div>';
  }

  function halamanTidakAda() {
    return '<div class="kosong muncul"><h2>Halaman tidak ditemukan</h2><p>Tautan ini mungkin sudah berubah.</p>' +
      '<a class="tombol" href="#/">Kembali ke beranda' + ikon('kanan') + '</a></div>';
  }

  // ---------- data ----------

  async function muatData(paksa) {
    if (!paksa && data && Date.now() - diambilPada < SEGARKAN_MS) return false;
    let berubah = false;
    try {
      const res = await fetch('/api/data' + (DEMO ? '?contoh=1' : ''), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const teks = await res.text();
      berubah = teks !== teksData;
      teksData = teks;
      data = JSON.parse(teks);
      diambilPada = Date.now();
      dariSimpanan = false;
      if (!DEMO) simpan(KUNCI_SIMPAN, JSON.stringify({ data: data, diambil: diambilPada }));
    } catch (err) {
      if (!data) {
        try {
          const lama = JSON.parse(baca(KUNCI_SIMPAN));
          if (lama && lama.data) {
            data = lama.data;
            diambilPada = lama.diambil;
            berubah = true;
          }
        } catch (e) { /* simpanan rusak */ }
      }
      dariSimpanan = Boolean(data);
    }
    tampilkanPita();
    return berubah;
  }

  function tampilkanPita() {
    let html = '';
    if (dariSimpanan) {
      html = ikon('luring') + '<span>Tidak ada koneksi. Menampilkan data terakhir dari ' + esc(relatif(new Date(diambilPada).toISOString())) + '.</span>';
    } else if (data && data.contoh) {
      html = ikon('info') + '<span>Mode demo: semua tempat dan angka di bawah adalah data contoh.</span>';
    }
    pita.innerHTML = html;
    pita.hidden = !html;
  }

  // ---------- rute ----------

  function render() {
    const rute = location.hash.replace(/^#\/?/, '');
    const bagian = rute.split('/');
    const halaman = bagian[0];
    const ganti = rute !== ruteTerakhir;
    if (ganti && ruteTerakhir !== null && halaman !== (ruteTerakhir || '').split('/')[0]) filterKec = '';
    ruteTerakhir = rute;

    let html;
    if (!data) html = '<div class="kosong"><h2>Data belum bisa dimuat</h2><p>Periksa koneksi internet, lalu muat ulang halaman.</p></div>';
    else if (!rute) html = halamanBeranda();
    else if (DIREKTORI[halaman]) html = halamanDirektori(halaman);
    else if (halaman === 'panduan') html = halamanPanduan(bagian[1]);
    else html = halamanTidakAda();

    isi.innerHTML = html;
    if (ganti) {
      window.scrollTo(0, 0);
      isi.focus({ preventScroll: true });
    }
    hidupkanLangit();

    if (halaman === 'ruang' && bagian[1] === 'terdekat') {
      history.replaceState(null, '', '#/ruang');
      ruteTerakhir = 'ruang';
      if (!posisi) cariPosisi();
    }
  }

  function navigasi() {
    if (document.startViewTransition && !gerakDikurangi.matches && ruteTerakhir !== null) {
      document.startViewTransition(render);
    } else {
      render();
    }
  }

  function cariPosisi() {
    const tombol = document.getElementById('tombol-terdekat');
    if (!navigator.geolocation) {
      toast('HP ini tidak bisa membaca lokasi. Pilih kabupaten secara manual.');
      return;
    }
    if (tombol) {
      tombol.classList.add('mencari');
      tombol.lastChild.textContent = 'Mencari lokasi…';
    }
    navigator.geolocation.getCurrentPosition(function (p) {
      posisi = { lat: p.coords.latitude, lng: p.coords.longitude };
      filterKab = '';
      filterKec = '';
      render();
      toast('Diurutkan dari yang terdekat dengan Anda.');
    }, function (err) {
      render();
      toast(err && err.code === 1
        ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk web ini, atau pilih kabupaten secara manual.'
        : 'Lokasi tidak terbaca. Coba lagi di tempat terbuka, atau pilih kabupaten secara manual.');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }

  async function bagikan(judul) {
    const url = location.origin + '/' + location.hash;
    const teks = judul ? judul + ' · Lawan Kabut Asap Jambi' : 'Cek udara dan cari ruang aman asap terdekat di Jambi.';
    if (navigator.share) {
      try { await navigator.share({ title: 'Lawan Kabut Asap Jambi', text: teks, url: url }); } catch (e) { /* dibatalkan */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Tautan disalin. Tempel di WhatsApp untuk membagikan.');
    } catch (e) {
      toast('Salin tautan ini: ' + url);
    }
  }

  // ---------- peristiwa ----------

  isi.addEventListener('click', function (ev) {
    const lokasi = ev.target.closest('.lokasi-tombol');
    if (lokasi) { gantiLokasi(lokasi.dataset.lokasi); return; }
    if (ev.target.closest('#tombol-terdekat')) { cariPosisi(); return; }
    const bagi = ev.target.closest('[data-bagikan]');
    if (bagi) bagikan(bagi.dataset.bagikan);
  });

  isi.addEventListener('change', function (ev) {
    if (ev.target.id === 'pilih-kab') {
      filterKab = ev.target.value;
      filterKec = '';
      simpan(KUNCI_KABUPATEN, filterKab);
      render();
    } else if (ev.target.id === 'pilih-kec') {
      filterKec = ev.target.value;
      render();
    }
  });

  window.addEventListener('hashchange', navigasi);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    muatData(false).then(function (berubah) { if (berubah) render(); });
  });

  setInterval(function () {
    if (document.visibilityState === 'visible') muatData(true).then(function (berubah) { if (berubah) render(); });
  }, SEGARKAN_MS);

  const tombolBagikan = document.getElementById('tombol-bagikan');
  tombolBagikan.innerHTML = ikon('bagikan');
  tombolBagikan.addEventListener('click', function () { bagikan(''); });

  document.getElementById('tel-112').insertAdjacentHTML('afterbegin', ikon('telepon'));
  document.getElementById('tel-119').insertAdjacentHTML('afterbegin', ikon('ambulans'));

  let tundaPasang = null;
  const tombolPasang = document.getElementById('tombol-pasang');
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    tundaPasang = ev;
    tombolPasang.hidden = false;
  });
  tombolPasang.addEventListener('click', async function () {
    if (!tundaPasang) return;
    tundaPasang.prompt();
    await tundaPasang.userChoice;
    tundaPasang = null;
    tombolPasang.hidden = true;
  });

  muatData(true).then(render);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () { /* PWA opsional */ });
  }
})();
