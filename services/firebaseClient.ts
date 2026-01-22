
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- CONFIGURAÇÃO OFICIAL DO FIREBASE (PRODUÇÃO) ---
const firebaseConfig = {
  apiKey: "AIzaSyDbX-xYJQMiUraCp252GsjwfxGyxQ8PrJc",
  authDomain: "cgest-e9b48.firebaseapp.com",
  projectId: "cgest-e9b48",
  storageBucket: "cgest-e9b48.firebasestorage.app",
  messagingSenderId: "399870636201",
  appId: "1:399870636201:web:5b3a94b1929fe46e9739b8",
  measurementId: "G-TETJFXZJ90"
};

let app;
let db: any;
let auth: any;
let isConfigured = false;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isConfigured = true;
    console.log("Firebase (cgest-e9b48) iniciado com sucesso.");
} catch (e) {
    console.error("Erro crítico ao iniciar Firebase:", e);
    isConfigured = false;
}

export { db, auth, isConfigured };
