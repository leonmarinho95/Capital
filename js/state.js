// js/state.js — fonte única de verdade do estado da aplicação.
// Guarda o mês selecionado e os dados em memória; notifica assinantes
// (as telas) quando algo muda, para re-renderizarem.
import { mesAtual, deslocarMes } from './dates.js';

const estado = {
  uid: null,
  mes: mesAtual(),
  gastos: [],
  ganhos: [],
  fixos: [],
  cartaoConfig: null,
  carregando: true,
  erro: null
};

const assinantes = new Set();

/** Registra um observador. Retorna função para cancelar. */
export function assinar(fn) {
  assinantes.add(fn);
  return () => assinantes.delete(fn);
}

function notificar() {
  for (const fn of assinantes) fn(estado);
}

export const obter = () => estado;

export function definirUid(uid) { estado.uid = uid; notificar(); }

export function definirColecao(nome, itens) {
  estado[nome] = itens;
  estado.carregando = false;
  notificar();
}

export function definirMes(novoMes) { estado.mes = novoMes; notificar(); }
export function navegarMes(delta) { estado.mes = deslocarMes(estado.mes, delta); notificar(); }

export function definirCartaoConfig(cfg) { estado.cartaoConfig = cfg; notificar(); }

export function definirErro(erro) { estado.erro = erro; notificar(); }

export function limpar() {
  estado.uid = null;
  estado.gastos = []; estado.ganhos = []; estado.fixos = [];
  estado.mes = mesAtual();
  estado.carregando = true;
  estado.erro = null;
  notificar();
}
