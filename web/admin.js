// Dasbor admin Lawan Kabut Asap. Data lewat /api/admin/* (Worker → Apps Script), masuk dengan Google.
// Semua isi dari Sheet ditulis lewat textContent, tidak pernah sebagai HTML.
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const ZONA = 'Asia/Jakarta';
  const BAGIAN = ['antrean', 'cek-ulang', 'relawan', 'statistik', 'riwayat'];
  // Kolom yang tidak ditampilkan di rincian (sudah di judul/chip, atau koordinat mentah).
  const SEMBUNYI = ['_tab', '_baris', 'id', 'kode', 'nama', 'judul', 'jenis', 'kabupaten', 'tampil', 'lat', 'lng',
    'diubah_pada', 'terverifikasi_pada', 'cek_ulang_sebelum', 'catatan_internal', 'waktu', 'status'];
  const PRIVAT = ['pengelola_wa', 'kontak_pengirim', 'terverifikasi_oleh', 'wa'];
  const WARNA_STATUS = { Baru: 'jingga', 'Sudah dihubungi': 'kuning', Aktif: 'hijau', 'Tidak aktif': '' };

  let data = null;
  let email = '';

  // ---------- Bantuan ----------

  function el(tag, atribut, ...anak) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atribut || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'kelas') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const a of anak.flat()) {
      if (a === null || a === undefined || a === false) continue;
      e.append(a instanceof Node ? a : String(a));
    }
    return e;
  }

  function waktu(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return '';
    return d.toLocaleString('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }

  function relatif(iso) {
    const d = Date.parse(iso);
    if (!iso || isNaN(d)) return '';
    const menit = Math.round((Date.now() - d) / 60000);
    if (menit < 1) return 'baru saja';
    if (menit < 60) return `${menit} menit lalu`;
    if (menit < 48 * 60) return `${Math.round(menit / 60)} jam lalu`;
    return `${Math.round(menit / 1440)} hari lalu`;
  }

  const LABEL = { wa: 'WhatsApp', pengelola_wa: 'WA pengelola', kontak_publik: 'Kontak', pm25_dalam: 'PM2.5 di dalam' };

  function label(k) {
    if (LABEL[k]) return LABEL[k];
    const s = k.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function urlAman(v) {
    try {
      const u = new URL(String(v));
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
    } catch {
      return null;
    }
  }

  function nomorWa(v) {
    let s = String(v || '').replace(/\D/g, '');
    if (s.startsWith('0')) s = '62' + s.slice(1);
    else if (s.startsWith('8')) s = '62' + s;
    return s;
  }

  function kabar(teks) {
    const k = $('kabar');
    k.textContent = teks;
    k.hidden = false;
    clearTimeout(kabar.t);
    kabar.t = setTimeout(() => { k.hidden = true; }, 3500);
  }

  async function api(jalur, opsi = {}) {
    const res = await fetch('/api/admin/' + jalur, {
      credentials: 'same-origin',
      ...opsi,
      headers: opsi.body ? { 'Content-Type': 'application/json' } : {},
    });
    let isi = {};
    try { isi = await res.json(); } catch { /* bukan JSON */ }
    if (!res.ok || isi.ok === false) {
      const galat = new Error(isi.galat || `HTTP ${res.status}`);
      galat.status = res.status;
      throw galat;
    }
    return isi;
  }

  // ---------- Masuk dan keluar ----------

  function tampilkanGalatMasuk(teks) {
    const p = $('galat-masuk');
    p.textContent = teks;
    p.hidden = !teks;
  }

  async function layarMasuk() {
    $('memuat').hidden = true;
    $('dasbor').hidden = true;
    $('akun').hidden = true;
    $('layar-masuk').hidden = false;
    let konfig;
    try {
      konfig = await api('konfig');
    } catch (e) {
      tampilkanGalatMasuk('Tidak bisa menghubungi server: ' + e.message);
      return;
    }
    if (!konfig.siap) {
      tampilkanGalatMasuk('Login admin belum dikonfigurasi (client ID Google belum diisi).');
      return;
    }
    // Pustaka Google dimuat async; tunggu sampai siap.
    let coba = 0;
    (function tunggu() {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: konfig.client_id,
          callback: saatMasuk,
          login_hint: 'hello.iaitbjambi@gmail.com',
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton($('tombol-google'), {
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'filled_black' : 'outline',
          size: 'large', text: 'signin_with', shape: 'pill', locale: 'id',
        });
        return;
      }
      if (++coba > 100) tampilkanGalatMasuk('Tombol Google tidak termuat. Periksa koneksi atau pemblokir iklan.');
      else setTimeout(tunggu, 100);
    })();
  }

  async function saatMasuk(jawaban) {
    tampilkanGalatMasuk('');
    try {
      const hasil = await api('masuk', { method: 'POST', body: JSON.stringify({ credential: jawaban.credential }) });
      mulaiDasbor(hasil.email);
    } catch (e) {
      tampilkanGalatMasuk(e.message);
    }
  }

  $('keluar').addEventListener('click', async () => {
    try { await api('keluar', { method: 'POST' }); } catch { /* tetap keluar di tampilan */ }
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    location.reload();
  });

  // ---------- Dasbor ----------

  function mulaiDasbor(e) {
    email = e;
    $('email').textContent = e;
    $('akun').hidden = false;
    $('layar-masuk').hidden = true;
    muatData();
  }

  async function muatData({ diam = false } = {}) {
    if (!diam) {
      $('memuat').hidden = false;
      $('memuat').textContent = 'Memuat data dari Google Sheet…';
    }
    try {
      data = await api('data');
    } catch (e) {
      if (e.status === 401) return layarMasuk();
      $('memuat').hidden = false;
      $('memuat').textContent = 'Gagal memuat data: ' + e.message;
      return;
    }
    $('memuat').hidden = true;
    $('dasbor').hidden = false;
    gambar();
  }

  function bagianAktif() {
    const h = location.hash.slice(1);
    return BAGIAN.includes(h) ? h : 'antrean';
  }

  function judulTab(tab) {
    return (data.tab[tab] && data.tab[tab].judul) || tab;
  }

  function gambar() {
    const relawanBaru = data.relawan.filter((r) => r.status === 'Baru' || !r.status).length;
    const tayang = Object.values(data.statistik.tab).reduce((n, s) => n + s.tayang, 0);
    $('n-antrean').textContent = data.antrean.length;
    $('n-cek').textContent = data.cek_ulang.length;
    $('n-relawan').textContent = relawanBaru;
    $('n-tayang').textContent = tayang;
    $('n-antrean').parentElement.classList.toggle('perlu', data.antrean.length > 0);
    $('n-cek').parentElement.classList.toggle('perlu', data.cek_ulang.length > 0);
    $('n-relawan').parentElement.classList.toggle('perlu', relawanBaru > 0);

    const sinkron = $('sinkron');
    sinkron.replaceChildren(
      `Web publik terakhir diperbarui ${relatif(data.web.disimpan_pada) || 'belum pernah'}. Dasbor dimuat ${waktu(data.dibuat)}. `,
      data.sheet_url ? el('a', { href: data.sheet_url, target: '_blank', rel: 'noopener' }, 'Buka Google Sheet') : '',
    );

    const aktif = bagianAktif();
    document.querySelectorAll('.tab a').forEach((a) => {
      if (a.dataset.tab === aktif) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    aturSaring(aktif);
    const panel = $('panel');
    panel.replaceChildren(...({
      antrean: panelEntri,
      'cek-ulang': panelEntri,
      relawan: panelRelawan,
      statistik: panelStatistik,
      riwayat: panelRiwayat,
    })[aktif](aktif));
  }

  function aturSaring(aktif) {
    const pilih = $('saring-tab');
    const lama = pilih.dataset.bagian === aktif ? pilih.value : '';
    let opsi = [];
    if (aktif === 'antrean' || aktif === 'cek-ulang') {
      opsi = Object.keys(data.tab).filter((t) => t !== 'relawan').map((t) => [t, judulTab(t)]);
      pilih.previousSibling.textContent = 'Kategori ';
    } else if (aktif === 'relawan') {
      opsi = (data.tab.relawan.pilihan_status || []).map((s) => [s, s]);
      pilih.previousSibling.textContent = 'Status ';
    }
    pilih.parentElement.hidden = !opsi.length;
    pilih.replaceChildren(el('option', { value: '' }, 'Semua'), ...opsi.map(([v, t]) => el('option', { value: v }, t)));
    pilih.value = opsi.some(([v]) => v === lama) ? lama : '';
    pilih.dataset.bagian = aktif;
  }

  function tautanSheet(o) {
    const t = data.tab[o._tab];
    if (!data.sheet_url || !t || t.gid === null) return null;
    return `${data.sheet_url}#gid=${t.gid}&range=A${o._baris}`;
  }

  function nilaiRincian(k, v) {
    const url = urlAman(v);
    if (url && /^https?:/i.test(String(v))) return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, String(v));
    if ((k === 'wa' || k === 'pengelola_wa' || k === 'kontak_pengirim') && nomorWa(v).length >= 10) {
      return el('a', { href: `https://wa.me/${nomorWa(v)}`, target: '_blank', rel: 'noopener' }, String(v));
    }
    if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
    if (/^\d{4}-\d\d-\d\dT/.test(String(v))) return waktu(v);
    return String(v);
  }

  function rincian(o) {
    const dl = el('dl', { kelas: 'rincian' });
    for (const [k, v] of Object.entries(o)) {
      if (SEMBUNYI.includes(k) || v === null || v === '') continue;
      const kelas = PRIVAT.includes(k) ? 'privat' : null;
      const baris = el('div', { kelas, style: 'display:contents' }, el('dt', {}, label(k)), el('dd', {}, nilaiRincian(k, v)));
      dl.append(baris);
    }
    if (o.lat !== null && o.lat !== undefined && o.lng !== null && o.lng !== undefined) {
      dl.append(el('dt', {}, 'Lokasi'), el('dd', {}, el('a', {
        href: `https://www.google.com/maps?q=${Number(o.lat)},${Number(o.lng)}`, target: '_blank', rel: 'noopener',
      }, `${o.lat}, ${o.lng}`)));
    }
    return dl;
  }

  function kotakCatatan(o) {
    const isian = el('textarea', { 'aria-label': 'Catatan internal', maxlength: '1000' });
    isian.value = o.catatan_internal || '';
    const simpan = el('button', { type: 'button', kelas: 'tombol kecil' }, 'Simpan catatan');
    simpan.addEventListener('click', () => kirimAksi(o, 'catatan', isian.value, simpan));
    return el('details', { kelas: 'catatan', open: Boolean(o.catatan_internal) },
      el('summary', {}, o.catatan_internal ? 'Catatan internal' : 'Tambah catatan internal'), isian, simpan);
  }

  function tombolAksi(o, teks, ubah, kelas) {
    const b = el('button', { type: 'button', kelas: `tombol ${kelas || ''}` }, teks);
    b.addEventListener('click', () => kirimAksi(o, ubah, '', b));
    return b;
  }

  function kartuEntri(o, bagian) {
    const lewat = bagian === 'cek-ulang';
    const sheet = tautanSheet(o);
    return el('article', { kelas: 'kartu entri', 'data-id': `${o._tab}:${o.id}` },
      el('div', { kelas: 'entri-kepala' },
        el('h3', {}, o.nama || o.judul || o.id),
        el('span', { kelas: 'chip' }, o.id)),
      el('div', { kelas: 'meta' },
        el('span', { kelas: 'chip nila' }, judulTab(o._tab)),
        o.jenis ? el('span', { kelas: 'chip' }, o.jenis) : null,
        o.kabupaten ? el('span', { kelas: 'chip' }, o.kabupaten) : null,
        o.status ? el('span', { kelas: 'chip' }, o.status) : null,
        lewat
          ? el('span', { kelas: 'chip merah' }, `Cek ulang lewat ${relatif(o.cek_ulang_sebelum)}`)
          : el('span', { kelas: 'chip jingga' }, `Belum tayang${o.diubah_pada ? ' · diubah ' + relatif(o.diubah_pada) : ''}`),
        o.terverifikasi_pada ? el('span', { kelas: 'chip' }, `Dicek ${waktu(o.terverifikasi_pada)}`) : null),
      rincian(o),
      kotakCatatan(o),
      el('div', { kelas: 'aksi' },
        lewat ? tombolAksi(o, 'Sudah dicek, masih benar', 'sudah_dicek', 'utama') : tombolAksi(o, 'Tampilkan di web', 'tampilkan', 'utama'),
        lewat ? tombolAksi(o, 'Sembunyikan', 'sembunyikan', 'bahaya') : null,
        sheet ? el('a', { kelas: 'dorong', href: sheet, target: '_blank', rel: 'noopener' }, 'Buka di Sheet') : null));
  }

  function panelEntri(bagian) {
    const saring = $('saring-tab').value;
    const daftar = (bagian === 'antrean' ? data.antrean : data.cek_ulang).filter((o) => !saring || o._tab === saring);
    if (!daftar.length) {
      return [el('p', { kelas: 'kosong' }, bagian === 'antrean'
        ? 'Tidak ada kiriman yang menunggu dicek.'
        : 'Semua entri tayang masih dalam masa berlaku.')];
    }
    const pengantar = bagian === 'antrean'
      ? 'Kiriman warga dan relawan yang belum tayang. Cek sumbernya (telepon atau datangi), lalu tampilkan.'
      : 'Entri tayang yang sudah melewati batas cek ulang. Pastikan masih benar, atau sembunyikan.';
    return [el('p', { kelas: 'sinkron' }, pengantar), ...daftar.map((o) => kartuEntri(o, bagian))];
  }

  function kartuRelawan(r) {
    const pilih = el('select', { 'aria-label': `Status ${r.nama || r.id}` },
      ...(data.tab.relawan.pilihan_status || []).map((s) => el('option', { value: s }, s)));
    pilih.value = r.status || 'Baru';
    pilih.addEventListener('change', () => kirimAksi(r, 'status', pilih.value, pilih));
    const wa = nomorWa(r.wa);
    const sapa = `Halo ${r.nama || ''}, terima kasih sudah mendaftar relawan Program Siaga Asap IA-ITB Jambi.`;
    return el('article', { kelas: 'kartu entri', 'data-id': `relawan:${r.id}` },
      el('div', { kelas: 'entri-kepala' },
        el('h3', {}, r.nama || r.id),
        el('span', { kelas: 'chip' }, r.id)),
      el('div', { kelas: 'meta' },
        el('span', { kelas: `chip ${WARNA_STATUS[r.status || 'Baru'] || ''}` }, r.status || 'Baru'),
        r.kabupaten ? el('span', { kelas: 'chip' }, r.kabupaten) : null,
        r.waktu ? el('span', { kelas: 'chip' }, `Daftar ${waktu(r.waktu)}`) : null),
      rincian(r),
      kotakCatatan(r),
      el('div', { kelas: 'aksi' },
        el('label', { kelas: 'saring' }, 'Status ', pilih),
        wa.length >= 10 ? el('a', {
          kelas: 'tombol utama', href: `https://wa.me/${wa}?text=${encodeURIComponent(sapa)}`, target: '_blank', rel: 'noopener',
          style: 'text-decoration:none',
        }, 'Hubungi lewat WhatsApp') : null,
        tautanSheet(r) ? el('a', { kelas: 'dorong', href: tautanSheet(r), target: '_blank', rel: 'noopener' }, 'Buka di Sheet') : null));
  }

  function panelRelawan() {
    const saring = $('saring-tab').value;
    const daftar = data.relawan.filter((r) => !saring || (r.status || 'Baru') === saring);
    if (!daftar.length) return [el('p', { kelas: 'kosong' }, 'Belum ada pendaftar relawan.')];
    return daftar.map(kartuRelawan);
  }

  function panelStatistik() {
    const baris = Object.entries(data.statistik.tab);
    const total = baris.reduce((t, [, s]) => ({
      tayang: t.tayang + s.tayang, antrean: t.antrean + s.antrean, cek_ulang: t.cek_ulang + s.cek_ulang,
    }), { tayang: 0, antrean: 0, cek_ulang: 0 });
    const tabel = el('div', { kelas: 'tabel-bungkus' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Kategori'), el('th', { kelas: 'n' }, 'Tayang'), el('th', { kelas: 'n' }, 'Menunggu'), el('th', { kelas: 'n' }, 'Cek ulang'))),
      el('tbody', {}, ...baris.map(([t, s]) => el('tr', {},
        el('td', {}, judulTab(t)), el('td', { kelas: 'n' }, s.tayang), el('td', { kelas: 'n' }, s.antrean), el('td', { kelas: 'n' }, s.cek_ulang)))),
      el('tfoot', {}, el('tr', {}, el('th', {}, 'Jumlah'),
        el('th', { kelas: 'n' }, total.tayang), el('th', { kelas: 'n' }, total.antrean), el('th', { kelas: 'n' }, total.cek_ulang)))));

    const kab = Object.entries(data.statistik.kabupaten).sort((a, b) => b[1] - a[1]);
    const maks = kab.length ? kab[0][1] : 1;
    const tabelKab = el('div', { kelas: 'tabel-bungkus' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Kabupaten/kota'), el('th', { kelas: 'n' }, 'Entri tayang'), el('th', { style: 'width:40%' }, ''))),
      el('tbody', {}, ...kab.map(([k, n]) => el('tr', {},
        el('td', {}, k), el('td', { kelas: 'n' }, n),
        el('td', {}, el('div', { kelas: 'batang', style: `width:${Math.round((n / maks) * 100)}%` })))))));

    const udara = el('div', { kelas: 'tabel-bungkus' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Lokasi'), el('th', { kelas: 'n' }, 'ISPU'), el('th', {}, 'Kategori'), el('th', {}, 'Waktu'), el('th', {}, 'Sumber'))),
      el('tbody', {}, ...data.web.udara.map((u) => el('tr', {},
        el('td', {}, u.lokasi), el('td', { kelas: 'n' }, u.ispu), el('td', {}, u.kategori || ''),
        el('td', {}, waktu(u.waktu)), el('td', {}, u.sumber || ''))))));

    const form = Object.entries(data.web.form_url || {});
    const daftarForm = form.length
      ? el('ul', {}, ...form.map(([t, u]) => el('li', {},
        urlAman(u) ? el('a', { href: urlAman(u), target: '_blank', rel: 'noopener' }, judulTab(t) === t ? label(t) : judulTab(t)) : t)))
      : el('p', { kelas: 'sinkron' }, 'Tautan formulir belum tersedia (menunggu Apps Script terbaru).');

    return [
      el('section', { kelas: 'kartu entri' }, el('h3', {}, 'Isi direktori'), tabel),
      el('section', { kelas: 'kartu entri' }, el('h3', {}, 'Sebaran per kabupaten/kota'),
        kab.length ? tabelKab : el('p', { kelas: 'sinkron' }, 'Belum ada entri tayang.')),
      el('section', { kelas: 'kartu entri' }, el('h3', {}, 'ISPU yang tampil di web'),
        data.web.udara.length ? udara : el('p', { kelas: 'sinkron' }, 'Belum ada pembacaan ISPU.')),
      el('section', { kelas: 'kartu entri' }, el('h3', {}, 'Formulir untuk warga'), daftarForm),
    ];
  }

  function panelRiwayat() {
    if (!data.log.length) return [el('p', { kelas: 'kosong' }, 'Belum ada riwayat perubahan.')];
    const isi = (v) => (v === null || v === '' ? '(kosong)' : v);
    const butir = data.log.map((l) => el('li', {},
      el('span', { kelas: 'waktu' }, `${waktu(l.waktu)} · ${l.oleh || '-'}`),
      el('span', {}, el('strong', {}, `${judulTab(l.tab)} ${l.id || ''}`), ` · ${l.kolom || ''}`),
      el('span', { kelas: 'nilai-ubah' }, `${isi(l.nilai_lama)} → ${isi(l.nilai_baru)}`)));
    return [el('section', { kelas: 'kartu' }, el('ul', { kelas: 'riwayat' }, ...butir))];
  }

  // ---------- Aksi ----------

  const TEKS_AKSI = {
    tampilkan: 'Ditampilkan di web',
    sembunyikan: 'Disembunyikan dari web',
    sudah_dicek: 'Ditandai sudah dicek',
    status: 'Status relawan disimpan',
    catatan: 'Catatan disimpan',
  };

  async function kirimAksi(o, ubah, nilai, kontrol) {
    kontrol.disabled = true;
    try {
      await api('ubah', { method: 'POST', body: JSON.stringify({ tab: o._tab, id: o.id, ubah, nilai }) });
      kabar(`${TEKS_AKSI[ubah]}: ${o.nama || o.judul || o.id}`);
      if (ubah === 'tampilkan' || ubah === 'sembunyikan' || ubah === 'sudah_dicek') {
        const kartu = document.querySelector(`[data-id="${CSS.escape(`${o._tab}:${o.id}`)}"]`);
        if (kartu) kartu.remove();
      }
      if (ubah === 'catatan') o.catatan_internal = nilai;
      if (ubah === 'status') o.status = nilai;
      muatData({ diam: true });
    } catch (e) {
      if (e.status === 401) return layarMasuk();
      kabar('Gagal menyimpan: ' + e.message);
    } finally {
      kontrol.disabled = false;
    }
  }

  // ---------- Mulai ----------

  window.addEventListener('hashchange', () => { if (data) gambar(); });
  $('saring-tab').addEventListener('change', () => { if (data) gambar(); });
  $('muat-ulang').addEventListener('click', () => muatData());

  api('sesi').then((s) => mulaiDasbor(s.email), () => layarMasuk());
})();
