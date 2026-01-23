
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// --- CONFIGURAÇÃO OFICIAL DO FIREBASE (PRODUÇÃO) ---
// ATENÇÃO: Verifique se a apiKey, messagingSenderId e appId correspondem ao novo projeto cgest-11430 no console.
const firebaseConfig = {
  apiKey: "AIzaSyDbX-xYJQMiUraCp252GsjwfxGyxQ8PrJc", // <--- SUBSTITUA PELA API KEY DO NOVO PROJETO SE FOR DIFERENTE
  authDomain: "cgest-11430.firebaseapp.com",
  projectId: "cgest-11430",
  storageBucket: "cgest-11430.firebasestorage.app",
  messagingSenderId: "399870636201", // <--- VERIFIQUE NO CONSOLE DO NOVO PROJETO
  appId: "1:399870636201:web:5b3a94b1929fe46e9739b8", // <--- VERIFIQUE NO CONSOLE DO NOVO PROJETO
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
    
    // Força a seleção de conta. Isso ajuda a "desengasgar" sessões presas.
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    isConfigured = true;
    console.log("Firebase (cgest-11430) iniciado com sucesso.");
} catch (e) {
    console.error("Erro crítico ao iniciar Firebase:", e);
    isConfigured = false;
}

export { db, auth, googleProvider, isConfigured };
