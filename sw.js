// Cache only this application's static shell. IndexedDB data is not cached here.
const PREFIX='tcc-shell:'+self.registration.scope+':';
const CACHE=PREFIX+'v04';
const SHELL=['./','./index.html','./style.css','./icons.js','./main.js','./priority.js','./database/storage.js'].map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 const canonical=new URL(url.href);canonical.search='';canonical.hash='';
 if(e.request.mode==='navigate'&&SHELL.slice(0,2).includes(canonical.href)){
   e.respondWith(caches.open(CACHE).then(c=>c.match(SHELL[1])).then(r=>r||fetch(e.request)));return;
 }
 if(SHELL.includes(url.href))e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
});
