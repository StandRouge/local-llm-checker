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

const FALLBACK_RAM_GB = 8;
const FALLBACK_CORES = 4;

async function runMatch(device, { scroll = true, notes = [] } = {}) {
  setStatus('Mencocokkan dengan katalog model...');
  try {
    const data = await matchDevice(device);
    results.render(data, device);
    const summary = ['Pencocokan selesai. Koreksi nilai di atas bila perlu lalu cocokkan ulang.', ...notes];
    setStatus(summary.join(' '));
    if (scroll) {
      document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
  const notes = [];
  const ramGb = detected.reportedRam ?? FALLBACK_RAM_GB;
  if (detected.reportedRam === null) {
    notes.push(`RAM tidak terbaca browser, sementara dihitung ${FALLBACK_RAM_GB} GB, isi nilai sebenarnya.`);
  }
  const cores = detected.cores ?? FALLBACK_CORES;
  if (detected.cores === null) {
    notes.push(`Jumlah core tidak terbaca, sementara dihitung ${FALLBACK_CORES}.`);
  }
  form.setValues({
    ramGb,
    cores,
    os: detected.os,
    gpuRenderer: detected.gpuRenderer,
  });
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
  await runMatch(form.readValues(), { scroll: false, notes });
}

form.onSubmit(runMatch);
bootstrap();