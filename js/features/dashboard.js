// dashboard.js - Dashboard stats and bar chart.

import { t } from "./i18n.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";

function populateSelectors() {
    const now = new Date();
    const months = [
        t('jan'), t('feb'), t('mar'), t('apr'),
        t('may'), t('jun'), t('jul'), t('aug'),
        t('sep'), t('oct'), t('nov'), t('dec')
    ];
    const monthEl = document.getElementById('dashMonth');
    const yearEl = document.getElementById('dashYear');
    if (monthEl && !monthEl.options.length) {
        monthEl.innerHTML = months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
        monthEl.value = now.getMonth();
    }
    if (yearEl && !yearEl.options.length) {
        const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
        yearEl.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearEl.value = now.getFullYear();
    }
}

export function updateDashboard() {
    populateSelectors();

    const monthEl = document.getElementById('dashMonth');
    const yearEl = document.getElementById('dashYear');
    const selectedMonth = monthEl ? parseInt(monthEl.value) : new Date().getMonth();
    const selectedYear = yearEl ? parseInt(yearEl.value) : new Date().getFullYear();

    const receipts = state.records.filter(r => r.type === 'receipt' && r.date);
    document.getElementById('statTotal').textContent = state.records.length;
    document.getElementById('statStaffCount').textContent = receipts.length;

    let monthTotal = 0, yearTotal = 0;
    receipts.forEach(r => {
        const d = new Date(r.date);
        const amt = parseFloat(r.grossAmount) || 0;
        if (d.getFullYear() === selectedYear) {
            yearTotal += amt;
            if (d.getMonth() === selectedMonth) monthTotal += amt;
        }
    });

    document.getElementById('statMonthTotal').textContent = '₹' + monthTotal.toLocaleString('en-IN');
    document.getElementById('statYearTotal').textContent = '₹' + yearTotal.toLocaleString('en-IN');

    const months = [
        t('jan'), t('feb'), t('mar'), t('apr'),
        t('may'), t('jun'), t('jul'), t('aug'),
        t('sep'), t('oct'), t('nov'), t('dec')
    ];
    const monthlyData = new Array(12).fill(0);
    receipts.forEach(r => {
        const d = new Date(r.date);
        if (d.getFullYear() === selectedYear) {
            monthlyData[d.getMonth()] += parseFloat(r.netPay) || 0;
        }
    });
    const maxVal = Math.max(...monthlyData, 1);
    const chart = document.getElementById('barChart');

    const yLabels = [];
    for (let i = 4; i >= 0; i--) {
        const v = Math.round((maxVal / 4) * i);
        yLabels.push(v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString());
    }

    chart.innerHTML = `
    <div style="display:flex;gap:0;height:220px">
      <div style="display:flex;flex-direction:column;justify-content:space-between;padding:0 8px 24px 0;font-size:11px;color:var(--text-light);text-align:right;min-width:40px">
        ${yLabels.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div style="flex:1;display:flex;align-items:flex-end;gap:6px;border-bottom:1px solid var(--border);padding-bottom:0">
        ${months.map((m, i) => {
            const h = Math.round((monthlyData[i] / maxVal) * 190);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:100%;height:${h}px;background:linear-gradient(180deg,#0d9488,#14b8a6);border-radius:4px 4px 0 0;transition:.3s;min-height:0"></div>
            <span style="font-size:10px;color:var(--text-light)">${m}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

export function onDashboardReady() {
    const monthEl = document.getElementById('dashMonth');
    const yearEl = document.getElementById('dashYear');
    if (monthEl) monthEl.onchange = updateDashboard;
    if (yearEl) yearEl.onchange = updateDashboard;
}

api.updateDashboard = updateDashboard;
api.onDashboardReady = onDashboardReady;