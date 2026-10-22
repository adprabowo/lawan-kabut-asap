/**
 * HTML awal tiap halaman untuk mesin pencari: judul, deskripsi, canonical, JSON-LD, dan isi yang
 * terbaca tanpa JavaScript. Web app (web/app.js) menggantinya dengan tampilan interaktif.
 * Judul dan deskripsi diambil dari web/seo.js, panduan dari web/panduan.js, supaya tidak berbeda.
 */
import '../../web/panduan.js';
import '../../web/seo.js';

const { SEO, PANDUAN } = globalThis;
const ASAL = SEO.ASAL;
const JENIS_FASKES = ['Rumah sakit', 'Puskesmas', 'Klinik', 'Posko kesehatan'];

// Sama dengan NOMOR_NASIONAL di web/app.js.
const NOMOR_NASIONAL = [
  { nomor: '112', nama: 'Layanan darurat terpadu', ket: 'Kebakaran, kecelakaan, kriminal, darurat medis' },
  { nomor: '119', nama: 'Ambulans dan gawat darurat medis', ket: 'Sesak berat, nyeri dada, pingsan' },
  { nomor: '113', nama: 'Pemadam kebakaran', ket: 'Laporkan titik api di dekat Anda' },
  { nomor: '110', nama: 'Polisi', ket: 'Gangguan keamanan' },
];

// Sama dengan DIREKTORI di web/app.js (judul = h1). `selaluIsi`: halaman tetap berisi walau daftar kosong.
const DIREKTORI = {
  ruang: { tab: 'ruang', judul: 'Ruang Aman Asap' },
  faskes: { tab: 'kontak_darurat', judul: 'Rumah Sakit dan Faskes', saring: (e) => JENIS_FASKES.includes(e.jenis) },
  oksigen: { tab: 'oksigen', judul: 'Oksigen' },
  'air-bersih': { tab: 'air_bersih', judul: 'Air Bersih' },
  ambulans: { tab: 'kontak_darurat', judul: 'Ambulans', nasional: ['119'], selaluIsi: true, saring: (e) => e.jenis === 'Ambulans' },
  kontak: {
    tab: 'kontak_darurat', judul: 'Kontak Darurat', nasional: ['112', '119', '113', '110'], selaluIsi: true,
    saring: (e) => !JENIS_FASKES.includes(e.jenis) && e.jenis !== 'Ambulans',
  },
};

// Urutan menu beranda dan sitemap.
const MENU = ['ruang', 'faskes', 'ambulans', 'kontak', 'oksigen', 'air-bersih', 'edukasi', 'donasi', 'info', 'kontribusi'];
const JUDUL_MENU = { edukasi: 'Edukasi', donasi: 'Donasi', info: 'Informasi Terbaru', kontribusi: 'Cara Berkontribusi' };
const HALAMAN_LAIN = ['edukasi', 'donasi', 'info', 'kontribusi'];

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const nomorTel = (t) => String(t || '').replace(/[^\d+]/g, '');

/**
 * Path → rute. null = bukan halaman (biarkan aset). `kanonik` berbeda dari path bila path perlu
 * dialihkan (garis miring di akhir) atau hanya alias (/ruang/terdekat).
 */
export function ruteHalaman(pathname) {
  const rute = pathname.replace(/^\/+/, '');
  if (rute.length > 1 && rute.endsWith('/')) return { alihkan: '/' + rute.replace(/\/+$/, '') };
  if (rute === '' || DIREKTORI[rute] || HALAMAN_LAIN.includes(rute)) return { rute };
  if (rute === 'ruang/terdekat') return { rute: 'ruang' };
  const m = rute.match(/^panduan\/([a-z0-9-]+)$/);
  if (m && PANDUAN.some((p) => p.slug === m[1])) return { rute };
  if (rute.startsWith('panduan/') || rute.startsWith('ruang/')) return { rute, tidakAda: true };
  return null;
}

