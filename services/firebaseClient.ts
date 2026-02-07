
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// --- CONFIGURAÇÃO DO FIREBASE (PROJETO: cgest-11430) ---
// IMPORTANTE: Substitua os valores abaixo pelos encontrados no Firebase Console:
// Project Settings > General > Your apps > SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_9TBgaAYIIQL645i0dOT5PdHpvJlIy0g", // <--- OBRIGATÓRIO: Copie do Firebase Console
  authDomain: "cgest-11430.firebaseapp.com",
  projectId: "cgest-11430",
  storageBucket: "cgest-11430.firebasestorage.app",
  messagingSenderId: "317063617243", // Verifique se este ID mudou no novo projeto
  appId: "1:317063617243:web:fc9dba1cb44df913a54afe",    // <--- OBRIGATÓRIO: Copie do Firebase Console
  measurementId: "G-3EDGJ22HM5"
};

let app;
let db: any;
let auth: any;
let googleProvider: GoogleAuthProvider;
let isConfigured = false;

// Verificação de segurança para evitar erro silencioso de chave inválida
const isKeyConfigured = firebaseConfig.apiKey && 
                        !firebaseConfig.apiKey.includes("COLE_SUA_API_KEY") &&
                        !firebaseConfig.apiKey.includes("AIzaSyDbX-xYJQMiUraCp252GsjwfxGyxQ8PrJc"); // Chave antiga inválida

try {
    if (!isKeyConfigured) {
        console.error("CRÍTICO: A API Key do Firebase não foi configurada. Edite services/firebaseClient.ts");
        throw new Error("Firebase API Key não configurada.");
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Força a seleção de conta para evitar loop de redirecionamento ou popup fechando
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    isConfigured = true;
    console.log("Firebase (cgest-11430) iniciado com sucesso.");
} catch (e) {
    console.error("Erro ao iniciar Firebase:", e);
    isConfigured = false;
}

export { db, auth, googleProvider, isConfigured };
