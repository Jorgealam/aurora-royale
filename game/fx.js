/* Aurora Royale 2.0 · efeitos visuais.
   Pós-processamento HDR (bloom, raios de sol, gradação de cor, aberração, granulação, vinheta),
   partículas, traçantes de bala, marcas de impacto, chuva, poeira, vaga-lumes e pássaros. */
(function(root){
  'use strict';
  const T=THREE;
  const QUAD_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const shader=(fs,uniforms)=>new T.ShaderMaterial({vertexShader:QUAD_VS,fragmentShader:fs,uniforms,depthTest:false,depthWrite:false});

  /* ---------- Pós-processamento ---------- */
  class PostFX{
    constructor(renderer){this.renderer=renderer;this.enabled=true;this.msaa=4;this.godrays=true;
      this.params={bloom:true,bloomStrength:.55,bloomThreshold:1.6,bloomRadius:.85,godrayStrength:.55,exposure:1.05,contrast:1.06,saturation:1.1,temperature:.05,vignette:.34,grain:.03,chromatic:.0012,sharpen:.2,lift:.0};
      this.state={hurt:0,flash:0,desat:0,suppress:0,time:0,sunUv:new T.Vector2(.5,.5),sunVisible:0,rayTint:new T.Color(1,.85,.65)};
      this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.quad=new T.Mesh(new T.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.scene=new T.Scene();this.scene.add(this.quad);
      this.mips=[];this.width=0;this.height=0;
      this.brightMat=shader(`uniform sampler2D tDiffuse;uniform vec2 texel;uniform float threshold;varying vec2 vUv;
        vec3 s(vec2 o){return texture2D(tDiffuse,vUv+o*texel).rgb;}
        void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)))*.25;float br=max(c.r,max(c.g,c.b));float knee=threshold*.5;float rq=clamp(br-threshold+knee,0.,2.*knee);rq=rq*rq/(4.*knee+1e-4);float w=max(rq,br-threshold)/max(br,1e-4);c=min(c*w,vec3(40.));c=mix(vec3(0.),c,vec3(equal(c,c)));gl_FragColor=vec4(max(c,vec3(0.)),1.);}`,{tDiffuse:{value:null},texel:{value:new T.Vector2()},threshold:{value:1}});
      this.downMat=shader(`uniform sampler2D tDiffuse;uniform vec2 texel;varying vec2 vUv;
        void main(){vec2 h=texel;vec3 c=texture2D(tDiffuse,vUv).rgb*4.;c+=texture2D(tDiffuse,vUv-h).rgb;c+=texture2D(tDiffuse,vUv+h).rgb;c+=texture2D(tDiffuse,vUv+vec2(h.x,-h.y)).rgb;c+=texture2D(tDiffuse,vUv-vec2(h.x,-h.y)).rgb;gl_FragColor=vec4(c/8.,1.);}`,{tDiffuse:{value:null},texel:{value:new T.Vector2()}});
      this.upMat=shader(`uniform sampler2D tDiffuse;uniform vec2 texel;uniform float weight;varying vec2 vUv;
        void main(){vec2 h=texel;vec3 c=texture2D(tDiffuse,vUv+vec2(-h.x*2.,0.)).rgb;c+=texture2D(tDiffuse,vUv+vec2(-h.x,h.y)).rgb*2.;c+=texture2D(tDiffuse,vUv+vec2(0.,h.y*2.)).rgb;c+=texture2D(tDiffuse,vUv+vec2(h.x,h.y)).rgb*2.;c+=texture2D(tDiffuse,vUv+vec2(h.x*2.,0.)).rgb;c+=texture2D(tDiffuse,vUv+vec2(h.x,-h.y)).rgb*2.;c+=texture2D(tDiffuse,vUv+vec2(0.,-h.y*2.)).rgb;c+=texture2D(tDiffuse,vUv+vec2(-h.x,-h.y)).rgb*2.;gl_FragColor=vec4(c/12.*weight,1.);}`,{tDiffuse:{value:null},texel:{value:new T.Vector2()},weight:{value:1}});
      this.upMat.blending=T.AdditiveBlending;this.upMat.transparent=true;
      this.rayMat=shader(`uniform sampler2D tDiffuse;uniform vec2 sun;uniform float density;varying vec2 vUv;
        void main(){vec2 uv=vUv;vec2 d=(uv-sun)*density/40.;float illum=1.;vec3 acc=vec3(0.);for(int i=0;i<40;i++){uv-=d;vec3 s=texture2D(tDiffuse,clamp(uv,0.,1.)).rgb;acc+=s*illum;illum*=.955;}gl_FragColor=vec4(acc/40.,1.);}`,{tDiffuse:{value:null},sun:{value:new T.Vector2()},density:{value:.9}});
      this.compMat=shader(`uniform sampler2D tScene,tBloom,tRays,tBlur;uniform float adsBlur;uniform vec2 texel;uniform float bloomStrength,raysStrength,exposure,contrast,saturation,temperature,vignette,grain,chromatic,sharpen,time,hurt,flash,desat,suppress,lift;uniform vec3 rayTint;varying vec2 vUv;
        vec3 aces(vec3 x){const mat3 m1=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);const mat3 m2=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);vec3 v=m1*x;vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return clamp(m2*(a/b),0.,1.);}
        vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
        float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){vec2 uv=vUv;vec2 dc=uv-.5;float r2=dot(dc,dc);float ca=chromatic*(1.+hurt*5.+suppress*3.);
          vec3 col=vec3(texture2D(tScene,uv-dc*ca).r,texture2D(tScene,uv).g,texture2D(tScene,uv+dc*ca).b);
          if(sharpen>0.){vec3 n=texture2D(tScene,uv+vec2(texel.x,0.)).rgb+texture2D(tScene,uv-vec2(texel.x,0.)).rgb+texture2D(tScene,uv+vec2(0.,texel.y)).rgb+texture2D(tScene,uv-vec2(0.,texel.y)).rgb;col=max(col+(col*4.-n)*sharpen*.25,0.);}
          if(adsBlur>0.){col=mix(col,texture2D(tBlur,uv).rgb,adsBlur*smoothstep(.03,.3,r2*2.));}
          col+=texture2D(tBloom,uv).rgb*bloomStrength;
          col+=texture2D(tRays,uv).rgb*raysStrength*rayTint;
          col*=exposure;col*=vec3(1.+temperature*.12,1.,1.-temperature*.12);
          col=aces(col);
          float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,saturation*(1.-desat*.75));
          col=(col-.5)*contrast+.5;col=col+lift*(1.-col);
          col=mix(col,col*vec3(.92,.98,1.08),(1.-l)*.35);col=mix(col,col*vec3(1.06,1.,.92),l*.25);
          col=clamp(col,0.,1.);
          col*=1.-vignette*smoothstep(.12,.75,r2*2.)-suppress*.25*smoothstep(.05,.6,r2*2.);
          col=mix(col,vec3(.5,.02,.01),hurt*smoothstep(.1,.75,r2*2.)*.7);
          col+=flash;
          col=toSRGB(clamp(col,0.,1.));
          col+=(hash(uv*vec2(1920.,1080.)+fract(time)*100.)-.5)*grain;
          gl_FragColor=vec4(col,1.);}`,{tScene:{value:null},tBloom:{value:null},tBlur:{value:null},adsBlur:{value:0},tRays:{value:null},texel:{value:new T.Vector2()},bloomStrength:{value:.6},raysStrength:{value:.5},exposure:{value:1},contrast:{value:1},saturation:{value:1},temperature:{value:0},vignette:{value:.3},grain:{value:.03},chromatic:{value:.001},sharpen:{value:.2},time:{value:0},hurt:{value:0},flash:{value:0},desat:{value:0},suppress:{value:0},lift:{value:0},rayTint:{value:new T.Color()}});
      this.black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);this.black.needsUpdate=true;
    }
    setSize(w,h,pixelRatio){const W=Math.max(1,Math.floor(w*pixelRatio)),H=Math.max(1,Math.floor(h*pixelRatio));if(W===this.width&&H===this.height&&this.hdr&&this.hdr.samples===this.msaa)return;this.width=W;this.height=H;this.dispose();
      const isGL2=this.renderer.capabilities.isWebGL2;this.hdr=new T.WebGLRenderTarget(W,H,{type:T.HalfFloatType,samples:isGL2?this.msaa:0});
      let mw=W>>1,mh=H>>1;for(let i=0;i<6;i++){this.mips.push(new T.WebGLRenderTarget(Math.max(1,mw),Math.max(1,mh),{type:T.HalfFloatType,depthBuffer:false}));mw>>=1;mh>>=1;}
      this.blur1=new T.WebGLRenderTarget(Math.max(1,W>>1),Math.max(1,H>>1),{type:T.HalfFloatType,depthBuffer:false});this.blur2=new T.WebGLRenderTarget(Math.max(1,W>>2),Math.max(1,H>>2),{type:T.HalfFloatType,depthBuffer:false});
      this.rays=new T.WebGLRenderTarget(Math.max(1,W>>2),Math.max(1,H>>2),{type:T.HalfFloatType,depthBuffer:false});}
    dispose(){this.hdr?.dispose();for(const m of this.mips)m.dispose();this.mips=[];this.rays?.dispose();this.blur1?.dispose();this.blur2?.dispose();this.hdr=null;}
    pass(material,target,clear=true){this.quad.material=material;this.renderer.setRenderTarget(target);if(clear)this.renderer.clear(true,false,false);this.renderer.render(this.scene,this.camera);}
    render(scene,camera,viewScene,viewCamera,drawView){const r=this.renderer;
      if(!this.enabled){r.setRenderTarget(null);r.clear();r.render(scene,camera);if(drawView){r.clearDepth();r.render(viewScene,viewCamera);}return;}
      r.setRenderTarget(this.hdr);r.clear();r.render(scene,camera);if(drawView){r.clearDepth();r.render(viewScene,viewCamera);}
      const p=this.params,s=this.state;let bloomTex=this.black,rayTex=this.black;
      if(p.bloom||this.godrays){const m0=this.mips[0];this.brightMat.uniforms.tDiffuse.value=this.hdr.texture;this.brightMat.uniforms.texel.value.set(1/this.width,1/this.height);this.brightMat.uniforms.threshold.value=p.bloomThreshold;this.pass(this.brightMat,m0);}
      if(p.bloom){for(let i=1;i<this.mips.length;i++){const src=this.mips[i-1];this.downMat.uniforms.tDiffuse.value=src.texture;this.downMat.uniforms.texel.value.set(1/src.width,1/src.height);this.pass(this.downMat,this.mips[i]);}
        for(let i=this.mips.length-1;i>0;i--){const src=this.mips[i];this.upMat.uniforms.tDiffuse.value=src.texture;this.upMat.uniforms.texel.value.set(.5/src.width,.5/src.height);this.upMat.uniforms.weight.value=p.bloomRadius;this.pass(this.upMat,this.mips[i-1],false);}bloomTex=this.mips[0].texture;}
      if(this.godrays&&s.sunVisible>.01){this.rayMat.uniforms.tDiffuse.value=this.mips[0].texture;this.rayMat.uniforms.sun.value.copy(s.sunUv);this.pass(this.rayMat,this.rays);rayTex=this.rays.texture;}
      let blurTex=this.black;if(s.adsBlur>.01){this.downMat.uniforms.tDiffuse.value=this.hdr.texture;this.downMat.uniforms.texel.value.set(1/this.width,1/this.height);this.pass(this.downMat,this.blur1);this.downMat.uniforms.tDiffuse.value=this.blur1.texture;this.downMat.uniforms.texel.value.set(1/this.blur1.width,1/this.blur1.height);this.pass(this.downMat,this.blur2);blurTex=this.blur2.texture;}
      const u=this.compMat.uniforms;u.tBlur.value=blurTex;u.adsBlur.value=s.adsBlur||0;u.tScene.value=this.hdr.texture;u.tBloom.value=bloomTex;u.tRays.value=rayTex;u.texel.value.set(1/this.width,1/this.height);u.bloomStrength.value=p.bloom?p.bloomStrength:0;u.raysStrength.value=this.godrays?p.godrayStrength*s.sunVisible:0;u.rayTint.value.copy(s.rayTint);
      for(const k of ['contrast','saturation','temperature','vignette','grain','chromatic','sharpen','lift'])u[k].value=p[k];u.exposure.value=p.exposure*(s.autoExposure||1)*(s.mapExposure||1);u.saturation.value=p.saturation*(s.mapSaturation||1);u.time.value=s.time;u.hurt.value=s.hurt;u.flash.value=s.flash;u.desat.value=s.desat;u.suppress.value=s.suppress;
      this.pass(this.compMat,null);}
  }

  /* ---------- Partículas (pontos com textura procedural) ---------- */
  const PART_VS=`attribute vec4 aColor;attribute float aSize;attribute float aRot;uniform float scale;varying vec4 vColor;varying float vRot;
    #include <fog_pars_vertex>
    void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_PointSize=min(aSize*scale/max(.1,-mvPosition.z),512.);gl_Position=projectionMatrix*mvPosition;vColor=aColor;vRot=aRot;
    #include <fog_vertex>
    }`;
  const PART_FS=`uniform sampler2D map;uniform float additive;varying vec4 vColor;varying float vRot;
    #include <fog_pars_fragment>
    void main(){vec2 c=gl_PointCoord-.5;float cs=cos(vRot),sn=sin(vRot);c=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs)+.5;vec4 t=texture2D(map,c);float a=t.a*vColor.a;if(a<.004)discard;gl_FragColor=additive>.5?vec4(vColor.rgb*t.rgb*a,1.):vec4(vColor.rgb*t.rgb,a);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`;
  function softTex(kind){const S=64,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');
    if(kind==='smoke'){for(let i=0;i<14;i++){const px=16+Math.random()*32,py=16+Math.random()*32,r=10+Math.random()*16;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}}
    else if(kind==='spark'){const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.9)');g.addColorStop(.45,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}
    else if(kind==='chunk'){x.fillStyle='#fff';x.beginPath();x.moveTo(20,14);x.lineTo(48,22);x.lineTo(44,50);x.lineTo(16,42);x.closePath();x.fill();}
    else{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t;}
  class Particles{
    constructor(scene,max,{additive=false,texture='soft',fog=true}={}){this.max=max;this.list=[];this.free=[];
      const g=new T.BufferGeometry();this.pos=new Float32Array(max*3);this.col=new Float32Array(max*4);this.size=new Float32Array(max);this.rot=new Float32Array(max);
      g.setAttribute('position',new T.BufferAttribute(this.pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('aColor',new T.BufferAttribute(this.col,4).setUsage(T.DynamicDrawUsage));g.setAttribute('aSize',new T.BufferAttribute(this.size,1).setUsage(T.DynamicDrawUsage));g.setAttribute('aRot',new T.BufferAttribute(this.rot,1).setUsage(T.DynamicDrawUsage));g.setDrawRange(0,0);
      this.material=new T.ShaderMaterial({uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{map:{value:null},scale:{value:500},additive:{value:additive?1:0}}]),vertexShader:PART_VS,fragmentShader:PART_FS,transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending,fog});
      this.material.uniforms.map.value=softTex(texture);this.points=new T.Points(g,this.material);this.points.frustumCulled=false;this.points.renderOrder=additive?6:5;scene.add(this.points);this.geometry=g;}
    spawn(o){if(this.list.length>=this.max||this.disabled)return null;const p=this.free.pop()||{};p.x=o.x;p.y=o.y;p.z=o.z;p.vx=o.vx||0;p.vy=o.vy||0;p.vz=o.vz||0;p.age=0;p.life=o.life||1;p.s0=o.size||.3;p.s1=o.sizeEnd??p.s0;p.r=o.r??1;p.g=o.g??1;p.b=o.b??1;p.r1=o.r1??p.r;p.g1=o.g1??p.g;p.b1=o.b1??p.b;p.a0=o.alpha??1;p.a1=o.alphaEnd??0;p.drag=o.drag??0;p.grav=o.gravity??0;p.rot=o.rot??Math.random()*6.28;p.spin=o.spin??0;p.fadeIn=o.fadeIn||0;p.floor=o.floor??-1e9;this.list.push(p);return p;}
    update(dt,camera,renderer){const L=this.list;let n=0;for(let i=0;i<L.length;i++){const p=L[i];p.age+=dt;if(p.age>=p.life){this.free.push(p);continue;}const k=Math.exp(-p.drag*dt);p.vx*=k;p.vy=p.vy*k-p.grav*dt;p.vz*=k;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<p.floor){p.y=p.floor;p.vy*=-.3;p.vx*=.6;p.vz*=.6;}p.rot+=p.spin*dt;const t=p.age/p.life;L[n++]=p;}
      L.length=n;const cnt=Math.min(n,this.max);for(let i=0;i<cnt;i++){const p=L[i],t=p.age/p.life;this.pos[i*3]=p.x;this.pos[i*3+1]=p.y;this.pos[i*3+2]=p.z;const fi=p.fadeIn?Math.min(1,p.age/p.fadeIn):1;this.col[i*4]=p.r+(p.r1-p.r)*t;this.col[i*4+1]=p.g+(p.g1-p.g)*t;this.col[i*4+2]=p.b+(p.b1-p.b)*t;this.col[i*4+3]=(p.a0+(p.a1-p.a0)*t)*fi;this.size[i]=p.s0+(p.s1-p.s0)*t;this.rot[i]=p.rot;}
      const g=this.geometry;g.setDrawRange(0,cnt);for(const k of ['position','aColor','aSize','aRot'])g.attributes[k].needsUpdate=true;
      this.material.uniforms.scale.value=renderer.getDrawingBufferSize(tmpV2).y*.5*camera.projectionMatrix.elements[5];}
    clear(){for(const p of this.list)this.free.push(p);this.list.length=0;this.geometry.setDrawRange(0,0);}
  }
  const tmpV2=new T.Vector2();

  /* ---------- Traçantes: fitas brilhantes viradas para a câmera ---------- */
  class Tracers{
    constructor(scene,max){this.max=max;const base=new T.PlaneGeometry(1,1);base.translate(.5,0,0);const g=new T.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
      this.a=new Float32Array(max*3);this.b=new Float32Array(max*3);this.c=new Float32Array(max*4);g.setAttribute('aA',new T.InstancedBufferAttribute(this.a,3).setUsage(T.DynamicDrawUsage));g.setAttribute('aB',new T.InstancedBufferAttribute(this.b,3).setUsage(T.DynamicDrawUsage));g.setAttribute('aC',new T.InstancedBufferAttribute(this.c,4).setUsage(T.DynamicDrawUsage));g.instanceCount=0;
      this.material=new T.ShaderMaterial({vertexShader:`attribute vec3 aA;attribute vec3 aB;attribute vec4 aC;varying vec4 vC;varying vec2 vUv;void main(){vec4 a=viewMatrix*vec4(aA,1.);vec4 b=viewMatrix*vec4(aB,1.);vec3 p=mix(a.xyz,b.xyz,position.x);vec3 d=normalize(b.xyz-a.xyz+vec3(1e-5));vec3 side=normalize(cross(d,normalize(p)));float w=aC.w*(.4+.6*position.x)*max(1.,-p.z*.012);p+=side*position.y*w;vC=aC;vUv=uv;gl_Position=projectionMatrix*vec4(p,1.);}`,
        fragmentShader:`varying vec4 vC;varying vec2 vUv;void main(){float core=clamp(1.-abs(vUv.y-.5)*2.,0.,1.);core=pow(core,1.5);float tail=smoothstep(0.,.9,clamp(vUv.x,0.,1.));gl_FragColor=vec4(vC.rgb*core*tail,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
      this.mesh=new T.Mesh(g,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=7;scene.add(this.mesh);this.geometry=g;this.n=0;}
    begin(){this.n=0;}
    add(ax,ay,az,bx,by,bz,r,g,b,w){if(this.n>=this.max)return;const i=this.n++;this.a[i*3]=ax;this.a[i*3+1]=ay;this.a[i*3+2]=az;this.b[i*3]=bx;this.b[i*3+1]=by;this.b[i*3+2]=bz;this.c[i*4]=r;this.c[i*4+1]=g;this.c[i*4+2]=b;this.c[i*4+3]=w;}
    end(){const g=this.geometry;g.instanceCount=this.n;for(const k of ['aA','aB','aC'])g.attributes[k].needsUpdate=true;}
  }

  /* ---------- Marcas de impacto ---------- */
  function decalTex(kind){const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');
    if(kind==='hole'){let g=x.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'rgba(10,8,6,1)');g.addColorStop(.18,'rgba(20,16,12,1)');g.addColorStop(.3,'rgba(60,50,40,.7)');g.addColorStop(.6,'rgba(40,32,26,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,S,S);x.strokeStyle='rgba(20,16,12,.6)';x.lineWidth=2;for(let i=0;i<6;i++){const a=Math.random()*6.28;x.beginPath();x.moveTo(64+Math.cos(a)*12,64+Math.sin(a)*12);x.lineTo(64+Math.cos(a)*(26+Math.random()*20),64+Math.sin(a)*(26+Math.random()*20));x.stroke();}}
    else{for(let i=0;i<30;i++){const px=64+(Math.random()-.5)*60,py=64+(Math.random()-.5)*60,r=10+Math.random()*30;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(12,10,8,.5)');g.addColorStop(1,'rgba(12,10,8,0)');x.fillStyle=g;x.fillRect(0,0,S,S);}}
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t;}
  class Decals{
    constructor(scene,max,kind){this.max=max;this.i=0;this.mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshLambertMaterial({map:decalTex(kind),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),max);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;const z=new T.Matrix4().makeScale(0,0,0);for(let k=0;k<max;k++)this.mesh.setMatrixAt(k,z);scene.add(this.mesh);this.o=new T.Object3D();this.q=new T.Quaternion();this.up=new T.Vector3(0,0,1);}
    add(p,n,size){const o=this.o;o.position.copy(p).addScaledVector(n,.012);o.quaternion.setFromUnitVectors(this.up,n);this.q.setFromAxisAngle(this.up,Math.random()*6.28);o.quaternion.multiply(this.q);o.scale.setScalar(size);o.updateMatrix();this.mesh.setMatrixAt(this.i,o.matrix);this.i=(this.i+1)%this.max;this.mesh.instanceMatrix.needsUpdate=true;}
    clear(){const z=new T.Matrix4().makeScale(0,0,0);for(let k=0;k<this.max;k++)this.mesh.setMatrixAt(k,z);this.mesh.instanceMatrix.needsUpdate=true;}
  }

  /* ---------- Ambiente: poeira/pólen, vaga-lumes, chuva ---------- */
  function ambientField(scene,count,size,{additive,color,pointSize,kind}){const g=new T.BufferGeometry(),p=new Float32Array(count*3),s=new Float32Array(count);for(let i=0;i<count;i++){p[i*3]=Math.random()*size;p[i*3+1]=Math.random()*size*.4;p[i*3+2]=Math.random()*size;s[i]=Math.random();}g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aSeed',new T.BufferAttribute(s,1));
    const m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uSize:{value:size},uAlpha:{value:1},uColor:{value:new T.Color(...color)},uPoint:{value:pointSize},uScale:{value:500},map:{value:softTex(kind==='fire'?'spark':'soft')}},
      vertexShader:`attribute float aSeed;uniform float uTime,uSize,uPoint,uScale;varying float vA;void main(){vec3 org=cameraPosition-vec3(uSize*.5,uSize*.15,uSize*.5);vec3 p=position;p.x+=sin(uTime*.3+aSeed*20.)*2.+uTime*.4;p.z+=cos(uTime*.25+aSeed*13.)*2.;p.y+=sin(uTime*.5+aSeed*9.)*1.;vec3 w=org+mod(p-org,vec3(uSize,uSize*.4,uSize));vec4 mv=viewMatrix*vec4(w,1.);gl_PointSize=uPoint*uScale/max(.5,-mv.z);gl_Position=projectionMatrix*mv;float d=length(w-cameraPosition);vA=(1.-smoothstep(uSize*.3,uSize*.5,d))*(${kind==='firefly'?'.5+.5*sin(uTime*3.+aSeed*40.)':'1.'});}`,
      fragmentShader:`uniform sampler2D map;uniform vec3 uColor;uniform float uAlpha;varying float vA;void main(){vec4 t=texture2D(map,gl_PointCoord);float a=t.a*vA*uAlpha;if(a<.01)discard;gl_FragColor=${additive?'vec4(uColor*a,1.)':'vec4(uColor,a)'};
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending});
    const pts=new T.Points(g,m);pts.frustumCulled=false;pts.renderOrder=4;scene.add(pts);return pts;}
  function rainField(scene,count=9000,size=46){const g=new T.BufferGeometry(),p=new Float32Array(count*6),s=new Float32Array(count*2);for(let i=0;i<count;i++){const x=Math.random()*size,y=Math.random()*24,z=Math.random()*size,r=Math.random();p.set([x,y,z,x,y,z],i*6);s[i*2]=0;s[i*2+1]=1;}const end=new Float32Array(count*2);for(let i=0;i<count;i++){end[i*2]=0;end[i*2+1]=1;}g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aEnd',new T.BufferAttribute(end,1));
    const m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uSize:{value:size},uAlpha:{value:0},uWind:{value:new T.Vector2(.8,.6)}},vertexShader:`attribute float aEnd;uniform float uTime,uSize;uniform vec2 uWind;varying float vA;void main(){vec3 org=cameraPosition-vec3(uSize*.5,6.,uSize*.5);vec3 p=position;p.y-=uTime*22.;p.xz+=uWind*uTime*2.;vec3 w=org+mod(p-org,vec3(uSize,24.,uSize));w.y-=aEnd*.7;w.xz-=uWind*aEnd*.06;vec4 mv=viewMatrix*vec4(w,1.);gl_Position=projectionMatrix*mv;vA=(1.-smoothstep(uSize*.25,uSize*.5,length(w.xz-cameraPosition.xz)))*(.35+aEnd*.65);}`,
      fragmentShader:`uniform float uAlpha;varying float vA;void main(){gl_FragColor=vec4(.75,.8,.86,vA*uAlpha*.5);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,transparent:true,depthWrite:false});
    const lines=new T.LineSegments(g,m);lines.frustumCulled=false;lines.visible=false;lines.renderOrder=8;scene.add(lines);return lines;}

  /* ---------- Pássaros em bandos ---------- */
  function birds(scene,count=26){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,.25, -.9,0,-.05, 0,0,-.2, 0,0,.25, 0,0,-.2, .9,0,-.05, 0,0,.35,0,0,-.3,0,-.05,0],3));g.computeVertexNormals();
    const m=new T.MeshBasicMaterial({color:0x14181a,side:T.DoubleSide});m.onBeforeCompile=sh=>{sh.uniforms.uTime=Art.uniforms.time;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.3;transformed.y+=abs(transformed.x)*sin(uTime*11.+ph)*.7;');};m.customProgramCacheKey=()=>'birds';
    const im=new T.InstancedMesh(g,m,count);im.frustumCulled=false;scene.add(im);const flocks=[{cx:-60,cz:-80,r:70,h:48,s:.08,n:14},{cx:90,cz:60,r:90,h:62,s:-.06,n:count-14}];const d=new T.Object3D();const seeds=Array.from({length:count},()=>[Math.random()*6,Math.random()*8-4,Math.random()*6-3,1.2+Math.random()*.6]);
    im.userData.update=t=>{let k=0;for(const f of flocks)for(let i=0;i<f.n;i++,k++){const sd=seeds[k];const a=t*f.s+sd[0]*.08+i*.04;d.position.set(f.cx+Math.cos(a)*(f.r+sd[1]*2),f.h+sd[2]+Math.sin(t*.7+sd[0])*1.5,f.cz+Math.sin(a)*(f.r+sd[1]*2));d.rotation.set(0,-a+(f.s>0?Math.PI:0),Math.sin(t+sd[0])*.2);d.scale.setScalar(sd[3]);d.updateMatrix();im.setMatrixAt(k,d.matrix);}im.instanceMatrix.needsUpdate=true;};return im;}

  /* ---------- Textos flutuantes (números de dano, rótulos de depuração) ---------- */
  class FloatingText{
    constructor(container,max=40){this.container=container;this.items=[];this.v=new T.Vector3();for(let i=0;i<max;i++){const el=document.createElement('span');el.className='floater';el.style.display='none';container.appendChild(el);this.items.push({el,active:false,pos:new T.Vector3(),age:0,life:1,vy:0,dx:0});}}
    add(pos,text,cls=''){const it=this.items.find(i=>!i.active)||this.items.reduce((a,b)=>a.age>b.age?a:b);it.active=true;it.pos.copy(pos);it.age=0;it.life=.9;it.vy=1.4;it.dx=(Math.random()-.5)*.8;it.el.textContent=text;it.el.className='floater '+cls;it.el.style.display='block';}
    update(dt,camera,w,h){for(const it of this.items){if(!it.active)continue;it.age+=dt;if(it.age>=it.life){it.active=false;it.el.style.display='none';continue;}it.pos.y+=it.vy*dt;it.vy*=.92;it.pos.x+=it.dx*dt;this.v.copy(it.pos).project(camera);if(this.v.z>1){it.el.style.display='none';continue;}it.el.style.display='block';const t=it.age/it.life;it.el.style.transform=`translate(${(this.v.x*.5+.5)*w}px,${(-this.v.y*.5+.5)*h}px) translate(-50%,-50%) scale(${t<.15?1+(.15-t)*4:1})`;it.el.style.opacity=t>.6?(1-t)/.4:1;}}
    clear(){for(const it of this.items){it.active=false;it.el.style.display='none';}}
  }

  root.FX={PostFX,Particles,Tracers,Decals,FloatingText,ambientField,rainField,birds};
})(globalThis);
