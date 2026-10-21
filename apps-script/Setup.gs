/**
 * Jalankan siapkan() sekali dari editor Apps Script (akun organisasi).
 * Aman dijalankan ulang: tab, Form, dan pemicu yang sudah ada tidak digandakan.
 */

const PROP = PropertiesService.getScriptProperties();

// Label pertanyaan Form untuk setiap kolom. "lokasi" diurai menjadi lat dan lng.
const LABEL_FORM = {
  nama: 'Nama tempat atau penyedia',
  jenis: 'Jenis',
  kabupaten: 'Kabupaten/kota',
  kecamatan: 'Kecamatan',
  alamat: 'Alamat lengkap',
  lokasi: 'Titik lokasi: tautan Google Maps atau koordinat (contoh: -1.6101, 103.6131)',
  layanan: 'Layanan yang tersedia',
  jam_buka: 'Jam buka (contoh: 24 jam, atau 08.00–17.00)',
  kapasitas: 'Kapasitas (jumlah orang)',
  status: 'Status saat ini',
  pengelola_wa: 'Nomor WhatsApp pengelola (TIDAK ditampilkan ke publik; dipakai untuk perintah BUKA/PENUH/TUTUP)',
  kontak_publik: 'Nomor kontak yang boleh ditampilkan ke publik',
  harga: 'Harga (contoh: Rp 50.000 per isi ulang, atau gratis)',
  wilayah_antar: 'Wilayah antar',
  wilayah_layanan: 'Wilayah layanan',
  stok: 'Stok saat ini',
  telepon: 'Nomor telepon',
  jam_layanan: 'Jam layanan',
  biaya: 'Biaya (contoh: gratis, atau Rp 150.000 dalam kota)',
  catatan_internal: 'Catatan untuk relawan verifikasi (tidak ditampilkan ke publik)',
};

// Urutan pertanyaan Form per tab direktori. Tab tanpa entri di sini (donasi) tidak punya Form.
const PERTANYAAN_FORM = {
  ruang: ['nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lokasi', 'layanan', 'jam_buka',
    'kapasitas', 'status', 'pengelola_wa', 'catatan_internal'],
  oksigen: ['nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lokasi', 'kontak_publik',
    'harga', 'wilayah_antar', 'stok', 'catatan_internal'],
  air_bersih: ['nama', 'jenis', 'kabupaten', 'kecamatan', 'kontak_publik', 'harga',
    'wilayah_layanan', 'catatan_internal'],
  kontak_darurat: ['nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lokasi', 'telepon',
    'jam_layanan', 'layanan', 'wilayah_layanan', 'biaya', 'catatan_internal'],
};

const WAJIB_FORM = ['nama', 'jenis', 'kabupaten'];
const PARAGRAF_FORM = ['alamat', 'catatan_internal'];
const KOLOM_WAKTU = ['diubah_pada', 'terverifikasi_pada', 'cek_ulang_sebelum', 'waktu', 'direview_pada'];

function siapkan() {
  const ss = siapkanStruktur_();
  pasangPemicu_(ss);
  PROP.setProperty('SIDIK_SKEMA', sidikSkema_());
  if (!PROP.getProperty('API_TOKEN')) buatTokenApi();
  cetakRingkasan();
}

/** Tab, kolom, validasi, dan Form sesuai SKEMA. Mengembalikan spreadsheet-nya. */
function siapkanStruktur_() {
  const ss = ambilSpreadsheet_();
  Object.keys(SKEMA).forEach(function (tab) { siapkanTab_(ss, tab); });
  hapusLembarBawaan_(ss);
  let formBaru = false;
  Object.keys(PERTANYAAN_FORM).forEach(function (tab) {
    formBaru = siapkanFormDirektori_(ss, tab) || formBaru;
    lengkapiForm_(tab);
  });
  formBaru = siapkanFormLapor_(ss) || formBaru;
  // Form baru butuh pemicu onFormSubmit; pemicu lama dibiarkan bila tidak ada Form baru.
  if (formBaru) pasangPemicu_(ss);
  return ss;
}

// Berubah setiap kali SKEMA, urutan pertanyaan, atau label Form di kode berubah.
function sidikSkema_() {
  const teks = JSON.stringify([SKEMA, PERTANYAAN_FORM, LABEL_FORM]);
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, teks));
}

/**
 * Menyesuaikan Sheet dan Form dengan kode terbaru tanpa siapkan() manual. Dipanggil doGet,
 * yang diakses Worker tiap 5 menit; bekerja hanya bila sidik skema berubah sejak migrasi terakhir.
 */
function migrasiBilaPerlu_() {
  const sidik = sidikSkema_();
  if (PROP.getProperty('SIDIK_SKEMA') === sidik) return;
  const kunci = LockService.getScriptLock();
  if (!kunci.tryLock(1000)) return;
  try {
    if (PROP.getProperty('SIDIK_SKEMA') === sidik) return;
    siapkanStruktur_();
    PROP.setProperty('SIDIK_SKEMA', sidik);
    console.log('Migrasi skema selesai: ' + sidik);
  } finally {
    kunci.releaseLock();
  }
}

