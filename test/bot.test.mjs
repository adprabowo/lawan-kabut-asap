// Menguji penyusun data bot WhatsApp (bot/data-bot.mjs): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diLuarJamBuka, susun } from '../bot/data-bot.mjs';

// 22 Oktober 2026 20.00 WIB
const MALAM = Date.UTC(2026, 9, 22, 13, 0);
const SIANG = Date.UTC(2026, 9, 22, 5, 0);

const DATA = {
  ruang: [{ nama: 'Yayasan A', kabupaten: 'Kota Jambi', status: 'BUKA', jam_buka: '09.30 - 16.30 WIB', terverifikasi_pada: '2026-10-21T13:23:00Z' }],
  kontak_darurat: [
    { nama: 'RSUD B', jenis: 'Rumah sakit', kabupaten: 'Bungo', telepon: '0747-1', layanan: 'IGD 24 jam' },
    { nama: 'Puskesmas C', jenis: 'Puskesmas', kabupaten: 'Bungo', alamat: '-' },
    { nama: 'Darurat', jenis: 'Lainnya', telepon: '112' },
  ],
  udara: [{ waktu: '2026-10-22T02:00:00Z', lokasi: 'Kota Jambi', ispu: 202, kategori: 'Sangat Tidak Sehat', sumber: 'PM2.5 BMKG', pm25: 152.2 }],
};

test('jam buka dibaca dalam WIB', () => {
  assert.equal(diLuarJamBuka('09.30 - 16.30 WIB', SIANG), false);
  assert.equal(diLuarJamBuka('09.30 - 16.30 WIB', MALAM), true);
  assert.equal(diLuarJamBuka('24 jam', MALAM), false);
});

test('susun: status kini, tanda cek relawan, nomor nasional dibuang, umur ISPU', () => {
  const malam = susun(DATA, MALAM);
  assert.match(malam, /\*Yayasan A\*.*status DI LUAR JAM BUKA/);
  assert.match(malam, /✓ dicek relawan 21 Oktober/);
  assert.match(susun(DATA, SIANG), /status BUKA;/);
  assert.match(malam, /\*RSUD B\* \(Rumah sakit\), Bungo; layanan: IGD 24 jam; telp 0747-1$/m);
  assert.match(malam, /\*Puskesmas C\* \(Puskesmas\), Bungo$/m, 'alamat "-" tidak ditulis');
  assert.doesNotMatch(malam, /Darurat/);
  assert.match(malam, /ISPU 202.*SUDAH 11 JAM/);
  assert.match(malam, /JANGAN menyebut rekening/);
  assert.match(malam, /^# Data terkini/);
  assert.match(malam, /JANGAN memberi tautan formulir/);
  const lengkap = susun({ ...DATA, info: [{ judul: 'Posko baru', sumber: 'BPBD', tanggal: '2026-10-22T02:00:00Z', isi: 'Buka\n24 jam', tautan: 'javascript:x' }],
    form_url: { relawan: 'https://forms.gle/r', info: 'ftp://x' } }, MALAM);
  assert.match(lengkap, /- \*Posko baru\* \(BPBD, 22 Oktober\): Buka 24 jam$/m);
  assert.match(lengkap, /- Daftar jadi relawan: https:\/\/forms\.gle\/r/);
  assert.doesNotMatch(lengkap, /ftp:|javascript:/);
});
