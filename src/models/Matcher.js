import { CPU, OVERHEAD } from '../config/limits.js';
import { CAPABILITY_LABELS, REASON_NOTES, VERDICT, VERDICT_LABELS } from '../config/messages.js';

const VERDICT_ORDER = Object.freeze({ smooth: 0, usable: 1, unsupported: 2 });

function round(value) {
  return Math.round(value * 100) / 100;
}

export function requiredGb(model) {
  if (model.sizeGb < OVERHEAD.smallModelGb) {
    return round(model.sizeGb + OVERHEAD.smallOverheadGb);
  }
  if (model.sizeGb < OVERHEAD.mediumModelGb) {
    return round(model.sizeGb + OVERHEAD.mediumOverheadGb);
  }
  return round(model.sizeGb + OVERHEAD.largeOverheadGb);
}

function outcome(verdict, reason) {
  return { verdict, reason };
}

function classifyCpu(profile, model, required) {
  if (required > profile.ramPoolGb) {
    return outcome(VERDICT.UNSUPPORTED, 'too_large');
  }
  if (model.moe) {
    return outcome(VERDICT.USABLE, 'cpu_moe');
  }
  if (model.sizeGb <= CPU.smoothMaxModelGb && profile.cores >= CPU.smoothMinCores) {
    return outcome(VERDICT.SMOOTH, 'cpu_small');
  }
  if (model.sizeGb <= CPU.denseMaxModelGb) {
    return outcome(VERDICT.USABLE, 'cpu_dense');
  }
  return outcome(VERDICT.UNSUPPORTED, 'too_slow_cpu');
}

function classify(profile, model, required) {
  if (profile.unifiedMemory) {
    return required <= profile.unifiedPoolGb
      ? outcome(VERDICT.SMOOTH, 'fits_unified')
      : outcome(VERDICT.UNSUPPORTED, 'too_large');
  }
  if (profile.mobile) {
    return required <= profile.ramPoolGb && model.sizeGb <= CPU.mobileMaxModelGb
      ? outcome(VERDICT.USABLE, 'cpu_dense')
      : outcome(VERDICT.UNSUPPORTED, 'too_large');
  }
  const gpu = profile.gpuPoolGb;
  if (gpu > 0) {
    if (required <= gpu) {
      return outcome(VERDICT.SMOOTH, 'fits_gpu');
    }
    if (required <= gpu + profile.ramPoolGb) {
      if (model.moe) {
        return outcome(VERDICT.USABLE, 'offload_moe');
      }
      if (gpu >= required * CPU.denseOffloadMinGpuShare) {
        return outcome(VERDICT.USABLE, 'offload_dense');
      }
    }
  }
  return classifyCpu(profile, model, required);
}

export function evaluate(profile, model) {
  const required = requiredGb(model);
  const { verdict, reason } = classify(profile, model, required);
  return {
    slug: model.slug,
    name: model.name,
    family: model.family,
    parameterLabel: model.parameterLabel,
    sizeGb: model.sizeGb,
    requiredGb: required,
    contextK: model.contextK,
    inputs: [...model.inputs],
    capabilities: [...model.capabilities],
    capabilityLabels: model.capabilities.map((key) => CAPABILITY_LABELS[key]),
    summary: model.summary,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    reason,
    note: REASON_NOTES[reason],
  };
}

export function rank(profile, models) {
  const results = models
    .map((model) => evaluate(profile, model))
    .sort(
      (a, b) =>
        VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
        b.sizeGb - a.sizeGb ||
        a.name.localeCompare(b.name),
    );
  const summary = { smooth: 0, usable: 0, unsupported: 0 };
  for (const item of results) {
    summary[item.verdict] += 1;
  }
  return { results, summary };
}
