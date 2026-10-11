const CACHE='palavra-viva-static-v1';
const FILES=['./','./index.html','./style.css','./app.js','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/mensagens.json')){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)));
  }else if(event.request.method==='GET'){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});
