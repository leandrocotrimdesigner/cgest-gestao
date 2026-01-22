
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
let googleProvider: GoogleAuthProvider;
let isConfigured = false;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    // Força a seleção de conta para evitar login automático indesejado em sessões compartilhadas
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    isConfigured = true;
    console.log("Firebase (cgest-e9b48) iniciado com sucesso.");
} catch (e) {
    console.error("Erro crítico ao iniciar Firebase:", e);
    isConfigured = false;
}

export { db, auth, googleProvider, isConfigured };
