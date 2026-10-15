export const VERDICT = Object.freeze({
  SMOOTH: 'smooth',
  USABLE: 'usable',
  UNSUPPORTED: 'unsupported',
});

export const VERDICT_LABELS = Object.freeze({
  smooth: 'Lancar',
  usable: 'Bisa dijalankan, lebih lambat',
  unsupported: 'Tidak disarankan',
});

export const REASON_NOTES = Object.freeze({
  fits_gpu: 'Seluruh model muat di memori GPU sehingga berjalan paling cepat.',
  fits_unified: 'Muat di memori terpadu perangkat Anda.',
  offload_moe:
    'Sebagian bobot berpindah ke RAM. Model MoE hanya mengaktifkan sebagian parameter per token sehingga masih layak, tetapi lebih lambat dari muat penuh di GPU.',
  offload_dense: 'Sebagian lapisan berjalan di CPU sehingga kecepatan turun cukup terasa.',
  cpu_small: 'Ukurannya kecil sehingga nyaman dijalankan hanya dengan CPU.',
  cpu_moe: 'Berjalan di CPU dengan RAM sistem. Parameter aktif yang kecil menjaga kecepatan tetap bisa dipakai.',
  cpu_dense: 'Berjalan di CPU dan akan terasa lambat, cocok untuk percobaan.',
  too_slow_cpu: 'Muat di RAM tetapi terlalu berat untuk CPU sehingga sangat lambat.',
  too_large: 'Kebutuhan memori melebihi kapasitas efektif perangkat.',
});

export const CAPABILITY_LABELS = Object.freeze({
  ringan: 'Ringan',
  multimodal: 'Teks dan gambar',
  coding: 'Coding',
  agent: 'Agentik',
  reasoning: 'Penalaran',
});

export const INPUT_LABELS = Object.freeze({
  text: 'Teks',
  image: 'Gambar',
});

export const OS_DISPLAY = Object.freeze({
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS / iPadOS',
  other: 'Lainnya',
});

export const ERROR_MESSAGES = Object.freeze({
  validation_failed: 'Data yang dikirim tidak valid.',
  not_found: 'Halaman tidak ditemukan.',
  method_not_allowed: 'Metode HTTP tidak diizinkan.',
  unsupported_media_type: 'Tipe konten harus application/json.',
  payload_too_large: 'Ukuran data terlalu besar.',
  bad_request: 'Permintaan tidak dapat diproses.',
  forbidden_origin: 'Asal permintaan ditolak.',
  misdirected_request: 'Host permintaan tidak dikenali.',
  too_many_requests: 'Terlalu banyak permintaan, coba lagi sebentar lagi.',
  internal_error: 'Terjadi kesalahan pada server.',
});
