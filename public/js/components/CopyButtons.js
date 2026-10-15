const RESET_DELAY_MS = 1800;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'offscreen';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export function bindCopyButtons(root = document) {
  for (const button of root.querySelectorAll('button[data-copy-target]')) {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) {
        return;
      }
      const original = button.textContent;
      try {
        await copyText(target.textContent);
        button.textContent = 'Tersalin';
      } catch {
        button.textContent = 'Gagal';
      }
      setTimeout(() => {
        button.textContent = original;
      }, RESET_DELAY_MS);
    });
  }
}
