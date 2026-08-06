// theme.js - Theme (dark/light/system) management.

import { getItem, setItem, THEME_KEY } from "../services/storage-service.js";

let currentTheme = 'dark';

export function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
    if (theme === 'system') theme = getSystemTheme();
    document.body.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    const btn = icon.closest('button');
    const icons = {
        dark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        light: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
        system: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
    };
    icon.innerHTML = icons[theme] || icons.dark;
    if (btn) {
        const labels = {
            dark: 'Dark',
            light: 'Light',
            system: 'System'
        };
        btn.title = labels[theme] || 'Toggle theme';
    }
}

export function cycleTheme() {
    const modes = ['dark', 'light', 'system'];
    const idx = modes.indexOf(currentTheme);
    currentTheme = modes[(idx + 1) % 3];
    setItem(THEME_KEY, currentTheme);
    applyTheme(currentTheme);
}

export function initTheme() {
    currentTheme = getItem(THEME_KEY, 'dark');
    applyTheme(currentTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme === 'system') applyTheme('system');
    });
}
