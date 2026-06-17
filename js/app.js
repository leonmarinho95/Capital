// js/app.js — orquestrador. Liga auth → repositório → estado → telas.
import { $, $$ } from './ui/dom.js';
import { observarSessao, entrar, sair } from './auth.js';
import * as estado from './state.js';
import * as repo from './repository.js';
import { rotuloMes } from './dates.js';
import { salvarLancamento, excluirLancamento, excluirCompra, salvarFixo, excluirFixo } from './services.js';
import { renderPainel } from './ui/painel.js';
import { renderGastos, renderGanhos, renderFixos } from './ui/listas.js';
import { renderCartao } from './ui/cartao.js';
import { renderOrcamento } from './ui/orcamento.js';
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
  // configuração do cartão (dia de fechamento)
  unsubscribers.push(
    repo.escutarConfig(uid, 'cartao', (cfg) => estado.definirCartaoConfig(cfg))
  );
  // orçamento por categoria
  unsubscribers.push(
    repo.escutarConfig(uid, 'orcamento', (orc) => estado.definirOrcamento(orc))
  );
  // metas de economia (guardadas como { lista: [...] })
  unsubscribers.push(
    repo.escutarConfig(uid, 'metas', (cfg) => estado.definirMetas(cfg && Array.isArray(cfg.lista) ? cfg.lista : []))
  );
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
  onSalvar: (tipo, id, dados) => salvarComParcelas(tipo, id, dados),
  onExcluir: (tipo, id) => excluirComEscolha(tipo, id),
  getCartaoCfg: () => estado.obter().cartaoConfig
});
iniciarModalFixo({
  onSalvar: (id, dados) => salvarFixo(estado.obter().uid, id, dados),
  onExcluir: (id) => excluirFixo(estado.obter().uid, id)
});

// O botão + abre o modal certo conforme a aba ativa.
$('#fab').addEventListener('click', () => {
  if (abaAtiva === 'fixos') abrirNovoFixo();
  else if (abaAtiva === 'cartao') aoNovoCredito();
  else abrirNovo();
});

function aoEditar(tipo, id) {
  const e = estado.obter();
  const colecao = tipo === 'gasto' ? e.gastos : e.ganhos;
  const item = colecao.find((x) => x.id === id);
  if (item) abrirEdicao(tipo, item);
}

// Salva edição; se for parcela de crédito movida de fatura, recoloca também
// as parcelas SEGUINTES, preservando o espaçamento de 1 mês entre elas.
async function salvarComParcelas(tipo, id, dados) {
  const uid = estado.obter().uid;
  const cfg = estado.obter().cartaoConfig;

  if (tipo === 'gasto' && id && dados.forma === 'credito' && dados.faturaMesEscolhida) {
    const item = estado.obter().gastos.find((x) => x.id === id);
    if (item && item.compraId && item.parcelasTotal > 1) {
      const origem = item.faturaMes || (item.data ? item.data.slice(0, 7) : null);
      const destino = dados.faturaMesEscolhida;
      if (origem && destino && origem !== destino) {
        const mover = confirm(
          'Mover também as parcelas seguintes?\n\n' +
          'OK = mover esta e as seguintes (mantendo 1 mês entre elas)\n' +
          'Cancelar = mover só esta parcela'
        );
        // salva a parcela atual na fatura escolhida
        await salvarLancamento(uid, tipo, id, dados, cfg);

        if (mover) {
          // recoloca cada parcela seguinte em destino + (posição relativa),
          // garantindo o espaçamento de 1 mês independentemente do estado salvo.
          const seguintes = estado.obter().gastos
            .filter((g) => g.compraId === item.compraId && g.parcela > item.parcela)
            .sort((a, b) => a.parcela - b.parcela);
          for (const g of seguintes) {
            const passos = g.parcela - item.parcela;          // 1, 2, 3...
            const novoFM = deslocarYM(destino, passos);        // destino + passos meses
            await salvarLancamento(uid, 'gasto', g.id, {
              valorCentavos: g.valor, data: g.data, conta: g.conta,
              categoria: g.categoria, forma: 'credito', obs: g.obs,
              faturaMesEscolhida: novoFM
            }, cfg);
          }
        }
        return;
      }
    }
  }
  return salvarLancamento(uid, tipo, id, dados, cfg);
}

function deslocarYM(ym, k) {
  const [a, m] = ym.split('-').map(Number);
  const t = (a * 12 + (m - 1)) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

// Exclusão que pergunta, para parcelas, se remove só esta ou a compra toda.
async function excluirComEscolha(tipo, id) {
  const uid = estado.obter().uid;
  if (tipo === 'gasto') {
    const item = estado.obter().gastos.find((x) => x.id === id);
    if (item && item.compraId && item.parcelasTotal > 1) {
      const todas = confirm(
        `Esta é a parcela ${item.parcela}/${item.parcelasTotal} de "${item.conta}".\n\n` +
        'OK = excluir a COMPRA INTEIRA (todas as parcelas)\n' +
        'Cancelar = excluir só esta parcela'
      );
      if (todas) return excluirCompra(uid, item.compraId);
      return excluirLancamento(uid, 'gasto', id);
    }
  }
  return excluirLancamento(uid, tipo, id);
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

// Lançar compra já com forma = crédito (a partir da aba Cartão).
function aoNovoCredito() {
  abrirNovo({ forma: 'credito' });
}

function aoSalvarCartaoConfig(dados) {
  return repo.salvarConfig(estado.obter().uid, 'cartao', dados);
}

// "Já lançado": marca o vencimento como resolvido no mês atual (volta mês que vem).
function aoResolverVencimento(fixoId) {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const resolvidos = { ...(estado.obter().cartaoConfig?.resolvidos || {}) };
  resolvidos[`${fixoId}:${mesAtual}`] = true;
  return repo.salvarConfig(estado.obter().uid, 'cartao', { resolvidos });
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

  if (abaAtiva === 'painel') renderPainel($('#aba-painel'), e, aoLancarVencimento, aoResolverVencimento);
  else if (abaAtiva === 'gastos') renderGastos($('#aba-gastos'), e, aoEditar);
  else if (abaAtiva === 'ganhos') renderGanhos($('#aba-ganhos'), e, aoEditar);
  else if (abaAtiva === 'fixos') renderFixos($('#aba-fixos'), e, aoEditarFixo, abrirNovoFixo);
  else if (abaAtiva === 'cartao') renderCartao($('#aba-cartao'), e, aoSalvarCartaoConfig, aoNovoCredito, aoEditar);
  else if (abaAtiva === 'orcamento') renderOrcamento($('#aba-orcamento'), e, aoSalvarOrcamento, aoSalvarMetas);
}

function aoSalvarOrcamento(novo) {
  return repo.salvarConfig(estado.obter().uid, 'orcamento', novo, false);
}

function aoSalvarMetas(lista) {
  return repo.salvarConfig(estado.obter().uid, 'metas', { lista }, false);
}
