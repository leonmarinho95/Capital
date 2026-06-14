// js/migracao.js — migração única dos valores de REAIS (float) para CENTAVOS (int).
// Idempotente: cada documento convertido recebe `migrado: true` e nunca é
// convertido duas vezes. Faz backup automático antes de tocar nos dados.
//
// TEMPORÁRIO: remover este módulo, o botão e o import após a migração.
import {
  collection, getDocs, writeBatch, doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

const COLECOES = ['gastos', 'ganhos', 'fixos'];

/** Lê todos os documentos das três coleções do usuário. */
async function lerTudo(uid) {
  const dump = {};
  for (const nome of COLECOES) {
    const snap = await getDocs(collection(db, 'usuarios', uid, nome));
    dump[nome] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return dump;
}

/** Dispara o download de um JSON de backup no navegador. */
function baixarBackup(dump) {
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `capital-backup-${carimbo}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Converte para centavos só o que ainda não foi migrado. */
async function converter(uid, dump) {
  let convertidos = 0, pulados = 0, marcados = 0;
  for (const nome of COLECOES) {
    const itens = dump[nome];
    // writeBatch: máx. 500 ops por lote
    for (let i = 0; i < itens.length; i += 450) {
      const lote = writeBatch(db);
      let opsNoLote = 0;
      for (const item of itens.slice(i, i + 450)) {
        if (item.migrado === true) { pulados++; continue; }
        const ref = doc(db, 'usuarios', uid, nome, item.id);
        if (typeof item.valor === 'number') {
          // valor em reais (inteiro ou decimal) -> centavos
          lote.update(ref, { valor: Math.round(item.valor * 100), migrado: true });
          convertidos++;
        } else {
          // valor não-numérico (ex.: fixo "A definir"): preserva, só trava reexecução
          lote.update(ref, { migrado: true });
          marcados++;
        }
        opsNoLote++;
      }
      if (opsNoLote > 0) await lote.commit();
    }
  }
  return { convertidos, pulados, marcados };
}

/** Orquestra: backup -> conversão -> relatório. */
export async function migrarParaCentavos(uid) {
  const dump = await lerTudo(uid);
  baixarBackup(dump);
  const resultado = await converter(uid, dump);
  return resultado;
}
