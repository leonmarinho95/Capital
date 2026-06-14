// js/firebase.js — ponto único de inicialização do Firebase (SDK modular).
// As chaves do Firebase Web são públicas por design; a proteção dos dados
// vem das regras do Firestore e da autenticação, não do sigilo da config.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Cache offline com a API atual (substitui enableIndexedDbPersistence).
// persistentMultipleTabManager: funciona com o app aberto em várias abas.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
