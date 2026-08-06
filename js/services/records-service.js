// records-service.js - Firestore CRUD + local storage fallback for records.

import { db } from "../../firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "../../firebase.js";
import { KEYS, getJSON, setJSON } from "./storage-service.js";
import { state } from "./app-state.js";
import { api } from "./registry.js";
import { genId } from "../utils/format.js";
import { toast } from "../ui/toast.js";

export function saveRecordsToLocalStorage() {
    try {
        setJSON(KEYS.records, state.records);
    } catch (error) {
        console.error('saveRecordsToLocalStorage', error);
    }
}

export function loadRecordsFromLocalStorage() {
    try {
        const stored = getJSON(KEYS.records, []);
        state.records = Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.error('loadRecordsFromLocalStorage', error);
        state.records = [];
    }
}

export async function handleFirestoreError(action, error, options = {}) {
    console.error(action, error);
    if (!state.firestoreFallbackActive) {
        state.firestoreFallbackActive = true;
        if (options.silent !== true) {
            toast('Firestore is unavailable right now. Records are being saved locally in this browser.', 'info');
        }
    }
}

export async function loadRecordsFromFirestore() {
    state.records = [];
    try {
        const snapshot = await getDocs(collection(db, "records"));
        const loadedRecords = [];
        snapshot.forEach((docSnap) => {
            loadedRecords.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        state.records = loadedRecords;
        if (typeof api.filterRecords === 'function') api.filterRecords();
        if (typeof api.updateDashboard === 'function') api.updateDashboard();
        if (typeof api.generateReport === 'function') api.generateReport();
        console.log('[Firestore] Shared records loaded:', state.records.length);
    } catch (error) {
        console.error('[Firestore] loadRecordsFromFirestore error:', error.code || error, error.message || '');
        await handleFirestoreError('loadRecordsFromFirestore', error, { silent: true });
    }
}

export async function addRecordToFirestore(payload) {
    const { id, ...recordData } = payload || {};
    const tempId = genId();
    const localRecord = { ...payload, id: tempId };
    state.records = [...state.records, localRecord];
    api.filterRecords?.();
    try {
        const docRef = await addDoc(collection(db, "records"), {
            ...recordData,
            createdBy: state.currentUser?.email || "anonymous",
            updatedAt: new Date().toISOString(),
        });
        const syncedRecord = { ...recordData, id: docRef.id };
        state.records = state.records.map((item) => item.id === tempId ? syncedRecord : item);
        api.filterRecords?.();
        console.log('[Firestore] Record created:', docRef.id);
        return syncedRecord;
    } catch (error) {
        state.records = state.records.filter((item) => item.id !== tempId);
        api.filterRecords?.();
        console.error('[Firestore] Add error -', error.code, error.message);
        await handleFirestoreError('addRecordToFirestore', error);
        throw error;
    }
}

export async function updateRecordInFirestore(id, payload) {
    const { id: ignoredId, ...recordData } = payload || {};
    const updatedRecord = { ...payload, id };
    const previousRecords = [...state.records];
    state.records = state.records.map((item) => item.id === id ? updatedRecord : item);
    api.filterRecords?.();
    try {
        await updateDoc(doc(db, "records", id), {
            ...recordData,
            updatedBy: state.currentUser?.email || "anonymous",
            updatedAt: new Date().toISOString(),
        });
        console.log('[Firestore] Record updated:', id);
        return updatedRecord;
    } catch (error) {
        state.records = previousRecords;
        api.filterRecords?.();
        console.error('[Firestore] Update error -', error.code, error.message);
        await handleFirestoreError('updateRecordInFirestore', error);
        throw error;
    }
}

export async function deleteRecordFromFirestore(id) {
    const previousRecords = [...state.records];
    state.records = state.records.filter((item) => item.id !== id);
    api.filterRecords?.();
    try {
        await deleteDoc(doc(db, "records", id));
        console.log('[Firestore] Record deleted:', id);
    } catch (error) {
        state.records = previousRecords;
        api.filterRecords?.();
        console.error('[Firestore] Delete error -', error.code, error.message);
        await handleFirestoreError('deleteRecordFromFirestore', error);
        throw error;
    }
}
