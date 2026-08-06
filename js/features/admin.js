// admin.js - Admin tab: user roles and scheme management.

import { t } from "./i18n.js";
import { esc } from "../utils/format.js";
import { toast } from "../ui/toast.js";
import { APP_KEY } from "../services/storage-service.js";
import { api } from "../services/registry.js";

function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(APP_KEY + '_users') || '{}');
    } catch (error) {
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(APP_KEY + '_users', JSON.stringify(users));
}

function loadSchemes() {
    try {
        return JSON.parse(localStorage.getItem(APP_KEY + '_schemes') || '[]');
    } catch (error) {
        return [];
    }
}

function saveSchemes(schemes) {
    localStorage.setItem(APP_KEY + '_schemes', JSON.stringify(schemes));
}

export function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('active'); t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-light)'; });
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    const tabs = document.querySelectorAll('.admin-tab');
    const idx = tab === 'users' ? 0 : tab === 'schemes' ? 1 : tab === 'backup' ? 2 : 3;
    tabs[idx].classList.add('active');
    tabs[idx].style.borderBottomColor = 'var(--primary)';
    tabs[idx].style.color = 'var(--text)';
    document.getElementById('adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
}

export function renderAdminUsers() {
    const users = loadUsers();
    const tbody = document.getElementById('adminUsersBody');
    if (!tbody) return;
    tbody.innerHTML = Object.entries(users).map(([username, u]) => {
        const role = u.role || t('role_staff');
        const isAdmin = role === 'admin';
        return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:16px;font-size:14px;font-weight:500">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--bg);margin-right:12px;font-size:14px">
            ${(u.name || username).charAt(0).toUpperCase()}
          </span>
          ${esc(u.name || username)}
        </td>
        <td style="padding:16px;font-size:14px;color:var(--text-light)">
          ${esc(username)}
        </td>
        <td style="padding:16px">
          <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;${isAdmin ? 'background:#0d9488;color:#fff' : 'background:var(--bg);color:var(--text)'}">
            ${role}
          </span>
        </td>
        <td style="padding:16px;font-size:13px;color:var(--text-light)">
          ${u.joined || '—'}
        </td>
        <td style="padding:16px;text-align:right">
          ${
            username !== 'admin'
              ? `<button class="btn btn-sm btn-outline" data-action="toggleAdminRole" data-arg="${username}">
                  ${isAdmin ? t('revoke_admin') : t('make_admin')}
                 </button>`
              : ''
          }
        </td>
      </tr>
    `;
    }).join('');
}

export function toggleAdminRole(username) {
    const users = loadUsers();
    if (!users[username]) return;
    users[username].role = users[username].role === 'admin' ? 'staff' : 'admin';
    saveUsers(users);
    renderAdminUsers();
}

export function addScheme() {
    const name = prompt(t('enter_scheme_name'));
    if (!name) return;
    const schemes = loadSchemes();
    schemes.push({ name, created: new Date().toLocaleDateString('en-IN') });
    saveSchemes(schemes);
    renderSchemes();
}

export function showAddSchemeForm() {
    document.getElementById('addSchemeForm').style.display = 'block';
    document.getElementById('schemeNameInput').value = '';
    document.getElementById('schemeNameInput').focus();
}

export function saveScheme() {
    const name = document.getElementById('schemeNameInput').value.trim();
    if (!name) { toast(t('please_enter_scheme_name'), 'error'); return; }
    const schemes = loadSchemes();
    schemes.push({ name, created: new Date().toLocaleDateString('en-IN') });
    saveSchemes(schemes);
    document.getElementById('addSchemeForm').style.display = 'none';
    renderSchemes();
    toast(t('scheme_added'), 'success');
}

export function cancelAddScheme() {
    document.getElementById('addSchemeForm').style.display = 'none';
}

export function renderSchemes() {
    const schemes = loadSchemes();
    const container = document.getElementById('schemesList');
    if (!container) return;
    container.innerHTML = schemes.length ? schemes.map((s, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border:1px solid var(--border);border-radius:8px">
      <div>
        <div style="font-weight:500">${esc(s.name)}</div>
        <div style="font-size:12px;color:var(--text-light)">${t('created')}: ${s.created || '—'}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-action="deleteScheme" data-arg="${i}">${t('delete')}</button>
    </div>
  `).join('') : `<p style="color:var(--text-light);font-size:14px;text-align:center;padding:20px">${t('no_schemes_added')}</p>`;
}

export function deleteScheme(index) {
    if (!confirm(t('delete_scheme_confirm'))) return;
    const schemes = loadSchemes();
    schemes.splice(index, 1);
    saveSchemes(schemes);
    renderSchemes();
}

api.renderAdminUsers = renderAdminUsers;
