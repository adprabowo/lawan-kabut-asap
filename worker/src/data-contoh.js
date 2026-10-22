/**
 * Data contoh untuk demo sebelum Google Sheet terisi. Dipakai hanya kalau MODE_CONTOH = "1"
 * dan KV masih kosong. Nama tempat diberi awalan [Contoh]; nomor telepon tempat sengaja kosong.
 */
const jamLalu = (j) => new Date(Date.now() - j * 3600e3).toISOString();
const jamLagi = (j) => new Date(Date.now() + j * 3600e3).toISOString();

export function dataContoh() {
  return {
    versi: 1,
    contoh: true,
    ruang: [
      { id: 'R001', kode: 'R001', nama: '[Contoh] Posko Utama Telanaipura', jenis: 'Posko Utama', kabupaten: 'Kota Jambi', kecamatan: 'Telanaipura', alamat: 'Jl. Contoh No. 1', lat: -1.5966, lng: 103.5852, layanan: 'Pemeriksaan kesehatan, Nebulizer, Oksigen, Masker gratis, Ruang anak', jam_buka: '24 jam', kapasitas: 80, status: 'BUKA', pm25_dalam: 22, diubah_pada: jamLalu(1), terverifikasi_pada: jamLalu(1), cek_ulang_sebelum: jamLagi(23) },
      { id: 'R002', kode: 'R002', nama: '[Contoh] Masjid Al-Ikhlas', jenis: 'Masjid/Mushala', kabupaten: 'Kota Jambi', kecamatan: 'Kota Baru', alamat: 'Jl. Contoh No. 2', lat: -1.6262, lng: 103.6050, layanan: 'Masker gratis, Air minum', jam_buka: '08.00–21.00', kapasitas: 40, status: 'PENUH', pm25_dalam: 41, diubah_pada: jamLalu(3), terverifikasi_pada: jamLalu(3), cek_ulang_sebelum: jamLagi(21) },
      { id: 'R003', kode: 'R003', nama: '[Contoh] SD Negeri 01', jenis: 'Sekolah', kabupaten: 'Kota Jambi', kecamatan: 'Jambi Selatan', alamat: 'Jl. Contoh No. 3', lat: -1.6390, lng: 103.6260, layanan: 'Ruang anak, Air minum', jam_buka: '07.00–17.00', kapasitas: 60, status: 'BUKA', pm25_dalam: null, diubah_pada: jamLalu(30), terverifikasi_pada: jamLalu(30), cek_ulang_sebelum: jamLalu(6) },
      { id: 'R004', kode: 'R004', nama: '[Contoh] Posyandu Melati', jenis: 'Posyandu', kabupaten: 'Muaro Jambi', kecamatan: 'Sekernan', alamat: 'Desa Contoh', lat: -1.5270, lng: 103.4780, layanan: 'Pemeriksaan kesehatan, Ruang anak, Ruang lansia', jam_buka: '08.00–16.00', kapasitas: 25, status: 'BUKA', pm25_dalam: 35, diubah_pada: jamLalu(5), terverifikasi_pada: jamLalu(5), cek_ulang_sebelum: jamLagi(19) },
      { id: 'R005', kode: 'R005', nama: '[Contoh] Balai Warga Sungai Bahar', jenis: 'Balai warga', kabupaten: 'Muaro Jambi', kecamatan: 'Sungai Bahar', alamat: 'Desa Contoh', lat: -1.8460, lng: 103.4180, layanan: 'Masker gratis', jam_buka: '08.00–20.00', kapasitas: 30, status: 'TUTUP', pm25_dalam: null, diubah_pada: jamLalu(10), terverifikasi_pada: jamLalu(10), cek_ulang_sebelum: jamLagi(14) },
    ],
    oksigen: [
      { id: 'O001', nama: '[Contoh] Depot Oksigen Sejahtera', jenis: 'Isi ulang', kabupaten: 'Kota Jambi', kecamatan: 'Jelutung', alamat: 'Jl. Contoh No. 10', lat: -1.6150, lng: 103.6210, kontak_publik: null, harga: 'Rp 50.000 per isi ulang 1 m³', wilayah_antar: 'Kota Jambi', stok: 'Terbatas', diubah_pada: jamLalu(2), terverifikasi_pada: jamLalu(2), cek_ulang_sebelum: jamLagi(22) },
      { id: 'O002', nama: '[Contoh] Sewa Konsentrator Sehat', jenis: 'Konsentrator', kabupaten: 'Kota Jambi', kecamatan: 'Alam Barajo', alamat: 'Jl. Contoh No. 11', lat: -1.6280, lng: 103.5700, kontak_publik: null, harga: 'Rp 75.000 per hari', wilayah_antar: 'Kota Jambi, Muaro Jambi', stok: 'Tersedia', diubah_pada: jamLalu(4), terverifikasi_pada: jamLalu(4), cek_ulang_sebelum: jamLagi(20) },
    ],
    air_bersih: [
      { id: 'A001', nama: '[Contoh] Depot Air Tirta', jenis: 'Depot', kabupaten: 'Kota Jambi', kecamatan: 'Kota Baru', kontak_publik: null, harga: 'Rp 5.000 per galon', wilayah_layanan: 'Kota Baru, Alam Barajo', diubah_pada: jamLalu(8), terverifikasi_pada: jamLalu(8), cek_ulang_sebelum: jamLagi(64) },
      { id: 'A002', nama: '[Contoh] Tangki Air BPBD', jenis: 'BPBD', kabupaten: 'Muaro Jambi', kecamatan: 'Sekernan', kontak_publik: null, harga: 'Gratis', wilayah_layanan: 'Desa terdampak di Sekernan', diubah_pada: jamLalu(20), terverifikasi_pada: jamLalu(20), cek_ulang_sebelum: jamLagi(52) },
    ],
    kontak_darurat: [
      { id: 'K001', nama: '[Contoh] RSUD Kota', jenis: 'Rumah sakit', kabupaten: 'Kota Jambi', kecamatan: 'Telanaipura', alamat: 'Jl. Contoh No. 20', lat: -1.6045, lng: 103.5905, telepon: null, jam_layanan: 'IGD 24 jam, poli 08.00–14.00', layanan: 'IGD 24 jam, Poli paru, Poli anak, Nebulizer, Oksigen, Rawat inap', wilayah_layanan: null, biaya: null, diubah_pada: jamLalu(20), terverifikasi_pada: jamLalu(20), cek_ulang_sebelum: jamLagi(316) },
      { id: 'K002', nama: '[Contoh] Puskesmas Kota Baru', jenis: 'Puskesmas', kabupaten: 'Kota Jambi', kecamatan: 'Kota Baru', alamat: 'Jl. Contoh No. 21', lat: -1.6300, lng: 103.6020, telepon: null, jam_layanan: '07.30–14.00', layanan: 'Poli anak, Nebulizer', wilayah_layanan: null, biaya: null, diubah_pada: jamLalu(30), terverifikasi_pada: jamLalu(30), cek_ulang_sebelum: jamLagi(306) },
      { id: 'K003', nama: '[Contoh] Klinik Pratama Sehat', jenis: 'Klinik', kabupaten: 'Kota Jambi', kecamatan: 'Jambi Selatan', alamat: 'Jl. Contoh No. 22', lat: -1.6420, lng: 103.6250, telepon: null, jam_layanan: '08.00–21.00', layanan: 'Nebulizer', wilayah_layanan: null, biaya: null, diubah_pada: jamLalu(40), terverifikasi_pada: jamLalu(40), cek_ulang_sebelum: jamLagi(296) },
      { id: 'K004', nama: '[Contoh] Posko Kesehatan Sekernan', jenis: 'Posko kesehatan', kabupaten: 'Muaro Jambi', kecamatan: 'Sekernan', alamat: 'Desa Contoh', lat: -1.5280, lng: 103.4790, telepon: null, jam_layanan: '24 jam', layanan: 'Oksigen, Nebulizer', wilayah_layanan: null, biaya: null, diubah_pada: jamLalu(6), terverifikasi_pada: jamLalu(6), cek_ulang_sebelum: jamLagi(330) },
      { id: 'K005', nama: '[Contoh] Ambulans Dinas Kesehatan', jenis: 'Ambulans', kabupaten: 'Kota Jambi', kecamatan: null, alamat: null, lat: null, lng: null, telepon: null, jam_layanan: '24 jam', layanan: null, wilayah_layanan: 'Seluruh Kota Jambi', biaya: 'Gratis untuk gawat darurat', diubah_pada: jamLalu(12), terverifikasi_pada: jamLalu(12), cek_ulang_sebelum: jamLagi(324) },
      { id: 'K006', nama: '[Contoh] Ambulans PMI', jenis: 'Ambulans', kabupaten: 'Kota Jambi', kecamatan: null, alamat: null, lat: null, lng: null, telepon: null, jam_layanan: '24 jam', layanan: null, wilayah_layanan: 'Kota Jambi dan Muaro Jambi', biaya: 'Rp 150.000 dalam kota', diubah_pada: jamLalu(15), terverifikasi_pada: jamLalu(15), cek_ulang_sebelum: jamLagi(321) },
      { id: 'K007', nama: '[Contoh] Ambulans Desa Sekernan', jenis: 'Ambulans', kabupaten: 'Muaro Jambi', kecamatan: 'Sekernan', alamat: null, lat: null, lng: null, telepon: null, jam_layanan: '06.00–22.00', layanan: null, wilayah_layanan: 'Kecamatan Sekernan', biaya: 'Gratis', diubah_pada: jamLalu(26), terverifikasi_pada: jamLalu(26), cek_ulang_sebelum: jamLagi(310) },
      { id: 'K008', nama: '[Contoh] BPBD Kota', jenis: 'BPBD', kabupaten: 'Kota Jambi', kecamatan: null, alamat: 'Jl. Contoh No. 30', lat: null, lng: null, telepon: null, jam_layanan: '24 jam', layanan: null, wilayah_layanan: null, biaya: null, diubah_pada: jamLalu(48), terverifikasi_pada: jamLalu(48), cek_ulang_sebelum: jamLagi(288) },
    ],
    info: [
      { id: 'I002', tanggal: jamLalu(3), judul: '[Contoh] Posko kesehatan gratis dibuka di Kelurahan Contoh', isi: 'Pemeriksaan ISPA dan nebulizer gratis setiap hari pukul 08.00–16.00 selama status siaga asap.', sumber: '[Contoh] Akun resmi kelurahan', kabupaten: 'Kota Jambi', tautan: null, label_tautan: null, diubah_pada: jamLalu(3), terverifikasi_pada: jamLalu(2), cek_ulang_sebelum: jamLagi(160) },
      { id: 'I001', tanggal: jamLalu(26), judul: '[Contoh] Pembagian masker N95 untuk kelompok rentan', isi: 'Bayi, lansia, dan ibu hamil dapat mengambil masker di posko utama dengan membawa KK.', sumber: '[Contoh] Dinas Kesehatan', kabupaten: 'Seluruh Provinsi Jambi', tautan: null, label_tautan: null, diubah_pada: jamLalu(26), terverifikasi_pada: jamLalu(25), cek_ulang_sebelum: jamLagi(140) },
    ],
    donasi: [
      { id: 'D001', jenis: 'Barang', nama: '[Contoh] Masker N95', detail: 'Ukuran dewasa dan anak', atas_nama: null, target: 5000, terkumpul: 1850, satuan: 'buah', prioritas: 'Mendesak', lokasi_antar: '[Contoh] Posko Utama Telanaipura', kontak_publik: null, diubah_pada: jamLalu(2), terverifikasi_pada: jamLalu(2), cek_ulang_sebelum: jamLagi(70) },
      { id: 'D002', jenis: 'Barang', nama: '[Contoh] Filter udara MERV 13', detail: 'Ukuran 20×20 inci, untuk Kotak Udara Bersih di ruang komunal', atas_nama: null, target: 400, terkumpul: 96, satuan: 'lembar', prioritas: 'Mendesak', lokasi_antar: '[Contoh] Posko Utama Telanaipura', kontak_publik: null, diubah_pada: jamLalu(5), terverifikasi_pada: jamLalu(5), cek_ulang_sebelum: jamLagi(67) },
      { id: 'D003', jenis: 'Barang', nama: '[Contoh] Kipas angin kotak 20 inci', detail: 'Untuk Kotak Udara Bersih', atas_nama: null, target: 100, terkumpul: 41, satuan: 'unit', prioritas: 'Tinggi', lokasi_antar: '[Contoh] Posko Utama Telanaipura', kontak_publik: null, diubah_pada: jamLalu(9), terverifikasi_pada: jamLalu(9), cek_ulang_sebelum: jamLagi(63) },
      { id: 'D004', jenis: 'Barang', nama: '[Contoh] Air minum kemasan', detail: 'Untuk pengungsi di ruang aman', atas_nama: null, target: 1000, terkumpul: 820, satuan: 'dus', prioritas: 'Biasa', lokasi_antar: '[Contoh] Posko Kesehatan Sekernan', kontak_publik: null, diubah_pada: jamLalu(20), terverifikasi_pada: jamLalu(20), cek_ulang_sebelum: jamLagi(52) },
      { id: 'D005', jenis: 'Rekening', nama: '[Contoh] Bank Contoh', detail: '0000 0000 00', atas_nama: '[Contoh] IA-ITB Jambi Peduli Asap', target: null, terkumpul: null, satuan: null, prioritas: null, lokasi_antar: null, kontak_publik: null, diubah_pada: jamLalu(30), terverifikasi_pada: jamLalu(30), cek_ulang_sebelum: jamLagi(42) },
    ],
    udara: [
      { waktu: jamLalu(1), lokasi: 'Kota Jambi', ispu: 303, kategori: 'Berbahaya', sumber: 'contoh' },
      { waktu: jamLalu(2), lokasi: 'Muaro Jambi', ispu: 245, kategori: 'Sangat Tidak Sehat', sumber: 'contoh' },
      { waktu: jamLalu(3), lokasi: 'Batang Hari', ispu: 168, kategori: 'Tidak Sehat', sumber: 'contoh' },
    ],
    faq: [],
    lapor_url: null,
  };
}
