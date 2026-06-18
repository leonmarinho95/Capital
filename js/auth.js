// js/auth.js — autenticação: Google + vinculação única a partir de email/senha.
// Fluxo: enquanto a conta email/senha não tiver o Google vinculado, o usuário
// pode (1) vincular agora (entra com email/senha e linka o Google) ou
// (2) entrar direto com Google se já vinculou antes.
import {
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  linkWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
  'auth/cancelled-popup-request': 'Login cancelado. Tente novamente.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site.',
  'auth/credential-already-in-use': 'Esta conta Google já está vinculada a outro usuário.',
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.'
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const traduz = (e) => new Error(MENSAGENS[e.code] || `Erro (${e.code || 'desconhecido'}).`);

export function observarSessao(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Entra direto com Google (para quem já vinculou). */
export async function entrarComGoogle() {
  try { await signInWithPopup(auth, provider); }
  catch (e) { throw traduz(e); }
}

/**
 * Vinculação única: entra com email/senha e vincula o Google à mesma conta
 * (mesmo UID, dados preservados). Depois disso, basta usar entrarComGoogle().
 */
export async function vincularGoogle(email, senha) {
  if (!email || !senha) throw new Error('Preencha e-mail e senha.');
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
    await linkWithPopup(cred.user, provider);
  } catch (e) {
    // já vinculado antes: não é erro real, a sessão de email/senha segue válida
    if (e.code === 'auth/provider-already-linked' || e.code === 'auth/credential-already-in-use') return;
    throw traduz(e);
  }
}

export function sair() {
  return signOut(auth);
}

/** Indica se o usuário logado já tem o provedor Google vinculado. */
export function temGoogleVinculado(usuario) {
  return !!usuario?.providerData?.some((p) => p.providerId === 'google.com');
}
