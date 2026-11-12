/** Tiện ích dựng HUD bằng DOM trên khung 640x360 (chữ tiếng Việt nét hơn chữ vẽ trên canvas). */
const overlay = () => document.getElementById('overlay');

export function clearOverlay() {
  overlay().replaceChildren();
}

/** Tạo phần tử, gắn vào `parent` (mặc định overlay). `html` chỉ nhận chuỗi tĩnh do code viết, không nhận input người dùng. */
export function el(tag, className, html = '', parent = overlay()) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  parent.appendChild(node);
  return node;
}

export function place(node, x, y) {
  node.style.left = `${Math.round(x)}px`;
  node.style.top = `${Math.round(y)}px`;
}

export function showBanner(title, subtitle = '') {
  const banner = el('div', 'banner');
  banner.textContent = title;
  if (subtitle) el('small', '', '', banner).textContent = subtitle;
  setTimeout(() => banner.remove(), 1300);
}

export function floatText(x, y, text, kind = '') {
  const node = el('div', `float ${kind}`.trim());
  node.textContent = text;
  place(node, x, y);
  setTimeout(() => node.remove(), 950);
}

export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
