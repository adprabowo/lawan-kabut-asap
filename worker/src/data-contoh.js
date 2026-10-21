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
      { id: 'K001', nama: 'Layanan Darurat Terpadu', jenis: 'Lainnya', kabupaten: 'Kota Jambi', alamat: null, telepon: '112', jam_layanan: '24 jam', diubah_pada: jamLalu(48), terverifikasi_pada: jamLalu(48), cek_ulang_sebelum: jamLagi(288) },
      { id: 'K002', nama: 'Ambulans / Gawat Darurat Medis', jenis: 'Ambulans', kabupaten: 'Kota Jambi', alamat: null, telepon: '119', jam_layanan: '24 jam', diubah_pada: jamLalu(48), terverifikasi_pada: jamLalu(48), cek_ulang_sebelum: jamLagi(288) },
      { id: 'K003', nama: 'Pemadam Kebakaran', jenis: 'Damkar', kabupaten: 'Kota Jambi', alamat: null, telepon: '113', jam_layanan: '24 jam', diubah_pada: jamLalu(48), terverifikasi_pada: jamLalu(48), cek_ulang_sebelum: jamLagi(288) },
      { id: 'K004', nama: '[Contoh] IGD Rumah Sakit Umum Daerah', jenis: 'Rumah sakit', kabupaten: 'Kota Jambi', alamat: 'Jl. Contoh No. 20', telepon: null, jam_layanan: '24 jam', diubah_pada: jamLalu(48), terverifikasi_pada: jamLalu(48), cek_ulang_sebelum: jamLagi(288) },
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
