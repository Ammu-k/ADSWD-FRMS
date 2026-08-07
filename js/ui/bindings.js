// bindings.js - Centralized event delegation. Replaces all inline
// onclick/onchange/oninput/onkeydown handlers with data-action attributes.

import * as authUI from "../features/auth-ui.js";
import { navigateTo, toggleSidebar } from "../features/navigation.js";
import { cycleTheme } from "../features/theme.js";
import * as cashbook from "../features/cashbook-form.js";
import * as recordsTable from "../features/records-table.js";
import * as reports from "../features/reports.js";
import * as importExport from "../features/import-export.js";
import * as backup from "../features/backup.js";
import { saveSettings } from "../features/settings.js";
import * as admin from "../features/admin.js";
import { setLanguage } from "../features/i18n.js";

const clickHandlers = {
    switchLoginTab: (el) => authUI.switchLoginTab(el.dataset.arg),
    handleGoogleSignIn: () => authUI.handleGoogleSignIn(),
    handleLogin: () => authUI.handleLogin(),
    handleSignup: () => authUI.handleSignup(),
    handleForgot: () => authUI.handleForgot(),
    handleLogout: () => authUI.handleLogout(),
    showForgot: () => authUI.showForgot(),
    showLogin: () => authUI.showLogin(),
    navigateTo: (el) => navigateTo(el.dataset.arg),
    toggleSidebar: () => toggleSidebar(),
    cycleTheme: () => cycleTheme(),
    saveCashBook: () => cashbook.saveCashBook(),
    submitCashBook: () => cashbook.submitCashBook(),
    resetCashBook: () => cashbook.resetCashBook(),
    saveEdit: () => recordsTable.saveEdit(),
    closeEditModal: () => recordsTable.closeEditModal(),
    closeConfirmModal: () => recordsTable.closeConfirmModal(),
    clearReportDay: () => reports.clearReportDay(),
    printReport: () => reports.printReport(),
    exportReportPDF: () => reports.exportReportPDF(),
    exportReportExcel: () => reports.exportReportExcel(),
    confirmImport: () => importExport.confirmImport(),
    cancelImport: () => importExport.cancelImport(),
    exportAllRecords: () => importExport.exportAllRecords(),
    exportMonthlyReport: () => importExport.exportMonthlyReport(),
    createBackup: () => backup.createBackup(),
    clearAllData: () => backup.clearAllData(),
    saveSettings: () => saveSettings(),
    switchAdminTab: (el) => admin.switchAdminTab(el.dataset.arg),
    toggleAdminRole: (el) => admin.toggleAdminRole(el.dataset.arg),
    showAddSchemeForm: () => admin.showAddSchemeForm(),
    saveScheme: () => admin.saveScheme(),
    cancelAddScheme: () => admin.cancelAddScheme(),
    deleteScheme: (el) => admin.deleteScheme(parseInt(el.dataset.arg, 10)),
    editRecord: (el) => recordsTable.editRecord(el.dataset.arg),
    deleteRecord: (el) => recordsTable.deleteRecord(el.dataset.arg),
    pickFile: (el) => document.getElementById(el.dataset.arg)?.click(),
};

const changeHandlers = {
    setLanguage: (el) => setLanguage(el.value),
    filterRecords: () => recordsTable.filterRecords(),
    generateReport: () => reports.generateReport(),
    handleImport: (e) => importExport.handleImport(e),
    restoreBackup: (e) => backup.restoreBackup(e),
};

const inputHandlers = {
    calcReceiptGross: () => cashbook.calcReceiptGross(),
    calcPaymentGross: () => cashbook.calcPaymentGross(),
    filterRecords: () => recordsTable.filterRecords(),
};

const keydownHandlers = {
    saveScheme: (el, e) => { if (e.key === 'Enter') admin.saveScheme(); },
};

function dispatch(handlers, e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = handlers[el.dataset.action];
    if (!fn) return;
    fn(el, e);
}

export function initBindings() {
    document.addEventListener('click', (e) => dispatch(clickHandlers, e));
    document.addEventListener('change', (e) => dispatch(changeHandlers, e));
    document.addEventListener('input', (e) => dispatch(inputHandlers, e));
    document.addEventListener('keydown', (e) => dispatch(keydownHandlers, e));
}
