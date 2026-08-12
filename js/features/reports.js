// reports.js - Monthly/daily report generation, print, PDF and Excel export.

import { t } from "./i18n.js";
import { esc, formatDate } from "../utils/format.js";
import { toast } from "../ui/toast.js";
import { KEYS, getJSON, setJSON } from "../services/storage-service.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";
import { initMonthSelects } from "./cashbook-form.js";
import { openPrintWindow, generateSheetParts } from "./print-report.js";

export function populateReportSelectors() {
    initMonthSelects();
    const dayEl = document.getElementById('reportDay');
    if (dayEl && !dayEl.value) { dayEl.value = new Date().toISOString().split('T')[0]; }
    loadDaySignatures();
    if (dayEl) dayEl.onchange = () => { api.generateReport?.(); loadDaySignatures(); };
    const pe = document.getElementById('reportPreparedBy');
    const ve = document.getElementById('reportVerifiedBy');
    if (pe) pe.onchange = () => saveDaySignature('preparedBy', pe.value);
    if (ve) ve.onchange = () => saveDaySignature('verifiedBy', ve.value);
}

function loadDaySignatures() {
    const dayVal = document.getElementById('reportDay')?.value;
    if (!dayVal) return;
    const store = getJSON(KEYS.daySignatures, {});
    const dayData = store[dayVal] || { preparedBy: '', verifiedBy: '' };
    const pe = document.getElementById('reportPreparedBy');
    const ve = document.getElementById('reportVerifiedBy');
    if (pe) pe.value = dayData.preparedBy || '';
    if (ve) ve.value = dayData.verifiedBy || '';
}

function saveDaySignature(field, value) {
    const dayVal = document.getElementById('reportDay')?.value;
    if (!dayVal) return;
    const store = getJSON(KEYS.daySignatures, {});
    if (!store[dayVal]) store[dayVal] = { preparedBy: '', verifiedBy: '' };
    store[dayVal][field] = value;
    setJSON(KEYS.daySignatures, store);
}

export function clearReportDay() {
    const dayEl = document.getElementById('reportDay');
    if (dayEl) dayEl.value = '';
    api.generateReport?.();
}

