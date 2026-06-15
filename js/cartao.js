// js/cartao.js — lógica do ciclo de fatura do cartão de crédito.
// Regra: uma compra na data D pertence à fatura que FECHA no primeiro
// dia de fechamento >= D. Tudo em fuso local, via strings 'YYYY-MM-DD'.

const pad = (n) => String(n).padStart(2, '0');

/** Último dia de um mês (ano, mês 1..12). */
function ultimoDiaDoMes(ano, mes1a12) {
  return new Date(ano, mes1a12, 0).getDate();
}

/** Data de fechamento (Date local) de um dado mês, respeitando meses curtos. */
function dataFechamento(ano, mes1a12, diaFech) {
  const dia = Math.min(diaFech, ultimoDiaDoMes(ano, mes1a12));
  return new Date(ano, mes1a12 - 1, dia);
}

/**
 * Dada uma compra 'YYYY-MM-DD' e o dia de fechamento, retorna a fatura
 * a que ela pertence, identificada pela data de fechamento ('YYYY-MM-DD').
 * Compra feita exatamente no dia do fechamento entra na fatura que fecha nesse dia.
 */
export function faturaDaCompra(dataCompra, diaFechamento) {
  const [a, m, d] = dataCompra.split('-').map(Number);
  const compra = new Date(a, m - 1, d);

  // candidata: fechamento no mês da compra
  let fa = a, fm = m;
  let fech = dataFechamento(fa, fm, diaFechamento);
  if (compra > fech) {
    // passou do fechamento deste mês -> próxima fatura
    fm += 1;
    if (fm > 12) { fm = 1; fa += 1; }
    fech = dataFechamento(fa, fm, diaFechamento);
  }
  const dia = Math.min(diaFechamento, ultimoDiaDoMes(fa, fm));
  return `${fa}-${pad(fm)}-${pad(dia)}`;
}

/** Rótulo amigável da fatura: 'YYYY-MM-DD' do fechamento -> 'fatura de jul/2026'. */
export function rotuloFatura(dataFech) {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [a, m] = dataFech.split('-').map(Number);
  return `fatura de ${nomes[m - 1]}/${a}`;
}

/**
 * Agrupa gastos no crédito por fatura.
 * @returns Map fechamento('YYYY-MM-DD') -> { itens:[], total }
 */
export function gastosPorFatura(gastos, diaFechamento) {
  const credito = gastos.filter((g) => g.forma === 'credito');
  const mapa = new Map();
  for (const g of credito) {
    if (!g.data) continue;
    const f = faturaDaCompra(g.data, diaFechamento);
    if (!mapa.has(f)) mapa.set(f, { itens: [], total: 0 });
    const e = mapa.get(f);
    e.itens.push(g);
    e.total += g.valor || 0;
  }
  return mapa;
}

/** Qual fatura está "em aberto" hoje (a que vai fechar a seguir). */
export function faturaAtual(diaFechamento, hojeData = new Date()) {
  const hoje = `${hojeData.getFullYear()}-${pad(hojeData.getMonth() + 1)}-${pad(hojeData.getDate())}`;
  return faturaDaCompra(hoje, diaFechamento);
}
