// Panduan statis. Isi kesehatan perlu direview nakes mitra sebelum peluncuran (Hari 5).
// `langkah` dipakai untuk urutan kerja yang memang berurutan; daftar biasa memakai <ul>.
window.PANDUAN = [
  {
    slug: 'ispa',
    ikon: 'stetoskop',
    judul: 'Gejala ISPA dan tanda bahaya',
    ringkas: 'Kapan cukup dirawat di rumah, kapan harus ke IGD',
    html: `
      <div class="peringatan">
        <p class="peringatan-judul">Segera ke IGD atau telepon 119 bila ada:</p>
        <ul>
          <li>sesak napas berat, napas sangat cepat, atau sulit bicara karena sesak</li>
          <li>bibir atau ujung jari kebiruan</li>
          <li>nyeri dada</li>
          <li>pada anak: tarikan dinding dada ke dalam saat bernapas, napas cuping hidung, tidak mau minum atau menyusu, sangat lemas atau sulit dibangunkan, kejang</li>
          <li>bayi di bawah 3 bulan yang demam</li>
          <li>penderita asma yang obat pelegaknya tidak menolong</li>
        </ul>
      </div>
      <h2>Gejala umum</h2>
      <p>Batuk, pilek, sakit tenggorokan, mata perih, sesak ringan, dan demam.</p>
      <h2>Yang bisa dilakukan di rumah</h2>
      <ul>
        <li>Kurangi paparan asap: tetap di ruang bersih, tutup pintu dan jendela.</li>
        <li>Minum air putih yang cukup dan istirahat.</li>
        <li>Jangan memberi obat kepada anak tanpa petunjuk tenaga kesehatan.</li>
        <li>Periksa ke puskesmas bila tidak membaik dalam beberapa hari, atau segera bila termasuk kelompok rentan.</li>
      </ul>
      <h2>Kelompok rentan</h2>
      <p>Bayi, balita, anak, ibu hamil, lansia, dan penderita asma, PPOK, atau penyakit jantung.</p>`,
  },
  {
    slug: 'masker',
    ikon: 'masker',
    judul: 'Memilih dan memakai masker',
    ringkas: 'N95 atau KN95, dipakai rapat tanpa celah',
    html: `
      <ul>
        <li>Pilihan terbaik untuk asap adalah <strong>N95 atau KN95</strong> yang menempel rapat menutup hidung dan mulut.</li>
        <li>Masker bedah dan masker kain hanya sedikit menahan partikel asap halus (PM2.5). Lebih baik daripada tidak memakai, tapi bukan pilihan utama.</li>
        <li>Tekan klip hidung sampai rapat. Kalau kacamata berembun, masih ada celah.</li>
        <li>Ganti masker bila basah, kotor, rusak, atau terasa sulit bernapas.</li>
      </ul>
      <div class="peringatan">
        <p class="peringatan-judul">Bayi dan balita tidak boleh memakai masker N95.</p>
        <p>Lindungi mereka dengan tetap berada di ruang bersih.</p>
      </div>
      <p>Penderita penyakit jantung atau paru dan ibu hamil: tanyakan ke tenaga kesehatan bila terasa sesak saat memakai N95.</p>`,
  },
  {
    slug: 'ruang-bersih',
    ikon: 'pintu',
    judul: 'Membuat ruang bersih di rumah',
    ringkas: 'Satu kamar tertutup rapat dengan penyaring udara',
    html: `
      <ol class="langkah">
        <li>Pilih satu ruangan, sebaiknya kamar tidur, untuk seluruh keluarga.</li>
        <li>Tutup jendela dan pintu. Tutup celah dengan lakban, kain basah, atau plastik.</li>
        <li>Pasang penyaring udara atau <a href="#/panduan/kotak-udara-bersih">Kotak Udara Bersih</a> dan biarkan menyala.</li>
        <li>Jangan merokok, membakar obat nyamuk, menyalakan lilin atau dupa, atau memasak berasap di dalam.</li>
        <li>Bersihkan debu dengan kain basah atau pel, bukan sapu kering.</li>
        <li>Kalau memakai AC, pilih mode resirkulasi dan bersihkan filternya.</li>
      </ol>`,
  },
  {
    slug: 'kotak-udara-bersih',
    ikon: 'kipas',
    judul: 'Merakit Kotak Udara Bersih',
    ringkas: 'Penyaring murah dari kipas angin dan 4 filter',
    html: `
      <p>Penyaring udara model Corsi-Rosenthal. Bisa dirakit sendiri dalam sekitar 30 menit.</p>
      <h2>Bahan</h2>
      <ul>
        <li>1 kipas angin kotak (box fan) 20 inci</li>
        <li>4 filter udara/AC ukuran 20×20 inci, sebaiknya setara MERV 13</li>
        <li>Lakban dan karton</li>
      </ul>
      <h2>Langkah</h2>
      <ol class="langkah">
        <li>Susun 4 filter membentuk kubus. Panah aliran udara pada filter menghadap ke <strong>dalam</strong>.</li>
        <li>Lakban semua sambungan antarfilter sampai rapat.</li>
        <li>Letakkan kipas di atas kubus dengan hembusan mengarah <strong>keluar</strong>, sehingga kipas menyedot udara dari dalam kubus.</li>
        <li>Tutup bagian bawah dengan karton atau filter kelima, lalu lakban rapat.</li>
        <li>Tutup sudut kipas yang bercelah dengan karton supaya udara hanya lewat filter.</li>
        <li>Nyalakan di kecepatan sedang sampai tinggi. Ganti filter bila sudah menghitam atau aliran melemah.</li>
      </ol>
      <p>Jauhkan dari air dan jangan biarkan menyala tanpa pengawasan dalam waktu sangat lama.</p>`,
  },
  {
    slug: 'ispu',
    ikon: 'ukur',
    judul: 'Arti angka ISPU',
    ringkas: 'Lima kategori dan apa yang perlu dilakukan',
    html: `
      <p>ISPU (Indeks Standar Pencemar Udara) dipakai pemerintah untuk menyatakan mutu udara. Makin tinggi angkanya, makin berbahaya bagi kesehatan.</p>
      <ul class="tangga-ispu">
        <li style="--warna: var(--ispu-baik)"><span class="tangga-angka">0–50</span><strong>Baik</strong><span>Aktivitas normal.</span></li>
        <li style="--warna: var(--ispu-sedang)"><span class="tangga-angka">51–100</span><strong>Sedang</strong><span>Kelompok sensitif kurangi aktivitas berat di luar.</span></li>
        <li style="--warna: var(--ispu-tidak-sehat)"><span class="tangga-angka">101–200</span><strong>Tidak Sehat</strong><span>Kurangi aktivitas di luar. Kelompok rentan sebaiknya di dalam. Pakai N95/KN95 bila keluar.</span></li>
        <li style="--warna: var(--ispu-sangat)"><span class="tangga-angka">201–300</span><strong>Sangat Tidak Sehat</strong><span>Hindari aktivitas di luar, tutup pintu dan jendela, gunakan ruang bersih.</span></li>
        <li style="--warna: var(--ispu-berbahaya)"><span class="tangga-angka">&gt; 300</span><strong>Berbahaya</strong><span>Tetap di ruang bersih. Kelompok rentan pertimbangkan pindah ke Ruang Aman Asap. Keluar hanya bila perlu dengan N95/KN95.</span></li>
      </ul>`,
  },
];

// Ringkasan tanda bahaya di beranda; daftar lengkap ada di panduan ISPA.
window.TANDA_BAHAYA = [
  'Sesak napas berat atau sulit bicara',
  'Bibir atau ujung jari kebiruan',
  'Anak bernapas dengan dinding dada tertarik ke dalam',
];
