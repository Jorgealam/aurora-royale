/* Aurora Royale · mapa 2: Ilha do Medo.
   Ilha-presídio tropical cercada por mar raso, inspirada no conceito de ilhas-prisão de battle royale
   (presídio central sobre um platô, bairro residencial, porto, fábricas, caldeiras, estação de tratamento).
   Layout, construções e nomes de locais são originais deste jogo. */
(function(root){
  'use strict';
  const T=THREE,C=BR;
  root.Art.buildIsland=function(k){
    const {mat,worldMat,emissiveMat,mesh,box,cylinder,cached,boxGeo,tex,paint,fbm,windify,displace,mergeParts,M4,spriteTex,uniforms,materials}=Art._kit;
    const {scene,hash,walls,cover,landmarks,animated,emitters,noBatch,addBox,patch,pool,ground,maskData,maskTex,stone,wood,woodDark,floorWood,road,roof,roofSlate,metal,dark,glass,concrete,windowLit,lampBulb,neon,makeZone,buildGrass,buildFlowers,batchStatics}=k;
    const R=C.rng(4242),W=C.MAP.water,H=(x,z)=>C.heightAt(x,z);
    const ziplines=[],roads=[],nightBeams=[];

    /* ---------- Paleta vibrante ---------- */
    const P=(name,color,kind='plaster',s=.3,o={})=>worldMat('isl_'+name,kind,color,s,o);
    const houseColors=[P('coral',0xff6f5e),P('sun',0xffc93c),P('teal',0x34d1c9),P('violet',0x8f7bff),P('lime',0x7bd957),P('pink',0xff8fd0),P('sky',0x4fb0ff),P('orange',0xff9a3c)];
    const roofs=[worldMat('isl_roofRed','roof',0xff8f7a,.42),worldMat('isl_roofTeal','roof',0x5fd8c8,.42),worldMat('isl_roofBlue','roof',0x8fb8ff,.42),roof];
    const prisonWall=P('prisonWall',0xe2ddd2,'concrete',.22),prisonDark=P('prisonDark',0x9a9a96,'concrete',.22),stripe=mat('isl_stripe',0xff7a1a,{roughness:.5,emissive:0xff5a00,emissiveIntensity:.15}),stripeY=mat('isl_stripeY',0xffd21a,{roughness:.5});
    const brick=worldMat('isl_brick','stone',0xd0603e,.55),white=mat('isl_white',0xf2f0ea,{roughness:.55}),red=mat('isl_red',0xe8322a,{roughness:.5}),yellow=mat('isl_yellow',0xffc21a,{roughness:.5,metalness:.3}),teal=mat('isl_tealM',0x1fb8b0,{roughness:.45,metalness:.3});
    const purple=worldMat('isl_purple','corrugated',0x8a6cff,.45,{metalness:.5,roughness:.5}),blueC=worldMat('isl_blueC','corrugated',0x3f8fff,.45,{metalness:.5,roughness:.5}),greyC=worldMat('isl_greyC','corrugated',0xc4ccd0,.45,{metalness:.5,roughness:.5});
    const contMats=[0xff4a2a,0x2a8cff,0xffcc1a,0x2ac06a,0xff6ab0,0x9a5cff].map((c,i)=>worldMat('isl_cont'+i,'corrugated',c,.5,{metalness:.45,roughness:.5}));
    const bars=mat('isl_bars',0x40484c,{metalness:.8,roughness:.35}),rail=mat('isl_rail',0xffb21a,{metalness:.5,roughness:.4}),grate=worldMat('isl_grate','metal',0x8a9498,.8,{metalness:.7,roughness:.4});
    const energy=emissiveMat('isl_energy',0x6a2cff,0xb05cff,2.2,1.5),screen=emissiveMat('isl_screen',0x0a3a44,0x3ae8ff,1.4,1),sheet=mat('isl_sheet',0xeeeeea,{map:tex('fabric').map}),blanket=[mat('isl_bl0',0xff6f5e,{map:tex('fabric').map}),mat('isl_bl1',0x34a8ff,{map:tex('fabric').map}),mat('isl_bl2',0xffc93c,{map:tex('fabric').map})];
    const waterSmall=mat('isl_waterS',0x18a8a0,{metalness:.2,roughness:.08,transparent:true,opacity:.85,envMapIntensity:1.4});

    /* ---------- Utilitários de construção ---------- */
    const minH=(x0,z0,x1,z1)=>{let m=1e9;for(let i=0;i<=6;i++)for(let j=0;j<=6;j++)m=Math.min(m,H(x0+(x1-x0)*i/6,z0+(z1-z0)*j/6));return m;};
    // Parede alinhada a um eixo, com vãos [início,fim,alturaDoVão].
    function wallX(x0,x1,z,y,h,t,m,gaps=[]){let cur=x0;const segs=[];for(const g of [...gaps].sort((a,b)=>a[0]-b[0])){if(g[0]>cur)segs.push([cur,g[0]]);if(g[2]&&g[2]<h)addBox((g[0]+g[1])/2,y+g[2],z,g[1]-g[0],h-g[2],t,m,false,false);cur=g[1];}if(cur<x1)segs.push([cur,x1]);for(const [a,b] of segs)addBox((a+b)/2,y,z,b-a,h,t,m);}
    function wallZ(z0,z1,x,y,h,t,m,gaps=[]){let cur=z0;const segs=[];for(const g of [...gaps].sort((a,b)=>a[0]-b[0])){if(g[0]>cur)segs.push([cur,g[0]]);if(g[2]&&g[2]<h)addBox(x,y+g[2],(g[0]+g[1])/2,t,h-g[2],g[1]-g[0],m,false,false);cur=g[1];}if(cur<z1)segs.push([cur,z1]);for(const [a,b] of segs)addBox(x,y,(a+b)/2,t,h,b-a,m);}
    // Sala com 4 paredes; portas: {n,s,e,w}: [deslocamento, largura]
    const interiors=[];const indoors=(x,z,pad=0)=>interiors.some(r=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad);
    function room(x,z,w,d,y,h,m,doors={},t=.35){interiors.push({x,z,w,d});const g=s=>(doors[s]||[]).map(([o,wd])=>[o-wd/2,o+wd/2,2.5]);wallX(x-w/2,x+w/2,z-d/2,y,h,t,m,g('n').map(a=>[a[0]+x,a[1]+x,a[2]]));wallX(x-w/2,x+w/2,z+d/2,y,h,t,m,g('s').map(a=>[a[0]+x,a[1]+x,a[2]]));wallZ(z-d/2,z+d/2,x-w/2,y,h,t,m,g('w').map(a=>[a[0]+z,a[1]+z,a[2]]));wallZ(z-d/2,z+d/2,x+w/2,y,h,t,m,g('e').map(a=>[a[0]+z,a[1]+z,a[2]]));}
    function slab(x,z,w,d,y,m,t=.3,shadow=true){return addBox(x,y-t,z,w,t,d,m,false,false);}
    function foundation(x,z,w,d,top,m=stone){const b=minH(x-w/2,z-d/2,x+w/2,z+d/2);addBox(x,b-.6,z,w,top-b+.6,d,m,false,false);}
    // Escada maciça: degraus de 0,35 m (o personagem sobe degraus de até 0,42 m).
    function stairs(x,z,dir,n,y0,m=concrete,width=1.6,stepH=.35,stepD=.55){for(let i=0;i<n;i++){const o=(i+.5)*stepD,hh=(i+1)*stepH;let cx=x,cz=z,w=width,d=width;if(dir[0]==='x'){cx=x+(dir[1]==='+'?o:-o);w=stepD;}else{cz=z+(dir[1]==='+'?o:-o);d=stepD;}addBox(cx,y0,cz,w,hh,d,m,false,false);}}
    function railingX(x0,x1,z,y,m=rail){addBox((x0+x1)/2,y,z,x1-x0,1,.08,null,true,false);box(scene,(x0+x1)/2,y+1,z,x1-x0,.07,.07,m);box(scene,(x0+x1)/2,y+.5,z,x1-x0,.05,.05,m);for(let x=x0;x<=x1+.01;x+=1.2)box(scene,x,y+.5,z,.06,1,.06,m);}
    function railingZ(z0,z1,x,y,m=rail){addBox(x,y,(z0+z1)/2,.08,1,z1-z0,null,true,false);box(scene,x,y+1,(z0+z1)/2,.07,.07,z1-z0,m);box(scene,x,y+.5,(z0+z1)/2,.05,.05,z1-z0,m);for(let z=z0;z<=z1+.01;z+=1.2)box(scene,x,y+.5,z,.06,1,.06,m);}
    const gableGeo=(D,hr)=>cached(`isl_gable${D},${hr}`,()=>{const s=new T.Shape();s.moveTo(-D/2,0);s.lineTo(D/2,0);s.lineTo(0,hr);s.lineTo(-D/2,0);const g=new T.ExtrudeGeometry(s,{depth:.3,bevelEnabled:false});g.translate(0,0,-.15);g.rotateY(Math.PI/2);return g;});
    function gable(x,y,z,W2,D,m,wallM){const pitch=.55,hr=D/2*Math.tan(pitch),L=D/2/Math.cos(pitch)+.6;for(const s of [-1,1]){const sl=box(scene,x,y+hr/2-.05,z+s*D/4+s*.12,W2,.2,L,m);sl.rotation.x=s*pitch;}box(scene,x,y+hr+.02,z,W2+.1,.18,.42,white);for(const s of [-1,1])mesh(gableGeo(D-.2,hr-.1),wallM,scene,x+s*(W2/2-.62),y,z).castShadow=true;}
    function win(x,y,z,axis,frame=white,lit=true,shut=null){const gm=lit&&R()<.5?windowLit:glass;if(axis==='x'){box(scene,x,y,z,.06,1.3,1.3,gm);box(scene,x,y+.71,z,.18,.12,1.55,frame);box(scene,x,y-.71,z,.26,.12,1.65,frame);for(const s of [-1,1])box(scene,x,y,z+s*.71,.18,1.42,.12,frame);if(shut)for(const s of [-1,1]){const sh=box(scene,x,y,z+s*1.15,.07,1.35,.7,shut);sh.rotation.y=s*.3;}}else{box(scene,x,y,z,1.3,1.3,.06,gm);box(scene,x,y+.71,z,1.55,.12,.18,frame);box(scene,x,y-.71,z,1.65,.12,.26,frame);for(const s of [-1,1])box(scene,x+s*.71,y,z,.12,1.42,.18,frame);if(shut)for(const s of [-1,1]){const sh=box(scene,x+s*1.15,y,z,.7,1.35,.07,shut);sh.rotation.y=s*.3;}}}
    function barredWin(x,y,z,axis){if(axis==='x'){box(scene,x,y,z,.05,1,1.4,glass);for(let i=-3;i<=3;i++)box(scene,x,y,z+i*.2,.08,1.05,.04,bars);}else{box(scene,x,y,z,1.4,1,.05,glass);for(let i=-3;i<=3;i++)box(scene,x+i*.2,y,z,.04,1.05,.08,bars);}}
    function lamp(x,z,h=5.5){const y=H(x,z);addBox(x,y,z,.22,h,.22,dark,false,false);box(scene,x,y+h,z,.5,.16,.5,dark,false);box(scene,x,y+h-.1,z,.38,.05,.38,lampBulb,false);pool(x,z,8);}
    function bunk(x,y,z,rotZ=false){const w=rotZ?2:.9,d=rotZ?.9:2;for(const hgt of [.45,1.4]){box(scene,x,y+hgt,z,w,.12,d,bars);box(scene,x,y+hgt+.12,z,w-.1,.14,d-.1,sheet);}for(const sx of [-1,1])for(const sz of [-1,1])box(scene,x+sx*(w/2-.04),y+.9,z+sz*(d/2-.04),.05,1.8,.05,bars,false);addBox(x,y,z,w,.6,d,null,true,false);}
    const label=(text,x,y,z,ry,bg='#e8322a',fg='#fff',w=4,h=1)=>{const cv=document.createElement('canvas');cv.width=512;cv.height=128;const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,128);c.strokeStyle=fg;c.lineWidth=6;c.strokeRect(8,8,496,112);c.fillStyle=fg;c.font='bold 54px Segoe UI, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.25,roughness:.6}));m.position.set(x,y,z);m.rotation.y=ry;m.userData.noBatch=true;scene.add(m);return m;};

    /* ---------- Mar tropical ---------- */
    const wt=tex('water');const wn=wt.normalMap.clone();wn.needsUpdate=true;wn.repeat.set(60,60);wn.wrapS=wn.wrapT=T.RepeatWrapping;
    const seaMat=new T.MeshStandardMaterial({color:0x14b8c4,roughness:.05,metalness:.05,transparent:true,opacity:.74,normalMap:wn,normalScale:new T.Vector2(.45,.45),envMapIntensity:1.3});
    seaMat.onBeforeCompile=sh=>{sh.uniforms.uTime=uniforms.time;sh.fragmentShader='uniform float uTime;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 n1=texture2D(normalMap,vNormalMapUv+uTime*vec2(.006,.004)).xyz*2.-1.;vec3 n2=texture2D(normalMap,vNormalMapUv*1.61-uTime*vec2(.005,-.007)).xyz*2.-1.;vec3 mapN=normalize(vec3((n1.xy+n2.xy)*normalScale,n1.z*n2.z));normal=normalize(tbn*mapN);`);};seaMat.customProgramCacheKey=()=>'sea';
    const water=new T.Mesh(new T.PlaneGeometry(900,900).rotateX(-Math.PI/2),seaMat);water.position.y=W;water.receiveShadow=true;scene.add(water);
    // Ilhas distantes no horizonte.
    const farIsle=mat('isl_far',0x4c9a5a,{roughness:1,flatShading:true});[[300,-80,40],[-260,170,55],[120,300,35],[-310,-160,45],[40,-330,30]].forEach(([x,z,r],i)=>{const m=mesh(cached('isl_farGeo'+i,()=>displace(new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),.12,2.2,i*3)),farIsle,scene,x,W-1,z,false);m.scale.set(r,r*.35,r*.8);m.userData.noBatch=true;});

    /* ---------- Estradas (curvas suaves sobre o relevo) ---------- */
    function roadPath(pts,w=6.5){const sm=[];const cr=(p0,p1,p2,p3,t)=>{const t2=t*t,t3=t2*t;return [.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)];};
      for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];const n=Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/2);for(let j=0;j<n;j++)sm.push(cr(p0,p1,p2,p3,j/n));}sm.push(pts[pts.length-1]);
      const v=[],uv=[],idx=[];let L=0;for(let i=0;i<sm.length;i++){const a=sm[Math.max(0,i-1)],b=sm[Math.min(sm.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;if(i)L+=Math.hypot(sm[i][0]-sm[i-1][0],sm[i][1]-sm[i-1][1]);for(const s of [-1,1]){const x=sm[i][0]-dz*s*w/2,z=sm[i][1]+dx*s*w/2;v.push(x,Math.max(H(x,z),H(sm[i][0],sm[i][1])-.3)+.08,z);uv.push(L/30,(s+1)/2);}if(i<sm.length-1){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=mesh(g,road,scene,0,0,0,false);m.userData.noBatch=true;roads.push({pts:sm,w});}
    const roadDist=(x,z)=>{let best=1e9;for(const r of roads)for(let i=0;i<r.pts.length;i+=1){const p=r.pts[i];const d=Math.hypot(p[0]-x,p[1]-z)-r.w/2;if(d<best)best=d;}return best;};

    /* ==================== PRESÍDIO (centro, platô) ==================== */
    const py=H(0,0);
    // Muralha externa com portões e brechas, faixa laranja e arame farpado.
    {const wh=5.2;const wb=(x0,z0,x1,z1)=>minH(x0,z0,x1,z1)-.4;
      wallX(-28,28,-24,wb(-28,-24,28,-24),py+wh-wb(-28,-24,28,-24),.9,prisonWall,[[-3.5,3.5,4.2]]);wallX(-28,28,24,wb(-28,24,28,24),py+wh-wb(-28,24,28,24),.9,prisonWall,[[-3.5,3.5,4.2]]);
      wallZ(-24,24,28,wb(28,-24,28,24),py+wh-wb(28,-24,28,24),.9,prisonWall,[[4,8,0]]);wallZ(-24,24,-28,wb(-28,-24,-28,24),py+wh-wb(-28,-24,-28,24),.9,prisonWall,[[-8,-4,0]]);
      for(const z of [-24,24]){for(const [a,b] of [[-28,-3.5],[3.5,28]]){box(scene,(a+b)/2,py+3.2,z+(z<0?-.47:.47),b-a,.5,.04,stripe,false);}}for(const x of [-28,28])for(const [a,b] of (x>0?[[-24,4],[8,24]]:[[-24,-8],[-4,24]]))box(scene,x+(x<0?-.47:.47),py+3.2,(a+b)/2,.04,.5,b-a,stripe,false);
      // Arame farpado (espirais instanciadas).
      const coil=cached('isl_coil',()=>new T.TorusGeometry(.32,.02,4,10));const coils=[];const addCoil=(x0,z0,x1,z1)=>{const n=Math.floor(Math.hypot(x1-x0,z1-z0)/.35);for(let i=0;i<n;i++)coils.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n,x1===x0]);};addCoil(-28,-24,-3.5,-24);addCoil(3.5,-24,28,-24);addCoil(-28,24,-3.5,24);addCoil(3.5,24,28,24);addCoil(28,-24,28,4);addCoil(28,8,28,24);addCoil(-28,-24,-28,-8);addCoil(-28,-4,-28,24);
      const ci=new T.InstancedMesh(coil,bars,coils.length),dm=new T.Object3D();coils.forEach((c,i)=>{dm.position.set(c[0],py+wh+.32,c[1]);dm.rotation.set(0,c[2]?0:Math.PI/2,0);dm.updateMatrix();ci.setMatrixAt(i,dm.matrix);});scene.add(ci);
      // Portões com placas e cancelas.
      label('PRESÍDIO · ILHA DO MEDO',0,py+5,-24.5,Math.PI,'#e8322a','#fff',7,1.2);label('ÁREA RESTRITA',0,py+5,24.5,0,'#ffc21a','#222',5,1);
      for(const z of [-24,24])for(const s of [-1,1]){addBox(s*4.1,py,z,1.2,6,1.2,prisonDark);box(scene,s*4.1,py+6.1,z,1.4,.25,1.4,stripeY);}
      const breach=(x,z)=>{for(let i=0;i<10;i++){const s=.4+R()*.7;box(scene,x+(R()-.5)*3,py+s/2-.1,z+(R()-.5)*4,s,s,s,prisonWall).rotation.set(R(),R(),R());}};breach(29.5,6);breach(-29.5,-6);
    }
    // Torres de vigia nos cantos, com escadas e holofotes.
    const towerTop=py+6.5;
    for(const [tx,tz] of [[25,-21],[-25,-21],[25,21],[-25,21]]){const sz=Math.sign(tz);for(const sx of [-1,1])for(const s2 of [-1,1])addBox(tx+sx*1.8,py,tz+s2*1.8,.35,6.5,.35,prisonDark,false,false);slab(tx,tz,4,4,towerTop,grate);
      // Escada encostada na muralha, subindo em direção à torre.
      stairs(tx,tz-sz*(2+18*.55),sz>0?'z+':'z-',18,py,concrete);
      railingX(tx-2,tx+2,tz+sz*2,towerTop);railingZ(tz-2,tz+2,tx+Math.sign(tx)*2,towerTop);railingZ(Math.min(tz,tz-sz*2),Math.max(tz,tz-sz*2)+0,tx-Math.sign(tx)*2,towerTop);
      for(const sx of [-1,1])for(const s2 of [-1,1])box(scene,tx+sx*1.8,towerTop+1.4,tz+s2*1.8,.15,2.8,.15,dark);box(scene,tx,towerTop+2.9,tz,4.6,.3,4.6,red);mesh(cached('isl_towerCap',()=>new T.ConeGeometry(3.2,1.2,4)),red,scene,tx,towerTop+3.6,tz).rotation.y=Math.PI/4;
      const sl=new T.Group();sl.position.set(tx,towerTop+1.6,tz);scene.add(sl);const head=cylinder(sl,0,0,0,.35,.6,dark,10);head.rotation.x=Math.PI/2;const beamMat=new T.MeshBasicMaterial({map:spriteTex('beam'),color:new T.Color(1.6,1.5,1.2),transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});const beam=new T.Mesh(cached('isl_beam',()=>new T.CylinderGeometry(.25,4,40,16,1,true).translate(0,-20,0).rotateX(-Math.PI/2)),beamMat);sl.add(beam);sl.traverse(o=>o.userData.noBatch=true);nightBeams.push(beamMat);const ph=R()*6;animated.push(t=>{sl.rotation.set(-.35,Math.sin(t*.3+ph)*1.2+Math.atan2(-tx,-tz),0,'YXZ');});
      landmarks.push({x:tx,z:tz,kind:'tower'});}
    // Bloco de celas: dois andares, átrio central, passarelas, escadas, celas com grades.
    {const x0=-15,x1=15,z0=-6,z1=6,fh=4.2,top=py+fh*2;foundation(0,0,31,13,py,prisonDark);interiors.push({x:0,z:0,w:30,d:12});
      wallX(x0,x1,z0,py,fh*2,.4,prisonWall,[[-1.6,1.6,2.8]]);wallX(x0,x1,z1,py,fh*2,.4,prisonWall,[[-1.6,1.6,2.8]]);wallZ(z0,z1,x0,py,fh*2,.4,prisonWall,[[-1.6,1.6,2.8]]);wallZ(z0,z1,x1,py,fh*2,.4,prisonWall,[[-1.6,1.6,2.8]]);
      box(scene,0,py+fh-.1,z0-.22,30.4,.6,.06,stripe,false);box(scene,0,py+fh-.1,z1+.22,30.4,.6,.06,stripe,false);slab(0,0,31,13,top+.3,prisonDark,.3);box(scene,0,top+.5,0,31.4,.4,13.4,prisonWall);
      label('BLOCO A',0,py+3.3,z0-.25,Math.PI,'#222','#ffc21a',3,.8);label('BLOCO A',0,py+3.3,z1+.25,0,'#222','#ffc21a',3,.8);
      box(scene,0,py+.03,0,29.4,.05,11.4,P('cellFloor',0xb8b0a2,'concrete',.3),false);
      for(const fl of [0,1]){const y=py+fl*fh;
        for(const side of [-1,1]){const zf=side*2.8,zw=side*6;
          for(const px of [-12,-9,-6,-3,3,6,9,12])addBox(px,y,(zf+zw)/2,.2,fh-.1,3.2,prisonWall,false,false);
          for(const bx of [-15,-12,-9,-6,3,6,9,12]){addBox(bx+1,y,zf,2,fh-.1,.12,null,true,false);for(let i=0;i<=13;i++)box(scene,bx+.08+i*.15,y+fh/2-.05,zf,.035,fh-.1,.035,bars);box(scene,bx+1.5,y+fh-.2,zf,3,.12,.1,bars);const door=box(scene,bx+2.5,y+1.2,zf+side*.5,.06,2.3,1,bars);door.rotation.y=.0;
            const cz=(zf+zw)/2;bunk(bx+.6,y,cz+side*.4);box(scene,bx+2.5,y+.25,zw-side*.45,.45,.5,.45,white);box(scene,bx+1.6,y+1.6,zw-side*.15,1,.05,.3,wood);}
          for(const wx of [-13.5,-10.5,-7.5,-4.5,4.5,7.5,10.5,13.5])barredWin(wx,y+2.6,zw+side*.22,'z');}
        for(const lx of [-10,0,10])box(scene,lx,y+fh-.12,0,.5,.1,.5,lampBulb,false);}
      // Andar superior: galerias sobre as celas, pontes e guarda-corpos.
      const gy=py+fh;for(const side of [-1,1]){const zc=side*(1.8+6)/2;slab(0,zc,30,4.2,gy,grate,.25);}
      for(const bx of [-5,5])slab(bx,0,2,3.6,gy,grate,.25);
      for(const side of [-1,1]){const z=side*1.8;for(const [a,b] of [[-15,-6],[-4,4],[6,15]])railingX(a,b,z,gy);}
      railingZ(-1.8,1.8,-4,gy);railingZ(-1.8,1.8,4,gy);
      stairs(-12.6,0,'x+',12,py,concrete,1.6,.35,.55);stairs(12.6,0,'x-',12,py,concrete,1.6,.35,.55);
      landmarks.push({x:0,z:9,kind:'prison'});}
    // Prédios do pátio: refeitório, enfermaria, administração; quadra, ônibus e caixa d'água.
    {const y=py;room(-18,16,11,8,y,3.6,P('cantina',0xffd27a),{n:[[0,2.4]]});slab(-18,16,11.4,8.4,y+3.9,prisonDark,.3);label('REFEITÓRIO',-18,y+3,11.75,Math.PI,'#ff9a2a','#fff',4,.9);
      for(const z of [14,17.5])for(const x of [-21,-15]){addBox(x,y,z,3.6,.8,1,null,true,false);box(scene,x,y+.78,z,3.6,.08,1,wood);box(scene,x,y+.4,z,3.4,.05,.9,bars);for(const s of [-1,1])box(scene,x,y+.45,z+s*.75,3.4,.08,.35,wood);}addBox(-18,y,19.3,8,1.1,.8,teal);
      room(18,16,10,8,y,3.6,P('infirm',0xf4f4f0),{n:[[0,2.4]]});slab(18,16,10.4,8.4,y+3.9,prisonDark,.3);label('ENFERMARIA',18,y+3,11.75,Math.PI,'#e8322a','#fff',4,.9);for(const x of [15,18,21]){box(scene,x,y+.5,18.5,1,.12,2,bars);box(scene,x,y+.65,18.5,.9,.2,1.9,sheet);addBox(x,y,18.5,1,.7,2,null,true,false);}box(scene,18,y+2.6,19.82,1.2,1.2,.06,mat('isl_cross',0xffffff,{emissive:0xff2020,emissiveIntensity:1.5}),false);
      room(17,-15,10,7,y,3.6,P('admin',0x8fd0ff),{s:[[-2,2.2]]});slab(17,-15,10.4,7.4,y+3.9,prisonDark,.3);for(const x of [14.5,19.5]){addBox(x,y,-16,1.8,.8,.9,wood);box(scene,x,y+.85,-16.2,.6,.4,.04,screen,false);}addBox(21.5,y,-18,.8,2,.6,metal);label('DIRETORIA',17,y+3,-11.25,0,'#1f6fd1','#fff',3.4,.8);
      patch(0,15,15,8,mat('isl_court',0xffffff,{map:(()=>{const p=paint(256,(u,v)=>{let c=[222,110,52];const line=Math.abs(u-.5)<.006||u<.012||u>.988||v<.02||v>.98||Math.abs(Math.hypot((u-.5)*1.9,v-.5)-.17)<.006;if(line)c=[245,245,240];return c;});return p.map;})(),roughness:.7}),.07,1.5);
      for(const s of [-1,1]){addBox(s*7.2,y,15,.2,3,.2,dark,false,false);box(scene,s*6.9,y+3,15,.08,1,1.4,white);}
      // Ônibus do presídio.
      {const g=new T.Group();g.position.set(-8,y,-16);scene.add(g);box(g,0,1.6,0,10,2.4,2.5,mat('isl_bus',0xffc21a,{roughness:.4,metalness:.3}));box(g,0,2.2,1.26,9,.8,.04,glass);box(g,0,2.2,-1.26,9,.8,.04,glass);box(g,0,.9,0,10.05,.3,2.55,dark);for(const sx of [-3.5,3.5])for(const sz of [-1.2,1.2]){const wl=cylinder(g,sx,.5,sz,.5,.3,dark,12);wl.rotation.x=Math.PI/2;}addBox(-8,y,-16,10,2.8,2.5,null,true);}
      // Caixa d'água quadriculada.
      {const x=-21,z=-16;for(const sx of [-1,1])for(const sz of [-1,1])addBox(x+sx*1.6,y,z+sz*1.6,.35,9,.35,dark,false,false);const ck=mat('isl_check',0xffffff,{map:(()=>{const p=paint(128,(u,v)=>((Math.floor(u*8)+Math.floor(v*4))%2)?[230,40,36]:[245,245,240]);return p.map;})(),roughness:.5});cylinder(scene,x,y+11,z,2.8,4,ck,24);mesh(cached('isl_wtTop',()=>new T.ConeGeometry(3,1.3,24)),red,scene,x,y+13.6,z).castShadow=true;}
    }

    /* ==================== BAIRRO RESIDENCIAL ==================== */
    function house(x,z,w,d,ci,door='s'){const y=H(x,z)+.35,wm=houseColors[ci%houseColors.length],sh=[teal,red,yellow,white][ci%4];foundation(x,z,w+.6,d+.6,y,stone);const dw=2.2;room(x,z,w,d,y,3.6,wm,{[door]:[[0,dw]]},.35);box(scene,x,y+.03,z,w-.4,.05,d-.4,floorWood,false);box(scene,x,y+3.55,z,w-.2,.1,d-.2,white,false);
      gable(x,y+3.6,z,w+1.2,d+1.2,roofs[ci%roofs.length],wm);for(const sx of [-1,1])for(const sz of [-1,1])box(scene,x+sx*w/2,y+1.8,z+sz*d/2,.42,3.65,.42,white);
      const ds=door==='s'?1:-1;for(const dx of [-w/4-.4,w/4+.4])win(x+dx,y+1.9,z-ds*(d/2+.2),'z',white,true,sh);for(const dz of [-d/4,d/4])for(const sx of [-1,1])win(x+sx*(w/2+.2),y+1.9,z+dz,'x',white,true,sh);
      box(scene,x-.6,y+1.25,z+ds*(d/2-.55),.08,2.4,1.05,sh);box(scene,x,y-.15,z+ds*(d/2+.9),2.8,.3,1.2,stone);box(scene,x+1.4,y+2.6,z+ds*(d/2+.32),.2,.26,.2,lampBulb,false);pool(x,z+ds*(d/2+2.5),7);
      // Interior: sala, cozinha e quarto.
      addBox(x-w/4,y,z-ds*(d/4),2,.8,1,null,true);box(scene,x-w/4,y+.78,z-ds*(d/4),2.1,.08,1.1,wood);for(const s of [-1,1])box(scene,x-w/4+s*.7,y+.4,z-ds*(d/4)+s*.0,.45,.8,.45,woodDark);
      addBox(x+w/4,y,z-ds*(d/2-.8),2.4,.9,.6,null,true);box(scene,x+w/4,y+.45,z-ds*(d/2-.8),2.4,.9,.6,white);box(scene,x+w/4,y+.92,z-ds*(d/2-.8),2.45,.06,.65,woodDark);addBox(x+w/2-.6,y,z-ds*(d/2-.6),.7,1.8,.6,mat('isl_fridge',0xe8f4f8,{roughness:.3,metalness:.2}));
      addBox(x+w/4,y,z+ds*.6,2,.55,1.4,null,true);box(scene,x+w/4,y+.3,z+ds*.6,2.1,.5,1.5,woodDark);box(scene,x+w/4,y+.58,z+ds*.6,2,.12,1.4,blanket[ci%3]);
      addBox(x-w/4,y,z+ds*(d/2-1.2),2.4,.8,.9,null,true);box(scene,x-w/4,y+.35,z+ds*(d/2-1.2),2.4,.45,.9,mat('isl_sofa',[0x2a6fd1,0xd13a2a,0x2ab07a][ci%3],{map:tex('fabric').map}));box(scene,x-w/4,y+.75,z+ds*(d/2-.85),2.4,.5,.2,mat('isl_sofa',0,{}));
      box(scene,x,y+.07,z,2.6,.03,1.8,blanket[(ci+1)%3],false);box(scene,x,y+3.4,z,.25,.12,.25,lampBulb,false);landmarks.push({x,z,kind:'house',w,d:door==='s'?d:-d});}
    // Sobrado de dois andares com escada interna e varanda.
    function sobrado(x,z,w,d,ci,door='s'){const y=H(x,z)+.35,wm=houseColors[ci%houseColors.length],f1=3.6;foundation(x,z,w+.6,d+.6,y,stone);const ds=door==='s'?1:-1;
      room(x,z,w,d,y,f1,wm,{[door]:[[1.5,2.2]]});room(x,z,w,d,y+f1,3.2,wm,{[door]:[[1.5,2]]});
      // Piso superior com abertura da escada (escada junto à parede dos fundos, subindo em x+).
      const sz=z-ds*(d/2-1.1);slab(x,z+ds*1.05,w-.3,d-2.6,y+f1,floorWood,.25);slab(x+(w/2+.5)/2,sz,w/2-.6,2.1,y+f1,floorWood,.25);stairs(x-w/2+.5,sz,'x+',10,y,woodDark,1.6,.36,.5);railingX(x-w/2+.4,x-w/2+5.4,sz+ds*1,y+f1);
      box(scene,x,y+.03,z,w-.4,.05,d-.4,floorWood,false);gable(x,y+f1+3.2,z,w+1.2,d+1.2,roofs[(ci+1)%roofs.length],wm);box(scene,x,y+f1-.05,z,w+.5,.22,d+.5,white);
      for(const fl of [0,1])for(const dx of [-w/4-.6,w/4+.6]){win(x+dx,y+fl*f1+1.9,z-ds*(d/2+.2),'z',white,true,teal);if(fl)win(x+dx,y+fl*f1+1.9,z+ds*(d/2+.2),'z',white,true,teal);}for(const fl of [0,1])for(const sx of [-1,1])win(x+sx*(w/2+.2),y+fl*f1+1.9,z,'x',white,true,yellow);
      // Varanda na frente do andar superior.
      slab(x,z+ds*(d/2+.9),w-1,1.6,y+f1+.05,floorWood,.2);railingX(x-w/2+.5,x+w/2-.5,z+ds*(d/2+1.65),y+f1+.05,white);
      addBox(x+w/4,y+f1,z+ds*.8,2,.55,1.4,null,true);box(scene,x+w/4,y+f1+.3,z+ds*.8,2.1,.5,1.5,woodDark);box(scene,x+w/4,y+f1+.58,z+ds*.8,2,.12,1.4,blanket[ci%3]);addBox(x-w/4,y+f1,z+ds*.8,1.6,1.9,.6,wood);
      addBox(x+w/4,y,z+ds*(d/4),2,.8,1,null,true);box(scene,x+w/4,y+.78,z+ds*(d/4),2.1,.08,1.1,wood);box(scene,x+1.5,y-.15,z+ds*(d/2+.9),2.8,.3,1.2,stone);pool(x+1.5,z+ds*(d/2+2.6),7);landmarks.push({x,z,kind:'house',w,d:ds*d});}
    {house(-76,-55,10,8,0,'s');house(-50,-56,10,8,1,'s');sobrado(-76,-34,10,9,2,'n');sobrado(-49,-34,10,9,3,'n');house(-70,-70,9,8,4,'s');house(-52,-71,9,8,5,'s');house(-89,-56,8,8,6,'s');house(-36,-34,8,7,7,'n');
      // Chafariz na praça central.
      {const x=-62,z=-45,y=H(x,z);cylinder(scene,x,y+.35,z,2.6,.7,P('fountain',0xf2efe6,'concrete',.3),20);cylinder(scene,x,y+.68,z,2.3,.06,waterSmall,20);cylinder(scene,x,y+1.4,z,.35,1.6,white,10);cylinder(scene,x,y+2.2,z,1,.2,white,16);addBox(x,y,z,3.8,.8,3.8,null,true,false);emitters.push({type:'fountain',x,y:y+2.3,z});}
      // Parquinho, bancos, cercas e guarda-sóis na praia.
      {const x=-40,z=-58,y=H(x,z);for(const s of [-1,1])addBox(x+s*1.6,y,z,.15,2.4,.15,red,false,false);box(scene,x,y+2.4,z,3.4,.15,.15,red);for(const s of [-.7,.7]){box(scene,x+s,y+1.5,z,.03,1.8,.03,bars,false);box(scene,x+s,y+.55,z,.5,.06,.3,yellow);}const sl=box(scene,x+4,y+1,z+2,.8,.08,4,yellow);sl.rotation.x=.45;addBox(x+4,y,z+.6,1,2.2,1,blueC);}
      for(const [x,z] of [[-56,-40],[-68,-50],[-56,-50],[-68,-40]]){const y=H(x,z);box(scene,x,y+.45,z,1.8,.08,.5,wood);for(const s of [-.8,.8])box(scene,x+s,y+.22,z,.08,.45,.45,dark);}
      for(const [x,z,c] of [[-101,-36,0xff4a6a],[-103,-28,0x2ad0c0],[-100,-20,0xffc21a]]){const y=Math.max(H(x,z),W);cylinder(scene,x,y+1.2,z,.05,2.4,white,6);mesh(cached('isl_umb',()=>new T.ConeGeometry(1.6,.6,8,1,true)),mat('isl_umb'+c,c,{side:T.DoubleSide,roughness:.6}),scene,x,y+2.5,z);box(scene,x+1.2,y+.25,z,.6,.12,1.6,mat('isl_towel'+c,c,{map:tex('fabric').map}));}
      for(const [x,z] of [[-66,-52],[-58,-38],[-66,-38],[-58,-52]])lamp(x,z);
      label('BAIRRO DA PRAIA',-62,H(-62,-62)+3.2,-61,0,'#34d1c9','#fff',4.5,.9);for(const s of [-1,1])addBox(-62+s*2.4,H(-62,-61),-61,.15,3.4,.15,white,false,false);}

    /* ==================== FAROL (norte) ==================== */
    {const x=-6,z=-90,y=H(x,z);const n=8;for(let i=0;i<n;i++){const r0=2.5-i*.09,r1=2.5-(i+1)*.09;cylinder(scene,x,y+i*2.25+1.12,z,r0,2.25,i%2?red:white,20,r1);}addBox(x,y,z,3.8,18,3.8,null,true,false);
      cylinder(scene,x,y+18.3,z,2.1,.6,dark,20);cylinder(scene,x,y+19.8,z,1.5,2.4,mat('isl_lantern',0xfff2c0,{emissive:0xffe08a,emissiveIntensity:1.5,transparent:true,opacity:.75}),16);mesh(cached('isl_lhCap',()=>new T.ConeGeometry(1.8,1.4,16)),red,scene,x,y+21.7,z).castShadow=true;railingZ(z-2.2,z+2.2,x+2.3,y+18.6,dark);
      const lb=new T.Group();lb.position.set(x,y+19.8,z);scene.add(lb);const bm=new T.MeshBasicMaterial({map:spriteTex('beam'),color:new T.Color(2,1.8,1.2),transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});for(const s of [0,Math.PI]){const b=new T.Mesh(cached('isl_lhBeam',()=>new T.CylinderGeometry(.6,7,120,16,1,true).translate(0,-60,0).rotateX(-Math.PI/2)),bm);b.rotation.y=s;lb.add(b);}lb.traverse(o=>o.userData.noBatch=true);nightBeams.push(bm);animated.push(t=>{lb.rotation.y=t*.7;});
      house(7,-89,8,6,3,'s');label('FAROL DO MEDO',x,y+3,z+2.6,0,'#e8322a','#fff',3.6,.8);landmarks.push({x,z:z+4,kind:'lighthouse'});}

    /* ==================== CENTRO DE CONTROLE (nordeste) ==================== */
    {const x=52,z=-52,y=H(x,z)+.3,w=16,d=10,h=4.2;foundation(x,z,w+.6,d+.6,y,prisonDark);room(x,z,w,d,y,h,P('ctrl',0xf4f6f8,'concrete',.25),{s:[[-3,2.4]],w:[[0,2.4]]});slab(x,z,w+.4,d+.4,y+h+.3,prisonDark,.3);box(scene,x,y+h+.35,z,w+.6,.15,d+.6,teal);
      for(const zz of [z-d/2-.2,z+d/2+.2])box(scene,x,y+2.6,zz,w-1,1.1,.06,mat('isl_ctrlGlass',0x1a8aa8,{metalness:.9,roughness:.05,emissive:0x0a4050,emissiveIntensity:.6}),false);
      for(let i=0;i<4;i++){const cx=x-5+i*3.3;addBox(cx,y,z-2,2.6,.9,1,metal);box(scene,cx,y+1.2,z-2.45,2.4,.6,.06,screen,false);}addBox(x+5,y,z+3,2,.8,2,wood);
      stairs(x+w/2+1,z+d/2-.2,'z-',12,y,concrete,1.6,.375,.55);railingX(x-w/2,x+w/2,z+d/2,y+h+.3);railingX(x-w/2,x+w/2,z-d/2,y+h+.3);railingZ(z-d/2,z+d/2,x-w/2,y+h+.3);
      const rd=new T.Group();rd.position.set(x-3,y+h+.3,z);scene.add(rd);cylinder(rd,0,1,0,.25,2,dark,10);const dish=mesh(cached('isl_radar',()=>new T.SphereGeometry(2.2,20,8,0,Math.PI*2,0,Math.PI*.3)),white,rd,0,2.6,0);dish.rotation.x=Math.PI*.6;rd.traverse(o=>o.userData.noBatch=true);animated.push(t=>{rd.rotation.y=t*.8;});addBox(x-3,y+h+.3,z,1,2.5,1,null,true,false);
      addBox(x+4,y+h+.3,z-2,.3,10,.3,dark,false,false);box(scene,x+4,y+h+10.5,z-2,.4,.4,.4,mat('isl_blink',0x400000,{emissive:0xff2020,emissiveIntensity:3}),false);
      label('CENTRO DE CONTROLE',x,y+h-.5,z+d/2+.25,0,'#1f6fd1','#fff',5.5,.9);
      // Heliponto com helicóptero acidentado.
      {const hx=40,hz=-38,hy=H(hx,hz);const hp=mat('isl_heli',0xffffff,{map:(()=>{const p=paint(256,(u,v)=>{const r=Math.hypot(u-.5,v-.5);let c=[60,70,74];if(Math.abs(r-.42)<.025)c=[255,200,30];const hX=Math.abs(u-.5)<.16&&Math.abs(v-.5)<.2&&(Math.abs(u-.36)<.035||Math.abs(u-.64)<.035||Math.abs(v-.5)<.03);if(hX)c=[245,245,240];return c;});return p.map;})(),roughness:.8});patch(hx,hz,14,14,hp,.08,1.5);
        const g=new T.Group();g.position.set(hx+2,hy,hz+1);g.rotation.set(0,.6,.18);scene.add(g);const hb=mat('isl_heliBody',0x3a6a3a,{roughness:.5,metalness:.3});box(g,0,1.3,0,2.4,2,4.6,hb);box(g,0,1.6,2.4,2,1.4,.6,glass);box(g,0,1.4,-4.2,.5,.6,4.5,hb);box(g,0,2,-6.2,.2,1.4,.9,hb);box(g,0,2.45,0,.4,.3,.4,dark);for(const r of [0,1.3]){const bl=box(g,0,2.6,0,.25,.05,9,dark);bl.rotation.y=r;}for(const s of [-1,1])box(g,s*1.1,.2,0,.12,.12,4,dark);addBox(hx+2,hy,hz+1,4,2.6,6,null,true);emitters.push({type:'smoke',x:hx+2,y:hy+2.2,z:hz+1});}
      landmarks.push({x,z:z+8,kind:'control'});}

    /* ==================== ZONA DE PROCESSAMENTO (leste) ==================== */
    {const x=78,z=4,y=H(x,z)+.2,w=26,d=16,h=8;foundation(x,z,w+.6,d+.6,y,concrete);room(x,z,w,d,y,h,purple,{w:[[0,6]],n:[[0,4]],s:[[6,4]]},.4);box(scene,x,y+h+.15,z,w+.8,.3,d+.8,greyC);for(let i=-2;i<=2;i++)box(scene,x+i*5,y+h-.2,z,.6,.12,d-1,lampBulb,false);box(scene,x,y+.03,z,w-.6,.05,d-.6,concrete,false);
      box(scene,x-w/2-.22,y+h-1.2,z,.06,1.2,d,stripeY,false);label('PROCESSAMENTO DE ENERGIA',x-w/2-.25,y+h-2.6,z,-Math.PI/2,'#8a6cff','#fff',8,1.1);
      for(const vx of [-7,0,7]){const vz=z-3;cylinder(scene,x+vx,y+1.6,vz,1.9,3.2,metal,18);cylinder(scene,x+vx,y+3.25,vz,1.7,.1,energy,18);addBox(x+vx,y,vz,3.6,3.3,3.6,null,true);for(let i=0;i<3;i++)cylinder(scene,x+vx,y+.6+i*1.1,vz,1.95,.12,dark,18);emitters.push({type:'energy',x:x+vx,y:y+3.4,z:vz});}
      addBox(x,y,z+4.5,20,1,1.6,dark);for(let i=-9;i<=9;i++){const rl=cylinder(scene,x+i,y+1.05,z+4.5,.12,1.5,metal,8);rl.rotation.x=Math.PI/2;}for(let i=0;i<6;i++){const cx=x-8+i*3.2;box(scene,cx,y+1.35,z+4.5,.9,.6,.9,energy);}
      // Mezanino com escada.
      slab(x+2,z+d/2-1.4,w-6,2.4,y+4.2,grate,.25);railingX(x-11,x+15,z+d/2-2.6,y+4.2);stairs(x-11-12*.55+.3,z+d/2-1.4,'x+',12,y,grate,1.6,.35,.55);
      for(const [sx,sz] of [[x+17,z-6],[x+17,z+2]]){const sy=H(sx,sz);cylinder(scene,sx,sy+6,sz,2.6,12,greyC,20);mesh(cached('isl_silo',()=>new T.ConeGeometry(2.7,1.4,20)),teal,scene,sx,sy+12.7,sz).castShadow=true;addBox(sx,sy,sz,4.6,12,4.6,null,true);}
      for(let i=0;i<4;i++){const cx=x-10+i*6;const pz=z-d/2-3;const pyy=H(cx,pz);addBox(cx,pyy,pz,.3,4.5,.3,dark,false,false);}for(const off of [4,4.6])box(scene,x-1,H(x,z-d/2-3)+off,z-d/2-3,20,.4,.4,mat('isl_pipe',0xff7a1a,{metalness:.4,roughness:.4}));
      for(const [cx,cz] of [[x-10,z-14],[x-4,z-16]]){const cy=H(cx,cz);addBox(cx,cy,cz,1.6,1.6,1.6,mat('isl_crateE',0x2a2a40,{map:tex('planks').map}));box(scene,cx,cy+1.62,cz,1.2,.06,1.2,energy,false);emitters.push({type:'energy',x:cx,y:cy+1.7,z:cz});}
      landmarks.push({x:x-w/2-4,z,kind:'factory'});}

    /* ==================== PORTO (sudeste) ==================== */
    {const px=62,pz=62,y=H(px,pz);const top=W+.65;
      addBox(70,W-2.2,90,9,2.2+.65,30,concrete);addBox(96,W-2.2,64,30,2.2+.65,9,concrete);for(const [a,b,c,dd] of [[70,90,9,30],[96,64,30,9]]){box(scene,a,top+.06,b,c,.04,dd,stripeY,false);}
      for(let i=0;i<8;i++){cylinder(scene,65.8,top+.3,78+i*3.6,.2,.6,dark,8);cylinder(scene,84+i*3.8,top+.3,68.3,.2,.6,dark,8);}
      // Contêineres coloridos (pilhas de dois).
      let ci=0;for(const [cx,cz,rot] of [[48,52,0],[52,52,0],[56,52,0],[48,62,0],[56,62,1],[64,50,1],[72,52,1],[40,60,0]]){const cy=H(cx,cz);const wC=rot?12:3,dC=rot?3:12;addBox(cx,cy,cz,wC,2.7,dC,contMats[ci%6]);box(scene,cx,cy+2.72,cz,wC+.04,.06,dC+.04,dark,false);if(ci%3!==1){addBox(cx,cy+2.7,cz,wC,2.7,dC,contMats[(ci+2)%6]);box(scene,cx,cy+5.42,cz,wC+.04,.06,dC+.04,dark,false);}ci++;}
      // Guindastes amarelos sobre o píer.
      for(const [gx,gz,ax] of [[96,64,'x'],[70,90,'z']]){const g=new T.Group();g.position.set(gx,top,gz);if(ax==='z')g.rotation.y=Math.PI/2;scene.add(g);for(const s of [-1,1])for(const t of [-1,1]){box(g,s*5,9,t*3.5,.7,18,.7,yellow);}for(const t of [-1,1])box(g,0,18,t*3.5,11,.8,.8,yellow);box(g,0,18.6,0,4,1.6,8,yellow);box(g,0,17,-9,1,1,26,yellow);box(g,0,12,-12,1.6,.6,1.6,dark);for(const s of [-1,1])for(const t of [-1,1])addBox(gx+(ax==='x'?s*5:t*3.5),top,gz+(ax==='x'?t*3.5:s*5),.8,18,.8,null,true,false);}
      // Navio cargueiro atracado (convés acessível pela escada do píer).
      {const sx=97,sz=74,L=34,B=10,deck=W+3.7;const hull=mat('isl_hull',0xd8322a,{roughness:.6,metalness:.3}),hullTop=mat('isl_hullTop',0x1c2226,{roughness:.6});addBox(sx,W-2,sz-B/2,L,deck-(W-2),.5,hull);addBox(sx,W-2,sz+B/2,L,deck-(W-2),.5,hull);addBox(sx-L/2,W-2,sz,.5,deck-(W-2),B,hull);addBox(sx+L/2,W-2,sz,.5,deck-(W-2),B,hull);
        slab(sx,sz,L-.5,B-.5,deck,mat('isl_deck',0x7a5a3a,{map:tex('planks').map}),.3);box(scene,sx,deck+.1,sz-B/2,L+.2,.25,.6,hullTop);box(scene,sx,deck+.1,sz+B/2,L+.2,.25,.6,hullTop);mesh(cached('isl_bow',()=>new T.ConeGeometry(5.2,6,4,1).rotateZ(-Math.PI/2).rotateX(Math.PI/4)),hull,scene,sx-L/2-2.8,W+1,sz).scale.set(1,.85,1);
        room(sx+12,sz,7,8,deck,3.2,white,{w:[[0,2]]});slab(sx+12,sz,7.4,8.4,deck+3.5,white,.3);room(sx+12,sz,6,7,deck+3.5,2.6,white,{});box(scene,sx+12,deck+3.5+2.75,sz,6.4,.3,7.4,hull);for(const s of [-1,1])box(scene,sx+8.95,deck+1.9,sz+s*2,.06,1,1.8,glass,false);box(scene,sx+8.95,deck+4.9,sz,.06,1,6,glass,false);cylinder(scene,sx+14,deck+8,sz,.7,3,hullTop,12);
        addBox(sx-8,deck,sz,3,2.7,8,contMats[1]);addBox(sx-2,deck,sz-1.5,8,2.7,3,contMats[2]);addBox(sx+3,deck,sz+2,3,2.7,6,contMats[4]);stairs(84,62,'z+',10,top,grate,1.8,.31,.66);label('MV CALIGO',sx-6,W+2.4,sz+B/2+.3,0,'#1c2226','#fff',5,1);landmarks.push({x:sx,z:sz,kind:'ship'});}
      // Galpão do porto (frente aberta).
      {const gx=46,gz=74,gy=H(gx,gz)+.2;foundation(gx,gz,14.6,10.6,gy,concrete);wallX(gx-7,gx+7,gz+5,gy,6,.35,blueC);wallZ(gz-5,gz+5,gx-7,gy,6,.35,blueC);wallZ(gz-5,gz+5,gx+7,gy,6,.35,blueC);box(scene,gx,gy+6.2,gz,14.8,.3,10.8,greyC);for(const s of [-3,3])addBox(gx+s,gy,gz+1,1.4,1.4,1.4,mat('isl_crate',0xc8954a,{map:tex('planks').map}));
        const fl=new T.Group();fl.position.set(gx+3,gy,gz-7);scene.add(fl);box(fl,0,.8,0,1.4,1,2.4,yellow);box(fl,0,1.8,.4,1.2,1,1,glass);box(fl,0,1.5,-1.4,1,3,.12,dark);box(fl,0,.3,-1.9,1,.06,1,dark);addBox(gx+3,gy,gz-7,1.6,2.4,3,null,true);}
      for(const [lx,lz] of [[70,80],[70,98],[88,64],[104,64],[54,58]])lamp(lx,lz,6.5);label('PORTO',58,H(58,44)+3.4,44,Math.PI,'#2a8cff','#fff',3,.9);for(const s of [-1,1])addBox(58+s*1.6,H(58,44),44,.15,3.8,.15,white,false,false);
      landmarks.push({x:px-6,z:pz-2,kind:'port'});}

    /* ==================== CASA DAS CALDEIRAS (sul) ==================== */
    {const x=12,z=68,y=H(x,z)+.25,w=18,d=11,h=7;foundation(x,z,w+.6,d+.6,y,concrete);room(x,z,w,d,y,h,brick,{n:[[0,4]],w:[[1,2.4]],e:[[-1,2.4]]},.45);box(scene,x,y+h+.15,z,w+.8,.3,d+.8,prisonDark);box(scene,x,y+.03,z,w-.6,.05,d-.6,concrete,false);
      for(const bxx of [-5.5,0,5.5]){const b=cylinder(scene,x+bxx,y+1.7,z+1.5,1.5,5,metal,18);b.rotation.x=Math.PI/2;addBox(x+bxx,y,z+1.5,3,3.2,5,null,true);cylinder(scene,x+bxx,y+4,z-1,.25,4,mat('isl_pipe',0xff7a1a),8);box(scene,x+bxx,y+2.4,z-1,.5,.4,.08,mat('isl_gauge',0x101010,{emissive:0xff8a2a,emissiveIntensity:1.2}),false);}
      for(const s of [-1,1])for(const wx of [-6,0,6])barredWin(x+wx,y+4.5,z+s*(d/2+.25),'z');label('CASA DAS CALDEIRAS',x,y+h-1,z-d/2-.3,Math.PI,'#ff4a6a','#fff',5.5,.9);
      const band=mat('isl_band',0xffffff,{map:(()=>{const p=paint(64,(u,v)=>(Math.floor(v*6)%2)?[235,60,50]:[245,245,240]);return p.map;})(),roughness:.6});for(const sx of [-6,0,6]){const cx=x+sx,cz=z+d/2+2.6,cy=H(cx,cz);cylinder(scene,cx,cy+12,cz,1.3,24,band,18,.85);cylinder(scene,cx,cy+24.2,cz,1,.5,dark,18);addBox(cx,cy,cz,2.4,24,2.4,null,true);emitters.push({type:'stack',x:cx,y:cy+24.6,z:cz});}
      landmarks.push({x,z:z-d/2-3,kind:'boiler'});}

    /* ==================== ESTAÇÃO DE TRATAMENTO (sudoeste) ==================== */
    {const x=-48,z=58,y=H(x,z);for(const [tx,tz,r] of [[-58,52,6],[-38,56,5.5],[-50,68,6.5]]){const ty=H(tx,tz);const g=new T.Group();g.position.set(tx,ty,tz);scene.add(g);mesh(cached(`isl_tank${r}`,()=>new T.CylinderGeometry(r,r,2.6,32,1,true)),mat('isl_tankWall',0xd8d4ca,{map:tex('concrete').map,side:T.DoubleSide}),g,0,1.3,0);mesh(cached(`isl_tankRim${r}`,()=>new T.TorusGeometry(r,.22,6,32).rotateX(Math.PI/2)),stripeY,g,0,2.6,0);const wd=mesh(cached(`isl_tankW${r}`,()=>new T.CircleGeometry(r-.1,32).rotateX(-Math.PI/2)),waterSmall,g,0,2.2,0,false);wd.userData.noBatch=true;
        const arm=new T.Group();arm.position.y=2.9;g.add(arm);box(arm,0,0,0,r*2,.25,1.2,grate);box(arm,0,.6,.55,r*2,.06,.06,rail);box(arm,0,.6,-.55,r*2,.06,.06,rail);cylinder(arm,0,0,0,.5,.8,dark,10);arm.traverse(o=>o.userData.noBatch=true);animated.push(t=>{arm.rotation.y=t*.12*(r>6?-1:1);});addBox(tx,ty,tz,r*1.6,2.6,r*1.6,null,true);}
      for(const [ax,az] of [[-26,66],[-26,74]]){const ay=H(ax,az);addBox(ax,ay,az-3.4,10,1.4,.4,concrete);addBox(ax,ay,az+3.4,10,1.4,.4,concrete);addBox(ax-5,ay,az,.4,1.4,7,concrete);addBox(ax+5,ay,az,.4,1.4,7,concrete);box(scene,ax,ay+1.1,az,9.6,.05,6.4,waterSmall,false);}
      room(-62,66,9,7,H(-62,66)+.2,3.4,P('pump',0x34d1c9),{e:[[0,2.2]]});slab(-62,66,9.4,7.4,H(-62,66)+3.9,prisonDark,.3);for(const s of [-2,2]){const p=cylinder(scene,-62+s,H(-62,66)+.8,66,.6,1.4,metal,12);addBox(-62+s,H(-62,66),66,1.3,1.4,1.3,null,true);}
      for(let i=0;i<3;i++){const cx=-56+i*5;box(scene,cx,H(cx,59)+1.8,59.5,4.8,.35,.35,mat('isl_pipeB',0x2a8cff,{metalness:.4,roughness:.4}));addBox(cx-2.2,H(cx-2.2,59.5),59.5,.25,1.8,.25,dark,false,false);}
      label('ESTAÇÃO DE TRATAMENTO',x+8,H(x+8,47.5)+3.4,47.5,Math.PI,'#2ae0c0','#123',6,.9);for(const s of [-1,1])addBox(x+8+s*2.8,H(x+8,47.5),47.5,.15,3.8,.15,white,false,false);
      landmarks.push({x:x+4,z:z-4,kind:'water'});}

    /* ==================== QUARTEL-GENERAL (oeste) ==================== */
    {const x=-80,z=4,y=H(x,z)+.3,w=16,d=8,f1=3.6;foundation(x,z,w+.6,d+.6,y,prisonDark);const olive=P('olive',0x7a8a4a);room(x,z,w,d,y,f1,olive,{e:[[1,2.2]],n:[[-4,2.2]]});room(x,z,w,d,y+f1,3.2,olive,{});const sz=z+d/2-1.1;
      slab(x,z-1.05,w-.3,d-2.6,y+f1,floorWood,.25);slab(x+(w/2+.5)/2,sz,w/2-.6,2.1,y+f1,floorWood,.25);stairs(x-w/2+.5,sz,'x+',10,y,woodDark,1.6,.36,.5);railingX(x-w/2+.4,x-w/2+5.4,sz-1,y+f1);slab(x,z,w+.4,d+.4,y+f1+3.5,prisonDark,.3);
      for(const fl of [0,1])for(const wx of [-5,0,5]){barredWin(x+wx,y+fl*f1+2,z-d/2-.22,'z');barredWin(x+wx,y+fl*f1+2,z+d/2+.22,'z');}for(const bx of [-5,-1,3])for(const fl of [0,1])bunk(x+bx,y+fl*f1,z-2,true);
      label('QUARTEL-GENERAL',x,y+f1+.4,z-d/2-.3,Math.PI,'#4c5a2a','#ffd21a',5,.9);
      const fpX=x+12,fpZ=z-6,fy=H(fpX,fpZ);addBox(fpX,fy,fpZ,.25,10,.25,white,false,false);const flag=new T.Mesh(new T.PlaneGeometry(3,1.9,8,1),new T.MeshStandardMaterial({map:(()=>{const p=paint(128,(u,v)=>v<.33?[255,201,60]:v<.66?[52,209,201]:[255,111,94]);return p.map;})(),side:T.DoubleSide,roughness:.7}));flag.position.set(fpX+1.55,fy+9,fpZ);flag.userData.noBatch=true;scene.add(flag);const fp=flag.geometry.attributes.position,base=fp.array.slice();animated.push(t=>{for(let i=0;i<fp.count;i++){const u=base[i*3]+1.5;fp.setZ(i,Math.sin(t*4+u*2.2)*.18*u/3);}fp.needsUpdate=true;});
      const sand=mat('isl_sandbag',0xc8b07a,{map:tex('fabric').map,roughness:1});for(const [sx,sz2,ax] of [[x+10,z+6,'x'],[x+12,z-1,'z'],[x-6,z+10,'x']]){const sy=H(sx,sz2);for(let r=0;r<3;r++)for(let i=0;i<6;i++){const o=(i-2.5)*.9+(r%2)*.45;box(scene,ax==='x'?sx+o:sx,sy+.2+r*.36,ax==='x'?sz2:sz2+o,ax==='x'?.86:.5,.36,ax==='x'?.5:.86,sand);}addBox(sx,sy,sz2,ax==='x'?5.4:.6,1.1,ax==='x'?.6:5.4,null,true);}
      {const bx=x+10,bz=z-12,by=H(bx,bz);addBox(bx,by,bz,7,2.2,5,prisonDark);box(scene,bx,by+1.6,bz+2.52,5,.3,.04,dark,false);}
      for(const [jx,jz,r] of [[x+6,z+10,.3],[x-10,z-10,1.7]]){const jy=H(jx,jz);const g=new T.Group();g.position.set(jx,jy,jz);g.rotation.y=r;scene.add(g);const jm=mat('isl_jeep',0x5a6a3a,{roughness:.6,metalness:.2});box(g,0,.8,0,3.6,.8,1.8,jm);box(g,-.4,1.4,0,1.6,.4,1.7,jm);box(g,.5,1.5,0,.06,.6,1.6,glass);for(const sx of [-1.2,1.2])for(const s2 of [-.9,.9]){const wl=cylinder(g,sx,.4,s2,.4,.3,dark,12);wl.rotation.x=Math.PI/2;}addBox(jx,jy,jz,3.8,1.6,3.8,null,true);}
      landmarks.push({x:x+10,z,kind:'hq'});}

    /* ---------- Estradas ---------- */
    roadPath([[-34,-48],[-22,-68],[-6,-79],[8,-74],[28,-60],[46,-40],[62,-30],[58,-8],[60,22],[44,36],[36,46],[26,54],[0,52],[-22,46],[-48,40],[-68,34],[-78,24],[-94,16],[-96,-6],[-92,-45]],6.5);
    roadPath([[0,-24],[0,-40],[-8,-58],[-22,-68]],6);roadPath([[0,24],[0,40],[0,52]],6);roadPath([[-62,-66],[-62,-45],[-62,-26]],6);roadPath([[-92,-45],[-62,-45],[-34,-45],[-34,-48]],6);
    // Postes ao longo da estrada principal, alternando os lados.
    {const ring=roads[0];let side=1;for(let i=6;i<ring.pts.length-1;i+=13){const a=ring.pts[i-1],b=ring.pts[i+1];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;const lx=ring.pts[i][0]-dz/l*side*(ring.w/2+1.3),lz=ring.pts[i][1]+dx/l*side*(ring.w/2+1.3);side=-side;if(!C.collidesAt(hash,lx,H(lx,lz),lz,1,2)&&H(lx,lz)>W+.3)lamp(lx,lz);}}

    /* ---------- Tirolesas ---------- */
    const zip=(a,b)=>{ziplines.push({a:new T.Vector3(...a),b:new T.Vector3(...b)});};
    zip([25,towerTop+3,-21],[50,H(52,-52)+.3+4.5+3,-50]);zip([-25,towerTop+3,21],[-40,H(-40,44)+3.2,44]);zip([-2,H(-6,-88)+3.2,-80],[-52,H(-52,-62)+3.2,-62]);zip([6,H(6,30)+3.2,30],[10,H(10,58)+3.2,58]);
    {const pts=[];const poleM=yellow;for(const z of ziplines){pts.push(z.a,z.b);for(const p of [z.a,z.b]){const gy=C.collidesAt(hash,p.x,p.y-3.4,p.z,.3,.5)?p.y-3.2:H(p.x,p.z);addBox(p.x,gy,p.z,.25,p.y-gy+.3,.25,poleM,false,false);box(scene,p.x,p.y+.3,p.z,.8,.15,.15,dark);}}const ln=new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x101418}));scene.add(ln);noBatch.add(ln);}

    /* ---------- Vegetação tropical ---------- */
    const frondTex=paint(128,(u,v)=>{const cx=Math.abs(u-.5);const leaf=cx<.02||(cx<.48*(Math.sin(v*Math.PI))&&((v*40+cx*18)%1)<.62);return leaf?[60+v*70,140+v*60,40+v*20,0,255]:[0,0,0,0,0];});
    const palmTrunk=cached('isl_palmTrunk',()=>{const parts=[];for(let i=0;i<7;i++){const t=i/7,bend=t*t*.9;parts.push({geo:new T.CylinderGeometry(.16-.06*t,.2-.06*t,1.05,8),matrix:M4(bend,.5+i,0,0,0,-t*.25),color:new T.Color(1,1,1).multiplyScalar(.75+((i%2)*.15))});}return mergeParts(parts);});
    const palmLeaves=cached('isl_palmLeaves',()=>{const parts=[];for(let i=0;i<9;i++){const g=new T.PlaneGeometry(1,4.2,1,6);g.translate(0,2.1,0);const p=g.attributes.position;for(let j=0;j<p.count;j++){const yy=p.getY(j);p.setZ(j,-(yy*yy)*.09);}g.rotateX(-Math.PI/2+.35);g.computeVertexNormals();parts.push({geo:g,matrix:M4(.9,7.1,0,0,i/9*Math.PI*2+(i%2)*.2,0),color:new T.Color(1,1,1).multiplyScalar(.8+(i%3)*.12)});}parts.push({geo:new T.SphereGeometry(.28,8,6),matrix:M4(.85,6.85,.2),color:new T.Color(.45,.32,.18)});parts.push({geo:new T.SphereGeometry(.26,8,6),matrix:M4(1.05,6.9,-.15),color:new T.Color(.42,.3,.16)});return mergeParts(parts);});
    const palms=[];for(let i=0;i<900&&palms.length<230;i++){const x=(R()-.5)*250,z=(R()-.5)*220,h=H(x,z);if(h<W+.5||C.collidesAt(hash,x,h,z,3,3)||roadDist(x,z)<2||indoors(x,z,3)||(Math.abs(x)<31&&Math.abs(z)<27))continue;if(h>W+2.5&&R()<.55)continue;palms.push({x,y:h,z,s:.8+R()*.5,r:R()*6});}
    const trunkMat=mat('isl_palmBark',0xffffff,{map:tex('bark').map,color:0xb89a78,roughness:.9}),leafMat=windify(new T.MeshStandardMaterial({map:frondTex.map,alphaTest:.5,side:T.DoubleSide,vertexColors:true,roughness:.75}),'palm',{amp:.012,base:5,flutter:.03});
    const trunk=new T.InstancedMesh(palmTrunk,trunkMat,palms.length),leaves=new T.InstancedMesh(palmLeaves,leafMat,palms.length),dm=new T.Object3D(),tc=new T.Color();palms.forEach((p,i)=>{dm.position.set(p.x,p.y-.1,p.z);dm.rotation.set(0,p.r,0);dm.scale.setScalar(p.s);dm.updateMatrix();trunk.setMatrixAt(i,dm.matrix);leaves.setMatrixAt(i,dm.matrix);leaves.setColorAt(i,tc.setRGB(.85+R()*.3,.95+R()*.15,.7+R()*.2));addBox(p.x,p.y,p.z,.45,6*p.s,.45,null,true,false);});trunk.castShadow=leaves.castShadow=true;trunk.receiveShadow=leaves.receiveShadow=true;scene.add(trunk,leaves);
    const bushGeo=cached('isl_bush',()=>mergeParts([[0,.3,0,.4],[.3,.22,.12,.3],[-.28,.24,-.1,.32],[.06,.25,-.3,.28]].map(([x,y,z,r],i)=>({geo:displace(new T.IcosahedronGeometry(1,1),.15,3,i+60),matrix:M4(x,y,z,0,i,0,r,r*.8,r),color:new T.Color(1,1,1).multiplyScalar(.6+y)}))));
    const bushes=[];for(let i=0;i<900&&bushes.length<380;i++){const x=(R()-.5)*250,z=(R()-.5)*220,h=H(x,z);if(h<W+.6||C.collidesAt(hash,x,h,z,1.2,1)||roadDist(x,z)<1.5||indoors(x,z,1.5)||(Math.abs(x)<28&&Math.abs(z)<24&&R()<.85))continue;bushes.push([x,h,z,.8+R()*1.3,R()*6]);}
    const bushIM=new T.InstancedMesh(bushGeo,windify(mat('isl_bushM',0x3fae3a,{vertexColors:true,roughness:.85}),'islbush',{amp:.06,base:.1,flutter:.01}),bushes.length);bushes.forEach((b,i)=>{dm.position.set(b[0],b[1],b[2]);dm.rotation.set(0,b[4],0);dm.scale.setScalar(b[3]);dm.updateMatrix();bushIM.setMatrixAt(i,dm.matrix);const hue=R();bushIM.setColorAt(i,hue<.15?tc.setRGB(1.6,.5,.9):hue<.25?tc.setRGB(1.7,1.2,.4):tc.setRGB(.8+R()*.3,.95+R()*.2,.7));});bushIM.castShadow=bushIM.receiveShadow=true;scene.add(bushIM);
    const rockGeo=cached('rock',()=>displace(new T.IcosahedronGeometry(1,1),.18,2.3,4)),rockMat=mat('isl_rock',0x9a948a,{map:tex('rock').map,normalMap:tex('rock').normalMap,roughness:.95,flatShading:true});const rocks=[];
    for(let i=0;i<1500&&rocks.length<120;i++){const a=R()*Math.PI*2,rr=60+R()*90,x=Math.cos(a)*rr,z=Math.sin(a)*rr,h=H(x,z);if(h<W-.75||h>W+1.2||C.collidesAt(hash,x,h,z,2,1)||roadDist(x,z)<2)continue;const s=.6+R()*2.2;rocks.push([x,h+s*.15,z,s]);if(s>1.1)addBox(x,h,z,s*1.4,s*.8,s*1.3,null,true);}
    const rockIM=new T.InstancedMesh(rockGeo,rockMat,rocks.length);rocks.forEach((r,i)=>{dm.position.set(r[0],r[1],r[2]);dm.rotation.set(R(),R()*6,R());dm.scale.set(r[3],r[3]*.7,r[3]*.9);dm.updateMatrix();rockIM.setMatrixAt(i,dm.matrix);});rockIM.castShadow=rockIM.receiveShadow=true;scene.add(rockIM);
    // Cobertura extra: caixotes e barris espalhados.
    const crate=mat('isl_crate',0xc8954a,{map:tex('planks').map}),barrelM=[mat('isl_barR',0xe8402a,{map:tex('metal').map,metalness:.4,roughness:.5}),mat('isl_barB',0x2a7ae8,{map:tex('metal').map,metalness:.4,roughness:.5}),mat('isl_barY',0xffc21a,{map:tex('metal').map,metalness:.4,roughness:.5})];
    for(let i=0;i<70;i++){const x=(R()-.5)*220,z=(R()-.5)*190,h=H(x,z);if(h<W+.5||C.collidesAt(hash,x,h,z,2.5,2)||roadDist(x,z)<1||indoors(x,z,1))continue;if(i%2)addBox(x,h,z,1.4,1.3,1.4,crate);else{for(let j=0;j<3;j++)cylinder(scene,x+(j%2)*.8,h+.5,z+Math.floor(j/2)*.8,.36,1,barrelM[(i+j)%3],12);addBox(x+.4,h,z+.4,1.6,1,1.6,null,true);}}

    /* ---------- Máscara de grama/terra ---------- */
    for(let j=0;j<256;j++)for(let i=0;i<256;i++){const x=-210+(i+.5)*420/256,z=-210+(j+.5)*420/256,h=H(x,z);let dens=1,dirt=0;if(h<W+.9)dens=0;else if(h<W+1.4)dens=(h-W-.9)/.5;
      if(Math.abs(x)<28&&Math.abs(z)<24){dens*=.25;dirt=.45;}if(indoors(x,z,.6))dens=0;
      for(const b of hash.query(x,z,1.6)){const bw=b.max.x-b.min.x,bd=b.max.z-b.min.z;if(bw<.8&&bd<.8)continue;const dx=Math.max(b.min.x-x,0,x-b.max.x),dz=Math.max(b.min.z-z,0,z-b.max.z),dd=Math.hypot(dx,dz);if(dd<1.4){dens=Math.min(dens,dd/1.4*.5);dirt=Math.max(dirt,(1.4-dd)/1.4*.6);}}
      const k=(j*256+i)*4;maskData[k]=dens*255;maskData[k+1]=Math.min(1,dirt)*255;maskData[k+2]=0;maskData[k+3]=255;}
    for(const r of roads)for(const p of r.pts){const ci=Math.floor((p[0]+210)/420*256),cj=Math.floor((p[1]+210)/420*256);for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>255||jj>255)continue;const d=Math.hypot(di,dj)*420/256;const kk=(jj*256+ii)*4;if(d<r.w/2+.8)maskData[kk]=0;else if(d<r.w/2+2.8){maskData[kk]=Math.min(maskData[kk],120);maskData[kk+1]=Math.max(maskData[kk+1],150);}}}
    maskTex.needsUpdate=true;
    const grass=buildGrass(maskTex);scene.add(grass);const flowers=buildFlowers(maskData);scene.add(flowers);
    const zone=makeZone(scene);
    batchStatics(scene,new Set([ground,water,zone,grass,flowers,...noBatch]));
    function update(dt,t){for(const f of animated)f(t);const n=uniforms.night.value;for(const m of nightBeams)m.opacity=n*.22;}
    return {hash,walls,cover,landmarks,ground,grass,flowers,trunk,leaves,water,zone,treePositions:palms,addBox,emitters,update,maskTex,ziplines,waterLevel:W,spawn:{x:-62,z:-40},spawnRing:[22,100],lootSpread:26,
      menuCam:{x:96,y:52,z:118,lx:-10,ly:4,lz:-6},isWater:(x,z)=>C.heightAt(x,z)<W-.05,roads:roads.map(r=>({pts:r.pts.filter((_,i)=>i%3===0),w:r.w})),mapColors:{land:[86,150,84],water:'#1aa8b8'},defaultHours:13.5};
  };
})(globalThis);
