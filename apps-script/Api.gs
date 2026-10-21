/**
 * Web app Apps Script. Deploy: Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. Hanya Worker yang tahu token-nya.
 *
 * GET  ?token=...                  → JSON kolom publik (lihat susunDataPublik)
 * POST {token, aksi: "status", kode, status, dari} → ubah status ruang
 */

function doGet(e) {
  if (!tokenSah_(e.parameter.token)) return balasJson_({ ok: false, galat: 'token' });
  // Kode baru yang di-deploy otomatis menyesuaikan Sheet dan Form; data tetap dikirim bila gagal.
  try {
    migrasiBilaPerlu_();
  } catch (err) {
    console.error('Migrasi skema gagal: ' + err);
  }
  const ss = SpreadsheetApp.openById(PROP.getProperty('SHEET_ID'));
  const lembar = {};
  Object.keys(SKEMA).forEach(function (tab) {
    if (tab === 'log') return;
    const sh = ss.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 1) return;
    const nilai = sh.getDataRange().getValues();
    lembar[tab] = { header: nilai[0].map(String), baris: nilai.slice(1) };
  });
  return balasJson_(susunDataPublik(lembar, PROP.getProperty('LAPOR_URL_TEMPLAT')));
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
  return balasJson_({ ok: false, galat: 'aksi' });
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