function entriDirektori(kunci, data) {
  const cfg = DIREKTORI[kunci];
  let semua = (data && data[cfg.tab]) || [];
  if (cfg.saring) semua = semua.filter(cfg.saring);
  if (cfg.tab === 'kontak_darurat') semua = semua.filter((e) => !NOMOR_NASIONAL.some((n) => n.nomor === nomorTel(e.telepon)));
  return semua.slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
}

const barangDonasi = (data) => ((data && data.donasi) || []).filter((e) => e.jenis === 'Barang');
const infoTerbaru = (data) => ((data && data.info) || []).filter((k) => k.judul);
const urlAman = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');

/** Halaman daftar yang sedang kosong tidak diindeks dan tidak masuk sitemap sampai ada isinya. */
export function bolehDiindeks(rute, data) {
  if (DIREKTORI[rute]) return DIREKTORI[rute].selaluIsi || entriDirektori(rute, data).length > 0;
  if (rute === 'donasi') return ((data && data.donasi) || []).length > 0;
  if (rute === 'info') return infoTerbaru(data).length > 0;
  return true;
}

function remah(daftar) {
  return '<nav class="remah" aria-label="Lokasi halaman"><ol>' + daftar.map(([nama, rute], i) =>
    i === daftar.length - 1 ? `<li aria-current="page">${esc(nama)}</li>` : `<li><a href="/${rute}">${esc(nama)}</a></li>`,
  ).join('') + '</ol></nav>';
}

