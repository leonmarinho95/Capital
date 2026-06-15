// js/cartao.js — ciclo de fatura do cartão de crédito.
//
// MODELO:
// - Uma FATURA é identificada pelo mês do seu vencimento ('YYYY-MM').
//   Ex.: "fatura de junho/2026" vence 08/06/2026.
// - Cada fatura tem uma DATA DE FECHAMENTO, que pode cair em qualquer mês
//   (tipicamente no mês anterior — ex.: a fatura de junho fecha em 27/05).
// - Padrão: o fechamento de uma fatura de mês M é o dia `diaPadrao` do mês
//   ANTERIOR a M (dia 1 do mês anterior, por padrão).
// - Exceções: { 'YYYY-MM'(mês da fatura): 'YYYY-MM-DD'(data de fechamento) }
//   sobrescrevem o padrão para aquela fatura específica.
//
// Uma compra entra na 1ª fatura cuja data de fechamento é >= data da compra.

const pad = (n) => String(n).padStart(2, '0');
const NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function ultimoDiaDoMes(ano, mes1a12) { return new Date(ano, mes1a12, 0).getDate(); }

/** Soma k meses a um 'YYYY-MM'. */
export function deslocarFaturaMes(faturaMes, k) {
  const [a, m] = faturaMes.split('-').map(Number);
  const t = (a * 12 + (m - 1)) + k;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

/**
 * Data de fechamento (string 'YYYY-MM-DD') de uma fatura (mês 'YYYY-MM').
 * Exceção tem prioridade; senão usa o dia padrão no MÊS ANTERIOR ao da fatura.
 */
export function dataFechamentoDaFatura(faturaMes, diaPadrao, excecoes = {}) {
  const exc = excecoes[faturaMes];
  if (typeof exc === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(exc)) return exc;
  // padrão: dia `diaPadrao` do mês anterior ao da fatura
  const ant = deslocarFaturaMes(faturaMes, -1);
  const [a, m] = ant.split('-').map(Number);
  const dia = Math.min(diaPadrao, ultimoDiaDoMes(a, m));
  return `${a}-${pad(m)}-${pad(dia)}`;
}

const aDate = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };

/**
 * Mês de fatura ('YYYY-MM') ao qual pertence uma compra.
 * Procura a 1ª fatura cuja data de fechamento é >= data da compra.
 */
export function faturaMesDaCompra(dataCompra, diaPadrao, excecoes = {}) {
  const compra = aDate(dataCompra);
  // começa testando a fatura do mês seguinte ao da compra e anda se preciso.
  // (o fechamento da fatura do mês da compra normalmente é no mês anterior,
  //  então a compra cai pelo menos na fatura do próprio mês ou seguinte)
  let faturaMes = dataCompra.slice(0, 7); // 'YYYY-MM' da compra
  // recua: garante começar de uma fatura cujo fechamento seja anterior à compra
  for (let i = 0; i < 3; i++) faturaMes = deslocarFaturaMes(faturaMes, -1);
  for (let i = 0; i < 14; i++) {
    const fech = aDate(dataFechamentoDaFatura(faturaMes, diaPadrao, excecoes));
    if (fech >= compra) return faturaMes;
    faturaMes = deslocarFaturaMes(faturaMes, 1);
  }
  return faturaMes;
}

/** Vencimento (data de pagamento 'YYYY-MM-DD') de uma fatura. */
export function vencimentoDaFatura(faturaMes, diaVencimento) {
  const [a, m] = faturaMes.split('-').map(Number);
  const dia = Math.min(diaVencimento, ultimoDiaDoMes(a, m));
  return `${a}-${pad(m)}-${pad(dia)}`;
}

/** Rótulo: 'YYYY-MM' -> 'fatura de jun/2026'. */
export function rotuloFatura(faturaMes) {
  const [a, m] = faturaMes.split('-').map(Number);
  return `fatura de ${NOMES[m - 1]}/${a}`;
}

/** Mês de fatura corrente (em aberto) hoje. */
export function faturaMesAtual(diaPadrao, hojeData = new Date(), excecoes = {}) {
  const hoje = `${hojeData.getFullYear()}-${pad(hojeData.getMonth() + 1)}-${pad(hojeData.getDate())}`;
  return faturaMesDaCompra(hoje, diaPadrao, excecoes);
}

/**
 * Agrupa gastos no crédito por fatura (mês 'YYYY-MM').
 * Se o gasto tem `faturaMes` definido (correção manual), usa-o.
 * Senão, se tem dataCompra, calcula pela compra.
 * Senão (à vista antigo), calcula pela própria data.
 * @returns Map 'YYYY-MM' -> { itens, total }
 */
export function gastosPorFatura(gastos, diaPadrao, excecoes = {}) {
  const credito = gastos.filter((g) => g.forma === 'credito');
  const mapa = new Map();
  for (const g of credito) {
    let fm = g.faturaMes;
    if (!fm) {
      const ref = g.dataCompra || g.data;
      if (!ref) continue;
      fm = faturaMesDaCompra(ref, diaPadrao, excecoes);
    }
    if (!mapa.has(fm)) mapa.set(fm, { itens: [], total: 0 });
    const e = mapa.get(fm);
    e.itens.push(g);
    e.total += g.valor || 0;
  }
  return mapa;
}
