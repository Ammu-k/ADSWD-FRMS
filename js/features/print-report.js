// print-report.js - Standalone A4 landscape print report template.
// Renders the records into a government letterhead report (Karnataka emblem +
// watermark) with a merged bilingual heading, bilingual summary band and
// side-by-side detail tables. Shared by both the browser Print dialog and the
// PDF export.

import { esc, formatDate, pairReportRows } from "../utils/format.js";

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

const RECEIPTS_TITLE = 'RECEIPTS / ರಸೀತಿಗಳು';
const PAYMENTS_TITLE = 'PAYMENTS / ಪಾವತಿಗಳು';

function buildSummaryBlock(records, type, title) {
    const rows = records.filter(r => r.type === type);
    const net = rows.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const ded = rows.reduce((s, r) => s + (parseFloat(r.deduction) || 0), 0);
    const gross = rows.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
    return `<div>
        <div class="sm-title">${esc(title)}</div>
        <table class="sm">
            <tr><td>NET AMOUNT</td><td class="num">${money(net)}</td></tr>
            <tr><td>DEDUCTION</td><td class="num">${money(ded)}</td></tr>
            <tr class="grand"><td>GRAND TOTAL</td><td class="num">${money(gross)}</td></tr>
        </table>
    </div>`;
}

const RECEIPT_COLS = 6;
const PAYMENT_COLS = 8;
const TOTAL_COLS = RECEIPT_COLS + PAYMENT_COLS;

function receiptCells(r) {
    return `<td>${esc(formatDate(r.date))}</td>
        <td>${esc(r.receiptNo || '-')}</td>
        <td>${esc(r.particulars || '-')}</td>
        <td class="num">${money(r.netPay)}</td>
        <td class="num">${money(r.deduction)}</td>
        <td class="num col-last-r">${money(r.grossAmount)}</td>`;
}

function paymentCells(r) {
    return `<td class="col-first-p">${esc(formatDate(r.date))}</td>
        <td>${esc(r.receiptNo || '-')}</td>
        <td>${esc(r.beneficiary || r.particulars || '-')}</td>
        <td>${esc(r.tokenNo || '-')}</td>
        <td>${esc(r.utrNo || '-')}</td>
        <td class="num">${money(r.netPay)}</td>
        <td class="num">${money(r.deduction)}</td>
        <td class="num">${money(r.grossAmount)}</td>`;
}

function receiptEmptyCells() {
    const cells = Array(RECEIPT_COLS).fill('<td>-</td>');
    cells[RECEIPT_COLS - 1] = '<td class="col-last-r">-</td>';
    return cells.join('');
}

function paymentEmptyCells() {
    const cells = Array(PAYMENT_COLS).fill('<td>-</td>');
    cells[0] = '<td class="col-first-p">-</td>';
    return cells.join('');
}

