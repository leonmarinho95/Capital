// js/ui/modal-fixo.js — modal de criar/editar gasto fixo.
// Delega persistência ao app.js via callbacks. Não fala com Firestore.
import { $ } from './dom.js';
import { CATEGORIAS } from '../validation.js';
import { reaisParaCentavos, centavosParaReais } from '../money.js';

let ctx = null; // {id|null, onSalvar, onExcluir}

export function iniciarModalFixo({ onSalvar, onExcluir }) {
  const sel = $('#fx-categoria');
  for (const c of CATEGORIAS) sel.append(new Option(c, c));

  $('#fx-variavel').addEventListener('change', () => sincronizarValor());
  $('#modal-fixo-cancelar').addEventListener('click', fechar);
  $('#modal-fixo').addEventListener('click', (e) => { if (e.target.id === 'modal-fixo') fechar(); });

  $('#modal-fixo-salvar').addEventListener('click', async () => {
    const dados = coletar();
    if (!dados) return;
    msg('');
    setSalvando(true);
    try { await onSalvar(ctx.id, dados); fechar(); }
    catch (e) { msg(e.message || 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  });

  $('#modal-fixo-excluir').addEventListener('click', async () => {
    if (!ctx.id) return;
    if (!confirm('Excluir este gasto fixo?')) return;
    try { await onExcluir(ctx.id); fechar(); }
    catch (e) { msg(e.message || 'Não foi possível excluir.'); }
  });

  ctx = { onSalvar, onExcluir };
}

export function abrirNovoFixo() {
  ctx = { ...ctx, id: null };
  $('#modal-fixo-titulo').textContent = 'Novo gasto fixo';
  $('#modal-fixo-excluir').classList.add('hidden');
  $('#fx-gasto').value = '';
  $('#fx-categoria').value = 'MORADIA';
  $('#fx-vencimento').value = '';
  $('#fx-variavel').checked = false;
  $('#fx-valor').value = '';
  $('#fx-fatura').value = '';
  sincronizarValor();
  msg('');
  mostrar();
}

export function abrirEdicaoFixo(fixo) {
  ctx = { ...ctx, id: fixo.id };
  $('#modal-fixo-titulo').textContent = 'Editar gasto fixo';
  $('#modal-fixo-excluir').classList.remove('hidden');
  $('#fx-gasto').value = fixo.gasto || '';
  $('#fx-categoria').value = CATEGORIAS.includes(fixo.categoria) ? fixo.categoria : 'MORADIA';
  $('#fx-vencimento').value = fixo.vencimento ?? '';
  const variavel = !(typeof fixo.valor === 'number');
  $('#fx-variavel').checked = variavel;
  $('#fx-valor').value = variavel ? '' : String(centavosParaReais(fixo.valor) ?? '').replace('.', ',');
  $('#fx-fatura').value = fixo.fatura || '';
  sincronizarValor();
  msg('');
  mostrar();
}

function sincronizarValor() {
  const variavel = $('#fx-variavel').checked;
  $('#fx-campo-valor').classList.toggle('hidden', variavel);
}

function coletar() {
  const variavel = $('#fx-variavel').checked;
  return {
    gasto: $('#fx-gasto').value,
    categoria: $('#fx-categoria').value,
    vencimento: $('#fx-vencimento').value,
    valorCentavos: variavel ? null : reaisParaCentavos($('#fx-valor').value),
    fatura: $('#fx-fatura').value
  };
}

const mostrar = () => $('#modal-fixo').classList.remove('hidden');
const fechar = () => $('#modal-fixo').classList.add('hidden');
const msg = (t) => { $('#modal-fixo-msg').textContent = t; };
const setSalvando = (b) => {
  $('#modal-fixo-salvar').disabled = b;
  $('#modal-fixo-salvar').textContent = b ? 'Salvando…' : 'Salvar';
};
