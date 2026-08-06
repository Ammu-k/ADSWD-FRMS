// cashbook-form.js - Cash Book entry form (receipts + payments).

import { t } from "./i18n.js";
import { toast } from "../ui/toast.js";
import { api } from "../services/registry.js";
import { addRecordToFirestore, loadRecordsFromFirestore, handleFirestoreError } from "../services/records-service.js";

export function initMonthSelects() {
    const months = [
        t('january'), t('february'), t('march'), t('april'),
        t('may_full'), t('june'), t('july'), t('august'),
        t('september'), t('october'), t('november'), t('december')
    ];
    const now = new Date();
    const el = document.getElementById('reportMonth');
    if (el) el.innerHTML = months.map((m, i) => `<option value="${i}"${i === now.getMonth() ? ' selected' : ''}>${m}</option>`).join('');
    const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
    const el2 = document.getElementById('reportYear');
    if (el2) el2.innerHTML = years.map(y => `<option value="${y}"${y === now.getFullYear() ? ' selected' : ''}>${y}</option>`).join('');
}

export function populateMonthSelectors() {
    initMonthSelects();
    const months = [
        t('january'), t('february'), t('march'), t('april'),
        t('may_full'), t('june'), t('july'), t('august'),
        t('september'), t('october'), t('november'), t('december')
    ];
    const mf = document.getElementById('recordMonthFilter');
    mf.innerHTML = '<option value="">All Months</option>' + months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
}

export function calcReceiptGross() {
    const net = parseFloat(document.getElementById('rcNetPay').value) || 0;
    const ded = parseFloat(document.getElementById('rcDeduction').value) || 0;
    document.getElementById('rcGrossAmount').value = (net + ded).toFixed(2);
    updateCashBookTotal();
}

export function calcPaymentGross() {
    const net = parseFloat(document.getElementById('pmNetPay').value) || 0;
    const ded = parseFloat(document.getElementById('pmDeduction').value) || 0;
    document.getElementById('pmGrossAmount').value = (net + ded).toFixed(2);
    updateCashBookTotal();
}

export function updateCashBookTotal() {
    const rGross = parseFloat(document.getElementById('rcGrossAmount').value) || 0;
    const pGross = parseFloat(document.getElementById('pmGrossAmount').value) || 0;
    document.getElementById('cbBankTotal').textContent = '₹' + (rGross).toLocaleString('en-IN');
}

export function updateCashBook() { calcReceiptGross(); calcPaymentGross(); }

export async function saveCashBook() {
    const rcDate = document.getElementById('rcDate').value;
    const rcReceiptNo = document.getElementById('rcReceiptNo').value.trim();
    const rcParticulars = document.getElementById('rcParticulars').value.trim();
    const rcNetPay = parseFloat(document.getElementById('rcNetPay').value) || 0;
    const rcDeduction = parseFloat(document.getElementById('rcDeduction').value) || 0;
    const rcGrossAmount = parseFloat(document.getElementById('rcGrossAmount').value) || 0;

    const pmDate = document.getElementById('pmDate').value;
    const pmReceiptNo = document.getElementById('pmReceiptNo').value.trim();
    const pmBeneficiary = document.getElementById('pmBeneficiary').value.trim();
    const pmTokenNo = document.getElementById('pmTokenNo').value.trim();
    const pmUtrNo = document.getElementById('pmUtrNo').value.trim();
    const pmPayDate = document.getElementById('pmPayDate').value;
    const pmNetPay = parseFloat(document.getElementById('pmNetPay').value) || 0;
    const pmDeduction = parseFloat(document.getElementById('pmDeduction').value) || 0;
    const pmGrossAmount = parseFloat(document.getElementById('pmGrossAmount').value) || 0;

    const hasReceipt = rcParticulars || rcNetPay || rcGrossAmount;
    const hasPayment = pmBeneficiary || pmNetPay || pmGrossAmount;

    if (!hasReceipt && !hasPayment) { toast(t('no_data_to_save'), 'error'); return; }

    try {
        const savedRecords = [];
        if (hasReceipt) {
            const newRecord = await addRecordToFirestore({ date: rcDate, receiptNo: rcReceiptNo, particulars: rcParticulars, netPay: rcNetPay, deduction: rcDeduction, grossAmount: rcGrossAmount, type: 'receipt' });
            savedRecords.push(newRecord);
        }
        if (hasPayment) {
            const newRecord = await addRecordToFirestore({ date: pmDate, receiptNo: pmReceiptNo, particulars: pmBeneficiary, beneficiary: pmBeneficiary, tokenNo: pmTokenNo, utrNo: pmUtrNo, paymentDate: pmPayDate, netPay: pmNetPay, deduction: pmDeduction, grossAmount: pmGrossAmount, type: 'payment' });
            savedRecords.push(newRecord);
        }

        await loadRecordsFromFirestore();
        api.filterRecords?.();
        api.updateDashboard?.();
        api.generateReport?.();
        const count = savedRecords.length;
        toast(`${t('saved')} ${count} ${t('records_saved')}`, 'success');
        resetCashBook();
    } catch (error) {
        await handleFirestoreError('saveCashBook', error);
    }
}

export function submitCashBook() {
    saveCashBook();
}

export function resetCashBook() {
    document.getElementById('rcDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('rcReceiptNo').value = '';
    document.getElementById('rcParticulars').value = '';
    document.getElementById('rcNetPay').value = '';
    document.getElementById('rcDeduction').value = '';
    document.getElementById('rcGrossAmount').value = '';
    document.getElementById('pmDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('pmReceiptNo').value = '';
    document.getElementById('pmBeneficiary').value = '';
    document.getElementById('pmTokenNo').value = '';
    document.getElementById('pmUtrNo').value = '';
    document.getElementById('pmPayDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('pmNetPay').value = '';
    document.getElementById('pmDeduction').value = '';
    document.getElementById('pmGrossAmount').value = '';
    updateCashBookTotal();
}
