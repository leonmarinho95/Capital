// js/parcelas.js — gera os lançamentos de uma compra parcelada no crédito.
// Visão B (caixa): cada parcela é um gasto no mês de PAGAMENTO (vencimento da
// fatura em que cai). Todas guardam a data da compra para registro.
import { faturaDaCompra } from './cartao.js';

const pad = (n) => String(n).padStart(2, '0');

/** Distribui um total em N partes iguais em centavos; a última absorve o resto. */
export function dividirCentavos(total, n) {
  const base = Math.floor(total / n);
  const partes = Array(n).fill(base);
  partes[n - 1] += total - base * n; // ajuste do centavo na última
  return partes;
}

/** Soma X meses a 'YYYY-MM-DD', mantendo o dia (clampado ao fim do mês). */
function somarMeses(dataISO, k) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const total = (a * 12 + (m - 1)) + k;
  const na = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimo = new Date(na, nm, 0).getDate();
  return `${na}-${pad(nm)}-${pad(Math.min(d, ultimo))}`;
}

/**
 * Gera os lançamentos de parcelas.
 * @param base {conta, categoria, obs, valorCentavos(total), dataCompra}
 * @param nParcelas número de parcelas (>=1)
 * @param diaFechamento dia padrão de fechamento
 * @param diaVencimento dia de vencimento da fatura (data de pagamento da parcela)
 * @param excecoes exceções de fechamento { 'YYYY-MM': dia }
 * @param compraId identificador comum das parcelas (gerar fora)
 * @returns lista de objetos de gasto prontos para validar/salvar
 */
export function gerarParcelas(base, nParcelas, diaFechamento, diaVencimento, excecoes, compraId) {
  const n = Math.max(1, Math.floor(nParcelas));
  const valores = dividirCentavos(base.valorCentavos, n);

  // fatura da 1ª parcela = fatura da compra; demais somam 1 mês a cada parcela
  const fatura1 = faturaDaCompra(base.dataCompra, diaFechamento, excecoes); // 'YYYY-MM-DD' do fechamento

  const out = [];
  for (let i = 0; i < n; i++) {
    const fechParcela = somarMeses(fatura1, i);           // fechamento da fatura da parcela i
    const [fa, fm] = fechParcela.split('-').map(Number);
    // data de PAGAMENTO = vencimento (dia fixo) no mês do fechamento da parcela
    const ultimo = new Date(fa, fm, 0).getDate();
    const dataPagamento = `${fa}-${pad(fm)}-${pad(Math.min(diaVencimento, ultimo))}`;

    out.push({
      conta: base.conta,
      categoria: base.categoria,
      obs: base.obs || '',
      forma: 'credito',
      valorCentavos: valores[i],
      data: dataPagamento,            // painel/treemap/fatura usam esta
      dataCompra: base.dataCompra,    // registro do quando comprou
      parcela: i + 1,
      parcelasTotal: n,
      compraId
    });
  }
  return out;
}

/** Sufixo de exibição: '(3/10)' ou '' se à vista. */
export function rotuloParcela(g) {
  if (!g.parcelasTotal || g.parcelasTotal <= 1) return '';
  return `(${g.parcela}/${g.parcelasTotal})`;
}
