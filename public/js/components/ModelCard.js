import { el } from '../dom.js';

function detailHref(slug, device) {
  const params = new URLSearchParams();
  params.set('ram', String(device.ramGb));
  if (device.vramGb > 0) {
    params.set('vram', String(device.vramGb));
  }
  params.set('cores', String(device.cores));
  params.set('os', device.os);
  params.set('unified', device.unifiedMemory ? '1' : '0');
  return `/models/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function createModelCard(item, device) {
  const href = detailHref(item.slug, device);
  const badges = item.capabilityLabels.map((label) => el('li', { className: 'badge', text: label }));
  return el('article', { className: `card model-card verdict-${item.verdict}` }, [
    el('header', {}, [
      el('h3', {}, [el('a', { text: item.name, attrs: { href } })]),
      el('p', { className: 'family', text: `${item.family} · ${item.parameterLabel}` }),
    ]),
    el('p', { className: 'verdict-label', text: item.verdictLabel }),
    el('p', { text: item.note }),
    el('ul', { className: 'badges' }, badges),
    el('dl', { className: 'facts' }, [
      el('div', {}, [el('dt', { text: 'Unduhan' }), el('dd', { text: `${item.sizeGb} GB` })]),
      el('div', {}, [el('dt', { text: 'Butuh memori' }), el('dd', { text: `${item.requiredGb} GB` })]),
      el('div', {}, [el('dt', { text: 'Konteks' }), el('dd', { text: `${item.contextK}K` })]),
    ]),
    el('a', { className: 'button button-ghost', text: 'Lihat detail dan instalasi', attrs: { href } }),
  ]);
}
