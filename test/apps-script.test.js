// Menguji fungsi murni Apps Script dengan Node: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = path.join(__dirname, '..', 'apps-script');
const ctx = vm.createContext({});
// const/let di tingkat atas tidak menjadi properti konteks, jadi diubah ke var untuk tes.
for (const f of ['Skema.gs', 'Util.gs']) {
  const kode = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^const /gm, 'var ');
  vm.runInContext(kode, ctx, { filename: f });
}

test('semua file .gs lolos parse', () => {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.gs'))) {
    new vm.Script(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
  }
});

test('kode tingkat atas tiap .gs tidak bergantung pada file lain (Apps Script memuat sesuai urutan editor)', () => {
  // Hanya layanan Google bawaan yang tersedia saat file dimuat; konstanta file lain belum tentu ada.
  const layanan = () => ({ PropertiesService: { getScriptProperties: () => ({}) } });
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.gs'))) {
    assert.doesNotThrow(() => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'),
      vm.createContext(layanan()), { filename: f }), f);
  }
});

test('setiap layanan Google yang dipakai kode tercantum di oauthScopes appsscript.json', () => {
  // Izin dicantumkan eksplisit supaya deploy otomatis tidak memicu permintaan izin baru;
  // izin yang kurang membuat web app berhenti mengirim data tanpa terlihat.
  const kode = fs.readdirSync(dir).filter((f) => f.endsWith('.gs'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const izin = JSON.parse(fs.readFileSync(path.join(dir, 'appsscript.json'), 'utf8')).oauthScopes;
  const butuh = {
    'SpreadsheetApp.': 'spreadsheets',
    'FormApp.': 'forms',
    'DriveApp.': 'drive',
    'ScriptApp.': 'script.scriptapp',
    'UrlFetchApp.': 'script.external_request',
    '.getEmail(': 'userinfo.email',
  };
  for (const [layanan, cakupan] of Object.entries(butuh)) {
    if (kode.includes(layanan)) {
      assert.ok(izin.includes('https://www.googleapis.com/auth/' + cakupan), `${layanan} butuh ${cakupan}`);
    }
  }
});

test('skema punya 10 tab: rencana awal, donasi, info terbaru, dan relawan (privat)', () => {
  assert.deepEqual(Object.keys(ctx.SKEMA),
    ['ruang', 'oksigen', 'air_bersih', 'kontak_darurat', 'donasi', 'info', 'relawan', 'udara', 'faq', 'log']);
  assert.equal(ctx.tabPublik('relawan'), false);
  assert.equal(ctx.tabPublik('log'), false);
  assert.equal(ctx.tabPublik('info'), true);
});

test('setiap pertanyaan Form punya label dan kolom tujuan di skema', () => {
  const ctxSetup = vm.createContext({ PropertiesService: { getScriptProperties: () => ({}) } });
  for (const f of ['Skema.gs', 'Setup.gs']) {
    const kode = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^const /gm, 'var ');
    vm.runInContext(kode, ctxSetup, { filename: f });
  }
  for (const [tab, daftar] of Object.entries(ctxSetup.PERTANYAAN_FORM)) {
    const header = ctxSetup.headerTab(tab);
    for (const k of daftar) {
      assert.ok(ctxSetup.LABEL_FORM[k] || (ctxSetup.SKEMA[tab].labelForm || {})[k], `label ${tab}.${k}`);
      if (k === 'lokasi') assert.ok(header.includes('lat') && header.includes('lng'), `${tab} butuh lat/lng`);
      else assert.ok(header.includes(k), `kolom ${tab}.${k}`);
    }
  }
  assert.ok(!('donasi' in ctxSetup.PERTANYAAN_FORM), 'donasi tidak boleh punya Form publik');
});

test('kolom privat tidak keluar lewat kolomPublik', () => {
  for (const tab of Object.keys(ctx.SKEMA)) {
    const publik = ctx.kolomPublik(tab);
    for (const k of ['pengelola_wa', 'terverifikasi_oleh', 'catatan_internal']) {
      assert.ok(!publik.includes(k), `${tab}.${k} bocor`);
    }
  }
  assert.equal(ctx.kolomPublik('log').length, 0);
  assert.equal(ctx.kolomPublik('relawan').length, 0, 'data pendaftar relawan tidak boleh keluar');
  assert.ok(!ctx.kolomPublik('info').includes('kontak_pengirim'));
  assert.ok(ctx.kolomPublik('ruang').includes('terverifikasi_pada'));
});

test('header tab direktori diakhiri kolom verifikasi', () => {
  const h = ctx.headerTab('ruang');
  assert.equal(h[0], 'id');
  assert.deepEqual(h.slice(-6), ctx.KOLOM_VERIFIKASI);
  assert.equal(new Set(h).size, h.length);
});

test('setiap kolom ber-dropdown memang ada di tab', () => {
  for (const [tab, s] of Object.entries(ctx.SKEMA)) {
    for (const k of Object.keys({ ...s.pilihan, ...(s.pilihanGanda || {}) })) {
      assert.ok(s.kolom.includes(k), `${tab}.${k}`);
    }
  }
});

test('idBerikutnya', () => {
  assert.equal(ctx.idBerikutnya('R', []), 'R001');
  assert.equal(ctx.idBerikutnya('R', ['R001', 'R009', '', 'O050', 'x']), 'R010');
  assert.equal(ctx.idBerikutnya('O', ['O999']), 'O1000');
});

test('uraiKoordinat', () => {
  const k = (s) => JSON.parse(JSON.stringify(ctx.uraiKoordinat(s)));
  assert.deepEqual(k('-1.6101, 103.6131'), { lat: -1.6101, lng: 103.6131 });
  assert.deepEqual(k('-1.6101 103.6131'), { lat: -1.6101, lng: 103.6131 });
  assert.deepEqual(k('https://www.google.com/maps/place/Masjid/@-1.59,103.61,17z/data=!3d-1.5912!4d103.6145'),
    { lat: -1.5912, lng: 103.6145 });
  assert.deepEqual(k('https://maps.google.com/?q=-1.6,103.5'), { lat: -1.6, lng: 103.5 });
  assert.deepEqual(k('https://www.openstreetmap.org/#map=17/-1.60/103.61'), { lat: -1.6, lng: 103.61 });
  assert.equal(ctx.uraiKoordinat('https://maps.app.goo.gl/abc123'), null);
  assert.equal(ctx.uraiKoordinat('dekat pasar'), null);
  assert.equal(ctx.uraiKoordinat('200, 300'), null);
});

test('uraiKoordinat memilih titik penanda tempat, bukan titik tengah peta', () => {
  // Tujuan pengalihan dari https://maps.app.goo.gl/tuqcw3VXwXDG9x3X9 (Yayasan Pesona Kebaikan Indonesia).
  const url = 'https://www.google.com/maps/place/Yayasan+Pesona+Kebaikan+Indonesia/@-1.6275502,103.5851537,842m/' +
    'data=!3m2!1e3!4b1!4m6!3m5!1s0x2e25897db9eb947b:0x4a9e81b18497b792!8m2!3d-1.6275502!4d103.5877286!16s%2Fg%2F11sjx80fc6';
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.uraiKoordinat(url))), { lat: -1.6275502, lng: 103.5877286 });
});

