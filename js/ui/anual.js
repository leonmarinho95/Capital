// js/ui/anual.js — tela "Anual": patrimônio, resumo, ganhos x gastos, categorias.
import { el, vazio } from './dom.js';
import { formatar, formatarCompacto } from '../money.js';
import { corDaCategoria } from '../validation.js';
import { squarify, agruparPequenos } from './treemap.js';
import {
  serieMensal, patrimonioAcumulado, resumoPeriodo, categoriasDoPeriodo
} from '../selectors-anual.js';

// estado local do seletor de período (não pertence ao estado global)
const periodo = { janela: 12 };

export function renderAnual(container, estado) {
  if (estado.carregando) { container.replaceChildren(vazio('Carregando…')); return; }
  const temDados = estado.gastos.length > 0 || estado.ganhos.length > 0;
  if (!temDados) { container.replaceChildren(vazio('Sem dados para exibir ainda.')); return; }

  container.replaceChildren(...blocosPeriodo(estado, () => renderAnual(container, estado)));
}

/**
 * Retorna os blocos do período (seletor + resumo + gráficos) como um array de
 * nós, para serem embutidos em qualquer tela. `rerender` é chamado quando o
 * usuário troca o período, para a tela hospedeira se redesenhar.
 */
export function blocosPeriodo(estado, rerender) {
  const temDados = estado.gastos.length > 0 || estado.ganhos.length > 0;
  if (!temDados) return [];
  return [
    seletorPeriodo(rerender),
    cardResumo(estado),
    cardPatrimonio(estado),
    cardGanhosGastos(estado),
    cardCategorias(estado)
  ];
}

function seletorPeriodo(rerender) {
  const opcoes = [['6m', 6], ['12m', 12], ['Tudo', 'tudo']];
  const seg = el('div', { class: 'seg periodo-seg' },
    opcoes.map(([rotulo, val]) => {
      const ativo = String(periodo.janela) === String(val);
      const b = el('button', ativo ? { class: 'on' } : {}, rotulo);
      b.addEventListener('click', () => {
        periodo.janela = val;
        if (rerender) rerender();
      });
      return b;
    }));
  return seg;
}

/* ---------- Patrimônio (gráfico de linha) ---------- */
function cardPatrimonio(estado) {
  const serie = patrimonioAcumulado(estado, periodo.janela);
  const atual = serie.length ? serie[serie.length - 1].saldo : 0;
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', {}, 'Patrimônio acumulado'),
      el('span', { class: `muted ${atual < 0 ? 'neg' : ''}` }, formatar(atual))
    ]),
    serie.length > 1 ? graficoLinha(serie) : vazio('Período curto demais para o gráfico.')
  ]);
}

const GW = 600, GH = 200, PAD = 8;

