// Monitor pemilik: halaman diambil dari internet dulu, kalau offline pakai salinan terakhir.
// Data Supabase tidak disimpan di sini (aplikasi menyimpan data terakhir sendiri).
const C='monitor-v1',F=['./','index.html','manifest.json','../logo-192.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('monitor-')&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.hostname.endsWith('.supabase.co'))return;
  e.respondWith(fetch(req,url.origin===self.location.origin?{cache:'no-cache'}:{}).then(res=>{
    if(res&&res.ok){const c=res.clone();caches.open(C).then(x=>x.put(req,c))}return res})
    .catch(()=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(r=>r||(req.mode==='navigate'?caches.match('./'):new Response('Offline',{status:503})))));
});
