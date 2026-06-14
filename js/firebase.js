// js/firebase.js — ponto único de inicialização do Firebase (SDK modular).
// As chaves do Firebase Web são públicas por design; a proteção dos dados
// vem das regras do Firestore e da autenticação, não do sigilo da config.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Cache offline: o app continua exibindo os últimos dados sem rede.
// Falha silenciosa em múltiplas abas (limitação conhecida do Firestore).
enableIndexedDbPersistence(db).catch(() => {});
