(function(){
  'use strict';
  const A=globalThis.Aurora?.api,C=globalThis.AuroraControls;if(!A||!C)return;
  const $=id=>document.getElementById(id),input=A.input;
  const select=$('controlMode'),root=$('touchControls'),stick=$('touchStick'),knob=$('touchKnob'),more=$('touchMore');
  let stickId=null,lookId=null,lastX=0,lastY=0,lastScreen='',lastDev=false,fireId=null,fireX=0,fireY=0;
  const press=code=>{dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
  function clear(){
    stickId=lookId=fireId=null;C.reset();input.release();knob.style.transform='translate(0px,0px)';
    for(const b of root.querySelectorAll('[aria-pressed]'))b.setAttribute('aria-pressed','false');
    more.hidden=true;
  }
  function mode(event){
    clear();C.setMode(select.value);try{localStorage.setItem('aurora.controls',select.value);}catch{}
    document.documentElement.dataset.controls=C.isTouch()?'touch':'pc';
    if(document.pointerLockElement)document.exitPointerLock();
    if(event)A.applyQuality();
    $('controlHint').textContent=C.isTouch()?'Esquerda: mover · direita: arrastar para mirar. Segure TIRO e arraste para mirar enquanto atira.':'WASD mover · mouse mirar · clique para atirar.';
  }
  select.value=C.preference();select.addEventListener('change',mode);mode();
  const enabled=()=>C.isTouch()&&A.state.screen==='playing'&&!A.state.devOpen&&A.player.alive;
  const capture=(element,id)=>{try{element.setPointerCapture(id);}catch{}};
  stick.addEventListener('pointerdown',e=>{if(!enabled()||stickId!==null)return;e.preventDefault();stickId=e.pointerId;capture(stick,stickId);updateStick(e);});
  function updateStick(e){if(e.pointerId!==stickId)return;e.preventDefault();const r=stick.getBoundingClientRect(),radius=r.width*.36,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;C.setStick(dx,dy,radius);const len=Math.hypot(dx,dy)||1,scale=Math.min(1,radius/len);knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
  stick.addEventListener('pointermove',updateStick);
  const endStick=e=>{if(e.pointerId===stickId){stickId=null;C.reset();knob.style.transform='translate(0px,0px)';}};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,endStick);
  const canvas=$('c');
  canvas.addEventListener('pointerdown',e=>{if(!enabled()||e.pointerType==='mouse'||lookId!==null||e.clientX<innerWidth*.3)return;e.preventDefault();lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;capture(canvas,lookId);});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||!enabled())return;e.preventDefault();input.look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});
  const endLook=e=>{if(e.pointerId===lookId)lookId=null;};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endLook);
  const fire=$('touchFire');
  fire.addEventListener('pointerdown',e=>{if(!enabled()||fireId!==null)return;e.preventDefault();fireId=e.pointerId;fireX=e.clientX;fireY=e.clientY;capture(fire,fireId);input.fire(true);fire.setAttribute('aria-pressed','true');});
  fire.addEventListener('pointermove',e=>{if(e.pointerId!==fireId||!enabled())return;e.preventDefault();input.look(e.clientX-fireX,e.clientY-fireY);fireX=e.clientX;fireY=e.clientY;});
  const endFire=e=>{if(e.pointerId===fireId){fireId=null;input.fire(false);fire.setAttribute('aria-pressed','false');}};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(name,endFire);
  root.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{if(enabled())press(button.dataset.key);}));
  for(const [id,key] of [['touchSprint','ShiftLeft'],['touchCrouch','KeyC']])$(id).addEventListener('click',()=>{if(!enabled())return;const on=$(id).getAttribute('aria-pressed')!=='true';input.hold(key,on);$(id).setAttribute('aria-pressed',String(on));});
  $('touchAim').addEventListener('click',()=>{if(enabled())input.aim(!A.state.ads);});
  $('touchSwap').addEventListener('click',()=>{if(enabled())input.swap();});
  $('touchMoreButton').addEventListener('click',()=>{more.hidden=!more.hidden;});
  $('touchPause').addEventListener('click',()=>{if(enabled())A.pause();});
  $('touchFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{A.toast('Tela cheia indisponível neste navegador.');}});
  $('touchDev').addEventListener('click',()=>{more.hidden=true;globalThis.Aurora.toggleDev?.();});
  addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});addEventListener('resize',clear);
  // Atualização só dos controles (10 Hz); o motor mantém sua simulação original.
  setInterval(()=>{
    const screen=A.state.screen,dev=!!A.state.devOpen;
    if(screen!==lastScreen||dev!==lastDev){clear();lastScreen=screen;lastDev=dev;}
    root.hidden=!enabled();$('touchAim').setAttribute('aria-pressed',String(A.state.ads));
    $('touchInteract').hidden=!(A.state.nearest||A.state.nearZip&&!A.state.zip);
    $('touchReload').disabled=!!A.state.action||!A.player.weapon;
    $('touchHeal').textContent='CURAR '+A.player.medkits;$('touchArmor').textContent='PLACA '+A.player.plates;$('touchGrenade').textContent='GRANADA '+A.player.grenades;
    $('touchOrientation').hidden=!C.isTouch()||innerWidth>=innerHeight||screen!=='menu';
  },100);
})();
