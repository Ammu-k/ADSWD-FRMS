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

export function pairReportRows(records) {
  const list = records || [];
  const receiptById = new Map();
  const paymentById = new Map();
  const legacyReceipts = [];
  const legacyPayments = [];
  const order = [];

  list.forEach(r => {
    if (!r.type) return;
    if (r.entryId) {
      if (r.type === 'receipt') receiptById.set(r.entryId, r);
      else paymentById.set(r.entryId, r);
      if (!order.includes(r.entryId)) order.push(r.entryId);
    } else {
      if (r.type === 'receipt') legacyReceipts.push(r);
      else legacyPayments.push(r);
    }
  });

  const rows = order.map(id => ({ receipt: receiptById.get(id), payment: paymentById.get(id) }));
  const legacyCount = Math.max(legacyReceipts.length, legacyPayments.length);
  for (let i = 0; i < legacyCount; i++) {
    rows.push({ receipt: legacyReceipts[i], payment: legacyPayments[i] });
  }
  return rows;
}