test('indeksBarisKosong: lompati baris berisi, abaikan kotak centang FALSE di bawahnya', () => {
  assert.equal(ctx.indeksBarisKosong(['R001', '', ''], ['Yayasan', '', '']), 1);
  assert.equal(ctx.indeksBarisKosong(['', ''], ['Diisi manual tanpa id', '']), 1);
  assert.equal(ctx.indeksBarisKosong(['R001', 'R002'], ['A', 'B']), 2);
  assert.equal(ctx.indeksBarisKosong([], []), 0);
});

test('rencanaKolomBaru: kolom baru disisipkan setelah kolom skema sebelumnya, bukan di ujung', () => {
  // Tab kontak_darurat sebelum Okt 2026, ditambah satu kolom buatan relawan di ujung.
  const lama = ['id', 'nama', 'jenis', 'kabupaten', 'alamat', 'telepon', 'jam_layanan',
    ...ctx.KOLOM_VERIFIKASI, 'catatan_relawan'];
  const header = [...ctx.headerTab('kontak_darurat')];
  const hasil = lama.slice();
  for (const r of ctx.rencanaKolomBaru(lama, header)) hasil.splice(r.posisi - 1, 0, r.kolom);
  assert.deepEqual(hasil, [...header, 'catatan_relawan']);
  assert.equal(ctx.rencanaKolomBaru(hasil, header).length, 0);
});

