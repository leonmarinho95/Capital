// js/ui/painel.js — renderiza a tela Painel a partir do estado.
import { el, vazio } from './dom.js';
import { formatar } from '../money.js';
import { vencendoEmBreve, rotuloProximidade } from '../vencimentos.js';
import { totaisDoMes, economiaMesAnterior } from '../selectors.js';
import { blocosPeriodo } from './anual.js';

export function renderPainel(container, estado, aoLancarVencimento, aoResolverVencimento) {
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

  const filhos = [hero, duo];
  const alertas = cardVencimentos(estado, aoLancarVencimento, aoResolverVencimento);
  if (alertas) filhos.push(alertas);
  // gráficos do período (filtro + resumo + patrimônio + ganhos×gastos + treemap),
  // reaproveitados do antigo Anual; o seletor re-renderiza o próprio painel.
  const periodo = blocosPeriodo(estado, () =>
    renderPainel(container, estado, aoLancarVencimento, aoResolverVencimento));
  filhos.push(...periodo);
  container.replaceChildren(...filhos);
}

// Bloco "Vencem em breve" — só aparece se houver vencimentos na janela.
function cardVencimentos(estado, aoLancar, aoResolver) {
  const proximos = vencendoEmBreve(estado.fixos, new Date(), 5);
  // filtra os já resolvidos neste mês
  const resolvidos = estado.cartaoConfig?.resolvidos || {};
  const mesAtual = new Date().toISOString().slice(0, 7);
  const visiveis = proximos.filter((v) => !resolvidos[`${v.id}:${mesAtual}`]);
  if (visiveis.length === 0) return null;

  const itens = visiveis.map((v) => {
    const ehLembrete = !!v.lembrete;
    const valorTxt = Number.isInteger(v.valor) ? formatar(v.valor) : (ehLembrete ? 'lembrete' : 'valor a confirmar');
    const info = el('div', { class: 'venc-info' }, [
      el('div', { class: 'venc-nome' }, v.gasto),
      el('div', { class: 'venc-sub' }, `${rotuloProximidade(v.emDias)} · ${valorTxt}`)
    ]);
    const acoes = el('div', { class: 'venc-acoes' });
    if (!ehLembrete) {
      const btn = el('button', { class: 'venc-lancar' }, 'Lançar');
      if (aoLancar) btn.addEventListener('click', () => aoLancar(v));
      acoes.appendChild(btn);
    } else {
      acoes.appendChild(el('span', { class: 'venc-tag' }, 'só lembrete'));
    }
    const jaBtn = el('button', { class: 'venc-feito', title: 'Já lançado / pago' }, '✓ Já lançado');
    if (aoResolver) jaBtn.addEventListener('click', () => aoResolver(v.id));
    acoes.appendChild(jaBtn);

    return el('div', { class: 'venc-row' }, [
      el('span', { class: `venc-dot ${v.emDias <= 1 ? 'urgente' : ''}` }),
      info, acoes
    ]);
  });

  return el('section', { class: 'card card-venc' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Vencem em breve')]),
    el('div', { class: 'venc-list' }, itens)
  ]);
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
