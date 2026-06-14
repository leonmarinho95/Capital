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

const falha = (erro) => ({ ok: false, erro });
