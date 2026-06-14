// js/selectors-anual.js — cálculos da visão anual (derivados do estado).
// Trabalha em centavos; lê apenas gastos e ganhos já existentes.
import { somar } from './money.js';
import { deslocarMes, nomeMesCurto, rotuloMes } from './dates.js';

/** Lista de 'YYYY-MM' do período pedido, terminando no mês atual do estado. */
export function mesesDoPeriodo(estado, janela) {
  // janela: número de meses, ou 'tudo'
  let n = janela;
  if (janela === 'tudo') {
    const datas = [...estado.gastos, ...estado.ganhos]
      .map((i) => i.data).filter(Boolean).sort();
    if (datas.length === 0) return [estado.mes];
    const primeiro = datas[0].slice(0, 7);
    n = mesesEntre(primeiro, estado.mes) + 1;
  }
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(deslocarMes(estado.mes, -i));
  return out;
}

/** Série mensal: [{mes, rotulo, ganhos, gastos, economia}] (centavos). */
export function serieMensal(estado, janela = 12) {
  const meses = mesesDoPeriodo(estado, janela);
  return meses.map((m) => {
    const ganhos = somar(estado.ganhos.filter((i) => mesDe(i) === m).map((i) => i.valor || 0));
    const gastos = somar(estado.gastos.filter((i) => mesDe(i) === m).map((i) => i.valor || 0));
    return { mes: m, rotulo: nomeMesCurto(m), ganhos, gastos, economia: ganhos - gastos };
  });
}

/** Patrimônio acumulado a partir do zero no início do período: [{mes, rotulo, saldo}]. */
export function patrimonioAcumulado(estado, janela = 12) {
  const serie = serieMensal(estado, janela);
  let saldo = 0;
  return serie.map((s) => {
    saldo += s.economia;
    return { mes: s.mes, rotulo: s.rotulo, saldo };
  });
}

/** Resumo do período: total economizado, média mensal, melhor e pior mês. */
export function resumoPeriodo(estado, janela = 12) {
  const serie = serieMensal(estado, janela);
  if (serie.length === 0) return null;
  const totalEconomia = somar(serie.map((s) => s.economia));
  const media = Math.round(totalEconomia / serie.length);
  let melhor = serie[0], pior = serie[0];
  for (const s of serie) {
    if (s.economia > melhor.economia) melhor = s;
    if (s.economia < pior.economia) pior = s;
  }
  return {
    totalEconomia, media,
    melhor: { rotulo: rotuloMes(melhor.mes), valor: melhor.economia },
    pior: { rotulo: rotuloMes(pior.mes), valor: pior.economia },
    totalGanhos: somar(serie.map((s) => s.ganhos)),
    totalGastos: somar(serie.map((s) => s.gastos))
  };
}

/** Gastos por categoria no período inteiro: [{categoria, total, fracao}] desc. */
export function categoriasDoPeriodo(estado, janela = 12) {
  const meses = new Set(mesesDoPeriodo(estado, janela));
  const doPeriodo = estado.gastos.filter((g) => meses.has(mesDe(g)));
  const mapa = {};
  for (const g of doPeriodo) mapa[g.categoria] = (mapa[g.categoria] || 0) + (g.valor || 0);
  const total = somar(Object.values(mapa)) || 1;
  return Object.entries(mapa)
    .map(([categoria, t]) => ({ categoria, total: t, fracao: t / total }))
    .sort((a, b) => b.total - a.total);
}

const mesDe = (item) => (item.data || '').slice(0, 7);

function mesesEntre(mesA, mesB) {
  const [a1, m1] = mesA.split('-').map(Number);
  const [a2, m2] = mesB.split('-').map(Number);
  return (a2 * 12 + m2) - (a1 * 12 + m1);
}
