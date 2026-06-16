// js/parcelas.js — gera os lançamentos de uma compra no crédito (à vista ou parcelada).
// Visão B (caixa): cada parcela é um gasto cuja data = vencimento da fatura em que cai.
// Guarda a data da compra (referência) e o mês da fatura (faturaMes) de cada parcela.
import { faturaMesDaCompra, vencimentoDaFatura, deslocarFaturaMes } from './cartao.js';

/** Distribui um total em N partes iguais em centavos; a última absorve o resto. */
export function dividirCentavos(total, n) {
  const base = Math.floor(total / n);
  const partes = Array(n).fill(base);
  partes[n - 1] += total - base * n;
  return partes;
}

/**
 * Gera os lançamentos de uma compra no crédito.
 * @param base {conta, categoria, obs, valorCentavos(total), dataCompra}
 * @param nParcelas >=1
 * @param diaFechamento dia padrão de fechamento (mês anterior ao da fatura)
 * @param diaVencimento dia de vencimento da fatura
 * @param excecoes { 'YYYY-MM'(fatura): 'YYYY-MM-DD'(fechamento) }
 * @param compraId id comum
 */
export function gerarParcelas(base, nParcelas, diaFechamento, diaVencimento, excecoes, compraId) {
  const n = Math.max(1, Math.floor(nParcelas));
  const valores = dividirCentavos(base.valorCentavos, n);

  // fatura (mês) da 1ª parcela = fatura da compra
  const fatura1 = faturaMesDaCompra(base.dataCompra, diaFechamento, excecoes);

  const out = [];
  for (let i = 0; i < n; i++) {
    const faturaMes = deslocarFaturaMes(fatura1, i);
    const dataPagamento = vencimentoDaFatura(faturaMes, diaVencimento);
    // preserva a data da compra também na observação (visível e à prova de edição)
    const compraBR = formatarDataBR(base.dataCompra);
    const obsBase = base.obs ? base.obs.trim() : '';
    const obsComCompra = obsBase
      ? `${obsBase} · compra ${compraBR}`
      : `compra ${compraBR}`;
    out.push({
      conta: base.conta,
      categoria: base.categoria,
      obs: obsComCompra,
      forma: 'credito',
      valorCentavos: valores[i],
      data: dataPagamento,        // contabilização (painel/treemap/fatura)
      dataCompra: base.dataCompra,
      faturaMes,                  // mês da fatura ('YYYY-MM')
      parcela: i + 1,
      parcelasTotal: n,
      compraId
    });
  }
  return out;
}

/** 'YYYY-MM-DD' -> 'DD/MM/AAAA'. */
function formatarDataBR(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function rotuloParcela(g) {
  if (!g.parcelasTotal || g.parcelasTotal <= 1) return '';
  return `(${g.parcela}/${g.parcelasTotal})`;
}