function buildMergedTable(records) {
    const rs = (records || []).filter(r => r.type === 'receipt');
    const ps = (records || []).filter(r => r.type === 'payment');
    const rNet = rs.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const rDed = rs.reduce((s, r) => s + (parseFloat(r.deduction) || 0), 0);
    const rGross = rs.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
    const pNet = ps.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const pDed = ps.reduce((s, r) => s + (parseFloat(r.deduction) || 0), 0);
    const pGross = ps.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);

    const pairs = pairReportRows(records || []);
    const body = pairs.length ? pairs.map(({ receipt, payment }) => `<tr>
        ${receipt ? receiptCells(receipt) : receiptEmptyCells()}
        ${payment ? paymentCells(payment) : paymentEmptyCells()}
    </tr>`).join('') : `<tr><td colspan="${TOTAL_COLS}" class="empty">No records found</td></tr>`;

    return `<div>
        <table>
            <colgroup><col style="width:6%"><col style="width:7%"><col style="width:16%"><col style="width:8%"><col style="width:7%"><col style="width:6%"><col style="width:6%"><col style="width:6%"><col style="width:12%"><col style="width:5%"><col style="width:5%"><col style="width:6%"><col style="width:5%"><col style="width:5%"></colgroup>
            <thead>
            <tr>
                <th colspan="${RECEIPT_COLS}" class="sec-title col-last-r">${RECEIPTS_TITLE}</th>
                <th colspan="${PAYMENT_COLS}" class="sec-title col-first-p">${PAYMENTS_TITLE}</th>
            </tr>
            <tr>
                <th>Date</th><th>Receipt No.</th><th>Particulars</th><th>Net Pay</th><th>Deduction</th><th class="col-last-r">Gross Amount</th>
                <th class="col-first-p">Date</th><th>Receipt No.</th><th>Particulars</th><th>Token No.</th><th>UTR No.</th><th>Net Pay</th><th>Deduction</th><th>Gross Amount</th>
            </tr></thead>
            <tbody>${body}
            <tr class="total">
                <td colspan="3">RECEIPTS TOTAL</td><td class="num">${money(rNet)}</td><td class="num">${money(rDed)}</td><td class="num col-last-r">${money(rGross)}</td>
                <td colspan="5" class="col-first-p">PAYMENTS TOTAL</td><td class="num">${money(pNet)}</td><td class="num">${money(pDed)}</td><td class="num">${money(pGross)}</td>
            </tr>
            <tr class="total">
                <td colspan="${TOTAL_COLS}">GRAND TOTAL &nbsp;·&nbsp; Net ${money(rNet + pNet)} &nbsp;·&nbsp; Deduction ${money(rDed + pDed)} &nbsp;·&nbsp; Gross ${money(rGross + pGross)}</td>
            </tr>
            </tbody>
        </table>
    </div>`;
}

function buildReportCSS(logo) {
    return `
@page { size: A4 landscape; margin: 15mm;
    @top-center    { content: ""; border-bottom: 1.5px solid #1c2e4a; }
    @bottom-center { content: ""; border-top: 1.5px solid #1c2e4a; }
    @left-center   { content: ""; border-right: 1.5px solid #1c2e4a; }
    @right-center  { content: ""; border-left: 1.5px solid #1c2e4a; }
}
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
    min-height: 180mm;
}
.letterhead {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-bottom: 2.5px solid #1c2e4a;
    padding-bottom: 4mm;
    margin-bottom: 3mm;
}
.emblem { width: 20mm; height: 20mm; object-fit: contain; flex-shrink: 0; }
.dh { flex: 1; text-align: center; }
.dh .gov1 { font-size: 14px; font-weight: 800; color: #1c2e4a; }
.dh .gov2 { font-size: 12px; font-weight: 600; margin-top: 1px; }
.dh .dept { font-size: 12px; font-weight: 700; margin-top: 2px; }
.dh .title { font-size: 15px; font-weight: 800; margin-top: 4px; color: #1c2e4a; }
.dh .period { font-size: 11px; margin-top: 2px; font-weight: 600; }
.meta { font-size: 10px; color: #374151; }
.side { flex-shrink: 0; text-align: right; font-size: 10px; color: #374151; align-self: flex-end; }
.summary { display: flex; gap: 4mm; width: 100%; margin-top: 3mm; }
.summary > div { flex: 1 1 calc(50% - 2mm); width: calc(50% - 2mm); min-width: 0; }
.sm-title { font-size: 9.5px; font-weight: 800; text-align: center; background: #eef2f7; border: 0.5px solid #1c2e4a; border-bottom: none; padding: 2px 3px; }
.sec-title { font-size: 9.5px; font-weight: 800; text-align: center; background: #eef2f7; border: 0.5px solid #1c2e4a; border-bottom: none; padding: 2px 3px; }
.merged-table { width: 100%; margin-top: 3mm; }
.sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.sheet th, .sheet td { border: 0.5px solid #1c2e4a; padding: 2.5px 3px; font-size: 8.5px; vertical-align: top; text-align: left; white-space: normal; word-break: break-word; letter-spacing: normal; overflow-wrap: anywhere; color: #111827; }
.sheet th { background: #eef2f7; font-weight: 700; text-align: center; color: #111827; }
.sheet td.num { text-align: right; white-space: nowrap; }
.sheet td.tc { text-align: center; white-space: nowrap; }
.sheet th.col-last-r, .sheet td.col-last-r { border-right: 2px solid #1c2e4a !important; }
.sheet th.col-first-p, .sheet td.col-first-p { border-left: 2px solid #1c2e4a !important; }
tr.total td { font-weight: 800; background: #f6f8fb; border-top: 1.5px solid #1c2e4a; }
td.empty { text-align: center; color: #6b7280; padding: 8px 4px; }
.tbadge { display: inline-block; padding: 1px 5px; border-radius: 8px; font-size: 7.5px; font-weight: 700; }
.tbadge-success { background: #d1fae5; color: #065f46; }
.tbadge-danger { background: #fee2e2; color: #991b1b; }
.sm td { font-weight: 600; }
.sm tr.grand td { font-weight: 800; background: #f6f8fb; border-top: 1.5px solid #1c2e4a; }
.totals { display: flex; gap: 10px; margin-top: 3mm; }
.totals > div { flex: 1; border: 1px solid #1c2e4a; padding: 3px 6px; font-size: 9px; }
.totals b { float: right; font-weight: 800; }
.sign { display: flex; justify-content: space-between; margin-top: 10mm; }
.sign > div { width: 42%; font-size: 11px; font-weight: 700; text-align: center; padding-top: 12mm; }
.foot { margin-top: 4mm; font-size: 8.5px; text-align: center; color: #6b7280; }
#pageFiller { width: 100%; }
`;
}

