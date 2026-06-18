// js/auth.js — autenticação via Google e ciclo de sessão.
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

const MENSAGENS = {
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
  'auth/cancelled-popup-request': 'Login cancelado. Tente novamente.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site.',
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.'
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function observarSessao(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function entrarComGoogle() {
  try { await signInWithPopup(auth, provider); }
  catch (e) { throw new Error(MENSAGENS[e.code] || `Não foi possível entrar (${e.code || 'erro desconhecido'}).`); }
}

export function sair() {
  return signOut(auth);
}