function ambilSpreadsheet_() {
  const id = PROP.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('Siaga Asap Jambi — Data');
  ss.setSpreadsheetTimeZone('Asia/Jakarta');
  ss.setSpreadsheetLocale('in_ID');
  PROP.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function siapkanTab_(ss, tab) {
  const header = headerTab(tab);
  let sh = ss.getSheetByName(tab);
  if (!sh) sh = ss.insertSheet(tab);

  const ada = sh.getLastColumn() > 0
    ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String)
    : [];
  if (ada.length === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  } else {
    // Tambahkan kolom yang belum ada di ujung kanan; kolom lama tidak dipindah.
    const kurang = header.filter(function (k) { return ada.indexOf(k) === -1; });
    if (kurang.length) sh.getRange(1, ada.length + 1, 1, kurang.length).setValues([kurang]);
  }

  const kolomSheet = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const barisData = sh.getMaxRows() - 1;
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, kolomSheet.length).setFontWeight('bold').setBackground('#e8eef7');

  const s = SKEMA[tab];
  kolomSheet.forEach(function (k, i) {
    const kol = i + 1;
    const badan = sh.getRange(2, kol, barisData, 1);
    if (s.pilihan && s.pilihan[k]) {
      badan.setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(s.pilihan[k], true).setAllowInvalid(false).build());
    }
    // Validasi kotak centang, bukan insertCheckboxes(): yang terakhir mengosongkan semua centang
    // setiap kali siapkan() dijalankan ulang, sehingga data terverifikasi hilang dari web.
    if (k === 'tampil') badan.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    if (KOLOM_WAKTU.indexOf(k) !== -1) badan.setNumberFormat('yyyy-mm-dd hh:mm');
    if (k === 'lat' || k === 'lng') badan.setNumberFormat('0.000000');
    // Nomor telepon disimpan sebagai teks supaya angka 0 di depan tidak hilang.
    if (['pengelola_wa', 'kontak_publik', 'telepon'].indexOf(k) !== -1) badan.setNumberFormat('@');
    if (KOLOM_PRIVAT.indexOf(k) !== -1) {
      sh.getRange(1, kol).setBackground('#f4cccc').setNote('Privat: tidak pernah dikirim ke web atau bot.');
    }
  });
  if (tab === 'log') {
    sh.getRange(1, 1, 1, kolomSheet.length).setBackground('#f4cccc');
    sh.getRange(1, 1).setNote('Seluruh tab ini privat.');
  }
}

function hapusLembarBawaan_(ss) {
  ['Sheet1', 'Lembar1', 'Sheet 1'].forEach(function (nama) {
    const sh = ss.getSheetByName(nama);
    if (sh && ss.getSheets().length > 1 && sh.getLastRow() === 0) ss.deleteSheet(sh);
  });
}

function siapkanFormDirektori_(ss, tab) {
  const kunci = 'FORM_' + tab;
  if (PROP.getProperty(kunci)) return false;

  const s = SKEMA[tab];
  const form = FormApp.create(judulForm_(s));
  form.setDescription('Formulir relawan Siaga Asap Jambi. Data baru tidak langsung tampil: ' +
    'relawan verifikasi akan mengecek dulu sebelum mencentang kolom "tampil".');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);

  const peta = {};
  PERTANYAAN_FORM[tab].forEach(function (k) {
    peta[tambahPertanyaan_(form, s, k).getId()] = k;
  });

  PROP.setProperty(kunci, form.getId());
  PROP.setProperty('PETA_' + form.getId(), JSON.stringify({ tab: tab, item: peta }));
  pindahkanKeFolderSheet_(ss, form.getId());
  return true;
}

function judulForm_(s) {
  return 'Input Data: ' + (s.judulForm || s.judul) + ' — Siaga Asap Jambi';
}

function tambahPertanyaan_(form, s, k) {
  const label = LABEL_FORM[k];
  let item;
  if (s.pilihan[k]) {
    item = form.addListItem().setTitle(label).setChoiceValues(s.pilihan[k]);
  } else if (s.pilihanGanda && s.pilihanGanda[k]) {
    item = form.addCheckboxItem().setTitle(label).setChoiceValues(s.pilihanGanda[k]);
  } else if (PARAGRAF_FORM.indexOf(k) !== -1) {
    item = form.addParagraphTextItem().setTitle(label);
  } else {
    item = form.addTextItem().setTitle(label);
  }
  if (WAJIB_FORM.indexOf(k) !== -1) item.setRequired(true);
  return item;
}

/**
 * Form yang sudah ada mendapat pertanyaan yang baru ditambahkan ke PERTANYAAN_FORM,
 * di posisi sesuai urutannya. Jawaban lama tidak berubah.
 */
