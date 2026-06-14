// js/ui/listas.js — telas de Gastos, Ganhos e Fixos.
// Compartilham o componente de linha (row) para evitar duplicação.
import { el, vazio } from './dom.js';
import { formatar } from '../money.js';
import { diaMes } from '../dates.js';
import { CATEGORIAS, corDaCategoria } from '../validation.js';
import { lancamentosDoMes, gastosPorConta, totaisDoMes } from '../selectors.js';

// estado local de filtro da tela de gastos (não pertence ao estado global)
const filtroGastos = { categoria: '', busca: '' };

function linha({ cor, titulo, sub, valor, classeValor, onClick }) {
  return el('div', { class: 'row', ...(onClick ? { onclick: onClick } : {}) }, [
    el('span', { class: 'row-dot', style: `background:${cor}` }),
    el('div', { class: 'row-body' }, [
      el('div', { class: 'row-title' }, titulo),
      sub ? el('div', { class: 'row-sub' }, sub) : null
    ]),
    el('div', { class: `row-amount ${classeValor || ''}` }, valor)
  ]);
}

function cartao(titulo, extra, corpo) {
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', {}, titulo),
      extra ? el('span', { class: 'muted' }, extra) : null
    ]),
    corpo
  ]);
}

export function renderGastos(container, estado, aoEditar) {
  // barra de filtro
  const selCat = el('select', { class: 'input' }, [
    el('option', { value: '' }, 'Todas as categorias'),
    ...CATEGORIAS.map((c) => el('option', { value: c, ...(c === filtroGastos.categoria ? { selected: '' } : {}) }, c))
  ]);
  selCat.addEventListener('change', () => { filtroGastos.categoria = selCat.value; renderGastos(container, estado, aoEditar); });

  const busca = el('input', { class: 'input', type: 'search', placeholder: 'Buscar conta ou observação…', value: filtroGastos.busca });
  busca.addEventListener('input', () => {
    filtroGastos.busca = busca.value;
    const recriado = renderGastos(container, estado, aoEditar);
    // mantém foco no campo de busca após re-render
    const novo = container.querySelector('input[type=search]');
    if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
  });

  const filtros = el('div', { class: 'filterbar' }, [selCat, busca]);

  // por conta
  const contas = gastosPorConta(estado, filtroGastos);
  const totalFiltrado = contas.reduce((s, c) => s + c.total, 0);
  const corpoContas = contas.length
    ? el('div', { class: 'rows' }, contas.map((c) =>
        linha({ cor: 'var(--red)', titulo: c.conta || '(sem conta)', valor: formatar(c.total), classeValor: 'out' })))
    : vazio('Nada encontrado.');

  // lançamentos
  const lancs = lancamentosDoMes(estado, 'gastos', filtroGastos);
  const corpoLancs = lancs.length
    ? el('div', { class: 'rows' }, lancs.map((g) =>
        linha({
          cor: corDaCategoria(g.categoria),
          titulo: g.conta || '—',
          sub: [diaMes(g.data), g.categoria, g.obs].filter(Boolean).join(' · '),
          valor: formatar(g.valor), classeValor: 'out',
          onClick: () => aoEditar('gasto', g.id)
        })))
    : vazio('Sem lançamentos.');

  container.replaceChildren(
    filtros,
    cartao('Por conta', formatar(totalFiltrado), corpoContas),
    cartao('Lançamentos', null, corpoLancs)
  );
}

export function renderGanhos(container, estado, aoEditar) {
  const t = totaisDoMes(estado);
  const lancs = lancamentosDoMes(estado, 'ganhos');
  const corpo = lancs.length
    ? el('div', { class: 'rows' }, lancs.map((g) =>
        linha({
          cor: 'var(--teal)', titulo: g.tipo || '—', sub: diaMes(g.data),
          valor: formatar(g.valor), classeValor: 'in',
          onClick: () => aoEditar('ganho', g.id)
        })))
    : vazio('Sem ganhos neste mês.');
  container.replaceChildren(cartao('Ganhos do mês', formatar(t.ganhos), corpo));
}

export function renderFixos(container, estado, aoEditarFixo, aoNovoFixo) {
  const lista = [...estado.fixos].sort((a, b) => (Number(a.vencimento) || 0) - (Number(b.vencimento) || 0));
  const corpo = lista.length
    ? el('div', { class: 'rows' }, lista.map((f) => {
        const valor = Number.isInteger(f.valor) ? formatar(f.valor) : 'A definir';
        const sub = [f.vencimento ? `vence dia ${f.vencimento}` : null, f.categoria, f.fatura].filter(Boolean).join(' · ');
        return linha({
          cor: 'var(--teal-deep)', titulo: f.gasto, sub, valor,
          onClick: aoEditarFixo ? () => aoEditarFixo(f.id) : null
        });
      }))
    : vazio('Nenhum gasto fixo. Toque em + para adicionar.');

  const botaoNovo = el('button', { class: 'btn-add-fixo' }, '+ Adicionar gasto fixo');
  if (aoNovoFixo) botaoNovo.addEventListener('click', aoNovoFixo);

  container.replaceChildren(
    cartao('Gastos fixos mensais', null, corpo),
    botaoNovo
  );
}
