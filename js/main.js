// main.js - Entry point: wires services and features together.

import { t, setLanguage, getLang, initLang } from "./features/i18n.js";
import { KEYS, getItem, getJSON } from "./services/storage-service.js";
import { state } from "./services/app-state.js";
import { api } from "./services/registry.js";
import { initBindings } from "./ui/bindings.js";
import * as authService from "./services/auth-service.js";
import * as authUI from "./features/auth-ui.js";
import * as recordsService from "./services/records-service.js";
import * as theme from "./features/theme.js";
import * as importExport from "./features/import-export.js";
import * as cashbook from "./features/cashbook-form.js";
import * as navigation from "./features/navigation.js";
import * as dashboard from "./features/dashboard.js"; // registers api.updateDashboard
import * as recordsTable from "./features/records-table.js"; // registers api.filterRecords
import * as reports from "./features/reports.js"; // registers api.generateReport/populateReportSelectors
import * as settings from "./features/settings.js"; // registers api.loadSettingsUI
import * as admin from "./features/admin.js"; // registers api.renderAdminUsers

// ===== AUTH INTEGRATION =====
function checkLogin() {
    authService.onAuthChange(async (user) => {
        if (user) {
            state.currentUser = user;
            try {
                await recordsService.loadRecordsFromFirestore();
            } catch (error) {
                console.error(error);
            }
            showApp();
        } else {
            document.getElementById("loginPage").style.display = "flex";
            document.getElementById("appLayout").style.display = "none";
        }
    });
}

function showApp() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appLayout").style.display = "flex";

    const displayName = document.getElementById("userDisplayName");
    if (displayName)
        displayName.textContent = state.currentUser.name;

    const avatar = document.getElementById("userAvatar");
    if (avatar)
        avatar.textContent = state.currentUser.name[0].toUpperCase();

    const role = document.getElementById("userRole");
    if (role)
        role.textContent = state.currentUser.role === "admin" ? t('role_admin') : t('role_staff');

    const welcome = document.getElementById("topbarWelcome");
    if (welcome)
        welcome.textContent = `${t('welcome_back')}, ${state.currentUser.name}`;

    setLanguage(getLang());

    api.filterRecords?.();
    api.updateDashboard?.();
    cashbook.populateMonthSelectors();
    reports.populateReportSelectors();
    api.generateReport?.();
    const backupCount = document.getElementById("backupRecordCount");
    if (backupCount)
        backupCount.textContent = state.records.length;
}

// Initialize auth UI
authUI.initAuthUI({
    onLogin: showApp,
    onLogout: () => {
        state.currentUser = null;
    }
});

// ===== INIT =====
async function init() {
    await recordsService.loadRecordsFromFirestore();
    initLang();
    const settingsData = getJSON(KEYS.settings, {});
    if (settingsData.deptName) {
        const el = document.getElementById('settingDeptName');
        if (el) el.value = settingsData.deptName;
    }
    if (settingsData.finYear) {
        const el = document.getElementById('settingFinYear');
        if (el) el.value = settingsData.finYear;
    }
    initBindings();
    importExport.setupDragDrop();
    theme.initTheme();
    checkLogin();
    if (!getItem(KEYS.users)) {
        const users = {
            admin: { password: 'admin123', role: 'admin', name: 'Administrator' },
            staff: { password: 'staff123', role: 'staff', name: 'Staff User' }
        };
        authService.setLocalUsers(users);
    }
    const today = new Date().toISOString().split('T')[0];
    ['rcDate', 'pmDate', 'pmPayDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
}

init();
