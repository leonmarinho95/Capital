// js/orcamento.js — cálculo de orçamento por categoria (teto mensal ou anual).
// Gastos contam pela data de pagamento (campo `data`), coerente com o resto do app.
import { somar } from './money.js';

/** Soma dos gastos de uma categoria num mês 'YYYY-MM'. */
function gastoNoMes(gastos, categoria, mes) {
  return somar(gastos
    .filter((g) => g.categoria === categoria && (g.data || '').slice(0, 7) === mes)
    .map((g) => g.valor || 0));
}

/** Soma dos gastos de uma categoria num ano 'YYYY'. */
function gastoNoAno(gastos, categoria, ano) {
  return somar(gastos
    .filter((g) => g.categoria === categoria && (g.data || '').slice(0, 4) === ano)
    .map((g) => g.valor || 0));
}

/**
 * Avalia o orçamento para o mês de referência.
 * @param gastos lista de gastos
 * @param orcamento { CATEGORIA: { valor(centavos), tipo:'mensal'|'anual' } }
 * @param mesRef 'YYYY-MM'
 * @returns lista [{categoria, tipo, teto, gasto, restante, fracao, status}]
 *          ordenada por fração desc. status: 'ok'|'alerta'|'estourado'
 */
export function avaliarOrcamento(gastos, orcamento, mesRef) {
  const ano = mesRef.slice(0, 4);
  const linhas = [];
  for (const [categoria, def] of Object.entries(orcamento || {})) {
    if (!def || !Number.isInteger(def.valor) || def.valor <= 0) continue;
    const tipo = def.tipo === 'anual' ? 'anual' : 'mensal';
    const gasto = tipo === 'anual'
      ? gastoNoAno(gastos, categoria, ano)
      : gastoNoMes(gastos, categoria, mesRef);
    const teto = def.valor;
    const fracao = teto > 0 ? gasto / teto : 0;
    linhas.push({
      categoria, tipo, teto, gasto,
      restante: teto - gasto,
      fracao,
      status: statusDaFracao(fracao)
    });
  }
  return linhas.sort((a, b) => b.fracao - a.fracao);
}

/** Verde até 80%, amarelo 80–100%, vermelho acima de 100%. */
export function statusDaFracao(f) {
  if (f > 1) return 'estourado';
  if (f >= 0.8) return 'alerta';
  return 'ok';
}

/** Totais agregados do orçamento mensal (só categorias de teto mensal). */
export function totaisMensais(linhas) {
  const mensais = linhas.filter((l) => l.tipo === 'mensal');
  return {
    teto: somar(mensais.map((l) => l.teto)),
    gasto: somar(mensais.map((l) => l.gasto))
  };
}
