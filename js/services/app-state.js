// app-state.js - Mutable application state shared across modules.

export const state = {
  currentUser: null,
  records: [],
  pendingImport: null,
  sortState: { col: 'date', dir: 'desc' },
  firestoreFallbackActive: false
};

export function getCurrentUser() {
  return state.currentUser;
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function getRecords() {
  return state.records;
}

export function setRecords(records) {
  state.records = records;
}
