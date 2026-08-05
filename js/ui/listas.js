// js/ui/listas.js — telas de Gastos, Ganhos e Fixos.
// Compartilham o componente de linha (row) para evitar duplicação.
import { el, vazio } from './dom.js';
import { formatar } from '../money.js';
import { diaMes } from '../dates.js';
import { CATEGORIAS, corDaCategoria, rotuloForma } from '../validation.js';
import { lancamentosDoMes, gastosPorConta, totaisDoMes, gastosPorCategoria } from '../selectors.js';
import { treemapDeCategorias } from './treemap.js';

const parcelaTxt = (g) => (g.parcelasTotal > 1 ? ` (${g.parcela}/${g.parcelasTotal})` : '');

// estado local de filtro da tela de gastos (não pertence ao estado global)
const filtroGastos = { categoria: '', busca: '', ordem: 'data' };
const filtroGanhos = { ordem: 'data' };

// Cabeçalho de card com botão de ordenação (data <-> valor).
function cabecalhoOrdenavel(titulo, extra, filtro, aoTrocar) {
  const btn = el('button', { class: 'ordena-btn' },
    filtro.ordem === 'valor' ? '↓ valor' : '↓ data');
  btn.addEventListener('click', () => {
    filtro.ordem = filtro.ordem === 'valor' ? 'data' : 'valor';
    aoTrocar();
  });
  return el('div', { class: 'card-head' }, [
    el('h2', {}, titulo),
    el('div', { class: 'card-head-right' }, [
      extra ? el('span', { class: 'muted' }, extra) : null,
      btn
    ].filter(Boolean))
  ]);
}

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
          titulo: (g.conta || '—') + parcelaTxt(g),
          sub: [diaMes(g.data), g.categoria, g.forma ? rotuloForma(g.forma) : null, g.obs].filter(Boolean).join(' · '),
          valor: formatar(g.valor), classeValor: 'out',
          onClick: () => aoEditar('gasto', g.id)
        })))
    : vazio('Sem lançamentos.');

  // treemap por categoria do mês (respeita o filtro de categoria? não —
  // mostra o panorama do mês inteiro para dar contexto ao que está filtrado)
  const cats = gastosPorCategoria(estado);
  const treemap = cats.length
    ? cartao('Por categoria', null, treemapDeCategorias(cats))
    : null;

  container.replaceChildren(...[
    filtros,
    treemap,
    cartao('Por conta', formatar(totalFiltrado), corpoContas),
    el('section', { class: 'card' }, [
      cabecalhoOrdenavel('Lançamentos', null, filtroGastos, () => renderGastos(container, estado, aoEditar)),
      corpoLancs
    ])
  ].filter(Boolean));
}

export function renderGanhos(container, estado, aoEditar) {
  const t = totaisDoMes(estado);
  const lancs = lancamentosDoMes(estado, 'ganhos', filtroGanhos);
  const corpo = lancs.length
    ? el('div', { class: 'rows' }, lancs.map((g) =>
        linha({
          cor: 'var(--teal)', titulo: g.tipo || '—', sub: diaMes(g.data),
          valor: formatar(g.valor), classeValor: 'in',
          onClick: () => aoEditar('ganho', g.id)
        })))
    : vazio('Sem ganhos neste mês.');
  container.replaceChildren(el('section', { class: 'card' }, [
    cabecalhoOrdenavel('Ganhos do mês', formatar(t.ganhos), filtroGanhos, () => renderGanhos(container, estado, aoEditar)),
    corpo
  ]));
}

export function renderFixos(container, estado, aoEditarFixo, aoNovoFixo, aoAlternarResolvido) {
  const mes = estado.mes;
  const nova = estado.appConfig?.resolvidos || {};
  const antiga = estado.cartaoConfig?.resolvidos || {};
  const resolvidos = { ...antiga, ...nova };
  const lista = [...estado.fixos].sort((a, b) => (Number(a.vencimento) || 0) - (Number(b.vencimento) || 0));

  const feitos = lista.filter((f) => resolvidos[`${f.id}:${mes}`]).length;

  const corpo = lista.length
    ? el('div', { class: 'rows' }, lista.map((f) => {
        const valor = Number.isInteger(f.valor) ? formatar(f.valor) : 'A definir';
        const sub = [f.vencimento ? `vence dia ${f.vencimento}` : null, f.categoria, f.lembrete ? 'só lembrete' : null, f.fatura].filter(Boolean).join(' · ');
        const conferido = !!resolvidos[`${f.id}:${mes}`];

        // checkbox de conferência (não abre a edição)
        const chk = el('input', { type: 'checkbox', class: 'fx-check' });
        chk.checked = conferido;
        chk.addEventListener('click', (e) => e.stopPropagation());
        chk.addEventListener('change', () => {
          if (aoAlternarResolvido) aoAlternarResolvido(f.id, mes, chk.checked);
        });

        const corpoLinha = el('div', { class: `fx-linha ${conferido ? 'feito' : ''}` }, [
          el('label', { class: 'fx-check-wrap' }, [chk]),
          el('div', { class: 'fx-info', onclick: aoEditarFixo ? () => aoEditarFixo(f.id) : null }, [
            el('div', { class: 'fx-titulo' }, f.gasto),
            el('div', { class: 'fx-sub' }, sub)
          ]),
          el('div', { class: 'fx-valor tnum' }, valor)
        ]);
        return corpoLinha;
      }))
    : vazio('Nenhum gasto fixo. Toque em + para adicionar.');

  const botaoNovo = el('button', { class: 'btn-add-fixo' }, '+ Adicionar gasto fixo');
  if (aoNovoFixo) botaoNovo.addEventListener('click', aoNovoFixo);

  const titulo = lista.length
    ? `Conferência do mês · ${feitos}/${lista.length}`
    : 'Gastos fixos mensais';

  container.replaceChildren(
    cartao(titulo, null, corpo),
    botaoNovo
  );
}
