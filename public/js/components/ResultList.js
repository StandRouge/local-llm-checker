import { clear, el } from '../dom.js';
import { createModelCard } from './ModelCard.js';

const GROUPS = [
  { verdict: 'smooth', title: 'Lancar', open: true },
  { verdict: 'usable', title: 'Bisa dijalankan, lebih lambat', open: true },
  { verdict: 'unsupported', title: 'Tidak disarankan', open: false },
];

function createGroup(group, items, device) {
  const grid = el(
    'div',
    { className: 'grid' },
    items.map((item) => createModelCard(item, device)),
  );
  const summary = el('summary', { text: `${group.title} (${items.length})` });
  const attrs = group.open ? { open: '' } : {};
  return el('details', { className: `group verdict-${group.verdict}`, attrs }, [summary, grid]);
}

export class ResultList {
  constructor(section) {
    this.section = section;
    this.summaryNode = section.querySelector('#results-summary');
    this.groupsNode = section.querySelector('#result-groups');
  }

  render(data, device) {
    clear(this.groupsNode);
    const { smooth, usable, unsupported } = data.summary;
    const pools = data.device.pools;
    const parts = [`${smooth} lancar`, `${usable} bisa dijalankan`, `${unsupported} tidak disarankan`];
    let capacity = `RAM efektif ${pools.ramGb} GB`;
    if (data.device.unifiedMemory) {
      capacity = `memori terpadu efektif ${pools.unifiedGb} GB`;
    } else if (pools.gpuGb > 0) {
      capacity = `VRAM efektif ${pools.gpuGb} GB dan RAM efektif ${pools.ramGb} GB`;
    }
    this.summaryNode.textContent = `${parts.join(', ')}. Dihitung dari ${capacity}.`;
    for (const group of GROUPS) {
      const items = data.results.filter((item) => item.verdict === group.verdict);
      if (items.length > 0) {
        this.groupsNode.append(createGroup(group, items, device));
      }
    }
    this.section.hidden = false;
  }
}
