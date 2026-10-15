/* Controles compartilhados: não dependem de DOM, WebGL ou do tipo de aparelho. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuroraInput=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function stick(dx,dy,radius=52,deadzone=.12){
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return {x:0,y:0};
    const distance=Math.hypot(dx,dy),amount=Math.min(1,distance/radius);
    if(amount<=deadzone)return {x:0,y:0};
    const magnitude=(amount-deadzone)/(1-deadzone);
    return {x:dx/distance*magnitude||0,y:-dy/distance*magnitude||0};
  }
  function create(preference='auto',coarse=false){
    const move={x:0,y:0};let selected=['auto','pc','touch'].includes(preference)?preference:'auto';
    return {move,preference:()=>selected,isTouch:()=>selected==='touch'||selected==='auto'&&coarse,
      setMode(value){selected=['auto','pc','touch'].includes(value)?value:'auto';this.reset();},
      setStick(dx,dy,radius){Object.assign(move,stick(dx,dy,radius));return move;},
      reset(){move.x=move.y=0;},
      look(yaw,pitch,dx,dy,sensitivity=1,ads=false){if(![dx,dy,sensitivity].every(Number.isFinite))return {yaw,pitch};const scale=.0032*clamp(sensitivity,.3,2.5)*(ads?.55:1);return {yaw:yaw-clamp(dx,-160,160)*scale,pitch:clamp(pitch-clamp(dy,-160,160)*scale,-1.45,1.45)};},
      renderRatio(width,height,preset,dpr=1){const requested=Math.min(preset,Math.max(1,dpr));return this.isTouch()?Math.min(requested,1,Math.sqrt(900000/Math.max(1,width*height))):requested;}
    };
  }
  if(typeof window!=='undefined'){
    let preference='auto';try{preference=localStorage.getItem('aurora.controls')||'auto';}catch{}
    window.AuroraControls=create(preference,matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0);
    document.documentElement.dataset.controls=window.AuroraControls.isTouch()?'touch':'pc';
  }
  return {create,stick};
});
