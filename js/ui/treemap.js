// js/ui/treemap.js — layout de treemap "squarified" (Bruls, Huizing, van Wijk).
// Calcula retângulos cuja ÁREA é proporcional ao valor, mantendo proporções
// próximas de quadrados (legíveis). Puro: recebe itens e um retângulo,
// devolve a lista com x/y/w/h. Não toca no DOM.

/**
 * @param itens lista já ordenada desc
 * @param rect {x, y, w, h}
 * @param valorDe função que extrai o valor numérico de cada item (padrão: i.valor)
 * @returns mesma lista, cada item com {x, y, w, h} adicionados
 */
export function squarify(itens, rect, valorDe = (i) => i.valor) {
  const total = itens.reduce((s, i) => s + valorDe(i), 0);
  if (total <= 0 || itens.length === 0) return [];
  // escala os valores para a área disponível
  const area = rect.w * rect.h;
  const escala = area / total;
  const escalados = itens.map((i) => ({ ...i, _area: valorDe(i) * escala }));

  const resultado = [];
  let livre = { ...rect };
  let fila = [...escalados];

  while (fila.length > 0) {
    const lado = Math.min(livre.w, livre.h);
    const linha = [];
    let melhorPior = Infinity;

    // adiciona itens à linha enquanto melhora (ou mantém) a razão de aspecto
    while (fila.length > 0) {
      const tentativa = [...linha, fila[0]];
      const pior = piorRazao(tentativa, lado);
      if (pior <= melhorPior) {
        linha.push(fila.shift());
        melhorPior = pior;
      } else {
        break;
      }
    }
    // posiciona a linha fechada e atualiza o espaço livre
    livre = posicionarLinha(linha, livre, resultado);
  }
  return resultado;
}

function somaArea(linha) {
  return linha.reduce((s, i) => s + i._area, 0);
}

// pior razão de aspecto (max(w/h, h/w)) entre os itens da linha, dado o lado
function piorRazao(linha, lado) {
  const s = somaArea(linha);
  if (s <= 0) return Infinity;
  const espessura = s / lado; // comprimento perpendicular da faixa
  let pior = 0;
  for (const it of linha) {
    const comprimento = it._area / espessura;
    const razao = Math.max(comprimento / espessura, espessura / comprimento);
    if (razao > pior) pior = razao;
  }
  return pior;
}

// fecha a faixa no lado mais curto do retângulo livre e retorna o restante
function posicionarLinha(linha, livre, out) {
  const s = somaArea(linha);
  const horizontal = livre.w >= livre.h; // faixa empilha ao longo do lado menor
  if (horizontal) {
    const espessura = s / livre.h; // largura da coluna
    let y = livre.y;
    for (const it of linha) {
      const altura = it._area / espessura;
      out.push({ ...it, x: livre.x, y, w: espessura, h: altura });
      y += altura;
    }
    return { x: livre.x + espessura, y: livre.y, w: livre.w - espessura, h: livre.h };
  } else {
    const espessura = s / livre.w; // altura da linha
    let x = livre.x;
    for (const it of linha) {
      const largura = it._area / espessura;
      out.push({ ...it, x, y: livre.y, w: largura, h: espessura });
      x += largura;
    }
    return { x: livre.x, y: livre.y + espessura, w: livre.w, h: livre.h - espessura };
  }
}

/**
 * Agrupa categorias pequenas (abaixo de `limiar` do total) num bloco "OUTROS".
 * @param cats [{categoria, total, fracao}]
 * @returns nova lista com "OUTROS" no fim, se aplicável
 */
export function agruparPequenos(cats, limiar = 0.05) {
  const grandes = cats.filter((c) => c.fracao >= limiar);
  const pequenos = cats.filter((c) => c.fracao < limiar);
  if (pequenos.length <= 1) return cats; // não vale agrupar 1 só
  const somaPeq = pequenos.reduce((s, c) => s + c.total, 0);
  const fracaoPeq = pequenos.reduce((s, c) => s + c.fracao, 0);
  return [...grandes, { categoria: 'OUTROS', total: somaPeq, fracao: fracaoPeq, agrupado: pequenos }];
}

// ---------------------------------------------------------------------------
// Renderizador de treemap de categorias (toca o DOM). Reutilizável por
// qualquer tela: recebe cats [{categoria,total,fracao}] e devolve um wrapper.
import { el, vazio } from './dom.js';
import { formatarCompacto } from '../money.js';
import { corDaCategoria } from '../validation.js';

const TMW = 600, TMH = 220, TMGAP = 4, TMRADIUS = 8;
const NS = 'http://www.w3.org/2000/svg';

export function treemapDeCategorias(cats) {
  if (!cats || !cats.length) return vazio('Sem gastos no período.');
  const dados = agruparPequenos(cats, 0.05);
  const rects = squarify(dados, { x: 0, y: 0, w: TMW, h: TMH }, (c) => c.total);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${TMW} ${TMH}`);
  svg.setAttribute('class', 'treemap-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  for (const r of rects) {
    const x = r.x + TMGAP / 2, y = r.y + TMGAP / 2;
    const w = Math.max(0, r.w - TMGAP), h = Math.max(0, r.h - TMGAP);
    const cor = r.categoria === 'OUTROS' ? '#5a616e' : corDaCategoria(r.categoria);
    const g = document.createElementNS(NS, 'g');
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', Math.min(TMRADIUS, w / 2, h / 2));
    rect.setAttribute('fill', cor);
    g.appendChild(rect);
    const titulo = document.createElementNS(NS, 'title');
    titulo.textContent = `${r.categoria}: ${formatarCompacto(r.total)} (${Math.round(r.fracao * 100)}%)`;
    g.appendChild(titulo);
    if (w > 70 && h > 30) {
      g.appendChild(tmTexto(x + 9, y + 20, cor, r.categoria, 'tm-nome'));
      g.appendChild(tmTexto(x + 9, y + 36, cor, `${formatarCompacto(r.total)} · ${Math.round(r.fracao * 100)}%`, 'tm-val'));
    } else if (w > 40 && h > 18) {
      g.appendChild(tmTexto(x + 6, y + 16, cor, `${Math.round(r.fracao * 100)}%`, 'tm-val'));
    }
    svg.appendChild(g);
  }
  const wrap = el('div', { class: 'treemap-wrap' });
  wrap.appendChild(svg);
  return wrap;
}

function tmTexto(x, y, fundo, conteudo, classe) {
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('class', classe);
  t.setAttribute('fill', tmCorTexto(fundo));
  t.textContent = conteudo;
  return t;
}
function tmCorTexto(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0e1411' : '#f3f5f4';
}
