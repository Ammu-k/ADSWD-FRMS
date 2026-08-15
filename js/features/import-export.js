// import-export.js - CSV/XLSX import preview and export to CSV/Excel.

import { t } from "./i18n.js";
import { esc } from "../utils/format.js";
import { toast } from "../ui/toast.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";
import { addRecordToFirestore, loadRecordsFromFirestore, handleFirestoreError } from "../services/records-service.js";

export function setupDragDrop() {
    const zone = document.getElementById('importZone');
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleImportFile(e.dataTransfer.files[0]); });
}

export function handleImport(e) {
    const input = (e && e.target && e.target.files) ? e.target : e;
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;
    handleImportFile(file);
}

export async function handleImportFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { toast(t('unsupported_file_format'), 'error'); return; }

    if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const vals = lines[i].split(',');
                const row = {};
                headers.forEach((h, j) => row[h] = (vals[j] || '').trim());
                data.push(row);
            }
            showImportPreview(data);
        };
        reader.readAsText(file);
    } else {
        try {
            const buf = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            if (!json || !json.length) { toast(t('no_records_found'), 'error'); return; }
            showImportPreview(json);
        } catch (err) {
            toast(t('unsupported_file_format'), 'error');
        }
    }
}

function showImportPreview(data) {
    state.pendingImport = data;
    const preview = document.getElementById('importPreview');
    preview.style.display = 'block';
    const headers = Object.keys(data[0] || {});
    let html = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>';
    headers.forEach(h => { html += `<th style="padding:6px 8px;background:var(--primary);color:#fff;border:1px solid var(--border)">${esc(h)}</th>`; });
    html += '</tr></thead><tbody>';
    data.slice(0, 10).forEach(row => {
        html += '<tr>';
        headers.forEach(h => { html += `<td style="padding:6px 8px;border:1px solid var(--border)">${esc(row[h] || '')}</td>`; });
        html += '</tr>';
    });
    if (data.length > 10) html += `<tr><td colspan="${headers.length}" style="padding:6px;text-align:center;color:var(--text-light)">${t('and')} ${data.length - 10} ${t('more_rows')}</td></tr>`;
    html += '</tbody></table>';
    document.getElementById('importPreviewTable').innerHTML = html;
}

export async function confirmImport() {
    if (!state.pendingImport) return;
    let imported = 0, duplicates = 0;
    try {
        for (const row of state.pendingImport) {
            const date = row.date || row.Date || '';
            const receiptNo = row.receiptno || row['receipt no'] || row['Receipt No.'] || row.receipt_no || '';
            const particulars = row.particulars || row.Particulars || '';
            const netPay = row.netpay || row['net pay'] || row['Net Pay'] || row.net_pay || '0';
            const deduction = row.deduction || row.Deduction || '0';
            const grossAmount = row.grossamount || row['gross amount'] || row['Gross Amount'] || row.gross_amount || '0';
            const beneficiary = row.beneficiary || row.Beneficiary || row['beneficiary name'] || '';

            const isDuplicate = state.records.some(r => r.date === date && r.receiptNo === receiptNo && r.particulars === particulars && r.type === 'receipt');
            if (isDuplicate) { duplicates++; continue; }

            const type = row.type === 'payment' ? 'payment' : 'receipt';
            await addRecordToFirestore({ type, date, receiptNo, particulars, netPay, deduction, grossAmount, beneficiary });
            imported++;
        }
        await loadRecordsFromFirestore();
        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('importResult').style.display = 'block';
        document.getElementById('importResult').innerHTML = `<div style="padding:16px;border-radius:8px;background:rgba(22,163,74,.2);color:#34d399;font-size:13px">✅ ${t('imported')} ${imported} ${t('records')}. ${duplicates} ${t('duplicates_skipped')}</div>`;
        state.pendingImport = null;
        api.filterRecords?.();
        api.updateDashboard?.();
        api.generateReport?.();
        toast(`${t('imported')} ${imported} ${t('records')}!`, 'success');
    } catch (error) {
        await handleFirestoreError('confirmImport', error);
    }
}

export function cancelImport() {
    state.pendingImport = null;
    document.getElementById('importPreview').style.display = 'none';
}

export function exportAllRecords() { exportRecordsToCSV(state.records, 'adswd-all-records.csv'); }

export function exportMonthlyReport() {
    const now = new Date();
    const filtered = state.records.filter(r => { if (!r.date) return false; const d = new Date(r.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    exportRecordsToCSV(filtered, `adswd-${now.getFullYear()}-${now.getMonth() + 1}.csv`);
}

export function exportRecordsToCSV(data, filename) {
    if (!data.length) { toast(t('no_data_to_export'), 'error'); return; }
    const headers = ['Date', 'Type', 'Receipt No', 'Particulars', 'Beneficiary', 'Net Pay', 'Deduction', 'Gross Amount', 'Token No', 'UTR No', 'Payment Date'];
    const csv = [headers.join(',')];
    data.forEach(r => {
        csv.push([r.date, r.type, r.receiptNo, r.particulars, r.beneficiary, r.netPay, r.deduction, r.grossAmount, r.tokenNo, r.utrNo, r.paymentDate].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
