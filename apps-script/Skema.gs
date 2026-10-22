/**
 * Skema Google Sheet Siaga Asap Jambi.
 * Satu-satunya tempat yang mendefinisikan tab, kolom, pilihan dropdown, dan
 * kolom privat. Setup.gs, Pemicu.gs, dan (nanti) Api.gs membaca dari sini.
 */

const KABUPATEN = [
  'Kota Jambi',
  'Kota Sungai Penuh',
  'Batang Hari',
  'Bungo',
  'Kerinci',
  'Merangin',
  'Muaro Jambi',
  'Sarolangun',
  'Tanjung Jabung Barat',
  'Tanjung Jabung Timur',
  'Tebo',
];

// Kolom verifikasi yang ditambahkan di akhir setiap tab direktori.
const KOLOM_VERIFIKASI = [
  'diubah_pada',
  'tampil',
  'terverifikasi_pada',
  'terverifikasi_oleh',
  'cek_ulang_sebelum',
  'catatan_internal',
];

// Kolom yang tidak pernah keluar dari Apps Script.
const KOLOM_PRIVAT = ['pengelola_wa', 'terverifikasi_oleh', 'catatan_internal', 'tampil', 'kontak_pengirim'];

const SKEMA = {
  ruang: {
    judul: 'Ruang Aman Asap',
    direktori: true,
    awalanId: 'R',
    cekUlangHari: 1,
    kolom: ['id', 'kode', 'nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lat', 'lng',
      'layanan', 'jam_buka', 'kapasitas', 'status', 'pm25_dalam', 'pengelola_wa'],
    pilihan: {
      jenis: ['Posko Utama', 'Sekolah', 'Masjid/Mushala', 'Rumah ibadah lain', 'Posyandu',
        'Balai warga', 'Kantor', 'Yayasan/komunitas', 'Lainnya'],
      status: ['BUKA', 'PENUH', 'TUTUP'],
      kabupaten: KABUPATEN,
    },
    pilihanGanda: {
      layanan: ['Pemeriksaan kesehatan', 'Nebulizer', 'Oksigen', 'Masker gratis',
        'Air minum', 'Ruang anak', 'Ruang lansia', 'Tempat tidur'],
    },
  },
  oksigen: {
    judul: 'Penyedia Oksigen',
    direktori: true,
    awalanId: 'O',
    cekUlangHari: 1,
    kolom: ['id', 'nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lat', 'lng',
      'kontak_publik', 'harga', 'wilayah_antar', 'stok'],
    pilihan: {
      jenis: ['Isi ulang', 'Sewa', 'Jual', 'Konsentrator'],
      stok: ['Tersedia', 'Terbatas', 'Habis'],
      kabupaten: KABUPATEN,
    },
  },
  air_bersih: {
    judul: 'Penyedia Air Bersih',
    direktori: true,
    awalanId: 'A',
    cekUlangHari: 3,
    kolom: ['id', 'nama', 'jenis', 'kabupaten', 'kecamatan', 'kontak_publik', 'harga',
      'wilayah_layanan'],
    pilihan: {
      jenis: ['Depot', 'Tangki', 'PDAM', 'BPBD'],
      kabupaten: KABUPATEN,
    },
  },
  // Web memecah tab ini menjadi tiga menu menurut jenis: faskes, ambulans, dan kontak lain.
  kontak_darurat: {
    judul: 'Kontak Darurat',
    judulForm: 'Faskes, Ambulans, dan Kontak Darurat',
    direktori: true,
    awalanId: 'K',
    cekUlangHari: 14,
    kolom: ['id', 'nama', 'jenis', 'kabupaten', 'kecamatan', 'alamat', 'lat', 'lng', 'telepon', 'jam_layanan',
      'layanan', 'wilayah_layanan', 'biaya'],
    pilihan: {
      jenis: ['Rumah sakit', 'Puskesmas', 'Klinik', 'Ambulans', 'BPBD', 'Damkar', 'Polisi',
        'Posko kesehatan', 'Lainnya'],
      kabupaten: KABUPATEN,
    },
    pilihanGanda: {
      layanan: ['IGD 24 jam', 'Poli paru', 'Poli anak', 'Nebulizer', 'Oksigen', 'Rawat inap', 'Ambulans'],
    },
  },
  // Diisi pengurus langsung di Sheet (tanpa Form publik). "Barang" = kebutuhan dengan target dan
  // jumlah terkumpul; "Rekening" = saluran donasi uang (nama bank di `nama`, nomor di `detail`).
  donasi: {
    judul: 'Donasi',
    direktori: true,
    awalanId: 'D',
    cekUlangHari: 3,
    kolom: ['id', 'jenis', 'nama', 'detail', 'atas_nama', 'target', 'terkumpul', 'satuan', 'prioritas',
      'lokasi_antar', 'kontak_publik'],
    pilihan: {
      jenis: ['Barang', 'Rekening'],
      prioritas: ['Mendesak', 'Tinggi', 'Biasa'],
    },
  },
  // Kabar penting untuk warga (posko baru, layanan gratis, pengumuman resmi). Warga bisa mengirim
  // lewat Form "Tambahkan info"; tampil setelah relawan mengecek sumbernya dan mencentang `tampil`.
  info: {
    judul: 'Informasi Terbaru',
    judulForm: 'Kirim Informasi Terbaru',
    direktori: true,
    awalanId: 'I',
    cekUlangHari: 7,
    kolom: ['id', 'tanggal', 'judul', 'isi', 'sumber', 'kabupaten', 'tautan', 'label_tautan', 'kontak_pengirim'],
    pilihan: {
      kabupaten: ['Seluruh Provinsi Jambi'].concat(KABUPATEN),
    },
    labelForm: {
      kabupaten: 'Wilayah yang dimaksud',
    },
  },
  // Pendaftar relawan dari Form "Daftar Jadi Relawan". Seluruh tab privat (data pribadi):
  // tidak pernah keluar dari Apps Script. Koordinator mengisi `status` setelah menghubungi.
  relawan: {
    judul: 'Pendaftar Relawan',
    privat: true,
    awalanId: 'V',
    kolom: ['id', 'waktu', 'nama', 'wa', 'kabupaten', 'kecamatan', 'bidang', 'waktu_luang', 'pengalaman',
      'status', 'catatan_internal'],
    pilihan: {
      kabupaten: KABUPATEN,
      status: ['Baru', 'Sudah dihubungi', 'Aktif', 'Tidak aktif'],
    },
    pilihanGanda: {
      bidang: ['Mendata dan mengecek tempat', 'Menjaga Ruang Aman Asap', 'Tenaga kesehatan',
        'Logistik dan antar barang', 'Menjawab pertanyaan warga', 'Desain dan media sosial', 'Lainnya'],
    },
    labelForm: {
      nama: 'Nama lengkap',
      kabupaten: 'Domisili (kabupaten/kota)',
    },
  },
  udara: {
    judul: 'ISPU Terbaru',
    kolom: ['waktu', 'lokasi', 'ispu', 'kategori', 'sumber'],
    pilihan: {
      lokasi: KABUPATEN,
      kategori: ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'],
    },
  },
  faq: {
    judul: 'Panduan dan Tanya-Jawab',
    awalanId: 'F',
    kolom: ['id', 'pertanyaan', 'jawaban', 'kata_kunci', 'direview_oleh', 'direview_pada'],
    pilihan: {},
  },
  log: {
    judul: 'Riwayat Perubahan',
    kolom: ['waktu', 'tab', 'id', 'kolom', 'nilai_lama', 'nilai_baru', 'oleh'],
    pilihan: {},
  },
};

/** Daftar header lengkap sebuah tab, termasuk kolom verifikasi untuk tab direktori. */
function headerTab(tab) {
  const s = SKEMA[tab];
  return s.direktori ? s.kolom.concat(KOLOM_VERIFIKASI) : s.kolom.slice();
}

/** Kolom yang boleh dikeluarkan doGet. Tab log dan tab privat (relawan) tidak punya kolom publik. */
function kolomPublik(tab) {
  if (!tabPublik(tab)) return [];
  return headerTab(tab).filter(function (k) { return KOLOM_PRIVAT.indexOf(k) === -1; });
}

/** Tab yang ikut dikirim doGet. */
function tabPublik(tab) {
  return tab !== 'log' && !SKEMA[tab].privat;
}
