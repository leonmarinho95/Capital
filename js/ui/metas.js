// js/ui/metas.js — seção de metas de economia (alvo + prazo, progresso calculado).
import { el, vazio } from './dom.js';
import { formatar, reaisParaCentavos } from '../money.js';
import { rotuloMes } from '../dates.js';
import { avaliarMetas } from '../metas.js';

export function blocosMetas(estado, aoSalvarMetas) {
  const metas = estado.metas || [];
  const avaliacoes = avaliarMetas(estado, metas, estado.mes);
  const filhos = [];

  if (avaliacoes.length) {
    filhos.push(el('section', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h2', {}, 'Metas de economia')]),
      el('div', { class: 'meta-list' }, avaliacoes.map((a) => cardMeta(a, metas, aoSalvarMetas, estado.mes)))
    ]));
  }

  filhos.push(formNovaMeta(estado, metas, aoSalvarMetas));
  return filhos;
}

function cardMeta(a, metas, aoSalvar, mesAtual) {
  const pct = Math.min(100, Math.round(a.fracao * 100));
  const pctMes = Math.min(100, Math.round(a.fracaoMes * 100));

  // status de ritmo
  let ritmo, ritmoClasse;
  if (a.concluida) { ritmo = 'Concluída 🎉'; ritmoClasse = 'ok'; }
  else if (a.expirada) { ritmo = 'Prazo encerrado'; ritmoClasse = 'estourado'; }
  else if (a.noRitmo) { ritmo = 'No ritmo certo'; ritmoClasse = 'ok'; }
  else { ritmo = `${formatar(-a.diferenca)} atrás — precisa ${formatar(a.ritmoNecessario)}/mês`; ritmoClasse = 'alerta'; }

  const excluir = el('button', { class: 'meta-del', title: 'Excluir meta' }, '✕');
  excluir.addEventListener('click', () => {
    if (!confirm(`Excluir a meta "${a.meta.nome}"?`)) return;
    aoSalvar(metas.filter((m) => m.id !== a.meta.id));
  });

  return el('div', { class: 'meta-card' }, [
    el('div', { class: 'meta-top' }, [
      el('div', {}, [
        el('div', { class: 'meta-nome' }, a.meta.nome),
        el('div', { class: 'meta-prazo' },
          `${formatar(a.meta.alvo)} em ${a.meta.meses} meses · ${formatar(a.metaMensal)}/mês`)
      ]),
      excluir
    ]),
    // progresso geral
    el('div', { class: 'meta-linha' }, [
      el('span', { class: 'meta-rotulo' }, 'Progresso'),
      el('span', { class: 'tnum' }, `${formatar(a.acumulado)} / ${formatar(a.meta.alvo)} (${pct}%)`)
    ]),
    barra(pct, a.concluida ? 'ok' : (a.noRitmo ? 'ok' : 'alerta')),
    // ritmo do mês atual
    el('div', { class: 'meta-linha', style: 'margin-top:10px' }, [
      el('span', { class: 'meta-rotulo' }, `Este mês (${rotuloMes(mesAtual).split(' ')[0]})`),
      el('span', { class: 'tnum' }, `${formatar(a.economiaMesAtual)} / ${formatar(a.metaMensal)} (${pctMes}%)`)
    ]),
    barra(pctMes, 'mes'),
    el('div', { class: `meta-ritmo ${ritmoClasse}` }, ritmo)
  ]);
}

function barra(pct, classe) {
  return el('div', { class: 'orc-track' }, [
    el('div', { class: `orc-fill ${classe}`, style: `width:${pct}%` })
  ]);
}

function formNovaMeta(estado, metas, aoSalvar) {
  const inNome = el('input', { class: 'input', type: 'text', placeholder: 'Ex.: Reparo do carro' });
  const inAlvo = el('input', { class: 'input', type: 'text', inputmode: 'decimal', placeholder: '0,00', style: 'flex:1' });
  const inMeses = el('input', { class: 'input', type: 'number', min: '1', max: '120', placeholder: 'meses', style: 'width:90px' });
  const inInicio = el('input', { class: 'input', type: 'month', value: estado.mes });
  const msg = el('p', { class: 'modal-msg' });

  const btn = el('button', { class: 'btn btn-primary' }, 'Adicionar meta');
  btn.addEventListener('click', async () => {
    const nome = inNome.value.trim();
    const alvo = reaisParaCentavos(inAlvo.value);
    const meses = parseInt(inMeses.value, 10);
    const inicio = inInicio.value;
    if (!nome) { msg.textContent = 'Dê um nome à meta.'; return; }
    if (!Number.isInteger(alvo) || alvo <= 0) { msg.textContent = 'Informe um valor-alvo válido.'; return; }
    if (!Number.isInteger(meses) || meses < 1) { msg.textContent = 'Informe o prazo em meses.'; return; }
    if (!/^\d{4}-\d{2}$/.test(inicio)) { msg.textContent = 'Escolha o mês de início.'; return; }

    const nova = { id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), nome, alvo, meses, inicio };
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await aoSalvar([...metas, nova]);
      inNome.value = ''; inAlvo.value = ''; inMeses.value = '';
    } catch (e) { msg.textContent = 'Erro ao salvar: ' + (e.message || e); }
    finally { btn.disabled = false; btn.textContent = 'Adicionar meta'; }
  });

  return el('section', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', {}, 'Nova meta')]),
    el('div', { class: 'campo' }, [el('label', {}, 'Nome'), inNome]),
    el('div', { class: 'campo' }, [
      el('label', {}, 'Alvo e prazo'),
      el('div', { class: 'meta-form-row' }, [inAlvo, inMeses])
    ]),
    el('div', { class: 'campo' }, [el('label', {}, 'Mês de início'), inInicio]),
    msg, btn
  ]);
}
