// auth-ui.js - Login/signup/forgot password UI interactions.

import { t, setLanguage, getLang } from "./i18n.js";
import { toast } from "../ui/toast.js";
import * as authService from "../services/auth-service.js";
import { state } from "../services/app-state.js";

let onLoginSuccess = null;
let onLogout = null;

export function initAuthUI({ onLogin, onLogout: logoutCb }) {
    onLoginSuccess = onLogin;
    onLogout = logoutCb;
    attachFormListeners();
    restoreTabState();
}

function attachFormListeners() {
    document.getElementById('loginEmail')?.addEventListener('keydown', e => e.key === 'Enter' && handleLogin());
    document.getElementById('loginPass')?.addEventListener('keydown', e => e.key === 'Enter' && handleLogin());
    document.getElementById('signupName')?.addEventListener('keydown', e => e.key === 'Enter' && handleSignup());
    document.getElementById('signupEmail')?.addEventListener('keydown', e => e.key === 'Enter' && handleSignup());
    document.getElementById('signupPass')?.addEventListener('keydown', e => e.key === 'Enter' && handleSignup());
    document.getElementById('signupConfirm')?.addEventListener('keydown', e => e.key === 'Enter' && handleSignup());
    document.getElementById('forgotUser')?.addEventListener('keydown', e => e.key === 'Enter' && handleForgot());
    document.getElementById('forgotNewPass')?.addEventListener('keydown', e => e.key === 'Enter' && handleForgot());
}

function restoreTabState() {
    switchLoginTab('signin');
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (!email || !pass) {
        toast(t('please_fill_all_fields'), 'error');
        return;
    }
    try {
        await authService.signInWithEmail(email, pass);
        toast(t('login_successful'), 'success');
        document.getElementById('loginPass').value = '';
        onLoginSuccess?.();
    } catch (error) {
        toast(t('invalid_email_password'), 'error');
    }
}

async function handleGoogleSignIn() {
    try {
        await authService.signInWithGoogle();
        toast(t('google_signin_success'), 'success');
        onLoginSuccess?.();
    } catch (err) {
        console.error(err);
        toast(err.message, 'error');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPass').value;
    const confirm = document.getElementById('signupConfirm').value;
    if (!name || !email || !pass) {
        toast(t('please_fill_all_fields'), 'error');
        return;
    }
    if (pass !== confirm) {
        toast(t('passwords_do_not_match'), 'error');
        return;
    }
    try {
        await authService.signUpWithEmail(name, email, pass);
        toast(t('account_created_successfully'), 'success');
        onLoginSuccess?.();
    } catch (error) {
        toast(error.message, 'error');
    }
}

function switchLoginTab(tab) {
    document.getElementById('tabSignin').classList.toggle('active', tab === 'signin');
    document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
    document.getElementById('signinForm').style.display = tab === 'signin' ? 'block' : 'none';
    document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

function showForgot() {
    document.getElementById('signinForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotFormSection').classList.add('active');
}

function showLogin() {
    document.getElementById('forgotFormSection').classList.remove('active');
    document.getElementById('signinForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    switchLoginTab('signin');
}

function handleForgot() {
    const user = document.getElementById('forgotUser').value.trim();
    const newPass = document.getElementById('forgotNewPass').value;
    if (!user || !newPass) {
        toast(t('please_fill_all_fields'), 'error');
        return;
    }
    const users = authService.getLocalUsers();
    if (!users[user]) {
        toast(t('user_not_found'), 'error');
        return;
    }
    authService.updateLocalUser(user, { password: newPass });
    toast(t('password_reset_successful'), 'success');
    showLogin();
}

async function handleLogout() {
    try {
        await authService.signOutUser();
        state.currentUser = null;
        authService.clearStoredSession();
        document.getElementById('appLayout').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginPass').value = '';
        document.getElementById('signinForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('forgotFormSection').classList.remove('active');
        switchLoginTab('signin');
        toast(t('logout_successful'), 'success');
        onLogout?.();
    } catch (error) {
        toast(error.message, 'error');
    }
}

function changePassword() {
    const old = document.getElementById('settingOldPass').value;
    const np = document.getElementById('settingNewPass').value;
    const cp = document.getElementById('settingConfirmPass').value;
    if (!old || !np || !cp) {
        toast(t('please_fill_all_fields'), 'error');
        return;
    }
    if (np !== cp) {
        toast(t('passwords_do_not_match'), 'error');
        return;
    }
    const currentUser = state.currentUser;
    if (!currentUser) {
        toast(t('current_password_wrong'), 'error');
        return;
    }
    const key = currentUser.email || currentUser.username;
    const users = authService.getLocalUsers();
    const localUser = users[key] || users[currentUser.username];
    if (!localUser || localUser.password !== old) {
        toast(t('current_password_wrong'), 'error');
        return;
    }
    authService.updateLocalUser(key, { password: np });
    document.getElementById('settingOldPass').value = '';
    document.getElementById('settingNewPass').value = '';
    document.getElementById('settingConfirmPass').value = '';
    toast(t('password_changed_successfully'), 'success');
}

export function getCurrentUser() {
    return state.currentUser;
}

export function setCurrentUser(user) {
    state.currentUser = user;
}

export {
    handleLogin,
    handleGoogleSignIn,
    handleSignup,
    switchLoginTab,
    showForgot,
    showLogin,
    handleForgot,
    handleLogout,
    changePassword
};