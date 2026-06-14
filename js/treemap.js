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
