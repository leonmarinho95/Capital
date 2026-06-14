// js/services.js — operações de escrita que validam antes de persistir.
// Fronteira entre a UI (que manda dados crus do formulário) e o repositório.
import { validarGasto, validarGanho, validarFixo } from './validation.js';
import * as repo from './repository.js';

export async function salvarLancamento(uid, tipo, id, formulario) {
  const v = tipo === 'gasto' ? validarGasto(formulario) : validarGanho(formulario);
  if (!v.ok) throw new Error(v.erro);
  const colecao = tipo === 'gasto' ? 'gastos' : 'ganhos';
  if (id) return repo.atualizar(uid, colecao, id, v.dados);
  return repo.adicionar(uid, colecao, v.dados);
}

export function excluirLancamento(uid, tipo, id) {
  const colecao = tipo === 'gasto' ? 'gastos' : 'ganhos';
  return repo.remover(uid, colecao, id);
}

export async function salvarFixo(uid, id, formulario) {
  const v = validarFixo(formulario);
  if (!v.ok) throw new Error(v.erro);
  if (id) return repo.atualizar(uid, 'fixos', id, v.dados);
  return repo.adicionar(uid, 'fixos', v.dados);
}

export function excluirFixo(uid, id) {
  return repo.remover(uid, 'fixos', id);
}
