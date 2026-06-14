// js/ui/modal.js — controla o modal de novo/editar lançamento.
// Não fala com o Firestore: delega ao app.js via callbacks (onSalvar/onExcluir).
import { $ } from './dom.js';
import { CATEGORIAS } from '../validation.js';
import { reaisParaCentavos, centavosParaReais } from '../money.js';
import { hoje } from '../dates.js';

let ctx = null; // {tipo, id|null, onSalvar, onExcluir}

export function iniciarModal({ onSalvar, onExcluir }) {
  // popular categorias uma vez
  const sel = $('#in-categoria');
  for (const c of CATEGORIAS) sel.append(new Option(c, c));

  $('#seg-tipo').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (ctx && ctx.id) return; // não troca tipo em edição
    definirTipo(b.dataset.tipo);
  });
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

export function abrirNovo() {
  ctx = { ...ctx, tipo: 'gasto', id: null };
  $('#modal-titulo').textContent = 'Novo lançamento';
  $('#modal-excluir').classList.add('hidden');
  $('#seg-tipo').classList.remove('hidden');
  definirTipo('gasto');
  $('#in-conta').value = ''; $('#in-valor').value = ''; $('#in-obs').value = '';
  $('#in-categoria').value = 'COMPRAS';
  $('#in-data').value = hoje();
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
  $('#label-conta').textContent = ehGasto ? 'Conta' : 'Tipo (ex.: SALÁRIO)';
}

function coletar() {
  const valorCentavos = reaisParaCentavos($('#in-valor').value);
  const base = {
    valorCentavos,
    data: $('#in-data').value,
    conta: $('#in-conta').value
  };
  if (ctx.tipo === 'gasto') {
    return {
      ...base,
      categoria: $('#in-categoria').value,
      obs: $('#in-obs').value
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
