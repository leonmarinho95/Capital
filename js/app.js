// js/app.js — orquestrador. Liga auth → repositório → estado → telas.
import { $, $$ } from './ui/dom.js';
import { observarSessao, entrar, sair } from './auth.js';
import * as estado from './state.js';
import * as repo from './repository.js';
import { rotuloMes } from './dates.js';
import { salvarLancamento, excluirLancamento, salvarFixo, excluirFixo } from './services.js';
import { renderPainel } from './ui/painel.js';
import { renderGastos, renderGanhos, renderFixos } from './ui/listas.js';
import { renderAnual } from './ui/anual.js';
import { iniciarModal, abrirNovo, abrirEdicao } from './ui/modal.js';
import { iniciarModalFixo, abrirNovoFixo, abrirEdicaoFixo } from './ui/modal-fixo.js';
import { dataISOLocal } from './vencimentos.js';

let unsubscribers = []; // listeners do Firestore, limpos no logout
let abaAtiva = 'painel';

// ---------- AUTENTICAÇÃO ----------
$('#auth-entrar').addEventListener('click', tentarEntrar);
$('#auth-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') tentarEntrar(); });

async function tentarEntrar() {
  const msg = $('#auth-msg'); msg.textContent = '';
  const btn = $('#auth-entrar'); btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    await entrar($('#auth-email').value, $('#auth-senha').value);
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

$('#btn-sair').addEventListener('click', sair);

observarSessao((usuario) => {
  if (usuario) {
    $('#tela-auth').classList.add('hidden');
    $('#tela-app').classList.remove('hidden');
    estado.definirUid(usuario.uid);
    conectarDados(usuario.uid);
  } else {
    desconectarDados();
    estado.limpar();
    $('#tela-app').classList.add('hidden');
    $('#tela-auth').classList.remove('hidden');
    $('#auth-senha').value = '';
  }
});

// ---------- DADOS ----------
function conectarDados(uid) {
  desconectarDados();
  for (const nome of ['gastos', 'ganhos', 'fixos']) {
    const u = repo.escutar(uid, nome,
      (itens) => estado.definirColecao(nome, itens),
      (erro) => estado.definirErro(erro));
    unsubscribers.push(u);
  }
}

function desconectarDados() {
  unsubscribers.forEach((u) => { try { u(); } catch {} });
  unsubscribers = [];
}

// ---------- NAVEGAÇÃO ----------
$('#mes-ant').addEventListener('click', () => estado.navegarMes(-1));
$('#mes-prox').addEventListener('click', () => estado.navegarMes(1));

$$('.tab').forEach((b) => b.addEventListener('click', () => {
  abaAtiva = b.dataset.aba;
  $$('.tab').forEach((x) => x.classList.toggle('on', x === b));
  $$('.aba').forEach((s) => s.classList.add('hidden'));
  $(`#aba-${abaAtiva}`).classList.remove('hidden');
  renderizar();
}));

// ---------- MODAL ----------
iniciarModal({
  onSalvar: (tipo, id, dados) => salvarLancamento(estado.obter().uid, tipo, id, dados),
  onExcluir: (tipo, id) => excluirLancamento(estado.obter().uid, tipo, id)
});
iniciarModalFixo({
  onSalvar: (id, dados) => salvarFixo(estado.obter().uid, id, dados),
  onExcluir: (id) => excluirFixo(estado.obter().uid, id)
});

// O botão + abre o modal certo conforme a aba ativa.
$('#fab').addEventListener('click', () => {
  if (abaAtiva === 'fixos') abrirNovoFixo();
  else abrirNovo();
});

function aoEditar(tipo, id) {
  const e = estado.obter();
  const colecao = tipo === 'gasto' ? e.gastos : e.ganhos;
  const item = colecao.find((x) => x.id === id);
  if (item) abrirEdicao(tipo, item);
}

function aoEditarFixo(id) {
  const item = estado.obter().fixos.find((x) => x.id === id);
  if (item) abrirEdicaoFixo(item);
}

// "Lançar" de um vencimento: abre o modal de gasto pré-preenchido.
function aoLancarVencimento(v) {
  abrirNovo({
    conta: v.gasto,
    categoria: v.categoria || 'COMPRAS',
    valor: Number.isInteger(v.valor) ? (v.valor / 100) : null,
    data: dataISOLocal(v.dataVenc)
  });
}

// ---------- RENDER ----------
estado.assinar(renderizar);

function renderizar() {
  const e = estado.obter();
  $('#mes-rotulo').textContent = rotuloMes(e.mes);

  if (e.erro) {
    $(`#aba-${abaAtiva}`).innerHTML =
      '<div class="estado-vazio">Não foi possível carregar seus dados. Verifique a conexão.</div>';
    return;
  }

  if (abaAtiva === 'painel') renderPainel($('#aba-painel'), e, aoLancarVencimento);
  else if (abaAtiva === 'gastos') renderGastos($('#aba-gastos'), e, aoEditar);
  else if (abaAtiva === 'ganhos') renderGanhos($('#aba-ganhos'), e, aoEditar);
  else if (abaAtiva === 'fixos') renderFixos($('#aba-fixos'), e, aoEditarFixo, abrirNovoFixo);
  else if (abaAtiva === 'anual') renderAnual($('#aba-anual'), e);
}
