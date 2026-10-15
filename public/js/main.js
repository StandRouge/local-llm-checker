import { detectSpecs } from './components/SpecDetector.js';
import { SpecForm } from './components/SpecForm.js';
import { ResultList } from './components/ResultList.js';
import { ApiError, lookupGpu, matchDevice } from './services/api.js';

const statusNode = document.getElementById('status');
const form = new SpecForm(document.getElementById('spec-form'));
const results = new ResultList(document.getElementById('results'));

function setStatus(message) {
  statusNode.textContent = message;
}

async function runMatch(device) {
  setStatus('Mencocokkan dengan katalog model...');
  try {
    const data = await matchDevice(device);
    results.render(data, device);
    setStatus('Pencocokan selesai. Koreksi nilai di atas bila perlu lalu cocokkan ulang.');
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    const message =
      error instanceof ApiError && error.status === 429
        ? 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
        : 'Pencocokan gagal. Periksa nilai yang diisi lalu coba lagi.';
    form.showError(message);
    setStatus('');
  }
}

async function bootstrap() {
  const detected = await detectSpecs();
  form.setValues({
    ramGb: detected.reportedRam,
    cores: detected.cores,
    os: detected.os,
    gpuRenderer: detected.gpuRenderer,
  });
  const notes = [];
  if (detected.ramMayBeCapped) {
    notes.push('RAM dilaporkan browser dibatasi sampai 8 GB, periksa nilainya.');
  }
  if (detected.gpuRenderer !== '') {
    try {
      const gpu = await lookupGpu(detected.gpuRenderer);
      form.setValues({ vramGb: gpu.vramGb, unifiedMemory: gpu.unified });
      if (gpu.known) {
        notes.push('VRAM GPU diperkirakan dari model kartu, koreksi bila berbeda.');
      } else if (!gpu.unified) {
        notes.push('VRAM GPU tidak dikenali, isi manual bila ada GPU diskrit.');
      }
    } catch {
      notes.push('VRAM GPU tidak dapat diperkirakan, isi manual.');
    }
  } else {
    notes.push('GPU tidak terbaca oleh browser, isi VRAM manual bila ada GPU diskrit.');
  }
  setStatus(`Deteksi selesai. ${notes.join(' ')}`.trim());
}

form.onSubmit(runMatch);
bootstrap();
