// Web app Lawan Kabut Asap: satu halaman, rute lewat hash, data dari /api/data.
(function () {
  'use strict';

  const KUNCI_SIMPAN = 'lka:data';
  const KUNCI_KABUPATEN = 'lka:kabupaten';
  const SEGARKAN_MS = 5 * 60 * 1000;

  // `judulLapor` harus sama dengan SKEMA[tab].judul di apps-script/Skema.gs (pilihan "Bagian" di Form lapor).
  const DIREKTORI = {
    ruang: { tab: 'ruang', judul: 'Ruang Aman Asap', judulLapor: 'Ruang Aman Asap', ikon: '🏠',
      ket: 'Tempat berudara bersih', label: 'status', terdekat: true },
    oksigen: { tab: 'oksigen', judul: 'Oksigen', judulLapor: 'Penyedia Oksigen', ikon: '🫁',
      ket: 'Isi ulang, sewa, konsentrator', label: 'stok', terdekat: true },
    'air-bersih': { tab: 'air_bersih', judul: 'Air Bersih', judulLapor: 'Penyedia Air Bersih', ikon: '💧',
      ket: 'Depot, tangki, PDAM' },
    kontak: { tab: 'kontak_darurat', judul: 'Kontak Darurat', judulLapor: 'Kontak Darurat', ikon: '☎️',
      ket: 'Faskes dan nomor penting' },
  };

  const WARNA_ISPU = {
    'Baik': 'var(--ispu-baik)',
    'Sedang': 'var(--ispu-sedang)',
    'Tidak Sehat': 'var(--ispu-tidak-sehat)',
    'Sangat Tidak Sehat': 'var(--ispu-sangat)',
    'Berbahaya': 'var(--ispu-bahaya)',
  };
  const SARAN_ISPU = {
    'Baik': 'Udara baik. Aktivitas normal.',
    'Sedang': 'Kelompok sensitif kurangi aktivitas berat di luar.',
    'Tidak Sehat': 'Kurangi aktivitas di luar. Pakai masker N95/KN95 bila keluar.',
    'Sangat Tidak Sehat': 'Hindari aktivitas di luar. Tutup pintu dan jendela, gunakan ruang bersih.',
    'Berbahaya': 'Tetap di ruang bersih. Kelompok rentan pertimbangkan pindah ke Ruang Aman Asap.',
  };
  const URUTAN_STATUS = { BUKA: 0, PENUH: 1, TUTUP: 2 };

  const isi = document.getElementById('isi');
  const pita = document.getElementById('pita');

  let data = null;
  let diambilPada = 0;
  let dariSimpanan = false;
  let posisi = null; // {lat, lng} setelah warga menekan "Terdekat"

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

  // ---------- data ----------

  async function muatData(paksa) {
    if (!paksa && data && Date.now() - diambilPada < SEGARKAN_MS) return;
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
      diambilPada = Date.now();
      dariSimpanan = false;
      simpan(KUNCI_SIMPAN, JSON.stringify({ data: data, diambil: diambilPada }));
    } catch (err) {
      const lama = baca(KUNCI_SIMPAN);
      if (lama && !data) {
        const o = JSON.parse(lama);
        data = o.data;
        diambilPada = o.diambil;
      }
      dariSimpanan = Boolean(data);
    }
    tampilkanPita();
  }

  function tampilkanPita() {
    const pesan = [];
    if (data && data.contoh) pesan.push('<strong>Data contoh untuk demo</strong>: bukan data sebenarnya.');
    if (dariSimpanan) pesan.push('Tidak ada koneksi. Menampilkan data terakhir (' + esc(relatif(new Date(diambilPada).toISOString())) + ').');
    pita.innerHTML = pesan.join(' ');
    pita.hidden = pesan.length === 0;
  }

  // ---------- tampilan ----------

  function halamanBeranda() {
    const udara = (data && data.udara) || [];
    const kartuUdara = udara.length
      ? udara.map(function (u) {
        return '<div class="udara-kartu" style="--warna-ispu:' + (WARNA_ISPU[u.kategori] || 'var(--garis)') + '">' +
          '<div class="udara-angka">' + esc(u.ispu) + '</div>' +
          '<div><strong>' + esc(u.lokasi) + ' · ' + esc(u.kategori) + '</strong>' +
          '<small>ISPU · diperbarui ' + esc(relatif(u.waktu)) + '</small>' +
          '<p class="saran">' + esc(SARAN_ISPU[u.kategori] || '') + '</p></div></div>';
      }).join('')
      : '<p class="kosong">Data ISPU belum tersedia.</p>';

    const menu = Object.keys(DIREKTORI).map(function (k) {
      const c = DIREKTORI[k];
      const n = data && data[c.tab] ? data[c.tab].length : 0;
      return '<a href="#/' + k + '"><span class="ikon" aria-hidden="true">' + c.ikon + '</span>' +
        esc(c.judul) + '<small>' + esc(c.ket) + (n ? ' · ' + n + ' data' : '') + '</small></a>';
    }).join('');

    const panduan = window.PANDUAN.map(function (p) {
      return '<li><a href="#/panduan/' + p.slug + '">' + esc(p.judul) + '</a></li>';
    }).join('');

    return '<h1>Kualitas udara</h1><div class="udara">' + kartuUdara + '</div>' +
      '<nav class="menu" aria-label="Layanan">' + menu + '</nav>' +
      '<h2>Panduan</h2><ul class="daftar-panduan">' + panduan + '</ul>';
  }

  function kartuEntri(cfg, e) {
    const label = cfg.label && e[cfg.label]
      ? '<span class="label label-' + esc(e[cfg.label]) + '">' + esc(e[cfg.label]) + '</span>' : '';
    const lokasi = [e.jenis, e.kecamatan, e.kabupaten].filter(Boolean).map(esc).join(' · ');
    const baris = [];
    if (e.alamat) baris.push('📍 ' + esc(e.alamat));
    if (e.jam_buka) baris.push('🕒 ' + esc(e.jam_buka));
    if (e.jam_layanan) baris.push('🕒 ' + esc(e.jam_layanan));
    if (e.kapasitas) baris.push('👥 Kapasitas ' + esc(e.kapasitas) + ' orang');
    if (e.pm25_dalam !== null && e.pm25_dalam !== undefined && e.pm25_dalam !== '') {
      baris.push('🌬️ PM2.5 di dalam: ' + esc(e.pm25_dalam) + ' µg/m³' + (Number(e.pm25_dalam) <= 55 ? ' (memenuhi target)' : ' (di atas target 55)'));
    }
    if (e.harga) baris.push('💰 ' + esc(e.harga));
    if (e.wilayah_antar) baris.push('🚚 Antar: ' + esc(e.wilayah_antar));
    if (e.wilayah_layanan) baris.push('🗺️ Layanan: ' + esc(e.wilayah_layanan));
    if (typeof e._jarak === 'number') baris.push('📏 ± ' + e._jarak.toFixed(1) + ' km dari Anda');

    const layanan = e.layanan
      ? '<div class="chip-baris">' + String(e.layanan).split(',').map(function (s) {
        return '<span class="chip">' + esc(s.trim()) + '</span>';
      }).join('') + '</div>' : '';

    const basi = e.cek_ulang_sebelum && Date.parse(e.cek_ulang_sebelum) < Date.now();
    const segar = e.terverifikasi_pada
      ? '<div class="segar' + (basi ? ' basi' : '') + '">' + (basi ? '⚠️ Perlu dicek ulang · ' : '✓ ') +
        'Dicek relawan ' + esc(relatif(e.terverifikasi_pada)) + '</div>' : '';

    const aksi = [];
    if (typeof e.lat === 'number' && typeof e.lng === 'number') {
      aksi.push('<a class="utama" href="https://www.google.com/maps/dir/?api=1&destination=' + e.lat + ',' + e.lng +
        '" target="_blank" rel="noopener">Petunjuk arah</a>');
    }
    const tel = e.telepon || e.kontak_publik;
    if (tel) aksi.push('<a href="tel:' + esc(nomorTel(tel)) + '">Telepon ' + esc(tel) + '</a>');
    const wa = nomorWa(e.kontak_publik);
    if (wa) aksi.push('<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>');
    const lapor = tautanLapor(cfg, e.id);
    if (lapor) aksi.push('<a class="lapor" href="' + esc(lapor) + '" target="_blank" rel="noopener">Laporkan data salah</a>');

    return '<article class="entri"><div class="entri-kepala"><h3>' + esc(e.nama) + '</h3>' + label + '</div>' +
      '<div class="meta">' + lokasi + '</div>' + baris.map(function (b) { return '<p>' + b + '</p>'; }).join('') +
      layanan + segar + (aksi.length ? '<div class="aksi">' + aksi.join('') + '</div>' : '') + '</article>';
  }

  function halamanDirektori(kunci, kab, kec) {
    const cfg = DIREKTORI[kunci];
    const semua = (data && data[cfg.tab]) || [];
    const daftarKab = Array.from(new Set(semua.map(function (e) { return e.kabupaten; }).filter(Boolean))).sort();
    if (kab && daftarKab.indexOf(kab) === -1) kab = '';
    const daftarKec = Array.from(new Set(semua
      .filter(function (e) { return !kab || e.kabupaten === kab; })
      .map(function (e) { return e.kecamatan; }).filter(Boolean))).sort();
    if (kec && daftarKec.indexOf(kec) === -1) kec = '';

    let entri = semua.filter(function (e) {
      return (!kab || e.kabupaten === kab) && (!kec || e.kecamatan === kec);
    }).map(function (e) {
      const salin = Object.assign({}, e);
      if (posisi && cfg.terdekat && typeof e.lat === 'number' && typeof e.lng === 'number') {
        salin._jarak = jarakKm(posisi, e);
      }
      return salin;
    });

    entri.sort(function (a, b) {
      const sa = URUTAN_STATUS[a.status] || 0;
      const sb = URUTAN_STATUS[b.status] || 0;
      if (sa !== sb) return sa - sb;
      const ja = typeof a._jarak === 'number' ? a._jarak : Infinity;
      const jb = typeof b._jarak === 'number' ? b._jarak : Infinity;
      if (ja !== jb) return ja - jb;
      return String(a.nama).localeCompare(String(b.nama), 'id');
    });

    const opsi = function (daftar, pilih, semuaLabel) {
      return '<option value="">' + semuaLabel + '</option>' + daftar.map(function (v) {
        return '<option' + (v === pilih ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('');
    };

    const filter = '<div class="filter">' +
      '<select id="pilih-kab" aria-label="Kabupaten/kota">' + opsi(daftarKab, kab, 'Semua kabupaten/kota') + '</select>' +
      (daftarKec.length ? '<select id="pilih-kec" aria-label="Kecamatan">' + opsi(daftarKec, kec, 'Semua kecamatan') + '</select>' : '') +
      (cfg.terdekat ? '<button id="tombol-terdekat" class="' + (posisi ? 'aktif' : '') + '">📍 ' + (posisi ? 'Urut terdekat' : 'Terdekat dari saya') + '</button>' : '') +
      '</div>';

    const daftar = entri.length
      ? entri.map(function (e) { return kartuEntri(cfg, e); }).join('')
      : '<p class="kosong">Belum ada data' + (kab ? ' untuk ' + esc(kab) : '') + '. Relawan sedang mengumpulkan dan memverifikasi data.</p>';

    return '<a class="kembali" href="#/">‹ Beranda</a><h1>' + cfg.ikon + ' ' + esc(cfg.judul) + '</h1>' + filter + daftar;
  }

  function halamanPanduan(slug) {
    const p = window.PANDUAN.find(function (x) { return x.slug === slug; });
    if (!p) return halamanTidakAda();
    return '<a class="kembali" href="#/">‹ Beranda</a><h1>' + esc(p.judul) + '</h1>' +
      '<div class="artikel">' + p.html + '</div>';
  }

  function halamanTidakAda() {
    return '<h1>Halaman tidak ditemukan</h1><p><a href="#/">Kembali ke beranda</a></p>';
  }

  // ---------- rute ----------

  let filterKab = baca(KUNCI_KABUPATEN) || '';
  let filterKec = '';
  let ruteTerakhir = '';

  function render() {
    const rute = location.hash.replace(/^#\/?/, '');
    const bagian = rute.split('/');
    if (rute !== ruteTerakhir) {
      ruteTerakhir = rute;
      filterKec = '';
      window.scrollTo(0, 0);
    }
    let html;
    if (!rute) html = halamanBeranda();
    else if (DIREKTORI[bagian[0]]) html = halamanDirektori(bagian[0], filterKab, filterKec);
    else if (bagian[0] === 'panduan') html = halamanPanduan(bagian[1]);
    else html = halamanTidakAda();
    isi.innerHTML = html;
    pasangKontrol();
  }

  function pasangKontrol() {
    const kab = document.getElementById('pilih-kab');
    if (kab) kab.addEventListener('change', function () {
      filterKab = kab.value;
      filterKec = '';
      simpan(KUNCI_KABUPATEN, filterKab);
      render();
    });
    const kec = document.getElementById('pilih-kec');
    if (kec) kec.addEventListener('change', function () { filterKec = kec.value; render(); });
    const tombol = document.getElementById('tombol-terdekat');
    if (tombol) tombol.addEventListener('click', cariPosisi);
  }

  function cariPosisi() {
    if (!navigator.geolocation) {
      alert('Perangkat ini tidak mendukung lokasi. Pilih kabupaten dan kecamatan secara manual.');
      return;
    }
    const tombol = document.getElementById('tombol-terdekat');
    if (tombol) tombol.textContent = '📍 Mencari lokasi…';
    navigator.geolocation.getCurrentPosition(function (p) {
      posisi = { lat: p.coords.latitude, lng: p.coords.longitude };
      filterKab = '';
      filterKec = '';
      render();
    }, function () {
      alert('Lokasi tidak bisa dibaca. Pastikan izin lokasi aktif, atau pilih kabupaten dan kecamatan secara manual.');
      render();
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') muatData(false).then(render);
  });

  muatData(true).then(function () {
    if (!data) {
      isi.innerHTML = '<p class="kosong">Data belum bisa dimuat. Periksa koneksi lalu muat ulang halaman.</p>';
      return;
    }
    render();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () { /* PWA opsional */ });
  }
})();
