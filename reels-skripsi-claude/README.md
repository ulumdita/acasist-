# Reels: Skripsian Pakai Claude AI

Video reels edukasi 1080×1920 (9:16), 30 fps, sekitar 56 detik. Gayanya sama dengan `../reels-claude-motion`,
mengikuti profil Vincentwei1021.

Isinya: pembuka, lalu (01) cari ide topik, (02) susun kerangka BAB I–V, (03) pahami literatur dari PDF,
(04) olah data, (05) review tulisan dan latihan sidang, dan penutup berisi pengingat integritas akademik.

## Naskah voice over (ElevenLabs, suara "Bagas - Deep & Relaxed")

    Skripsi mentok terus? Kamu bisa pakai Claude AI sebagai asisten skripsi. Ini caranya!

    Langkah satu. Cari ide topik. Ceritakan minat dan jurusanmu, lalu minta Claude memberi beberapa ide judul beserta rumusan masalahnya.

    Langkah dua. Susun kerangka. Minta Claude membuat outline bab satu sampai bab lima, supaya alur penelitianmu jelas.

    Langkah tiga. Pahami literatur. Unggah jurnal dalam bentuk PDF, lalu minta Claude merangkum temuan dan celah penelitiannya.

    Langkah empat. Olah data. Claude bisa bantu memilih metode analisis, menjelaskan hasil statistik, dan menulis kode Python atau R.

    Langkah lima. Review tulisanmu. Minta masukan soal struktur, tata bahasa, dan logika argumen. Lalu latihan sidang, dengan Claude sebagai dosen penguji.

    Ingat, tetap tulis dengan kata-katamu sendiri, dan cek sumber aslinya. Simpan video ini, dan follow untuk tips lainnya!

## Render
    node render.js              # tanpa suara (timing perkiraan)
    node render.js bagas.mp3    # scene & caption disinkronkan ke jeda suara, audio ikut digabung
    node render.js --stills     # pratinjau PNG per scene
