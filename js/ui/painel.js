// js/ui/painel.js — renderiza a tela Painel a partir do estado.
import { el, vazio } from './dom.js';
import { formatar, formatarCompacto } from '../money.js';
import { rotuloMes } from '../dates.js';
import { corDaCategoria } from '../validation.js';
import { squarify, agruparPequenos } from './treemap.js';
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
  const corpo = cats.length ? treemapSVG(cats) : vazio('Sem gastos neste mês.');
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', {}, 'Por categoria'),
      el('span', { class: 'muted' }, rotuloMes(estado.mes).split(' ')[0])
    ]),
    corpo
  ]);
}

// Treemap real (squarified): áreas proporcionais ao valor.
// viewBox em proporção próxima do container real (~3:1) e sem distorção,
// para que a área desenhada corresponda fielmente ao valor.
const TM_W = 600, TM_H = 220, GAP = 4, RADIUS = 8;

function treemapSVG(cats) {
  const dados = agruparPequenos(cats, 0.05);
  const rects = squarify(dados, { x: 0, y: 0, w: TM_W, h: TM_H }, (c) => c.total);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${TM_W} ${TM_H}`);
  svg.setAttribute('class', 'treemap-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');

  for (const r of rects) {
    const x = r.x + GAP / 2, y = r.y + GAP / 2;
    const w = Math.max(0, r.w - GAP), h = Math.max(0, r.h - GAP);
    const cor = r.categoria === 'OUTROS' ? '#5a616e' : corDaCategoria(r.categoria);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', Math.min(RADIUS, w / 2, h / 2));
    rect.setAttribute('fill', cor);
    g.appendChild(rect);

    // título acessível (toque/hover) sempre presente
    const titulo = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titulo.textContent = `${r.categoria}: ${formatarCompacto(r.total)} (${Math.round(r.fracao * 100)}%)`;
    g.appendChild(titulo);

    // rótulos adaptativos: só desenha texto se couber
    if (w > 54 && h > 26) {
      g.appendChild(texto(x + 8, y + 18, cor, r.categoria, 'tm-nome'));
      if (h > 42) {
        g.appendChild(texto(x + 8, y + 34, cor,
          `${formatarCompacto(r.total)} · ${Math.round(r.fracao * 100)}%`, 'tm-val'));
      }
    } else if (w > 40 && h > 30) {
      // caixa estreita mas alta: nome abreviado + %
      g.appendChild(texto(x + 6, y + 15, cor, abreviar(r.categoria, w), 'tm-nome'));
      g.appendChild(texto(x + 6, y + 29, cor, `${Math.round(r.fracao * 100)}%`, 'tm-val'));
    } else if (w > 28 && h > 16) {
      // muito pequena: só a porcentagem (nome no tooltip)
      g.appendChild(texto(x + 6, y + 15, cor, `${Math.round(r.fracao * 100)}%`, 'tm-val'));
    }
    svg.appendChild(g);
  }

  const wrap = el('div', { class: 'treemap-wrap' });
  wrap.appendChild(svg);
  return wrap;
}

// abrevia nome para caber em caixa estreita (~6px por caractere)
function abreviar(nome, largura) {
  const max = Math.max(3, Math.floor((largura - 12) / 6));
  return nome.length > max ? nome.slice(0, max - 1) + '…' : nome;
}

function texto(x, y, fundo, conteudo, classe) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('class', classe);
  t.setAttribute('fill', corTexto(fundo));
  t.textContent = conteudo;
  return t;
}

// escolhe texto escuro ou claro conforme a luminância do fundo
function corTexto(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0e1411' : '#f3f5f4';
}
