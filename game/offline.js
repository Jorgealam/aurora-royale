'use strict';
(function(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  const status=document.createElement('p');status.id='offlineStatus';status.className='eyebrow';status.setAttribute('role','status');status.textContent='Preparando acesso offline…';
  (document.querySelector('#menu .hero')||document.querySelector('#menu')||document.body).append(status);
  navigator.serviceWorker.register('../sw.js',{scope:'../',updateViaCache:'none'}).then(async reg=>{
    const refresh=()=>{status.textContent=reg.waiting?'Atualização pronta: feche todas as abas do jogo e abra novamente.':navigator.serviceWorker.controller?'Disponível offline neste navegador':'Preparando acesso offline…';};
    navigator.serviceWorker.addEventListener('controllerchange',refresh);
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',refresh);});
    await navigator.serviceWorker.ready;refresh();
  }).catch(()=>{status.textContent='Cache offline indisponível. Conecte-se para abrir novamente.';});
})();
