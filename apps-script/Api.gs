/**
 * Web app Apps Script. Deploy: Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. Hanya Worker yang tahu token-nya.
 *
 * GET  ?token=...                  → JSON kolom publik (lihat susunDataPublik)
 * GET  ?token=...&mode=admin       → JSON dasbor admin, termasuk kolom privat (susunDataAdmin)
 * POST {token, aksi: "status", kode, status, dari} → ubah status ruang
 * POST {token, aksi: "admin", tab, id, ubah, nilai, oleh} → aksi dasbor admin (perubahanAdmin)
 */

function doGet(e) {
  if (!tokenSah_(e.parameter.token)) return balasJson_({ ok: false, galat: 'token' });
  // Kode baru yang di-deploy otomatis menyesuaikan Sheet dan Form; data tetap dikirim bila gagal.
  try {
    migrasiBilaPerlu_();
  } catch (err) {
    console.error('Migrasi skema gagal: ' + err);
  }
  if (e.parameter.mode === 'admin') return balasJson_(dataAdmin_());
  const ss = SpreadsheetApp.openById(PROP.getProperty('SHEET_ID'));
  const lembar = {};
  Object.keys(SKEMA).forEach(function (tab) {
    if (!tabPublik(tab)) return;
    const sh = ss.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 1) return;
    const nilai = sh.getDataRange().getValues();
    lembar[tab] = { header: nilai[0].map(String), baris: nilai.slice(1) };
  });
  const formUrl = {};
  Object.keys(PERTANYAAN_FORM).forEach(function (tab) {
    const url = PROP.getProperty('URL_FORM_' + tab);
    if (url) formUrl[tab] = url;
  });
  return balasJson_(susunDataPublik(lembar, PROP.getProperty('LAPOR_URL_TEMPLAT'), formUrl));
}

function doPost(e) {
  let masukan;
  try {
    masukan = JSON.parse(e.postData.contents);
  } catch (err) {
    return balasJson_({ ok: false, galat: 'json' });
  }
  if (!tokenSah_(masukan.token)) return balasJson_({ ok: false, galat: 'token' });
  if (masukan.aksi === 'status') return balasJson_(ubahStatusRuang_(masukan));
  if (masukan.aksi === 'admin') return balasJson_(ubahDariAdmin_(masukan));
  return balasJson_({ ok: false, galat: 'aksi' });
}

function dataAdmin_() {
  const ss = SpreadsheetApp.openById(PROP.getProperty('SHEET_ID'));
  const lembar = {};
  tabAdmin().concat(['log']).forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 1) return;
    const nilai = sh.getDataRange().getValues();
    lembar[tab] = { header: nilai[0].map(String), baris: nilai.slice(1), gid: sh.getSheetId() };
  });
  return susunDataAdmin(lembar, new Date(), ss.getUrl());
}

function ubahDariAdmin_(m) {
  const tab = String(m.tab || '');
  const id = String(m.id || '').trim();
  const oleh = String(m.oleh || '').slice(0, 120);
  if (!id || !oleh) return { ok: false, galat: 'id' };
  const perubahan = perubahanAdmin(tab, String(m.ubah || ''), m.nilai, new Date(), oleh);
  if (perubahan.galat) return { ok: false, galat: perubahan.galat };

  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    const sh = lembar_(tab);
    const header = headerSheet_(sh);
    const nomorBaris = nilaiKolom_(sh, header, 'id').map(function (v) { return v.trim(); }).indexOf(id) + 2;
    if (nomorBaris < 2) return { ok: false, galat: 'id' };
    const baris = sh.getRange(nomorBaris, 1, 1, header.length).getValues()[0];
    // Sel per sel, supaya kolom lain (termasuk rumus buatan relawan) tidak ikut ditulis ulang.
    Object.keys(perubahan).forEach(function (k) {
      const i = header.indexOf(k);
      if (i === -1) return;
      const lama = baris[i];
      sh.getRange(nomorBaris, i + 1).setValue(perubahan[k]);
      tulisLog_(tab, id, k, lama instanceof Date ? lama.toISOString() : lama, perubahan[k], 'Admin web ' + oleh);
    });
    return { ok: true, tab: tab, id: id };
  } finally {
    kunci.releaseLock();
  }
}

function ubahStatusRuang_(m) {
  const status = String(m.status || '').toUpperCase();
  const kode = String(m.kode || '').trim().toUpperCase();
  // SKEMA dibaca di dalam fungsi: Apps Script memuat file sesuai urutan di editor.
  if (SKEMA.ruang.pilihan.status.indexOf(status) === -1) return { ok: false, galat: 'status' };

  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    const sh = lembar_('ruang');
    const header = headerSheet_(sh);
    const nomorBaris = nilaiKolom_(sh, header, 'kode')
      .map(function (k) { return k.trim().toUpperCase(); })
      .indexOf(kode) + 2;
    if (nomorBaris < 2) return { ok: false, galat: 'kode' };

    const baris = sh.getRange(nomorBaris, 1, 1, header.length).getValues()[0];
    const ambil = function (k) { return baris[header.indexOf(k)]; };
    if (!bolehUbahStatus(ambil('pengelola_wa'), m.dari)) return { ok: false, galat: 'bukan_pengelola' };

    const lama = ambil('status');
    sh.getRange(nomorBaris, header.indexOf('status') + 1).setValue(status);
    sh.getRange(nomorBaris, header.indexOf('diubah_pada') + 1).setValue(new Date());
    tulisLog_('ruang', ambil('id'), 'status', lama, status, 'WA ' + normalkanNomorWa(m.dari));
    return { ok: true, kode: kode, nama: ambil('nama'), status: status, status_lama: lama };
  } finally {
    kunci.releaseLock();
  }
}

function tokenSah_(token) {
  const benar = PROP.getProperty('API_TOKEN');
  return Boolean(benar) && token === benar;
}

function balasJson_(isi) {
  return ContentService.createTextOutput(JSON.stringify(isi)).setMimeType(ContentService.MimeType.JSON);
}

/** Buat token API baru (dipakai Worker). Jalankan manual kalau token bocor. */
function buatTokenApi() {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PROP.setProperty('API_TOKEN', token);
  Logger.log('API_TOKEN baru (isi ke Worker: npx wrangler secret put APPS_SCRIPT_TOKEN):\n' + token);
}