test('ambilTautanPendek', () => {
  assert.equal(ctx.ambilTautanPendek('lihat https://maps.app.goo.gl/tuqcw3VXwXDG9x3X9 ya'), 'https://maps.app.goo.gl/tuqcw3VXwXDG9x3X9');
  assert.equal(ctx.ambilTautanPendek('https://goo.gl/maps/AbC123'), 'https://goo.gl/maps/AbC123');
  assert.equal(ctx.ambilTautanPendek('-1.61, 103.61'), '');
  assert.equal(ctx.ambilTautanPendek(null), '');
});

test('kategoriIspu', () => {
  assert.equal(ctx.kategoriIspu(50), 'Baik');
  assert.equal(ctx.kategoriIspu(101), 'Tidak Sehat');
  assert.equal(ctx.kategoriIspu(300), 'Sangat Tidak Sehat');
  assert.equal(ctx.kategoriIspu(303), 'Berbahaya');
  assert.equal(ctx.kategoriIspu(''), '');
});

test('normalkanNomorWa', () => {
  assert.equal(ctx.normalkanNomorWa('0812-3456-7890'), '6281234567890');
  assert.equal(ctx.normalkanNomorWa('+62 812 3456 7890'), '6281234567890');
  assert.equal(ctx.normalkanNomorWa('81234567890'), '6281234567890');
});

test('susunDataPublik: hanya entri tampil, kolom publik, FAQ direview, udara terbaru', () => {
  const tgl = (s) => vm.runInContext(`new Date('${s}')`, ctx);
  const hRuang = ctx.headerTab('ruang');
  const barisRuang = (isi) => hRuang.map((k) => (k in isi ? isi[k] : ''));
  const lembar = {
    ruang: {
      header: hRuang,
      baris: [
        barisRuang({ id: 'R001', kode: 'R001', nama: 'Masjid Agung', lat: -1.6, lng: 103.6, status: 'BUKA',
          pengelola_wa: '6281200000000', tampil: true, catatan_internal: 'rahasia',
          terverifikasi_oleh: 'a@b.c', terverifikasi_pada: tgl('2026-10-21T03:00:00Z') }),
        barisRuang({ id: 'R002', nama: 'Belum dicek', tampil: false }),
        barisRuang({ nama: 'Tanpa ID', tampil: true }),
      ],
    },
    faq: {
      header: ctx.headerTab('faq'),
      baris: [
        ['F001', 'Apa itu ISPA?', 'Infeksi saluran pernapasan akut.', 'ispa', 'dr. X', tgl('2026-10-20T00:00:00Z')],
        ['F002', 'Draf', 'Belum direview', '', '', ''],
      ],
    },
    udara: {
      header: ctx.headerTab('udara'),
      baris: [
        [tgl('2026-10-21T01:00:00Z'), 'Kota Jambi', 180, 'Tidak Sehat', 'relawan'],
        [tgl('2026-10-21T05:00:00Z'), 'Kota Jambi', 303, 'Berbahaya', 'relawan'],
        [tgl('2026-10-21T04:00:00Z'), 'Muaro Jambi', 120, 'Tidak Sehat', 'relawan'],
        ['', 'Bungo', 90, 'Sedang', 'tanpa waktu'],
      ],
    },
  };
  const hInfo = ctx.headerTab('info');
  const barisInfo = (isi) => hInfo.map((k) => (k in isi ? isi[k] : ''));
  lembar.info = {
    header: hInfo,
    baris: [
      barisInfo({ id: 'I001', tanggal: tgl('2026-10-20T02:00:00Z'), judul: 'Lama', isi: 'x', sumber: 'BPBD', tampil: true,
        kontak_pengirim: '6281200000000' }),
      barisInfo({ id: 'I002', tanggal: tgl('2026-10-22T02:00:00Z'), judul: 'Baru', isi: 'y', sumber: 'Dinkes', tampil: true }),
      barisInfo({ id: 'I003', tanggal: tgl('2026-10-22T03:00:00Z'), judul: 'Belum dicek', isi: 'z', sumber: '?', tampil: false }),
    ],
  };
  lembar.relawan = { header: ctx.headerTab('relawan'), baris: [['V001', '', 'Budi', '6281299999999']] };
  const d = JSON.parse(JSON.stringify(ctx.susunDataPublik(lembar, 'https://contoh/{bagian}/{kode}',
    { info: 'https://form/info', relawan: 'https://form/relawan' })));
  assert.deepEqual(d.info.map((i) => i.judul), ['Baru', 'Lama']);
  assert.ok(!('kontak_pengirim' in d.info[1]));
  assert.ok(!('relawan' in d), 'tab relawan tidak boleh ikut dikirim');
  assert.equal(d.form_url.relawan, 'https://form/relawan');

  assert.equal(d.ruang.length, 1);
  const r = d.ruang[0];
  assert.equal(r.id, 'R001');
  assert.equal(r.terverifikasi_pada, '2026-10-21T03:00:00.000Z');
  assert.equal(r.kecamatan, null);
  for (const k of ['pengelola_wa', 'catatan_internal', 'terverifikasi_oleh', 'tampil']) assert.ok(!(k in r), k);
  assert.deepEqual(d.oksigen, []);
  assert.deepEqual(d.faq.map((f) => f.id), ['F001']);
  assert.deepEqual(d.udara.map((u) => [u.lokasi, u.ispu]), [['Kota Jambi', 303], ['Muaro Jambi', 120]]);
  assert.ok(!('log' in d));
  assert.equal(d.lapor_url, 'https://contoh/{bagian}/{kode}');
});

