# Planning: Local LLM Device Checker

## Tujuan

Aplikasi web yang membaca spesifikasi perangkat langsung dari browser (tanpa instalasi apa pun di sisi pengguna), mencocokkannya dengan katalog model AI open-weight terkini yang benar-benar realistis dijalankan secara lokal, lalu menampilkan detail model beserta panduan instalasinya.

## Alur Pengguna

1. Pengguna membuka halaman utama, aplikasi mendeteksi spesifikasi di browser.
2. Pengguna dapat mengoreksi nilai hasil deteksi (browser membatasi akurasi RAM dan VRAM).
3. Server mencocokkan profil perangkat dengan katalog dan mengembalikan daftar model berperingkat.
4. Pengguna membuka detail model, lalu mendapat instruksi instalasi sesuai OS dan runtime.

## Keputusan Teknis

- Deteksi 100% di sisi klien. Data spesifikasi hanya dikirim ke endpoint pencocokan sebagai angka tervalidasi, tidak disimpan.
- Backend Node.js (Express) dengan pola MVC dan view EJS berbasis partial sebagai komponen.
- Frontend ES module murni tanpa framework, setiap komponen satu file.
- Tanpa komentar di kode, tanpa log ke konsol.

## Arsitektur MVC

```
src/
  app.js                  rakitan aplikasi (middleware, route)
  server.js               entry point
  config/                 konfigurasi dan konstanta batas validasi
  routes/                 definisi route
  controllers/            HomeController, ModelController, MatchController
  models/                 Catalog, DeviceProfile, Matcher, InstallGuide
  middleware/             keamanan, rate limit, validasi, error handler
  views/
    pages/                index, model-detail, error
    components/           header, footer, spec-card, model-card, install-steps, tier-badge
  data/
    models.json           katalog model AI lokal
public/
  css/                    gaya
  js/
    components/           SpecDetector, SpecForm, ResultList, ModelCard
    services/             api client
    main.js
tests/                    unit, integrasi, uji keamanan
```

## Pencocokan Model

- Memori efektif: VRAM GPU diskrit jika ada, jika tidak memakai RAM sistem dikurangi cadangan OS.
- Kebutuhan model per kuantisasi: ukuran bobot + KV cache + overhead.
- Kelas hasil: Lancar, Bisa dijalankan (lebih lambat), Tidak disarankan.
- Perangkat mobile dan RAM kecil diarahkan ke model kecil.
- Katalog hanya berisi model open-weight yang tersedia di runtime lokal populer (Ollama, llama.cpp, LM Studio).

## Checklist Pengecekan dan Instalasi

Pengecekan di sisi aplikasi:
- Jumlah core CPU (`hardwareConcurrency`)
- Perkiraan RAM (`deviceMemory`, dibatasi browser sampai 8 GB)
- GPU (WebGL renderer, WebGPU adapter dan limit)
- Platform dan arsitektur

Instalasi untuk menjalankan proyek:
- Node.js 22, npm
- express, ejs, helmet, express-rate-limit
- Tanpa dependensi dev berat; pengujian memakai `node:test`

Instruksi instalasi model per OS di halaman detail:
- Prasyarat (driver GPU, runtime)
- Instalasi runtime
- Perintah unduh dan jalankan model
- Verifikasi dan pemecahan masalah umum

## Keamanan

- `.gitignore` sejak awal: `node_modules`, `.env*`, log, kunci, sertifikat, artefak build.
- Header: CSP ketat dengan nonce, HSTS, X-Content-Type-Options, Referrer-Policy, COOP/CORP, Permissions-Policy, tanpa X-Powered-By.
- Validasi input dengan whitelist tipe dan rentang; tolak properti tak dikenal.
- Batas ukuran body, rate limit per IP, timeout.
- Anti XSS: escape otomatis di view, tanpa inline script, tanpa `innerHTML` pada data dinamis.
- Anti path traversal: slug model dicocokkan ke whitelist katalog, tidak pernah dipakai sebagai path file.
- Tanpa database sehingga tanpa SQL injection; tanpa cookie sehingga tanpa CSRF; tanpa secret di repo.
- `npm audit` bersih dan versi dependensi dikunci.

## Pengujian

- Unit: Matcher, validasi, katalog.
- Integrasi: semua route.
- Penetrasi otomatis: payload XSS, injeksi, path traversal, prototype pollution, oversized body, tipe data salah, metode HTTP tak diizinkan, brute-force rate limit, verifikasi header.
- Pemindaian: `npm audit`, pencarian secret dan komentar/console di source.

## Urutan Kerja

1. Planning (dokumen ini)
2. Cek tool dan dependensi
3. Riset model AI lokal terkini
4. Bangun proyek
5. Uji keamanan dan fungsional
