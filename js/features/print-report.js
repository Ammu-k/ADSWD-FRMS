// print-report.js - Standalone A4 print report template.
// Opens a new self-contained window (no app CSS), renders the records into a
// government letterhead report (Karnataka emblem + watermark), prints A4
// portrait via the browser's built-in dialog, then closes.

import { esc, formatDate } from "../utils/format.js";

function money(n) {
    return '₹' + (parseFloat(n) || 0).toLocaleString('en-IN');
}

export async function loadLogoBase64() {
    try {
        const res = await fetch('./logo.png');
        const blob = await res.blob();
        if (blob.size === 0) return '';
        return await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => resolve('');
            fr.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}

function buildReceiptsTable(records) {
    const rs = records.filter(r => r.type === 'receipt');
    const net = rs.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const ded = rs.reduce((s, r) => s + (parseFloat(r.deduction) || 0), 0);
    const gross = rs.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
    const body = rs.length ? rs.map(r => `<tr>
        <td>${esc(formatDate(r.date))}</td>
        <td>${esc(r.receiptNo || '-')}</td>
        <td>${esc(r.particulars || '-')}</td>
        <td class="num">${money(r.netPay)}</td>
        <td class="num">${money(r.deduction)}</td>
        <td class="num">${money(r.grossAmount)}</td>
        <td class="num">${money(r.grossAmount)}</td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty">No receipt records</td></tr>`;
    return {
        html: `<table>
            <thead><tr>
                <th>Date</th><th>Receipt No.</th><th>Particulars</th>
                <th>Net Pay</th><th>Deduction</th><th>Gross Amount</th><th>Total</th>
            </tr></thead>
            <tbody>${body}
            <tr class="total"><td colspan="3">TOTAL</td><td class="num">${money(net)}</td><td class="num">${money(ded)}</td><td class="num">${money(gross)}</td><td class="num">${money(gross)}</td></tr>
            </tbody>
        </table>`
    };
}

function buildPaymentsTable(records) {
    const ps = records.filter(r => r.type === 'payment');
    const net = ps.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const ded = ps.reduce((s, r) => s + (parseFloat(r.deduction) || 0), 0);
    const gross = ps.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
    const body = ps.length ? ps.map(r => `<tr>
        <td>${esc(formatDate(r.date))}</td>
        <td>${esc(r.receiptNo || '-')}</td>
        <td>${esc(r.beneficiary || r.particulars || '-')}</td>
        <td>${esc(r.tokenNo || '-')}</td>
        <td>${esc(r.utrNo || '-')}</td>
        <td>${esc(formatDate(r.paymentDate || r.date))}</td>
        <td class="num">${money(r.netPay)}</td>
        <td class="num">${money(r.deduction)}</td>
        <td class="num">${money(r.grossAmount)}</td>
    </tr>`).join('') : `<tr><td colspan="9" class="empty">No payment records</td></tr>`;
    return {
        html: `<table>
            <thead><tr>
                <th>Date</th><th>Rcpt No.</th><th>Particulars</th>
                <th>Token No.</th><th>UTR No.</th><th>Pay Date</th>
                <th>Net Pay</th><th>Ded.</th><th>Gross</th>
            </tr></thead>
            <tbody>${body}
            <tr class="total"><td colspan="6">TOTAL</td><td class="num">${money(net)}</td><td class="num">${money(ded)}</td><td class="num">${money(gross)}</td></tr>
            </tbody>
        </table>`
    };
}

function buildReportCSS(logo) {
    return `
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
    font-family: "Noto Serif", "Noto Sans Kannada", "Times New Roman", Georgia, serif;
    background: #fff; color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
}
.sheet { position: relative; background:#fff; color:#111827; }
.sheet, .sheet * { font-family: "Noto Serif", "Noto Sans Kannada", "Times New Roman", Georgia, serif; box-sizing: border-box; }
.watermark {
    position: absolute; inset: 0;
    background: url("${logo}") no-repeat center/contain;
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
}
.sheet > * { position: relative; z-index: 1; }
.sheet {
    border: 1.5px solid #1c2e4a;
    padding: 6mm;
    min-height: 277mm;
}
.letterhead {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-bottom: 2.5px solid #1c2e4a;
    padding-bottom: 4mm;
    margin-bottom: 4mm;
}
.emblem { width: 20mm; height: 20mm; object-fit: contain; flex-shrink: 0; }
.dh { flex: 1; text-align: center; }
.dh .gov { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #1c2e4a; }
.dh .gov2 { font-size: 11px; font-weight: 600; margin-top: 1px; }
.dh .dept { font-size: 13px; font-weight: 700; margin-top: 3px; text-transform: uppercase; }
.dh .dept2 { font-size: 11px; margin-top: 1px; }
.dh .title { font-size: 16px; font-weight: 800; letter-spacing: 2px; margin-top: 4px; color: #1c2e4a; }
.dh .title.kn { letter-spacing: normal; }
.dh .title-kn { font-size: 12px; font-weight: 600; margin-top: 1px; color: #1c2e4a; }
.dh .period { font-size: 11px; margin-top: 2px; font-weight: 600; }
.meta { font-size: 10px; color: #374151; }
.side { flex-shrink: 0; text-align: right; font-size: 10px; color: #374151; align-self: flex-end; }
.tables { display: flex; width: 100%; margin-top: 3mm; }
.tables > div { flex: 1 1 50%; width: 50%; min-width: 0; }
.sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.sheet th, .sheet td { border: 0.5px solid #1c2e4a; padding: 2.5px 3px; font-size: 8.5px; vertical-align: top; text-align: left; white-space: normal; word-break: break-word; letter-spacing: normal; overflow-wrap: anywhere; color: #111827; }
.sheet th { background: #eef2f7; font-weight: 700; text-align: center; color: #111827; }
.sheet td.num { text-align: right; white-space: nowrap; }
tr.total td { font-weight: 800; background: #f6f8fb; border-top: 1.5px solid #1c2e4a; }
td.empty { text-align: center; color: #6b7280; padding: 8px 4px; }
.totals { display: flex; gap: 10px; margin-top: 3mm; }
.totals > div { flex: 1; border: 1px solid #1c2e4a; padding: 3px 6px; font-size: 9px; }
.totals b { float: right; font-weight: 800; }
.sign { display: flex; justify-content: space-between; margin-top: 18mm; }
.sign > div { width: 42%; font-size: 11px; font-weight: 700; text-align: center; }
.sign .line { border-top: 1.5px solid #111827; margin-top: 26mm; padding-top: 3px; }
.foot { margin-top: 4mm; font-size: 8.5px; text-align: center; color: #6b7280; }
`;
}

function buildSheetHTML(data, logo) {
    const title = data.title || 'CASH BOOK';
    const dept = data.dept || '';
    const period = data.period || '';
    const metaLine = data.finYear ? `${period} &nbsp;·&nbsp; FY ${esc(data.finYear)}` : period;
    const logoImg = logo ? `<img class="emblem" src="${logo}" alt="Karnataka Emblem">` : '';
    const head = buildReceiptsTable(data.records);
    const pay = buildPaymentsTable(data.records);

    const isLatin = /^[\x00-\x7F\s]*$/.test(title);
    const titleClass = isLatin ? 'title' : 'title kn';

    return `<div class="sheet">
    ${logo ? '<div class="watermark"></div>' : ''}
    <div class="letterhead">
        ${logoImg}
        <div class="dh">
            <div class="gov">GOVERNMENT OF KARNATAKA</div>
            <div class="gov2">ಸರ್ಕಾರ ಆಫ್ ಕರ್ನಾಟಕ</div>
            <div class="dept">${esc(dept)}</div>
            <div class="${titleClass}">${esc(title)}</div>
            ${data.titleKn ? `<div class="title-kn">${esc(data.titleKn)}</div>` : ''}
            <div class="period">${metaLine}</div>
            ${data.finYear ? `<div class="meta">${esc(data.finYear)}</div>` : ''}
        </div>
        <div class="side">${period}</div>
    </div>
    <div class="tables">
        <div>${head.html}</div>
        <div>${pay.html}</div>
    </div>
    <div class="sign">
        <div><div class="line">${esc(data.preparedBy || '________')}<br>Prepared By</div></div>
        <div><div class="line">${esc(data.verifiedBy || '________')}<br>Verified By</div></div>
    </div>
    <div class="foot">&copy; ${(new Date()).getFullYear()} ADSWD Bidar · Financial Records Management System</div>
</div>`;
}

export function buildTemplate(data, logo) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(data.title || 'CASH BOOK')} - ${esc(data.dept || '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700;800&family=Noto+Sans+Kannada:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${buildReportCSS(logo)}
</style>
</head>
<body>
${buildSheetHTML(data, logo)}
</body>
</html>`;
}

export async function generateSheetParts(data) {
    const logo = await loadLogoBase64();
    return { css: buildReportCSS(logo), sheet: buildSheetHTML(data, logo), logo };
}

export async function openPrintWindow(data) {
    const logo = await loadLogoBase64();
    const html = buildTemplate(data, logo);
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) {
        alert('Please allow pop-ups to print the report.');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
        w.print();
    }, 150);
    setTimeout(() => {
        try { w.close(); } catch (e) { /* ignore */ }
    }, 4000);
}
