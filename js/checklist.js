// js/checklist.js — conferência mensal dos gastos fixos.
// Uma marca 'resolvido' significa "este fixo já foi cuidado neste mês".
// A mesma marca alimenta o botão "Já lançado" dos alertas e o checklist da aba Fixos.
// Chave: `${fixoId}:${'YYYY-MM'}`.

/** Lê o mapa de resolvidos, unindo a origem nova (app) e a antiga (cartao). */
export function mapaResolvidos(estado) {
  const nova = estado.appConfig?.resolvidos || {};
  const antiga = estado.cartaoConfig?.resolvidos || {};
  return { ...antiga, ...nova }; // nova tem prioridade
}

export function chaveResolvido(fixoId, mes) {
  return `${fixoId}:${mes}`;
}

/** Um fixo está resolvido no mês? */
export function estaResolvido(estado, fixoId, mes) {
  return !!mapaResolvidos(estado)[chaveResolvido(fixoId, mes)];
}

/** Progresso do checklist do mês: {total, feitos, pendentes}. */
export function progressoChecklist(estado, mes) {
  const fixos = estado.fixos || [];
  const mapa = mapaResolvidos(estado);
  let feitos = 0;
  for (const f of fixos) if (mapa[chaveResolvido(f.id, mes)]) feitos++;
  return { total: fixos.length, feitos, pendentes: fixos.length - feitos };
}
