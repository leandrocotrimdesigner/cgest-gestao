
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Helper para ler variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  return (import.meta as any).env?.[key] || '';
};

// --- CONFIGURAÇÃO DO FIREBASE (PROJETO: cgest-11430) ---
// As chaves agora são lidas do arquivo .env.local para maior segurança e facilidade de troca.
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'), 
  authDomain: "cgest-11430.firebaseapp.com",
  projectId: "cgest-11430",
  storageBucket: "cgest-11430.firebasestorage.app",
  messagingSenderId: "399870636201",
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: "G-TETJFXZJ90"
};

let app;
let db: any;
let auth: any;
let googleProvider: GoogleAuthProvider;
let isConfigured = false;

// Verificação de segurança
const apiKey = firebaseConfig.apiKey;
const isKeyValid = apiKey && !apiKey.includes("COLE_A_NOVA_API_KEY");

try {
    if (!isKeyValid) {
        console.error("CRÍTICO: API Key inválida ou não configurada em .env.local");
        console.warn("Edite o arquivo .env.local e adicione suas chaves do Firebase.");
    } else {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        
        // Parâmetros para evitar problemas de popup/redirect
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
        
        isConfigured = true;
        console.log("Firebase (cgest-11430) iniciado com sucesso.");
    }
} catch (e) {
    console.error("Erro ao iniciar Firebase:", e);
    isConfigured = false;
}

export { db, auth, googleProvider, isConfigured };
