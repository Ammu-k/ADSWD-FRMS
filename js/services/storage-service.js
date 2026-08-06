// storage-service.js - Centralized localStorage/sessionStorage access and key names.

export const APP_KEY = 'sw-frms';
export const THEME_KEY = APP_KEY + '_theme';

export const KEYS = {
  records: APP_KEY + '_records',
  users: APP_KEY + '_users',
  schemes: APP_KEY + '_schemes',
  settings: APP_KEY + '_settings',
  lang: APP_KEY + '_lang',
  daySignatures: APP_KEY + '_daySignatures',
  session: APP_KEY + '_session',
};

export function getItem(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export function setItem(key, value) {
  localStorage.setItem(key, value);
}

export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSession(key, fallback = null) {
  try {
    const v = sessionStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export function setSession(key, value) {
  sessionStorage.setItem(key, value);
}
