/* Aurora Royale 2.0 · modo desenvolvedor (F1 ou tecla ').
   Painel dentro do jogo para controlar jogador, mundo, gráficos, IA, zona e depuração em tempo real. */
(function(){
  'use strict';
  if(!globalThis.Aurora?.api)return;
  const A=Aurora.api,$=id=>document.getElementById(id),panel=$('devPanel');
  const {state,player,dev,env,post,settings,C,Art}=A;
  const POST_DEFAULTS={...post.params};
  try{const saved=JSON.parse(localStorage.getItem('aurora.post')||'null');if(saved&&!new URLSearchParams(location.search).has('test'))Object.assign(post.params,saved);}catch{}
  let open=false,tab='player',statTimer=null;const graph=[];
  const save=()=>{A.saveDev();try{localStorage.setItem('aurora.post',JSON.stringify(post.params));}catch{}};
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};

  /* Construtores de controles */
  function toggle(label,obj,key,onChange,hint){const row=el('label','dv-row dv-toggle');const t=el('span','dv-label',label);const i=el('input');i.type='checkbox';i.checked=!!obj[key];i.addEventListener('change',()=>{obj[key]=i.checked;onChange?.(i.checked);save();});row.append(t,i,el('i','dv-switch'));if(hint)row.title=hint;return row;}
  function range(label,obj,key,min,max,step,onChange,fmt=v=>(+v).toFixed(step<1?(step<.01?3:2):0)){const row=el('div','dv-row dv-range');const head=el('div','dv-head');const t=el('span','dv-label',label),o=el('output','',fmt(obj[key]));head.append(t,o);const i=el('input');i.type='range';i.min=min;i.max=max;i.step=step;i.value=obj[key];i.addEventListener('input',()=>{obj[key]=Number(i.value);o.textContent=fmt(obj[key]);onChange?.(obj[key]);save();});row.append(head,i);row._sync=()=>{i.value=obj[key];o.textContent=fmt(obj[key]);};return row;}
  function select(label,obj,key,options,onChange){const row=el('label','dv-row dv-select');const t=el('span','dv-label',label);const s=el('select');for(const [v,n] of options){const o=el('option','',n);o.value=v;s.append(o);}s.value=String(obj[key]);s.addEventListener('change',()=>{const num=typeof obj[key]==='number';obj[key]=num?Number(s.value):s.value;onChange?.(obj[key]);save();});row.append(t,s);return row;}
  function button(label,fn,cls=''){const b=el('button','dv-btn '+cls,label);b.addEventListener('click',()=>{fn();});return b;}
  function buttons(...list){const row=el('div','dv-buttons');row.append(...list);return row;}
  function section(title){return el('h4','dv-section',title);}
  function note(text){return el('p','dv-note',text);}
  function live(fn){const p=el('pre','dv-live');p._live=fn;p.textContent=fn();return p;}

  const playing=()=>state.screen==='playing';
  const needMatch=fn=>()=>{if(!playing()){A.toast?.('Inicie uma partida primeiro.');flash('Inicie uma partida primeiro.');return;}fn();};
  function flash(msg){const n=panel.querySelector('.dv-flash');if(n){n.textContent=msg;n.classList.add('on');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('on'),1800);}}

  const TABS={
    player:['Jogador',()=>[
      section('Trapaças'),
      toggle('Modo Deus (não recebe dano)',dev,'godMode'),toggle('Munição infinita',dev,'infiniteAmmo'),toggle('Recarga instantânea',dev,'noReload'),toggle('Um tiro elimina',dev,'oneShot'),toggle('Voar / atravessar paredes (noclip)',dev,'noclip',v=>flash(v?'Espaço sobe · C/Ctrl desce':'Noclip desligado')),
      section('Movimento'),range('Velocidade',dev,'speedMul',.5,4,.1),range('Altura do pulo',dev,'jumpMul',.5,4,.1),
      section('Equipamento'),buttons(button('Curar tudo + munição máxima',needMatch(()=>{A.healFull();flash('Vida, armadura, kits e munição no máximo.');}),'primary')),
      (()=>{const wrap=el('div','dv-row dv-select');const s=el('select');for(const w of C.WEAPONS){const o=el('option','',`${w.name} · ${Art.RARITY_INFO[Art.RARITY[w.id]].name}`);o.value=w.id;s.append(o);}const b=button('Equipar',needMatch(()=>{A.giveWeapon(s.value);flash('Arma equipada no espaço ativo.');}));wrap.append(el('span','dv-label','Arma'),s,b);return wrap;})(),
      section('Teletransporte'),buttons(...C.REGIONS.map(r=>button(r.name,needMatch(()=>{A.teleport(r.x+6,r.z+6);flash('Teletransportado: '+r.name);})))),buttons(button('Ir até onde estou mirando',needMatch(()=>{const p=A.crosshairPoint();A.teleport(p.x,p.z);})))]],
    world:['Mundo',()=>[
      section('Hora do dia'),(()=>{const r=range('Hora',env,'hours',0,23.99,.05,()=>{},v=>{const h=Math.floor(v),m=Math.floor((v-h)*60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;});r.dataset.sync='hours';return r;})(),
      buttons(button('Amanhecer',()=>setHour(6.2)),button('Manhã',()=>setHour(9)),button('Meio-dia',()=>setHour(12.5)),button('Pôr do sol',()=>setHour(17.9)),button('Noite',()=>setHour(21)),button('Madrugada',()=>setHour(2))),
      toggle('Ciclo dia/noite automático',env,'auto'),range('Velocidade do ciclo (×)',env,'speed',0,60,1),
      section('Clima'),select('Clima',env,'weather',[['clear','Céu limpo'],['cloudy','Nublado'],['rain','Chuva'],['storm','Tempestade com raios'],['fog','Neblina densa']],()=>{env.autoWeather=false;}),toggle('Clima aleatório por partida',env,'autoWeather'),range('Força do vento (×)',env,'windMul',0,4,.1),
      section('Tempo'),range('Velocidade do tempo (câmera lenta)',dev,'timeScale',.05,3,.05),buttons(button('Normal',()=>{dev.timeScale=1;save();render();}),button('Câmera lenta 0,25×',()=>{dev.timeScale=.25;save();render();})),
      section('Diversão'),buttons(button('Explosão onde estou mirando',needMatch(()=>A.explode(A.crosshairPoint(),player)),'warn'))]],
    graphics:['Gráficos',()=>[
      section('Predefinições'),select('Qualidade',settings,'quality',[['low','Baixa'],['medium','Média'],['high','Alta'],['ultra','Ultra']],()=>{try{localStorage.setItem('aurora.settings',JSON.stringify(settings));}catch{}A.applyQuality();const q=document.getElementById('quality');if(q)q.value=settings.quality;render();}),
      buttons(button('Padrão',()=>look({})),button('Cinemático',()=>look({bloomStrength:.9,exposure:1.1,contrast:1.12,saturation:1.18,temperature:.12,vignette:.5,grain:.045,chromatic:.0022,godrayStrength:.9})),button('Competitivo',()=>look({bloomStrength:.25,vignette:.1,grain:0,chromatic:0,sharpen:.45,saturation:1.15,contrast:1.04})),button('Noir',()=>look({saturation:0,contrast:1.35,vignette:.6,grain:.08,temperature:0})),button('Verão',()=>look({temperature:.35,saturation:1.3,exposure:1.15,bloomStrength:.8})),button('Inverno',()=>look({temperature:-.45,saturation:.75,exposure:1.15,lift:.04}))),
      section('Pós-processamento HDR'),toggle('Pós-processamento ativo',post,'enabled',v=>{document.getElementById('vignette').classList.toggle('hidden',v);}),toggle('Bloom (brilho)',post.params,'bloom'),range('Intensidade do bloom',post.params,'bloomStrength',0,2.5,.05),range('Limiar do bloom',post.params,'bloomThreshold',.2,3,.05),range('Raio do bloom',post.params,'bloomRadius',.3,1.2,.05),
      toggle('Raios de sol (god rays)',post,'godrays'),range('Intensidade dos raios',post.params,'godrayStrength',0,2.5,.05),
      select('Antisserrilhado (MSAA)',post,'msaa',[[0,'Desligado'],[2,'2×'],[4,'4×'],[8,'8×']],()=>{post.width=0;post.setSize(innerWidth,innerHeight,A.renderer.getPixelRatio());}),
      section('Cor e câmera'),range('Exposição',post.params,'exposure',.3,2.5,.01),range('Contraste',post.params,'contrast',.6,1.6,.01),range('Saturação',post.params,'saturation',0,2,.01),range('Temperatura (frio ↔ quente)',post.params,'temperature',-1,1,.01),range('Clarear sombras',post.params,'lift',0,.25,.005),range('Vinheta',post.params,'vignette',0,1,.01),range('Granulação de filme',post.params,'grain',0,.15,.005),range('Aberração cromática',post.params,'chromatic',0,.012,.0005),range('Nitidez',post.params,'sharpen',0,1,.01),
      section('Mira e combate'),select('Estilo da mira',dev,'crosshair',[['dynamic','Cruz dinâmica'],['cross','Cruz fixa'],['dot','Ponto'],['circle','Círculo'],['tee','T']]),select('Cor da mira',dev,'crosshairColor',[['#f4f1dc','Branco'],['#5cff8a','Verde'],['#ff4a4a','Vermelho'],['#4ae8ff','Ciano'],['#ffd23a','Amarelo'],['#ff5cf0','Magenta']]),
      toggle('Desfoque nas bordas ao mirar',dev,'adsBlur'),toggle('Balanço da luneta (respiração)',dev,'scopeSway'),toggle('Câmera lenta em tiro na cabeça',dev,'headshotSlowmo'),
      range('Campo de visão (FOV)',dev,'fov',50,115,1),range('Tremor de câmera',dev,'shake',0,2.5,.1),
      section('Cena'),range('Densidade da grama (×)',dev,'grassMul',0,2,.05,v=>A.world.grass.setDensity(A.PRESETS[settings.quality].grassN*v)),(()=>{const o={v:A.renderer.getPixelRatio()};return range('Escala de renderização',o,'v',.4,2,.05,v=>A.setRenderScale(v));})(),
      toggle('Partículas e fumaça',dev,'particles',v=>{if(!v){A.smoke.clear();A.sparks.clear();A.debris.clear();}}),toggle('Traçantes de bala',dev,'tracers'),toggle('Números de dano',dev,'damageNumbers'),toggle('Wireframe (malha)',dev,'wireframe',()=>A.applyWireframe()),
      buttons(button('Restaurar cores padrão',()=>look({}),'warn'))]],
    ai:['IA',()=>[
      section('Comportamento'),toggle('Congelar bots',dev,'aiFreeze'),toggle('Bots ignoram você',dev,'aiIgnorePlayer'),toggle('Bots não atiram',dev,'aiNoShoot'),toggle('Mostrar estado, rotas e alvos',dev,'showAI'),
      range('Precisão dos bots (×)',dev,'aiAccuracy',.2,3,.05),range('Tempo de reação (×)',dev,'aiReaction',.2,3,.05),select('Dificuldade',settings,'difficulty',[['easy','Recruta'],['normal','Soldado'],['hard','Veterano']],()=>{try{localStorage.setItem('aurora.settings',JSON.stringify(settings));}catch{}const d=document.getElementById('difficulty');if(d)d.value=settings.difficulty;}),
      section('Ações'),buttons(button('Criar bot na mira',needMatch(()=>A.spawnBot()),'primary'),button('Eliminar todos',needMatch(()=>A.killAllBots()),'warn'),button('Reviver todos',needMatch(()=>A.reviveBots()))),
      section('Situação'),live(()=>{const bots=state.actors.filter(a=>!a.isPlayer);const alive=bots.filter(a=>a.alive);const by={};for(const a of alive)by[a.state]=(by[a.state]||0)+1;return `Bots vivos: ${alive.length}/${bots.length}\n`+Object.entries(by).map(([k,v])=>`  ${k.padEnd(12)} ${v}`).join('\n')+`\nRuídos recentes: ${state.noises.filter(n=>state.time-n.t<2.5).length}`;}),
      note('Estados: patrol (patrulha), investigate (ouviu tiros), engage (combate), cover (cobertura), flank (flanqueando), search (procurando), zone (fugindo da zona), loot (pegando item), heal (curando).')]],
    zone:['Zona',()=>[
      toggle('Pausar zona',dev,'zonePause'),toggle('Zona não causa dano',dev,'zoneNoDamage'),
      buttons(button('Avançar fase',needMatch(()=>{state.zone.timer=.01;})),button('Centralizar em mim',needMatch(()=>{const z=state.zone;z.center={x:player.pos.x,z:player.pos.z};z.target={x:player.pos.x,z:player.pos.z,r:z.target.r};z.from={x:player.pos.x,z:player.pos.z,r:z.radius};})),button('Fechar quase tudo',needMatch(()=>{const z=state.zone;z.radius=Math.min(z.radius,25);z.target.r=Math.min(z.target.r,25);}),'warn')),
      live(()=>{const z=state.zone;return `Fase ${z.phase+1} · ${z.state==='shrink'?'fechando':'aguardando'}\nRaio ${z.radius.toFixed(1)} m → ${z.target.r.toFixed(1)} m\nTempo ${Math.ceil(z.timer)} s · dano ${z.damage.toFixed(1)}/s`;})]],
    debug:['Debug',()=>[
      section('Desempenho'),(()=>{const c=el('canvas','dv-graph');c.width=300;c.height=70;c.dataset.graph='1';return c;})(),
      live(()=>{const r=A.renderer.info,s=state.frameSamples.slice(-60),avg=s.reduce((a,b)=>a+b,0)/(s.length||1),p=player.pos;return `${(1000/(avg||16.7)).toFixed(0)} FPS · ${avg.toFixed(1)} ms/quadro\n${r.render.calls} draw calls · ${r.render.triangles.toLocaleString('pt-BR')} triângulos\n${r.memory.geometries} geometrias · ${r.memory.textures} texturas\nProjéteis ${state.activeBullets}/192 · partículas ${A.smoke.list.length+A.sparks.list.length+A.debris.list.length}\nPosição ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}\nSimulação ${state.steps} passos · tempo ${state.time.toFixed(1)} s`;}),
      section('Visualização'),toggle('Contador de FPS no canto',dev,'showFPS'),toggle('Mostrar colisores',dev,'showColliders'),toggle('Câmera livre (WASD, Espaço, C)',dev,'freeCam',v=>{if(v){A.freeCam.pos.copy(A.camera.position);A.freeCam.yaw=player.yaw;A.freeCam.pitch=player.pitch;}}),toggle('Esconder HUD (modo foto)',dev,'hideHUD',v=>{if(state.screen==='playing')document.getElementById('hud').classList.toggle('hidden',v);}),
      buttons(button('Capturar tela (PNG)',()=>{A.screenshot();flash('Imagem salva na pasta de downloads.');},'primary'),button('Copiar posição',()=>{const p=player.pos;navigator.clipboard?.writeText(`${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`);flash('Posição copiada.');})),
      buttons(button('Restaurar todas as opções do desenvolvedor',()=>{Object.assign(dev,A.DEV_DEFAULTS);Object.assign(post.params,POST_DEFAULTS);A.applyQuality();A.applyWireframe();save();render();flash('Opções restauradas.');},'warn')),
      note('Atalhos: F1 abre/fecha este painel · F3 estatísticas rápidas · clique no jogo para voltar a controlar a câmera com o painel aberto.')]]
  };
  function setHour(h){env.hours=h;env.auto=false;save();render();}
  function look(p){Object.assign(post.params,POST_DEFAULTS,p);save();render();flash('Visual aplicado.');}
  function render(){panel.replaceChildren();const head=el('div','dv-top');head.append(el('div','dv-title','MODO DESENVOLVEDOR'),button('×',toggle_,'dv-close'));const tabs=el('nav','dv-tabs');for(const [k,[name]] of Object.entries(TABS)){const b=button(name,()=>{tab=k;render();},k===tab?'on':'');tabs.append(b);}const body=el('div','dv-body');body.append(...TABS[tab][1]());panel.append(head,tabs,body,el('div','dv-flash'));}
  function refresh(){if(!open)return;for(const p of panel.querySelectorAll('.dv-live'))p.textContent=p._live();for(const r of panel.querySelectorAll('[data-sync]'))r._sync?.();const c=panel.querySelector('[data-graph]');if(c){const ctx=c.getContext('2d'),s=state.frameSamples.slice(-150);ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#ffffff22';for(const ms of [16.7,33.3]){const y=c.height-ms/50*c.height;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}ctx.strokeStyle='#7fe8c0';ctx.lineWidth=1.5;ctx.beginPath();s.forEach((ms,i)=>{const x=i/150*c.width,y=c.height-Math.min(50,ms)/50*c.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.fillStyle='#a8b8b0';ctx.font='10px Consolas';ctx.fillText('16,7 ms (60 FPS)',4,c.height-16.7/50*c.height-3);}}
  function toggle_(){open=!open;panel.classList.toggle('hidden',!open);state.devOpen=open;if(open){if(document.pointerLockElement)document.exitPointerLock();render();clearInterval(statTimer);statTimer=setInterval(refresh,250);}else{clearInterval(statTimer);if(state.screen==='playing')A.toast?.('Clique na tela para voltar ao combate.');}}
  Aurora.toggleDev=toggle_;
  $('devButton')?.addEventListener('click',toggle_);
  panel.addEventListener('mousedown',e=>e.stopPropagation());
})();
