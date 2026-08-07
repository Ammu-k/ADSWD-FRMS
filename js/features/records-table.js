// records-table.js - Records list: filtering, sorting, edit/delete.

import { t } from "./i18n.js";
import { esc, formatDate } from "../utils/format.js";
import { toast } from "../ui/toast.js";
import { state } from "../services/app-state.js";
import { api } from "../services/registry.js";
import { updateRecordInFirestore, deleteRecordFromFirestore, handleFirestoreError } from "../services/records-service.js";

export function filterRecords() {
    const search = (document.getElementById('recordSearch').value || '').toLowerCase();
    const typeF = document.getElementById('recordTypeFilter').value;
    const monthF = document.getElementById('recordMonthFilter').value;
    const dateF = document.getElementById('recordDateFilter').value;

    let filtered = state.records.filter(r => {
        if (typeF && r.type !== typeF) return false;
        if (monthF !== '' && r.date) {
            const m = new Date(r.date).getMonth().toString();
            if (m !== monthF) return false;
        }
        if (dateF && r.date && !r.date.startsWith(dateF)) return false;
        if (search) {
            const s = (r.particulars || '') + (r.receiptNo || '') + (r.beneficiary || '') + (r.date || '');
            if (!s.toLowerCase().includes(search)) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        let va = a[state.sortState.col] || '', vb = b[state.sortState.col] || '';
        if (state.sortState.col === 'grossAmount' || state.sortState.col === 'netPay' || state.sortState.col === 'deduction') {
            va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
        }
        if (va < vb) return state.sortState.dir === 'asc' ? -1 : 1;
        if (va > vb) return state.sortState.dir === 'asc' ? 1 : -1;
        return 0;
    });

    document.getElementById('recordCount').textContent = `${filtered.length} ${t('records')}`;
    const totalAmt = filtered.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
    document.getElementById('recordsSubtitle').textContent = `${filtered.length} ${t('shown')} · ₹${totalAmt.toLocaleString('en-IN')}`;
    document.getElementById('recordsBody').innerHTML = filtered.length ? filtered.map(r => `<tr>
<td>${formatDate(r.date)}</td>
<td><span class="badge ${r.type === 'receipt' ? 'badge-success' : 'badge-danger'}">${t(r.type)}</span></td>
<td>${esc(r.receiptNo || '-')}</td>
<td>${esc(r.particulars || '-')}</td>
<td>${esc(r.beneficiary || '-')}</td>
<td class="amount">₹${parseFloat(r.netPay || 0).toLocaleString('en-IN')}</td>
<td class="amount">₹${parseFloat(r.deduction || 0).toLocaleString('en-IN')}</td>
<td class="amount">₹${parseFloat(r.grossAmount || 0).toLocaleString('en-IN')}</td>
<td style="white-space:nowrap">
<button class="btn-icon btn-icon-edit" data-action="editRecord" data-arg="${r.id}" title="${t('edit')}">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
</button>
<button class="btn-icon btn-icon-delete" data-action="deleteRecord" data-arg="${r.id}" title="${t('delete')}">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
</button>
</td>
</tr>`).join('') : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light)">${t('no_records_found')}</td></tr>`;
}

export function sortRecords(col) {
    if (state.sortState.col === col) state.sortState.dir = state.sortState.dir === 'asc' ? 'desc' : 'asc';
    else { state.sortState.col = col; state.sortState.dir = 'asc'; }
    filterRecords();
}

export function editRecord(id) {
    const r = state.records.find(x => x.id === id); if (!r) return;
    document.getElementById('editId').value = id;
    document.getElementById('editType').value = r.type;
    document.getElementById('editDate').value = r.date || '';
    document.getElementById('editReceiptNo').value = r.receiptNo || '';
    document.getElementById('editParticulars').value = r.particulars || '';
    document.getElementById('editBeneficiary').value = r.beneficiary || '';
    document.getElementById('editNetPay').value = r.netPay || '';
    document.getElementById('editDeduction').value = r.deduction || '';
    document.getElementById('editGrossAmount').value = r.grossAmount || '';
    document.getElementById('editModal').classList.add('active');
}

export async function saveEdit() {
    const id = document.getElementById('editId').value;
    const idx = state.records.findIndex(x => x.id === id);
    if (idx === -1) return;
    const updatedRecord = {
        ...state.records[idx],
        type: document.getElementById('editType').value,
        date: document.getElementById('editDate').value,
        receiptNo: document.getElementById('editReceiptNo').value,
        particulars: document.getElementById('editParticulars').value,
        beneficiary: document.getElementById('editBeneficiary').value,
        netPay: parseFloat(document.getElementById('editNetPay').value) || 0,
        deduction: parseFloat(document.getElementById('editDeduction').value) || 0,
        grossAmount: parseFloat(document.getElementById('editGrossAmount').value) || 0
    };
    try {
        await updateRecordInFirestore(id, updatedRecord);
        api.filterRecords?.();
        api.updateDashboard?.();
        api.generateReport?.();
        toast(t('record_updated'), 'success');
    } catch (error) {
        await handleFirestoreError('saveEdit', error);
        api.filterRecords?.();
        api.updateDashboard?.();
        api.generateReport?.();
        toast('Failed to update record', 'error');
        return;
    }
    closeEditModal();
}

export function closeEditModal() { document.getElementById('editModal').classList.remove('active'); }

export function deleteRecord(id) {
    document.getElementById('confirmMessage').textContent = t('delete_record_confirm');
    document.getElementById('confirmModal').classList.add('active');
    document.getElementById('confirmAction').onclick = async () => {
        try {
            await deleteRecordFromFirestore(id);
            api.filterRecords?.();
            api.updateDashboard?.();
            api.generateReport?.();
            toast(t('record_deleted'), 'success');
        } catch (error) {
            await handleFirestoreError('deleteRecord', error);
            api.filterRecords?.();
            api.updateDashboard?.();
            api.generateReport?.();
            toast(t('record_deleted'), 'success');
        }
        closeConfirmModal();
    };
}

export function closeConfirmModal() { document.getElementById('confirmModal').classList.remove('active'); }

function getFilteredRecords() {
    const search = (document.getElementById('recordSearch').value || '').toLowerCase();
    const typeF = document.getElementById('recordTypeFilter').value;
    const monthF = document.getElementById('recordMonthFilter').value;
    const dateF = document.getElementById('recordDateFilter').value;

    let filtered = state.records.filter(r => {
        if (typeF && r.type !== typeF) return false;
        if (monthF !== '' && r.date) {
            const m = new Date(r.date).getMonth().toString();
            if (m !== monthF) return false;
        }
        if (dateF && r.date && !r.date.startsWith(dateF)) return false;
        if (search) {
            const s = (r.particulars || '') + (r.receiptNo || '') + (r.beneficiary || '') + (r.date || '');
            if (!s.toLowerCase().includes(search)) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        let va = a[state.sortState.col] || '', vb = b[state.sortState.col] || '';
        if (state.sortState.col === 'grossAmount' || state.sortState.col === 'netPay' || state.sortState.col === 'deduction') {
            va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
        }
        if (va < vb) return state.sortState.dir === 'asc' ? -1 : 1;
        if (va > vb) return state.sortState.dir === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
}

api.filterRecords = filterRecords;
