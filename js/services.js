// js/services.js — operações de escrita que validam antes de persistir.
// Fronteira entre a UI (que manda dados crus do formulário) e o repositório.
import { validarGasto, validarGanho, validarFixo } from './validation.js';
import { gerarParcelas } from './parcelas.js';
import { vencimentoDaFatura } from './cartao.js';
import * as repo from './repository.js';

export async function salvarLancamento(uid, tipo, id, formulario, cartaoCfg) {
  if (tipo === 'gasto' && !id && formulario.forma === 'credito') {
    return salvarCredito(uid, formulario, cartaoCfg);
  }
  // Edição de gasto no crédito com correção de fatura (mês de pagamento).
  if (tipo === 'gasto' && id && formulario.forma === 'credito' && formulario.faturaMesEscolhida) {
    const venc = cartaoCfg?.vencimento || 8;
    formulario = aplicarFaturaEscolhida(formulario, venc);
  }
  const v = tipo === 'gasto' ? validarGasto(formulario) : validarGanho(formulario);
  if (!v.ok) throw new Error(v.erro);
  const colecao = tipo === 'gasto' ? 'gastos' : 'ganhos';
  if (id) return repo.atualizar(uid, colecao, id, v.dados);
  return repo.adicionar(uid, colecao, v.dados);
}

/** Ajusta data (pagamento) e faturaMes conforme a fatura escolhida. */
function aplicarFaturaEscolhida(formulario, diaVencimento) {
  const fm = formulario.faturaMesEscolhida;
  const data = vencimentoDaFatura(fm, diaVencimento);
  return { ...formulario, faturaMes: fm, data };
}

async function salvarCredito(uid, formulario, cartaoCfg) {
  const fechamento = cartaoCfg?.fechamento;
  if (!fechamento) throw new Error('Configure o dia de fechamento do cartão (aba Cartão) antes de lançar no crédito.');
  const vencimento = cartaoCfg?.vencimento || 8;
  const excecoes = cartaoCfg?.excecoes || {};
  const n = Math.max(1, formulario.parcelas || 1);
  const compraId = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  const base = {
    conta: formulario.conta,
    categoria: formulario.categoria,
    obs: formulario.obs,
    valorCentavos: formulario.valorCentavos,
    dataCompra: formulario.data            // a data informada é a da COMPRA
  };
  const brutas = gerarParcelas(base, n, fechamento, vencimento, excecoes, compraId);

  const docs = [];
  for (const p of brutas) {
    const v = validarGasto({
      categoria: p.categoria, conta: p.conta, valorCentavos: p.valorCentavos,
      data: p.data, obs: p.obs, forma: p.forma,
      dataCompra: p.dataCompra, faturaMes: p.faturaMes,
      parcela: p.parcela, parcelasTotal: p.parcelasTotal, compraId: p.compraId
    });
    if (!v.ok) throw new Error('Lançamento inválido: ' + v.erro);
    docs.push(v.dados);
  }
  // à vista (1) também passa pelo lote — simples e consistente
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
