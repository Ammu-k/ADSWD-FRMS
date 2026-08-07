// reports.js - Monthly/daily report generation, print, PDF and Excel export.

import { t } from "./i18n.js";
import { esc, formatDate } from "../utils/format.js";
import { toast } from "../ui/toast.js";
import { KEYS, getJSON, setJSON } from "../services/storage-service.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";
import { initMonthSelects } from "./cashbook-form.js";

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

export function buildReportPrintLayout() {
    api.generateReport?.();
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const label = dayVal ? new Date(dayVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : `${months[month]} ${year}`;
    const dept = (document.getElementById('settingDeptName')?.value) || t('default_department');
    const preparedBy = document.getElementById('reportPreparedBy')?.value || '';
    const verifiedBy = document.getElementById('reportVerifiedBy')?.value || '';

    let filtered;
    if (dayVal) {
        filtered = state.records.filter(r => r.date === dayVal);
    } else {
        filtered = state.records.filter(r => { if (!r.date) return false; const d = new Date(r.date); return d.getMonth() === month && d.getFullYear() === year; });
    }

    const receipts = filtered.filter(r => r.type === 'receipt');
    const payments = filtered.filter(r => r.type === 'payment');
    let rNet = 0, rDed = 0, rGross = 0, pNet = 0, pDed = 0, pGross = 0;
    receipts.forEach(r => { rNet += parseFloat(r.netPay) || 0; rDed += parseFloat(r.deduction) || 0; rGross += parseFloat(r.grossAmount) || 0; });
    payments.forEach(r => { pNet += parseFloat(r.netPay) || 0; pDed += parseFloat(r.deduction) || 0; pGross += parseFloat(r.grossAmount) || 0; });

    const maxRows = Math.max(receipts.length, payments.length);
    const rows = Array.from({ length: maxRows }, (_, i) => {
        const receipt = receipts[i] || {};
        const payment = payments[i] || {};
        return `<tr>
            <td>${formatDate(receipt.date)}</td>
            <td>${esc(receipt.receiptNo || '')}</td>
            <td>${esc(receipt.particulars || '')}</td>
            <td class="amount">${parseFloat(receipt.netPay || 0).toLocaleString('en-IN')}</td>
            <td class="amount">${parseFloat(receipt.deduction || 0).toLocaleString('en-IN')}</td>
            <td class="amount">${parseFloat(receipt.grossAmount || 0).toLocaleString('en-IN')}</td>
            <td style="width:18px;border:none;background:transparent"></td>
            <td>${formatDate(payment.date)}</td>
            <td>${esc(payment.receiptNo || '')}</td>
            <td>${esc(payment.beneficiary || payment.particulars || '')}</td>
            <td>${esc(payment.tokenNo || '')}</td>
            <td>${esc(payment.utrNo || '')}</td>
            <td>${formatDate(payment.paymentDate || payment.date)}</td>
            <td class="amount">${parseFloat(payment.netPay || 0).toLocaleString('en-IN')}</td>
            <td class="amount">${parseFloat(payment.deduction || 0).toLocaleString('en-IN')}</td>
            <td class="amount">${parseFloat(payment.grossAmount || 0).toLocaleString('en-IN')}</td>
        </tr>`;
    }).join('');

    const container = document.createElement('div');
    container.className = 'print-report-layout';
    container.innerHTML = `<div class="print-report-page">
        <div class="print-head">
            <div style="display:flex;align-items:center;gap:12px">
                <div>
                    <div class="print-title">${esc(dept)}</div>
                    <div class="print-subtitle">${esc(t('cash_book'))}</div>
                </div>
            </div>
            <div style="text-align:right">
                <div class="print-title">${esc(t('cash_book'))}</div>
                <div class="print-meta">${esc(label)}</div>
            </div>
        </div>
        <div class="print-summary">
            <div class="summary-card"><div class="label">${esc(t('receipts'))}</div><div class="value">₹${rGross.toLocaleString('en-IN')}</div></div>
            <div class="summary-card"><div class="label">${esc(t('payments'))}</div><div class="value">₹${pGross.toLocaleString('en-IN')}</div></div>
        </div>
        <table class="print-table">
            <thead>
                <tr>
                    <th colspan="6">${esc(t('receipts'))}</th>
                    <th style="border:none;background:transparent"></th>
                    <th colspan="9">${esc(t('payments'))}</th>
                </tr>
                <tr>
                    <th>${esc(t('date'))}</th><th>${esc(t('receipt_no'))}</th><th>${esc(t('particulars'))}</th><th>${esc(t('net_pay'))}</th><th>${esc(t('deduction'))}</th><th>${esc(t('gross_amount'))}</th><th style="border:none;background:transparent"></th><th>${esc(t('date'))}</th><th>${esc(t('receipt_no'))}</th><th>${esc(t('beneficiary'))}</th><th>${esc(t('token_no'))}</th><th>${esc(t('utr_no'))}</th><th>${esc(t('payment_date'))}</th><th>${esc(t('net_pay'))}</th><th>${esc(t('deduction'))}</th><th>${esc(t('gross_amount'))}</th>
                </tr>
            </thead>
            <tbody>${rows}<tr class="print-total-row"><td colspan="6">${esc(t('total'))}: ₹${rGross.toLocaleString('en-IN')}</td><td style="border:none;background:transparent"></td><td colspan="9">${esc(t('total'))}: ₹${pGross.toLocaleString('en-IN')}</td></tr></tbody>
        </table>
        <div class="print-footer">
            <div class="signature">${esc(t('prepared_by'))} ${esc(preparedBy || '________________')}</div>
            <div class="signature">${esc(t('verified_by'))} ${esc(verifiedBy || '________________')}</div>
        </div>
    </div>`;
    return container;
}

export function printReport() {
    const layout = buildReportPrintLayout();
    document.body.appendChild(layout);
    setTimeout(() => {
        window.print();
        setTimeout(() => layout.remove(), 500);
    }, 150);
}

export async function exportReportPDF() {
    const layout = buildReportPrintLayout();
    document.body.appendChild(layout);
    try {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const page = layout.querySelector(".print-report-page");
        page.style.visibility = "visible";
        page.style.display = "block";
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
            width: page.scrollWidth,
            height: page.scrollHeight
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - 2 * margin;
        const ratio = canvas.width / canvas.height;
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / ratio;
        if (imgHeight > pageHeight - 2 * margin) {
            imgHeight = pageHeight - 2 * margin;
            imgWidth = imgHeight * ratio;
        }
        pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
        pdf.save("ADSWD_Report.pdf");
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        layout.remove();
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