test('bolehUbahStatus', () => {
  assert.equal(ctx.bolehUbahStatus('0812 3456 7890', '6281234567890'), true);
  assert.equal(ctx.bolehUbahStatus('628111, 0812-3456-7890', '+62 812 3456 7890'), true);
  assert.equal(ctx.bolehUbahStatus('6281234567890', '6289999999999'), false);
  assert.equal(ctx.bolehUbahStatus('', '6281234567890'), false);
  assert.equal(ctx.bolehUbahStatus('6281234567890', ''), false);
});

test('susunDataAdmin: antrean, cek ulang, relawan, statistik, dan log (termasuk kolom privat)', () => {
  // Tanggal dibuat di konteks vm supaya `instanceof Date` di kode Apps Script berlaku.
  const tgl = (t) => vm.runInContext(`new Date('${t}')`, ctx);
  const sekarang = tgl('2026-10-22T05:00:00Z');
  const baris = (tab, nilai) => ctx.headerTab(tab).map((k) => (k in nilai ? nilai[k] : ''));
  const lembar = {
    ruang: {
      header: ctx.headerTab('ruang'), gid: 11,
      baris: [
        baris('ruang', { id: 'R001', nama: 'Tayang segar', kabupaten: 'Kota Jambi', tampil: true,
          cek_ulang_sebelum: tgl('2026-10-23T00:00:00Z'), pengelola_wa: '6281' }),
        baris('ruang', { id: 'R002', nama: 'Kiriman baru', kabupaten: 'Bungo', tampil: false,
          diubah_pada: tgl('2026-10-22T04:00:00Z'), pengelola_wa: '6282' }),
        baris('ruang', { id: 'R003', nama: 'Lewat cek ulang', kabupaten: 'Kota Jambi', tampil: true,
          cek_ulang_sebelum: tgl('2026-10-21T00:00:00Z') }),
        baris('ruang', { nama: 'Belum ber-ID' }),
      ],
    },
    info: { header: ctx.headerTab('info'), gid: 22,
      baris: [baris('info', { id: 'I001', judul: 'Kabar', tampil: false, kontak_pengirim: '6283',
        diubah_pada: tgl('2026-10-22T04:30:00Z') })] },
    relawan: { header: ctx.headerTab('relawan'), gid: 33,
      baris: [
        baris('relawan', { id: 'V001', waktu: tgl('2026-10-20T00:00:00Z'), nama: 'Lama', status: 'Aktif' }),
        baris('relawan', { id: 'V002', waktu: tgl('2026-10-22T00:00:00Z'), nama: 'Baru', wa: '6284', status: 'Baru' }),
      ] },
    log: { header: ctx.headerTab('log'),
      baris: [[tgl('2026-10-21T00:00:00Z'), 'ruang', 'R001', 'tampil', false, true, 'a'],
        [tgl('2026-10-22T00:00:00Z'), 'info', 'I001', 'judul', '', 'Kabar', 'b']] },
  };
  const d = JSON.parse(JSON.stringify(ctx.susunDataAdmin(lembar, sekarang, 'https://sheet/edit')));
  assert.equal(d.admin, true);
  assert.equal(d.sheet_url, 'https://sheet/edit');
  assert.deepEqual(d.antrean.map((o) => o.id), ['I001', 'R002'], 'kiriman terbaru dulu, baris tanpa ID diabaikan');
  assert.equal(d.antrean[1].pengelola_wa, '6282', 'admin melihat kolom privat');
  assert.equal(d.antrean[1]._baris, 3);
  assert.equal(d.antrean[1]._tab, 'ruang');
  assert.deepEqual(d.cek_ulang.map((o) => o.id), ['R003']);
  assert.deepEqual(d.relawan.map((r) => r.id), ['V002', 'V001']);
  assert.equal(d.relawan[0].wa, '6284');
  assert.deepEqual(d.statistik.tab.ruang, { tayang: 2, antrean: 1, cek_ulang: 1 });
  assert.deepEqual(d.statistik.tab.info, { tayang: 0, antrean: 1, cek_ulang: 0 });
  assert.deepEqual(d.statistik.tab.oksigen, { tayang: 0, antrean: 0, cek_ulang: 0 });
  assert.deepEqual(d.statistik.kabupaten, { 'Kota Jambi': 2 });
  assert.equal(d.tab.ruang.gid, 11);
  assert.equal(d.tab.oksigen.gid, null);
  assert.deepEqual(d.tab.relawan.pilihan_status, ['Baru', 'Sudah dihubungi', 'Aktif', 'Tidak aktif']);
  assert.ok(!('udara' in d.tab) && !('faq' in d.tab) && !('log' in d.tab));
  assert.deepEqual(d.log.map((l) => l.id), ['I001', 'R001'], 'riwayat terbaru dulu');
});

