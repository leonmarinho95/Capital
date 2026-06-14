// js/dates.js — utilidades de data sem armadilha de fuso.
// Trabalhamos com strings 'YYYY-MM' e 'YYYY-MM-DD' e construímos datas
// no fuso LOCAL (nunca via toISOString, que converte para UTC e erra o mês
// na virada para quem está em UTC-3).

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                   'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Mês atual no fuso local, como 'YYYY-MM'. */
export function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Hoje no fuso local, como 'YYYY-MM-DD'. */
export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Soma (ou subtrai) meses a um 'YYYY-MM', retornando outro 'YYYY-MM'. */
export function deslocarMes(mesAAAAMM, delta) {
  const [a, m] = mesAAAAMM.split('-').map(Number);
  const total = (a * 12 + (m - 1)) + delta;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${novoAno}-${pad(novoMes)}`;
}

/** 'YYYY-MM' -> 'jun 2026'. */
export function rotuloMes(mesAAAAMM) {
  const [a, m] = mesAAAAMM.split('-').map(Number);
  return `${NOMES_MES[m - 1]} ${a}`;
}

/** Nome curto do mês: 'YYYY-MM' -> 'jun'. */
export function nomeMesCurto(mesAAAAMM) {
  return NOMES_MES[Number(mesAAAAMM.split('-')[1]) - 1];
}

/** 'YYYY-MM-DD' -> 'dd/mm'. */
export function diaMes(dataISO) {
  if (!dataISO) return '';
  return `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
}

/** Pertence ao mês? compara os 7 primeiros caracteres. */
export const noMes = (dataISO, mesAAAAMM) => !!dataISO && dataISO.slice(0, 7) === mesAAAAMM;

const pad = (n) => String(n).padStart(2, '0');
