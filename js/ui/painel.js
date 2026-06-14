// js/ui/painel.js — renderiza a tela Painel a partir do estado.
import { el, vazio } from './dom.js';
import { formatar, formatarCompacto } from '../money.js';
import { rotuloMes } from '../dates.js';
import { corDaCategoria } from '../validation.js';
import {
  totaisDoMes, economiaMesAnterior, serieGastos, gastosPorCategoria
} from '../selectors.js';

export function renderPainel(container, estado) {
  if (estado.carregando) {
    container.replaceChildren(vazio('Carregando…'));
    return;
  }

  const t = totaisDoMes(estado);
  const ecoAnt = economiaMesAnterior(estado);
  const delta = t.economia - ecoAnt;

  const hero = el('section', { class: 'hero' }, [
    el('div', { class: 'hero-label' }, 'Economia do mês'),
    el('div', { class: `hero-value tnum ${t.economia < 0 ? 'neg' : ''}` }, formatar(t.economia)),
    deltaNode(delta)
  ]);

  const duo = el('div', { class: 'duo' }, [
    miniCard('in', 'Ganhos', t.ganhos),
    miniCard('out', 'Gastos', t.gastos)
  ]);

  container.replaceChildren(hero, duo, cardBarras(estado), cardCategorias(estado));
}

function deltaNode(delta) {
  if (delta === 0) return el('div', { class: 'hero-delta' }, 'sem variação vs. mês anterior');
  const subindo = delta > 0;
  return el('div', { class: `hero-delta ${subindo ? 'up' : 'down'}` },
    `${subindo ? '▲' : '▼'} ${formatar(Math.abs(delta))} vs. mês anterior`);
}

function miniCard(tipo, label, centavos) {
  return el('div', { class: `mini ${tipo}` }, [
    el('span', { class: 'mini-label' }, label),
    el('span', { class: 'mini-val tnum' }, formatar(centavos))
  ]);
}

function cardBarras(estado) {
  const serie = serieGastos(estado, 6);
  const max = Math.max(1, ...serie.map((s) => s.total));
  const barras = serie.map((s) => {
    const altura = Math.round((s.total / max) * 100);
    return el('div', { class: 'bar' }, [
      el('div', { class: 'bar-track' }, [
        el('div', { class: `bar-fill ${s.atual ? 'cur' : ''}`, style: `height:${altura}%` })
      ]),
      el('span', {}, s.rotulo)
    ]);
  });
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Gastos por mês')]),
    el('div', { class: 'bars' }, barras)
  ]);
}

function cardCategorias(estado) {
  const cats = gastosPorCategoria(estado);
  const corpo = cats.length
    ? el('div', { class: 'treemap' }, cats.map((c, i) => {
        const base = i === 0 ? 100 : c.fracao > 0.18 ? 48 : 31;
        return el('div', {
          class: 'tm',
          style: `flex:1 1 ${base}%;background:${corDaCategoria(c.categoria)}`
        }, [
          document.createTextNode(c.categoria),
          el('span', {}, `${formatarCompacto(c.total)} · ${Math.round(c.fracao * 100)}%`)
        ]);
      }))
    : vazio('Sem gastos neste mês.');
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', {}, 'Por categoria'),
      el('span', { class: 'muted' }, rotuloMes(estado.mes).split(' ')[0])
    ]),
    corpo
  ]);
}
