// js/auth.js — autenticação e ciclo de sessão.
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta está desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.'
};

/** Observa login/logout. Recebe (usuario|null). Retorna função para desinscrever. */
export function observarSessao(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Tenta entrar. Lança Error com mensagem amigável em caso de falha. */
export async function entrar(email, senha) {
  if (!email || !senha) throw new Error('Preencha e-mail e senha.');
  try {
    await signInWithEmailAndPassword(auth, email.trim(), senha);
  } catch (e) {
    throw new Error(MENSAGENS[e.code] || 'Não foi possível entrar.');
  }
}

export function sair() {
  return signOut(auth);
}
