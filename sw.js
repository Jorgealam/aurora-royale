'use strict';
const VERSION="0f5d4336aace34c6ef78",FILES=["game/core.js","game/dev.js","game/fx.js","game/game.js","game/index.html","game/island.js","game/offline.js","game/style.css","game/vendor/THREE-LICENSE.txt","game/vendor/three.min.js","game/world.js","index.html"];
const BASE=new URL('./',self.location.href),PREFIX='aurora-royale:'+BASE.pathname+':',CACHE=PREFIX+VERSION;
const assets=new Set(FILES.map(file=>new URL(file,BASE).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(FILES.map(file=>new Request(new URL(file,BASE),{cache:'reload'})));}
  catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  let key=new URL(url.pathname,url.origin).href;
  if(key===BASE.href)key=new URL('index.html',BASE).href;
  if(key===new URL('game/',BASE).href)key=new URL('game/index.html',BASE).href;
  if(!assets.has(key))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(key)||fetch(event.request);})());
});
