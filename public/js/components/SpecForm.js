function numberOrNull(input) {
  if (input.value.trim() === '') {
    return null;
  }
  const value = Number(input.value);
  return Number.isFinite(value) ? value : Number.NaN;
}

export class SpecForm {
  constructor(form) {
    this.form = form;
    this.fields = {
      ram: form.elements.namedItem('ram'),
      vram: form.elements.namedItem('vram'),
      cores: form.elements.namedItem('cores'),
      os: form.elements.namedItem('os'),
      unified: form.elements.namedItem('unified'),
      gpuRenderer: form.elements.namedItem('gpuRenderer'),
    };
    this.errorNode = form.querySelector('#form-error');
  }

  setValues({ ramGb, vramGb, cores, os, unifiedMemory, gpuRenderer }) {
    if (ramGb !== undefined && ramGb !== null) {
      this.fields.ram.value = String(ramGb);
    }
    if (vramGb !== undefined && vramGb !== null) {
      this.fields.vram.value = String(vramGb);
    }
    if (cores !== undefined && cores !== null) {
      this.fields.cores.value = String(cores);
    }
    if (os) {
      this.fields.os.value = os;
    }
    if (unifiedMemory !== undefined) {
      this.fields.unified.checked = Boolean(unifiedMemory);
    }
    if (gpuRenderer !== undefined) {
      this.fields.gpuRenderer.value = gpuRenderer;
    }
  }

  readValues() {
    const vram = numberOrNull(this.fields.vram);
    return {
      ramGb: numberOrNull(this.fields.ram),
      vramGb: vram === null ? 0 : vram,
      cores: numberOrNull(this.fields.cores),
      os: this.fields.os.value,
      unifiedMemory: this.fields.unified.checked,
      gpuRenderer: this.fields.gpuRenderer.value,
    };
  }

  showError(message) {
    this.errorNode.textContent = message;
    this.errorNode.hidden = false;
  }

  clearError() {
    this.errorNode.textContent = '';
    this.errorNode.hidden = true;
  }

  onSubmit(handler) {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.clearError();
      if (!this.form.reportValidity()) {
        return;
      }
      handler(this.readValues());
    });
  }
}
