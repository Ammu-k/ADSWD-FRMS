// dashboard.js - Dashboard stats and bar chart.

import { t } from "./i18n.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";

export function updateDashboard() {
    document.getElementById('statTotal').textContent = state.records.length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthTotal = 0, yearTotal = 0;
    state.records.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        const amt = parseFloat(r.grossAmount) || 0;
        if (d.getFullYear() === currentYear) {
            yearTotal += amt;
            if (d.getMonth() === currentMonth) monthTotal += amt;
        }
    });

    document.getElementById('statMonthTotal').textContent = '₹' + monthTotal.toLocaleString('en-IN');
    document.getElementById('statYearTotal').textContent = '₹' + yearTotal.toLocaleString('en-IN');
    document.getElementById('statStaffCount').textContent = state.records.length;

    const months = [
        t('jan'), t('feb'), t('mar'), t('apr'),
        t('may'), t('jun'), t('jul'), t('aug'),
        t('sep'), t('oct'), t('nov'), t('dec')
    ];
    const monthlyData = new Array(12).fill(0);
    state.records.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (d.getFullYear() === currentYear) {
            monthlyData[d.getMonth()] += parseFloat(r.grossAmount) || 0;
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

api.updateDashboard = updateDashboard;
