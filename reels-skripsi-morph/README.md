# Reels: Skripsian Pakai Claude AI (gaya Shape Morph)

Versi reel skripsi dengan gaya **#08 Shape Morph** dari
[mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15/blob/main/prompts/08-morph.md).
Format vertikal 1080×1920, 30 fps, sekitar 56 detik. Audio AAC stereo 48 kHz, di-master ke −14 LUFS dengan true peak ≤ −1 dBTP.

## Konsep
Satu bentuk utama yang terus berubah wujud untuk menceritakan seluruh perjalanan skripsi:
`?` (mentok) → balon chat (asisten) → bohlam (ide topik) → dokumen (kerangka) → buku (literatur)
→ grafik (olah data) → kaca pembesar (review) → mikrofon (sidang) → toga (lulus).

## Ciri gaya morph dan penerapannya
- **Garis bentuk tetap menyambung**, tidak meloncat. Interpolasi memakai [flubber](https://github.com/veltman/flubber),
  yang otomatis menyamakan jumlah titik dan rotasinya.
- **Tidak langsung dari A ke B.** Bentuk selalu mengecil dulu menjadi lingkaran, lalu mengembang menjadi bentuk berikutnya.
  Bentuk pendukung (titik tanda tanya, pangkal bohlam, pita buku, gagang kaca pembesar, rumbai toga) ikut berubah bersamaan.
- **Squash & stretch ±14%, rotasi, dan gerak melengkung** selama morph, lalu memantul halus saat mendarat.
- **Easing `cubic-bezier(.7,0,.3,1)`**: paling cepat di tengah, dengan jeda 3 frame di awal dan akhir.
- **Latar berganti blok warna** pada setiap langkah, dengan arah wipe yang bergantian (kanan, bawah, kiri, atas).
- **Frame penutup ditahan** dengan gerakan kecil: toga bernapas pelan dan rumbainya berayun.
- **Audio dibuat dengan kode** (`audio.py`): arpeggio plucky 104 BPM, sub bass, serta whoosh bernada
  dan bunyi "plip" + thump tepat di frame mendarat setiap morph. Semua waktunya dibaca dari `out/cues.json`.

## Render
    npm i playwright   # sudah terpasang di lingkungan ini
    node render.js               # musik + SFX, timing perkiraan
    node render.js bagas.mp3     # timing disinkronkan ke voice over Bagas, musik otomatis mengecil saat ada suara
    node render.js --stills      # keyframes.png (termasuk setiap titik tengah morph)

Setiap frame dihitung murni dari waktu `t` (`window.renderAt(t)`), ditangkap dengan headless Chromium, lalu digabung dengan ffmpeg.
Naskah voice over sama dengan `../reels-skripsi-claude/README.md`.
