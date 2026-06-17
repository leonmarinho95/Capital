// Service worker — estratégia network-first para arquivos do app.
// Sempre tenta a versão mais recente da rede; cai no cache só offline.
// Assim, atualizações aparecem sem precisar limpar cache manualmente.
const CACHE = 'capital-v17';
const ASSETS = ['./','./index.html','./css/base.css','./css/app.css','./manifest.json',
 './js/app.js','./js/firebase.js','./js/config.js','./js/auth.js','./js/repository.js',
 './js/state.js','./js/selectors.js','./js/services.js','./js/validation.js',
 './js/money.js','./js/dates.js','./js/ui/dom.js','./js/ui/painel.js',
 './js/ui/listas.js','./js/ui/modal.js','./js/ui/anual.js','./js/selectors-anual.js','./js/ui/modal-fixo.js','./js/vencimentos.js','./js/cartao.js','./js/parcelas.js','./js/orcamento.js','./js/ui/orcamento.js','./js/metas.js','./js/ui/metas.js','./js/ui/cartao.js','./js/ui/treemap.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) =>
    Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  // Firebase/Google e fontes: sempre rede, nunca cache.
  if (url.includes('gstatic') || url.includes('firebase') ||
      url.includes('googleapis') || url.includes('fonts')) return;

  // App próprio: network-first (versão nova primeiro; cache é reserva offline).
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia).catch(() => {}));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
