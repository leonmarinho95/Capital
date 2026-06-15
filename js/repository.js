// js/repository.js — ÚNICO ponto de acesso ao Firestore.
// Nenhum outro módulo importa firebase/firestore diretamente.
// Estrutura: usuarios/{uid}/gastos|ganhos|fixos/{docId}
import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query,
  where, getDocs, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

function colecao(uid, nome) {
  return collection(db, 'usuarios', uid, nome);
}

/**
 * Escuta uma coleção em tempo real.
 * @returns função unsubscribe (chamar no logout para evitar vazamento de listener).
 */
export function escutar(uid, nome, aoAtualizar, aoFalhar) {
  const q = query(colecao(uid, nome));
  return onSnapshot(
    q,
    (snap) => aoAtualizar(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (erro) => aoFalhar && aoFalhar(erro)
  );
}

export function adicionar(uid, nome, dados) {
  return addDoc(colecao(uid, nome), dados);
}

export function atualizar(uid, nome, id, dados) {
  return updateDoc(doc(db, 'usuarios', uid, nome, id), dados);
}

export function remover(uid, nome, id) {
  return deleteDoc(doc(db, 'usuarios', uid, nome, id));
}

/** Lê um documento de configuração simples (ex.: 'cartao'). */
export function escutarConfig(uid, chave, aoAtualizar) {
  return onSnapshot(doc(db, 'usuarios', uid, 'config', chave),
    (snap) => aoAtualizar(snap.exists() ? snap.data() : null));
}

/** Grava (merge) um documento de configuração. */
export function salvarConfig(uid, chave, dados) {
  return setDoc(doc(db, 'usuarios', uid, 'config', chave), dados, { merge: true });
}

/** Adiciona vários documentos numa coleção em lote (ex.: parcelas). */
export async function adicionarLote(uid, nome, listaDados) {
  for (let i = 0; i < listaDados.length; i += 450) {
    const lote = writeBatch(db);
    for (const d of listaDados.slice(i, i + 450)) {
      lote.set(doc(colecao(uid, nome)), d);
    }
    await lote.commit();
  }
}

/** Remove todos os gastos de uma mesma compra (compraId). */
export async function removerPorCompra(uid, compraId) {
  const q = query(colecao(uid, 'gastos'), where('compraId', '==', compraId));
  const snap = await getDocs(q);
  for (let i = 0; i < snap.docs.length; i += 450) {
    const lote = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 450)) lote.delete(d.ref);
    await lote.commit();
  }
}
