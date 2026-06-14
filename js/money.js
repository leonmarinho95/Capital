// js/money.js — toda aritmética e formatação monetária num lugar só.
// REGRA DO SISTEMA: valores trafegam e são guardados em CENTAVOS (inteiros).
// Float só aparece na fronteira de entrada/saída (input do usuário, exibição).

/** Converte uma entrada do usuário (reais, ex.: "8,90" ou 8.9) para centavos inteiros. */
export function reaisParaCentavos(entrada) {
  if (entrada == null || entrada === '') return null;
  const texto = String(entrada).trim().replace(/\s/g, '').replace(',', '.');
  const reais = Number(texto);
  if (!Number.isFinite(reais)) return null;
  return Math.round(reais * 100);
}

/** Converte centavos inteiros de volta para reais (número), para preencher inputs. */
export function centavosParaReais(centavos) {
  if (!Number.isInteger(centavos)) return null;
  return centavos / 100;
}

/** Soma uma lista de valores em centavos com segurança (inteiros, sem erro de float). */
export function somar(listaCentavos) {
  return listaCentavos.reduce((acc, c) => acc + (Number.isInteger(c) ? c : 0), 0);
}

/** Formata centavos como moeda brasileira: 890 -> "R$ 8,90". */
export function formatar(centavos) {
  if (!Number.isInteger(centavos)) return '—';
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
}

/** Versão compacta para rótulos de gráfico: 125000 -> "R$ 1,3k". */
export function formatarCompacto(centavos) {
  if (!Number.isInteger(centavos) || centavos === 0) return '';
  const reais = centavos / 100;
  if (Math.abs(reais) >= 1000) {
    return 'R$ ' + (reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  }
  return 'R$ ' + reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
