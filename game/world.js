/* Aurora Royale 2.0 · arte procedural.
   Texturas, terreno, vegetação com vento, construções, personagens com esqueleto, céu dinâmico.
   Tudo é gerado em código: nenhum arquivo de imagem ou modelo externo. */
(function(root){
  'use strict';
  const T=THREE,C=BR;
  const random=C.rng(1089),materials={},geometries={};
  // Uniforms compartilhados por todos os shaders do mundo (vento, tempo, noite).
  const uniforms={time:{value:0},wind:{value:1},windDir:{value:new T.Vector2(.8,.6)},player:{value:new T.Vector3(0,-100,0)},night:{value:0},cloudShadow:{value:.35},cloudCover:{value:.42},rain:{value:0}};
  const cached=(key,make)=>geometries[key]||(geometries[key]=make());
  const boxGeo=(w,h,d)=>cached(`b${w},${h},${d}`,()=>new T.BoxGeometry(w,h,d));

  /* ---------- Ruído periódico (texturas sem emenda) ---------- */
  function hash2(x,y,s){let h=(x*374761393+y*668265263+s*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
  function vnoise(x,y,p,seed){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const x0=((xi%p)+p)%p,x1=(x0+1)%p,y0=((yi%p)+p)%p,y1=(y0+1)%p;const a=hash2(x0,y0,seed),b=hash2(x1,y0,seed),c=hash2(x0,y1,seed),d=hash2(x1,y1,seed);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
  function fbm(x,y,p,seed,oct=4){let s=0,amp=.5,f=1,n=0;for(let i=0;i<oct;i++){s+=vnoise(x*f,y*f,p*f,seed+i*17)*amp;n+=amp;amp*=.5;f*=2;}return s/n;}
  const c8=v=>v<0?0:v>255?255:v;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const mixc=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];

  function normalFromHeight(H,size,strength){const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d'),img=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const l=H[y*size+(x-1+size)%size],r=H[y*size+(x+1)%size],u=H[((y-1+size)%size)*size+x],d=H[((y+1)%size)*size+x];const nx=(l-r)*strength,ny=(d-u)*strength,len=Math.hypot(nx,ny,1),i=(y*size+x)*4;img.data[i]=(nx/len*.5+.5)*255;img.data[i+1]=(ny/len*.5+.5)*255;img.data[i+2]=(1/len*.5+.5)*255;img.data[i+3]=255;}
    ctx.putImageData(img,0,0);const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=8;return tx;}
  // fn(u,v,x,y) => [r,g,b,altura]
  function paint(size,fn,normal=0){const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d'),img=ctx.createImageData(size,size),H=normal?new Float32Array(size*size):null;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const o=fn(x/size,y/size,x,y),i=(y*size+x)*4;img.data[i]=c8(o[0]);img.data[i+1]=c8(o[1]);img.data[i+2]=c8(o[2]);img.data[i+3]=o[4]===undefined?255:c8(o[4]);if(H)H[y*size+x]=o[3]||0;}
    ctx.putImageData(img,0,0);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;return {map,normalMap:H?normalFromHeight(H,size,normal):null,canvas:cv};}
  const texCache={};
  function tex(kind){if(texCache[kind])return texCache[kind];const S=256;let t;
    switch(kind){
      case 'grass':t=paint(512,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,1,5),n2=fbm(u*24,v*24,24,2,3),s=hash2(x,y,3);let c=mixc([46,72,30],[104,132,58],n);c=mixc(c,[132,128,70],Math.max(0,n2-.58)*2.2);const k=(s-.5)*26;return [c[0]+k,c[1]+k,c[2]+k*.6];});break;
      case 'dirt':t=paint(S,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,5,5),s=hash2(x,y,7);let c=mixc([82,64,46],[132,104,74],n);if(s>.986)c=mixc(c,[150,146,136],.7);const k=(hash2(x,y,9)-.5)*18;return [c[0]+k,c[1]+k,c[2]+k,n];},2);break;
      case 'rock':t=paint(S,(u,v,x,y)=>{const n=fbm(u*6,v*6,6,11,5),r=1-Math.abs(fbm(u*4,v*4,4,13,4)*2-1);let c=mixc([92,90,86],[150,146,138],n);if(r>.9)c=mixc(c,[50,48,46],(r-.9)*8);const l=fbm(u*10,v*10,10,15,3);if(l>.66)c=mixc(c,[110,124,70],(l-.66)*2.5);const k=(hash2(x,y,4)-.5)*14;return [c[0]+k,c[1]+k,c[2]+k,n-(r>.9?(r-.9)*3:0)];},3);break;
      case 'sand':t=paint(S,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,21,4),k=(hash2(x,y,5)-.5)*22;const c=mixc([164,146,112],[196,180,140],n);return [c[0]+k,c[1]+k,c[2]+k,n];},1);break;
      case 'asphalt':t=paint(512,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,31,4),s=hash2(x,y,6),cr=1-Math.abs(fbm(u*6,v*6,6,33,4)*2-1);let g=52+n*22+(s-.5)*26;const vv=v;const track=Math.exp(-((vv-.3)**2)/.004)+Math.exp(-((vv-.7)**2)/.004);g-=track*7;if(cr>.94)g-=24;let c=[g,g+1,g+3];const line=(vv>.055&&vv<.085)||(vv>.915&&vv<.945);if(line&&fbm(u*20,v*4,20,35,2)>.32)c=mixc(c,[214,206,180],.85);if(vv<.03||vv>.97)c=mixc(c,[112,98,76],.7);return [c[0],c[1],c[2],s*.4+(cr>.94?-1:0)];},2.5);break;
      case 'plaster':t=paint(S,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,41,5),s=hash2(x,y,8);const g=212+n*34+(s-.5)*12;const stain=Math.max(0,fbm(u*3,v*3,3,43,3)-.55)*60;return [g-stain,g-stain*1.05,g-stain*1.2,n+s*.3];},1.5);break;
      case 'planks':t=paint(S,(u,v,x,y)=>{const rows=8,b=Math.floor(v*rows),fy=v*rows-b,off=hash2(b,0,51);const grain=fbm(u*2+off*3,v*40,2,52+b,4);const tone=.7+hash2(b,1,53)*.5;let g=[126*tone,90*tone,58*tone];g=mixc(g,[g[0]*.7,g[1]*.68,g[2]*.66],grain);const seam=Math.floor((u+off)*2)!==Math.floor((u+off)*2-.006);let h=1;if(fy<.06||fy>.94||seam){g=mixc(g,[30,22,16],.75);h=0;}return [g[0],g[1],g[2],h+grain*.2];},3);break;
      case 'roof':t=paint(S,(u,v,x,y)=>{const rows=8,r=Math.floor(v*rows),fy=v*rows-r,cols=8,sh=(r%2)*.5,cu=u*cols+sh,ci=Math.floor(cu),fx=cu-ci;const tone=.82+hash2(ci,r,61)*.36;const curve=1-Math.pow(Math.abs(fx-.5)*2,3)*.35;let k=(.55+fy*.6)*curve*tone;let c=[168*k,84*k,56*k];if(fy<.08)c=mixc(c,[40,22,16],.7);const moss=fbm(u*6,v*6,6,63,3);if(moss>.66)c=mixc(c,[86,96,56],(moss-.66)*2);return [c[0],c[1],c[2],fy*curve];},4);break;
      case 'bark':t=paint(S,(u,v,x,y)=>{const n=fbm(u*12,v*2,12,71,5),cr=1-Math.abs(fbm(u*10,v*1.5,10,73,4)*2-1);let c=mixc([58,44,34],[104,84,66],n);if(cr>.86)c=mixc(c,[26,20,16],(cr-.86)*5);return [c[0],c[1],c[2],n-(cr>.86?cr:0)];},3);break;
      case 'stone':t=paint(S,(u,v,x,y)=>{const rows=6,r=Math.floor(v*rows),fy=v*rows-r,sh=hash2(r,0,81)*.5,cu=u*4+sh,ci=Math.floor(cu),fx=cu-ci;const e=Math.min(fx,1-fx,fy*1.5,(1-fy)*1.5);const tone=.72+hash2(ci,r,83)*.4;const n=fbm(u*8,v*8,8,85,4);let c=[150*tone,142*tone,128*tone];c=mixc(c,[c[0]*.8,c[1]*.8,c[2]*.8],n);let h=Math.min(1,e*9);if(e<.06)c=[88,84,76];return [c[0],c[1],c[2],h+n*.3];},4);break;
      case 'corrugated':t=paint(S,(u,v,x,y)=>{const rib=Math.sin(u*Math.PI*2*16);let g=168+rib*20;const rust=fbm(u*5,v*5,5,91,4),streak=fbm(u*30,v*2,30,93,3);let c=[g,g,g];if(rust>.6)c=mixc(c,[120,64,34],Math.min(1,(rust-.6)*3));c=mixc(c,[c[0]*.75,c[1]*.75,c[2]*.75],Math.max(0,streak-.5));return [c[0],c[1],c[2],rib*.5];},2);break;
      case 'concrete':t=paint(S,(u,v,x,y)=>{const n=fbm(u*8,v*8,8,101,5),s=hash2(x,y,10);let g=146+n*30+(s-.5)*16;const seam=(x%128<2||y%128<2);if(seam)g-=30;const stain=Math.max(0,fbm(u*3,v*3,3,103,3)-.55)*70;return [g-stain,g-stain,g-stain*.95,seam?0:1];},1.2);break;
      case 'metal':t=paint(S,(u,v,x,y)=>{const n=fbm(u*64,v*2,64,111,3),s=hash2(x,y,11);const g=150+n*40+(s-.5)*10;return [g,g+3,g+5,n];},.6);break;
      case 'water':t=paint(S,(u,v)=>{let h=0;for(let i=0;i<4;i++)h+=vnoise(u*(4<<i),v*(4<<i),4<<i,121+i)/(1+i);return [128,128,255,h];},5);break;
      case 'soil':t=paint(S,(u,v,x,y)=>{const f=.5+.5*Math.sin(u*Math.PI*2*10);const n=fbm(u*8,v*8,8,131,4);const c=mixc([60,44,30],[104,78,52],f*.6+n*.4);return [c[0],c[1],c[2],f];},2);break;
      case 'fabric':t=paint(S,(u,v,x,y)=>{const w=((x>>1)+(y>>1))%2;const n=fbm(u*6,v*6,6,141,3);const g=170+w*14+n*30;return [g,g,g,w];},.8);break;
      default:t=paint(64,()=>[200,200,200]);
    }
    return texCache[kind]=t;}
  // Textura de ruído em tons de cinza (nuvens, sombras de nuvem, variação).
  let noiseTexture=null;
  function noiseTex(){if(noiseTexture)return noiseTexture;const S=256,data=new Uint8Array(S*S*4);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const v=fbm(x/S*6,y/S*6,6,151,6)*255,i=(y*S+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}noiseTexture=new T.DataTexture(data,S,S);noiseTexture.wrapS=noiseTexture.wrapT=T.RepeatWrapping;noiseTexture.magFilter=noiseTexture.minFilter=T.LinearFilter;noiseTexture.needsUpdate=true;return noiseTexture;}
  function spriteTex(kind){const key='sprite:'+kind;if(texCache[key])return texCache[key];const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');
    if(kind==='glow'){const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}
    else if(kind==='flash'){x.translate(64,64);for(let i=0;i<7;i++){x.rotate(Math.PI*2/7+.2);const g=x.createLinearGradient(0,0,60,0);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(0,-6);x.lineTo(58*(.6+hash2(i,1,3)*.4),0);x.lineTo(0,6);x.fill();}const g=x.createRadialGradient(0,0,0,0,0,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-64,-64,128,128);}
    else if(kind==='beam'){const g=x.createLinearGradient(0,S,0,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.35,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}
    else if(kind==='flower'){x.translate(64,64);for(let i=0;i<5;i++){x.rotate(Math.PI*2/5);x.fillStyle='#fff';x.beginPath();x.ellipse(0,-26,15,26,0,0,Math.PI*2);x.fill();}x.fillStyle='#f3c640';x.beginPath();x.arc(0,0,12,0,Math.PI*2);x.fill();}
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return texCache[key]=t;}

  /* ---------- Materiais ---------- */
  function mat(name,color,opts={}){if(materials[name])return materials[name];return materials[name]=new T.MeshStandardMaterial({color,roughness:.8,...opts});}
  // Materiais com UV em coordenadas de mundo: textura com a mesma densidade em todas as paredes.
  function worldMat(name,kind,color,scale,opts={}){if(materials[name])return materials[name];const t=tex(kind);const m=mat(name,color,{map:t.map,normalMap:t.normalMap||null,...opts});m.userData.worldUV=scale;return m;}
  function windify(material,key,{amp=.03,base=.2,flutter=.02}={}){material.onBeforeCompile=sh=>{sh.uniforms.uTime=uniforms.time;sh.uniforms.uWind=uniforms.wind;sh.uniforms.uWindDir=uniforms.windDir;sh.vertexShader='uniform float uTime;uniform float uWind;uniform vec2 uWindDir;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 ip=vec3(0.);
      #ifdef USE_INSTANCING
      ip=instanceMatrix[3].xyz;
      #endif
      float sway=sin(uTime*1.2+ip.x*.07+ip.z*.05)*.6+sin(uTime*2.1+ip.x*.13+ip.z*.11)*.3;
      float hk=max(position.y-${base.toFixed(3)},0.);
      transformed.xz+=uWindDir*sway*uWind*hk*hk*${amp.toFixed(4)};
      transformed+=normal*sin(uTime*7.+position.x*9.+position.y*7.+ip.x)*${flutter.toFixed(4)}*uWind;`);};material.customProgramCacheKey=()=>'wind-'+key;return material;}
  const nightMats=[];
  function emissiveMat(name,color,emissive,base=0,scale=4){const m=mat(name,color,{emissive,emissiveIntensity:base,roughness:.4});if(!nightMats.some(n=>n.m===m))nightMats.push({m,base,scale});return m;}
  function setNight(n){uniforms.night.value=n;for(const e of nightMats)e.m.emissiveIntensity=e.base+e.scale*n;if(materials.lightPool)materials.lightPool.opacity=n*.85;}

  /* ---------- Geometria utilitária ---------- */
  function mesh(geo,material,parent,x=0,y=0,z=0,shadow=true){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,x,y,z,w,h,d,material,shadow=true){return mesh(boxGeo(w,h,d),material,parent,x,y,z,shadow);}
  function cylinder(parent,x,y,z,r,h,material,segments=10,r2=r){return mesh(cached(`c${r},${r2},${h},${segments}`,()=>new T.CylinderGeometry(r2,r,h,segments)),material,parent,x,y,z);}
  const WHITE=new T.Color(1,1,1);
  // Junta várias peças em um só buffer não indexado (posição, normal, uv, cor e ossos opcionais).
  function mergeParts(parts,opts={}){let count=0;const list=parts.map(p=>{const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();if(p.matrix)g.applyMatrix4(p.matrix);count+=g.attributes.position.count;return {g,p};});
    const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=new Float32Array(count*2),col=new Float32Array(count*3),si=opts.skinned?new Uint16Array(count*4):null,sw=opts.skinned?new Float32Array(count*4):null;let o=0;
    for(const {g,p} of list){const n=g.attributes.position.count,guv=g.attributes.uv,gc=g.attributes.color,r=p.region||opts.region,c=p.color||WHITE;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);
      for(let i=0;i<n;i++){let u=guv?guv.getX(i):.5,v=guv?guv.getY(i):.5;if(r){if(p.solid){u=.5;v=.5;}u=r[0]+(r[2]-r[0])*(.06+.88*Math.min(1,Math.max(0,u)));v=r[1]+(r[3]-r[1])*(.06+.88*Math.min(1,Math.max(0,v)));}uv[(o+i)*2]=u;uv[(o+i)*2+1]=v;if(gc){col[(o+i)*3]=gc.getX(i);col[(o+i)*3+1]=gc.getY(i);col[(o+i)*3+2]=gc.getZ(i);}else{col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;}if(si){si[(o+i)*4]=p.bone||0;sw[(o+i)*4]=1;}}
      o+=n;g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('color',new T.BufferAttribute(col,3));if(si){g.setAttribute('skinIndex',new T.BufferAttribute(si,4));g.setAttribute('skinWeight',new T.BufferAttribute(sw,4));}g.computeBoundingSphere();g.computeBoundingBox();return g;}
  const M4=(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(sx,sy,sz));
  function displace(geo,amount,freq,seed){const g=geo.index?geo.toNonIndexed():geo;const p=g.attributes.position,v=new T.Vector3();const key=x=>Math.round(x*1000);const memo=new Map();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const k=key(v.x)+','+key(v.y)+','+key(v.z);let d=memo.get(k);if(d===undefined){d=(Math.sin(v.x*freq+seed)*Math.cos(v.y*freq*1.3+seed*2)+Math.sin(v.z*freq*1.7-seed))*amount;memo.set(k,d);}const len=v.length()||1;v.multiplyScalar(1+d/len);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;}

  /* ---------- Céu dinâmico ---------- */
  let skyUniforms=null;
  const SKY_VS='varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const SKY_FS=`uniform vec3 sunDir,zenith,horizon,sunColor;uniform float night,time,cloudCover,rain;uniform sampler2D tNoise;varying vec3 vDir;
    float cloudN(vec2 uv){return texture2D(tNoise,uv).r*.55+texture2D(tNoise,uv*2.17+.31).r*.3+texture2D(tNoise,uv*4.9-.17).r*.15;}
    void main(){vec3 d=normalize(vDir);float h=d.y;float day=1.-night;
      vec3 col=mix(horizon,zenith,pow(clamp(h,0.,1.),.42));
      col=mix(col,horizon*.45,smoothstep(0.,-.35,h));
      float mu=dot(d,sunDir);
      col+=sunColor*(pow(max(mu,0.),5.)*.22+pow(max(mu,0.),40.)*.55)*day*(1.-rain*.8);
      col+=sunColor*smoothstep(.99955,.9998,mu)*45.*day*(1.-rain)*step(-.02,h);
      vec3 md=-sunDir;float mm=dot(d,md);
      col+=vec3(.75,.82,1.)*(smoothstep(.99935,.9996,mm)*5.+pow(max(mm,0.),300.)*.4)*night*(1.-rain);
      if(night>.01&&h>0.){vec3 sp=d*190.;vec3 id=floor(sp);float s=fract(sin(dot(id,vec3(12.9898,78.233,45.164)))*43758.5453);float star=max(0.,1.-length(fract(sp)-.5)*2.6)*step(.9965,s);col+=vec3(.9,.95,1.)*star*(.6+.4*sin(time*3.+s*90.))*night*smoothstep(0.,.2,h)*4.*(1.-cloudCover);}
      if(h>0.){vec2 uv=d.xz/(h+.12)*.16+time*vec2(.0022,.001);float n=cloudN(uv);float cov=mix(.64,.3,cloudCover);float c=smoothstep(cov,cov+.24,n)*smoothstep(0.,.14,h);
        float lit=clamp(.5+.5*mu,0.,1.);vec3 cc=mix(horizon*.8+zenith*.15,sunColor*1.25+vec3(.2),lit*day*.85);cc=mix(cc,cc*.35,rain);cc=mix(cc,vec3(.015,.02,.035),night*.9);
        cc+=sunColor*pow(max(mu,0.),10.)*.9*day*(1.-smoothstep(cov,cov+.5,n));col=mix(col,cc,c*.94);}
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function sky(scene){if(!skyUniforms)skyUniforms={sunDir:{value:new T.Vector3(-.48,.6,-.62).normalize()},zenith:{value:new T.Color(.18,.38,.72)},horizon:{value:new T.Color(.75,.8,.85)},sunColor:{value:new T.Color(1,.9,.75)},night:uniforms.night,time:uniforms.time,cloudCover:uniforms.cloudCover,rain:uniforms.rain,tNoise:{value:noiseTex()}};
    const m=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:SKY_VS,fragmentShader:SKY_FS});const s=new T.Mesh(cached('sky',()=>new T.SphereGeometry(440,48,24)),m);s.frustumCulled=false;s.renderOrder=-10;scene.add(s);return s;}
  // Hora do dia → direção do sol, cores do céu, luzes e névoa.
  const tmpC=new T.Color();
  function atmosphere(hours,weather='clear'){const phi=Math.PI*(hours-6)/12;const sunDir=new T.Vector3(Math.cos(phi),Math.sin(phi)*.92,-.42).normalize();const sy=sunDir.y;
    const day=T.MathUtils.smoothstep(sy,-.12,.2),golden=(1-T.MathUtils.smoothstep(sy,.02,.38))*T.MathUtils.smoothstep(sy,-.12,.04);
    const rain=weather==='rain'?.75:weather==='storm'?1:0,cloud=weather==='clear'?.38:weather==='cloudy'?.78:weather==='fog'?.6:.95;
    const lerpC=(a,b,t)=>new T.Color(a).lerp(new T.Color(b),t);
    const zenith=lerpC(0x060d22,0x2a5d9e,day).lerp(new T.Color(0x3a3d70),golden*.35);
    const horizon=lerpC(0x16223c,0xbfcfd8,day).lerp(new T.Color(0xf09a5a),golden*.75);
    const sunColor=lerpC(0xff6a2a,0xfff0dc,T.MathUtils.smoothstep(sy,.02,.45));
    const grey=new T.Color(0x9aa3a8).multiplyScalar(day*.9+.05);
    zenith.lerp(grey,rain*.75);horizon.lerp(grey,rain*.7);
    const fog=horizon.clone().lerp(new T.Color(0xc9d2cf).multiplyScalar(day+.05),.25);
    const moonDir=sunDir.clone().negate();const lightDir=sy>-.05?sunDir:moonDir;
    return {sunDir,lightDir,day,night:1-day,golden,rain,cloud,zenith,horizon,sunColor,fog,
      sunIntensity:sy>-.05?3.6*T.MathUtils.smoothstep(sy,-.03,.15)*(1-rain*.75):1.1*(1-rain*.6),
      lightColor:sy>-.05?sunColor:new T.Color(0x9fb6ec),
      hemiSky:lerpC(0x3a4c80,0xb8d4ea,day).lerp(new T.Color(0xffc49a),golden*.3),hemiGround:lerpC(0x1a2024,0x5d6b44,day),hemiIntensity:1.0+1.25*day,
      fogDensity:(weather==='fog'?.012:.0034)+rain*.006};}
  function setSky(a){skyUniforms.sunDir.value.copy(a.sunDir);skyUniforms.zenith.value.copy(a.zenith);skyUniforms.horizon.value.copy(a.horizon);skyUniforms.sunColor.value.copy(a.sunColor);uniforms.cloudCover.value=a.cloud;uniforms.rain.value=a.rain;uniforms.cloudShadow.value=(.18+a.cloud*.25)*a.day;setNight(a.night);}

  /* ---------- Mundo ---------- */
  function buildWorld(scene){
    const hash=new C.SpatialHash(12),walls=[],cover=[],landmarks=[],animated=[],emitters=[],noBatch=new Set();
    const stone=worldMat('stone','stone',0xffffff,.45,{roughness:.95,normalScale:new T.Vector2(.9,.9)}),wood=worldMat('wood','planks',0xffffff,.5,{roughness:.85}),woodDark=worldMat('woodDark','planks',0x6e5240,.6,{roughness:.9}),floorWood=worldMat('floorWood','planks',0xc9a37a,.55,{roughness:.7});
    const road=mat('road',0xffffff,{map:tex('asphalt').map,normalMap:tex('asphalt').normalMap,roughness:.92}),roof=worldMat('roof','roof',0xffffff,.42,{roughness:.8}),roofSlate=worldMat('roofSlate','roof',0x8e9ba6,.42,{roughness:.75});
    const metal=worldMat('metal','metal',0xb4c0bf,.5,{metalness:.7,roughness:.38}),dark=mat('dark',0x2a3233,{metalness:.4,roughness:.6}),glass=mat('glass',0x16262c,{metalness:.9,roughness:.06,envMapIntensity:1.4}),concrete=worldMat('concrete','concrete',0xffffff,.22,{roughness:.95});
    const windowLit=emissiveMat('windowLit',0x26343a,0xffb46a,0,2.4),lampBulb=emissiveMat('lampBulb',0x8a8a82,0xffd9a0,0,9),neon=emissiveMat('neon',0x1e6f78,0x5ff2ff,1.2,4);
    const plasters=[worldMat('plaster0','plaster',0xeadfc6,.3),worldMat('plaster1','plaster',0x9fb5b6,.3),worldMat('plaster2','plaster',0xd9ae8a,.3),worldMat('plaster3','plaster',0xc8c3b6,.3)];
    const doors=[mat('door0',0x6d3b2a,{map:tex('planks').map}),mat('door1',0x2f4f5e,{map:tex('planks').map}),mat('door2',0x55663c,{map:tex('planks').map})];
    const shutterM=[mat('shutter0',0x3d6a6e,{map:tex('planks').map}),mat('shutter1',0x7a3b30,{map:tex('planks').map}),mat('shutter2',0x4c5a3a,{map:tex('planks').map})];
    const lightPool=materials.lightPool||(materials.lightPool=new T.MeshBasicMaterial({map:spriteTex('glow'),color:new T.Color(1,.7,.4),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));lightPool.userData.shared=true;
    function addBox(x,y,z,w,h,d,material,invisible=false,canCover=true){if(!invisible&&material)box(scene,x,y+h/2,z,w,h,d,material);const b={min:{x:x-w/2,y,z:z-d/2},max:{x:x+w/2,y:y+h,z:z+d/2}};if(invisible||!material)b.invisible=true;hash.insert(b);walls.push(b);if(canCover&&h>.7&&h<4){cover.push({x:x+w/2+1.2,z});cover.push({x:x-w/2-1.2,z});}return b;}
    function patch(x,z,w,d,material,lift=.06,seg=2){const g=new T.PlaneGeometry(w,d,Math.max(1,Math.ceil(w/seg)),Math.max(1,Math.ceil(d/seg)));g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,C.heightAt(p.getX(i)+x,p.getZ(i)+z)+lift);g.computeVertexNormals();const m=new T.Mesh(g,material);m.position.set(x,0,z);m.receiveShadow=true;scene.add(m);return m;}
    const pool=(x,z,size=6)=>patch(x,z,size,size,lightPool,.08,size/2);

    /* Terreno com mistura de grama, terra, rocha e areia + sombras de nuvem. */
    const terrainGeo=new T.PlaneGeometry(420,420,210,210);terrainGeo.rotateX(-Math.PI/2);const tp=terrainGeo.attributes.position,col=new Float32Array(tp.count*3);
    for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i);tp.setY(i,C.heightAt(x,z));const b=.86+fbm((x+210)/420*16,(z+210)/420*16,16,7,3)*.3;col.set([b,b,b],i*3);}
    terrainGeo.setAttribute('color',new T.BufferAttribute(col,3));terrainGeo.computeVertexNormals();
    const maskData=new Uint8Array(256*256*4),maskTex=new T.DataTexture(maskData,256,256);maskTex.magFilter=maskTex.minFilter=T.LinearFilter;
    const terrainMat=mat('terrain',0xffffff,{vertexColors:true,roughness:1});
    terrainMat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{tGrass:{value:tex('grass').map},tDirt:{value:tex('dirt').map},tRock:{value:tex('rock').map},tSand:{value:tex('sand').map},tMask:{value:maskTex},tNoise:{value:noiseTex()},uTime:uniforms.time,uCloudShadow:uniforms.cloudShadow,uWindDir:uniforms.windDir,uIsland:{value:C.MAP.id==='island'?1:0},uWater:{value:C.MAP.water}});
      sh.vertexShader='varying vec3 vWPos;varying vec3 vWNrm;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.)).xyz;vWNrm=normalize(objectNormal);');
      sh.fragmentShader='uniform sampler2D tGrass,tDirt,tRock,tSand,tMask,tNoise;uniform float uTime,uCloudShadow,uIsland,uWater;uniform vec2 uWindDir;varying vec3 vWPos;varying vec3 vWNrm;\n'+sh.fragmentShader.replace('#include <map_fragment>',`
        vec2 wp=vWPos.xz;
        vec3 gA=texture2D(tGrass,wp*.19).rgb;vec3 gB=texture2D(tGrass,wp*.029+.37).rgb;
        float macro=texture2D(tNoise,wp*.004).r;
        vec3 grass=gA*(.55+dot(gB,vec3(.6)))*mix(vec3(.92,1.02,.86),vec3(1.1,1.02,.8),macro);
        vec4 m=texture2D(tMask,(wp+210.)/420.);
        vec3 dirt=texture2D(tDirt,wp*.23).rgb;
        vec3 rock=texture2D(tRock,vec2(wp.x+wp.y*.3,vWPos.y)*.16).rgb*.5+texture2D(tRock,wp*.11).rgb*.5;
        vec3 sand=texture2D(tSand,wp*.21).rgb;
        float slope=1.-clamp(vWNrm.y,0.,1.);
        float aur=1.-uIsland;
        float quarry=aur*smoothstep(60.,78.,wp.x)*smoothstep(-55.,-75.,wp.y);
        float farm=aur*smoothstep(66.,80.,wp.y)*smoothstep(62.,48.,wp.x);
        float shore=aur*(1.-smoothstep(27.,35.,length(wp-vec2(130.))))+uIsland*(1.-smoothstep(uWater+.35,uWater+1.05+macro*.5,vWPos.y));
        vec3 col=grass*mix(vec3(1.),vec3(1.18,1.05,.7),farm*.55)*mix(vec3(1.),vec3(.92,1.22,.72),uIsland);
        col=mix(col,dirt,clamp(m.g*1.15+(macro-.5)*.25*m.g,0.,1.));
        col=mix(col,sand,max(quarry*.82,shore));
        float rk=smoothstep(.14,.32,slope+(gB.g-.4)*.25);
        col=mix(col,rock,max(rk,quarry*.4*step(.55,macro+gA.g)));
        if(uIsland>.5){float wet=1.-smoothstep(uWater-.1,uWater+.35,vWPos.y);col*=mix(1.,.72,wet);col=mix(col,col*vec3(.75,1.05,1.1),1.-smoothstep(uWater-1.2,uWater,vWPos.y));}
        diffuseColor.rgb*=col;`).replace('#include <dithering_fragment>',`#include <dithering_fragment>
        float cs=smoothstep(.45,.75,texture2D(tNoise,(vWPos.xz+uWindDir*uTime*3.)*.0045).r);
        gl_FragColor.rgb*=1.-cs*uCloudShadow;`);};
    terrainMat.customProgramCacheKey=()=>'terrain';
    const ground=mesh(terrainGeo,terrainMat,scene,0,0,0,false);
    if(C.MAP.id==='island')return root.Art.buildIsland({scene,hash,walls,cover,landmarks,animated,emitters,noBatch,addBox,patch,pool,ground,maskData,maskTex,stone,wood,woodDark,floorWood,road,roof,roofSlate,metal,dark,glass,concrete,windowLit,lampBulb,neon,plasters,doors,shutterM,lightPool,makeZone,buildGrass,buildFlowers,batchStatics});

    function ribbon(axis,offset,width){const vertices=[],uv=[],idx=[];for(let i=0;i<=100;i++){const t=-195+i*3.9;for(const s of [-1,1]){const x=axis==='x'?t:offset+s*width/2,z=axis==='x'?offset+s*width/2:t;vertices.push(x,C.heightAt(x,z)+.07,z);uv.push(i/8,(s+1)/2);}if(i<100){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();if(axis==='z'){/* normal sempre para cima */}const m=mesh(g,road,scene,0,0,0,false);m.userData.noBatch=true;}
    ribbon('x',0,9);ribbon('z',0,9);ribbon('z',-111,6);ribbon('z',117,6);ribbon('x',124,6);
    const lane=mat('lane',0xd7cfaa,{roughness:.6});for(let t=-182;t<190;t+=12){if(Math.abs(t)<6)continue;box(scene,t,C.heightAt(t,0)+.085,0,4,.015,.17,lane,false);box(scene,0,C.heightAt(0,t)+.085,t,.17,.015,4,lane,false);}

    function sign(text,x,z,angle=0,sub=''){const y=C.heightAt(x,z);const cv=document.createElement('canvas');cv.width=512;cv.height=160;const cx=cv.getContext('2d');const g=cx.createLinearGradient(0,0,0,160);g.addColorStop(0,'#2b4640');g.addColorStop(1,'#1a2c29');cx.fillStyle=g;cx.fillRect(0,0,512,160);cx.strokeStyle='#d8e6cc';cx.lineWidth=6;cx.strokeRect(10,10,492,140);cx.fillStyle='#f1f5e2';cx.textAlign='center';cx.textBaseline='middle';cx.font='bold 40px Segoe UI, sans-serif';cx.fillText(text,256,sub?66:80);if(sub){cx.font='22px Segoe UI, sans-serif';cx.fillStyle='#e7b76b';cx.fillText(sub,256,112);}const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;const gr=new T.Group();gr.position.set(x,y,z);gr.rotation.y=angle;scene.add(gr);for(const s of [-1,1])box(gr,s*2.2,1.5,0,.14,3,.14,metal);box(gr,0,2.5,0,5,1.5,.12,new T.MeshStandardMaterial({map:tx,roughness:.7,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.05}));addBox(x,y,z,.4,3,.4,null,true,false);}
    sign('AURORA • SETOR CENTRAL',8,11,-Math.PI/2,'ENCRUZILHADA');sign('VILA AURORA',-102,13,0,'POP. 214');sign('COMPLEXO 07',108,16,0,'ÁREA INDUSTRIAL');sign('FAZENDA',9,105,-Math.PI/2,'SANTA LUZIA');

    /* Casas detalhadas: mesma colisão da versão 1.0, visual completo. */
    const gableGeo=(D,hr)=>cached(`gable${D},${hr}`,()=>{const s=new T.Shape();s.moveTo(-D/2,0);s.lineTo(D/2,0);s.lineTo(0,hr);s.lineTo(-D/2,0);const g=new T.ExtrudeGeometry(s,{depth:.3,bevelEnabled:false});g.translate(0,0,-.15);g.rotateY(Math.PI/2);return g;});
    function gableRoof(x,y,z,W,D,material,wallM){const pitch=.6,hr=D/2*Math.tan(pitch),L=D/2/Math.cos(pitch)+.55;for(const s of [-1,1]){const slab=box(scene,x,y+hr/2-.05,z+s*D/4+s*.12,W,.2,L,material);slab.rotation.x=s*pitch;}box(scene,x,y+hr+.02,z,W+.1,.18,.42,woodDark);for(const s of [-1,1]){const gm=mesh(gableGeo(D-.2,hr-.1),wallM,scene,x+s*(W/2-.62),y,z);gm.castShadow=true;}return hr;}
    function windowAt(x,y,z,axis,shutter,lit=true){const along=axis==='x';const w=1.5,h=1.5;const gm=lit&&random()<.55?windowLit:glass;
      if(along){box(scene,x,y,z,.06,h,w,gm);box(scene,x,y+h/2+.06,z,.2,.12,w+.3,woodDark);box(scene,x,y-h/2-.06,z,.28,.12,w+.4,woodDark);for(const s of [-1,1])box(scene,x,y,z+s*(w/2+.06),.2,h+.2,.12,woodDark);box(scene,x,y,z,.1,h,.06,woodDark);box(scene,x,y,z,.1,.06,w,woodDark);const sx=Math.sign(x-(scene.userData.cx||0));for(const s of [-1,1]){const sh=box(scene,x,y,z+s*(w/2+.55),.08,h+.1,.75,shutter);sh.rotation.y=s*.25;}}
      else{box(scene,x,y,z,w,h,.06,gm);box(scene,x,y+h/2+.06,z,w+.3,.12,.2,woodDark);box(scene,x,y-h/2-.06,z,w+.4,.12,.28,woodDark);for(const s of [-1,1])box(scene,x+s*(w/2+.06),y,z,.12,h+.2,.2,woodDark);box(scene,x,y,z,.06,h,.1,woodDark);box(scene,x,y,z,w,.06,.1,woodDark);for(const s of [-1,1]){const sh=box(scene,x+s*(w/2+.55),y,z,.75,h+.1,.08,shutter);sh.rotation.y=s*.25;}}}
    const flowerBox=mat('flowerBox',0xd8574a,{roughness:.7}),flowerBox2=mat('flowerBox2',0xf0c84a,{roughness:.7}),bedSheet=mat('bedSheet',0xe8e4d8,{map:tex('fabric').map}),blanket=[mat('blanket0',0x7a3b3b,{map:tex('fabric').map}),mat('blanket1',0x3b5a7a,{map:tex('fabric').map}),mat('blanket2',0x5a6b3b,{map:tex('fabric').map})],rug=mat('rug',0x8a4a32,{map:tex('fabric').map});
    function house(x,z,w=11,d=10,index=0){const y=C.heightAt(x,z)+.35,wm=plasters[index%plasters.length];
      addBox(x,y-.8,z,w+.6,.8,d+.6,stone,false,false);
      addBox(x-w/2,y,z,.45,4.2,d,wm);addBox(x+w/2,y,z,.45,4.2,d,wm);addBox(x,y,z-d/2,w,4.2,.45,wm);
      const side=(w-2.4)/2;addBox(x-w/2+side/2,y,z+d/2,side,4.2,.45,wm);addBox(x+w/2-side/2,y,z+d/2,side,4.2,.45,wm);addBox(x,y+2.75,z+d/2,2.4,1.45,.45,wm,false,false);
      box(scene,x,y+.03,z,w-.4,.05,d-.4,floorWood,false);box(scene,x,y+4.1,z,w-.2,.12,d-.2,woodDark,false);
      for(const sx of [-1,1])for(const sz of [-1,1])box(scene,x+sx*w/2,y+2.1,z+sz*d/2,.56,4.25,.56,woodDark);
      for(const sz of [-1,1])box(scene,x,y+4.12,z+sz*d/2,w+.56,.24,.56,woodDark);for(const sx of [-1,1])box(scene,x+sx*w/2,y+4.12,z,.56,.24,d+.56,woodDark);
      for(const s of [-1,1])box(scene,x+s*1.25,y+1.4,z+d/2,.18,2.8,.6,woodDark);box(scene,x,y+2.86,z+d/2,2.68,.18,.6,woodDark);
      box(scene,x-1.12,y+1.36,z+d/2-.62,.08,2.66,1.08,doors[index%3]);box(scene,x-1.05,y+1.3,z+d/2-.95,.06,.06,.1,metal,false);
      const shut=shutterM[(index+1)%3];
      for(const sx of [-1,1])for(const dz of [-2.4,2.4]){windowAt(x+sx*(w/2+.26),y+2.2,z+dz,'x',shut);box(scene,x+sx*(w/2+.42),y+1.3,z+dz,.3,.25,1.4,random()<.5?flowerBox:flowerBox2);}
      for(const sx of [-1,1])windowAt(x+sx*w/4,y+2.2,z-d/2-.26,'z',shut);
      if(side>2.6)for(const sx of [-1,1])windowAt(x+sx*(w/2-side/2),y+2.2,z+d/2+.26,'z',shut);
      gableRoof(x,y+4.22,z,w+1.3,d+1.3,index%2?roofSlate:roof,wm);
      const cx=x+w*.27,cz=z-d*.2;box(scene,cx,y+6.2,cz,.9,3.6,.9,stone);box(scene,cx,y+8.05,cz,1.1,.2,1.1,concrete);
      // Mobília interna (colisões preservadas da 1.0).
      addBox(x-2,y,z-2,2.4,.9,1.1,null,true);box(scene,x-2,y+.86,z-2,2.5,.08,1.2,wood);for(const sx of [-1,1])for(const sz of [-1,1])box(scene,x-2+sx*1.1,y+.43,z-2+sz*.48,.09,.86,.09,woodDark);
      for(const s of [-1,1]){box(scene,x-2+s*.7,y+.48,z-1.05,.48,.06,.48,wood);box(scene,x-2+s*.7,y+.75,z-.83,.48,.55,.06,wood);box(scene,x-2+s*.7,y+.24,z-1.05,.4,.48,.4,woodDark,false);}
      addBox(x+3,y,z-2.5,1.5,1,2.7,null,true);box(scene,x+3,y+.25,z-2.5,1.6,.5,2.8,woodDark);box(scene,x+3,y+.6,z-2.5,1.45,.22,2.6,bedSheet);box(scene,x+3,y+.74,z-2.2,1.5,.1,1.9,blanket[index%3]);box(scene,x+3,y+.78,z-3.5,1.1,.16,.42,bedSheet);box(scene,x+3,y+.9,z-3.85,1.6,1.3,.1,woodDark);
      box(scene,x-w/2+.55,y+1,z+1.6,.45,2,1.8,wood);for(let k=0;k<3;k++)box(scene,x-w/2+.55,y+.4+k*.62,z+1.6,.5,.05,1.75,woodDark,false);addBox(x-w/2+.55,y,z+1.6,.45,2,1.8,null,true,false);
      box(scene,x+.5,y+.07,z+1,3,.03,2.2,rug,false);
      box(scene,x,y+3.85,z,.22,.12,.22,lampBulb,false);
      box(scene,x+1.7,y+2.55,z+d/2+.42,.2,.28,.2,lampBulb,false);box(scene,x+1.7,y+2.75,z+d/2+.32,.08,.08,.3,metal,false);pool(x+1.2,z+d/2+2.6,7);
      box(scene,x,y-.2,z+d/2+.85,2.8,.3,1,stone);
      landmarks.push({x,z,kind:'house',w,d});
    }
    for(const x of [-135,-91])for(const z of [-38,-13,28,53])house(x,z,10+(z===28?3:0),10,Math.floor(random()*4));

    /* Contêineres com metal corrugado. */
    const containerMats=[0x47666c,0xa1603c,0x5d6d52,0x8c2f2a,0x2f4a6e].map((c,i)=>worldMat('container'+i,'corrugated',c,.5,{metalness:.5,roughness:.55}));
    function container(x,z,color,length=12){const y=C.heightAt(x,z),m=containerMats[color%containerMats.length];addBox(x,y,z,3,2.7,length,m);box(scene,x,y+2.72,z,3.04,.06,length+.04,dark,false);for(const s of [-1,1])box(scene,x,y+1.35,z+s*(length/2+.02),3.02,2.74,.06,dark,false);for(const s of [-.5,.5])box(scene,x+s,y+1.3,z+length/2+.07,.05,2.5,.07,metal,false);landmarks.push({x,z,kind:'container'});}
    for(let i=0;i<12;i++)container(90+(i%4)*14,-40+Math.floor(i/4)*25,i%3);
    house(139,46,18,14,1);house(96,49,12,10,1);

    /* Observatório. */
    const oy=C.heightAt(0,-137);addBox(0,oy,-137,22,1,18,concrete);house(-22,-135,10,9,1);
    for(const sx of [-1,1])for(const sz of [-1,1])addBox(sx*5,oy+1,-137+sz*5,.4,15,.4,metal,false,false);
    for(let k=1;k<5;k++)for(const s of [-1,1]){const b1=box(scene,s*5,oy+1+k*3,-137,.12,.12,10.4,metal,false);const b2=box(scene,0,oy+1+k*3,-137+s*5,10.4,.12,.12,metal,false);}
    box(scene,0,oy+15.8,-137,12,.5,12,metal);const dishM=mat('dish',0xe8eef0,{roughness:.35,metalness:.2});const dish=mesh(cached('dish',()=>new T.SphereGeometry(4,24,12,0,Math.PI*2,0,Math.PI*.32)),dishM,scene,0,oy+19,-137);dish.rotation.x=Math.PI*.75;dish.rotation.z=.3;cylinder(scene,0,oy+23,-137,.12,10,metal,8);box(scene,0,oy+28.2,-137,.3,.3,.3,mat('beacon',0x400000,{emissive:0xff2020,emissiveIntensity:3}),false);
    // Sacos de areia.
    const sandbag=mat('sandbag',0x9a8a62,{map:tex('fabric').map,roughness:1});
    function sandbags(x,z,len,axis='x'){const y=C.heightAt(x,z);for(let r=0;r<3;r++)for(let i=0;i<len;i++){const o=(i-(len-1)/2)*.9+(r%2)*.45;const m=box(scene,axis==='x'?x+o:x,y+.2+r*.36,axis==='x'?z:z+o,axis==='x'?.86:.5,.36,axis==='x'?.5:.86,sandbag);m.rotation.y=(random()-.5)*.12;}addBox(x,y,z,axis==='x'?len*.9:.6,1.1,axis==='x'?.6:len*.9,null,true);}
    sandbags(-8,-124,6);sandbags(8,-124,6);sandbags(14,-140,5,'z');

    /* Pedreira: rochas instanciadas e escavadeira. */
    const rockGeo=cached('rock',()=>displace(new T.IcosahedronGeometry(1,1),.18,2.3,4));const rockMat=mat('rockMat',0xa49c8c,{map:tex('rock').map,normalMap:tex('rock').normalMap,roughness:.95,flatShading:true});
    const rockList=[];for(let i=0;i<34;i++){const x=80+random()*87,z=-165+random()*75,y=C.heightAt(x,z),sz=2+random()*5;rockList.push({x,y:y+sz*.3,z,sx:sz,sy:sz*.65,sz:sz*.85,r:random()*6});addBox(x,y,z,sz*1.35,sz*.7,sz*1.2,null,true);}
    const ey=C.heightAt(119,-110),yellow=mat('yellow',0xd8a83a,{roughness:.55,metalness:.3});addBox(119,ey,-110,4,1.2,5,dark);box(scene,119,ey+2.7,-110,2.8,2.2,3,yellow);box(scene,119,ey+2.9,-108.7,2.5,1.4,.06,glass,false);const boom=box(scene,123,ey+4,-110,8,.5,.5,yellow);boom.rotation.z=.6;const arm2=box(scene,127.2,ey+4.4,-110,.45,4,.45,yellow);arm2.rotation.z=-.3;box(scene,127.6,ey+2.2,-110,1.4,.9,1.2,dark);for(const s of [-1,1])box(scene,119,ey+.45,-110+s*2.1,4.6,.9,.8,dark);

    /* Porto. */
    for(let i=0;i<8;i++)container(-150+(i%4)*18,103+Math.floor(i/4)*30,i%5);
    const py=C.heightAt(-116,140),crane=mat('crane',0xc8a040,{roughness:.6,metalness:.3});addBox(-116,py,140,.8,16,.8,crane,false,false);box(scene,-116,py+16,140,27,.7,.7,crane);box(scene,-127,py+16.5,140,4,1.6,1.6,concrete);box(scene,-116,py+15,140,1.6,1.4,1.6,crane);cylinder(scene,-107,py+11,140,.05,10,dark,6);box(scene,-107,py+5.6,140,.9,.5,.9,dark);
    patch(-122,118,58,50,concrete,.04,4);

    /* Fazenda: casas, celeiro, moinho, caixa d'água, milharal. */
    house(35,134,14,13,2);house(-35,113,11,9,0);
    patch(-23,156,52,26,mat('soil',0xffffff,{map:tex('soil').map,normalMap:tex('soil').normalMap,roughness:1}),.05,2);
    const barnRed=worldMat('barnRed','planks',0x9a3428,.5,{roughness:.85});
    {const x=26,z=102,w=14,d=10,y=C.heightAt(x,z)+.3;addBox(x,y-.7,z,w+.4,.7,d+.4,concrete,false,false);addBox(x-w/2,y,z,.4,5,d,barnRed);addBox(x+w/2,y,z,.4,5,d,barnRed);addBox(x,y,z+d/2,w,5,.4,barnRed);const sd=(w-4.4)/2;addBox(x-w/2+sd/2,y,z-d/2,sd,5,.4,barnRed);addBox(x+w/2-sd/2,y,z-d/2,sd,5,.4,barnRed);addBox(x,y+4,z-d/2,4.4,1,.4,barnRed,false,false);
      for(const s of [-1,1]){box(scene,x+s*2.3,y+2,z-d/2-.3,.25,4,.25,mat('trimWhite',0xe8e2d4)) ;const dr=box(scene,x+s*3.1,y+1.9,z-d/2-.7,1.9,3.8,.12,barnRed);dr.rotation.y=s*.5;}
      box(scene,x,y+.03,z,w-.4,.05,d-.4,floorWood,false);gableRoof(x,y+5,z,w+1,d+1.4,roofSlate,barnRed);box(scene,x,y+6.1,z-d/2-.25,1.6,1.4,.1,woodDark,false);
      const hay=mat('hay',0xd8b860,{map:tex('fabric').map,roughness:1});for(let i=0;i<6;i++){const hx=x-4+(i%3)*2.2,hz=z+2.6+Math.floor(i/3)*1.6;const hb=cylinder(scene,hx,y+.7,hz,.7,1.4,hay,14);hb.rotation.z=Math.PI/2;}addBox(x-1.8,y,z+3.4,6.6,1.4,3.2,null,true);
      for(let i=0;i<5;i++){const hx=x+10+i*1.8,hz=z-7+(i%2)*1.4,hy=C.heightAt(hx,hz);const hb=cylinder(scene,hx,hy+.7,hz,.7,1.4,hay,14);hb.rotation.x=Math.PI/2;addBox(hx,hy,hz,1.4,1.4,1.4,null,true);}
      landmarks.push({x,z,kind:'barn'});}
    {const x=-62,z=104,y=C.heightAt(x,z);const tower=mat('millTower',0xe2dccf,{map:tex('plaster').map,roughness:.9});cylinder(scene,x,y+6,z,2.4,12,tower,16,1.6);addBox(x,y,z,3.6,12,3.6,null,true);const cap=mesh(cached('millCap',()=>new T.ConeGeometry(2.1,2.2,16)),roof,scene,x,y+13.1,z);cap.castShadow=true;
      const rotor=new T.Group();rotor.position.set(x,y+11.6,z+2.2);scene.add(rotor);cylinder(rotor,0,0,0,.25,.6,dark,10).rotation.x=Math.PI/2;for(let i=0;i<4;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI/2;rotor.add(arm);box(arm,0,3.4,0,.18,6.6,.12,woodDark);box(arm,.55,3.9,0,.9,5.2,.04,mat('sail',0xeee8d8,{map:tex('fabric').map,side:T.DoubleSide}));}rotor.traverse(o=>o.userData.noBatch=true);animated.push(t=>{rotor.rotation.z=t*.6*uniforms.wind.value;});landmarks.push({x,z,kind:'windmill'});}
    {const x=46,z=96,y=C.heightAt(x,z);for(const sx of [-1,1])for(const sz of [-1,1]){const leg=box(scene,x+sx*1.6,y+5,z+sz*1.6,.3,10,.3,metal);addBox(x+sx*1.6,y,z+sz*1.6,.4,10,.4,null,true,false);}const tank=mat('tank',0x8fa4a6,{map:tex('corrugated').map,metalness:.6,roughness:.5});cylinder(scene,x,y+12,z,2.6,4,tank,20);mesh(cached('tankTop',()=>new T.ConeGeometry(2.8,1.4,20)),tank,scene,x,y+14.7,z).castShadow=true;}
    const cornM=windify(mat('corn',0xffffff,{vertexColors:true,side:T.DoubleSide,roughness:.8}),'corn',{amp:.05,base:.1,flutter:.03});
    const cornGeo=cached('cornGeo',()=>{const parts=[{geo:new T.BoxGeometry(.05,2,.05),matrix:M4(0,1,0),color:new T.Color(.36,.5,.18)}];for(let i=0;i<6;i++){const a=i*2.4,h=.5+i*.24;parts.push({geo:new T.PlaneGeometry(.12,.9),matrix:M4(Math.sin(a)*.25,h,Math.cos(a)*.25,.9,a,0),color:new T.Color(.42,.58,.2).multiplyScalar(.8+i*.06)});}parts.push({geo:new T.ConeGeometry(.07,.35,6),matrix:M4(0,2.1,0),color:new T.Color(.82,.7,.35)});return mergeParts(parts);});
    const cornPos=[];for(let r=0;r<20;r++)for(let n=0;n<34;n++){const x=-47+n*1.45+(random()-.5)*.4,z=145+r*1.25+(random()-.5)*.3;cornPos.push([x,C.heightAt(x,z),z,.8+random()*.4,random()*6]);}
    const corn=new T.InstancedMesh(cornGeo,cornM,cornPos.length);{const dm=new T.Object3D();cornPos.forEach((p,i)=>{dm.position.set(p[0],p[1],p[2]);dm.rotation.set(0,p[4],0);dm.scale.set(1,p[3],1);dm.updateMatrix();corn.setMatrixAt(i,dm.matrix);});}corn.castShadow=true;corn.receiveShadow=true;scene.add(corn);

    /* Água com ondas animadas e espuma na margem. */
    const wt=tex('water');wt.normalMap.repeat.set(7,7);
    const waterMat=new T.MeshStandardMaterial({color:0x0f4652,roughness:.05,metalness:.1,transparent:true,opacity:.9,normalMap:wt.normalMap,normalScale:new T.Vector2(.55,.55),envMapIntensity:1.3});
    waterMat.onBeforeCompile=sh=>{sh.uniforms.uTime=uniforms.time;sh.fragmentShader='uniform float uTime;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',`
      vec3 n1=texture2D(normalMap,vNormalMapUv+uTime*vec2(.011,.007)).xyz*2.-1.;
      vec3 n2=texture2D(normalMap,vNormalMapUv*1.73-uTime*vec2(.009,-.012)).xyz*2.-1.;
      vec3 mapN=normalize(vec3((n1.xy+n2.xy)*normalScale,n1.z*n2.z));
      normal=normalize(tbn*mapN);`);};waterMat.customProgramCacheKey=()=>'water';
    const water=new T.Mesh(cached('water',()=>{const g=new T.CircleGeometry(31,64);g.rotateX(-Math.PI/2);return g;}),waterMat);water.position.set(130,-1.3,130);water.receiveShadow=true;scene.add(water);
    const foamTex=paint(256,(u,v)=>{const n=fbm(u*16,v*4,16,171,4);return [255,255,255,0,Math.max(0,n-.45)*500*Math.sin(v*Math.PI)];});const foam=new T.Mesh(cached('foam',()=>{const g=new T.RingGeometry(28.5,31.6,96,1);g.rotateX(-Math.PI/2);return g;}),new T.MeshBasicMaterial({map:foamTex.map,transparent:true,opacity:.55,depthWrite:false,color:0xdfeee8}));foam.position.set(130,-1.22,130);scene.add(foam);noBatch.add(foam);
    animated.push(t=>{foam.material.opacity=.4+Math.sin(t*.8)*.15;foam.rotation.y=t*.01;});
    const jetty=new T.Group();scene.add(jetty);for(let i=0;i<12;i++){const z=92+i*2;box(jetty,130,-.7,z,5,.22,1.95,wood);if(i%3===0)for(const sx of [-1,1])cylinder(jetty,130+sx*2.1,-2,z,.14,3.6,woodDark);}house(104,88,9,8,1);
    {const boat=new T.Group();boat.position.set(121,-1.25,124);scene.add(boat);const hull=mat('hull',0x7a4a2e,{map:tex('planks').map});box(boat,0,.15,0,1.4,.4,3.6,hull);box(boat,0,.4,1.7,1.1,.3,.4,hull);for(const z of [-.6,.6])box(boat,0,.38,z,1.3,.06,.35,wood);const oar=box(boat,.9,.5,0,.06,.06,2.6,wood);oar.rotation.y=.3;boat.traverse(o=>o.userData.noBatch=true);animated.push(t=>{boat.position.y=-1.25+Math.sin(t*1.3)*.05;boat.rotation.z=Math.sin(t*1.1)*.04;boat.rotation.x=Math.sin(t*.9)*.03;boat.rotation.y=.4+Math.sin(t*.1)*.15;});}

    /* Posto de combustível na Encruzilhada. */
    {const x=-24,z=-18,y=C.heightAt(x,z);patch(x,z,30,24,concrete,.05,2);const white=mat('stationWhite',0xe9e9e4,{roughness:.5,metalness:.1}),brand=mat('brand',0xe7a53a,{roughness:.4,emissive:0xe7a53a,emissiveIntensity:.15});
      for(const sx of [-1,1])for(const sz of [-1,1])addBox(x+sx*5,y,z+sz*3,.5,4.6,.5,white,false,false);box(scene,x,y+4.85,z,13,.5,9,white);box(scene,x,y+4.85,z+4.56,13.1,.62,.12,brand,false);box(scene,x,y+4.85,z-4.56,13.1,.62,.12,brand,false);for(const s of [-3.5,0,3.5])box(scene,x+s,y+4.57,z,2.6,.06,.9,lampBulb,false);pool(x,z,14);
      for(const sz of [-1.6,1.6]){addBox(x,y,z+sz,4.2,.22,1.1,concrete,false,false);for(const sx of [-1.2,1.2]){addBox(x+sx,y+.22,z+sz,.7,1.6,.5,mat('pump',0xc8352e,{roughness:.45}),false,true);box(scene,x+sx,y+1.45,z+sz+.26,.45,.3,.02,neon,false);}}
      const sx0=x-3,sz0=z-11;addBox(sx0,y,sz0-3,10,3.6,.35,plasters[3]);addBox(sx0-5,y,sz0,.35,3.6,6,plasters[3]);addBox(sx0+5,y,sz0,.35,3.6,6,plasters[3]);addBox(sx0-3.2,y,sz0+3,3.6,3.6,.35,plasters[3]);addBox(sx0+3.2,y,sz0+3,3.6,3.6,.35,plasters[3]);box(scene,sx0,y+1.8,sz0+3,2.8,3.4,.06,glass,false);box(scene,sx0,y+3.75,sz0,10.6,.3,6.6,white);box(scene,sx0,y+3.4,sz0+3.25,10.6,.7,.15,brand,false);box(scene,sx0,y+.03,sz0,9.6,.05,5.6,floorWood,false);
      addBox(sx0+3.2,y,sz0-1.6,2.6,1.1,.8,null,true);box(scene,sx0+3.2,y+.55,sz0-1.6,2.6,1.1,.8,mat('counter',0x6a3f2c,{roughness:.6}));box(scene,sx0-3,y+1,sz0-1.8,1.2,2,.8,metal);box(scene,sx0-3,y+1.2,sz0-1.39,1,1.5,.03,windowLit,false);
      const cv=document.createElement('canvas');cv.width=256;cv.height=512;const c2=cv.getContext('2d');c2.fillStyle='#16302c';c2.fillRect(0,0,256,512);c2.fillStyle='#e7a53a';c2.fillRect(0,0,256,150);c2.fillStyle='#1a2a28';c2.font='bold 52px Segoe UI';c2.textAlign='center';c2.fillText('AURORA',128,95);c2.fillStyle='#e8f0e0';c2.font='28px Segoe UI';['GASOLINA','DIESEL','ETANOL'].forEach((n,i)=>{c2.fillText(n,128,210+i*110);c2.fillStyle='#7fe8a0';c2.font='bold 40px Consolas';c2.fillText(['5,79','6,12','3,99'][i],128,255+i*110);c2.fillStyle='#e8f0e0';c2.font='28px Segoe UI';});const st=new T.CanvasTexture(cv);st.colorSpace=T.SRGBColorSpace;
      const px=x+9,pz=z+9,pyy=C.heightAt(px,pz);addBox(px,pyy,pz,.4,6,.4,metal,false,false);box(scene,px,pyy+7,pz,2.2,4.4,.4,new T.MeshStandardMaterial({map:st,emissive:0xffffff,emissiveMap:st,emissiveIntensity:.15,roughness:.5}));
      for(let i=0;i<3;i++)box(scene,sx0-6+i*.0,y+.5+i*.0,sz0+5+i*1.1,.8,1,.8,mat('barrelRed',0x8c2c22,{map:tex('metal').map,metalness:.4,roughness:.5}));addBox(sx0-6,y,sz0+6.1,1,1,3.2,null,true);
      landmarks.push({x,z,kind:'station'});}

    /* Galpão industrial. */
    {const x=152,z=14,w=18,d=14,h=7,y=C.heightAt(x,z)+.2,wallM=worldMat('warehouse','corrugated',0x8a979a,.4,{metalness:.5,roughness:.5});addBox(x,y-.6,z,w+.4,.6,d+.4,concrete,false,false);addBox(x-w/2,y,z,.4,h,d,wallM);addBox(x+w/2,y,z,.4,h,d,wallM);addBox(x,y,z+d/2,w,h,.4,wallM);const sd=(w-6)/2;addBox(x-w/2+sd/2,y,z-d/2,sd,h,.4,wallM);addBox(x+w/2-sd/2,y,z-d/2,sd,h,.4,wallM);addBox(x,y+4.6,z-d/2,6,h-4.6,.4,wallM,false,false);box(scene,x,y+h+.12,z,w+.8,.25,d+.8,containerMats[0]);for(const s of [-5,0,5])box(scene,x+s,y+h-.15,z,.5,.15,d-1,lampBulb,false);box(scene,x,y+.03,z,w-.4,.05,d-.4,concrete,false);
      for(let i=0;i<4;i++){const cx=x-5+i*2.8;addBox(cx,y,z+3,2.2,2.2,2.2,mat('crate',0xb08a5a,{map:tex('planks').map}));}addBox(x+5,y,z-1,3,2.7,6,containerMats[3]);landmarks.push({x,z,kind:'warehouse'});}

    /* Cabana e fogueira no Bosque Norte. */
    {const x=-128,z=-116,y=C.heightAt(x,z)+.3,logM=worldMat('logs','bark',0x8a6a50,.6);addBox(x,y-.6,z,8.6,.6,7.6,stone,false,false);addBox(x-4,y,z,.5,3.2,7,logM);addBox(x+4,y,z,.5,3.2,7,logM);addBox(x,y,z-3.5,8,3.2,.5,logM);addBox(x-2.5,y,z+3.5,3,3.2,.5,logM);addBox(x+2.5,y,z+3.5,3,3.2,.5,logM);addBox(x,y+2.3,z+3.5,2,.9,.5,logM,false,false);box(scene,x,y+.03,z,7.4,.05,6.4,floorWood,false);gableRoof(x,y+3.15,z,9.2,8.4,roofSlate,logM);windowAt(x-4.27,y+1.7,z,'x',shutterM[2]);
      const fx=x+2,fz=z+8,fy=C.heightAt(fx,fz);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(scene,fx+Math.cos(a)*.7,fy+.12,fz+Math.sin(a)*.7,.32,.24,.28,rockMat);}for(let i=0;i<3;i++){const l=cylinder(scene,fx,fy+.15,fz,.09,1.1,woodDark,6);l.rotation.z=Math.PI/2;l.rotation.y=i*1.05;}emitters.push({type:'fire',x:fx,y:fy+.2,z:fz});
      for(const s of [-1,1]){const lg=cylinder(scene,fx+s*2,fy+.22,fz,.22,1.8,logM,8);lg.rotation.z=Math.PI/2;}landmarks.push({x,z,kind:'cabin'});}

    /* Postes de luz, fiação e carros abandonados. */
    for(let t=-180;t<=180;t+=36){if(Math.abs(t)<10)continue;for(const [lx,lz,ax] of [[t,(t/36)%2?5.6:-5.6,'x'],[(t/36)%2?-5.6:5.6,t,'z']]){const ly=C.heightAt(lx,lz);addBox(lx,ly,lz,.24,6.2,.24,dark,false,false);const dir=ax==='x'?-Math.sign(lz):-Math.sign(lx);if(ax==='x'){box(scene,lx,ly+6.1,lz+dir*.9,.12,.12,1.9,dark);box(scene,lx,ly+6,lz+dir*1.8,.38,.14,.7,dark,false);box(scene,lx,ly+5.91,lz+dir*1.8,.3,.04,.55,lampBulb,false);pool(lx,lz+dir*2.2,9);}else{box(scene,lx+dir*.9,ly+6.1,lz,1.9,.12,.12,dark);box(scene,lx+dir*1.8,ly+6,lz,.7,.14,.38,dark,false);box(scene,lx+dir*1.8,ly+5.91,lz,.55,.04,.3,lampBulb,false);pool(lx+dir*2.2,lz,9);}}}
    const poleM=worldMat('pole','bark',0x6a5848,.8),wirePts=[];let prev=null;
    for(let t=-190;t<=190;t+=30){let px=t;const pz=-7.5;while(C.collidesAt(hash,px,C.heightAt(px,pz),pz,1.2,2))px+=3;const y=C.heightAt(px,pz);addBox(px,y,pz,.3,8.5,.3,poleM,false,false);box(scene,px,y+8,pz,.14,.14,2.4,poleM);const tops=[-1,0,1].map(s=>new T.Vector3(px,y+8.1,pz+s*1.05));if(prev)for(let k=0;k<3;k++){const a=prev[k],b=tops[k];for(let i=0;i<10;i++){const p0=a.clone().lerp(b,i/10),p1=a.clone().lerp(b,(i+1)/10);p0.y-=Math.sin(Math.PI*i/10)*1.3;p1.y-=Math.sin(Math.PI*(i+1)/10)*1.3;wirePts.push(p0,p1);}}prev=tops;}
    const wires=new T.LineSegments(new T.BufferGeometry().setFromPoints(wirePts),new T.LineBasicMaterial({color:0x1a1a1a}));scene.add(wires);
    const carColors=[0x9c2b25,0x2a4f7a,0xd8d4c8,0x3b5a3a,0x2a2a2a,0xb88a2a,0x6a7a80];const carMats=carColors.map((c,i)=>mat('car'+i,c,{metalness:.55,roughness:.32}));const tire=mat('tire',0x151515,{roughness:.9}),burnt=mat('burnt',0x262220,{roughness:1,map:tex('rock').map}),headlight=emissiveMat('headlight',0xdddddd,0xfff4d8,.05,1.5);
    function car(x,z,alongX,index,wrecked=false){const y=C.heightAt(x,z),g=new T.Group();g.position.set(x,y,z);g.rotation.y=(alongX?0:Math.PI/2)+(random()-.5)*.25;scene.add(g);const body=wrecked?burnt:carMats[index%carMats.length];box(g,0,.62,0,4.2,.7,1.8,body);box(g,-.2,1.22,0,2.3,.6,1.62,glass);box(g,-.2,1.53,0,2.2,.06,1.6,body);box(g,1.6,.62,0,1,.72,1.82,body);for(const sx of [-1.35,1.35])for(const sz of [-1,1]){const w=cylinder(g,sx,.36,sz*.88,.36,.25,tire,12);w.rotation.x=Math.PI/2;}if(!wrecked)for(const sz of [-.6,.6])box(g,2.11,.68,sz,.04,.14,.3,headlight,false);addBox(x,y,z,alongX?4.4:2,1.6,alongX?2:4.4,null,true);if(wrecked)emitters.push({type:'smoke',x,y:y+1.2,z});}
    [[-60,2.6,1],[44,-2.4,1],[-150,-2.6,1],[2.6,62,0],[-2.4,-70,0],[2.4,-160,0],[150,2.5,1],[-2.6,170,0],[-108.6,-60,0],[119.6,80,0],[-90,126.5,1],[70,121.6,1]].forEach(([x,z,a],i)=>car(x,z,!!a,i,i%5===3));
    // Barreiras de concreto, barris e caixotes.
    const barrier=worldMat('barrier','concrete',0xd8d2c4,.4);for(const [x,z,a] of [[8,-14,0],[-14,8,1],[14,14,0],[-8,-30,1],[110,-6,1],[124,6,1],[-104,40,0],[-118,-30,0]]){const y=C.heightAt(x,z);addBox(x,y,z,a?3:.7,.95,a?.7:3,barrier);}
    const barrelM=[mat('barrelBlue',0x2d4f7a,{map:tex('metal').map,metalness:.5,roughness:.45}),mat('barrelRust',0x7a4a2a,{map:tex('rock').map,metalness:.3,roughness:.8}),materials.barrelRed];
    for(const [x,z] of [[-136,96],[-100,134],[104,-48],[132,30],[-20,-128],[150,-20],[60,-60]]){const y=C.heightAt(x,z);for(let i=0;i<4;i++){const bx=x+(i%2)*.75,bz=z+Math.floor(i/2)*.75;cylinder(scene,bx,y+.5,bz,.36,1,barrelM[(i+Math.round(x))%3],12);}addBox(x+.37,y,z+.37,1.6,1,1.6,null,true);}
    const crateM=mat('crate',0xb08a5a,{map:tex('planks').map});for(const [x,z] of [[-140,118],[-112,108],[96,-30],[120,-28],[-30,122],[40,-120]]){const y=C.heightAt(x,z);addBox(x,y,z,1.3,1.3,1.3,crateM);addBox(x+1.4,y,z+.2,1.3,1.3,1.3,crateM);box(scene,x+.6,y+1.95,z+.1,1.3,1.3,1.3,crateM);}

    /* Cobertura espalhada (como na 1.0). */
    const scatter=[];for(let i=0;i<75;i++){const x=(random()-.5)*350,z=(random()-.5)*350,y=C.heightAt(x,z);if(Math.abs(x)<10||Math.abs(z)<10||C.collidesAt(hash,x,y,z,3,2)||Math.hypot(x-130,z-130)<35)continue;const h=.65+random()*.7;addBox(x,y,z,1.6,h,1.5,i%3?crateM:metal);scatter.push({x,z});}

    /* Árvores instanciadas: pinheiros, carvalhos e bétulas com vento. */
    const treePositions=[];for(let i=0;i<820;i++){const x=(random()-.5)*380,z=(random()-.5)*380,y=C.heightAt(x,z);const forest=Math.hypot(x+118,z+120)<60;if(!forest&&random()<.25)continue;if(Math.abs(x)<12||Math.abs(z)<12||C.collidesAt(hash,x,y,z,4,3)||Math.hypot(x-130,z-130)<38||(x>65&&z<-65)||(x>75&&Math.abs(z)<65)||(x<-70&&z>80)||(z>140&&z<172&&x>-52&&x<6)||(x>-42&&x<-6&&z>-34&&z<-2))continue;const r=random();treePositions.push({x,y,z,s:3+random()*3,type:forest?(r<.75?0:2):(r<.45?0:r<.85?1:2),rot:random()*6});}
    const barkM=mat('bark',0xffffff,{map:tex('bark').map,normalMap:tex('bark').normalMap,roughness:.95});
    const trunkGeo=cached('trunk',()=>{const g=new T.CylinderGeometry(.045,.075,1,8,3);g.translate(0,.5,0);return displace(g,.004,30,1);});
    const pineGeo=cached('pine',()=>{const parts=[];for(let k=0;k<5;k++){const r=.3-k*.052,h=.3,y=.2+k*.155;const g=new T.ConeGeometry(r,h,11,2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);const a=Math.atan2(vz,vx),j=1+Math.sin(a*11+k)*.08+Math.sin(a*5+k*3)*.06;p.setXYZ(i,vx*j,vy-(vy<-.1?.03:0),vz*j);}g.computeVertexNormals();parts.push({geo:g,matrix:M4(0,y+h/2,0,0,k*.7,0),color:new T.Color(.62+k*.09,.68+k*.07,.6+k*.08)});}return mergeParts(parts);});
    const oakGeo=cached('oak',()=>{const blobs=[[0,.64,0,.27],[.19,.56,.06,.2],[-.18,.58,-.05,.21],[.05,.55,.2,.2],[-.06,.57,-.2,.19],[.02,.82,.02,.2],[.14,.74,-.12,.16],[-.13,.75,.12,.16]];const parts=blobs.map(([x,y,z,r],i)=>({geo:displace(new T.IcosahedronGeometry(1,1),.14,3.1,i*1.7),matrix:M4(x,y,z,0,i,0,r,r*.85,r),color:new T.Color(1,1,1).multiplyScalar(.55+y*.55)}));parts.push({geo:new T.CylinderGeometry(.018,.03,.32,5),matrix:M4(.1,.42,0,0,0,-.7),color:new T.Color(.3,.24,.18)});parts.push({geo:new T.CylinderGeometry(.016,.028,.3,5),matrix:M4(-.09,.44,.03,0,0,.65),color:new T.Color(.3,.24,.18)});return mergeParts(parts);});
    const birchGeo=cached('birch',()=>{const parts=[];for(let i=0;i<5;i++){const y=.48+i*.11;parts.push({geo:displace(new T.IcosahedronGeometry(1,1),.12,3.4,i*2.3+9),matrix:M4(Math.sin(i*2.1)*.04,y,Math.cos(i*2.1)*.04,0,i,0,.15-i*.012,.14,.15-i*.012),color:new T.Color(1,1,1).multiplyScalar(.62+i*.09)});}return mergeParts(parts);});
    const foliage=[windify(mat('leavesPine',0x3f5e3a,{vertexColors:true,roughness:.92}),'pine',{amp:.04,base:.15,flutter:.004}),windify(mat('leavesOak',0x587a35,{vertexColors:true,roughness:.88}),'oak',{amp:.05,base:.35,flutter:.012}),windify(mat('leavesBirch',0x8fae4a,{vertexColors:true,roughness:.85}),'birch',{amp:.06,base:.35,flutter:.015})];
    const byType=[[],[],[]];treePositions.forEach(t=>byType[t.type].push(t));
    const trunk=new T.InstancedMesh(trunkGeo,barkM,treePositions.length),leaves=new T.Group(),dummy=new T.Object3D(),tc=new T.Color();
    treePositions.forEach((v,i)=>{const s=v.s;if(v.type===0)dummy.scale.set(s*.95,s*1.15,s*.95);else if(v.type===1)dummy.scale.set(s*1.55,s*1.05,s*1.55);else dummy.scale.set(s*.8,s*1.6,s*.8);dummy.position.set(v.x,v.y-.1,v.z);dummy.rotation.set(0,v.rot,0);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);trunk.setColorAt(i,v.type===2?tc.setRGB(2.4,2.3,2.1):tc.setRGB(1,1,1));addBox(v.x,v.y,v.z,.5,v.s,.5,null,true,false);});
    [pineGeo,oakGeo,birchGeo].forEach((geo,type)=>{const list=byType[type];if(!list.length)return;const im=new T.InstancedMesh(geo,foliage[type],list.length);list.forEach((v,i)=>{const s=v.s;if(type===0)dummy.scale.set(s*1.25,s*1.95,s*1.25);else if(type===1)dummy.scale.set(s*1.25,s*1.45,s*1.25);else dummy.scale.set(s*.95,s*1.75,s*.95);dummy.position.set(v.x,v.y,v.z);dummy.rotation.set(0,v.rot,0);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);const h=random();im.setColorAt(i,tc.setRGB(.85+h*.3,.9+h*.18,.8+random()*.2));});im.castShadow=im.receiveShadow=true;leaves.add(im);});
    trunk.castShadow=trunk.receiveShadow=true;scene.add(trunk,leaves);
    // Arbustos, rochas e troncos caídos.
    const bushGeo=cached('bush',()=>mergeParts([[0,.25,0,.32],[.25,.18,.1,.24],[-.22,.2,-.08,.26],[.05,.2,-.25,.22]].map(([x,y,z,r],i)=>({geo:displace(new T.IcosahedronGeometry(1,1),.15,3,i+30),matrix:M4(x,y,z,0,i,0,r,r*.8,r),color:new T.Color(1,1,1).multiplyScalar(.6+y)}))));
    const bushes=[];for(let i=0;i<520;i++){const x=(random()-.5)*380,z=(random()-.5)*380,y=C.heightAt(x,z);if(Math.abs(x)<7||Math.abs(z)<7||C.collidesAt(hash,x,y,z,1.2,1)||Math.hypot(x-130,z-130)<33||(x>65&&z<-65))continue;bushes.push([x,y,z,.8+random()*1.4,random()*6]);}
    const bushIM=new T.InstancedMesh(bushGeo,windify(mat('bushM',0x56763a,{vertexColors:true,roughness:.9}),'bush',{amp:.06,base:.1,flutter:.01}),bushes.length);bushes.forEach((b,i)=>{dummy.position.set(b[0],b[1],b[2]);dummy.rotation.set(0,b[4],0);dummy.scale.setScalar(b[3]);dummy.updateMatrix();bushIM.setMatrixAt(i,dummy.matrix);bushIM.setColorAt(i,tc.setRGB(.8+random()*.35,.85+random()*.25,.75+random()*.2));});bushIM.castShadow=true;bushIM.receiveShadow=true;scene.add(bushIM);
    for(let i=0;i<70;i++){const x=(random()-.5)*370,z=(random()-.5)*370,y=C.heightAt(x,z);if(Math.abs(x)<8||Math.abs(z)<8||C.collidesAt(hash,x,y,z,2,1.5)||Math.hypot(x-130,z-130)<34)continue;const sz=.5+random()*1.6;rockList.push({x,y:y+sz*.2,z,sx:sz,sy:sz*.7,sz:sz*.9,r:random()*6});if(sz>1)addBox(x,y,z,sz*1.4,sz*.8,sz*1.3,null,true);}
    const rocks=new T.InstancedMesh(rockGeo,rockMat,rockList.length);rockList.forEach((r,i)=>{dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.r,0);dummy.scale.set(r.sx,r.sy,r.sz);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);});rocks.castShadow=rocks.receiveShadow=true;scene.add(rocks);
    const logList=[];for(let i=0;i<30;i++){const x=(random()-.5)*360,z=(random()-.5)*360,y=C.heightAt(x,z);if(Math.abs(x)<8||Math.abs(z)<8||C.collidesAt(hash,x,y,z,2.5,1)||Math.hypot(x-130,z-130)<34)continue;logList.push([x,y,z,random()*6]);addBox(x,y,z,2.6,.7,2.6,null,true,false);}
    const logGeo=cached('log',()=>{const g=new T.CylinderGeometry(.3,.34,4,10);g.rotateZ(Math.PI/2);return g;});const logs=new T.InstancedMesh(logGeo,barkM,Math.max(1,logList.length));logList.forEach((l,i)=>{dummy.position.set(l[0],l[1]+.28,l[2]);dummy.rotation.set(0,l[3],0);dummy.scale.setScalar(1);dummy.updateMatrix();logs.setMatrixAt(i,dummy.matrix);});logs.count=logList.length;logs.castShadow=logs.receiveShadow=true;scene.add(logs);
    // Juncos na margem do lago.
    const reedPos=[];for(let i=0;i<420;i++){const a=random()*Math.PI*2,r=29+random()*5,x=130+Math.cos(a)*r,z=130+Math.sin(a)*r;if(Math.abs(x-130)<4&&z<130)continue;reedPos.push([x,C.heightAt(x,z),z,.5+random()*.6,random()*6]);}
    const reeds=new T.InstancedMesh(cornGeo,cornM,reedPos.length);reedPos.forEach((p,i)=>{dummy.position.set(p[0],p[1]-.2,p[2]);dummy.rotation.set(0,p[4],0);dummy.scale.set(.6,p[3],.6);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);});reeds.receiveShadow=true;scene.add(reeds);

    /* Máscara de grama/terra (lida pelos shaders do terreno e da grama). */
    for(let j=0;j<256;j++)for(let i=0;i<256;i++){const x=-210+(i+.5)*420/256,z=-210+(j+.5)*420/256;let dens=1,dirt=0;
      const roadD=Math.min(Math.abs(z),Math.abs(x),Math.abs(x+111)+1.5,Math.abs(x-117)+1.5,Math.abs(z-124)+1.5);if(roadD<5.5)dens=0;else if(roadD<8){dirt=Math.max(dirt,(8-roadD)/2.5*.8);dens=Math.min(dens,(roadD-5.5)/2.5);}
      if(Math.hypot(x-130,z-130)<33)dens=0;if(x>68&&z<-65)dens*=.12;if(x>-48&&x<2&&z>143&&z<170){dens=.05;dirt=1;}if(x>-152&&x<-92&&z>93&&z<143){dens*=.15;dirt=Math.max(dirt,.5);}if(x>-40&&x<-8&&z>-31&&z<-5){dens=0;}
      for(const b of hash.query(x,z,1.6)){const w=b.max.x-b.min.x,d=b.max.z-b.min.z;if(w<.8&&d<.8)continue;const dx=Math.max(b.min.x-x,0,x-b.max.x),dz=Math.max(b.min.z-z,0,z-b.max.z),dd=Math.hypot(dx,dz);if(dd<1.4){dens=Math.min(dens,dd/1.4*.6);dirt=Math.max(dirt,(1.4-dd)/1.4*.7);}}
      for(const l of landmarks)if(l.kind==='house'&&Math.hypot(x-l.x,z-l.z-l.d/2-2)<3.2)dirt=Math.max(dirt,.8);
      const k=(j*256+i)*4;maskData[k]=dens*255;maskData[k+1]=Math.min(1,dirt)*255;maskData[k+2]=0;maskData[k+3]=255;}
    maskTex.needsUpdate=true;

    /* Grama: lâminas com vento que seguem a câmera (até 120 mil instâncias). */
    const grass=buildGrass(maskTex);scene.add(grass);
    const flowers=buildFlowers(maskData);scene.add(flowers);

    /* Montanhas distantes. */
    const mountain=mat('mountain',0xffffff,{vertexColors:true,roughness:1});for(let layer=0;layer<3;layer++){const ridge=new T.PlaneGeometry(1,1,160,6),p=ridge.attributes.position,cc=new Float32Array(p.count*3);for(let row=0;row<=6;row++)for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,d=270+layer*55+row*10,n=fbm(i/160*12,layer*3,12,181+layer,4),h=(18+30*n+14*Math.sin(a*3+layer)+8*Math.sin(a*7+layer*2))*(1+layer*.35)*(row/6);p.setXYZ(row*161+i,Math.cos(a)*d,h-14,Math.sin(a)*d);const k=row/6,base=[.32,.38,.34][layer];const snow=h>48?Math.min(1,(h-48)/14):0;cc.set([base+k*.12+snow*.5,base+.06+k*.1+snow*.45,base+.04+k*.08+snow*.5],(row*161+i)*3);}ridge.setAttribute('color',new T.BufferAttribute(cc,3));ridge.computeVertexNormals();const m=mesh(ridge,mountain,scene,0,0,0,false);m.material.side=T.DoubleSide;m.userData.noBatch=true;}

    const zone=makeZone(scene);

    batchStatics(scene,new Set([ground,water,zone,foam,grass,flowers,wires,...noBatch]));
    function update(dt,t){for(const f of animated)f(t);}
    return {hash,walls,cover,landmarks,ground,grass,flowers,trunk,leaves,water,zone,treePositions,addBox,emitters,update,maskTex,ziplines:[],waterLevel:-1.3,spawn:{x:14,z:23},spawnRing:[65,173],lootSpread:60,menuCam:{x:52,y:16,z:68,lx:-60,ly:6,lz:10},
      isWater:(x,z)=>Math.hypot(x-130,z-130)<33,roads:[[[0,-200],[0,200],9],[[-200,0],[200,0],9],[[-111,-190],[-111,185],6],[[117,-190],[117,185],6],[[-190,124],[190,124],6]],mapColors:{land:[70,98,76],water:'#356876'}};
  }

  function makeZone(scene){const zone=new T.Mesh(new T.CylinderGeometry(1,1,90,160,1,true),new T.ShaderMaterial({uniforms:{time:{value:0},radius:{value:265}},vertexShader:'varying vec3 vW;varying vec3 vP;void main(){vP=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`uniform float time,radius;varying vec3 vW;varying vec3 vP;
      void main(){float ang=atan(vP.z,vP.x);vec2 g=vec2(ang*radius*.22,vW.y*.25);vec2 r=vec2(1.,1.732);vec2 h=r*.5;vec2 a=mod(g,r)-h;vec2 b=mod(g-h,r)-h;vec2 gv=dot(a,a)<dot(b,b)?a:b;float edge=smoothstep(.4,.5,max(abs(gv.x)*1.5+abs(gv.y)*.0,abs(gv.y)*1.15+abs(gv.x)*.5));
        float stripes=pow(.5+.5*sin(vW.y*.9-time*2.4),14.);float pulse=.6+.4*sin(time*1.5+ang*3.);float base=smoothstep(14.,0.,vW.y+2.);
        float far=smoothstep(30.,160.,length(vW-cameraPosition));vec3 col=vec3(.25,.75,1.5)*(1.+edge*2.5*pulse+stripes*1.5)+vec3(.6,.2,.1)*base;float alpha=(.05+edge*.16*pulse+stripes*.1+base*.18)*mix(1.,.18,far);
        gl_FragColor=vec4(col,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,transparent:true,side:T.DoubleSide,depthWrite:false}));zone.position.y=30;zone.frustumCulled=false;scene.add(zone);return zone;}
  function grassHeightGLSL(){if(C.MAP.id==='island'){const f=n=>(+n).toFixed(4);return `float terrainH(vec2 p){float x=p.x,z=p.y;float a=atan(z,x);float r=length(vec2(x/118.,z/100.))*(1.+.07*sin(a*3.+1.3)+.05*sin(a*5.+.4)+.03*sin(a*9.+2.1));float t=clamp((1.-r)/.16,0.,1.);float l=t*t*(3.-2.*t);float h=-1.5+l*(3.3+1.4*sin(x*.045)*cos(z*.04)+.7*sin(x*.11+z*.07))-clamp((r-1.5)/.6,0.,1.)*4.5;float d;float k;`+C.ISLAND.pads.map(p=>`d=length(vec2(x-(${f(p[0])}),z-(${f(p[1])})));k=clamp((${f(p[2])}-d)/(${f(p[2]*.4)}),0.,1.);k=k*k*(3.-2.*k);h+=(${f(p[3])}-h)*k;`).join('')+`return h;}`;}
    return `float terrainH(vec2 p){float x=p.x,z=p.y;float hills=2.5*sin(x*.018)*cos(z*.022)+1.25*sin(z*.044+x*.01);float peak=10.*exp(-((x*x+(z+137.)*(z+137.))/1750.));float lake=-4.*exp(-(((x-130.)*(x-130.)+(z-130.)*(z-130.))/2000.));float roads=clamp(min(abs(x),abs(z))/17.,0.,1.);return (hills+peak+lake)*roads;}`;}
  function buildGrass(maskTex){const MAX=120000,SIZE=84;
    const pos=[],hb=[];for(let b=0;b<3;b++){const a=b*2.1+random(),H=.26+random()*.2,W=.03+random()*.014,lx=Math.cos(a+1.4)*.09,lz=Math.sin(a+1.4)*.09,ox=(random()-.5)*.16,oz=(random()-.5)*.16;const ca=Math.cos(a),sa=Math.sin(a);const pts=[];for(let s=0;s<=3;s++){const t=s/3,w=W*Math.pow(1-t,.75),y=H*t,bx=ox+lx*t*t,bz=oz+lz*t*t;pts.push([bx-ca*w,y,bz-sa*w,t],[bx+ca*w,y,bz+sa*w,t]);}
      for(let s=0;s<3;s++){const [a0,a1,b0,b1]=[pts[s*2],pts[s*2+1],pts[s*2+2],pts[s*2+3]];for(const v of [a0,a1,b0,a1,b1,b0]){pos.push(v[0],v[1],v[2]);hb.push(v[3]);}}}
    const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));g.setAttribute('aBlade',new T.Float32BufferAttribute(hb,1));
    const off=new Float32Array(MAX*4);for(let i=0;i<MAX;i++){off[i*4]=random()*SIZE;off[i*4+1]=random()*SIZE;off[i*4+2]=random();off[i*4+3]=.65+random()*.75;}g.setAttribute('aOffset',new T.InstancedBufferAttribute(off,4));g.instanceCount=40000;
    const m=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.85,color:0xffffff});
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uTime:uniforms.time,uWind:uniforms.wind,uWindDir:uniforms.windDir,uPlayer:uniforms.player,uCloudShadow:uniforms.cloudShadow,tMask:{value:maskTex},tNoise:{value:noiseTex()},uSize:{value:SIZE}});
      sh.vertexShader=`uniform float uTime,uWind,uSize;uniform vec2 uWindDir;uniform vec3 uPlayer;uniform sampler2D tMask,tNoise;attribute vec4 aOffset;attribute float aBlade;varying float vH;varying vec3 vTint;varying vec3 vGW;\n${grassHeightGLSL()}\n`+sh.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=vec3(0.,1.,0.);').replace('#include <begin_vertex>',`
        vec2 org=cameraPosition.xz-uSize*.5;vec2 base=org+mod(aOffset.xy-org,uSize);
        vec4 mk=texture2D(tMask,(base+210.)/420.);
        float keep=step(aOffset.z,mk.r*1.08-.04);
        float dist=length(base-cameraPosition.xz);float fade=1.-smoothstep(uSize*.3,uSize*.48,dist);
        float s=aOffset.w*keep*fade;
        float ang=aOffset.z*43.7;float ca=cos(ang),sa=sin(ang);
        vec3 p=vec3(position.x*ca-position.z*sa,position.y,position.x*sa+position.z*ca)*s;
        float n=texture2D(tNoise,base*.012+uTime*uWindDir*.018).r;
        float w=(sin(uTime*1.8+base.x*.21+base.y*.17)*.35+(n-.45)*1.6)*uWind;
        float h2=aBlade*aBlade;p.xz+=uWindDir*w*h2*.42*s;p.y-=abs(w)*h2*.08*s;
        vec2 away=base-uPlayer.xz;float pd=length(away);float push=(1.-smoothstep(.2,1.5,pd))*step(abs(uPlayer.y-terrainH(base)),2.5);p.xz+=normalize(away+.0001)*push*aBlade*.55*s;p.y*=1.-push*.45;
        vec3 transformed=vec3(base.x,terrainH(base)-.03,base.y)+p;
        vH=aBlade;vGW=transformed;
        float farm=smoothstep(66.,80.,base.y)*smoothstep(62.,48.,base.x);
        vTint=mix(vec3(.85+aOffset.z*.3,1.,.8),vec3(1.25,1.05,.55),farm*.7+smoothstep(.6,.8,n)*.25);`);
      sh.fragmentShader='uniform sampler2D tNoise;uniform float uTime,uCloudShadow;uniform vec2 uWindDir;varying float vH;varying vec3 vTint;varying vec3 vGW;\n'+sh.fragmentShader.replace('#include <color_fragment>',`diffuseColor.rgb=mix(vec3(.05,.085,.025),vec3(.32,.42,.13),vH)*vTint;`).replace('#include <dithering_fragment>',`#include <dithering_fragment>
        float cs=smoothstep(.45,.75,texture2D(tNoise,(vGW.xz+uWindDir*uTime*3.)*.0045).r);gl_FragColor.rgb*=1.-cs*uCloudShadow;`);};
    m.customProgramCacheKey=()=>'grass';
    const grass=new T.Mesh(g,m);grass.frustumCulled=false;grass.receiveShadow=true;grass.userData.maxInstances=MAX;grass.setDensity=n=>{g.instanceCount=Math.max(0,Math.min(MAX,Math.floor(n)));};return grass;}
  function buildFlowers(maskData){const list=[];for(let i=0;i<5000&&list.length<2600;i++){const x=(random()-.5)*380,z=(random()-.5)*380;const ii=Math.floor((x+210)/420*256),jj=Math.floor((z+210)/420*256);if(maskData[(jj*256+ii)*4]<200)continue;if(fbm((x+210)/420*10,(z+210)/420*10,10,191,2)<.5)continue;list.push([x,C.heightAt(x,z),z]);}
    const geo=cached('flower',()=>{const parts=[];for(let k=0;k<2;k++){const g=new T.PlaneGeometry(.22,.22);parts.push({geo:g,matrix:M4(0,.32,0,-Math.PI/2+.25*(k?1:-1),k*1.6,0)});}parts.push({geo:new T.BoxGeometry(.012,.32,.012),matrix:M4(0,.16,0)});return mergeParts(parts);});
    const m=windify(new T.MeshStandardMaterial({map:spriteTex('flower'),alphaTest:.5,side:T.DoubleSide,roughness:.7,vertexColors:true}),'flower',{amp:.6,base:.05,flutter:.0});
    const im=new T.InstancedMesh(geo,m,list.length),d=new T.Object3D(),c=new T.Color(),cols=[0xffffff,0xf5d34a,0xb07ad8,0xe0504a,0xf0a0c0];list.forEach((p,i)=>{d.position.set(p[0],p[1],p[2]);d.rotation.set(0,random()*6,0);d.scale.setScalar(.8+random()*.6);d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,c.setHex(cols[i%cols.length]));});return im;}

  // Um buffer por material: menos chamadas de desenho. Materiais com worldUV recebem UV planar de mundo.
  function batchStatics(root,exclude){root.updateMatrixWorld(true);const byMaterial=new Map();root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||exclude.has(o)||o.userData.noBatch||Array.isArray(o.material)||o.material.isShaderMaterial)return;if(!o.geometry.attributes.normal||!o.geometry.attributes.uv||o.geometry.isInstancedBufferGeometry)return;if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(o);});
    const n=new T.Vector3();
    for(const [material,objects] of byMaterial){const ws=material.userData.worldUV;if(objects.length<3&&!ws)continue;let count=0,indexCount=0;for(const o of objects){count+=o.geometry.attributes.position.count;indexCount+=o.geometry.index?.count||o.geometry.attributes.position.count;}const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=new Uint32Array(indexCount);let vo=0,io=0;
      for(const o of objects){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);const vc=g.attributes.position.count;positions.set(g.attributes.position.array,vo*3);normals.set(g.attributes.normal.array,vo*3);if(ws){const p=g.attributes.position,nn=g.attributes.normal;for(let i=0;i<vc;i++){n.fromBufferAttribute(nn,i);const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);let u,v;if(ay>=ax&&ay>=az){u=p.getX(i);v=p.getZ(i);}else if(ax>=az){u=p.getZ(i);v=p.getY(i);}else{u=p.getX(i);v=p.getY(i);}uvs[(vo+i)*2]=u*ws;uvs[(vo+i)*2+1]=v*ws;}}else uvs.set(g.attributes.uv.array,vo*2);const ic=g.index?.count||vc;for(let i=0;i<ic;i++)indices[io+i]=(g.index?g.index.getX(i):i)+vo;io+=ic;vo+=vc;g.dispose();o.removeFromParent();}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));g.setIndex(new T.BufferAttribute(indices,1));g.computeBoundingSphere();const merged=new T.Mesh(g,material);merged.castShadow=objects.some(o=>o.castShadow);merged.receiveShadow=true;root.add(merged);}
  }

  /* ---------- Armas: modelos detalhados, miras e acessórios ---------- */
  const RARITY={p9:0,r44:1,v9:1,k45:1,ar5:2,ak7:2,s12:2,b5:3,as12:3,d7:3,s338:4,m5:4};
  const RARITY_INFO=[{name:'Comum',color:0xb8c0bc},{name:'Incomum',color:0x6fd36a},{name:'Rara',color:0x4aa8ff},{name:'Épica',color:0xb46cff},{name:'Lendária',color:0xffb63a}];
  // Mira de cada arma. Miras "scope" usam luneta em tela cheia; as demais são vistas através do vidro.
  const OPTIC={p9:'iron',r44:'iron',v9:'holo',k45:'reflex',ar5:'reddot',ak7:'holo',b5:'prism',s12:'ghost',as12:'reflex',d7:'scope',s338:'scope',m5:'holo'};
  const OPTIC_INFO={iron:{name:'Mira aberta com trítio',zoom:1.12},ghost:{name:'Anel fantasma',zoom:1.1},reflex:{name:'Mira reflex verde',zoom:1.22},reddot:{name:'Red dot',zoom:1.3},holo:{name:'Holográfica',zoom:1.3},prism:{name:'Prismática 1,8×',zoom:1.8},scope:{name:'Luneta',zoom:1}};
  const RETICLE_COLOR={reddot:[10,.35,.25],holo:[9,.6,.35],reflex:[.5,8,1.2],prism:[9,.9,.2]};
  function reticleTex(kind){const key='ret:'+kind;if(texCache[key])return texCache[key];const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');x.translate(128,128);x.strokeStyle=x.fillStyle='#fff';x.lineCap='round';
    const glowDot=r=>{const g=x.createRadialGradient(0,0,0,0,0,r*3);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.33,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,r*3,0,Math.PI*2);x.fill();x.fillStyle='#fff';};
    if(kind==='reddot'){glowDot(14);}
    else if(kind==='holo'){x.lineWidth=7;x.beginPath();x.arc(0,0,92,0,Math.PI*2);x.stroke();for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){x.beginPath();x.moveTo(Math.cos(a)*92,Math.sin(a)*92);x.lineTo(Math.cos(a)*110,Math.sin(a)*110);x.stroke();}glowDot(8);}
    else if(kind==='reflex'){x.lineWidth=6;for(const a of [Math.PI/2,Math.PI,0]){x.beginPath();x.moveTo(Math.cos(a)*40,Math.sin(a)*40);x.lineTo(Math.cos(a)*90,Math.sin(a)*90);x.stroke();}glowDot(9);}
    else if(kind==='prism'){x.lineWidth=8;x.beginPath();x.moveTo(-34,30);x.lineTo(0,-4);x.lineTo(34,30);x.stroke();x.lineWidth=4;for(const [y,w] of [[60,26],[84,18],[104,12]]){x.beginPath();x.moveTo(-w,y);x.lineTo(w,y);x.stroke();}x.beginPath();x.arc(0,-4,5,0,Math.PI*2);x.fill();}
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return texCache[key]=t;}
  function reticleMat(kind){const k='reticle'+kind;if(materials[k])return materials[k];const c=RETICLE_COLOR[kind]||[9,.4,.3];const m=new T.MeshBasicMaterial({map:reticleTex(kind),color:new T.Color(...c),transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});m.userData.shared=true;return materials[k]=m;}
  function gunMats(def){const rar=RARITY[def.id];return {
    steel:mat('gunSteel',0x56616a,{metalness:.6,roughness:.3,map:tex('metal').map}),park:mat('gunPark',0x3c4447,{metalness:.35,roughness:.5,map:tex('metal').map}),
    poly:mat('gunPoly',0x30353a,{roughness:.72,map:tex('fabric').map}),grip:mat('gunGrip',0x24272a,{roughness:.9,map:tex('fabric').map,normalMap:tex('fabric').normalMap}),
    accent:mat('gun'+def.id,def.color,{metalness:.35,roughness:.48,map:tex('metal').map}),wood:mat('gunWood',0x8a5232,{roughness:.5,map:tex('planks').map}),
    chrome:mat('gunChrome',0xaab8b8,{metalness:1,roughness:.14}),black:mat('gunBlack',0x202427,{roughness:.45,metalness:.25}),
    trim:rar>=4?mat('gunGold',0xd8aa3a,{metalness:1,roughness:.22}):rar===3?mat('gunPurple',0x7a3fc0,{metalness:.85,roughness:.28}):rar===2?mat('gunBlue',0x2f72b8,{metalness:.85,roughness:.28}):mat('gunTrim',0x6a7478,{metalness:.85,roughness:.3}),
    glow:materials.tritium||(materials.tritium=new T.MeshBasicMaterial({color:new T.Color(1.2,6,1.6),toneMapped:false})),
    laser:materials.laserLens||(materials.laserLens=new T.MeshBasicMaterial({color:new T.Color(9,.5,.4),toneMapped:false})),
    glass:materials.opticGlass||(materials.opticGlass=new T.MeshStandardMaterial({color:0x9fd6ff,metalness:.9,roughness:.04,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide})),
    lens:mat('scopeLens',0x10363c,{metalness:.95,roughness:.06,emissive:0x0a3a44,emissiveIntensity:.7})};}
  function makeGun(def,view=false){const g=new T.Group(),M=gunMats(def),shape=def.shape,optic=OPTIC[def.id]||'reddot';
    const B=(x,y,z,w,h,d,m,rx=0,ry=0,rz=0)=>{const b=box(g,x,y,z,w,h,d,m);if(rx||ry||rz)b.rotation.set(rx,ry,rz);return b;};
    const Z=(x,y,z,r,len,m,seg=14,rBack=r)=>mesh(cached(`cz${r},${rBack},${len},${seg}`,()=>new T.CylinderGeometry(rBack,r,len,seg).rotateX(Math.PI/2)),m,g,x,y,z);
    const X=(x,y,z,r,len,m,seg=12)=>mesh(cached(`cx${r},${len},${seg}`,()=>new T.CylinderGeometry(r,r,len,seg).rotateZ(Math.PI/2)),m,g,x,y,z);
    const Y=(x,y,z,r,len,m,seg=12)=>mesh(cached(`cy${r},${len},${seg}`,()=>new T.CylinderGeometry(r,r,len,seg)),m,g,x,y,z);
    const tubeM=materials.rdTube||(materials.rdTube=mat('rdTube',0x1c2023,{roughness:.4,metalness:.5,side:T.DoubleSide}));
    const O=(x,y,z,r,len,seg=20)=>mesh(cached(`co${r},${len},${seg}`,()=>new T.CylinderGeometry(r,r,len,seg,1,true).rotateX(Math.PI/2)),tubeM,g,x,y,z);
    const rail=(x,y,z0,z1)=>{const a=Math.min(z0,z1),b=Math.max(z0,z1);B(x,y,(a+b)/2,.044,.012,b-a,M.black);for(let z=a+.006;z<b;z+=.012)B(x,y+.009,z,.05,.007,.006,M.black);return y+.0125;};
    const guard=(z,y=-.065)=>{B(0,y,z,.012,.008,.085,M.black);B(0,y+.025,z-.042,.012,.05,.008,M.black,.2);B(0,y+.012,z+.012,.006,.028,.006,M.trim,.35);};
    const disc=(x,y,z,r,m)=>{const d=mesh(cached(`disc${r}`,()=>new T.CircleGeometry(r,20)),m,g,x,y,z,false);d.userData.noBatch=true;return d;};
    const reticle=(kind,y,z,size)=>{const p=new T.Mesh(cached(`ret${size}`,()=>new T.PlaneGeometry(size,size)),reticleMat(kind));p.position.set(0,y,z);p.renderOrder=12;p.userData.noBatch=true;g.add(p);};
    let barrelY=.03,muzzleZ=-.75,gripZ=.04,fore=-.38,railTop=.086,optZ=-.07,laserAt=null,sight=null;
    const rifleLower=(acc=M.accent)=>{B(0,-.025,-.03,.064,.06,.2,acc);B(0,-.075,-.09,.07,.07,.09,acc);B(0,-.1,gripZ,.05,.13,.062,M.grip,.35);for(let i=0;i<4;i++)B(0,-.07-i*.028,gripZ-.022-i*.009,.052,.006,.02,M.poly,.35);guard(-.015);B(-.034,-.03,-.05,.004,.014,.02,M.trim);};
    switch(shape){
      case 'pistol':{barrelY=.042;muzzleZ=-.24;gripZ=0;fore=0;
        B(0,.042,-.12,.034,.042,.21,M.park);for(let i=0;i<6;i++)for(const s of [-1,1])B(s*.0175,.044,-.03-i*.009,.002,.032,.004,M.black);B(.0175,.048,-.11,.002,.016,.05,M.black);
        B(0,.009,-.125,.03,.026,.19,M.accent);Z(0,.036,-.228,.009,.02,M.steel);B(0,-.07,0,.032,.125,.052,M.grip,.22);for(let i=0;i<5;i++)B(0,-.03-i*.02,-.012-i*.004,.034,.004,.03,M.poly,.22);B(0,-.137,.016,.035,.012,.054,M.black);
        guard(-.06,-.018);B(0,-.008,-.185,.026,.012,.06,M.black);for(let i=0;i<3;i++)B(0,-.016,-.165-i*.018,.028,.004,.006,M.black);B(0,.058,-.008,.012,.01,.016,M.steel,-.2);
        for(const s of [-1,1])B(s*.01,.07,-.03,.008,.012,.012,M.black);B(0,.069,-.215,.0045,.011,.009,M.black);for(const s of [-1,1])disc(s*.01,.0715,-.0235,.0016,M.glow);disc(0,.0722,-.2102,.0018,M.glow);
        sight={y:.072,z:-.03};laserAt=new T.Vector3(0,-.016,-.216);B(0,-.016,-.19,.024,.02,.05,M.black);break;}
      case 'revolver':{barrelY=.036;muzzleZ=-.33;gripZ=.02;fore=0;
        B(0,.022,-.07,.032,.06,.13,M.steel);Z(0,.017,-.08,.034,.066,M.chrome,14);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;B(Math.cos(a)*.031,.017+Math.sin(a)*.031,-.08,.007,.007,.058,M.black);}
        Z(0,.036,-.22,.011,.2,M.chrome);B(0,.051,-.22,.012,.012,.2,M.steel);for(let i=0;i<8;i++)B(0,.058,-.13-i*.024,.013,.003,.006,M.black);Z(0,.012,-.19,.006,.13,M.steel);B(0,.06,0,.01,.032,.02,M.steel,-.45);
        B(0,-.06,.025,.03,.11,.046,M.wood,.3);B(0,-.008,-.005,.032,.02,.05,M.steel);guard(-.035,-.02);B(0,.068,-.315,.004,.022,.012,M.trim);disc(0,.077,-.3088,.0025,M.glow);for(const s of [-1,1])B(s*.008,.058,-.02,.006,.01,.012,M.steel);
        sight={y:.073,z:-.02};break;}
      case 'smg':{if(def.id==='v9'){B(0,.0,-.05,.06,.12,.3,M.accent);B(0,-.07,-.16,.055,.08,.12,M.accent,.5);B(0,-.15,-.14,.04,.14,.05,M.black,.1);B(0,-.1,.03,.045,.12,.055,M.grip,.3);guard(-.02,-.06);Z(0,.03,-.36,.026,.22,M.park);for(let i=0;i<5;i++)Z(0,.03,-.28-i*.035,.0275,.006,M.black);Z(0,.03,-.473,.02,.006,M.black);B(0,.02,.2,.03,.05,.2,M.poly);B(0,.0,.31,.035,.1,.02,M.grip);B(0,-.07,-.2,.03,.08,.03,M.poly);barrelY=.03;muzzleZ=-.48;fore=-.2;gripZ=.03;railTop=rail(0,.062,.08,-.2);optZ=-.06;laserAt=new T.Vector3(.04,.0,-.215);B(.04,.0,-.19,.022,.022,.05,M.black);}
        else{B(0,.0,-.05,.06,.1,.32,M.accent);for(let i=0;i<5;i++)B(.031,.0,-.12-i*.025,.003,.06,.01,M.black);B(0,-.13,-.12,.04,.15,.06,M.black);B(0,-.1,.04,.045,.12,.055,M.grip,.3);guard(-.01,-.055);Z(0,.02,-.28,.013,.1,M.steel);Z(0,.02,-.34,.018,.04,M.black);for(const y of [.03,-.02])B(0,y,.2,.012,.012,.22,M.black);B(0,.005,.31,.03,.08,.02,M.grip);B(0,-.06,-.19,.05,.03,.1,M.poly);barrelY=.02;muzzleZ=-.36;fore=-.19;gripZ=.04;railTop=rail(0,.055,.08,-.18);optZ=-.05;laserAt=new T.Vector3(.04,-.005,-.205);B(.04,-.005,-.18,.022,.022,.05,M.black);}
        break;}
      case 'ak':{B(0,.02,-.06,.066,.08,.3,M.park);B(0,.066,-.04,.058,.014,.26,M.park);for(let i=0;i<4;i++)B(0,.074,.03-i*.06,.06,.003,.012,M.black);B(.034,.03,-.09,.004,.03,.08,M.black);B(.04,.035,-.02,.025,.01,.03,M.steel);
        B(0,.015,-.35,.07,.06,.24,M.wood);for(let i=0;i<3;i++)B(0,.015,-.27-i*.07,.072,.006,.008,M.black);B(0,.06,-.32,.05,.034,.18,M.wood);Z(0,.064,-.47,.012,.1,M.park);
        Z(0,.022,-.6,.012,.3,M.steel);B(0,.05,-.66,.022,.05,.026,M.park);B(0,.075,-.66,.004,.014,.004,M.black);Z(0,.022,-.76,.017,.07,M.park);B(0,.03,-.77,.03,.012,.04,M.park,0,0,.2);
        B(0,-.09,-.13,.05,.1,.075,M.accent,-.15);B(0,-.175,-.105,.05,.09,.075,M.accent,-.42);B(0,-.24,-.055,.05,.065,.075,M.accent,-.7);for(let i=0;i<4;i++)B(.026,-.06-i*.05,-.13+i*.02,.002,.01,.06,M.black,-.2-i*.15);
        B(0,-.09,.05,.045,.12,.055,M.wood,.35);guard(-.01,-.05);B(0,-.005,.25,.05,.075,.26,M.wood,-.12);B(0,-.035,.38,.052,.12,.02,M.park);B(0,.072,-.17,.03,.012,.06,M.park);
        barrelY=.022;muzzleZ=-.8;gripZ=.05;fore=-.36;railTop=rail(0,.08,.04,-.14);optZ=-.06;laserAt=new T.Vector3(.04,.0,-.44);B(.042,.0,-.41,.024,.024,.06,M.black);break;}
      case 'bullpup':{B(0,0,-.05,.075,.15,.55,M.accent);B(0,-.06,-.05,.077,.04,.5,M.poly);for(let i=0;i<6;i++)B(.039,.02,.08-i*.05,.003,.04,.02,M.black);B(0,-.13,.13,.05,.13,.07,M.black,-.15);B(0,-.11,-.12,.045,.12,.055,M.grip,.3);guard(-.16,-.07);B(0,0,.23,.078,.15,.02,M.grip);
        Z(0,.03,-.45,.013,.24,M.steel);B(0,.02,-.3,.07,.08,.08,M.poly);Z(0,.03,-.58,.018,.06,M.black);B(-.04,.04,.06,.012,.02,.05,M.trim);
        barrelY=.03;muzzleZ=-.61;gripZ=-.12;fore=-.28;railTop=rail(0,.08,.18,-.3);optZ=-.02;laserAt=new T.Vector3(.045,.02,-.335);B(.045,.02,-.31,.022,.022,.05,M.black);break;}
      case 'shotgun':{B(0,.01,-.05,.065,.09,.25,M.park);B(.033,.02,-.06,.004,.03,.08,M.black);Z(0,.036,-.48,.016,.62,M.steel);B(0,.055,-.48,.012,.006,.6,M.black);Z(0,-.005,-.42,.015,.5,M.park);B(0,-.005,-.36,.05,.045,.16,M.poly);for(let i=0;i<6;i++)B(0,-.005,-.3-i*.025,.054,.05,.008,M.black);
        B(0,-.02,.2,.05,.08,.26,M.wood,-.1);B(0,-.06,.04,.045,.1,.055,M.wood,.4);B(0,-.035,.34,.054,.11,.02,M.grip);guard(-.03,-.045);B(0,.068,-.775,.006,.008,.006,M.trim);disc(0,.0725,-.772,.0024,M.glow);
        const ring=mesh(cached('ghostRing',()=>new T.TorusGeometry(.011,.0025,6,18)),M.black,g,0,.083,-.02);B(0,.068,-.02,.012,.016,.012,M.black);
        barrelY=.036;muzzleZ=-.8;gripZ=.04;fore=-.36;sight={y:.083,z:-.02};laserAt=new T.Vector3(.035,-.005,-.6);B(.035,-.005,-.57,.022,.022,.05,M.black);break;}
      case 'autoshot':{B(0,.01,-.08,.07,.11,.36,M.accent);for(let i=0;i<4;i++)B(.036,.01,-.02-i*.06,.003,.07,.02,M.black);const dr=X(0,-.12,-.13,.11,.07,M.black,20);X(0,-.12,-.13,.04,.075,M.trim,10);Z(0,.03,-.42,.016,.18,M.steel);B(0,.02,-.32,.07,.08,.12,M.poly);Z(0,.03,-.53,.022,.06,M.black);for(let i=0;i<3;i++)B(0,.045,-.515-i*.015,.03,.006,.006,M.black);
        B(0,-.08,.06,.045,.12,.055,M.grip,.35);guard(.0,-.045);B(0,0,.2,.055,.1,.24,M.poly);B(0,-.01,.33,.058,.13,.02,M.grip);
        barrelY=.03;muzzleZ=-.56;gripZ=.06;fore=-.32;railTop=rail(0,.07,.08,-.24);optZ=-.06;laserAt=new T.Vector3(.045,.0,-.36);B(.045,.0,-.33,.022,.022,.05,M.black);break;}
      case 'lmg':{B(0,.02,-.05,.08,.11,.34,M.park);B(0,.083,-.05,.075,.02,.24,M.accent);B(-.045,.04,-.02,.012,.04,.06,M.black);B(0,-.13,-.07,.07,.12,.15,M.accent);B(-.036,-.04,-.06,.03,.04,.1,M.black);
        Z(0,.03,-.55,.018,.6,M.steel);Z(0,.03,-.37,.032,.2,M.black,16);for(let i=0;i<5;i++)for(const s of [-1,1])B(s*.033,.03,-.29-i*.035,.003,.014,.014,M.park);B(0,.1,-.33,.02,.05,.012,M.black);B(0,.125,-.36,.02,.012,.08,M.black);
        for(const s of [-1,1])B(s*.04,-.07,-.7,.012,.2,.012,M.black,0,0,s*.35);B(0,-.0,-.62,.03,.02,.03,M.black);Z(0,.03,-.87,.022,.04,M.black);B(0,.0,.22,.06,.1,.24,M.poly);B(0,-.01,.35,.062,.12,.02,M.grip);B(0,-.1,.06,.045,.12,.055,M.grip,.35);guard(.02,-.055);
        barrelY=.03;muzzleZ=-.89;gripZ=.06;fore=-.32;railTop=rail(0,.095,.06,-.16);optZ=-.05;laserAt=new T.Vector3(.045,.03,-.48);B(.045,.03,-.45,.022,.022,.05,M.black);break;}
      case 'dmr':{B(0,.03,-.08,.07,.075,.28,M.accent);rifleLower(M.accent);B(0,-.13,-.09,.055,.1,.07,M.black);B(0,.03,-.42,.07,.07,.42,M.park);for(let i=0;i<7;i++)for(const s of [-1,1])B(s*.036,.03,-.26-i*.05,.003,.018,.03,M.black);Z(0,.03,-.74,.013,.24,M.steel);Z(0,.03,-.89,.019,.07,M.black);for(let i=0;i<3;i++)B(0,.03,-.87-i*.018,.042,.008,.006,M.black);
        Z(0,.025,.15,.018,.16,M.black);B(0,.01,.27,.055,.1,.2,M.poly);B(0,.065,.25,.05,.03,.12,M.trim);B(0,-.005,.375,.058,.13,.02,M.grip);for(const s of [-1,1])B(s*.022,-.02,-.53,.012,.012,.22,M.black);B(0,.07,.05,.05,.015,.03,M.black);
        barrelY=.03;muzzleZ=-.93;gripZ=.04;fore=-.42;railTop=rail(0,.072,.08,-.55);optZ=-.08;break;}
      case 'sniper':{B(0,-.01,.05,.07,.09,.5,M.accent);B(0,-.1,.06,.045,.12,.05,M.grip,.3);B(0,-.04,.1,.07,.03,.04,M.accent);B(0,.055,.2,.05,.03,.14,M.poly);B(0,-.01,.33,.062,.15,.022,M.grip);B(0,-.06,.25,.05,.04,.1,M.accent,-.2);
        Z(0,.035,-.07,.028,.24,M.park,16);X(.05,.04,.03,.007,.07,M.steel);mesh(cached('boltKnob',()=>new T.SphereGeometry(.014,10,8)),M.trim,g,.088,.04,.03);B(0,.06,.08,.02,.012,.04,M.steel);
        Z(0,.035,-.55,.017,.7,M.steel,16);for(const [sx,sy] of [[1,0],[-1,0],[0,1],[0,-1]])B(sx*.0165,.035+sy*.0165,-.5,.004,.004,.42,M.black);Z(0,.035,-.95,.025,.09,M.black,16);for(let i=0;i<3;i++)for(const s of [-1,1])B(s*.024,.035,-.92-i*.025,.004,.012,.012,M.park);
        B(0,-.07,-.05,.04,.05,.07,M.black);guard(-.0,-.055);for(const s of [-1,1])B(s*.022,-.035,-.33,.012,.012,.22,M.black);B(0,-.03,-.22,.06,.03,.05,M.black);
        barrelY=.035;muzzleZ=-1.0;gripZ=.06;fore=-.22;railTop=rail(0,.07,.1,-.22);optZ=-.06;break;}
      default:{B(0,.03,-.08,.07,.075,.28,M.accent);rifleLower(M.accent);B(0,-.15,-.095,.055,.12,.075,M.black,-.12);B(0,-.245,-.075,.054,.09,.072,M.black,-.3);B(0,.07,.05,.05,.015,.03,M.black);B(.036,.035,-.07,.004,.03,.07,M.black);X(.04,.04,0,.012,.03,M.steel);
        Z(0,.025,.15,.018,.16,M.black);B(0,.01,.27,.055,.09,.17,M.poly);B(0,.06,.25,.05,.03,.12,M.poly);B(0,0,.36,.058,.12,.02,M.grip);
        B(0,.03,-.36,.068,.068,.3,M.park);for(let i=0;i<5;i++)for(const s of [-1,1])B(s*.035,.03,-.25-i*.05,.003,.018,.03,M.black);B(0,.03,-.36,.07,.006,.3,M.trim);B(0,-.012,-.4,.028,.05,.032,M.poly);
        Z(0,.03,-.6,.012,.2,M.steel);B(0,.03,-.53,.03,.03,.03,M.black);B(0,.055,-.53,.006,.03,.006,M.black);Z(0,.03,-.735,.017,.07,M.black);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;B(Math.cos(a)*.017,.03+Math.sin(a)*.017,-.745,.004,.004,.05,M.park);}
        barrelY=.03;muzzleZ=-.77;gripZ=.04;fore=-.4;railTop=rail(0,.072,.08,-.5);optZ=-.08;laserAt=new T.Vector3(.045,.03,-.44);B(.045,.03,-.415,.022,.022,.05,M.black);}
    }
    /* Miras */
    if(optic==='reddot'){const cy=railTop+.034;B(0,railTop+.012,optZ,.03,.024,.045,M.black);B(0,cy-.029,optZ,.034,.01,.05,M.black);O(0,cy,optZ,.022,.085);for(const dz of [-.044,.044]){O(0,cy,optZ+dz,.026,.012);O(0,cy,optZ+dz,.0235,.012);}B(.028,cy,optZ,.012,.016,.016,M.black);B(0,cy+.027,optZ,.016,.012,.016,M.trim);disc(0,cy,optZ-.042,.021,M.glass);reticle('reddot',cy,optZ,.02);sight={y:cy,z:optZ+.044};}
    else if(optic==='holo'){const cy=railTop+.046;B(0,railTop+.007,optZ,.05,.014,.11,M.black);for(const s of [-1,1])B(s*.028,cy-.004,optZ-.02,.007,.066,.05,M.black);B(0,cy+.03,optZ-.02,.063,.007,.07,M.black);B(0,railTop+.01,optZ+.045,.044,.02,.03,M.black);B(.029,cy-.02,optZ+.0,.006,.012,.012,M.trim);B(-.029,cy-.02,optZ+.0,.006,.012,.012,M.trim);const pane=disc(0,cy,optZ-.025,.024,M.glass);reticle('holo',cy,optZ-.025,.05);sight={y:cy,z:optZ+.05};}
    else if(optic==='reflex'){const cy=railTop+.022;B(0,railTop+.006,optZ,.034,.012,.05,M.black);for(const s of [-1,1])B(s*.017,cy,optZ-.012,.005,.032,.007,M.black);B(0,cy+.017,optZ-.012,.038,.005,.007,M.black);disc(0,cy,optZ-.012,.015,M.glass);reticle('reflex',cy,optZ-.012,.026);sight={y:cy,z:optZ+.03};}
    else if(optic==='prism'){const cy=railTop+.03;B(0,railTop+.008,optZ,.034,.016,.08,M.black);for(const s of [-1,1]){B(0,cy+s*.023,optZ,.05,.005,.1,M.black);B(s*.025,cy,optZ,.005,.05,.1,M.black);}O(0,cy,optZ-.06,.024,.03);O(0,cy,optZ+.055,.022,.02);B(.03,cy,optZ,.012,.018,.018,M.trim);disc(0,cy,optZ-.074,.021,M.glass);reticle('prism',cy,optZ+.03,.034);sight={y:cy,z:optZ+.065};}
    else if(optic==='scope'){const big=def.scope>=4,cy=railTop+(big?.055:.048);for(const dz of [-.06,.06]){B(0,railTop+.014,optZ+dz,.03,.028,.02,M.black);Z(0,cy,optZ+dz,.024,.024,M.black,20);}Z(0,cy,optZ,.019,big?.26:.2,M.black,20);Z(0,cy,optZ-(big?.18:.14),big?.032:.026,.09,M.black,24,.019);Z(0,cy,optZ+(big?.16:.13),.019,.06,M.black,20,.024);Y(0,cy+.03,optZ,.013,.026,M.black,14);Y(0,cy+.044,optZ,.014,.006,M.trim,14);X(.031,cy,optZ,.013,.026,M.black,14);X(-.028,cy,optZ+.02,.009,.02,M.black,12);
      disc(0,cy,optZ-(big?.226:.186),big?.031:.025,M.lens).rotation.y=0;const back=disc(0,cy,optZ+(big?.191:.161),.023,M.lens);back.rotation.y=Math.PI;sight={y:cy,z:optZ+(big?.2:.17),overlay:true,reticle:big?'mildot':'acog'};}
    if(!sight)sight={y:railTop+.03,z:optZ};
    sight.kind=optic;sight.zoom=OPTIC_INFO[optic].zoom;sight.name=OPTIC_INFO[optic].name;
    if(laserAt){const l=disc(laserAt.x,laserAt.y,laserAt.z-.001,.0055,M.laser);l.rotation.y=Math.PI;}
    /* Clarão de disparo */
    const flashMat=new T.MeshBasicMaterial({map:spriteTex('flash'),color:new T.Color(7,4.6,2.2),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
    const flash=new T.Group();flash.position.set(0,barrelY,muzzleZ-.14);const fg=cached('flashPlane',()=>new T.PlaneGeometry(.42,.42));const f1=new T.Mesh(fg,flashMat);flash.add(f1);const f2=new T.Mesh(fg,flashMat);f2.rotation.y=Math.PI/2;f2.scale.set(1.5,.7,1);flash.add(f2);const f3=new T.Mesh(fg,flashMat);f3.rotation.x=Math.PI/2;f3.scale.set(.7,1.5,1);flash.add(f3);flash.visible=false;g.add(flash);flash.traverse(o=>o.userData.noBatch=true);
    g.userData={flash,muzzle:new T.Vector3(0,barrelY,muzzleZ),length:-muzzleZ,sight,laser:laserAt?new T.Vector3(laserAt.x,laserAt.y,laserAt.z-.003):null,grip:gripZ,fore};
    /* Mãos e braços em primeira pessoa */
    if(view){const sleeve=worldMat('sleeve','fabric',0x4c5a48,4,{roughness:.95}),glove=mat('glove',0x2b2a26,{roughness:.85,map:tex('fabric').map}),knuckle=mat('knuckle',0x1c1b18,{roughness:.6}),watch=mat('watch',0x111111,{metalness:.6,roughness:.3});
      const pistolLike=shape==='pistol'||shape==='revolver';const gy=pistolLike?-.055:-.085;
      B(.0,gy,gripZ+.012,.068,.085,.075,glove,.3);for(let i=0;i<4;i++)B(-.004,gy+.03-i*.024,gripZ-.036+i*.006,.066,.018,.022,glove,.3);B(0,gy+.035,gripZ-.05,.07,.012,.012,knuckle,.3);B(-.035,gy+.05,gripZ-.02,.02,.02,.055,glove,.1,.2);
      const rf=pistolLike?.05:.05;B(rf,gy-.07,gripZ+.2,.085,.085,.36,sleeve,.38,.22);B(rf-.01,gy-.03,gripZ+.07,.08,.06,.03,watch,.38,.22);B(rf+.002,gy-.022,gripZ+.06,.03,.03,.034,mat('watchFace',0x203a40,{metalness:.8,roughness:.1,emissive:0x0a3038,emissiveIntensity:.8}),.38,.22);
      if(!pistolLike){B(-.012,-.022,fore,.064,.048,.1,glove,0,.1);for(let i=0;i<4;i++)B(.034,.0,fore-.03+i*.022,.016,.04,.02,glove,0,0,.3);B(-.04,.005,fore+.02,.016,.04,.05,glove,0,0,-.4);B(-.075,-.11,fore+.24,.085,.085,.46,sleeve,.32,-.38);}
      else{B(-.028,gy-.02,gripZ-.004,.05,.08,.07,glove,.3,0,.15);for(let i=0;i<3;i++)B(.02,gy-.01-i*.022,gripZ-.035,.03,.018,.02,glove,.3);B(-.09,gy-.09,gripZ+.2,.085,.085,.36,sleeve,.38,-.32);}}
    batchStatics(g,new Set());g.traverse(o=>{if(o.isMesh){o.castShadow=!view;o.receiveShadow=!view;}});return g;}
  /* ---------- Personagens: malha única com esqueleto (1 chamada de desenho por inimigo) ---------- */
  const REG={camo:[[0,0,.5,.25],[.5,0,1,.25],[0,.25,.5,.5],[.5,.25,1,.5]],pants:[0,.5,.5,.75],vest:[.5,.5,1,.75],skin:[0,.75,.25,.875],helmet:[.25,.75,.5,.875],black:[.5,.75,.625,.875],white:[.625,.75,.75,.875],visor:[.75,.75,.875,.875],boots:[.875,.75,1,.875]};
  let atlas=null;
  function characterAtlas(){if(atlas)return atlas;const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');
    const rect=(r,fn)=>{const x0=Math.floor(r[0]*S),y0=Math.floor((1-r[3])*S),w=Math.ceil((r[2]-r[0])*S),h=Math.ceil((r[3]-r[1])*S);const img=x.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=fn(i/w,j/h,i,j),k=(j*w+i)*4;img.data[k]=c8(c[0]);img.data[k+1]=c8(c[1]);img.data[k+2]=c8(c[2]);img.data[k+3]=255;}x.putImageData(img,x0,y0);};
    const hexc=h=>[(h>>16)&255,(h>>8)&255,h&255];
    const camos=[[0x5a6c42,0x7e8e56,0x3e4c34,0xa09c6c],[0x9a8a66,0xc2aa7c,0x6e6048,0xd8c49a],[0x6c727a,0x8e949c,0x464c54,0xb0b6bc],[0x4c626a,0x3c5058,0x72888c,0x2e3e44]];
    camos.forEach((pal,ci)=>rect(REG.camo[ci],(u,v,i,j)=>{const n=fbm(u*6,v*3,6,201+ci,4),m=fbm(u*10,v*5,10,211+ci,3);const idx=n<.4?2:n<.52?0:n<.62?1:3;let c=hexc(pal[idx]);const k=(hash2(i,j,ci)-.5)*14+(m-.5)*20;return [c[0]+k,c[1]+k,c[2]+k];}));
    rect(REG.pants,(u,v,i,j)=>{const n=fbm(u*6,v*3,6,221,4);const c=n<.45?[72,80,66]:n<.6?[96,104,84]:[56,62,54];const k=(hash2(i,j,1)-.5)*12;return [c[0]+k,c[1]+k,c[2]+k];});
    rect(REG.vest,(u,v,i,j)=>{const band=(j%16)<2?-22:0;const n=fbm(u*8,v*4,8,231,3);const g=86+n*26+band+(hash2(i,j,2)-.5)*10;return [g*.98,g,g*.8];});
    rect(REG.skin,(u,v,i,j)=>{const n=fbm(u*4,v*4,4,241,3);return [196+n*20,150+n*16,120+n*12];});
    rect(REG.helmet,(u,v,i,j)=>{const n=fbm(u*6,v*6,6,251,4);const g=92+n*28;return [g*.95,g,g*.8];});
    rect(REG.black,(u,v,i,j)=>{const g=24+hash2(i,j,3)*10;return [g,g,g];});rect(REG.white,()=>[255,255,255]);rect(REG.visor,(u,v)=>[18+v*30,28+v*40,34+v*50]);rect(REG.boots,(u,v,i,j)=>{const g=36+fbm(u*6,v*6,6,261,3)*18;return [g*1.1,g*.95,g*.8];});
    atlas=new T.CanvasTexture(cv);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=8;return atlas;}
  function characterMaterial(){return materials.character||(materials.character=new T.MeshStandardMaterial({map:characterAtlas(),vertexColors:true,roughness:.8,metalness:.04}));}
  // Ossos: [nome, pai, posição relativa]
  const BONES=[['root',-1,[0,0,0]],['hips',0,[0,.95,0]],['spine',1,[0,.06,0]],['head',2,[0,.6,0]],['shoulderL',2,[-.23,.5,0]],['elbowL',4,[0,-.28,0]],['shoulderR',2,[.23,.5,0]],['elbowR',6,[0,-.28,0]],['hipL',1,[-.11,-.02,0]],['kneeL',8,[0,-.44,0]],['hipR',1,[.11,-.02,0]],['kneeR',10,[0,-.44,0]]];
  function gunGeometry(def){return cached('gun:'+def.id,()=>{const g=makeGun(def,false);g.updateMatrixWorld(true);const parts=[];g.traverse(o=>{if(o.isMesh&&!o.userData.noBatch)parts.push({geo:o.geometry,matrix:o.matrixWorld.clone(),color:o.material.color,region:REG.white,solid:true});});const merged=mergeParts(parts);g.userData.flash.children[0].material.dispose();g.traverse(o=>{if(o.isMesh&&o.geometry&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});return merged;});}
  function enemyGeometry(variant,def){return cached(`enemy:${variant}:${def.id}`,()=>{const bones=BONES.map(b=>new T.Bone());BONES.forEach((b,i)=>{bones[i].position.fromArray(b[2]);if(b[1]>=0)bones[b[1]].add(bones[i]);});bones[0].updateMatrixWorld(true);const W=i=>bones[i].matrixWorld;
      const camo=REG.camo[variant],P=[];const add=(bone,geo,m,region,extra={})=>P.push({geo,matrix:W(bone).clone().multiply(m),region,bone,...extra});
      const cap=(r,l)=>cached(`cap${r},${l}`,()=>new T.CapsuleGeometry(r,l,4,10)),sph=(r,ws=12,hs=8,ts=Math.PI)=>cached(`sph${r},${ts}`,()=>new T.SphereGeometry(r,ws,hs,0,Math.PI*2,0,ts)),bx=boxGeo;
      add(2,bx(.32,.17,.21),M4(0,0,0),REG.pants);add(2,cap(.15,.28),M4(0,.3,0,0,0,0,1.15,1,.76),camo);add(2,bx(.37,.36,.25),M4(0,.32,.0),REG.vest);for(const px of [-.11,0,.11])add(2,bx(.085,.11,.06),M4(px,.22,.14),REG.vest);add(2,bx(.29,.36,.15),M4(0,.33,-.18),REG.helmet);add(2,bx(.24,.08,.12),M4(0,.53,-.2),REG.black);add(2,cached('neck',()=>new T.CylinderGeometry(.055,.06,.12,8)),M4(0,.54,0),REG.skin);add(2,bx(.38,.06,.27),M4(0,.48,0),REG.vest);
      add(3,sph(.115),M4(0,.1,.0),REG.skin);add(3,sph(.138,14,8,Math.PI*.55),M4(0,.13,-.01),REG.helmet);add(3,bx(.2,.055,.07),M4(0,.15,.11),REG.visor);add(3,bx(.14,.07,.05),M4(0,.04,.1),REG.black);add(3,bx(.03,.08,.06),M4(-.12,.1,.02),REG.black);add(3,bx(.03,.08,.06),M4(.12,.1,.02),REG.black);
      for(const [sh,el] of [[4,5],[6,7]]){add(sh,cap(.058,.19),M4(0,-.14,0),camo);add(sh,sph(.07),M4(0,-.01,0),REG.vest);add(el,cap(.05,.17),M4(0,-.12,0),camo);add(el,sph(.055),M4(0,-.27,0),REG.black);}
      for(const [hp,kn] of [[8,9],[10,11]]){add(hp,cap(.078,.26),M4(0,-.21,0),REG.pants);add(hp,bx(.11,.1,.07),M4(0,-.43,.06),REG.black);add(kn,cap(.062,.26),M4(0,-.2,0),REG.pants);add(kn,bx(.13,.12,.26),M4(0,-.42,.05),REG.boots);}
      P.push({geo:gunGeometry(def),matrix:W(2).clone().multiply(M4(.1,.3,.34,0,Math.PI,0)),bone:2});
      return mergeParts(P,{skinned:true});});}
  function makeEnemy(scene,index,weapon){const variant=index%4,group=new T.Group();const bones=BONES.map(b=>{const bn=new T.Bone();bn.name=b[0];return bn;});BONES.forEach((b,i)=>{bones[i].position.fromArray(b[2]);if(b[1]>=0)bones[b[1]].add(bones[i]);});
    const skinned=new T.SkinnedMesh(enemyGeometry(variant,weapon),characterMaterial());skinned.add(bones[0]);skinned.updateMatrixWorld(true);skinned.bind(new T.Skeleton(bones));skinned.castShadow=true;skinned.receiveShadow=true;skinned.frustumCulled=false;group.add(skinned);
    const flashMat=new T.MeshBasicMaterial({map:spriteTex('flash'),color:new T.Color(6,4,2),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});const muzzle=new T.Object3D();bones[2].add(muzzle);
    const L=gunGeometry(weapon).boundingBox?(-gunGeometry(weapon).boundingBox.min.z):.8;muzzle.position.set(.1,.32,.34+L+.12);const flash=new T.Group();const fp=cached('flashPlane',()=>new T.PlaneGeometry(.42,.42));for(let k=0;k<3;k++){const f=new T.Mesh(fp,flashMat);if(k===1)f.rotation.y=Math.PI/2;if(k===2)f.rotation.x=Math.PI/2;flash.add(f);}flash.visible=false;muzzle.add(flash);muzzle.userData.flash=flash;
    const parts={};bones.forEach(b=>parts[b.name]=b);parts.armL=parts.shoulderL;parts.armR=parts.shoulderR;parts.legL=parts.hipL;parts.legR=parts.hipR;
    scene.add(group);
    const model={group,parts,gun:muzzle,mesh:skinned,flash,variant,setWeapon(def){skinned.geometry=enemyGeometry(variant,def);const gb=gunGeometry(def).boundingBox;muzzle.position.z=.34+(gb?-gb.min.z:.8)+.12;}};return model;}

  /* ---------- Itens no chão ---------- */
  function makeLoot(scene,item){const g=new T.Group();const rar=item.kind==='weapon'?RARITY[item.def.id]:item.kind==='grenade'?2:item.kind==='armor'?2:item.kind==='medkit'?1:0;const color=new T.Color(RARITY_INFO[rar].color);
    const ringM=materials['ring'+rar]||(materials['ring'+rar]=new T.MeshBasicMaterial({color:color.clone().multiplyScalar(2.2),transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));ringM.userData.shared=true;
    const ring=new T.Mesh(cached('lootRing',()=>{const r=new T.RingGeometry(.42,.5,28);r.rotateX(-Math.PI/2);return r;}),ringM);ring.position.y=.06;g.add(ring);
    let obj;const cm=characterMaterial();
    if(item.kind==='weapon'){obj=new T.Mesh(gunGeometry(item.def),cm);obj.rotation.z=Math.PI/2;obj.rotation.y=Math.PI/2;obj.scale.setScalar(.8);obj.position.y=.6;}
    else{obj=new T.Mesh(lootGeometry(item.kind),cm);obj.position.y=item.kind==='armor'?.38:.3;}
    obj.castShadow=true;g.add(obj);
    const beamM=materials['beam'+rar]||(materials['beam'+rar]=new T.MeshBasicMaterial({map:spriteTex('beam'),color:color.clone().multiplyScalar(1.3),transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));beamM.userData.shared=true;
    const beam=new T.Mesh(cached('lootBeam',()=>new T.CylinderGeometry(.18,.32,2.4,12,1,true).translate(0,1.2,0)),beamM);if(rar>=3)beam.scale.y=1.7;g.add(beam);
    g.position.copy(item.pos);scene.add(g);return g;}
  function lootGeometry(kind){return cached('loot:'+kind,()=>{const W=REG.white;const c=(h)=>new T.Color(h);const item={kind};if(item.kind==='medkit')return mergeParts([{geo:boxGeo(.5,.32,.34),matrix:M4(0,0,0),color:c(0xe8e4dc),region:W,solid:true},{geo:boxGeo(.26,.02,.07),matrix:M4(0,.17,0),color:c(0xd8302a),region:W,solid:true},{geo:boxGeo(.07,.02,.26),matrix:M4(0,.17,0),color:c(0xd8302a),region:W,solid:true},{geo:boxGeo(.2,.06,.04),matrix:M4(0,.19,0),color:c(0x333333),region:W,solid:true}]);
      if(item.kind==='armor')return mergeParts([{geo:boxGeo(.46,.5,.14),matrix:M4(0,0,0),color:c(0x3e6a78),region:W,solid:true},{geo:boxGeo(.38,.4,.04),matrix:M4(0,0,.09),color:c(0x5e9aa8),region:W,solid:true},{geo:boxGeo(.1,.14,.2),matrix:M4(-.15,.3,0),color:c(0x2e4a54),region:W,solid:true},{geo:boxGeo(.1,.14,.2),matrix:M4(.15,.3,0),color:c(0x2e4a54),region:W,solid:true}]);
      if(item.kind==='grenade')return mergeParts([{geo:new T.SphereGeometry(.11,12,8),matrix:M4(0,0,0,0,0,0,1,1.2,1),color:c(0x4a5a34),region:W,solid:true},{geo:new T.CylinderGeometry(.05,.05,.07,8),matrix:M4(0,.15,0),color:c(0x8a8a80),region:W,solid:true},{geo:boxGeo(.02,.12,.04),matrix:M4(.06,.08,0,0,0,-.3),color:c(0x8a8a80),region:W,solid:true}]);
      const parts=[{geo:boxGeo(.48,.26,.3),matrix:M4(0,0,0),color:c(0x5a6640),region:W,solid:true},{geo:boxGeo(.5,.04,.32),matrix:M4(0,.14,0),color:c(0x3e4630),region:W,solid:true}];for(let i=0;i<5;i++)parts.push({geo:new T.CylinderGeometry(.02,.02,.12,6),matrix:M4(-.16+i*.08,.21,0),color:c(0xd8b050),region:W,solid:true});return mergeParts(parts);});}
  function grenadeMesh(){const m=new T.Mesh(lootGeometry('grenade'),characterMaterial());m.castShadow=true;return m;}

  const _kit={mat,worldMat,emissiveMat,mesh,box,cylinder,cached,boxGeo,tex,paint,fbm,hash2,windify,displace,mergeParts,M4,spriteTex,noiseTex,uniforms,materials,geometries};
  root.Art={_kit,buildWorld,sky,setSky,atmosphere,makeGun,makeEnemy,makeLoot,gunGeometry,grenadeMesh,characterMaterial,mat,materials,geometries,uniforms,noiseTex,spriteTex,RARITY,RARITY_INFO,OPTIC,OPTIC_INFO,setNight,tex};
})(globalThis);
