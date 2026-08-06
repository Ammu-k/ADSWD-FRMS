// auth-service.js - Firebase Auth + local storage user helpers.

import { auth } from "../../firebase.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword
} from "../../firebase.js";
import { KEYS, getJSON, setJSON, setSession, getSession } from "./storage-service.js";

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return normalizeUser(userCredential.user, 'staff');
}

export async function signUpWithEmail(name, email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return normalizeUser(userCredential.user, 'staff', name);
}

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = normalizeUser(result.user, 'admin');
    setStoredSession(user);
    return user;
}

export async function signOutUser() {
    await signOut(auth);
}

export async function resetPasswordEmail(email) {
    await sendPasswordResetEmail(auth, email);
}

export async function updateUserPassword(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    await updatePassword(user, password);
}

function normalizeUser(firebaseUser, role, displayName = null) {
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        role: role
    };
}

// Local user storage helpers (for admin/forgot-password flows)
export function getLocalUsers() {
    return getJSON(KEYS.users, {});
}

export function setLocalUsers(users) {
    setJSON(KEYS.users, users);
}

export function getLocalUser(username) {
    const users = getLocalUsers();
    return users[username] || null;
}

export function updateLocalUser(username, updates) {
    const users = getLocalUsers();
    if (!users[username]) return false;
    users[username] = { ...users[username], ...updates };
    setLocalUsers(users);
    return true;
}

export function getStoredSession() {
    return getSession(KEYS.session);
}

export function setStoredSession(user) {
    setSession(KEYS.session, JSON.stringify(user));
}

export function clearStoredSession() {
    sessionStorage.removeItem(KEYS.session);
}