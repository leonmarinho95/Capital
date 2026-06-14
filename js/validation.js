// js/validation.js — regras de domínio e validação/normalização de lançamentos.
// Nenhum dado chega ao repositório sem passar por aqui.

export const CATEGORIAS = [
  'COMPRAS', 'MORADIA', 'TRANSPORTE', 'LAZER', 'ALIMENTAÇÃO',
  'BEM-ESTAR', 'MANUTENÇÃO', 'VETERINÁRIO', 'PROFISSIONAL', 'ETC'
];

export const CORES_CATEGORIA = {
  'COMPRAS': '#e8956b', 'MORADIA': '#6b9be8', 'TRANSPORTE': '#e8c96b',
  'LAZER': '#b88be8', 'ALIMENTAÇÃO': '#6be89b', 'BEM-ESTAR': '#e86bb8',
  'MANUTENÇÃO': '#6bd6e8', 'VETERINÁRIO': '#9be86b', 'PROFISSIONAL': '#e87b6b',
  'ETC': '#9aa0ab'
};

export const corDaCategoria = (cat) => CORES_CATEGORIA[cat] || '#9aa0ab';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida e normaliza um gasto. Retorna {ok, dados} ou {ok:false, erro}. */
export function validarGasto({ categoria, conta, valorCentavos, data, obs, vencimento }) {
  if (!CATEGORIAS.includes(categoria)) return falha('Categoria inválida.');
  if (!conta || !conta.trim()) return falha('Informe a conta.');
  if (!Number.isInteger(valorCentavos) || valorCentavos < 0) return falha('Valor inválido.');
  if (!RE_DATA.test(data || '')) return falha('Data inválida.');
  return {
    ok: true,
    dados: {
      categoria,
      conta: conta.trim().toUpperCase(),
      valor: valorCentavos,
      data,
      vencimento: RE_DATA.test(vencimento || '') ? vencimento : null,
      obs: (obs || '').trim()
    }
  };
}

/** Valida e normaliza um ganho. */
export function validarGanho({ tipo, valorCentavos, data }) {
  if (!tipo || !tipo.trim()) return falha('Informe o tipo do ganho.');
  if (!Number.isInteger(valorCentavos) || valorCentavos < 0) return falha('Valor inválido.');
  if (!RE_DATA.test(data || '')) return falha('Data inválida.');
  return { ok: true, dados: { tipo: tipo.trim().toUpperCase(), valor: valorCentavos, data } };
}

/**
 * Valida e normaliza um gasto fixo (recorrente).
 * valorCentavos pode ser null -> fixo de valor variável ("A definir").
 * vencimento: dia do mês 1..31. categoria: uma das CATEGORIAS.
 */
export function validarFixo({ gasto, categoria, valorCentavos, vencimento, fatura }) {
  if (!gasto || !gasto.trim()) return falha('Informe o nome do gasto fixo.');
  if (!CATEGORIAS.includes(categoria)) return falha('Categoria inválida.');
  const dia = Number(vencimento);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return falha('Dia de vencimento inválido (1 a 31).');
  // valor é opcional: null = variável ("A definir")
  let valor = null;
  if (valorCentavos != null) {
    if (!Number.isInteger(valorCentavos) || valorCentavos < 0) return falha('Valor inválido.');
    valor = valorCentavos;
  }
  return {
    ok: true,
    dados: {
      gasto: gasto.trim().toUpperCase(),
      categoria,
      valor,                 // número (centavos) ou null
      vencimento: dia,
      fatura: (fatura || '').trim()
    }
  };
}

const falha = (erro) => ({ ok: false, erro });
