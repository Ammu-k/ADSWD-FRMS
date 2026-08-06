// format.js - Text/date formatting and escaping helpers.

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

export function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