function graficoLinha(serie) {
  const saldos = serie.map((s) => s.saldo);
  let min = Math.min(0, ...saldos), max = Math.max(0, ...saldos);
  if (min === max) max = min + 1;
  const x = (i) => PAD + (i / (serie.length - 1)) * (GW - 2 * PAD);
  const y = (v) => GH - PAD - ((v - min) / (max - min)) * (GH - 2 * PAD);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${GW} ${GH}`);
  svg.setAttribute('class', 'linha-svg');
  svg.setAttribute('preserveAspectRatio', 'none');

  // linha do zero (referência), se o mínimo for negativo
  if (min < 0) {
    const zero = document.createElementNS(ns, 'line');
    zero.setAttribute('x1', PAD); zero.setAttribute('x2', GW - PAD);
    zero.setAttribute('y1', y(0)); zero.setAttribute('y2', y(0));
    zero.setAttribute('class', 'linha-zero');
    svg.appendChild(zero);
  }

  const pontos = serie.map((s, i) => `${x(i)},${y(s.saldo)}`).join(' ');

  // área preenchida sob a linha
  const area = document.createElementNS(ns, 'polygon');
  area.setAttribute('points', `${PAD},${y(min < 0 ? 0 : min)} ${pontos} ${GW - PAD},${y(min < 0 ? 0 : min)}`);
  area.setAttribute('class', 'linha-area');
  svg.appendChild(area);

  // a linha
  const linha = document.createElementNS(ns, 'polyline');
  linha.setAttribute('points', pontos);
  linha.setAttribute('class', 'linha-traco');
  svg.appendChild(linha);

  // ponto final destacado
  const ult = serie.length - 1;
  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', x(ult)); dot.setAttribute('cy', y(serie[ult].saldo));
  dot.setAttribute('r', 4); dot.setAttribute('class', 'linha-dot');
  svg.appendChild(dot);

  // rótulos de mês (primeiro, meio, último) para não poluir
  const idxs = [...new Set([0, Math.floor(ult / 2), ult])];
  const labels = el('div', { class: 'linha-labels' },
    serie.map((s, i) => idxs.includes(i) ? el('span', {}, s.rotulo) : el('span', { class: 'vazio' }, '')));

  const wrap = el('div', { class: 'linha-wrap' });
  wrap.appendChild(svg);
  wrap.appendChild(labels);
  return wrap;
}

/* ---------- Resumo ---------- */
function cardResumo(estado) {
  const r = resumoPeriodo(estado, periodo.janela);
  if (!r) return el('span');
  const item = (label, valor, classe) =>
    el('div', { class: 'resumo-item' }, [
      el('span', { class: 'resumo-label' }, label),
      el('span', { class: `resumo-val tnum ${classe || ''}` }, valor)
    ]);
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Resumo do período')]),
    el('div', { class: 'resumo-grid' }, [
      item('Economia total', formatar(r.totalEconomia), r.totalEconomia < 0 ? 'neg' : 'pos'),
      item('Média mensal', formatar(r.media), r.media < 0 ? 'neg' : 'pos'),
      item(`Melhor (${r.melhor.rotulo})`, formatar(r.melhor.valor), 'pos'),
      item(`Pior (${r.pior.rotulo})`, formatar(r.pior.valor), r.pior.valor < 0 ? 'neg' : '')
    ])
  ]);
}

/* ---------- Ganhos x Gastos (barras agrupadas) ---------- */
function cardGanhosGastos(estado) {
  const serie = serieMensal(estado, periodo.janela);
  const max = Math.max(1, ...serie.map((s) => Math.max(s.ganhos, s.gastos)));
  const barras = serie.map((s) => {
    const hG = Math.round((s.ganhos / max) * 100);
    const hD = Math.round((s.gastos / max) * 100);
    return el('div', { class: 'gg-col' }, [
      el('div', { class: 'gg-track' }, [
        el('div', { class: 'gg-in', style: `height:${hG}%`, title: `Ganhos: ${formatar(s.ganhos)}` }),
        el('div', { class: 'gg-out', style: `height:${hD}%`, title: `Gastos: ${formatar(s.gastos)}` })
      ]),
      el('span', { class: 'gg-lbl' }, s.rotulo)
    ]);
  });
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', {}, 'Ganhos x Gastos'),
      el('div', { class: 'legenda' }, [
        el('span', { class: 'leg-in' }, 'Ganhos'),
        el('span', { class: 'leg-out' }, 'Gastos')
      ])
    ]),
    el('div', { class: 'gg-chart' }, barras)
  ]);
}

/* ---------- Categorias do período (reusa treemap) ---------- */
const TM_W = 600, TM_H = 220, GAP = 4, RADIUS = 8;

function cardCategorias(estado) {
  const cats = categoriasDoPeriodo(estado, periodo.janela);
  const corpo = cats.length ? treemapSVG(cats) : vazio('Sem gastos no período.');
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Gastos por categoria no período')]),
    corpo
  ]);
}

function treemapSVG(cats) {
  const dados = agruparPequenos(cats, 0.05);
  const rects = squarify(dados, { x: 0, y: 0, w: TM_W, h: TM_H }, (c) => c.total);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${TM_W} ${TM_H}`);
  svg.setAttribute('class', 'treemap-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  for (const r of rects) {
    const x = r.x + GAP / 2, y = r.y + GAP / 2;
    const w = Math.max(0, r.w - GAP), h = Math.max(0, r.h - GAP);
    const cor = r.categoria === 'OUTROS' ? '#5a616e' : corDaCategoria(r.categoria);
    const g = document.createElementNS(ns, 'g');
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', Math.min(RADIUS, w / 2, h / 2));
    rect.setAttribute('fill', cor);
    g.appendChild(rect);
    const titulo = document.createElementNS(ns, 'title');
    titulo.textContent = `${r.categoria}: ${formatarCompacto(r.total)} (${Math.round(r.fracao * 100)}%)`;
    g.appendChild(titulo);
    if (w > 70 && h > 30) {
      g.appendChild(txt(ns, x + 9, y + 20, cor, r.categoria, 'tm-nome'));
      g.appendChild(txt(ns, x + 9, y + 36, cor, `${formatarCompacto(r.total)} · ${Math.round(r.fracao * 100)}%`, 'tm-val'));
    } else if (w > 40 && h > 18) {
      g.appendChild(txt(ns, x + 6, y + 16, cor, `${Math.round(r.fracao * 100)}%`, 'tm-val'));
    }
    svg.appendChild(g);
  }
  const wrap = el('div', { class: 'treemap-wrap' });
  wrap.appendChild(svg);
  return wrap;
}

function txt(ns, x, y, fundo, conteudo, classe) {
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('class', classe);
  t.setAttribute('fill', corTexto(fundo));
  t.textContent = conteudo;
  return t;
}
function corTexto(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0e1411' : '#f3f5f4';
}
