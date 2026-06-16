// js/ui/orcamento.js — aba Orçamento: tetos por categoria (mensal/anual) + progresso.
import { el, vazio } from './dom.js';
import { formatar, reaisParaCentavos, centavosParaReais } from '../money.js';
import { CATEGORIAS, corDaCategoria } from '../validation.js';
import { rotuloMes } from '../dates.js';
import { avaliarOrcamento, totaisMensais } from '../orcamento.js';

export function renderOrcamento(container, estado, aoSalvarOrcamento) {
  if (estado.carregando) { container.replaceChildren(vazio('Carregando…')); return; }

  const orcamento = estado.orcamento || {};
  const linhas = avaliarOrcamento(estado.gastos, orcamento, estado.mes);
  const filhos = [];

  // resumo mensal (só categorias de teto mensal)
  if (linhas.some((l) => l.tipo === 'mensal')) {
    const t = totaisMensais(linhas);
    const frac = t.teto > 0 ? t.gasto / t.teto : 0;
    filhos.push(el('section', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h2', {}, 'Orçamento mensal'),
        el('span', { class: 'muted' }, rotuloMes(estado.mes).split(' ')[0])
      ]),
      el('div', { class: 'orc-resumo' }, [
        el('span', { class: 'tnum' }, `${formatar(t.gasto)} de ${formatar(t.teto)}`),
        el('span', { class: `orc-pct ${classe(frac)}` }, `${Math.round(frac * 100)}%`)
      ]),
      barra(frac)
    ]));
  }

  // progresso por categoria
  if (linhas.length) {
    filhos.push(el('section', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h2', {}, 'Por categoria')]),
      el('div', { class: 'orc-list' }, linhas.map((l) => linhaCategoria(l)))
    ]));
  } else {
    filhos.push(el('section', { class: 'card' }, [vazio('Nenhum teto definido ainda. Configure abaixo.')]));
  }

  // editor de tetos
  filhos.push(editorTetos(estado, orcamento, aoSalvarOrcamento));

  container.replaceChildren(...filhos);
}

function linhaCategoria(l) {
  const periodo = l.tipo === 'anual' ? 'no ano' : 'no mês';
  return el('div', { class: 'orc-cat' }, [
    el('div', { class: 'orc-cat-head' }, [
      el('span', { class: 'orc-cat-nome' }, [
        el('span', { class: 'orc-dot', style: `background:${corDaCategoria(l.categoria)}` }),
        l.categoria,
        el('span', { class: 'orc-tipo' }, l.tipo === 'anual' ? 'anual' : 'mensal')
      ]),
      el('span', { class: `orc-cat-val tnum ${classe(l.fracao)}` },
        `${formatar(l.gasto)} / ${formatar(l.teto)}`)
    ]),
    barra(l.fracao),
    el('div', { class: 'orc-cat-sub' },
      l.restante >= 0
        ? `resta ${formatar(l.restante)} ${periodo}`
        : `estourou ${formatar(-l.restante)} ${periodo}`)
  ]);
}

function barra(fracao) {
  const pct = Math.min(100, Math.round(fracao * 100));
  return el('div', { class: 'orc-track' }, [
    el('div', { class: `orc-fill ${classe(fracao)}`, style: `width:${pct}%` })
  ]);
}

const classe = (f) => (f > 1 ? 'estourado' : f >= 0.8 ? 'alerta' : 'ok');

function editorTetos(estado, orcamento, aoSalvar) {
  const msg = el('p', { class: 'modal-msg' });
  // estado de edição local: cópia do orçamento
  const rascunho = {};
  for (const c of CATEGORIAS) {
    const def = orcamento[c];
    rascunho[c] = {
      valor: def && Number.isInteger(def.valor) ? def.valor : null,
      tipo: def && def.tipo === 'anual' ? 'anual' : 'mensal'
    };
  }

  const linhas = CATEGORIAS.map((c) => {
    const inputValor = el('input', {
      class: 'input', type: 'text', inputmode: 'decimal', placeholder: '0,00',
      value: rascunho[c].valor != null ? String(centavosParaReais(rascunho[c].valor)).replace('.', ',') : '',
      style: 'flex:1'
    });
    inputValor.addEventListener('input', () => { rascunho[c].valor = reaisParaCentavos(inputValor.value); });

    const selTipo = el('select', { class: 'input', style: 'width:110px' }, [
      el('option', { value: 'mensal', ...(rascunho[c].tipo === 'mensal' ? { selected: '' } : {}) }, 'Mensal'),
      el('option', { value: 'anual', ...(rascunho[c].tipo === 'anual' ? { selected: '' } : {}) }, 'Anual')
    ]);
    selTipo.addEventListener('change', () => { rascunho[c].tipo = selTipo.value; });

    return el('div', { class: 'orc-edit-row' }, [
      el('span', { class: 'orc-edit-cat' }, [
        el('span', { class: 'orc-dot', style: `background:${corDaCategoria(c)}` }), c
      ]),
      inputValor, selTipo
    ]);
  });

  const btn = el('button', { class: 'btn btn-primary' }, 'Salvar orçamento');
  btn.addEventListener('click', async () => {
    // monta orçamento final: só categorias com valor > 0
    const novo = {};
    for (const c of CATEGORIAS) {
      const v = rascunho[c].valor;
      if (Number.isInteger(v) && v > 0) novo[c] = { valor: v, tipo: rascunho[c].tipo };
    }
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Salvando…';
    try { await aoSalvar(novo); msg.textContent = 'Orçamento salvo.'; }
    catch (e) { msg.textContent = 'Erro ao salvar: ' + (e.message || e); }
    finally { btn.disabled = false; btn.textContent = 'Salvar orçamento'; }
  });

  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Definir tetos')]),
    el('p', { class: 'muted', style: 'margin-bottom:12px' },
      'Deixe em branco (ou 0) para categorias sem teto. Mensal compara o mês; anual acumula o ano.'),
    el('div', { class: 'orc-edit-list' }, linhas),
    msg, btn
  ]);
}
