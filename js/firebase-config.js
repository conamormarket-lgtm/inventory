import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8ucZlgKwIyxBiGk_mVtM5_16bDSLoxr8",
    authDomain: "base-de-datos-30caf.firebaseapp.com",
    projectId: "base-de-datos-30caf",
    storageBucket: "base-de-datos-30caf.firebasestorage.app",
    messagingSenderId: "226160803440",
    appId: "1:226160803440:web:9bef2d7a901851ac323eb5",
    measurementId: "G-YLXB9XPV8H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
