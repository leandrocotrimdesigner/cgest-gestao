import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Sua configuração real que você acabou de pegar
const firebaseConfig = {
  apiKey: "AIzaSyB_9TBgaAYIIQL645i0dOT5PdHpvJlIy0g",
  authDomain: "cgest-11430.firebaseapp.com",
  projectId: "cgest-11430",
  storageBucket: "cgest-11430.firebasestorage.app",
  messagingSenderId: "317063617243",
  appId: "1:317063617243:web:fc9dba1cb44df913a54afe",
  measurementId: "G-3EDGJ22HM5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços para o resto do sistema usar
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuração extra para o pop-up sempre pedir para escolher a conta
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const isConfigured = true;