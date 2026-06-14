// js/selectors.js — cálculos derivados do estado (somas, agrupamentos, séries).
// Lê dados crus do state e devolve números prontos para a UI. Centraliza a
// lógica de cálculo para que nenhuma tela a reimplemente.
import { somar } from './money.js';
import { noMes, deslocarMes, nomeMesCurto } from './dates.js';

const valoresNoMes = (itens, mes) =>
  itens.filter((i) => noMes(i.data, mes)).map((i) => i.valor || 0);

/** Totais do mês: ganhos, gastos e economia (em centavos). */
export function totaisDoMes(estado) {
  const ganhos = somar(valoresNoMes(estado.ganhos, estado.mes));
  const gastos = somar(valoresNoMes(estado.gastos, estado.mes));
  return { ganhos, gastos, economia: ganhos - gastos };
}

/** Economia do mês anterior, para a variação do hero. */
export function economiaMesAnterior(estado) {
  const mesAnt = deslocarMes(estado.mes, -1);
  const g = somar(estado.ganhos.filter((i) => noMes(i.data, mesAnt)).map((i) => i.valor || 0));
  const d = somar(estado.gastos.filter((i) => noMes(i.data, mesAnt)).map((i) => i.valor || 0));
  return g - d;
}

/** Série dos últimos N meses de gastos: [{mes, rotulo, total}]. */
export function serieGastos(estado, n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = deslocarMes(estado.mes, -i);
    const total = somar(estado.gastos.filter((g) => noMes(g.data, m)).map((g) => g.valor || 0));
    out.push({ mes: m, rotulo: nomeMesCurto(m), total, atual: m === estado.mes });
  }
  return out;
}

/** Gastos do mês agrupados por categoria, ordenados desc: [{categoria, total, fracao}]. */
export function gastosPorCategoria(estado) {
  const doMes = estado.gastos.filter((g) => noMes(g.data, estado.mes));
  const mapa = {};
  for (const g of doMes) mapa[g.categoria] = (mapa[g.categoria] || 0) + (g.valor || 0);
  const total = somar(Object.values(mapa)) || 1;
  return Object.entries(mapa)
    .map(([categoria, t]) => ({ categoria, total: t, fracao: t / total }))
    .sort((a, b) => b.total - a.total);
}

/** Gastos do mês agrupados por conta, ordenados desc. */
export function gastosPorConta(estado, filtro = {}) {
  let lista = estado.gastos.filter((g) => noMes(g.data, estado.mes));
  if (filtro.categoria) lista = lista.filter((g) => g.categoria === filtro.categoria);
  if (filtro.busca) {
    const b = filtro.busca.toLowerCase();
    lista = lista.filter((g) =>
      (g.conta || '').toLowerCase().includes(b) || (g.obs || '').toLowerCase().includes(b));
  }
  const mapa = {};
  for (const g of lista) mapa[g.conta] = (mapa[g.conta] || 0) + (g.valor || 0);
  return Object.entries(mapa)
    .map(([conta, total]) => ({ conta, total }))
    .sort((a, b) => b.total - a.total);
}

/** Lançamentos do mês (gastos ou ganhos) já filtrados e ordenados por data desc. */
export function lancamentosDoMes(estado, tipo, filtro = {}) {
  let lista = estado[tipo].filter((i) => noMes(i.data, estado.mes));
  if (tipo === 'gastos') {
    if (filtro.categoria) lista = lista.filter((g) => g.categoria === filtro.categoria);
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase();
      lista = lista.filter((g) =>
        (g.conta || '').toLowerCase().includes(b) || (g.obs || '').toLowerCase().includes(b));
    }
  }
  return [...lista].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}
