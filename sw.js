// Simpan file aplikasi agar kasir tetap jalan saat internet mati.
// Halaman dan file aplikasi: coba ambil versi terbaru dari internet (maks. 3 detik),
// kalau gagal atau lambat pakai salinan di tablet. Font: pakai salinan dulu.
const C='kasir-v24',F=['./','index.html','manifest.json','icon.svg','logo-192.png','logo-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const save=(req,res)=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(C).then(x=>x.put(req,c))}return res};
const fromCache=req=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(r=>r||(req.mode==='navigate'?caches.match('./'):undefined));
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(url.hostname.endsWith('script.google.com')||url.hostname==='wa.me')return; // data & WhatsApp selalu lewat internet
  if(url.hostname.includes('fonts.g')){ // fonts.googleapis.com / fonts.gstatic.com
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>save(req,res))));return}
  e.respondWith(new Promise(resolve=>{
    let done=false;const fallback=()=>fromCache(req).then(r=>{if(!done&&r){done=true;resolve(r)}});
    const t=setTimeout(fallback,3000);
    // file aplikasi selalu dicek ke server (abaikan cache browser), supaya pembaruan langsung terasa
    const same=url.origin===self.location.origin,net=same?fetch(req.mode==='navigate'?req.url:req,{cache:'no-cache',credentials:'same-origin'}):fetch(req);
    net.then(res=>{clearTimeout(t);save(req,res);if(!done){done=true;resolve(res)}})
      .catch(()=>{clearTimeout(t);fromCache(req).then(r=>{if(!done){done=true;resolve(r||new Response('Offline',{status:503,statusText:'Offline'}))}})});
  }));
});