function lengkapiForm_(tab) {
  const formId = PROP.getProperty('FORM_' + tab);
  if (!formId) return;
  const kunciPeta = 'PETA_' + formId;
  const peta = JSON.parse(PROP.getProperty(kunciPeta));
  const form = FormApp.openById(formId);
  const s = SKEMA[tab];
  if (form.getTitle() !== judulForm_(s)) form.setTitle(judulForm_(s));

  const itemUntuk = function (kolom) {
    const id = Object.keys(peta.item).filter(function (i) { return peta.item[i] === kolom; })[0];
    return id ? form.getItemById(Number(id)) : null;
  };

  const urutan = PERTANYAAN_FORM[tab];
  urutan.forEach(function (k, i) {
    const ada = itemUntuk(k);
    if (ada) {
      // Pilihan jawaban mengikuti SKEMA terbaru, misalnya jenis tempat yang baru ditambahkan.
      if (s.pilihan[k]) ada.asListItem().setChoiceValues(s.pilihan[k]);
      else if (s.pilihanGanda && s.pilihanGanda[k]) ada.asCheckboxItem().setChoiceValues(s.pilihanGanda[k]);
      return;
    }
    const item = tambahPertanyaan_(form, s, k);
    peta.item[item.getId()] = k;
    const sebelum = i > 0 ? itemUntuk(urutan[i - 1]) : null;
    form.moveItem(item.getIndex(), sebelum ? sebelum.getIndex() + 1 : 0);
  });
  PROP.setProperty(kunciPeta, JSON.stringify(peta));
}

function siapkanFormLapor_(ss) {
  if (PROP.getProperty('FORM_lapor')) return false;

  const judulDirektori = Object.keys(PERTANYAAN_FORM).map(function (t) { return SKEMA[t].judul; });
  const form = FormApp.create('Laporkan Data Salah — Siaga Asap Jambi');
  form.setDescription('Terima kasih sudah membantu menjaga data tetap benar. ' +
    'Relawan akan mengecek laporan Anda.');
  const itemTab = form.addListItem().setTitle('Bagian').setChoiceValues(judulDirektori).setRequired(true);
  const itemId = form.addTextItem().setTitle('Kode data (terisi otomatis dari web)').setRequired(true);
  const itemIsi = form.addParagraphTextItem().setTitle('Apa yang salah atau berubah?').setRequired(true);
  const itemKontak = form.addTextItem().setTitle('Kontak Anda (opsional, untuk konfirmasi)');

  // Tautan isian awal: web mengganti {bagian} dan {kode} saat tombol "laporkan" ditekan.
  // ID entri berbeda dari ID item, jadi diambil dari tautan isian awal satu per satu.
  const entri = function (respons) {
    const url = form.createResponse().withItemResponse(respons).toPrefilledUrl();
    return /entry\.(\d+)=/.exec(url)[1];
  };
  const entriBagian = entri(itemTab.createResponse(judulDirektori[0]));
  const entriKode = entri(itemId.createResponse('X'));
  const templat = form.getPublishedUrl() + '?usp=pp_url' +
    '&entry.' + entriBagian + '={bagian}&entry.' + entriKode + '={kode}';

  PROP.setProperty('FORM_lapor', form.getId());
  PROP.setProperty('LAPOR_URL_TEMPLAT', templat);
  PROP.setProperty('PETA_' + form.getId(), JSON.stringify({
    tab: 'lapor',
    item: {
      [itemTab.getId()]: 'bagian',
      [itemId.getId()]: 'id',
      [itemIsi.getId()]: 'isi',
      [itemKontak.getId()]: 'kontak',
    },
  }));
  pindahkanKeFolderSheet_(ss, form.getId());
  return true;
}

function pindahkanKeFolderSheet_(ss, fileId) {
  const induk = DriveApp.getFileById(ss.getId()).getParents();
  if (induk.hasNext()) DriveApp.getFileById(fileId).moveTo(induk.next());
}

function pasangPemicu_(ss) {
  const fungsiKami = ['saatSheetDiedit', 'saatFormDikirim'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (fungsiKami.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('saatSheetDiedit').forSpreadsheet(ss).onEdit().create();
  Object.keys(PERTANYAAN_FORM).concat(['lapor']).forEach(function (tab) {
    const formId = PROP.getProperty('FORM_' + tab);
    if (formId) ScriptApp.newTrigger('saatFormDikirim').forForm(formId).onFormSubmit().create();
  });
}

/** Cetak tautan Sheet dan Form ke log eksekusi. */
function cetakRingkasan() {
  const ss = SpreadsheetApp.openById(PROP.getProperty('SHEET_ID'));
  const baris = ['Sheet: ' + ss.getUrl()];
  Object.keys(PERTANYAAN_FORM).concat(['lapor']).forEach(function (tab) {
    const formId = PROP.getProperty('FORM_' + tab);
    if (!formId) return;
    const form = FormApp.openById(formId);
    baris.push('Form ' + tab + ': ' + form.getPublishedUrl() + '  (edit: ' + form.getEditUrl() + ')');
  });
  baris.push('Templat tautan lapor: ' + PROP.getProperty('LAPOR_URL_TEMPLAT'));
  Logger.log(baris.join('\n'));
}