export function generateReport() {
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let label;
    if (dayVal) {
        const dd = new Date(dayVal);
        label = dd.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    } else {
        label = `${months[month]} ${year}`;
    }
    document.getElementById('reportMonthYear').textContent = label;
    document.getElementById('reportDept').textContent = (document.getElementById('settingDeptName')?.value) || t('default_department');

    let filtered;
    if (dayVal) {
        filtered = state.records.filter(r => {
            if (!r.date) return false;
            return r.date === dayVal;
        });
    } else {
        filtered = state.records.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    const receipts = filtered.filter(r => r.type === 'receipt');
    const payments = filtered.filter(r => r.type === 'payment');

    let rNet = 0, rDed = 0, rGross = 0, pNet = 0, pDed = 0, pGross = 0;
    receipts.forEach(r => { rNet += parseFloat(r.netPay) || 0; rDed += parseFloat(r.deduction) || 0; rGross += parseFloat(r.grossAmount) || 0; });
    payments.forEach(r => { pNet += parseFloat(r.netPay) || 0; pDed += parseFloat(r.deduction) || 0; pGross += parseFloat(r.grossAmount) || 0; });

    document.getElementById('rptReceiptNet').textContent = '₹' + rNet.toLocaleString('en-IN');
    document.getElementById('rptReceiptDed').textContent = '₹' + rDed.toLocaleString('en-IN');
    document.getElementById('rptReceiptGrand').textContent = '₹' + rGross.toLocaleString('en-IN');
    document.getElementById('rptPaymentNet').textContent = '₹' + pNet.toLocaleString('en-IN');
    document.getElementById('rptPaymentDed').textContent = '₹' + pDed.toLocaleString('en-IN');
    document.getElementById('rptPaymentGrand').textContent = '₹' + pGross.toLocaleString('en-IN');

    const rcStyle = 'font-weight:700;background:var(--card);border-top:2px solid var(--border)';

    if (receipts.length) {
        document.getElementById('rptReceiptBody').innerHTML = receipts.map(r => `<tr>
  <td>${formatDate(r.date)}</td><td>${esc(r.receiptNo || '')}</td><td>${esc(r.particulars || '')}</td>
  <td class="amount">${parseFloat(r.netPay || 0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.deduction || 0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.grossAmount || 0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.grossAmount || 0).toLocaleString('en-IN')}</td>
  </tr>`).join('') + `<tr style="${rcStyle}"><td colspan="3">${t('total')}</td><td class="amount">${rNet.toLocaleString('en-IN')}</td><td class="amount">${rDed.toLocaleString('en-IN')}</td><td class="amount">${rGross.toLocaleString('en-IN')}</td><td class="amount">${rGross.toLocaleString('en-IN')}</td></tr>`;
    } else {
        document.getElementById('rptReceiptBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-light)">${t('no_receipt_records')}</td></tr>`;
    }

    if (payments.length) {
        document.getElementById('rptPaymentBody').innerHTML = payments.map(r => `<tr>
    <td>${formatDate(r.date)}</td><td>${esc(r.receiptNo || '')}</td><td>${esc(r.beneficiary || r.particulars || '')}</td>
    <td>${esc(r.tokenNo || '')}</td><td>${esc(r.utrNo || '')}</td>
    <td>${formatDate(r.paymentDate || r.date)}</td>
    <td class="amount">${parseFloat(r.netPay || 0).toLocaleString('en-IN')}</td>
    <td class="amount">${parseFloat(r.deduction || 0).toLocaleString('en-IN')}</td>
    <td class="amount">${parseFloat(r.grossAmount || 0).toLocaleString('en-IN')}</td>
    </tr>`).join('') + `<tr style="${rcStyle}"><td colspan="6">${t('total')}</td><td class="amount">${pNet.toLocaleString('en-IN')}</td><td class="amount">${pDed.toLocaleString('en-IN')}</td><td class="amount">${pGross.toLocaleString('en-IN')}</td></tr>`;
    } else {
        document.getElementById('rptPaymentBody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-light)">${t('no_payment_records')}</td></tr>`;
    }
}


export function printReport() {
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const period = dayVal
        ? new Date(dayVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : `${months[month]} ${year}`;

    let filtered;
    if (dayVal) {
        filtered = state.records.filter(r => !r.date ? false : r.date === dayVal);
    } else {
        filtered = state.records.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    const dept = (document.getElementById('settingDeptName')?.value) || t('default_department');
    const finYear = document.getElementById('settingFinYear')?.value || '';
    const preparedBy = document.getElementById('reportPreparedBy')?.value || '';
    const verifiedBy = document.getElementById('reportVerifiedBy')?.value || '';

    openPrintWindow({
        title: t('cash_book'),
        titleKn: /^[\x00-\x7F\s]*$/.test(t('cash_book')) ? 'ನಗದು ಪುಸ್ತಕ' : '',
        dept,
        period,
        finYear,
        records: filtered,
        preparedBy,
        verifiedBy
    });
}

export async function exportReportPDF() {
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const period = dayVal
        ? new Date(dayVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : `${months[month]} ${year}`;

    let filtered;
    if (dayVal) {
        filtered = state.records.filter(r => !r.date ? false : r.date === dayVal);
    } else {
        filtered = state.records.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    const dept = (document.getElementById('settingDeptName')?.value) || t('default_department');
    const finYear = document.getElementById('settingFinYear')?.value || '';
    const preparedBy = document.getElementById('reportPreparedBy')?.value || '';
    const verifiedBy = document.getElementById('reportVerifiedBy')?.value || '';

    try {
        const { css, sheet } = await generateSheetParts({
            title: t('cash_book'),
            titleKn: /^[\x00-\x7F\s]*$/.test(t('cash_book')) ? 'ನಗದು ಪುಸ್ತಕ' : '',
            dept,
            period,
            finYear,
            records: filtered,
            preparedBy,
            verifiedBy
        });

        const host = document.createElement('div');
        host.setAttribute('data-print-host', '1');
        host.style.position = 'fixed';
        host.style.left = '-10000px';
        host.style.top = '0';
        host.style.width = '297mm';
        host.style.background = '#fff';
        host.style.zIndex = '-1';
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        host.appendChild(styleEl);
        host.insertAdjacentHTML('beforeend', sheet);
        document.body.appendChild(host);

        const el = host.querySelector('.sheet');
        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            width: el.scrollWidth,
            height: el.scrollHeight,
            onclone: () => {},
            logging: false
        });
        host.remove();

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 0;

        const scale = (pageW - 2 * margin) / canvas.width;
        const sliceHmm = pageH - 2 * margin;
        const sliceHpx = sliceHmm / scale;
        const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHpx));

        for (let p = 0; p < totalPages; p++) {
            if (p > 0) pdf.addPage();
            const sy = Math.round(p * sliceHpx);
            const sh = Math.min(Math.round(sliceHpx), canvas.height - sy);
            const slice = document.createElement('canvas');
            slice.width = canvas.width;
            slice.height = sh;
            const ctx = slice.getContext('2d');
            ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
            const imgData = slice.toDataURL('image/jpeg', 0.95);
            const imgHmm = sh * scale;
            pdf.addImage(imgData, 'JPEG', margin, margin, pageW - 2 * margin, imgHmm);
            pdf.setFontSize(8);
            pdf.setTextColor(120);
            pdf.text(`Page ${p + 1} of ${totalPages}`, pageW / 2, pageH - 4, { align: 'center' });
        }
        pdf.save('ADSWD_Report.pdf');
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

export function exportReportExcel() {
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    let filtered;
    if (dayVal) {
        filtered = state.records.filter(r => r.date === dayVal);
    } else {
        filtered = state.records.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }
    const receipts = filtered.filter(r => r.type === "receipt");
    const payments = filtered.filter(r => r.type === "payment");
    const rows = [];
    rows.push([
        t('receipts').toUpperCase(), "", "", "", "", "", "",
        t('payments').toUpperCase(), "", "", "", "", "", ""
    ]);
    rows.push([
        t('date'), t('receipt_no'), t('particulars'), t('net_pay'), t('deduction'), t('gross_amount'), t('total'),
        t('date'), t('receipt_no'), t('particulars'), t('token_no'), t('utr_no'), t('net_pay'), t('gross_amount')
    ]);
    const maxRows = Math.max(receipts.length, payments.length);
    for (let i = 0; i < maxRows; i++) {
        const r = receipts[i] || {};
        const p = payments[i] || {};
        rows.push([
            r.date || "",
            r.receiptNo || "",
            r.particulars || "",
            r.netPay || "",
            r.deduction || "",
            r.grossAmount || "",
            r.grossAmount || "",
            p.date || "",
            p.receiptNo || "",
            p.beneficiary || "",
            p.tokenNo || "",
            p.utrNo || "",
            p.netPay || "",
            p.grossAmount || ""
        ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
        { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Cash Book");
    const filename = dayVal
        ? `CashBook-${dayVal}.xlsx`
        : `CashBook-${year}-${month + 1}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast("Excel exported successfully", "success");
}

api.generateReport = generateReport;
api.populateReportSelectors = populateReportSelectors;
