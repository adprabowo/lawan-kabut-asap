// Menguji HTML awal untuk mesin pencari (worker/src/halaman.js) dan data web/seo.js: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bolehDiindeks, htmlAwal, ruteHalaman, sitemap, waktuWib } from '../worker/src/halaman.js';

const { SEO, PANDUAN } = globalThis;

const DATA = {
  ruang: [{ id: 'R001', nama: 'Yayasan <Contoh>', jenis: 'Yayasan/komunitas', kabupaten: 'Kota Jambi', jam_buka: '09.30 - 16.30 WIB' }],
  oksigen: [],
  air_bersih: [],
  kontak_darurat: [
    { id: 'K001', nama: 'RSUD Raden Mattaher', jenis: 'Rumah sakit', kabupaten: 'Kota Jambi', telepon: '0741-61692', layanan: 'IGD 24 jam' },
    { id: 'K002', nama: 'Nomor 112', jenis: 'Lainnya', telepon: '112' },
  ],
  donasi: [],
  udara: [{ waktu: '2026-10-22T02:00:00.000Z', lokasi: 'Kota Jambi', ispu: 259, kategori: 'Sangat Tidak Sehat', sumber: 'PM2.5 BMKG', pm25: 209.3 }],
};

test('judul 50–60 dan deskripsi 120–160 karakter, unik, untuk semua halaman dan panduan', () => {
  const judul = new Set();
  for (const [rute, m] of Object.entries(SEO.halaman)) {
    assert.ok(m.judul.length >= 50 && m.judul.length <= 60, `${rute} judul ${m.judul.length}`);
    assert.ok(m.deskripsi.length >= 120 && m.deskripsi.length <= 160, `${rute} deskripsi ${m.deskripsi.length}`);
    assert.ok(!judul.has(m.judul), `judul ganda: ${m.judul}`);
    judul.add(m.judul);
  }
  for (const p of PANDUAN) assert.ok(SEO.halaman['panduan/' + p.slug], `seo.js belum punya panduan/${p.slug}`);
});

test('ruteHalaman: halaman, alias, garis miring, 404, dan aset', () => {
  assert.deepEqual(ruteHalaman('/'), { rute: '' });
  assert.deepEqual(ruteHalaman('/faskes'), { rute: 'faskes' });
  assert.deepEqual(ruteHalaman('/faskes/'), { alihkan: '/faskes' });
  assert.deepEqual(ruteHalaman('/ruang/terdekat'), { rute: 'ruang' });
  assert.deepEqual(ruteHalaman('/panduan/ispa'), { rute: 'panduan/ispa' });
  assert.equal(ruteHalaman('/panduan/tidak-ada').tidakAda, true);
  assert.equal(ruteHalaman('/style.css'), null);
});

test('htmlAwal: h1, isi data, JSON-LD, dan escape', () => {
  const h = htmlAwal('ruang', DATA);
  assert.equal(h.status, 200);
  assert.equal(h.kanonik, 'https://lawanasap.iaitbjambi.org/ruang');
  assert.match(h.isi, /<h1>Ruang Aman Asap<\/h1>/);
  assert.match(h.isi, /Yayasan &lt;Contoh&gt;/);
  assert.match(h.isi, /aria-current="page">Ruang Aman Asap</);
  const ld = JSON.parse(h.kepala.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);
  const tipe = ld['@graph'].map((n) => n['@type']);
  assert.deepEqual(tipe, ['CollectionPage', 'WebSite', 'Organization', 'BreadcrumbList']);

  const beranda = htmlAwal('', DATA);
  assert.equal((beranda.isi.match(/<h1>/g) || []).length, 1);
  assert.match(beranda.isi, /Kota Jambi: ISPU 259, Sangat Tidak Sehat/);
  assert.match(beranda.isi, /09\.00 WIB, 22 Oktober 2026/);

  const kontak = htmlAwal('kontak', DATA);
  assert.doesNotMatch(kontak.isi, /Nomor 112<\/h3>/, 'nomor nasional dari Sheet tidak diulang');

  const panduan = htmlAwal('panduan/ispa', DATA);
  assert.match(panduan.isi, /<h1>Gejala ISPA dan tanda bahaya<\/h1>/);
  assert.match(panduan.kepala, /"name":"Edukasi"/);
});

test('halaman daftar yang kosong noindex dan keluar dari sitemap', () => {
  assert.equal(bolehDiindeks('oksigen', DATA), false);
  assert.match(htmlAwal('oksigen', DATA).kepala, /noindex, follow/);
  assert.equal(bolehDiindeks('ambulans', DATA), true, 'ambulans selalu berisi nomor 119');
  const xml = sitemap(DATA, '2026-10-22T02:05:00.000Z');
  assert.match(xml, /<loc>https:\/\/lawanasap\.iaitbjambi\.org\/ruang<\/loc><lastmod>2026-10-22<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/lawanasap\.iaitbjambi\.org\/panduan\/ispa<\/loc><\/url>/);
  assert.doesNotMatch(xml, /\/oksigen</);
  assert.doesNotMatch(xml, /\/donasi</);
});

test('halaman tidak ada: 404, noindex, tanpa canonical', () => {
  const h = htmlAwal('panduan/x', null, true);
  assert.equal(h.status, 404);
  assert.equal(h.kanonik, null);
  assert.match(h.kepala, /noindex/);
});

test('waktuWib', () => {
  assert.equal(waktuWib('2026-10-21T17:30:00.000Z'), '00.30 WIB, 22 Oktober 2026');
});

test('info dan kontribusi: noindex bila info kosong, tautan non-http dibuang, form dari data', () => {
  assert.deepEqual(ruteHalaman('/info'), { rute: 'info' });
  assert.deepEqual(ruteHalaman('/kontribusi'), { rute: 'kontribusi' });
  assert.equal(bolehDiindeks('info', DATA), false);
  assert.doesNotMatch(sitemap(DATA, null), /\/info</);
  assert.match(sitemap(DATA, null), /\/kontribusi</);

  const data = {
    ...DATA,
    info: [
      { id: 'I002', tanggal: '2026-10-22T02:00:00.000Z', judul: 'Posko baru', isi: 'Buka 24 jam', sumber: 'BPBD', tautan: 'javascript:alert(1)' },
      { id: 'I001', tanggal: '2026-10-21T02:00:00.000Z', judul: 'Lama', isi: 'x', sumber: 'Dinkes', tautan: 'https://contoh.id/a' },
    ],
    form_url: { relawan: 'https://docs.google.com/forms/d/e/x/viewform' },
  };
  assert.equal(bolehDiindeks('info', data), true);
  const info = htmlAwal('info', data);
  assert.match(info.isi, /<h3>Posko baru<\/h3><p>BPBD · 22 Oktober 2026<\/p>/);
  assert.doesNotMatch(info.isi, /javascript:/);
  assert.match(info.isi, /href="https:\/\/contoh\.id\/a"/);
  assert.match(htmlAwal('', data).isi, /Informasi terbaru/);
  const k = htmlAwal('kontribusi', data);
  assert.match(k.isi, /<a href="https:\/\/docs\.google\.com\/forms\/d\/e\/x\/viewform" rel="noopener">Isi formulir relawan<\/a>/);
  assert.match(k.isi, /<li>Ruang Aman Asap<\/li>/, 'tanpa URL Form, teks tanpa tautan');
});
