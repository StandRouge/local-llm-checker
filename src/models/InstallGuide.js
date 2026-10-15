import { GUIDE_OS_VALUES } from '../config/limits.js';

export const OFFICIAL_COMMANDS = Object.freeze({
  linuxInstall: 'curl -fsSL https://ollama.com/install.sh | sh',
  linuxRocm: 'curl -fsSL https://ollama.com/download/ollama-linux-amd64-rocm.tar.zst | sudo tar x -C /usr',
});

const DOWNLOAD_URL = 'https://ollama.com/download';

export const OS_LABELS = Object.freeze({
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
});

export function resolveGuideOs(value) {
  return typeof value === 'string' && GUIDE_OS_VALUES.includes(value) ? value : 'windows';
}

function diskNeeded(model, extraGb) {
  return Math.ceil(model.sizeGb + extraGb);
}

function prerequisites(os, model) {
  if (os === 'windows') {
    return [
      'Windows 10 22H2 atau lebih baru.',
      `Ruang disk kosong minimal ${diskNeeded(model, 4)} GB (4 GB untuk aplikasi ditambah ukuran model).`,
      'Kartu NVIDIA: driver versi 551.61 atau lebih baru.',
      'Kartu AMD: driver Radeon terbaru. Radeon RX 7000 memakai ROCm, kartu lain memakai Vulkan.',
    ];
  }
  if (os === 'macos') {
    return [
      'macOS Sonoma (14) atau lebih baru.',
      'Mac dengan chip Apple Silicon memakai akselerasi GPU lewat Metal, Mac Intel hanya CPU.',
      `Ruang disk kosong lebih besar dari ukuran model (${model.sizeGb} GB) ditambah ruang aplikasi.`,
    ];
  }
  return [
    'Distribusi Linux 64-bit, disarankan memakai systemd, dengan akses sudo.',
    `Ruang disk kosong lebih besar dari ukuran model (${model.sizeGb} GB) ditambah ruang aplikasi.`,
    'Kartu NVIDIA: driver 550 atau lebih baru. Perintah nvidia-smi harus menampilkan GPU Anda.',
    'Kartu AMD: ROCm v7 terpasang, atau gunakan Vulkan untuk kartu yang belum didukung ROCm.',
  ];
}

function installSteps(os) {
  if (os === 'windows') {
    return [
      {
        title: 'Pasang Ollama',
        description: `Unduh OllamaSetup.exe dari ${DOWNLOAD_URL}, lalu jalankan. Penginstal tidak membutuhkan hak Administrator.`,
        commands: [],
        optional: false,
      },
    ];
  }
  if (os === 'macos') {
    return [
      {
        title: 'Pasang Ollama',
        description: `Unduh ollama.dmg dari ${DOWNLOAD_URL}, seret Ollama ke folder Applications, lalu buka aplikasinya. Setujui pembuatan tautan perintah ollama bila diminta.`,
        commands: [],
        optional: false,
      },
    ];
  }
  return [
    {
      title: 'Pasang Ollama',
      description: 'Jalankan skrip instalasi resmi. Unduh dan baca skripnya lebih dulu bila Anda ingin memeriksa isinya.',
      commands: [OFFICIAL_COMMANDS.linuxInstall],
      optional: false,
    },
    {
      title: 'Tambahkan paket ROCm untuk GPU AMD',
      description: 'Hanya untuk kartu AMD yang memakai ROCm.',
      commands: [OFFICIAL_COMMANDS.linuxRocm],
      optional: true,
    },
  ];
}

function relocationStep(os) {
  if (os !== 'windows') {
    return [];
  }
  return [
    {
      title: 'Pindahkan lokasi model',
      description: 'Berguna bila drive C hampir penuh. Setelah menjalankan perintah, tutup lalu buka ulang Ollama dan terminal.',
      commands: ['setx OLLAMA_MODELS "D:\\ollama\\models"'],
      optional: true,
    },
  ];
}

export function buildGuide(model, os) {
  const target = resolveGuideOs(os);
  const run = `ollama run ${model.ollamaTag}`;
  return {
    os: target,
    osLabel: OS_LABELS[target],
    prerequisites: prerequisites(target, model),
    steps: [
      ...installSteps(target),
      {
        title: 'Pastikan Ollama aktif',
        description: 'Perintah ini menampilkan versi yang terpasang.',
        commands: ['ollama -v'],
        optional: false,
      },
      {
        title: 'Unduh dan jalankan model',
        description: `Mengunduh sekitar ${model.sizeGb} GB pada eksekusi pertama, lalu membuka sesi chat. Ketik /bye untuk keluar.`,
        commands: [run],
        optional: false,
      },
      ...relocationStep(target),
    ],
    verify: [
      { description: 'Model muncul di daftar model terpasang.', command: 'ollama list' },
      {
        description: 'Saat model aktif, kolom PROCESSOR menunjukkan pembagian beban GPU dan CPU.',
        command: 'ollama ps',
      },
    ],
    troubleshooting: [
      {
        description:
          'PROCESSOR didominasi CPU padahal GPU tersedia berarti model terlalu besar untuk VRAM. Pilih model yang lebih kecil dari katalog.',
        command: null,
      },
      {
        description: 'Respons lambat atau memori penuh: perkecil konteks di dalam sesi chat.',
        command: '/set parameter num_ctx 4096',
      },
      {
        description: 'Hapus model bila ruang disk dibutuhkan kembali.',
        command: `ollama rm ${model.ollamaTag}`,
      },
    ],
  };
}