function daftarRemah(rute) {
  if (rute === '') return null;
  const hasil = [['Beranda', '']];
  if (rute.startsWith('panduan/')) {
    hasil.push(['Edukasi', 'edukasi']);
    hasil.push([PANDUAN.find((p) => 'panduan/' + p.slug === rute).judul, rute]);
  } else {
    hasil.push([DIREKTORI[rute] ? DIREKTORI[rute].judul : JUDUL_MENU[rute], rute]);
  }
  return hasil;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function waktuWib(iso) {
  const d = new Date(Date.parse(iso) + 7 * 3600e3);
  const dua = (n) => String(n).padStart(2, '0');
  return `${dua(d.getUTCHours())}.${dua(d.getUTCMinutes())} WIB, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function htmlUdara(data) {
  const udara = (data && data.udara) || [];
  if (!udara.length) return '';
  return '<h2>Kualitas udara terkini</h2><ul>' + udara.map((u) => {
    const asal = u.sumber === 'PM2.5 BMKG' && typeof u.pm25 === 'number'
      ? `dihitung dari PM2.5 ${String(u.pm25).replace('.', ',')} µg/m³ BMKG` : `sumber ${esc(u.sumber)}`;
    return `<li><strong>${esc(u.lokasi)}: ISPU ${esc(u.ispu)}, ${esc(u.kategori)}</strong> (${asal}, ${waktuWib(u.waktu)})</li>`;
  }).join('') + '</ul>';
}

function htmlBeranda(data) {
  const m = SEO.halaman[''];
  const layanan = MENU.map((k) => {
    const s = SEO.halaman[k];
    return `<li><a href="/${k}">${esc(DIREKTORI[k] ? DIREKTORI[k].judul : JUDUL_MENU[k])}</a>: ${esc(s.deskripsi)}</li>`;
  }).join('');
  return `<h1>${esc(m.h1)}</h1><p>${esc(m.pembuka)}</p>` + htmlUdara(data) +
    `<h2>Layanan</h2><ul>${layanan}</ul>` +
    '<h2>Segera ke IGD atau telepon 119 bila</h2><ul>' + globalThis.TANDA_BAHAYA.map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>' +
    `<h2>Edukasi</h2><ul>${PANDUAN.map((p) => `<li><a href="/panduan/${p.slug}">${esc(p.judul)}</a>: ${esc(p.ringkas)}</li>`).join('')}</ul>` +
    htmlInfoDaftar(infoTerbaru(data).slice(0, 3), 'Informasi terbaru') +
    `<h2>Tanya lewat WhatsApp</h2><p>Bot relawan menjawab kapan saja: <a href="https://wa.me/${SEO.WA_BOT}?text=MENU">+${SEO.WA_BOT}</a>.</p>` +
    '<h2>Cara berkontribusi</h2><ul><li><a href="/kontribusi#relawan">Daftar jadi relawan</a></li>' +
    '<li><a href="/kontribusi#tambah-info">Tambahkan info</a></li><li><a href="/donasi">Donasi</a></li></ul>' +
    '<h2>Penyelenggara dan mitra</h2><p>Program Siaga Asap diselenggarakan Ikatan Alumni ITB Jambi (IA-ITB Jambi) bersama ' +
    'Jambi Digital Movement dan Bakastra BPD HIPMI Jambi.</p>';
}

function htmlEntri(e) {
  const baris = [];
  const sub = [e.jenis, [e.kecamatan, e.kabupaten].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  if (sub) baris.push(esc(sub));
  if (e.alamat) baris.push('Alamat: ' + esc(e.alamat));
  if (e.jam_buka) baris.push('Buka ' + esc(e.jam_buka));
  if (e.jam_layanan) baris.push('Layanan ' + esc(e.jam_layanan));
  if (e.layanan) baris.push('Layanan: ' + esc(e.layanan));
  if (e.wilayah_layanan) baris.push('Melayani ' + esc(e.wilayah_layanan));
  const tel = e.telepon || e.kontak_publik;
  if (tel) baris.push(`Telepon: <a href="tel:${esc(nomorTel(tel))}">${esc(tel)}</a>`);
  return `<li><h3>${esc(e.nama)}</h3>${baris.map((b) => `<p>${b}</p>`).join('')}</li>`;
}

function htmlDirektori(kunci, data) {
  const cfg = DIREKTORI[kunci];
  const semua = entriDirektori(kunci, data);
  let html = `<h1>${esc(cfg.judul)}</h1><p>${esc(SEO.halaman[kunci].pembuka)}</p>`;
  if (cfg.nasional) {
    html += '<h2>Nomor darurat nasional</h2><ul>' + NOMOR_NASIONAL.filter((n) => cfg.nasional.includes(n.nomor)).map((n) =>
      `<li><a href="tel:${n.nomor}">${n.nomor}</a>: ${esc(n.nama)}. ${esc(n.ket)}.</li>`).join('') + '</ul>';
  }
  if (semua.length) {
    const judul = kunci === 'ambulans' ? 'Ambulans setempat' : kunci === 'kontak' ? 'Kontak lain' : `${semua.length} tempat`;
    html += `<h2>${esc(judul)}</h2><ul>${semua.map(htmlEntri).join('')}</ul>`;
  } else if (!cfg.nasional) {
    html += '<p>Belum ada data yang terverifikasi relawan. Untuk keadaan gawat darurat, telepon 119.</p>';
  }
  return html;
}

function tanggalWib(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + 7 * 3600e3);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function htmlInfoDaftar(info, judul) {
  if (!info.length) return '';
  return `<h2>${esc(judul)}</h2>` + info.map((k) => {
    const meta = [k.sumber, tanggalWib(k.tanggal), k.kabupaten].filter(Boolean).map(esc).join(' · ');
    const tautan = urlAman(k.tautan);
    return `<article><h3>${esc(k.judul)}</h3>${meta ? `<p>${meta}</p>` : ''}${k.isi ? `<p>${esc(k.isi)}</p>` : ''}` +
      (tautan ? `<p><a href="${esc(tautan)}" rel="noopener">${esc(k.label_tautan || 'Buka sumber')}</a></p>` : '') + '</article>';
  }).join('');
}

function htmlInfo(data) {
  const info = infoTerbaru(data);
  return `<h1>Informasi Terbaru</h1><p>${esc(SEO.halaman.info.pembuka)}</p>` +
    (info.length ? htmlInfoDaftar(info, `${info.length} informasi`) : '<p>Belum ada informasi terbaru yang sudah dicek relawan.</p>') +
    '<p><a href="/kontribusi#tambah-info">Kirim informasi</a></p>';
}

function htmlKontribusi(data) {
  const form = (data && data.form_url) || {};
  const tautan = (tab, teks) => (urlAman(form[tab]) ? `<a href="${esc(form[tab])}" rel="noopener">${esc(teks)}</a>` : esc(teks));
  return `<h1>Cara Berkontribusi</h1><p>${esc(SEO.halaman.kontribusi.pembuka)}</p>` +
    '<h2 id="relawan">Daftar jadi relawan</h2><p>Bantu mendata dan mengecek tempat, menjaga Ruang Aman Asap, mengantar logistik, ' +
    'atau menjawab pertanyaan warga. Data pendaftar hanya dilihat koordinator relawan.</p>' +
    `<p>${tautan('relawan', 'Isi formulir relawan')}</p>` +
    '<h2 id="tambah-info">Tambahkan info</h2><p>Semua kiriman dicek relawan dulu sebelum tampil.</p><ul>' +
    [['info', 'Informasi terbaru'], ['ruang', 'Ruang Aman Asap'], ['oksigen', 'Penyedia oksigen'], ['air_bersih', 'Air bersih'],
      ['kontak_darurat', 'Faskes, ambulans, kontak darurat']].map(([tab, teks]) => `<li>${tautan(tab, teks)}</li>`).join('') +
    '</ul><h2 id="donasi">Donasi</h2><p><a href="/donasi">Lihat kebutuhan dan saluran donasi resmi</a></p>';
}

function htmlEdukasi() {
  const kelompok = [];
  PANDUAN.forEach((p) => {
    let k = kelompok.find((x) => x.nama === p.kelompok);
    if (!k) kelompok.push(k = { nama: p.kelompok, isi: [] });
    k.isi.push(p);
  });
  return `<h1>Edukasi</h1><p>${esc(SEO.halaman.edukasi.pembuka)}</p>` + kelompok.map((k) =>
    `<h2>${esc(k.nama)}</h2><ul>` + k.isi.map((p) => `<li><a href="/panduan/${p.slug}">${esc(p.judul)}</a>: ${esc(p.ringkas)}</li>`).join('') + '</ul>',
  ).join('');
}

function htmlPanduan(rute) {
  const i = PANDUAN.findIndex((p) => 'panduan/' + p.slug === rute);
  const p = PANDUAN[i];
  const lanjut = PANDUAN[(i + 1) % PANDUAN.length];
  return `<h1>${esc(p.judul)}</h1><p>${esc(p.ringkas)}</p><article>${p.html}</article>` +
    `<h2>Baca berikutnya</h2><p><a href="/panduan/${lanjut.slug}">${esc(lanjut.judul)}</a></p>`;
}

function htmlDonasi(data) {
  const barang = barangDonasi(data);
  return `<h1>Donasi</h1><p>${esc(SEO.halaman.donasi.pembuka)}</p>` + (barang.length
    ? '<h2>Kebutuhan barang</h2><ul>' + barang.map((e) => `<li>${esc(e.nama)}${e.detail ? ': ' + esc(e.detail) : ''}</li>`).join('') + '</ul>'
    : '<p>Pengurus IA-ITB Jambi sedang menyusun daftar kebutuhan dan saluran donasi resmi.</p>');
}

function jsonLd(rute, meta) {
  const url = ASAL + '/' + rute;
  const tipe = DIREKTORI[rute] || rute === 'edukasi' || rute === 'info' ? 'CollectionPage' : 'WebPage';
  const halaman = {
    '@type': tipe, '@id': url + '#halaman', url, name: meta.judul, description: meta.deskripsi, inLanguage: 'id-ID',
    isPartOf: { '@id': ASAL + '/#website' }, publisher: { '@id': ASAL + '/#organisasi' },
  };
  const graf = [halaman,
    {
      '@type': 'WebSite', '@id': ASAL + '/#website', url: ASAL + '/', name: SEO.MEREK, alternateName: 'Lawan Kabut Asap',
      inLanguage: 'id-ID', publisher: { '@id': ASAL + '/#organisasi' },
    },
    {
      '@type': 'Organization', '@id': ASAL + '/#organisasi', name: 'Ikatan Alumni ITB Jambi', alternateName: 'IA-ITB Jambi',
      logo: ASAL + '/logo/ia-itb-jambi.webp',
    }];
  if (rute === '') halaman.about = { '@id': ASAL + '/#organisasi' };
  if (rute === 'edukasi') {
    halaman.mainEntity = {
      '@type': 'ItemList', itemListElement: PANDUAN.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, name: p.judul, url: ASAL + '/panduan/' + p.slug,
      })),
    };
  }
  const remahan = daftarRemah(rute);
  if (remahan) {
    halaman.breadcrumb = { '@id': url + '#remah' };
    graf.push({
      '@type': 'BreadcrumbList', '@id': url + '#remah', itemListElement: remahan.map(([nama, r], i) => ({
        '@type': 'ListItem', position: i + 1, name: nama, item: ASAL + '/' + r,
      })),
    });
  }
  // "</" di dalam teks tidak boleh menutup tag script.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graf }).replace(/</g, '\\u003c');
}

/**
 * Semua yang disisipkan ke index.html untuk satu rute. `data` = data publik dari KV (boleh null).
 * Hasil: { judul, deskripsi, kanonik, indeks, kepala (tag tambahan di <head>), isi (awal <main>) }.
 */
export function htmlAwal(rute, data, tidakAda = false) {
  if (tidakAda) {
    return {
      status: 404, judul: 'Halaman tidak ditemukan | ' + SEO.MEREK, deskripsi: SEO.halaman[''].deskripsi, kanonik: null, indeks: false,
      kepala: '<meta name="robots" content="noindex, follow">',
      isi: '<div class="pra"><h1>Halaman tidak ditemukan</h1><p>Tautan ini mungkin sudah berubah. <a href="/">Kembali ke beranda</a>.</p></div>',
    };
  }
  const meta = SEO.halaman[rute];
  const indeks = bolehDiindeks(rute, data);
  const kanonik = ASAL + '/' + rute;
  let isi;
  if (rute === '') isi = htmlBeranda(data);
  else if (DIREKTORI[rute]) isi = htmlDirektori(rute, data);
  else if (rute === 'edukasi') isi = htmlEdukasi();
  else if (rute === 'donasi') isi = htmlDonasi(data);
  else if (rute === 'info') isi = htmlInfo(data);
  else if (rute === 'kontribusi') isi = htmlKontribusi(data);
  else isi = htmlPanduan(rute);
  const remahan = daftarRemah(rute);
  return {
    status: 200, judul: meta.judul, deskripsi: meta.deskripsi, kanonik, indeks,
    kepala: (indeks ? '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">' : '<meta name="robots" content="noindex, follow">') +
      `<meta property="og:url" content="${esc(kanonik)}">` +
      `<script type="application/ld+json">${jsonLd(rute, meta)}</script>`,
    isi: '<div class="pra">' + (remahan ? remah(remahan) : '') + isi + '</div>',
  };
}

/** sitemap.xml: halaman yang boleh diindeks; lastmod hanya untuk halaman yang isinya ikut data. */
export function sitemap(data, disimpanPada) {
  const tanggal = disimpanPada ? disimpanPada.slice(0, 10) : null;
  const rute = ['', ...MENU, ...PANDUAN.map((p) => 'panduan/' + p.slug)].filter((r) => bolehDiindeks(r, data));
  const ikutData = (r) => r === '' || DIREKTORI[r] || r === 'donasi' || r === 'info';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    rute.map((r) => `  <url><loc>${ASAL}/${r}</loc>${tanggal && ikutData(r) ? `<lastmod>${tanggal}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
}
