// js/ui/modal.js — controla o modal de novo/editar lançamento.
// Não fala com o Firestore: delega ao app.js via callbacks (onSalvar/onExcluir).
import { $ } from './dom.js';
import { CATEGORIAS } from '../validation.js';
import { reaisParaCentavos, centavosParaReais } from '../money.js';
import { hoje } from '../dates.js';
import { faturaDaCompra, rotuloFatura } from '../cartao.js';

let ctx = null; // {tipo, id|null, onSalvar, onExcluir}
let formaAtual = 'debito';
let obterCartaoCfg = () => null;

export function iniciarModal({ onSalvar, onExcluir, getCartaoCfg }) {
  if (getCartaoCfg) obterCartaoCfg = getCartaoCfg;
  // popular categorias uma vez
  const sel = $('#in-categoria');
  for (const c of CATEGORIAS) sel.append(new Option(c, c));

  $('#seg-tipo').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (ctx && ctx.id) return; // não troca tipo em edição
    definirTipo(b.dataset.tipo);
  });
  $('#seg-forma').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    definirForma(b.dataset.forma);
  });
  $('#in-parcelas').addEventListener('input', atualizarHintParcela);
  $('#in-valor').addEventListener('input', atualizarHintParcela);
  $('#in-data').addEventListener('input', atualizarHintParcela);
  $('#modal-cancelar').addEventListener('click', fechar);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fechar(); });

  $('#modal-salvar').addEventListener('click', async () => {
    const dados = coletar();
    if (!dados) return;
    msg('');
    setSalvando(true);
    try {
      await onSalvar(ctx.tipo, ctx.id, dados);
      fechar();
    } catch (e) {
      msg(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  });

  $('#modal-excluir').addEventListener('click', async () => {
    if (!ctx.id) return;
    if (!confirm('Excluir este lançamento?')) return;
    try { await onExcluir(ctx.tipo, ctx.id); fechar(); }
    catch (e) { msg(e.message || 'Não foi possível excluir.'); }
  });

  ctx = { onSalvar, onExcluir };
}

export function abrirNovo(prefill = null) {
  ctx = { ...ctx, tipo: 'gasto', id: null };
  $('#modal-titulo').textContent = prefill ? 'Lançar vencimento' : 'Novo lançamento';
  $('#modal-excluir').classList.add('hidden');
  $('#seg-tipo').classList.remove('hidden');
  definirTipo('gasto');
  $('#in-conta').value = prefill?.conta || '';
  $('#in-valor').value = prefill?.valor != null ? String(prefill.valor).replace('.', ',') : '';
  $('#in-obs').value = '';
  $('#in-categoria').value = prefill?.categoria || 'COMPRAS';
  $('#in-data').value = prefill?.data || hoje();
  definirForma(prefill?.forma || 'debito');
  msg('');
  mostrar();
}

export function abrirEdicao(tipo, item) {
  ctx = { ...ctx, tipo, id: item.id };
  $('#modal-titulo').textContent = 'Editar lançamento';
  $('#modal-excluir').classList.remove('hidden');
  $('#seg-tipo').classList.add('hidden');
  definirTipo(tipo);
  $('#in-valor').value = String(centavosParaReais(item.valor) ?? '').replace('.', ',');
  $('#in-data').value = item.data || '';
  if (tipo === 'gasto') {
    $('#in-conta').value = item.conta || '';
    $('#in-categoria').value = item.categoria || 'COMPRAS';
    $('#in-obs').value = item.obs || '';
    definirForma(item.forma || 'debito');
  } else {
    $('#in-conta').value = item.tipo || '';
  }
  msg('');
  mostrar();
}

function definirTipo(tipo) {
  ctx.tipo = tipo;
  $('#seg-tipo').querySelectorAll('button').forEach((b) =>
    b.classList.toggle('on', b.dataset.tipo === tipo));
  const ehGasto = tipo === 'gasto';
  $('#campo-categoria').classList.toggle('hidden', !ehGasto);
  $('#campo-obs').classList.toggle('hidden', !ehGasto);
  $('#campo-forma').classList.toggle('hidden', !ehGasto);
  $('#label-conta').textContent = ehGasto ? 'Conta' : 'Tipo (ex.: SALÁRIO)';
}

function definirForma(forma) {
  formaAtual = forma;
  $('#seg-forma').querySelectorAll('button').forEach((b) =>
    b.classList.toggle('on', b.dataset.forma === forma));
  // parcelas só fazem sentido no crédito, e só em lançamento novo
  const ehCredito = forma === 'credito';
  const mostrarParcelas = ehCredito && !ctx.id;
  $('#campo-parcelas').classList.toggle('hidden', !mostrarParcelas);
  if (!mostrarParcelas) $('#in-parcelas').value = '1';
  // no crédito a data digitada é a da COMPRA
  const lblData = document.querySelector('label[for="in-data"]');
  if (lblData) lblData.textContent = ehCredito ? 'Data da compra' : 'Data';
  atualizarHintParcela();
}

function atualizarHintParcela() {
  const hint = $('#parcela-hint');
  if (!hint) return;
  // a dica de parcela/fatura só vale para crédito em lançamento novo
  if (formaAtual !== 'credito' || ctx.id) { hint.textContent = ''; return; }

  const n = Math.max(1, parseInt($('#in-parcelas').value, 10) || 1);
  const centavos = reaisParaCentavos($('#in-valor').value);
  const data = $('#in-data').value;
  const cfg = obterCartaoCfg() || {};
  const partes = [];

  // valor por parcela
  if (n > 1 && Number.isInteger(centavos) && centavos > 0) {
    const base = Math.floor(centavos / n);
    partes.push(`${n}x de aprox. ${(base / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  }
  // fatura de destino (auto-preenchimento informativo)
  if (cfg.fechamento && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const fech = faturaDaCompra(data, cfg.fechamento, cfg.excecoes || {});
    partes.push(`1ª na ${rotuloFatura(fech)}`);
  } else if (!cfg.fechamento) {
    partes.push('configure o fechamento do cartão na aba Cartão');
  }
  hint.textContent = partes.join(' · ');
}

function coletar() {
  const valorCentavos = reaisParaCentavos($('#in-valor').value);
  if (ctx.tipo === 'gasto') {
    return {
      valorCentavos,
      data: $('#in-data').value,
      conta: $('#in-conta').value,
      categoria: $('#in-categoria').value,
      forma: formaAtual,
      obs: $('#in-obs').value,
      // parcelas só para crédito em lançamento novo; senão 1
      parcelas: (formaAtual === 'credito' && !ctx.id)
        ? Math.max(1, parseInt($('#in-parcelas').value, 10) || 1) : 1
    };
  }
  return { tipo: $('#in-conta').value, valorCentavos, data: $('#in-data').value };
}

const mostrar = () => $('#modal').classList.remove('hidden');
const fechar = () => $('#modal').classList.add('hidden');
const msg = (t) => { $('#modal-msg').textContent = t; };
const setSalvando = (b) => {
  $('#modal-salvar').disabled = b;
  $('#modal-salvar').textContent = b ? 'Salvando…' : 'Salvar';
};
