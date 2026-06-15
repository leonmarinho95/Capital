// js/ui/cartao.js — aba Cartão: fatura por ciclo de fechamento + configuração.
import { el, vazio } from './dom.js';
import { formatar } from '../money.js';
import { diaMes } from '../dates.js';
import { corDaCategoria } from '../validation.js';
import { gastosPorFatura, faturaMesAtual, rotuloFatura } from '../cartao.js';

// navegação entre faturas: offset 0 = atual, -1 = anterior, +1 = próxima
const nav = { offset: 0 };

export function renderCartao(container, estado, aoSalvarConfig, aoNovoCredito, aoEditarGasto) {
  if (estado.carregando) { container.replaceChildren(vazio('Carregando…')); return; }

  const cfg = estado.cartaoConfig;
  // sem configuração -> pede para configurar
  if (!cfg || !cfg.fechamento) {
    container.replaceChildren(blocoConfig(estado, aoSalvarConfig, true));
    return;
  }

  const fechamento = cfg.fechamento;
  const excecoes = cfg.excecoes || {};
  const mapa = gastosPorFatura(estado.gastos, fechamento, excecoes);

  // lista de faturas ordenada (chaves = mês da fatura 'YYYY-MM')
  const chaves = [...mapa.keys()].sort();
  const atual = faturaMesAtual(fechamento, new Date(), excecoes);
  // garante que a fatura atual exista na navegação mesmo se vazia
  if (!chaves.includes(atual)) { chaves.push(atual); chaves.sort(); }
  const idxAtual = chaves.indexOf(atual);
  let idx = idxAtual + nav.offset;
  idx = Math.max(0, Math.min(chaves.length - 1, idx));
  const chave = chaves[idx];
  const fatura = mapa.get(chave) || { itens: [], total: 0 };

  container.replaceChildren(
    cabecalhoFatura(chave, fatura, chaves, idx, container, estado, aoSalvarConfig, aoNovoCredito, aoEditarGasto),
    listaItens(fatura, aoEditarGasto),
    el('button', { class: 'btn-add-fixo', onclick: () => aoNovoCredito && aoNovoCredito() }, '+ Lançar compra no crédito'),
    blocoConfig(estado, aoSalvarConfig, false)
  );
}

function cabecalhoFatura(chave, fatura, chaves, idx, container, estado, aoSalvarConfig, aoNovoCredito, aoEditarGasto) {
  const prev = el('button', { 'aria-label': 'Fatura anterior' }, '‹');
  const next = el('button', { 'aria-label': 'Próxima fatura' }, '›');
  prev.disabled = idx <= 0;
  next.disabled = idx >= chaves.length - 1;
  prev.addEventListener('click', () => { nav.offset--; renderCartao(container, estado, aoSalvarConfig, aoNovoCredito, aoEditarGasto); });
  next.addEventListener('click', () => { nav.offset++; renderCartao(container, estado, aoSalvarConfig, aoNovoCredito, aoEditarGasto); });

  return el('section', { class: 'card' }, [
    el('div', { class: 'fatura-nav' }, [prev, el('span', {}, rotuloFatura(chave)), next]),
    el('div', { class: 'fatura-total tnum' }, formatar(fatura.total)),
    el('div', { class: 'fatura-label' }, `${fatura.itens.length} compra(s) no crédito`)
  ]);
}

function listaItens(fatura, aoEditarGasto) {
  if (fatura.itens.length === 0) return el('section', { class: 'card' }, [vazio('Nenhuma compra no crédito nesta fatura.')]);
  const itens = [...fatura.itens].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const linhas = itens.map((g) => {
    const row = el('div', { class: 'row' }, [
      el('span', { class: 'row-dot', style: `background:${corDaCategoria(g.categoria)}` }),
      el('div', { class: 'row-body' }, [
        el('div', { class: 'row-title' }, (g.conta || '—') + (g.parcelasTotal > 1 ? ` (${g.parcela}/${g.parcelasTotal})` : '')),
        el('div', { class: 'row-sub' }, [g.dataCompra ? 'compra ' + diaMes(g.dataCompra) : diaMes(g.data), g.categoria, g.obs].filter(Boolean).join(' · '))
      ]),
      el('div', { class: 'row-amount out' }, formatar(g.valor))
    ]);
    if (aoEditarGasto) row.addEventListener('click', () => aoEditarGasto('gasto', g.id));
    return row;
  });
  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Compras da fatura')]),
    el('div', { class: 'rows' }, linhas)
  ]);
}

