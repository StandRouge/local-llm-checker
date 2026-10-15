import { POOLS } from '../config/limits.js';

const MOBILE_OS = new Set(['android', 'ios']);

function round(value) {
  return Math.round(value * 100) / 100;
}

export class DeviceProfile {
  constructor({ ramGb, vramGb, cores, os, unifiedMemory }) {
    this.ramGb = ramGb;
    this.vramGb = vramGb ?? 0;
    this.cores = cores;
    this.os = os;
    this.unifiedMemory = unifiedMemory;
    this.mobile = MOBILE_OS.has(os);
    Object.freeze(this);
  }

  get unifiedPoolGb() {
    return this.unifiedMemory ? round(this.ramGb * POOLS.unifiedShare) : 0;
  }

  get gpuPoolGb() {
    if (this.unifiedMemory || this.vramGb <= 0) {
      return 0;
    }
    return round(Math.max(0, this.vramGb - POOLS.gpuReserveGb));
  }

  get ramPoolGb() {
    if (this.mobile) {
      return round(this.ramGb * POOLS.mobileShare);
    }
    return round(Math.max(0, this.ramGb - POOLS.osReserveGb));
  }

  summary() {
    return {
      ramGb: this.ramGb,
      vramGb: this.vramGb,
      cores: this.cores,
      os: this.os,
      unifiedMemory: this.unifiedMemory,
      pools: {
        gpuGb: this.gpuPoolGb,
        ramGb: this.ramPoolGb,
        unifiedGb: this.unifiedPoolGb,
      },
    };
  }
}
