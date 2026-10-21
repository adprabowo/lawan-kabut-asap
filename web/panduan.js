// Panduan statis. Isi kesehatan perlu direview nakes mitra sebelum peluncuran (Hari 5).
window.PANDUAN = [
  {
    slug: 'ispa',
    judul: 'Gejala ISPA dan tanda bahaya',
    html: `
      <div class="peringatan">
        <strong>Segera ke IGD atau telepon 119 bila ada:</strong>
        <ul>
          <li>sesak napas berat, napas sangat cepat, atau sulit bicara karena sesak</li>
          <li>bibir atau ujung jari kebiruan</li>
          <li>nyeri dada</li>
          <li>pada anak: tarikan dinding dada ke dalam saat bernapas, napas cuping hidung, tidak mau minum atau menyusu, sangat lemas atau sulit dibangunkan, kejang</li>
          <li>bayi di bawah 3 bulan yang demam</li>
          <li>penderita asma yang obat pelegaknya tidak menolong</li>
        </ul>
      </div>
      <h3>Gejala umum</h3>
      <p>Batuk, pilek, sakit tenggorokan, mata perih, sesak ringan, dan demam.</p>
      <h3>Yang bisa dilakukan di rumah</h3>
      <ol>
        <li>Kurangi paparan asap: tetap di ruang bersih, tutup pintu dan jendela.</li>
        <li>Minum air putih yang cukup dan istirahat.</li>
        <li>Jangan memberi obat kepada anak tanpa petunjuk tenaga kesehatan.</li>
        <li>Periksa ke puskesmas bila tidak membaik dalam beberapa hari, atau segera bila termasuk kelompok rentan.</li>
      </ol>
      <h3>Kelompok rentan</h3>
      <p>Bayi, balita, anak, ibu hamil, lansia, dan penderita asma, PPOK, atau penyakit jantung.</p>`,
  },
  {
    slug: 'masker',
    judul: 'Memilih dan memakai masker',
    html: `
      <ol>
        <li>Pilihan terbaik untuk asap adalah <strong>N95 atau KN95</strong> yang menempel rapat menutup hidung dan mulut, tanpa celah.</li>
        <li>Masker bedah dan masker kain hanya sedikit menahan partikel asap halus (PM2.5). Lebih baik daripada tidak memakai, tapi bukan pilihan utama.</li>
        <li>Tekan klip hidung sampai rapat. Kalau kacamata berembun, berarti masih ada celah.</li>
        <li>Ganti masker bila basah, kotor, rusak, atau terasa sulit bernapas.</li>
      </ol>
      <div class="peringatan">
        <strong>Bayi dan balita tidak boleh memakai masker N95.</strong>
        Lindungi mereka dengan tetap berada di ruang bersih.
      </div>
      <p>Penderita penyakit jantung atau paru dan ibu hamil: tanyakan ke tenaga kesehatan bila terasa sesak saat memakai N95.</p>`,
  },
  {
    slug: 'ruang-bersih',
    judul: 'Membuat ruang bersih di rumah',
    html: `
      <ol>
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
    judul: 'Merakit Kotak Udara Bersih',
    html: `
      <p>Penyaring udara murah model Corsi-Rosenthal, bisa dirakit sendiri dalam 30 menit.</p>
      <h3>Bahan</h3>
      <ul>
        <li>1 kipas angin kotak (box fan) 20 inci</li>
        <li>4 filter udara/AC ukuran 20×20 inci, sebaiknya setara MERV 13</li>
        <li>Lakban dan karton</li>
      </ul>
      <h3>Langkah</h3>
      <ol>
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
    judul: 'Arti angka ISPU',
    html: `
      <ul>
        <li><strong>0–50 Baik:</strong> aktivitas normal.</li>
        <li><strong>51–100 Sedang:</strong> kelompok sensitif kurangi aktivitas berat di luar.</li>
        <li><strong>101–200 Tidak Sehat:</strong> kurangi aktivitas di luar. Kelompok rentan sebaiknya di dalam ruangan. Pakai N95/KN95 bila keluar.</li>
        <li><strong>201–300 Sangat Tidak Sehat:</strong> hindari aktivitas di luar, tutup pintu dan jendela, gunakan ruang bersih.</li>
        <li><strong>Di atas 300 Berbahaya:</strong> tetap di ruang bersih. Kelompok rentan pertimbangkan pindah ke Ruang Aman Asap. Keluar hanya bila perlu dengan N95/KN95.</li>
      </ul>`,
  },
];
