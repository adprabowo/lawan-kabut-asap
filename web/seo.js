// Judul (50–60 karakter) dan deskripsi (120–160 karakter) tiap halaman untuk mesin pencari.
// Dipakai web (document.title saat pindah halaman) dan Worker (HTML awal yang dibaca Google).
// `pembuka` adalah paragraf pertama di HTML awal: siapa/apa/di mana dalam satu-dua kalimat.
// Panjangnya diuji oleh npm test (test/seo.test.mjs).
globalThis.SEO = {
  ASAL: 'https://lawanasap.iaitbjambi.org',
  MEREK: 'Lawan Kabut Asap Jambi',
  // Nomor bot WhatsApp (OpenClaw, agen lawan-kabut-asap). Dipakai tombol "Tanya lewat WhatsApp".
  WA_BOT: '6285591643929',
  halaman: {
    '': {
      judul: 'Kabut Asap Jambi Hari Ini: Cek ISPU dan Ruang Aman Asap',
      deskripsi: 'ISPU Jambi hari ini untuk Kota Jambi dan Muaro Jambi, tiap jam dari PM2.5 BMKG. Cari ruang aman asap, rumah sakit, oksigen, dan nomor darurat terdekat.',
      h1: 'Kabut asap Jambi: cek udara dan cari bantuan terdekat',
      pembuka: 'Lawan Kabut Asap adalah web gratis Program Siaga Asap IA-ITB Jambi 2026 untuk warga Provinsi Jambi. Isinya angka ISPU dari pengukuran PM2.5 BMKG, ruang aman asap, rumah sakit dan puskesmas, oksigen, air bersih, nomor darurat, dan panduan kesehatan saat kabut asap.',
    },
    ruang: {
      judul: 'Ruang Aman Asap di Jambi: Lokasi, Jam Buka dan Status',
      deskripsi: 'Daftar ruang aman asap di Provinsi Jambi yang dicek relawan: alamat, jam buka, kapasitas, dan status buka atau penuh, diurutkan dari yang terdekat.',
      pembuka: 'Ruang aman asap adalah ruangan berudara bersih tempat warga, terutama bayi, anak, ibu hamil, lansia, dan penderita asma, bisa berlindung saat kabut asap di Provinsi Jambi.',
    },
    faskes: {
      judul: 'Rumah Sakit Jambi dan Puskesmas dengan IGD 24 Jam Terdekat',
      deskripsi: 'Rumah sakit dan puskesmas di Provinsi Jambi untuk keluhan asap dan ISPA: alamat, telepon, IGD 24 jam, poli paru dan anak, serta petunjuk arah.',
      pembuka: 'Daftar rumah sakit, puskesmas, dan faskes di Provinsi Jambi, dari RS Online Kemenkes dan OpenStreetMap, untuk warga yang sesak atau terkena ISPA karena kabut asap.',
    },
    oksigen: {
      judul: 'Isi Ulang Oksigen Jambi: Lokasi dan Stok Tabung Oksigen',
      deskripsi: 'Penyedia dan isi ulang tabung oksigen di Provinsi Jambi selama kabut asap: alamat, harga, stok tersedia atau habis, dan kontak, dicek relawan.',
      pembuka: 'Daftar penyedia dan tempat isi ulang tabung oksigen di Provinsi Jambi yang dicek relawan Program Siaga Asap. Untuk oksigen medis darurat, telepon 119 atau datangi IGD terdekat.',
    },
    'air-bersih': {
      judul: 'Air Bersih Jambi Saat Kabut Asap: Depot dan Tangki Air',
      deskripsi: 'Penyedia air bersih di Provinsi Jambi selama kabut asap dan kemarau: depot, tangki air, layanan PDAM dan BPBD, wilayah antar, dan kontak.',
      pembuka: 'Daftar penyedia air bersih di Provinsi Jambi selama kabut asap dan kemarau, termasuk depot, tangki air, serta layanan PDAM dan BPBD, yang dicek relawan.',
    },
    ambulans: {
      judul: 'Nomor Ambulans Jambi 24 Jam: 119 dan Ambulans Setempat',
      deskripsi: 'Telepon 119 untuk ambulans gawat darurat 24 jam di Provinsi Jambi, plus daftar layanan ambulans setempat dengan wilayah layanan dan biaya.',
      pembuka: 'Untuk ambulans gawat darurat di Provinsi Jambi, telepon 119, tersedia 24 jam. Di bawahnya ada layanan ambulans setempat yang didata relawan.',
    },
    kontak: {
      judul: 'Nomor Darurat Jambi: 112, Ambulans 119, Damkar 113',
      deskripsi: 'Nomor darurat untuk warga Provinsi Jambi saat kabut asap dan kebakaran lahan: 112, ambulans 119, pemadam kebakaran 113, polisi 110, dan kontak setempat.',
      pembuka: 'Nomor darurat yang bisa ditelepon warga Provinsi Jambi kapan saja: 112 layanan darurat terpadu, 119 ambulans, 113 pemadam kebakaran, 110 polisi, serta kontak darurat setempat yang didata relawan.',
    },
    edukasi: {
      judul: 'Cara Menghadapi Kabut Asap: Panduan ISPA dan Masker N95',
      deskripsi: 'Delapan panduan singkat menghadapi kabut asap: arti angka ISPU, gejala ISPA, memilih masker N95, membuat ruang bersih, dan melindungi anak serta lansia.',
      pembuka: 'Panduan singkat untuk warga menghadapi kabut asap kebakaran hutan dan lahan: mengenali bahaya, melindungi diri dan keluarga, menyiapkan rumah, dan mencegah kebakaran.',
    },
    donasi: {
      judul: 'Donasi Kabut Asap Jambi untuk Ruang Aman dan Posko',
      deskripsi: 'Bantu warga Jambi yang terdampak kabut asap: daftar kebutuhan barang ruang aman dan posko kesehatan, serta saluran donasi resmi dari pengurus IA-ITB Jambi.',
      pembuka: 'Donasi untuk warga Provinsi Jambi yang terdampak kabut asap, disalurkan ke ruang aman asap dan posko kesehatan Program Siaga Asap IA-ITB Jambi.',
    },
    info: {
      judul: 'Informasi Terbaru Kabut Asap Jambi dari Relawan dan Instansi',
      deskripsi: 'Kabar terbaru seputar kabut asap di Provinsi Jambi: posko dan layanan baru, pengumuman resmi, dan bantuan untuk warga, dicek relawan sebelum tampil.',
      pembuka: 'Kabar terbaru seputar kabut asap di Provinsi Jambi yang dikirim warga, relawan, dan instansi, lalu dicek relawan Program Siaga Asap sebelum ditampilkan.',
    },
    kontribusi: {
      judul: 'Bantu Warga Terdampak Asap Jambi: Relawan dan Tambah Info',
      deskripsi: 'Cara membantu warga Jambi yang terdampak kabut asap: daftar jadi relawan, kirim info ruang aman, oksigen, air bersih, faskes, atau kabar terbaru, dan donasi.',
      pembuka: 'Web ini diisi bersama: warga dan relawan mengirim informasi, relawan verifikasi mengeceknya, lalu informasinya tampil untuk semua. Ada tiga cara ikut membantu.',
    },
    'panduan/ispu': {
      judul: 'Arti Angka ISPU: 5 Kategori Kualitas Udara dan Sarannya',
      deskripsi: 'Arti angka ISPU dari Baik sampai Berbahaya, dan apa yang perlu dilakukan di tiap kategori: kapan pakai masker N95, tutup jendela, atau pindah ke ruang aman.',
    },
    'panduan/asap-berbahaya': {
      judul: 'Bahaya Asap Kebakaran Hutan: PM2.5 dan Dampaknya bagi Tubuh',
      deskripsi: 'Kenapa asap kebakaran hutan dan lahan berbahaya: partikel halus PM2.5 masuk sampai paru-paru dan darah, serta siapa yang paling cepat terdampak.',
    },
    'panduan/ispa': {
      judul: 'ISPA Kabut Asap: Gejala, Perawatan, dan Tanda Harus ke IGD',
      deskripsi: 'Kenali gejala ISPA karena kabut asap, perawatan di rumah, dan tanda bahaya yang berarti harus segera ke IGD atau menelepon ambulans 119.',
    },
    'panduan/masker': {
      judul: 'Masker untuk Asap: Cara Memilih dan Memakai N95 atau KN95',
      deskripsi: 'Masker untuk asap kebakaran adalah N95 atau KN95 yang dipakai rapat. Cara memilih, memakai, kapan mengganti, dan kenapa bayi tidak boleh memakai N95.',
    },
    'panduan/kelompok-rentan': {
      judul: 'Melindungi Bayi, Anak, Ibu Hamil dan Lansia dari Asap',
      deskripsi: 'Bayi, anak, ibu hamil, lansia, dan penderita asma paling cepat terdampak kabut asap. Langkah melindungi mereka di rumah dan kapan harus ke faskes.',
    },
    'panduan/ruang-bersih': {
      judul: 'Cara Membuat Ruang Bersih Asap di Rumah Langkah demi Langkah',
      deskripsi: 'Cara membuat satu ruang bersih di rumah saat kabut asap: pilih kamar, tutup celah, pasang penyaring udara, dan jaga udaranya tetap bersih.',
    },
    'panduan/kotak-udara-bersih': {
      judul: 'Cara Merakit Kotak Udara Bersih dari Kipas Angin dan Filter',
      deskripsi: 'Penyaring udara murah untuk kabut asap: rakit Kotak Udara Bersih dari kipas angin dan 4 filter AC. Bahan, langkah merakit, dan cara memakainya.',
    },
    'panduan/cegah-karhutla': {
      judul: 'Cara Mencegah Kebakaran Hutan dan Lahan (Karhutla) di Jambi',
      deskripsi: 'Yang bisa dilakukan warga untuk mencegah kebakaran hutan dan lahan di Jambi: jangan membakar lahan atau sampah, dan laporkan titik api ke 112 atau 113.',
    },
  },
};
