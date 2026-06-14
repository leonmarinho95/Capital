const CACHE='capital-v2';
const ASSETS=['./','./index.html','./css/base.css','./css/app.css','./manifest.json',
 './js/app.js','./js/firebase.js','./js/config.js','./js/auth.js','./js/repository.js',
 './js/state.js','./js/selectors.js','./js/services.js','./js/validation.js',
 './js/money.js','./js/dates.js','./js/ui/dom.js','./js/ui/painel.js',
 './js/ui/listas.js','./js/ui/modal.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=e.request.url;
  if(u.includes('gstatic')||u.includes('firebase')||u.includes('googleapis')||u.includes('fonts'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
