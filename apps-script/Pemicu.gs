/**
 * Pemicu terpasang (installable) yang dibuat oleh siapkan():
 * - saatFormDikirim: jawaban Form masuk ke tab yang sesuai dengan ID tetap.
 * - saatSheetDiedit: ID, waktu ubah, waktu verifikasi, dan riwayat di tab log.
 */

function saatFormDikirim(e) {
  const peta = JSON.parse(PROP.getProperty('PETA_' + e.source.getId()) || 'null');
  if (!peta) return;

  const jawaban = {};
  e.response.getItemResponses().forEach(function (r) {
    const kolom = peta.item[r.getItem().getId()];
    if (!kolom) return;
    const nilai = r.getResponse();
    jawaban[kolom] = Array.isArray(nilai) ? nilai.join(', ') : String(nilai).trim();
  });

  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    if (peta.tab === 'lapor') terimaLaporan_(jawaban);
    else tambahEntri_(peta.tab, jawaban);
  } finally {
    kunci.releaseLock();
  }
}

function tambahEntri_(tab, jawaban) {
  const sh = lembar_(tab);
  const header = headerSheet_(sh);
  const sekarang = new Date();

  if (jawaban.lokasi) {
    const titik = uraiKoordinat(jawaban.lokasi);
    if (titik) {
      jawaban.lat = titik.lat;
      jawaban.lng = titik.lng;
    } else {
      // Tautan pendek atau teks yang tidak terbaca: simpan untuk dicek relawan.
      jawaban.catatan_internal = [jawaban.catatan_internal, 'Lokasi dari form: ' + jawaban.lokasi]
        .filter(String).join(' | ');
    }
  }
  if (jawaban.pengelola_wa) jawaban.pengelola_wa = normalkanNomorWa(jawaban.pengelola_wa);

  const id = idBerikutnya(SKEMA[tab].awalanId, nilaiKolom_(sh, header, 'id'));
  jawaban.id = id;
  if (header.indexOf('kode') !== -1) jawaban.kode = id;
  jawaban.diubah_pada = sekarang;
  jawaban.tampil = false;

  sh.appendRow(header.map(function (k) { return jawaban[k] === undefined ? '' : jawaban[k]; }));
  tulisLog_(tab, id, '(baru)', '', jawaban.nama || '', 'Google Form');
}

function terimaLaporan_(jawaban) {
  const tab = Object.keys(SKEMA).filter(function (t) { return SKEMA[t].judul === jawaban.bagian; })[0];
  const id = String(jawaban.id || '').trim().toUpperCase();
  const isi = jawaban.isi + (jawaban.kontak ? ' (kontak: ' + jawaban.kontak + ')' : '');
  tulisLog_(tab || jawaban.bagian, id, 'LAPORAN', '', isi, 'Form lapor');
  if (!tab) return;

  const sh = lembar_(tab);
  const header = headerSheet_(sh);
  const baris = nilaiKolom_(sh, header, 'id').indexOf(id);
  if (baris === -1) return;

  // Tandai supaya entri ini muncul di daftar cek ulang relawan hari ini.
  const nomorBaris = baris + 2;
  const kolCatatan = header.indexOf('catatan_internal') + 1;
  const tanggal = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const lama = sh.getRange(nomorBaris, kolCatatan).getValue();
  sh.getRange(nomorBaris, kolCatatan).setValue([lama, '[' + tanggal + '] LAPORAN: ' + isi].filter(String).join('\n'));
  sh.getRange(nomorBaris, header.indexOf('cek_ulang_sebelum') + 1).setValue(new Date());
}

function saatSheetDiedit(e) {
  const sh = e.range.getSheet();
  const tab = sh.getName();
  const s = SKEMA[tab];
  if (!s || tab === 'log' || e.range.getRow() < 2) return;

  const header = headerSheet_(sh);
  const oleh = (e.user && e.user.getEmail && e.user.getEmail()) || 'tidak diketahui';
  const sekarang = new Date();
  const kolomAwal = e.range.getColumn();
  const kolomDiedit = header.slice(kolomAwal - 1, kolomAwal - 1 + e.range.getNumColumns());
  const satuSel = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;

  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    for (let r = 0; r < e.range.getNumRows(); r++) {
      const nomorBaris = e.range.getRow() + r;
      const rentangBaris = sh.getRange(nomorBaris, 1, 1, header.length);
      const nilai = rentangBaris.getValues()[0];
      if (nilai.every(function (v) { return v === '' || v === false; })) continue;
      const baris = {};
      header.forEach(function (k, i) { baris[k] = nilai[i]; });
      const asli = JSON.stringify(nilai);

      if (s.awalanId && !baris.id) {
        baris.id = idBerikutnya(s.awalanId, nilaiKolom_(sh, header, 'id'));
        // Tulis segera supaya baris berikutnya dalam tempelan yang sama mendapat nomor lain.
        sh.getRange(nomorBaris, header.indexOf('id') + 1).setValue(baris.id);
      }
      if (tab === 'ruang' && !baris.kode) baris.kode = baris.id;

      if (s.direktori) {
        const ubahData = kolomDiedit.some(function (k) { return s.kolom.indexOf(k) !== -1; });
        if (ubahData) baris.diubah_pada = sekarang;
        const verifikasi = (kolomDiedit.indexOf('tampil') !== -1 && baris.tampil === true) ||
          (kolomDiedit.indexOf('terverifikasi_oleh') !== -1 && baris.terverifikasi_oleh);
        if (verifikasi) {
          baris.terverifikasi_pada = sekarang;
          baris.cek_ulang_sebelum = tambahHari(sekarang, s.cekUlangHari);
          if (!baris.terverifikasi_oleh) baris.terverifikasi_oleh = oleh;
        }
      }
      if (tab === 'udara') {
        if (kolomDiedit.indexOf('ispu') !== -1) baris.kategori = kategoriIspu(baris.ispu);
        if (!baris.waktu) baris.waktu = sekarang;
      }
      if (tab === 'faq' && kolomDiedit.indexOf('direview_oleh') !== -1) {
        baris.direview_pada = baris.direview_oleh ? sekarang : '';
      }

      const baru = header.map(function (k) { return baris[k]; });
      if (JSON.stringify(baru) !== asli) rentangBaris.setValues([baru]);

      if (satuSel) {
        tulisLog_(tab, baris.id || '', header[kolomAwal - 1], e.oldValue, e.value, oleh);
      } else {
        tulisLog_(tab, baris.id || '', kolomDiedit.join(','), '', '(tempel/ubah banyak sel)', oleh);
      }
    }
  } finally {
    kunci.releaseLock();
  }
}

function tulisLog_(tab, id, kolom, lama, baru, oleh) {
  const potong = function (v) { return v === undefined || v === null ? '' : String(v).slice(0, 500); };
  lembar_('log').appendRow([new Date(), tab, id, kolom, potong(lama), potong(baru), oleh]);
}

function lembar_(tab) {
  return SpreadsheetApp.openById(PROP.getProperty('SHEET_ID')).getSheetByName(tab);
}

function headerSheet_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function nilaiKolom_(sh, header, kolom) {
  const i = header.indexOf(kolom);
  if (i === -1 || sh.getLastRow() < 2) return [];
  return sh.getRange(2, i + 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); });
}