function buildSheetHTML(data, logo) {
    const period = data.period || '';
    const metaLine = data.finYear ? `${period} &nbsp;·&nbsp; FY ${esc(data.finYear)}` : period;
    const logoImg = logo ? `<img class="emblem" src="${logo}" alt="Karnataka Emblem">` : '';
    const merged = buildMergedTable(data.records);
    const sumR = buildSummaryBlock(data.records, 'receipt', RECEIPTS_TITLE);
    const sumP = buildSummaryBlock(data.records, 'payment', PAYMENTS_TITLE);
    return `<div class="sheet">
    ${logo ? '<div class="watermark"></div>' : ''}
    <div class="letterhead">
        ${logoImg}
        <div class="dh">
            <div class="gov1">ಕರ್ನಾಟಕ ಸರ್ಕಾರ</div>
            <div class="gov2">ಸಹಾಯಕ ನಿರ್ದೇಶಕರು (ಗ್ರೇಡ್-1)</div>
            <div class="dept">ಸಮಾಜ ಕಲ್ಯಾಣ ಇಲಾಖೆ ಬೀದರ್</div>
            <div class="title">CASH BOOK (ನಗದು ಪುಸ್ತಕ)</div>
            <div class="period">${metaLine}</div>
        </div>
        <div class="side">${period}</div>
    </div>
    <div class="summary">
        ${sumR}
        ${sumP}
    </div>
    <div class="merged-table">
        ${merged}
    </div>
    <div class="sign">
        <div>Prepared By</div>
        <div>Verified By</div>
    </div>
    <div class="foot">&copy; ${(new Date()).getFullYear()} ADSWD Bidar · Financial Records Management System</div>
    <div id="pageFiller"></div>
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
<script>
(function(){
  function printNow(){window.print();}
  function run(){
    var filler = document.getElementById('pageFiller');
    if(filler){
      var pageH = 180;
      var pageHpx = pageH * (96/25.4);
      var body = document.body;
      var totalH = body.scrollHeight;
      var remainder = totalH % pageHpx;
      if(remainder > 1 && remainder < pageHpx - 1){
        filler.style.height = (pageHpx - remainder) + 'px';
      }
    }
    if(document.fonts&&document.fonts.ready){
      document.fonts.ready.then(printNow)['catch'](printNow);
      setTimeout(printNow,600);
    }else{printNow();}
  }
  window.addEventListener('load',function(){setTimeout(run,50);});
  setTimeout(run,500);
})();
</script>
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
    const w = window.open('', '_blank', 'width=1280,height=800');
    if (!w) {
        alert('Please allow pop-ups to print the report.');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
        try { w.close(); } catch (e) { /* ignore */ }
    }, 4000);
}