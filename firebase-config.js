// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
const firebaseConfig = {
    apiKey: "AIzaSyDmYUmOIQiVnkpirTazvVqipVDoRL048qg",
    authDomain: "hev-controle-presenca.firebaseapp.com",
    projectId: "hev-controle-presenca",
    storageBucket: "hev-controle-presenca.firebasestorage.app",
    messagingSenderId: "396980982112",
    appId: "1:396980982112:web:70f1ff0cab27c4388dce05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);