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

test('skema punya 7 tab sesuai rencana', () => {
  assert.deepEqual(Object.keys(ctx.SKEMA),
    ['ruang', 'oksigen', 'air_bersih', 'kontak_darurat', 'udara', 'faq', 'log']);
});

test('kolom privat tidak keluar lewat kolomPublik', () => {
  for (const tab of Object.keys(ctx.SKEMA)) {
    const publik = ctx.kolomPublik(tab);
    for (const k of ['pengelola_wa', 'terverifikasi_oleh', 'catatan_internal']) {
      assert.ok(!publik.includes(k), `${tab}.${k} bocor`);
    }
  }
  assert.equal(ctx.kolomPublik('log').length, 0);
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
