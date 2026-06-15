// js/services.js — operações de escrita que validam antes de persistir.
// Fronteira entre a UI (que manda dados crus do formulário) e o repositório.
import { validarGasto, validarGanho, validarFixo } from './validation.js';
import { gerarParcelas } from './parcelas.js';
import * as repo from './repository.js';

export async function salvarLancamento(uid, tipo, id, formulario, cartaoCfg) {
  // Compra parcelada no crédito (nova): gera N lançamentos.
  if (tipo === 'gasto' && !id && formulario.forma === 'credito' && (formulario.parcelas || 1) > 1) {
    return salvarParcelado(uid, formulario, cartaoCfg);
  }
  const v = tipo === 'gasto' ? validarGasto(formulario) : validarGanho(formulario);
  if (!v.ok) throw new Error(v.erro);
  const colecao = tipo === 'gasto' ? 'gastos' : 'ganhos';
  if (id) return repo.atualizar(uid, colecao, id, v.dados);
  return repo.adicionar(uid, colecao, v.dados);
}

async function salvarParcelado(uid, formulario, cartaoCfg) {
  const fechamento = cartaoCfg?.fechamento;
  if (!fechamento) throw new Error('Configure o dia de fechamento do cartão (aba Cartão) antes de parcelar.');
  const vencimento = cartaoCfg?.vencimento || 8;
  const excecoes = cartaoCfg?.excecoes || {};
  const compraId = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  const base = {
    conta: formulario.conta,
    categoria: formulario.categoria,
    obs: formulario.obs,
    valorCentavos: formulario.valorCentavos,
    dataCompra: formulario.data           // a data informada é a da compra
  };
  const brutas = gerarParcelas(base, formulario.parcelas, fechamento, vencimento, excecoes, compraId);

  // valida cada parcela e coleta os dados normalizados
  const docs = [];
  for (const p of brutas) {
    const v = validarGasto({
      categoria: p.categoria, conta: p.conta, valorCentavos: p.valorCentavos,
      data: p.data, obs: p.obs, forma: p.forma,
      dataCompra: p.dataCompra, parcela: p.parcela, parcelasTotal: p.parcelasTotal, compraId: p.compraId
    });
    if (!v.ok) throw new Error('Parcela inválida: ' + v.erro);
    docs.push(v.dados);
  }
  return repo.adicionarLote(uid, 'gastos', docs);
}

export function excluirLancamento(uid, tipo, id) {
  const colecao = tipo === 'gasto' ? 'gastos' : 'ganhos';
  return repo.remover(uid, colecao, id);
}

/** Exclui a compra inteira (todas as parcelas com o mesmo compraId). */
export function excluirCompra(uid, compraId) {
  return repo.removerPorCompra(uid, compraId);
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
