// js/metas.js — metas de economia: alvo + prazo, progresso calculado da economia.
// Progresso soma apenas a economia dos meses POSITIVOS dentro do período da meta.
import { somar } from './money.js';
import { deslocarMes } from './dates.js';

/** Economia (ganhos - gastos) de um mês 'YYYY-MM'. */
function economiaDoMes(estado, mes) {
  const ganhos = somar(estado.ganhos.filter((g) => (g.data || '').slice(0, 7) === mes).map((g) => g.valor || 0));
  const gastos = somar(estado.gastos.filter((g) => (g.data || '').slice(0, 7) === mes).map((g) => g.valor || 0));
  return ganhos - gastos;
}

/** Lista de meses 'YYYY-MM' de uma meta (inicio + duração). */
export function mesesDaMeta(meta) {
  const out = [];
  for (let i = 0; i < meta.meses; i++) out.push(deslocarMes(meta.inicio, i));
  return out;
}

/** Quantos meses do período da meta já se passaram (incl. o mês atual). */
function mesesDecorridos(meta, mesAtual) {
  const lista = mesesDaMeta(meta);
  let n = 0;
  for (const m of lista) { if (m <= mesAtual) n++; }
  return Math.min(n, meta.meses);
}

/**
 * Avalia uma meta.
 * @param estado
 * @param meta { id, nome, alvo(centavos), inicio('YYYY-MM'), meses(int) }
 * @param mesAtual 'YYYY-MM'
 * @returns objeto com progresso geral, ritmo mensal e status de ritmo
 */
export function avaliarMeta(estado, meta, mesAtual) {
  const lista = mesesDaMeta(meta);
  const metaMensal = meta.meses > 0 ? Math.round(meta.alvo / meta.meses) : meta.alvo;

  // acumulado: soma só meses positivos dentro do período, até o mês atual
  let acumulado = 0;
  for (const m of lista) {
    if (m > mesAtual) break;
    const eco = economiaDoMes(estado, m);
    if (eco > 0) acumulado += eco;
  }
  acumulado = Math.min(acumulado, meta.alvo); // não passa do alvo

  // economia do mês atual (se dentro do período)
  const dentroDoPeriodo = lista.includes(mesAtual);
  const economiaMesAtual = dentroDoPeriodo ? Math.max(0, economiaDoMes(estado, mesAtual)) : 0;

  const decorridos = mesesDecorridos(meta, mesAtual);
  const esperadoAteAgora = Math.min(meta.alvo, metaMensal * decorridos);
  const noRitmo = acumulado >= esperadoAteAgora;
  const diferenca = acumulado - esperadoAteAgora; // + adiantado, - atrasado

  const restante = Math.max(0, meta.alvo - acumulado);
  const mesesRestantes = Math.max(0, meta.meses - decorridos);
  // quanto precisa por mês daqui pra frente para fechar no prazo
  const ritmoNecessario = mesesRestantes > 0 ? Math.round(restante / mesesRestantes) : restante;

  return {
    meta,
    metaMensal,
    acumulado,
    restante,
    fracao: meta.alvo > 0 ? acumulado / meta.alvo : 0,
    concluida: acumulado >= meta.alvo,
    economiaMesAtual,
    fracaoMes: metaMensal > 0 ? economiaMesAtual / metaMensal : 0,
    decorridos,
    mesesRestantes,
    esperadoAteAgora,
    noRitmo,
    diferenca,
    ritmoNecessario,
    expirada: mesAtual > lista[lista.length - 1]
  };
}

/** Avalia todas as metas, ordenando ativas primeiro, depois por fração. */
export function avaliarMetas(estado, metas, mesAtual) {
  return (metas || [])
    .map((m) => avaliarMeta(estado, m, mesAtual))
    .sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      if (a.expirada !== b.expirada) return a.expirada ? 1 : -1;
      return b.fracao - a.fracao;
    });
}
