// js/cartao.js — lógica do ciclo de fatura do cartão de crédito.
// Regra: uma compra na data D pertence à fatura que FECHA no primeiro
// dia de fechamento >= D. Tudo em fuso local, via strings 'YYYY-MM-DD'.

const pad = (n) => String(n).padStart(2, '0');

/** Último dia de um mês (ano, mês 1..12). */
function ultimoDiaDoMes(ano, mes1a12) {
  return new Date(ano, mes1a12, 0).getDate();
}

/**
 * Dia de fechamento efetivo para um mês, considerando exceções.
 * @param ano, mes1a12
 * @param diaPadrao dia de fechamento padrão (1..31)
 * @param excecoes objeto { 'YYYY-MM': dia } com exceções pontuais
 */
export function diaFechamentoDoMes(ano, mes1a12, diaPadrao, excecoes = {}) {
  const chave = `${ano}-${pad(mes1a12)}`;
  const exc = excecoes[chave];
  const dia = Number.isInteger(exc) ? exc : diaPadrao;
  return Math.min(dia, ultimoDiaDoMes(ano, mes1a12));
}

/** Data de fechamento (Date local) de um dado mês, respeitando exceções e meses curtos. */
function dataFechamento(ano, mes1a12, diaPadrao, excecoes) {
  const dia = diaFechamentoDoMes(ano, mes1a12, diaPadrao, excecoes);
  return new Date(ano, mes1a12 - 1, dia);
}

/**
 * Fatura a que pertence uma compra 'YYYY-MM-DD'.
 * @param diaFechamento dia padrão
 * @param excecoes { 'YYYY-MM': dia }
 * @returns 'YYYY-MM-DD' da data de fechamento da fatura
 */
export function faturaDaCompra(dataCompra, diaFechamento, excecoes = {}) {
  const [a, m, d] = dataCompra.split('-').map(Number);
  const compra = new Date(a, m - 1, d);

  let fa = a, fm = m;
  let fech = dataFechamento(fa, fm, diaFechamento, excecoes);
  if (compra > fech) {
    fm += 1;
    if (fm > 12) { fm = 1; fa += 1; }
    fech = dataFechamento(fa, fm, diaFechamento, excecoes);
  }
  const dia = diaFechamentoDoMes(fa, fm, diaFechamento, excecoes);
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
export function gastosPorFatura(gastos, diaFechamento, excecoes = {}) {
  const credito = gastos.filter((g) => g.forma === 'credito');
  const mapa = new Map();
  for (const g of credito) {
    if (!g.data) continue;
    // Parcela (tem dataCompra): a própria data já é o vencimento da fatura;
    // a chave da fatura é o fechamento daquele mês.
    // À vista (sem dataCompra): a fatura sai da data da compra.
    const f = g.dataCompra
      ? faturaDoVencimento(g.data, diaFechamento, excecoes)
      : faturaDaCompra(g.data, diaFechamento, excecoes);
    if (!mapa.has(f)) mapa.set(f, { itens: [], total: 0 });
    const e = mapa.get(f);
    e.itens.push(g);
    e.total += g.valor || 0;
  }
  return mapa;
}

/** Chave de fatura ('YYYY-MM-DD' do fechamento) para uma parcela cujo
 *  vencimento/pagamento cai em 'dataPagamento'. A fatura fecha no mês do pagamento. */
function faturaDoVencimento(dataPagamento, diaFechamento, excecoes) {
  const [a, m] = dataPagamento.split('-').map(Number);
  const dia = diaFechamentoDoMes(a, m, diaFechamento, excecoes);
  return `${a}-${pad(m)}-${pad(dia)}`;
}

/** Qual fatura está "em aberto" hoje (a que vai fechar a seguir). */
export function faturaAtual(diaFechamento, hojeData = new Date(), excecoes = {}) {
  const hoje = `${hojeData.getFullYear()}-${pad(hojeData.getMonth() + 1)}-${pad(hojeData.getDate())}`;
  return faturaDaCompra(hoje, diaFechamento, excecoes);
}
