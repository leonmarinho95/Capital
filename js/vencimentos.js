// js/vencimentos.js — engine de vencimentos dos gastos fixos.
// Calcula, para o mês de referência, a data de vencimento de cada fixo
// (dia do mês) e quais vencem dentro de uma janela de antecedência.
// Tudo em fuso LOCAL para não errar o dia.

/** Constrói uma Date local no último dia válido se o dia exceder o mês. */
function dataVencimento(ano, mesIndice0, dia) {
  // dia pode ser 31 num mês de 30; clampa para o último dia do mês
  const ultimoDia = new Date(ano, mesIndice0 + 1, 0).getDate();
  const d = Math.min(dia, ultimoDia);
  return new Date(ano, mesIndice0, d);
}

/** Diferença em dias (inteiro) entre duas datas locais, ignorando horas. */
function diasEntre(a, b) {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate())
           - new Date(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86400000);
}

/**
 * Retorna os fixos que vencem entre hoje e `antecedencia` dias à frente.
 * @param fixos lista [{gasto, valor, vencimento(dia), categoria, fatura}]
 * @param hojeData Date (padrão: agora) — injetável para testes
 * @param antecedencia dias de aviso (padrão 5)
 * @returns [{...fixo, diaVencimento, dataVenc(Date), emDias}] ordenado por proximidade
 */
export function vencendoEmBreve(fixos, hojeData = new Date(), antecedencia = 5) {
  const ano = hojeData.getFullYear();
  const mes = hojeData.getMonth();
  const out = [];
  for (const f of fixos) {
    const dia = Number(f.vencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) continue;

    // considera o vencimento deste mês; se já passou, olha o do próximo mês
    let venc = dataVencimento(ano, mes, dia);
    let emDias = diasEntre(hojeData, venc);
    if (emDias < 0) {
      venc = dataVencimento(ano, mes + 1, dia);
      emDias = diasEntre(hojeData, venc);
    }
    if (emDias >= 0 && emDias <= antecedencia) {
      out.push({ ...f, diaVencimento: dia, dataVenc: venc, emDias });
    }
  }
  return out.sort((a, b) => a.emDias - b.emDias);
}

/** Texto amigável para a proximidade do vencimento. */
export function rotuloProximidade(emDias) {
  if (emDias === 0) return 'vence hoje';
  if (emDias === 1) return 'vence amanhã';
  return `vence em ${emDias} dias`;
}

/** Date -> 'YYYY-MM-DD' local (para pré-preencher o lançamento). */
export function dataISOLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
