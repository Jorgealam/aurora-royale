/* Simulation primitives adapted from battle-royale-base.html. No rendering dependency. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  const WEAPONS = [
    {id:'p9',name:'P9 Sentinel',type:'Pistola',ammo:'9mm',damage:24,rate:3.8,mag:15,reload:1.3,speed:220,spread:.017,recoil:.022,range:100,auto:false,color:0x81959a,shape:'pistol'},
    {id:'r44',name:'R44 Ironclad',type:'Revólver',ammo:'.44',damage:57,rate:1.65,mag:6,reload:2.4,speed:270,spread:.012,recoil:.066,range:140,auto:false,color:0xbda078,shape:'revolver'},
    {id:'v9',name:'V9 Vector',type:'Submetralhadora',ammo:'9mm',damage:17,rate:13,mag:30,reload:1.7,speed:245,spread:.026,recoil:.016,range:85,auto:true,color:0x798e6b,shape:'smg'},
    {id:'k45',name:'K45 Specter',type:'Submetralhadora',ammo:'.45',damage:25,rate:8,mag:25,reload:1.8,speed:250,spread:.022,recoil:.023,range:100,auto:true,color:0x777e89,shape:'smg'},
    {id:'ar5',name:'AR5 Ranger',type:'Fuzil',ammo:'5.56',damage:29,rate:9,mag:30,reload:2.1,speed:340,spread:.016,recoil:.027,range:190,auto:true,color:0xb2a078,shape:'rifle'},
    {id:'ak7',name:'AK7 Kodiak',type:'Fuzil',ammo:'7.62',damage:37,rate:7.5,mag:30,reload:2.5,speed:320,spread:.02,recoil:.043,range:195,auto:true,color:0x98664b,shape:'ak'},
    {id:'b5',name:'B5 Halcyon',type:'Fuzil bullpup',ammo:'5.56',damage:31,rate:8,mag:30,reload:2.3,speed:360,spread:.012,recoil:.024,range:210,auto:true,color:0x5d796c,shape:'bullpup'},
    {id:'s12',name:'S12 Breacher',type:'Escopeta',ammo:'12g',damage:15,pellets:8,rate:1.05,mag:6,reload:2.7,speed:180,spread:.065,recoil:.095,range:48,auto:false,color:0x7e887e,shape:'shotgun'},
    {id:'as12',name:'AS12 Cyclone',type:'Escopeta automática',ammo:'12g',damage:11,pellets:7,rate:2.8,mag:10,reload:3,speed:190,spread:.078,recoil:.072,range:42,auto:true,color:0x9b806b,shape:'autoshot'},
    {id:'d7',name:'D7 Longbow',type:'DMR',ammo:'7.62',damage:62,rate:2.4,mag:12,reload:2.5,speed:410,spread:.007,recoil:.049,range:265,auto:false,scope:2,color:0x77908b,shape:'dmr'},
    {id:'s338',name:'S338 Horizon',type:'Precisão',ammo:'.338',damage:92,rate:.75,mag:5,reload:3.4,speed:460,spread:.003,recoil:.11,range:340,auto:false,scope:4,color:0xbaa98b,shape:'sniper'},
    {id:'m5',name:'M5 Bastion',type:'Metralhadora',ammo:'5.56',damage:27,rate:10,mag:75,reload:4.3,speed:330,spread:.027,recoil:.035,range:185,auto:true,color:0x7b8472,shape:'lmg'}
  ];
  const AMMO = ['9mm','.44','.45','5.56','7.62','12g','.338'];
  const REGIONS = [
    {name:'Bosque Norte',x:-118,z:-120,color:'#58866c'}, {name:'Observatório',x:0,z:-132,color:'#acb3aa'},
    {name:'Pedreira',x:125,z:-118,color:'#ad957b'}, {name:'Vila Aurora',x:-112,z:0,color:'#cda77a'},
    {name:'Encruzilhada',x:0,z:0,color:'#7f9485'}, {name:'Complexo Industrial',x:117,z:0,color:'#719bab'},
    {name:'Porto Seco',x:-117,z:120,color:'#8ea7a7'}, {name:'Fazenda',x:0,z:125,color:'#a5ad67'},
    {name:'Lago Azul',x:125,z:125,color:'#62a8b6'}
  ];
  // Mapas: "aurora" (continente original) e "island" (Ilha do Medo, ilha-presídio cercada por mar raso).
  const AURORA_REGIONS=REGIONS.slice();
  const ISLAND={id:'island',water:-.45,bounds:146,zoneScale:.56,
    pads:[[0,0,44,6.5],[-62,-45,34,3],[-6,-88,24,6.5],[52,-52,22,4.5],[78,4,28,2],[62,62,32,1],[12,70,22,1.6],[-48,58,28,.9],[-80,4,22,3.2]],
    regions:[{name:'Farol',x:-6,z:-88,color:'#f2d24a'},{name:'Centro de Controle',x:52,z:-52,color:'#4ad8f2'},{name:'Bairro Residencial',x:-62,z:-45,color:'#ff7a5c'},{name:'Presídio',x:0,z:0,color:'#ff9a2a'},{name:'Zona de Processamento',x:78,z:4,color:'#b46cff'},{name:'Quartel-General',x:-80,z:4,color:'#6fd36a'},{name:'Estação de Tratamento',x:-48,z:58,color:'#2ae0c0'},{name:'Casa das Caldeiras',x:12,z:70,color:'#ff4a6a'},{name:'Porto',x:62,z:62,color:'#4aa8ff'}]};
  const MAPS={aurora:{id:'aurora',water:-1.3,bounds:188,zoneScale:1},island:ISLAND};
  const MAP={...MAPS.aurora};
  function islandHeight(x,z){const a=Math.atan2(z,x);const r=Math.hypot(x/118,z/100)*(1+.07*Math.sin(a*3+1.3)+.05*Math.sin(a*5+.4)+.03*Math.sin(a*9+2.1));let t=clamp((1-r)/.16,0,1);const l=t*t*(3-2*t);let h=-1.5+l*(3.3+1.4*Math.sin(x*.045)*Math.cos(z*.04)+.7*Math.sin(x*.11+z*.07))-clamp((r-1.5)/.6,0,1)*4.5;for(const p of ISLAND.pads){const d=Math.hypot(x-p[0],z-p[1]);let k=clamp((p[2]-d)/(p[2]*.4),0,1);k=k*k*(3-2*k);h+=(p[3]-h)*k;}return h;}
  function setMap(id){const m=MAPS[id]||MAPS.aurora;Object.keys(MAP).forEach(k=>delete MAP[k]);Object.assign(MAP,m);REGIONS.length=0;REGIONS.push(...(m.regions||AURORA_REGIONS));return MAP;}
  function heightAt(x,z){return MAP.id==='island'?islandHeight(x,z):auroraHeight(x,z);}
  function auroraHeight(x,z) {
    const hills = 2.5*Math.sin(x*.018)*Math.cos(z*.022)+1.25*Math.sin(z*.044+x*.01);
    const peak=10*Math.exp(-((x*x+(z+137)**2)/1750));
    const lake=-4*Math.exp(-(((x-130)**2+(z-130)**2)/2000));
    const roads=clamp(Math.min(Math.abs(x),Math.abs(z))/17,0,1);
    return (hills+peak+lake)*roads;
  }
  // Slab intersection for swept bullets and line of sight; returns fraction in [0,1].
  function segmentBox(a,b,box,pad=0) {
    let lo=0,hi=1;
    for(const k of ['x','y','z']) { const d=b[k]-a[k],mn=box.min[k]-pad,mx=box.max[k]+pad;
      if(Math.abs(d)<1e-9){if(a[k]<mn||a[k]>mx)return null;}
      else {let t1=(mn-a[k])/d,t2=(mx-a[k])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}
    } return lo;
  }
  class SpatialHash {
    constructor(cell=12){this.cell=cell;this.map=new Map();this.all=[];}
    insert(box){this.all.push(box);for(let x=Math.floor(box.min.x/this.cell);x<=Math.floor(box.max.x/this.cell);x++)for(let z=Math.floor(box.min.z/this.cell);z<=Math.floor(box.max.z/this.cell);z++){let k=x+','+z;if(!this.map.has(k))this.map.set(k,[]);this.map.get(k).push(box);}}
    query(x,z,r=1){const found=new Set();for(let a=Math.floor((x-r)/this.cell);a<=Math.floor((x+r)/this.cell);a++)for(let b=Math.floor((z-r)/this.cell);b<=Math.floor((z+r)/this.cell);b++)for(const v of this.map.get(a+','+b)||[])found.add(v);return [...found];}
    segment(a,b){const found=new Set();const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/this.cell*2)+1;for(let i=0;i<=n;i++)for(const v of this.query(mix(a.x,b.x,i/n),mix(a.z,b.z,i/n),1))found.add(v);return [...found];}
  }
  function collidesAt(hash,x,y,z,r=.38,h=1.75) {
    return hash.query(x,z,r).some(b=>x+r>b.min.x&&x-r<b.max.x&&z+r>b.min.z&&z-r<b.max.z&&y+h>b.min.y+.02&&y+.12<b.max.y);
  }
  function moveActor(a,dx,dz,dt,hash,terrain=heightAt,jump=false,crouch=false) {
    const h=crouch?1.05:1.75,r=.38,oldY=a.pos.y;
    const test=(x,z)=>{const ground=terrain(x,z); if(a.onGround&&ground-a.pos.y>.48)return false;
      let y=a.pos.y;if(a.onGround)y=Math.max(y,ground);
      const candidates=hash.query(x,z,r);
      for(const b of candidates){if(x+r>b.min.x&&x-r<b.max.x&&z+r>b.min.z&&z-r<b.max.z&&y+h>b.min.y+.02&&y+.12<b.max.y){if(a.onGround&&b.max.y-y<=.42)y=b.max.y;else return false;}}
      a.pos.y=y;return true;};
    if(test(a.pos.x+dx,a.pos.z))a.pos.x+=dx;else a.vel.x=0;
    if(test(a.pos.x,a.pos.z+dz))a.pos.z+=dz;else a.vel.z=0;
    a.pos.x=clamp(a.pos.x,-MAP.bounds,MAP.bounds);a.pos.z=clamp(a.pos.z,-MAP.bounds,MAP.bounds);
    if(jump&&a.onGround){a.vel.y=8.2;a.onGround=false;}
    a.vel.y-=22*dt;const proposed=a.pos.y+a.vel.y*dt;let floor=terrain(a.pos.x,a.pos.z);
    for(const b of hash.query(a.pos.x,a.pos.z,r)){
      if(a.pos.x+r>b.min.x&&a.pos.x-r<b.max.x&&a.pos.z+r>b.min.z&&a.pos.z-r<b.max.z){
        if(a.vel.y<=0&&a.pos.y>=b.max.y-.06)floor=Math.max(floor,b.max.y);
        if(a.vel.y>0&&a.pos.y+h<=b.min.y+.04&&proposed+h>=b.min.y){a.vel.y=0;a.pos.y=b.min.y-h;}
      }
    }
    let fall=0;
    if(a.vel.y<=0&&proposed<=floor){if(!a.onGround&&a.vel.y<-13)fall=Math.max(0,(-a.vel.y-13)*4);a.pos.y=floor;a.vel.y=0;a.onGround=true;}
    else{a.pos.y+=a.vel.y*dt;a.onGround=false;}
    return fall;
  }
  class Zone {
    constructor(random=rng(23)){this.random=random;this.scale=MAP.zoneScale||1;const R=265*this.scale;this.center={x:0,z:0};this.radius=R;this.phase=0;this.state='wait';this.timer=35;this.from={x:0,z:0,r:R};this.target={x:0,z:0,r:R};this.duration=32;}
    update(dt){this.timer-=dt;while(this.timer<=0){if(this.state==='wait'){this.state='shrink';this.phase++;const r=[190,133,88,54,29,12,0][Math.min(this.phase-1,6)]*this.scale;const angle=this.random()*Math.PI*2;const dist=this.random()*Math.max(0,this.radius-r)*.65;this.from={...this.center,r:this.radius};this.target={x:this.center.x+Math.cos(angle)*dist,z:this.center.z+Math.sin(angle)*dist,r};this.duration=this.phase>=6?20:32;this.timer+=this.duration;}else{this.center={x:this.target.x,z:this.target.z};this.radius=this.target.r;this.state='wait';this.timer+=this.radius===0?86400:22;}}
      if(this.state==='shrink'){const t=clamp(1-this.timer/this.duration,0,1);this.center.x=mix(this.from.x,this.target.x,t);this.center.z=mix(this.from.z,this.target.z,t);this.radius=mix(this.from.r,this.target.r,t);}}
    outside(p){return Math.hypot(p.x-this.center.x,p.z-this.center.z)>this.radius;}
    get damage(){return 3+this.phase*1.9;}
  }
  function damageActor(actor,amount,head=false,zone=false){if(!actor.alive)return 0;const dmg=amount*(head?2:1);const absorbed=zone?0:Math.min(actor.armor||0,dmg*.65);actor.armor=Math.max(0,(actor.armor||0)-absorbed);const hpDmg=dmg-absorbed;actor.hp=Math.max(0,actor.hp-hpDmg);if(actor.hp===0)actor.alive=false;return hpDmg;}
  function makeWeapon(id){const def=WEAPONS.find(w=>w.id===id);if(!def)throw Error('Unknown weapon '+id);return {def,mag:def.mag};}
  function reloadWeapon(w,reserves){const need=w.def.mag-w.mag,available=reserves[w.def.ammo]||0,take=Math.min(need,available);w.mag+=take;reserves[w.def.ammo]=available-take;return take;}
  // A* on a static occupancy grid. Diagonal corner-cutting is prohibited.
  class Navigator {
    constructor(hash,size=380,cell=4){this.cell=cell;this.n=Math.ceil(size/cell);this.half=size/2;this.blocked=new Uint8Array(this.n*this.n);for(let z=0;z<this.n;z++)for(let x=0;x<this.n;x++){let p=this.point(z*this.n+x);this.blocked[z*this.n+x]=collidesAt(hash,p.x,heightAt(p.x,p.z),p.z,.55,1.75)?1:0;}}
    index(p){return clamp(Math.floor((p.z+this.half)/this.cell),0,this.n-1)*this.n+clamp(Math.floor((p.x+this.half)/this.cell),0,this.n-1);}
    point(i){return {x:(i%this.n+.5)*this.cell-this.half,z:(Math.floor(i/this.n)+.5)*this.cell-this.half};}
    path(start,end){const s=this.index(start),goal0=this.index(end);let goal=goal0;if(this.blocked[goal]){let best=Infinity;for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){const x=goal0%this.n+dx,z=Math.floor(goal0/this.n)+dz;if(x<0||z<0||x>=this.n||z>=this.n)continue;let q=z*this.n+x;if(!this.blocked[q]&&dx*dx+dz*dz<best){best=dx*dx+dz*dz;goal=q;}}}
      if(s===goal)return [this.point(goal)];const heuristic=i=>Math.hypot(i%this.n-goal%this.n,Math.floor(i/this.n)-Math.floor(goal/this.n));
      const open=[s],g=new Map([[s,0]]),f=new Map([[s,heuristic(s)]]),parents=new Map(),closed=new Set();let steps=0;
      while(open.length&&steps++<2800){let bi=0;for(let j=1;j<open.length;j++)if(f.get(open[j])<f.get(open[bi]))bi=j;const cur=open.splice(bi,1)[0];if(cur===goal){const out=[];let q=goal;while(q!==s){out.push(this.point(q));q=parents.get(q);}return out.reverse();}closed.add(cur);const cx=cur%this.n,cz=Math.floor(cur/this.n);
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=this.n||z>=this.n)continue;const q=z*this.n+x;if(closed.has(q)||this.blocked[q])continue;if(dx&&dz&&(this.blocked[cz*this.n+x]||this.blocked[z*this.n+cx]))continue;const ng=g.get(cur)+(dx&&dz?1.4142:1);if(ng<(g.get(q)??Infinity)){parents.set(q,cur);g.set(q,ng);f.set(q,ng+heuristic(q));if(!open.includes(q))open.push(q);}}
      }return [];
    }
  }
  const api={clamp,mix,rng,WEAPONS,AMMO,REGIONS,MAP,MAPS,ISLAND,setMap,islandHeight,heightAt,segmentBox,SpatialHash,collidesAt,moveActor,Zone,damageActor,makeWeapon,reloadWeapon,Navigator};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BR=api;
})(typeof globalThis!=='undefined'?globalThis:this);
