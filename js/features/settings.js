// settings.js - General settings (department name, financial year, currency).

import { t } from "./i18n.js";
import { toast } from "../ui/toast.js";
import { KEYS, getJSON, setJSON } from "../services/storage-service.js";
import { api } from "../services/registry.js";

export function saveSettings() {
    const settings = {
        deptName: (document.getElementById('settingDeptName')?.value) || t('default_department'),
        finYear: (document.getElementById('settingFinYear')?.value) || '2026-2027',
        currency: document.getElementById('settingCurrency')?.value || 'INR'
    };
    setJSON(KEYS.settings, settings);
    document.getElementById('cbDeptName').textContent = settings.deptName;
    toast(t('settings_saved'), 'success');
}

export function loadSettingsUI() {
    const s = getJSON(KEYS.settings, {});
    if (s.deptName) { const el = document.getElementById('settingDeptName'); if (el) el.value = s.deptName; }
    if (s.finYear) { const el = document.getElementById('settingFinYear'); if (el) el.value = s.finYear; }
}

api.loadSettingsUI = loadSettingsUI;
