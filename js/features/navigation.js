// navigation.js - Page navigation and sidebar handling.

import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";

export function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) { target.classList.add('active'); }
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');
    if (page === 'dashboard') api.updateDashboard?.();
    if (page === 'records') api.filterRecords?.();
    if (page === 'reports') { api.populateReportSelectors?.(); api.generateReport?.(); }
    if (page === 'admin') {
        api.loadSettingsUI?.();
        document.getElementById('backupRecordCount').textContent = state.records.length;
        api.renderAdminUsers?.();
    }
}

export function toggleSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.toggle("mobile-open");
    } else {
        document.querySelector(".app-layout").classList.toggle("collapsed");
    }
}

export function checkResponsive() {
    const mt = document.getElementById('menuToggle');
    if (window.innerWidth <= 768) { mt.style.display = 'flex'; }
    else { mt.style.display = 'none'; document.getElementById('sidebar').classList.remove('mobile-open'); }
}
