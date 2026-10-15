'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=['index.html',...walk('game')].sort();
const hash=crypto.createHash('sha256');for(const file of files)hash.update(file).update(fs.readFileSync(path.join(root,file)));
const version=hash.digest('hex').slice(0,20);
const source=`'use strict';
const VERSION=${JSON.stringify(version)},FILES=${JSON.stringify(files)};
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
`;
fs.writeFileSync(path.join(root,'sw.js'),source);console.log('Cache offline '+version+': '+files.length+' arquivos');