function blocoConfig(estado, aoSalvarConfig, destaque) {
  const cfg = estado.cartaoConfig || {};
  const excecoes = { ...(cfg.excecoes || {}) };

  const inFech = el('input', { class: 'input', type: 'number', min: '1', max: '31', value: cfg.fechamento ?? '', placeholder: 'ex.: 1' });
  const inVenc = el('input', { class: 'input', type: 'number', min: '1', max: '31', value: cfg.vencimento ?? 8, placeholder: 'ex.: 8' });
  const msg = el('p', { class: 'modal-msg' });

  // editor de exceções: fatura (mês) -> data completa de fechamento
  const listaExc = el('div', { class: 'exc-list' });
  function pintarExcecoes() {
    const linhas = Object.entries(excecoes).sort().map(([mes, dataFech]) =>
      el('div', { class: 'exc-row' }, [
        el('span', {}, `${rotuloFatura(mes)} fechou em ${diaMes(dataFech)}`),
        el('button', { class: 'exc-del', onclick: () => { delete excecoes[mes]; pintarExcecoes(); } }, '✕')
      ]));
    listaExc.replaceChildren(...(linhas.length ? linhas : [el('span', { class: 'muted' }, 'Sem exceções. Usa o padrão.')]));
  }
  pintarExcecoes();

  const inExcMes = el('input', { class: 'input', type: 'month', style: 'flex:1', 'aria-label': 'Mês da fatura' });
  const inExcData = el('input', { class: 'input', type: 'date', style: 'flex:1', 'aria-label': 'Data de fechamento' });
  const btnAddExc = el('button', { class: 'btn-add-fixo', style: 'margin:0' }, '+ Exceção');
  btnAddExc.addEventListener('click', () => {
    const mes = inExcMes.value;            // 'YYYY-MM' da fatura
    const dataFech = inExcData.value;      // 'YYYY-MM-DD' do fechamento (qualquer mês)
    if (!/^\d{4}-\d{2}$/.test(mes)) { msg.textContent = 'Escolha o mês da fatura.'; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFech)) { msg.textContent = 'Escolha a data de fechamento.'; return; }
    msg.textContent = '';
    excecoes[mes] = dataFech; inExcMes.value = ''; inExcData.value = ''; pintarExcecoes();
  });

  const btn = el('button', { class: 'btn btn-primary' }, 'Salvar configuração');
  btn.addEventListener('click', async () => {
    const f = Number(inFech.value), v = Number(inVenc.value);
    if (!Number.isInteger(f) || f < 1 || f > 31) { msg.textContent = 'Dia de fechamento inválido (1 a 31).'; return; }
    if (!Number.isInteger(v) || v < 1 || v > 31) { msg.textContent = 'Dia de vencimento inválido (1 a 31).'; return; }
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Salvando…';
    try { await aoSalvarConfig({ fechamento: f, vencimento: v, excecoes }); }
    catch (e) { msg.textContent = 'Erro ao salvar: ' + (e.message || e); btn.disabled = false; btn.textContent = 'Salvar configuração'; }
  });

  return el('section', { class: `card ${destaque ? 'card-venc' : ''}` }, [
    el('div', { class: 'card-head' }, [el('h2', {}, destaque ? 'Configure seu cartão' : 'Configuração do cartão')]),
    destaque ? el('p', { class: 'muted', style: 'margin-bottom:14px' },
      'Informe o dia de fechamento e o vencimento da fatura (no app do banco). São dias diferentes.') : null,
    el('div', { class: 'cfg-duo' }, [
      el('div', { class: 'campo' }, [el('label', {}, 'Dia de fechamento'), inFech]),
      el('div', { class: 'campo' }, [el('label', {}, 'Dia de vencimento'), inVenc])
    ]),
    el('div', { class: 'campo' }, [
      el('label', {}, 'Exceções: faturas que fecharam em data diferente do padrão'),
      listaExc,
      el('div', { class: 'exc-add' }, [inExcMes, inExcData, btnAddExc])
    ]),
    msg, btn
  ]);
}
