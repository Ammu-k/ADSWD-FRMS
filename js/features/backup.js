// backup.js - Backup/restore and clear-all-data operations.

import { db } from "../../firebase.js";
import { collection, getDocs, deleteDoc, doc, addDoc } from "../../firebase.js";
import { t } from "./i18n.js";
import { toast } from "../ui/toast.js";
import { genId } from "../utils/format.js";
import { KEYS, getJSON, setJSON } from "../services/storage-service.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";
import { saveRecordsToLocalStorage, handleFirestoreError } from "../services/records-service.js";

export function createBackup() {
    const data = { records: state.records, settings: getJSON(KEYS.settings, {}), exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sw-frms-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast(t('backup_created'), 'success');
}

export async function restoreBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.records && Array.isArray(data.records)) {
                try {
                    const existingSnapshot = await getDocs(collection(db, "records"));
                    await Promise.all(existingSnapshot.docs.map(docSnap => deleteDoc(doc(db, "records", docSnap.id))));
                } catch (error) {
                    await handleFirestoreError('restoreBackup:clearRemote', error);
                }
                const restoredRecords = [];
                for (const item of data.records) {
                    const { id, ...recordData } = item || {};
                    try {
                        const ref = await addDoc(collection(db, "records"), recordData);
                        restoredRecords.push({ ...recordData, id: ref.id });
                    } catch (error) {
                        restoredRecords.push({ ...recordData, id: item.id || genId() });
                        await handleFirestoreError('restoreBackup:addLocal', error);
                    }
                }
                state.records = restoredRecords;
                saveRecordsToLocalStorage();
                if (data.settings) setJSON(KEYS.settings, data.settings);
                document.getElementById('backupRecordCount').textContent = state.records.length;
                api.filterRecords?.();
                api.updateDashboard?.();
                api.generateReport?.();
                toast(`${t('restored')} ${state.records.length} ${t('records')}!`, 'success');
            }
        } catch (err) {
            await handleFirestoreError('restoreBackup', err);
            toast(t('invalid_backup_file'), 'error');
        }
    };
    reader.readAsText(file);
}

export async function clearAllData() {
    if (!confirm(t('delete_all_records_confirm'))) return;
    try {
        const existingSnapshot = await getDocs(collection(db, "records"));
        await Promise.all(existingSnapshot.docs.map(docSnap => deleteDoc(doc(db, "records", docSnap.id))));
    } catch (error) {
        await handleFirestoreError('clearAllData', error);
    }
    state.records = [];
    saveRecordsToLocalStorage();
    document.getElementById('backupRecordCount').textContent = '0';
    api.filterRecords?.();
    api.updateDashboard?.();
    api.generateReport?.();
    toast(t('all_data_cleared'), 'success');
}
