# Reels: Cara Membuat Video Motion dari Claude AI

Video reels edukasi 1080×1920 (9:16), 30 fps, sekitar 50 detik. Gaya visualnya mengikuti profil
[Vincentwei1021](https://github.com/Vincentwei1021/Vincentwei1021): latar charcoal `#121417` dengan grid tipis,
teks cream, aksen kuning `#F2CF1D`, kursor berkedip, sorotan yang menyapu, titik REC, starfield, panggung maroon,
dan film-strip di atas kertas krem.

## File
- `scene.html`: seluruh animasi. Timeline-nya deterministik lewat `renderAt(t)`.
- `render.js`: merender frame dengan Playwright, lalu menyusunnya jadi MP4 dengan ffmpeg.
- `out/reels-claude-motion-silent.mp4`: versi tanpa suara dengan timing perkiraan.
- `out/contact.png`: pratinjau ketujuh scene.

## Naskah voice over (ElevenLabs, suara "Bagas - Deep & Relaxed")
Beri jeda satu baris kosong di antara paragraf. Jeda ini dipakai untuk sinkronisasi scene otomatis.

    Mau bikin video motion keren, tanpa ribet pakai software editing? Cukup pakai Claude AI. Begini caranya!

    Langkah satu. Buka Claude, lalu tulis prompt yang jelas. Sebutkan durasi, rasio sembilan banding enam belas, warna, dan gaya animasinya.

    Langkah dua. Minta Claude membuat animasinya dalam bentuk kode HTML dan CSS. Claude akan menyusun setiap adegan, teks, dan transisinya untukmu.

    Langkah tiga. Lihat hasilnya langsung di Artifact. Kurang pas? Tinggal revisi lewat chat. Misalnya: buat lebih cepat, atau ganti warnanya.

    Langkah empat. Tambahkan suara. Tulis naskahnya, lalu ubah jadi voice over dengan ElevenLabs.

    Langkah lima. Render animasinya, gabungkan dengan suara, dan videomu siap diunggah ke Reels!

    Simpan video ini, dan follow untuk tips AI lainnya.

## Render
    node render.js              # tanpa suara (timing perkiraan)
    node render.js bagas.mp3    # scene & caption disinkronkan ke jeda suara, audio ikut digabung
