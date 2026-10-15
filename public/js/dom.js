const BLOCKED_ATTRIBUTE = /^(on|style$|srcdoc$)/i;

export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = String(options.text);
  }
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (!BLOCKED_ATTRIBUTE.test(name)) {
        node.setAttribute(name, String(value));
      }
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}
