import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbq1-EMnxUZm8d3jMz4fOTmU89ivXu9Sk",
  authDomain: "adswd-financial-records-341e4.firebaseapp.com",
  projectId: "adswd-financial-records-341e4",
  storageBucket: "adswd-financial-records-341e4.firebasestorage.app",
  messagingSenderId: "637649232868",
  appId: "1:637649232868:web:6499121217a0174399ddf1"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc
};

export const auth = getAuth(app);

export {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword
};