test('perubahanAdmin: hanya aksi dan tab yang diizinkan', () => {
  const kini = new Date('2026-10-22T05:00:00Z');
  const p = ctx.perubahanAdmin('ruang', 'tampilkan', '', kini, 'hello@x');
  assert.equal(p.tampil, true);
  assert.equal(p.terverifikasi_oleh, 'hello@x');
  assert.equal(p.terverifikasi_pada.getTime(), kini.getTime());
  assert.equal(p.cek_ulang_sebelum.toISOString(), '2026-10-23T05:00:00.000Z');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.perubahanAdmin('ruang', 'sembunyikan', '', kini, 'a'))), { tampil: false });
  const cek = ctx.perubahanAdmin('kontak_darurat', 'sudah_dicek', '', kini, 'a');
  assert.ok(!('tampil' in cek));
  assert.equal(cek.cek_ulang_sebelum.toISOString(), '2026-11-05T05:00:00.000Z');
  assert.equal(ctx.perubahanAdmin('relawan', 'status', 'Aktif', kini, 'a').status, 'Aktif');
  assert.equal(ctx.perubahanAdmin('relawan', 'status', 'Bos', kini, 'a').galat, 'aksi');
  assert.equal(ctx.perubahanAdmin('relawan', 'tampilkan', '', kini, 'a').galat, 'aksi');
  assert.equal(ctx.perubahanAdmin('info', 'catatan', 'x'.repeat(2000), kini, 'a').catatan_internal.length, 1000);
  assert.equal(ctx.perubahanAdmin('udara', 'tampilkan', '', kini, 'a').galat, 'tab');
  assert.equal(ctx.perubahanAdmin('log', 'catatan', 'x', kini, 'a').galat, 'tab');
  assert.equal(ctx.perubahanAdmin('ruang', 'hapus', '', kini, 'a').galat, 'aksi');
});
