// ---------------- tree ----------------
const TREE_COLORS={teal:['#3cc6cb','#1f78a6'],deep:['#34c8c8','#157aa0'],blue:['#7a92ff','#2430b4'],sky:['#5cc2f0','#1c5aa8']};
// tapered, twisting, ridged tube (trunks, branches, roots)
function sweepTube(pts,r0,r1,{seg=40,rad=14,ridge=.07,twist=1.2,sd=0,c0='#6f6d6a',c1='#a09d98',flare=0}={}){
 const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const pos=[],col=[],idx=[];const ca=col2(c0),cb=col2(c1),tmp=new THREE.Color();
 function col2(h){return new THREE.Color(h)}
 let prevN=new THREE.Vector3(1,0,0);
 for(let i=0;i<=seg;i++){const t=i/seg,P=cv.getPoint(t),T=cv.getTangent(t).normalize();
  let N=prevN.clone().sub(T.clone().multiplyScalar(prevN.dot(T)));if(N.lengthSq()<1e-6)N.set(0,0,1);N.normalize();prevN=N;const B=new THREE.Vector3().crossVectors(T,N);
  const base=r0+(r1-r0)*Math.pow(t,.8);const fl=(1+flare*Math.exp(-t*7))*(t<.05?Math.max(.2,Math.sqrt(Math.max(0,1-Math.pow(1-t/.05,2)))):1);
  for(let k=0;k<=rad;k++){const a=k/rad*Math.PI*2;const ar=a+t*twist;
   const rg=ridge*(1-.7*Math.exp(-t*13));const rr=base*fl*(1+rg*Math.sin(ar*3+sd)+rg*.7*Math.sin(ar*5+sd*2+t*4)+rg*.4*Math.sin(ar*9+t*11))*(1+.05*Math.sin(t*9+sd));
   pos.push(P.x+(N.x*Math.cos(a)+B.x*Math.sin(a))*rr,P.y+(N.y*Math.cos(a)+B.y*Math.sin(a))*rr,P.z+(N.z*Math.cos(a)+B.z*Math.sin(a))*rr);
   const sh=.5+.5*Math.sin(ar*3+sd)*.6+.5*Math.sin(ar*5+sd*2+t*4)*.4;tmp.copy(ca).lerp(cb,Math.min(1,Math.max(0,.25+t*.5+sh*.35-.2)));
   const ao=.78+.22*Math.min(1,t*4);col.push(tmp.r*ao,tmp.g*ao,tmp.b*ao)}}
 for(let i=0;i<seg;i++)for(let k=0;k<rad;k++){const a=i*(rad+1)+k,b=a+rad+1;idx.push(a,b,a+1,b,b+1,a+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}

const _trG={},_trM={};
function treeMats(kind){if(_trM[kind])return _trM[kind];const ld=u=>{const t=new THREE.Texture();const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.src=u;t.flipY=false;t.anisotropy=4;return t};
 const mp=_trM.mp||(_trM.mp=ld(TREE_TEX.b));mp.colorSpace=THREE.SRGBColorSpace;const nm=_trM.nm||(_trM.nm=ld(TREE_TEX.n));
 const tc=new THREE.Color(TREE_COLORS[kind][0]),b=new THREE.Color(TREE_COLORS.teal[0]),hue=(tc.getHSL({}).h-b.getHSL({}).h)*6.2832;
 const hook=sh=>{sh.uniforms.hueA={value:hue};sh.fragmentShader=sh.fragmentShader.replace('uniform vec3 diffuse;','uniform vec3 diffuse;uniform float hueA;').replace('#include <map_fragment>','#include <map_fragment>\n float tsat=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));{vec3 k=vec3(.57735);float cs=cos(hueA),sn=sin(hueA);vec3 rr=diffuseColor.rgb*cs+cross(k,diffuseColor.rgb)*sn+k*dot(k,diffuseColor.rgb)*(1.-cs);diffuseColor.rgb=mix(diffuseColor.rgb,max(rr,0.),smoothstep(.06,.2,tsat));}')};
 const main=new THREE.MeshStandardMaterial({map:mp,normalMap:nm,roughness:.8,metalness:0});main.color.setScalar(1.1);main.onBeforeCompile=hook;main.customProgramCacheKey=()=>'tr'+kind;
 const glow=new THREE.MeshStandardMaterial({map:mp,normalMap:nm,emissiveMap:mp,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.6,roughness:.6});glow.onBeforeCompile=hook;glow.customProgramCacheKey=()=>'trg'+kind;
 return _trM[kind]={main,glow}}
function treePart(i){if(_trG[i])return _trG[i];const S0=TREES[i],dec=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);return u.buffer};
 const pos=new Float32Array(dec(S0.p));const mk=(idx,off)=>{const g=new THREE.BufferGeometry();let pp=pos;const nor=new Int8Array(dec(S0.n));if(off){pp=new Float32Array(pos);for(let k=0;k<pp.length;k++)pp[k]+=nor[k]/127*off}
  g.setAttribute('position',new THREE.BufferAttribute(pp,3));g.setAttribute('uv',new THREE.BufferAttribute(new Uint16Array(dec(S0.t)),2,true));g.setAttribute('normal',new THREE.BufferAttribute(nor,3,true));g.setIndex(new THREE.BufferAttribute(idx,1));return g};
 const gi=new Uint16Array(dec(S0.g));return _trG[i]={main:mk(new Uint16Array(dec(S0.i))),glow:gi.length?mk(gi,.0012):null}}
function makeScanTree(kind,i,sd=1){const g=new THREE.Group(),P=treePart(i),M=treeMats(kind),inner=new THREE.Group();
 inner.add(new THREE.Mesh(P.main,M.main));if(P.glow)inner.add(new THREE.Mesh(P.glow,M.glow));
 inner.scale.setScalar(22);inner.rotation.y=sd*2.1;g.add(inner);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeTree(kind='teal',scale=1,sd=1,opts={}){
 if(typeof TREES!=='undefined'&&scale===1&&!opts.old)return makeScanTree(kind,3,sd);
 const [top,bot]=TREE_COLORS[kind];const g=new THREE.Group();const nSpots=opts.spots===undefined?4:opts.spots;
 const bark=clay({roughness:.9});
 const CR=2.6,cy=6.35;
 // trunk: grey, twisting, flared roots; splits into branches that cradle the canopy
 const tw=(RR(-1,1)>0?1:-1)*1.3;
 g.add(new THREE.Mesh(sweepTube([[0,-.6,0],[.1,1.0,.05],[-.06,2.0,-.05],[.05,3.1,.03],[0,4.5,0]],.78,.5,{seg:44,twist:tw,sd,flare:1.7,ridge:.06,c0:'#85827c',c1:'#aeaba3'}),bark));
 const nB=3;for(let i=0;i<nB;i++){const a=i*(6.283/nB)+sd*.9+.4,ca=Math.cos(a),sa=Math.sin(a);
  g.add(new THREE.Mesh(sweepTube([[0,2.7,0],[ca*.32,3.2,sa*.32],[ca*.9,3.85,sa*.9],[ca*1.4,5.0,sa*1.4]],.5,.28,{seg:22,rad:10,twist:.5,sd:sd+i,ridge:.05,c0:'#85827c',c1:'#aeaba3'}),bark))}
 // canopy: smooth clay sphere with big raised thumb-print lobes and soft creases
 const sg=new THREE.SphereGeometry(1,150,96);{const p=sg.attributes.position;const cc=new Float32Array(p.count*3);const ct=col(top),cb=col(bot),tmp=new THREE.Color();
  const lobes=[];const nl=26;for(let i=0;i<nl;i++){const yy=1-2*(i+.5)/nl,rad=Math.sqrt(1-yy*yy),a=i*2.39996+R()*.45;lobes.push({d:new THREE.Vector3(rad*Math.cos(a),yy+RR(-.05,.05),rad*Math.sin(a)).normalize(),h:RR(.08,.14)+(i%5===0?.05:0),w:RR(.22,.32)})}
  for(let i=0;i<70;i++){const yy=1-2*(i+.5)/70,rad=Math.sqrt(1-yy*yy),a=i*2.39996+2.1;lobes.push({d:new THREE.Vector3(rad*Math.cos(a),yy,rad*Math.sin(a)).normalize(),h:RR(.02,.035),w:RR(.12,.18)})}
  const v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i)).normalize();
   let r=1+(fbm(v.x*1.3+sd,v.y*1.3,v.z*1.3+sd)-.5)*.13+(fbm(v.x*7+sd,v.y*7,v.z*7)-.5)*.004;let bm=0;
   for(const l of lobes){const c=1-v.dot(l.d);const t=Math.max(0,1-c/(l.w*l.w));const b=l.h*t*t*(3-2*t);bm=bm+b-bm*b/(l.h*1.0+1e-6)*0; if(b>bm)bm=b}
   r+=bm;if(v.y<-.55)r-=.07*(-v.y-.55);
   const y=v.y*r*CR*.9;p.setXYZ(i,v.x*r*CR,y+cy,v.z*r*CR);
   const k=Math.min(1,Math.max(0,.52+.5*v.y+(fbm(v.x*2.2+sd,v.y*2.2,v.z*2.2)-.5)*.2));tmp.copy(cb).lerp(ct,Math.pow(k,1.1));tmp.multiplyScalar(.84+Math.min(.28,bm*2.2));cc[i*3]=tmp.r;cc[i*3+1]=tmp.g;cc[i*3+2]=tmp.b}
  sg.setAttribute('color',new THREE.BufferAttribute(cc,3));sg.computeVertexNormals()}
 const can=new THREE.Mesh(sg,clay({roughness:.92}));g.add(can);
 // glowing spots, ray-cast to the real surface
 const gc=kind==='blue'?'#a8c4ff':kind==='sky'?'#b4f2ff':'#8afcf4';
 g.updateMatrixWorld(true);const rc=new THREE.Raycaster();
 const specs=[[1.3,.05,.9],[2.5,-.12,.55],[.2,.18,.5],[3.7,.2,.6],[4.9,-.1,.8],[5.7,.15,.45],[3.0,-.28,.5]].slice(0,nSpots);
 specs.forEach(([a,yy,sz])=>{a+=sd*.7;const q=Math.sqrt(1-yy*yy);const dir=new THREE.Vector3(Math.cos(a)*q,yy,Math.sin(a)*q);const org=new THREE.Vector3(0,cy,0).addScaledVector(dir,9);rc.set(org,dir.clone().negate());const hit=rc.intersectObject(can)[0];if(!hit)return;
  const n=hit.face.normal.clone().transformDirection(can.matrixWorld);const pos=hit.point.clone();
  const d=new THREE.Mesh(new THREE.CircleGeometry(.27*sz,28),new THREE.MeshBasicMaterial({color:new THREE.Color(gc).multiplyScalar(1.9)}));d.position.copy(pos).addScaledVector(n,.03);d.scale.set(1,1.18,1);d.lookAt(pos.clone().add(n));g.add(d);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.27*sz,.4*sz,28),new THREE.MeshBasicMaterial({color:gc,transparent:true,opacity:.28,depthWrite:false}));ring.position.copy(d.position).addScaledVector(n,.01);ring.scale.copy(d.scale);ring.quaternion.copy(d.quaternion);g.add(ring);
  g.add(glow(gc,.95*sz,pos.clone().addScaledVector(n,.1)))});
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(scale);return g}
// ---------------- rocks / node / crystals (from reference sheet) ----------------
function slabGeo(w,h,d,r,topC,botC,sd,{amp=.09,streak=.12,seg=7}={}){
 const m=rbox(w,h,d,r,std('#fff'),seg);const g=m.geometry;const p=g.attributes.position;const c=new Float32Array(p.count*3);const ct=col(topC),cb=col(botC),t=new THREE.Color();
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=(fbm(x*.9+sd,y*.9,z*.9+sd*.7)-.5)*2;const nx=g.attributes.normal.getX(i),ny=g.attributes.normal.getY(i),nz=g.attributes.normal.getZ(i);
  p.setXYZ(i,x+nx*n*amp*h,y+ny*n*amp*h,z+nz*n*amp*h);
  const k=Math.min(1,Math.max(0,(y/h)+.5+(fbm(x*2+sd,y*2,z*2)-.5)*.35));t.copy(cb).lerp(ct,k);const sv=1+(Math.sin(x*5+sd)*.5+Math.sin(z*7)*.3)*streak*.5;c[i*3]=t.r*sv;c[i*3+1]=t.g*sv;c[i*3+2]=t.b*sv}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();return g}
function makeStone(scale=1,sd=1){const g=new THREE.Group();const mat=clay({roughness:.78});
 const parts=[];const vary=(sd*7)%5;
 const bw=RR(3.0,3.4),bd=RR(2.2,2.6);const bot=slabGeo(bw,2.1,bd,.34,'#b9664a','#74392e',sd,{amp:.2,seg:3,streak:.2});
 const mb=new THREE.Mesh(bot,mat);mb.position.y=1.0;g.add(mb);
 const top=slabGeo(bw*.66,1.2,bd*.7,.26,'#a8978b','#76665f',sd+3,{amp:.18,seg:3,streak:.1});const mt=new THREE.Mesh(top,mat);mt.position.set(RR(-.35,.2),2.0+.45,RR(-.2,.2));mt.rotation.set(RR(-.05,.05),RR(-.3,.3),RR(-.06,.06));g.add(mt);
 if(vary%2===0){const step=slabGeo(bw*.45,.8,bd*.5,.25,'#b8664a','#7c3f32',sd+9,{amp:.08});const ms=new THREE.Mesh(step,mat);ms.position.set(bw*.38,.4,bd*.28);ms.rotation.y=.25;g.add(ms)}
 const peb=blobGeo(.42,{sy:.7,top:'#a79a92',bot:'#6a5a58',amp:.12,detail:3,sd:sd+2,off:[RR(-.2,.9),.25,bd*.5+.1]});g.add(new THREE.Mesh(peb,clay({roughness:.8})));
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(scale*.7);g.rotation.y=sd*.9;return g}
function makeNode(scale=1,sd=1){const g=new THREE.Group();const top='#2fb0ac',bot='#0f5a78';const parts=[];
 parts.push(blobGeo(1.35,{sy:.78,sx:1.1,top,bot,amp:.1,freq:1.2,detail:5,off:[0,.72,0],sd,mid:.6}));
 parts.push(blobGeo(.5,{sy:.7,top,bot,amp:.1,detail:3,sd:sd+2,off:[1.55,.28,.35],mid:.6}));parts.push(blobGeo(.4,{sy:.7,top,bot,amp:.1,detail:3,sd:sd+4,off:[-1.4,.22,.55],mid:.6}));parts.push(blobGeo(.34,{sy:.7,top,bot,amp:.1,detail:3,sd:sd+6,off:[.3,.2,1.35],mid:.6}));parts.push(blobGeo(.3,{sy:.7,top,bot,amp:.1,detail:3,sd:sd+8,off:[-.5,.18,-1.3],mid:.6}));
 const body=new THREE.Mesh(merge(parts),clay({roughness:.62}));g.add(body);
 for(const [x,z,r] of [[1.2,1.0,.22],[-1.3,-.7,.2],[.7,-1.2,.17],[-.2,1.5,.2]]){const pb=new THREE.Mesh(blobGeo(r,{sy:.6,top:'#b49a76',bot:'#6a5238',amp:.1,detail:2,sd:x*3,off:[x,r*.4,z]}),clay({roughness:.85}));g.add(pb)}
 g.updateMatrixWorld(true);const rc=new THREE.Raycaster();const gm=new THREE.MeshStandardMaterial({color:'#7ff6ff',emissive:'#38dcff',emissiveIntensity:1.6,roughness:.2,flatShading:true});
 for(let i=0;i<9;i++){const a=i*2.4+sd,e=.35+R()*.6;const dir=new THREE.Vector3(Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e));rc.set(new THREE.Vector3(0,.5,0).addScaledVector(dir,6),dir.clone().negate());const hit=rc.intersectObject(body)[0];if(!hit)continue;
  const n=hit.face.normal.clone().transformDirection(body.matrixWorld);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.1+R()*.04),gm);gem.position.copy(hit.point).addScaledVector(n,.03);gem.lookAt(hit.point.clone().add(n));gem.scale.set(1,1,.55);g.add(gem);}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(scale*.75);g.rotation.y=sd*1.3;return g}

// ---- teal ore: crystal geode on grey rock (sheet: embedded seam -> emerging -> rich deposit -> mature geode) ----
const GEO_ROCK=std('#6d707c',{roughness:.9,flatShading:true});
const GEO_CRY=new THREE.MeshStandardMaterial({color:'#22b0f2',emissive:'#0a88e0',emissiveIntensity:.8,roughness:.22,metalness:.05,flatShading:true});
const GEO_CRY2=new THREE.MeshStandardMaterial({color:'#3ae0f6',emissive:'#10c4e8',emissiveIntensity:.85,roughness:.22,flatShading:true});
function geoCrystal(r,h,mat){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(r*.78,r,h,6),mat);body.position.y=h/2;g.add(body);const tip=new THREE.Mesh(new THREE.ConeGeometry(r*.78,h*.38,6),mat);tip.position.y=h+h*.19;g.add(tip);return g}
function makeGeode(stage,sd=1){const g=new THREE.Group();seed=700+sd*11;const gm=clay({roughness:.86});
 const slab=(w,h,d,x,z,y,ry,tilt=.08)=>{const m=new THREE.Mesh(rockGeo(w,h,d,'#8a8f9c','#2c2f39',sd+x*5+z*3,{rad:.12,seg:16,planes:9,cut:.2,amp:.08}),gm);m.position.set(x,y+h/2,z);m.rotation.set(RR(-tilt,tilt),ry,RR(-tilt,tilt));g.add(m)};
 slab(2.0,1.05,1.7,0,0,0,.15,.03);
 const ring=stage===1?5:stage===2?8:11;for(let i=0;i<ring;i++){const a=i/ring*6.283+sd*.8+RR(-.2,.2),r=1.0+RR(0,.45),w=RR(.55,1.15);slab(w,RR(.45,.85),w*RR(.7,1),Math.cos(a)*r,Math.sin(a)*r*.85,RR(-.05,.1),RR(0,3),.2)}
 const seam=new THREE.MeshBasicMaterial({color:new THREE.Color('#34e4ff').multiplyScalar(1.5)});
 const sm=(x,z,w,y)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(w,1),seam);m.scale.set(1,.22,.7);m.position.set(x,y,z);m.rotation.y=R()*3;g.add(m)};
 if(stage===1){for(const [x,z,w] of [[.2,.1,.5],[-.6,.35,.38],[.7,-.25,.34],[-.2,-.5,.3],[.5,.5,.22],[-.9,-.2,.2]])sm(x,z,w,.98);
  g.scale.setScalar(.8)}
 else{const H=stage===2?[2.1,1.6,1.45,1.2,1.1,.9,.8,.6,.5,.45]:[4.2,3.4,3.1,2.8,2.5,2.2,1.9,1.6,1.35,1.1,.9,.75,.6,.5];
  H.forEach((h,i)=>{const a=i*2.4+sd,rr=i===0?0:Math.min(.5+i*.1,1.25)*(.7+R()*.4);const r=.25+.1*h;const c=new THREE.Mesh(crystalGeo(r,h*.95,sd+i),CRYMAT);const lean=i===0?.06:.22+rr*.5+(h<1.3?.2:0);c.position.set(Math.cos(a)*rr,.9,Math.sin(a)*rr);c.rotation.set(Math.sin(a)*lean,R()*3,-Math.cos(a)*lean);g.add(c)});
  for(let i=0;i<5;i++){const a=i*1.3+sd;sm(Math.cos(a)*1.0,Math.sin(a)*.85,.2+R()*.14,.95)}
  g.add(glow('#2ab8ff',stage===2?2.2:3,new THREE.Vector3(0,1.6,0)));
  g.scale.setScalar(stage===2?.6:.66)}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeRock(scale=1,kind='teal',sd=1){return kind==='teal'?makeNode(scale,sd):makeStone(scale,sd)}
function makeCrystal(scale=1,sd=1,count=7){const g=new THREE.Group();const mat=new THREE.MeshPhysicalMaterial({color:'#4fb8ff',emissive:'#1f86ff',emissiveIntensity:.85,roughness:.18,metalness:0,clearcoat:1,clearcoatRoughness:.15,flatShading:true});
 const specs=[[0,0,2.5,.42,0,0],[.62,.1,1.7,.34,.38,-.1],[-.62,.05,1.85,.36,-.4,.1],[.15,.52,1.0,.28,.15,.5],[-.35,.45,.85,.26,-.3,.55],[.85,-.3,.9,.24,.55,-.2],[-.9,-.25,1.0,.25,-.55,-.1]];
 for(const [x,z,h,r,tx,tz] of specs.slice(0,count)){const lat=new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(r,0),new THREE.Vector2(r,h*.68),new THREE.Vector2(r*.78,h*.82),new THREE.Vector2(0,h)],6);const m=new THREE.Mesh(lat,mat);m.position.set(x,.1,z);m.rotation.set(tz*.55,R()*3,-tx*.55);m.castShadow=true;g.add(m)}
 const base=[blobGeo(.95,{sy:.28,top:'#9c8a7a',bot:'#5e5048',amp:.12,detail:3,sd,off:[0,.1,0]}),blobGeo(.4,{sy:.5,top:'#9c8a7a',bot:'#5e5048',amp:.1,detail:2,sd:sd+1,off:[1.0,.12,.3]}),blobGeo(.3,{sy:.5,top:'#9c8a7a',bot:'#5e5048',amp:.1,detail:2,sd:sd+2,off:[-.6,.1,.8]})];
 g.add(new THREE.Mesh(merge(base),clay({roughness:.85})));
 g.add(glow('#3fa8ff',4.2,new THREE.Vector3(0,1.1,0)));g.scale.setScalar(scale*.62);return g}
// ---------------- robot (from reference sheet) ----------------
const faceTex=(()=>{const c=document.createElement('canvas');c.width=512;c.height=300;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,300);g.addColorStop(0,'#0c1c30');g.addColorStop(1,'#050c18');x.fillStyle=g;x.fillRect(0,0,512,300);
 x.lineCap='round';x.shadowColor='#4be8ff';x.shadowBlur=26;x.strokeStyle='#6af2ff';x.lineWidth=15;
 for(const cx of [158,354]){x.beginPath();x.arc(cx,150,38,Math.PI*1.12,Math.PI*1.88);x.stroke()}x.lineWidth=12;x.beginPath();x.arc(256,176,26,Math.PI*.15,Math.PI*.85);x.stroke();
 const gl=x.createRadialGradient(130,40,10,160,60,260);gl.addColorStop(0,'rgba(255,255,255,.18)');gl.addColorStop(1,'rgba(255,255,255,0)');x.shadowBlur=0;x.fillStyle=gl;x.fillRect(0,0,512,300);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t})();
function limb(a,b,c,r,mat){const curve=new THREE.CatmullRomCurve3([a,b,c]);const m=new THREE.Mesh(new THREE.TubeGeometry(curve,14,r,12,false),mat);return m}
function trackPose(t,s){const {R,HL,L}=t;s=((s%L)+L)%L;const arc=Math.PI*R;
 if(s<2*HL){return [.42-R,HL-s,Math.PI/2*0]}s-=2*HL; // bottom, moving -z
 if(s<arc){const a=s/R;return [.42-R*Math.cos(a),-HL-R*Math.sin(a),-a]}s-=arc; // back arc
 if(s<2*HL){return [.42+R,-HL+s,0]}s-=2*HL;
 const a=s/R;return [.42+R*Math.cos(a),HL+R*Math.sin(a),a]}
function rollRobot(rb,d){const u=rb.userData;if(!u.ridges)return;u.roll=(u.roll||0)+d;for(const h of u.hubs)h.rotation.x+=d/.22;for(const r of u.ridges){const p=trackPose(u.trk,r.s0+u.roll);r.m.position.y=p[0];r.m.position.z=p[1];r.m.rotation.x=p[2]}}
const _rbG={};let _rbMat=null;
function robotMat(){if(_rbMat)return _rbMat;const ld=u=>{const t=new THREE.Texture();const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.src=u;t.flipY=false;t.anisotropy=4;return t};
 const mp=ld(ROBOT_TEX.b);mp.colorSpace=THREE.SRGBColorSpace;_rbMat=new THREE.MeshStandardMaterial({map:mp,normalMap:ld(ROBOT_TEX.n),roughness:.55,metalness:.1});_rbMat.color.setScalar(1.15);return _rbMat}
function robotPart(i){if(_rbG[i])return _rbG[i];const S0=ROBOT[0],dec=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);return u.buffer};
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(dec(S0.p)),3));g.setAttribute('uv',new THREE.BufferAttribute(new Uint16Array(dec(S0.t)),2,true));
 g.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(dec(S0.n)),3,true));g.setIndex(new THREE.BufferAttribute(new Uint16Array(dec(S0.i)),1));return _rbG[i]=g}
function makeScanRobot(i=0,scale=1){const g=new THREE.Group();const m=new THREE.Mesh(robotPart(0),robotMat());m.scale.setScalar(12.8);g.add(m);g.userData.scan=true;g.userData.tip=new THREE.Vector3(-1.3,1.15,1.3);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(scale);return g}
function makeRobot(scale=1,old=false){if(!old&&typeof ROBOT!=='undefined')return makeScanRobot(0,scale);const g=new THREE.Group();
 const white=std('#eef2f9',{roughness:.3,metalness:.05}),capM=std('#a9c4d6',{roughness:.32}),rimM=std('#9fc1d2',{roughness:.28}),grey=std('#8b95a6',{roughness:.5,metalness:.15}),yel=std('#eab43a',{roughness:.45}),dark=std('#2a2d36',{roughness:.82}),cyan=new THREE.MeshBasicMaterial({color:new THREE.Color('#58ecff').multiplyScalar(1.6)});
 const body=new THREE.Group();body.position.y=1.95;body.scale.set(1,.96,1);g.add(body);
 const SP=(r,ps,pl,ts,tl,m,seg=48)=>new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg*.6|0,ps,pl,ts,tl),m);
 body.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,44),white));
 body.add(SP(1.012,0,6.283,0,.6,capM));
 body.add(SP(1.02,Math.PI/2-1.08,2.16,Math.PI/2-.68,1.1,rimM,64));
 const fm=new THREE.MeshStandardMaterial({map:faceTex,emissiveMap:faceTex,emissive:'#ffffff',emissiveIntensity:1.1,roughness:.12,metalness:.3});
 body.add(SP(1.034,Math.PI/2-.98,1.96,Math.PI/2-.56,.98,fm,64));
 body.add(SP(1.014,Math.PI/2-.78,1.56,Math.PI/2+.52,.66,yel,48));body.add(SP(1.014,Math.PI/2-.95,1.9,Math.PI/2+1.2,.3,grey,48));
 
 const chest=rbox(.4,.14,.07,.04,cyan);chest.position.set(0,-.55,.84);chest.rotation.x=.5;body.add(chest);
 body.add(SP(1.014,3*Math.PI/2-.8,1.6,Math.PI/2+.1,.8,yel,48));
 const dev=rbox(.55,.8,.13,.07,grey);dev.position.set(0,-.2,-.99);body.add(dev);const ds=rbox(.28,.1,.04,.03,cyan);ds.position.set(0,-.02,-1.06);body.add(ds);for(let i=0;i<6;i++){const dd=new THREE.Mesh(new THREE.CircleGeometry(.025,8),std('#333b48'));dd.position.set(-.07+(i%3)*.07,-.28-Math.floor(i/3)*.09,-1.065);dd.rotation.y=Math.PI;body.add(dd)}
 for(const sx of [-1,1]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.16,32),grey);ring.rotation.z=Math.PI/2;ring.position.set(sx*1.0,.06,.02);body.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.25,32),cyan);disc.position.set(sx*1.085,.06,.02);disc.rotation.y=sx*Math.PI/2;body.add(disc);body.add(glow('#58ecff',.9,new THREE.Vector3(sx*1.12,.06,.02)));
  for(let i=0;i<3;i++){const v=rbox(.02,.03,.22,.01,std('#6d7788'));v.position.set(sx*.92,.22-.1*i,-.45);body.add(v)}}
 for(const sx of [-1,1]){const tr=rbox(.72,.84,1.7,.34,std('#34373f',{roughness:.85}));tr.position.set(sx*.74,.42,0);g.add(tr);
  for(const z of [-.55,0,.55]){const hub=new THREE.Group();hub.position.set(sx*1.1,.42,z);const hm=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.12,24),std('#8e97a8',{roughness:.4,metalness:.3}));hm.rotation.z=Math.PI/2;hub.add(hm);
   for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const bt=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.04,8),std('#3a4150'));bt.rotation.z=Math.PI/2;bt.position.set(sx*.07,Math.cos(a)*.14,Math.sin(a)*.14);hub.add(bt)}
   const cap=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,10),cyan);cap.rotation.z=Math.PI/2;cap.position.x=sx*.075;hub.add(cap);g.add(hub);(g.userData.hubs=g.userData.hubs||[]).push(hub)}
  {const rm=std('#202228',{roughness:.9});const R=.42,HL=.5,L=4*HL+2*Math.PI*R,N=22;
   for(let i=0;i<N;i++){const rg=rbox(.735,.05,.11,.02,rm,2);rg.position.x=sx*.74;g.add(rg);(g.userData.ridges=g.userData.ridges||[]).push({m:rg,s0:i/N*L})}
   g.userData.trk={R,HL,L}}
  const hip=rbox(.45,.4,.5,.12,grey);hip.position.set(sx*.62,1.02,0);g.add(hip)}
 // arms: left (viewer's right) relaxed, right holds tool
 {const sx=1;const sh=new THREE.Mesh(new THREE.SphereGeometry(.3,24,18),white);sh.position.set(1.08,1.78,.05);g.add(sh);g.add(limb(new THREE.Vector3(1.08,1.78,.05),new THREE.Vector3(1.32,1.55,.1),new THREE.Vector3(1.3,1.32,.28),.22,white));const h=new THREE.Mesh(new THREE.SphereGeometry(.19,16,14),grey);h.position.set(1.32,1.22,.32);h.scale.setScalar(1.25);g.add(h)}
 {const sh=new THREE.Mesh(new THREE.SphereGeometry(.3,24,18),white);sh.position.set(-1.08,1.78,.05);g.add(sh);g.add(limb(new THREE.Vector3(-1.08,1.78,.05),new THREE.Vector3(-1.38,1.55,.2),new THREE.Vector3(-1.2,1.35,.62),.22,white));const h=new THREE.Mesh(new THREE.SphereGeometry(.19,16,14),grey);h.position.set(-1.18,1.3,.72);h.scale.setScalar(1.15);g.add(h);
  const tool=new THREE.Group();const tb=rbox(.3,.34,.62,.1,std('#c9ccd4',{roughness:.4}));tool.add(tb);const grip=rbox(.2,.34,.2,.07,std('#ee8a3a'));grip.position.set(0,-.28,-.05);tool.add(grip);const tip=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.4,14),std('#9aa3b2',{metalness:.5,roughness:.3}));tip.rotation.x=Math.PI/2;tip.position.z=.5;tool.add(tip);const lp=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),new THREE.MeshBasicMaterial({color:'#ff4a4a'}));lp.position.z=.72;tool.add(lp);tool.add(glow('#ff5a5a',.35,new THREE.Vector3(0,0,.75)));const ac=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.22,12),cyan);ac.rotation.z=Math.PI/2;ac.position.set(0,.2,.1);tool.add(ac);
  tool.position.set(-1.2,1.32,1.02);g.add(tool);g.userData.tip=new THREE.Vector3(-1.2,1.3,1.84);g.userData.tool=tool}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(scale);return g}
function makeDrone(scale=1){const g=new THREE.Group();const white=std('#eef2f9',{roughness:.3}),capM=std('#a9c4d6',{roughness:.32}),rimM=std('#9fc1d2',{roughness:.28}),grey=std('#8b95a6',{roughness:.5,metalness:.15}),cyan=new THREE.MeshBasicMaterial({color:new THREE.Color('#58ecff').multiplyScalar(1.6)});
 const body=new THREE.Group();g.add(body);const SP=(r,ps,pl,ts,tl,m,seg=48)=>new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg*.6|0,ps,pl,ts,tl),m);
 body.add(new THREE.Mesh(new THREE.SphereGeometry(.85,48,34),white));body.add(SP(.862,0,6.283,0,.55,capM));body.add(SP(.868,Math.PI/2-1.05,2.1,Math.PI/2-.66,1.05,rimM,56));
 body.add(SP(.88,Math.PI/2-.95,1.9,Math.PI/2-.54,.94,new THREE.MeshStandardMaterial({map:faceTex,emissiveMap:faceTex,emissive:'#fff',emissiveIntensity:1.1,roughness:.12,metalness:.3}),56));
 for(const sx of [-1,1]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.14,24),grey);r.rotation.z=Math.PI/2;r.position.set(sx*.86,0,0);body.add(r);const d=new THREE.Mesh(new THREE.CircleGeometry(.16,24),cyan);d.position.set(sx*.935,0,0);d.rotation.y=sx*Math.PI/2;body.add(d);
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.35,6,10),white);arm.position.set(sx*.95,-.4,.1);arm.rotation.z=sx*.4;body.add(arm)}
 const th=new THREE.Mesh(new THREE.CylinderGeometry(.3,.18,.2,18),grey);th.position.y=-.9;body.add(th);g.add(glow('#7ff6ff',1.4,new THREE.Vector3(0,-1.15,0)));
 g.traverse(o=>{if(o.isMesh){o.castShadow=true}});g.scale.setScalar(scale);return g}
// ---------------- factory ----------------
function makeFactory(){const g=new THREE.Group();
 const beige=std('#dcc6a8',{roughness:.6}),slate=std('#565f86',{roughness:.5,metalness:.1}),top=std('#5d5a7e',{roughness:.55}),teal=std('#4fae9c',{roughness:.5}),brown=std('#7d6862',{roughness:.6}),
 yel=new THREE.MeshStandardMaterial({color:'#ffd35a',emissive:'#ffb020',emissiveIntensity:1.2,roughness:.4}),cyn=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)}),trim=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd35a').multiplyScalar(1.25)});
 add(g,rbox(6.3,.55,4.5,.25,slate),0,.28,0);
 add(g,rbox(5.3,2.3,3.8,.85,beige),0,1.65,0);
 // glowing yellow trim around the roofline
 add(g,rbox(5.35,.1,.12,.04,trim),0,2.72,1.9);add(g,rbox(5.35,.1,.12,.04,trim),0,2.72,-1.9);add(g,rbox(.12,.1,3.8,.04,trim),2.65,2.72,0);add(g,rbox(.12,.1,3.8,.04,trim),-2.65,2.72,0);
 // slate side pods with cyan lights
 for(const sx of [-1,1]){add(g,rbox(.85,2.1,3.3,.4,slate),sx*2.85,1.45,0);add(g,rbox(.12,.7,.12,.05,cyn),sx*2.85,1.9,1.5);add(g,rbox(.12,.5,.12,.05,cyn),sx*2.85,1.9,-1.5)}
 // front door, windows, feet
 add(g,rbox(1.9,2.1,.35,.6,slate),0,1.4,1.82);
 add(g,rbox(1.35,1.5,.2,.45,yel),0,1.25,1.97);const dm=new THREE.Mesh(new THREE.CylinderGeometry(.67,.67,.2,24,1,false,0,Math.PI),yel);dm.rotation.x=Math.PI/2;dm.rotation.z=Math.PI/2;dm.position.set(0,2.0,1.97);g.add(dm);
 g.add(glow('#ffb840',3.2,new THREE.Vector3(0,1.6,2.5)));
 for(const [sx,m,gl] of [[-1,yel,'#ffb840'],[1,cyn,'#58ecff']]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.2,24),slate);w.rotation.x=Math.PI/2;w.position.set(sx*1.85,1.7,1.95);g.add(w);const w2=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.24,24),m);w2.rotation.x=Math.PI/2;w2.position.set(sx*1.85,1.7,2.02);g.add(w2);g.add(glow(gl,1.4,new THREE.Vector3(sx*1.85,1.7,2.4)))}
 add(g,rbox(1.0,.16,.1,.05,cyn),-1.6,.75,1.95);add(g,rbox(1.0,.16,.1,.05,cyn),1.6,.75,1.95);
 add(g,rbox(.4,.55,.5,.18,slate),-.5,.35,2.05);add(g,rbox(.4,.55,.5,.18,slate),.5,.35,2.05);
 // roof slab
 add(g,rbox(4.7,1.0,3.3,.5,top),0,3.25,-.05);add(g,rbox(4.75,.14,3.35,.06,teal),0,2.78,-.05);
 // teal arch on the roof (half-round window)
 const arch=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.5,24,1,false,0,Math.PI),teal);arch.rotation.z=Math.PI/2;arch.rotation.y=Math.PI/2;arch.position.set(-1.45,3.7,.95);g.add(arch);
 const win=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.54,24,1,false,0,Math.PI),yel);win.rotation.z=Math.PI/2;win.rotation.y=Math.PI/2;win.position.set(-1.45,3.7,.95);g.add(win);
 // chimneys
 for(const x of [.6,1.55]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,2.0,18),brown);c.position.set(x,4.75,-.9);g.add(c);const r=new THREE.Mesh(new THREE.TorusGeometry(.37,.1,10,20),teal);r.rotation.x=Math.PI/2;r.position.set(x,5.7,-.9);g.add(r)}
 // gears
 const gear=(r,mat,y,x,z)=>{const gg=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.35,32),mat);gg.add(body);for(let i=0;i<12;i++){const t=rbox(r*.32,.35,r*.3,.04,mat,2);const a=i*Math.PI/6;t.position.set(Math.cos(a)*r,0,Math.sin(a)*r);t.rotation.y=-a;gg.add(t)}const hole=new THREE.Mesh(new THREE.CylinderGeometry(r*.3,r*.3,.4,20),std('#2a2230'));gg.add(hole);gg.position.set(x,y,z);gg.rotation.x=.25;g.add(gg);return gg};
 g.userData.gears=[gear(.78,std('#f1b32c',{roughness:.4,metalness:.1}),4.05,-.55,-.2),gear(.62,std('#4a86d0',{roughness:.4,metalness:.2}),3.9,.4,.55)];
 // dish
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,1.0,8),std('#9aa0b4'));mast.position.set(2.1,4.1,-.7);g.add(mast);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.55,18,10,0,6.283,0,.9),new THREE.MeshStandardMaterial({color:'#e6eaf4',roughness:.35,side:THREE.DoubleSide}));dish.position.set(2.1,4.75,-.7);dish.rotation.set(.7,.5,0);g.add(dish);
 // back: grille, solar, pipes, boxes
 for(let i=0;i<4;i++)add(g,rbox(1.1,.07,.1,.03,std('#8b8fa6')),-1.5,1.55+i*.18,-1.93);add(g,rbox(1.3,.9,.06,.03,std('#2a3f7a',{roughness:.25,metalness:.5})),1.5,1.7,-1.92);
 for(const x of [-.25,.25]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.6,10),std('#c9a98a'));p.position.set(x,1.5,-2.0);g.add(p)}
 add(g,rbox(.9,.6,.5,.15,std('#d6c0a0')),-1.3,.7,-2.4);add(g,rbox(.8,.6,.5,.15,std('#f1b32c',{roughness:.45})),1.2,.7,-2.4);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeBelt(len){const g=new THREE.Group();add(g,rbox(len,.45,1.1,.2,std('#6b5a7a',{roughness:.5})),len/2,.3,0);add(g,rbox(len-.2,.1,.8,.05,std('#2e2838')),len/2,.55,0);
 g.userData.slats=[];g.userData.len=len;g.userData.n=Math.floor(len*1.6);for(let i=0;i<g.userData.n;i++){const s=rbox(.12,.08,.7,.03,std('#b6a3c8'));add(g,s,.2+i*.62,.62,0);g.userData.slats.push(s)}g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeLogs(){const g=new THREE.Group();const side=std('#2da396',{roughness:.6}),cap=std('#bfeedd',{roughness:.7}),mats=LOGMATS;
 const pos=[[0,0],[.72,0],[1.44,0],[.36,.62],[1.08,.62],[.72,1.2]];pos.forEach(([x,y],i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,2.1,20),mats);m.rotation.z=Math.PI/2;m.rotation.y=.02*i;m.position.set(x,.36+y,0);m.castShadow=m.receiveShadow=true;g.add(m);const ring=new THREE.Mesh(new THREE.TorusGeometry(.17,.03,8,20),std('#78c9b4'));ring.position.set(x-1.06,.36+y,0);ring.rotation.y=Math.PI/2;g.add(ring)});g.rotation.y=-.5;return g}
function makeDrill(){const g=new THREE.Group();const cream=std('#e8e0c6',{roughness:.45});
 for(const sx of [-1,1]){add(g,rbox(.5,.4,1.7,.18,std('#8a9a62')),sx*.7,.28,0)}add(g,rbox(1.5,.5,1.4,.2,std('#a8b57a')),0,.65,0);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,1.7,22),cream);body.position.set(0,1.6,0);g.add(body);const eye=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),new THREE.MeshBasicMaterial({color:new THREE.Color('#8ffcff').multiplyScalar(1.5)}));eye.scale.set(1,1,.5);eye.position.set(0,1.8,.46);g.add(eye);g.add(glow('#7ff6ff',.9,new THREE.Vector3(0,1.8,.55)));
 const bit=new THREE.Mesh(new THREE.ConeGeometry(.28,1.1,14),std('#8a8a98',{metalness:.5,roughness:.35}));bit.position.set(.35,.5,.75);bit.rotation.set(Math.PI*.78,0,-.5);g.add(bit);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12),std('#9ad0c8'));cap.position.set(0,2.5,0);g.add(cap);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeCoral(){const g=new THREE.Group();for(let i=0;i<22;i++){const a=R()*6.283,tilt=RR(.15,.7),h=RR(.9,1.8);const m=new THREE.Mesh(new THREE.CapsuleGeometry(.07,h,4,8),std(i%2?'#f4a384':'#ea8a68',{roughness:.7}));m.position.set(Math.cos(a)*RR(.1,.7),h/2,Math.sin(a)*RR(.1,.7));m.rotation.set(Math.sin(a)*tilt,0,-Math.cos(a)*tilt);m.castShadow=true;g.add(m)}return g}

function makeGatherer(){const root=new THREE.Group(),g=new THREE.Group();g.scale.setScalar(.64);root.add(g);
 const cream=std('#e4e6e2',{roughness:.5}),slate=std('#3c4658',{roughness:.7}),teal=std('#2c9e98',{roughness:.5}),dteal=std('#1d5f66',{roughness:.5}),brown=std('#a9805a',{roughness:.75}),steel=std('#8b95a6',{roughness:.35,metalness:.3}),
  cyan=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.5)}),yel=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffe66a').multiplyScalar(1.25)});
 const cyl=(r1,r2,h,m,sg=14)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sg),m);
 // tracks
 for(const sx of [-1,1]){add(g,rbox(.75,.75,3.2,.34,slate),sx*1.2,.42,-.1);for(let i=0;i<4;i++){const w=cyl(.24,.24,.82,std('#b9bcc6',{roughness:.5}));w.rotation.z=Math.PI/2;add(g,w,sx*1.2,.3,-1.0+i*.72)}}
 // lower skirt + body
 add(g,rbox(2.35,.6,3.0,.3,slate),0,.85,-.1);add(g,rbox(2.05,1.0,2.8,.42,cream),0,1.5,-.1);
 for(const sx of [-1,1]){add(g,rbox(.3,.7,1.3,.14,teal),sx*1.1,1.15,-.85);const win=rbox(.12,.85,1.05,.1,dteal);add(g,win,sx*1.06,1.38,-.05);add(g,rbox(.1,.6,.78,.08,yel),sx*1.1,1.38,-.05)}
 // head with face
 add(g,rbox(1.7,1.0,1.1,.45,cream),0,1.85,.95);add(g,rbox(1.35,.72,.2,.28,dteal),0,1.82,1.42);
 for(const sx of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),cyan);eye.scale.set(1,1.15,.45);add(g,eye,sx*.36,1.86,1.53);g.add(glow('#7ff6ff',.7,new THREE.Vector3(sx*.36,1.86,1.62)))}
 add(g,rbox(.28,.22,.1,.05,cyan),0,2.38,1.0);
 // front drill between the eyes
 const dr=new THREE.Group();dr.position.set(0,1.45,1.62);g.add(dr);add(dr,cyl(.16,.16,.5,steel),0,.1,0);add(dr,cyl(.22,.22,.1,std('#f1b32c')),0,.4,0);add(dr,cyl(.14,.02,.55,cyan,8),0,-.4,0);
 // roof deck: gear, roller, rings, stack
 add(g,rbox(1.8,.2,1.5,.1,slate),0,2.08,-.8);
 const gear=new THREE.Group();gear.position.set(-.45,2.28,-.95);g.add(gear);add(gear,cyl(.34,.34,.18,std('#7f9bb8')),0,0,0);for(let i=0;i<8;i++){const t=new THREE.Mesh(new THREE.BoxGeometry(.14,.18,.16),std('#7f9bb8'));const an=i/8*6.283;t.position.set(Math.cos(an)*.4,0,Math.sin(an)*.4);t.rotation.y=-an;gear.add(t)}
 add(g,cyl(.3,.3,.9,slate,16),.1,2.4,-.5).rotation.x=Math.PI/2;
 for(const zz of [-.55,-1.25]){const r=new THREE.Mesh(new THREE.TorusGeometry(.2,.07,8,18),steel);r.rotation.x=Math.PI/2;add(g,r,.65,2.22,zz)}
 add(g,cyl(.22,.3,.8,steel,12),.75,2.62,-1.5);add(g,cyl(.3,.3,.12,std('#f1b32c')),.75,2.3,-1.5);
 // rear bin full of logs
 add(g,rbox(1.9,1.0,1.4,.16,brown),0,1.65,-2.1);add(g,rbox(1.55,.3,1.05,.08,std('#6a4a34',{roughness:.9})),0,2.14,-2.1);
 const logs=new THREE.Group();g.add(logs);const logList=[];for(let i=0;i<18;i++){const l=cyl(.1,.1,.62,teal,8);l.rotation.set(Math.PI/2,R()*3,0);l.rotation.z=R()*3.1;add(logs,l,(R()-.5)*1.25,2.28+R()*.12,-2.1+(R()-.5)*.8);logList.push(l)}
 add(g,rbox(1.1,.3,.12,.06,slate),0,.75,-1.78);
 // arm with saw (front left)
 const boom=new THREE.Group();boom.position.set(-1.0,1.55,1.0);g.add(boom);
 add(boom,rbox(.4,.4,.5,.14,teal),0,0,.05);const up=rbox(.34,.34,1.25,.14,cream);add(boom,up,0,.1,.75).rotation.x=-.12;
 const el=new THREE.Mesh(new THREE.SphereGeometry(.26,12,10),std('#f1b32c'));add(boom,el,0,.18,1.4);
 const fore=rbox(.3,.3,.95,.12,cream);add(boom,fore,-.12,-.18,1.85).rotation.set(.5,0,0);
 const saw=new THREE.Group();saw.position.set(-.18,-.65,2.2);boom.add(saw);
 const disc=cyl(.62,.62,.07,std('#c9d0dc',{metalness:.4,roughness:.3}),28);disc.rotation.z=Math.PI/2;saw.add(disc);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.64,.05,8,28),cyan);ring.rotation.y=Math.PI/2;saw.add(ring);
 for(let i=0;i<14;i++){const a2=i/14*6.283;const t=new THREE.Mesh(new THREE.ConeGeometry(.06,.14,4),cyan);t.position.set(0,Math.cos(a2)*.68,Math.sin(a2)*.68);t.rotation.x=a2-Math.PI/2+1.57;saw.add(t)}
 saw.add(new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),std('#f1b32c')));boom.add(glow('#7ff6ff',1.1,new THREE.Vector3(-.18,-.65,2.2)));
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});root.userData.saw=saw;root.userData.boom=boom;root.userData.logs=logList;return root}
function makeTreeStage(kind,stage,sd=1){
 if(typeof TREES!=='undefined'&&stage>=1&&stage<=3)return makeScanTree(kind,stage-1,sd);
 if(stage>=3)return makeTree(kind,.74,sd,{spots:2});
 if(stage===2)return makeTree(kind,.42,sd,{spots:0});
 const [top,bot]=TREE_COLORS[kind];const g=new THREE.Group();const bark=clay({roughness:.9});
 g.add(new THREE.Mesh(sweepTube([[0,0,0],[.28,.5,.05],[-.12,1.0,.1],[.1,1.55,0]],.2,.1,{seg:26,rad:10,twist:2.2,sd,flare:.9,ridge:.05,c0:'#85827c',c1:'#aeaba3'}),bark));
 g.add(new THREE.Mesh(blobGeo(.5,{sy:.92,sx:1.0,top,bot,amp:.06,detail:3,sd,off:[-.34,1.5,0]}),clay({roughness:.85})));
 g.add(new THREE.Mesh(blobGeo(.58,{sy:.92,sx:1.0,top,bot,amp:.06,detail:3,sd:sd+3,off:[.4,1.78,.05]}),clay({roughness:.85})));
 g.scale.setScalar(1.5);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}


function rockGeo(w,h,d,topC,botC,sd,{rad=.22,seg=22,crack=1,amp=.06,planes=8,cut=.12}={}){
 const rnd=mulb(Math.floor(sd*977)+13);
 const m=rbox(w,h,d,Math.min(w,d,h*1.4)*rad,std('#fff'),seg);const g=m.geometry;const p=g.attributes.position;const c=new Float32Array(p.count*3);const ct=col(topC),cb=col(botC),t=new THREE.Color();
 // random cutting planes -> chunky faceted boulder
 const PL=[];for(let k=0;k<planes;k++){const a=rnd()*6.283,e=(rnd()-.45)*1.3;const n=new THREE.Vector3(Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e)).normalize();const ext=Math.abs(n.x)*w/2+Math.abs(n.y)*h/2+Math.abs(n.z)*d/2;PL.push({n,dd:ext*(1-cut-rnd()*.1),tint:.94+rnd()*.12})}
 const tint=new Float32Array(p.count);const v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i));let tn=1;
  for(const q of PL){const s2=v.dot(q.n)-q.dd;if(s2>0){v.addScaledVector(q.n,-s2);tn=q.tint}}
  const big=(fbm(v.x*.45+sd,v.y*.45,v.z*.45+sd*.7)-.5)*2;v.x+=big*amp*w*.5*(v.x>0?1:-1)*0;
  const bl=big*amp*h;v.y+=bl*.3;v.x+=bl*.2*Math.sign(v.x);v.z+=bl*.2*Math.sign(v.z);
  p.setXYZ(i,v.x,v.y,v.z);tint[i]=tn}
 g.computeVertexNormals();const nr=g.attributes.normal;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const ny=nr.getY(i),nz=nr.getZ(i),nx=nr.getX(i);
  const rg=1-Math.abs(fbm(x*.9+sd*3,y*1.3,z*.9)*2-1);const ck=crack&&rg>.972?Math.pow((rg-.972)/.028,1.1):0;
  const yy=y/h+.5;let k=Math.min(1,Math.max(0,yy*.7+(ny>.5?.35:0)+(ny*.5)*.25));t.copy(cb).lerp(ct,k);
  const light=.72+.36*Math.max(0,nx*-.3+ny*.8+nz*.4);const ao=1-Math.max(0,.2-yy)*1.2;const edge=1+(ny>.55&&ny<.9?.08:0);
  const sh=tint[i]*light*ao*edge*(1-ck*.6);c[i*3]=t.r*sh;c[i*3+1]=t.g*sh;c[i*3+2]=t.b*sh}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
function crystalGeo(r,h,sd=0,tipC='#aef6ff',midC='#20d2ec',baseC='#1268dc',altC='#2ae0c8'){
 const N=6,SUB=3,pos=[],cols=[];const ct=col(tipC),cm=col(midC),cb=col(baseC),ca=col(altC);const ph=sd*1.3;
 const prof=[[0,1,0],[.2,1,0],[.4,.99,.01],[.6,.97,.03],[.74,.95,.05],[.8,.9,.07],[.87,.66,.11],[.94,.36,.17],[1,0,.24]]; // [yfrac, radius frac, skew]
 const corner=(i,rr,sk,y)=>{const a=i/N*6.283+ph;const k=1+.1*Math.sin(i*2.7+sd);return [Math.cos(a)*rr*k+sk*r,y,Math.sin(a)*rr*k]};
 const vein=(x,y,z)=>{const q=fbm(x*3.1+sd,y*2.2,z*3.1)*2-1,w=Math.abs(q);return w<.085?1-w/.085:0};
 const tint=sd%3===0?.7:sd%3===1?.3:0;
 const colAt=(x,y,z)=>{const f=Math.min(1,y/h);const q=new THREE.Color();const mid=cm.clone().lerp(ca,tint);if(f<.55)q.copy(cb).lerp(mid,f/.55);else q.copy(mid).lerp(ct,Math.pow((f-.55)/.45,1.4)*.8);
  const v=vein(x,y,z);q.lerp(new THREE.Color('#dcffff'),v*.8);return q};
 const P=(side,u,row)=>{ // point on facet 'side' at fraction u along the face, profile row
  const [yf,rf,sk]=prof[row];const c0=corner(side,r*rf,sk,yf*h),c1=corner((side+1)%N,r*rf,sk,yf*h);return [c0[0]+(c1[0]-c0[0])*u,c0[1],c0[2]+(c1[2]-c0[2])*u]};
 const push=(a,b,c2)=>{for(const v of [a,b,c2]){pos.push(...v);const q=colAt(v[0],v[1],v[2]);cols.push(q.r,q.g,q.b)}};
 for(let sd2=0;sd2<N;sd2++)for(let u=0;u<SUB;u++)for(let row=0;row<prof.length-1;row++){const u0=u/SUB,u1=(u+1)/SUB;
  const a=P(sd2,u0,row),b=P(sd2,u1,row),c2=P(sd2,u0,row+1),d=P(sd2,u1,row+1);push(a,c2,b);push(b,c2,d)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();return g}
const CRYMAT=new THREE.MeshStandardMaterial({vertexColors:true,emissive:'#18b0f0',emissiveIntensity:.85,roughness:.16,metalness:.05,flatShading:true});
const _scanG={};let _scanMat=null;
function scanMat(){if(_scanMat)return _scanMat;const ld=u=>{const t=new THREE.Texture();const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.src=u;t.flipY=false;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=4;return t};
 const mp=ld(SCAN_TEX.b);mp.colorSpace=THREE.SRGBColorSpace;const nm=ld(SCAN_TEX.n);
 _scanMat=new THREE.MeshStandardMaterial({map:mp,normalMap:nm,normalScale:new THREE.Vector2(1,1),roughness:.9,metalness:0});_scanMat.color.setScalar(1.8);_scanMat.emissive.setScalar(1);_scanMat.emissiveMap=mp;_scanMat.emissiveIntensity=.16;return _scanMat}
function scanPart(i){if(_scanG[i])return _scanG[i];const S0=SCAN[i],dec=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);return u.buffer};
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(dec(S0.p)),3));g.setAttribute('uv',new THREE.BufferAttribute(new Uint16Array(dec(S0.t)),2,true));
 g.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(dec(S0.n)),3,true));g.setIndex(new THREE.BufferAttribute(new Uint16Array(dec(S0.i)),1));return _scanG[i]=g}
function makeScanStone(stage,sd=1){const g=new THREE.Group();const m=new THREE.Mesh(scanPart((stage-1)*2+(sd%2)),scanMat());m.scale.set(12.6,12.6,12.6);m.position.y=-.1;m.rotation.y=sd*2.1;g.add(m);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeStoneStage(stage,sd=1){
 if(stage>=1&&typeof SCAN!=='undefined')return makeScanStone(stage,sd);
 const g=new THREE.Group();const mat=clay({roughness:.78});
 const L=(w,h,d,y,x,z,ry,top,bot,k,pl=8)=>{const m=new THREE.Mesh(rockGeo(w,h,d,top,bot,sd*3+k*7.1,{rad:.14,seg:28,planes:pl+4,cut:.17}),mat);m.position.set(x,y+h/2,z);m.rotation.set(0,ry,0);g.add(m);return y+h};
 const R1=['#cf7450','#6a3028'],R2=['#c96e46','#70322a'],CAP=['#d58c6a','#82443a'];
 const w=3.6,d=3.0;
 if(stage===1){L(2.5,1.0,2.0,0,0,0,.2,'#e08050','#7c3422',1,6)}
 else if(stage===2){let y=L(w*.98,2.1,d*.98,0,0,0,.1,...R1,1);y=L(w*.8,1.25,d*.8,y-.3,.1,-.05,-.18,...R2,2);L(w*.55,1.05,d*.55,y-.22,-.05,.05,.22,...CAP,3)}
 else{let y=L(w*1.05,2.6,d*1.05,0,0,0,.08,...R1,1);y=L(w*.88,1.5,d*.88,y-.35,.2,-.12,-.3,...R2,2);L(w*.6,1.3,d*.6,y-.25,-.15,.12,.45,...CAP,3)}
 const pm=clay({roughness:.85});const n=stage===1?4:stage===2?7:11;const rr=stage===1?1.25:stage===2?1.75:2.05;
 for(let i=0;i<n;i++){const a=i/n*6.283+sd*.7+RR(-.2,.2),r=rr+RR(-.1,.3),sz=(i%4===0?.7:i%4===1?.45:i%4===2?.3:.2)*(stage===1?.7:1);
  const q=new THREE.Mesh(rockGeo(sz*2.2,sz*1.6,sz*1.9,'#767e8e','#343947',sd+i*2.3,{rad:.1,seg:12,planes:11,cut:.24,crack:0}),pm);q.position.set(Math.cos(a)*r*1.1,sz*.7,Math.sin(a)*r*.9);q.rotation.set(RR(-.15,.15),RR(0,6),RR(-.15,.15));g.add(q)}
 const sc=stage===1?.62:stage===2?.52:.58;g.scale.setScalar(sc);g.rotation.y=sd*.9;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeOreStage(stage,sd=1){return makeGeode(stage,sd)}
function makeOreStageOld(stage,sd=1){
 if(stage>=2)return makeNode(stage===2?.55:.8,sd);
 const g=new THREE.Group();const clr=clay({roughness:.85});
 g.add(new THREE.Mesh(blobGeo(1.5,{sy:.14,sx:1.1,top:'#c0a07a',bot:'#7a5a42',amp:.12,detail:4,sd,off:[0,.14,0]}),clr));
 const gm=new THREE.MeshStandardMaterial({color:'#7ff6ff',emissive:'#38dcff',emissiveIntensity:1.6,roughness:.2,flatShading:true});
 for(const [x,z] of [[.6,.3],[-.5,.5],[.1,-.6],[-.9,-.2]]){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.13),gm);m.position.set(x,.3,z);m.scale.y=.7;g.add(m)}
 g.scale.setScalar(.75);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeCrystalStage(stage,sd=1){return stage===1?makeCrystal(.3,sd,1):stage===2?makeCrystal(.44,sd,3):makeCrystal(.56,sd,5)}
// ---------------- colony base buildings ----------------
function makeSolar(){const g=new THREE.Group();const pm=std('#25437f',{roughness:.22,metalness:.55}),fr=std('#c9d0dc',{roughness:.4,metalness:.3}),ln=std('#6a8ad0',{roughness:.3,metalness:.4});
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){const p=new THREE.Group();const pan=rbox(2.3,.14,1.5,.05,pm,2);p.add(pan);for(let k=-1;k<=1;k++){const s=rbox(.04,.16,1.4,.01,ln,1);s.position.x=k*.7;p.add(s)}const leg=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.7,8),fr);leg.position.set(0,-.35,-.3);p.add(leg);p.rotation.x=-.45;p.position.set((i-1)*2.6,.95,(j-1)*2.2);g.add(p)}
 const base=rbox(8.4,.3,7.2,.12,std('#8d8a9a',{roughness:.7}));base.position.y=.12;g.add(base);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeDome(){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.CylinderGeometry(2.9,3.1,.6,32),std('#d6bfa2',{roughness:.6}));ring.position.y=.3;g.add(ring);
 for(let i=0;i<4;i++){const a=i*1.57+.4,r=1.1;g.add(new THREE.Mesh(blobGeo(.55+(i%2)*.2,{sy:.9,top:i%2?'#4fe0d0':'#7a92ff',bot:'#1380b0',amp:.12,detail:2,sd:i,off:[Math.cos(a)*r,.9,Math.sin(a)*r]}),clay({roughness:.7})))}
 const glass=new THREE.Mesh(new THREE.SphereGeometry(2.75,36,18,0,6.283,0,1.571),new THREE.MeshStandardMaterial({color:'#aef2e4',transparent:true,opacity:.42,roughness:.08,metalness:.1,depthWrite:false}));glass.position.y=.55;g.add(glass);
 for(let i=0;i<4;i++){const rb=new THREE.Mesh(new THREE.TorusGeometry(2.75,.07,6,28,Math.PI),std('#e8eef4',{roughness:.4}));rb.rotation.y=i*Math.PI/4;rb.position.y=.55;g.add(rb)}
 g.add(glow('#9ff8e0',5,new THREE.Vector3(0,1.5,0)));g.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.castShadow=true;o.receiveShadow=true}});return g}
function makeDish(){const g=new THREE.Group();const beige=std('#d6bfa2',{roughness:.6}),w=std('#eef2f9',{roughness:.3});
 add(g,rbox(3.4,2.2,3.2,.5,beige),0,1.1,0);const roof=rbox(3.0,.5,2.8,.2,std('#a692c6'));roof.position.y=2.3;g.add(roof);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,2.4,12),std('#8b95a6'));mast.position.y=3.5;g.add(mast);
 const dish=new THREE.Group();const bowl=new THREE.Mesh(new THREE.SphereGeometry(1.7,28,14,0,6.283,0,.85),new THREE.MeshStandardMaterial({color:'#eef2f9',roughness:.3,side:THREE.DoubleSide}));bowl.rotation.x=Math.PI*.9;dish.add(bowl);const feed=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.3,6),std('#8b95a6'));feed.position.set(0,-.75,0);dish.add(feed);const tip=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),new THREE.MeshBasicMaterial({color:'#ff5a5a'}));tip.position.y=-1.4;dish.add(tip);
 dish.position.y=4.8;dish.rotation.x=.45;g.add(dish);g.userData.dish=dish;
 const win=rbox(.9,.7,.1,.05,new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)}));win.position.set(0,1.3,1.62);g.add(win);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makePad(){const g=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(5,5.2,.4,40),std('#6f7482',{roughness:.7}));base.position.y=.2;g.add(base);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(4.3,.12,8,48),new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd35a').multiplyScalar(1.3)}));ring.rotation.x=Math.PI/2;ring.position.y=.42;g.add(ring);
 const ym=new THREE.MeshBasicMaterial({color:'#e8e8f0'});for(const [x,z,w,d] of [[-.7,0,.25,1.8],[.7,0,.25,1.8],[0,0,1.2,.25]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,.05,d),ym);b.position.set(x,.43,z);g.add(b)}
 const ship=(x,z,r)=>{const s=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.4,1.3,6,12),std('#eef2f9',{roughness:.3}));body.rotation.x=Math.PI/2;s.add(body);const wing=rbox(2.1,.1,.8,.04,std('#8b95a6'));wing.position.z=-.3;s.add(wing);const cock=new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color('#58ecff').multiplyScalar(1.5)}));cock.position.set(0,.2,.55);s.add(cock);s.position.set(x,.95,z);s.rotation.y=r;g.add(s)};ship(-1.9,-1.2,.5);ship(2,1.4,-.7);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeReactor(){const g=new THREE.Group();const steel=std('#6a5d7a',{roughness:.45,metalness:.25});
 const base=new THREE.Mesh(new THREE.CylinderGeometry(2.6,3,.9,28),steel);base.position.y=.45;g.add(base);
 const core=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,3.4,28),new THREE.MeshStandardMaterial({color:'#8ff4ff',emissive:'#2adcff',emissiveIntensity:1.5,transparent:true,opacity:.8,roughness:.1}));core.position.y=2.6;g.add(core);
 const rings=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(1.7,.14,10,32),std('#f1b32c',{roughness:.35,metalness:.4}));r.rotation.x=Math.PI/2;r.position.y=1.5+i*1.1;g.add(r);rings.push(r)}
 const cap=new THREE.Mesh(new THREE.SphereGeometry(1.45,22,12,0,6.283,0,1.571),steel);cap.position.y=4.3;g.add(cap);
 for(let i=0;i<4;i++){const a=i*1.571,p=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,3.2,10),steel);p.position.set(Math.cos(a)*2.2,1.8,Math.sin(a)*2.2);g.add(p)}
 g.add(glow('#58ecff',7,new THREE.Vector3(0,2.8,0)));g.userData.rings=rings;g.userData.core=core;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeRover(){const g=new THREE.Group();const cream=std('#e8e0c6',{roughness:.45}),dark=std('#34373f',{roughness:.85});
 for(const sx of [-1,1])add(g,rbox(.45,.5,1.9,.2,dark),sx*.8,.3,0);
 add(g,rbox(1.6,.6,1.7,.25,cream),0,.8,0);const top=rbox(1.1,.35,1.1,.18,std('#2fb0ac'));top.position.set(0,1.25,-.1);g.add(top);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.5)}));eye.scale.z=.5;eye.position.set(0,.95,.84);g.add(eye);
 const ant=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.1,6),std('#8b95a6'));ant.position.set(.4,1.75,-.4);g.add(ant);const tip=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:'#ff5a5a'}));tip.position.set(.4,2.3,-.4);g.add(tip);g.userData.tip=tip;
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

function makeMill(wood){const g=new THREE.Group();const body=std(wood?'#c79a62':'#9a8aa6',{roughness:.6}),roof=std(wood?'#7a4a34':'#5a4a6a',{roughness:.6}),steel=std('#8b95a6',{roughness:.4});
 add(g,rbox(3.6,2.3,3.0,.4,body),0,1.15,0);const rf=rbox(3.9,.5,3.3,.2,roof);rf.position.y=2.5;g.add(rf);
 const ch=new THREE.Mesh(new THREE.CylinderGeometry(.3,.38,1.8,10),steel);ch.position.set(1.1,3.5,-.7);g.add(ch);
 const hop=new THREE.Mesh(new THREE.ConeGeometry(1.1,1.2,4,1,true),new THREE.MeshStandardMaterial({color:wood?'#2fb0ac':'#c08a72',roughness:.6,side:THREE.DoubleSide}));hop.rotation.y=Math.PI/4;hop.position.set(-1.4,3.5,.4);hop.rotation.z=Math.PI;g.add(hop);
 const wheel=new THREE.Group();const hub=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.25,16),steel);hub.rotation.z=Math.PI/2;wheel.add(hub);for(let i=0;i<6;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.25),std('#e8e0c6'));const an=i/6*6.283;b.position.set(0,Math.sin(an)*1.1,Math.cos(an)*1.1);wheel.add(b)}wheel.position.set(2.05,1.5,0);g.add(wheel);g.userData.wheel=wheel;
 const win=rbox(.9,.7,.1,.05,new THREE.MeshBasicMaterial({color:new THREE.Color(wood?'#ffe49a':'#9ff0ff').multiplyScalar(1.4)}));win.position.set(0,1.3,1.52);g.add(win);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

function makeHarvester(){const g=new THREE.Group();const cream=std('#e8e0c6',{roughness:.45}),teal=std('#2fb0ac',{roughness:.5}),dark=std('#34373f',{roughness:.85}),cyan=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.5)});
 for(const sx of [-1,1])add(g,rbox(.55,.55,2.1,.24,dark),sx*.9,.38,0);
 add(g,rbox(1.9,.9,1.8,.3,cream),0,.95,0);add(g,rbox(1.5,.45,1.5,.2,teal),0,1.6,0);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.22,14,10),cyan);eye.scale.set(1,1,.5);eye.position.set(0,1.62,.78);g.add(eye);g.add(glow('#7ff6ff',.9,new THREE.Vector3(0,1.62,.9)));
 const boom=new THREE.Group();boom.position.set(.2,1.7,.2);g.add(boom);
 add(boom,rbox(.34,.34,1.9,.14,std('#c9ccd4',{metalness:.3,roughness:.4})),0,0,1.0);
 const saw=new THREE.Group();saw.position.set(0,0,2.0);boom.add(saw);
 const disc=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.06,28),std('#cfd4de',{metalness:.55,roughness:.28}));disc.rotation.z=Math.PI/2;saw.add(disc);
 for(let i=0;i<14;i++){const a=i/14*6.283;const t=new THREE.Mesh(new THREE.ConeGeometry(.07,.17,4),std('#9aa3b2',{metalness:.5}));t.position.set(0,Math.cos(a)*.66,Math.sin(a)*.66);t.rotation.x=a-Math.PI/2+1.57;saw.add(t)}
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),std('#f1b32c'));hub.position.x=.05;saw.add(hub);
 const tank=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.8,16),teal);tank.position.set(-.55,1.75,-.45);g.add(tank);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.userData.saw=saw;g.userData.boom=boom;return g}
function makeCrate(){const g=new THREE.Group();const br=std('#a9805a',{roughness:.75}),dk=std('#6a4a34',{roughness:.9}),tl=std('#2c9e98',{roughness:.5});
 add(g,rbox(2.8,1.3,2.2,.14,br),0,.65,0);add(g,rbox(2.4,.2,1.8,.08,dk),0,1.32,0);
 for(const sx of [-1,1])for(const sz of [-1,1])add(g,rbox(.25,1.4,.25,.06,dk),sx*1.35,.7,sz*1.05);
 const logs=new THREE.Group();g.add(logs);const list=[];for(let i=0;i<24;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.7,8),tl);l.rotation.set(Math.PI/2,0,R()*3.1);l.position.set((R()-.5)*2.1,1.5+Math.floor(i/12)*.2,(R()-.5)*1.5);logs.add(l);list.push(l)}
 g.userData.logs=list;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

// ---- Upgrade Center: domed habitat with dish, antenna and greenhouse bay (from the user's model sheet) ----
const _ucG={};let _ucMat=null;
function ucMat(){if(_ucMat)return _ucMat;const ld=u=>{const t=new THREE.Texture();const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.src=u;t.flipY=false;t.anisotropy=4;return t};
 const mp=ld(UC_TEX.b);mp.colorSpace=THREE.SRGBColorSpace;_ucMat=new THREE.MeshStandardMaterial({map:mp,normalMap:ld(UC_TEX.n),normalScale:new THREE.Vector2(.55,.55),roughness:.6,metalness:.05,emissiveMap:mp,emissive:new THREE.Color(1,1,1),emissiveIntensity:.14});_ucMat.color.setScalar(1.2);
 _ucMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n {float ul=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));vec3 uc=mix(vec3(ul),diffuseColor.rgb,1.8);uc=mix(uc,uc*vec3(1.08,1.0,.94),.5);uc=uc*1.3;float ul2=dot(uc,vec3(.2126,.7152,.0722));uc=mix(uc,vec3(.2,.17,.2),(1.-smoothstep(.05,.3,ul2))*.55);diffuseColor.rgb=clamp(uc,0.,1.);}')};_ucMat.customProgramCacheKey=()=>'ucgrade';return _ucMat}
function ucPart(i){if(_ucG[i])return _ucG[i];const S0=UCP[0],dec=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);return u.buffer};
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(dec(S0.p)),3));g.setAttribute('uv',new THREE.BufferAttribute(new Uint16Array(dec(S0.t)),2,true));
 g.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(dec(S0.n)),3,true));g.setIndex(new THREE.BufferAttribute(new Uint32Array(dec(S0.i)),1));return _ucG[i]=g}
function makeScanUC(i=4,scale=1){const g=new THREE.Group();const m=new THREE.Mesh(ucPart(i),ucMat());m.scale.setScalar(scale);g.add(m);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false}});return g}
function makeUpgradeCenter(){if(typeof UCP!=='undefined'&&!window.__oldUC){const g=makeScanUC(0,42.4);g.userData.gears=[new THREE.Object3D(),new THREE.Object3D()];return g}
const g=new THREE.Group();
 const tan=std('#c8b4a2',{roughness:.7}),tanL=std('#d2c0af',{roughness:.7}),slate=std('#5a5a80',{roughness:.55}),slate2=std('#6c6c90',{roughness:.55}),rib=std('#a99886',{roughness:.7}),teal=std('#3a9e92',{roughness:.5}),
  grey=std('#b7bdc9',{roughness:.4,metalness:.25}),greyD=std('#8a90a0',{roughness:.45,metalness:.2}),wood=std('#d8b98c',{roughness:.7}),brown=std('#9b6a42',{roughness:.75}),dkb=std('#6a4a34',{roughness:.85}),
  yel=new THREE.MeshStandardMaterial({color:'#ffcf5a',emissive:'#ffa820',emissiveIntensity:1.1,roughness:.4}),cyn=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)}),
  glass=new THREE.MeshStandardMaterial({color:'#a8f0e0',transparent:true,opacity:.3,roughness:.12,metalness:.1,depthWrite:false}),
  leaf=std('#35c79a',{roughness:.55}),leaf2=std('#3a8fe0',{roughness:.55}),leaf3=std('#6fe0a8',{roughness:.55});
 const cyl=(rt,rb,h,m,seg=28)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);
 const RX=4.4,RZ=3.6,TOP=.55;
 // base platform + dark lower band
 {const b=cyl(1,1,.5,slate,40);b.scale.set(RX+.9,1,RZ+.9);b.position.y=.25;g.add(b)}
 {const b=cyl(1,1,.85,slate2,40);b.scale.set(RX+.08,1,RZ+.08);b.position.y=.9;g.add(b)}
 // main oval body
 {const b=cyl(1,1.02,1.6+TOP,tan,40);b.scale.set(RX,1,RZ);b.position.y=2.1+TOP/2;g.add(b)}
 // roof band (slate) and dome with ribs
 {const t=new THREE.Mesh(new THREE.TorusGeometry(1,.075,12,48),slate);t.rotation.x=Math.PI/2;t.scale.set(RX+.1,RZ+.1,1.2);t.position.y=3.0+TOP;g.add(t)}
 {const b=cyl(1,1,.34,slate,40);b.scale.set(RX+.12,1,RZ+.12);b.position.y=2.95+TOP;g.add(b)}
 const dome=new THREE.Group();dome.position.y=3.1+TOP;dome.scale.set(RX*.84,1.75,RZ*.84);g.add(dome);
 {const d=new THREE.Mesh(new THREE.SphereGeometry(.97,40,16,0,Math.PI*2,0,Math.PI/2),tanL);dome.add(d);
  for(let k=0;k<5;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(.97,.012,6,32,Math.PI),rib);t.rotation.y=k*Math.PI/5;dome.add(t)}
  const t2=new THREE.Mesh(new THREE.TorusGeometry(.62,.012,6,40),rib);t2.rotation.x=Math.PI/2;t2.position.y=.76;dome.add(t2)}
 add(g,cyl(.95,1.05,.22,slate,24),0,4.8+TOP,0);add(g,cyl(.78,.78,.3,teal,24),0,4.9+TOP,0);add(g,cyl(.4,.4,.34,slate,20),0,4.97+TOP,0);
 // antennas
 add(g,cyl(.07,.07,2.7,greyD,8),-1.9,5.3+TOP,-1.0);add(g,new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),grey),-1.9,6.7+TOP,-1.0);
 add(g,cyl(.045,.045,1.4,greyD,8),-1.5,5.0+TOP,-1.2);
 // satellite dish (light grey, concave) on a post with a teal collar
 {const d=new THREE.Group();d.position.set(1.8,4.3+TOP,-1.2);g.add(d);
  add(d,cyl(.12,.16,1.3,greyD,10),0,.5,0);add(d,cyl(.24,.24,.22,teal,12),0,1.15,0);
  const dm=grey.clone();dm.side=THREE.DoubleSide;const dg=new THREE.Group();dg.position.set(0,1.45,0);dg.rotation.set(-.5,.55,0);d.add(dg);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(1.8,28,10,0,Math.PI*2,0,.62),dm);dish.rotation.x=Math.PI;dish.position.y=1.8;dg.add(dish);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(Math.sin(.62)*1.8,.06,6,28),grey);rim.rotation.x=Math.PI/2;rim.position.y=.28;dg.add(rim);
  add(dg,cyl(.035,.035,1.15,greyD,6),0,.6,0);add(dg,new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),teal),0,1.2,0);
  g.userData.dish=d}
 // dormer window on the dome (arched, yellow with bars)
 {const w=new THREE.Group();w.position.set(-1.7,4.25+TOP,1.3);w.rotation.set(-.62,.45,0);g.add(w);add(w,rbox(1.3,.1,.5,.04,teal),0,-.45,0);const wa=cyl(.55,.55,.14,yel,20);wa.rotation.x=Math.PI/2;wa.position.y=.05;w.add(wa);add(w,rbox(1.1,.5,.14,.04,yel),0,-.2,0);add(w,rbox(.06,.9,.16,.02,tan),0,0,0);add(w,rbox(.5,.06,.16,.02,tan),0,-.1,0);
  const fr=new THREE.Mesh(new THREE.TorusGeometry(.58,.07,8,20,Math.PI),teal);fr.position.set(0,.05,0);w.add(fr)}
 // front: arched door in a teal frame, step
 {const dz=RZ+.02;add(g,rbox(2.0,.3,.9,.1,slate),0,.65,dz+.55);
  add(g,rbox(1.9,1.7,.3,.4,teal),0,1.75,dz);const fa=cyl(.95,.95,.3,teal,24);fa.rotation.x=Math.PI/2;fa.position.set(0,2.6,dz);g.add(fa);
  add(g,rbox(1.4,1.55,.25,.3,wood),0,1.7,dz+.12);const da=cyl(.7,.7,.25,wood,22);da.rotation.x=Math.PI/2;da.position.set(0,2.45,dz+.12);g.add(da);
  add(g,rbox(.12,.12,.12,.05,teal),.45,1.6,dz+.3);
  const wn=cyl(.26,.26,.12,yel,16);wn.rotation.x=Math.PI/2;wn.position.set(0,2.3,dz+.27);g.add(wn);
  g.add(glow('#ffb840',2.4,new THREE.Vector3(0,1.8,dz+1.2)))}
 // round porthole windows left and right of the door (placed on the oval)
 for(const th of [-.72,.72]){const x=Math.sin(th)*RX*1.01,z=Math.cos(th)*RZ*1.01,ry=Math.atan2(Math.sin(th)/RX,Math.cos(th)/RZ);
  const grp=new THREE.Group();grp.position.set(x,2.55,z);grp.rotation.y=ry;g.add(grp);
  const rm=cyl(.62,.62,.2,slate,24);rm.rotation.x=Math.PI/2;grp.add(rm);const w=cyl(.48,.48,.24,yel,24);w.rotation.x=Math.PI/2;w.position.z=.03;grp.add(w);const bar=cyl(.04,.04,.9,slate,6);bar.rotation.z=Math.PI/2;bar.position.z=.16;}
 // cyan strip lights on the dark lower band + teal pipe feet at the door
 for(const th of [-.45,.45]){const x=Math.sin(th)*RX*1.08,z=Math.cos(th)*RZ*1.08,ry=Math.atan2(Math.sin(th)/RX,Math.cos(th)/RZ);const s=rbox(1.1,.14,.1,.05,cyn);s.position.set(x,.98,z);s.rotation.y=ry;g.add(s)}
 for(const s of [-1,1]){const p=cyl(.28,.28,1.3,teal,12);p.rotation.z=Math.PI/2;p.position.set(s*1.35,.75,RZ+.75);g.add(p);const e=new THREE.Mesh(new THREE.SphereGeometry(.3,12,10),teal);e.position.set(s*2.0,.75,RZ+.75);g.add(e)}
 // teal conduit up the left side, over the shoulder into the dome
 add(g,cyl(.2,.2,3.6,teal,10),-RX-.15,2.3,.5);{const e=new THREE.Mesh(new THREE.TorusGeometry(.55,.2,8,16,Math.PI/2),teal);e.position.set(-RX+.4,4.1,.5);e.rotation.z=0;g.add(e)}add(g,cyl(.2,.2,.8,teal,10),-RX+1.0,4.65,.5).rotation.z=Math.PI/2;
 // bench with backrest, crates
 add(g,rbox(2.2,.2,.7,.05,brown),-2.9,.95,RZ+1.25);add(g,rbox(2.2,.5,.14,.05,brown),-2.9,1.35,RZ+.95);for(const sx of [-1,1])add(g,rbox(.14,.7,.6,.04,dkb),-2.9+sx*.95,.6,RZ+1.25);
 add(g,rbox(1.05,.9,1.0,.1,brown),2.9,.95,RZ+1.5);add(g,rbox(.35,.3,.12,.05,teal),2.9,1.15,RZ+2.05);add(g,rbox(.8,.6,.8,.08,dkb),3.9,.8,RZ+1.9);
 // greenhouse bay on the right
 {const gx=RX+2.3,gz=.2;const b=cyl(1,1,.45,slate,36);b.scale.set(2.9,1,2.7);b.position.set(gx,.22,gz);g.add(b);
  const gl=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),glass);gl.scale.set(2.7,2.1,2.5);gl.position.set(gx,.45,gz);g.add(gl);
  for(let k=0;k<4;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(1,.022,6,28,Math.PI),std('#e8eee8',{roughness:.5}));t.scale.set(2.7,2.1,2.5);t.rotation.y=k*Math.PI/4+.4;t.position.set(gx,.45,gz);g.add(t)}
  const soil=cyl(1,1,.18,std('#4a3a40',{roughness:.9}),24);soil.scale.set(2.2,1,2.0);soil.position.set(gx,.55,gz);g.add(soil);
  for(let i=0;i<7;i++){const a=i/7*6.28+.4,rr=i===0?0:1.1+(i%2)*.2;const x=gx+Math.cos(a)*rr*1.1,z=gz+Math.sin(a)*rr*.9;const sc=.7+.4*((i*37)%5)/5;
   for(let k=0;k<5;k++){const l=new THREE.Mesh(new THREE.SphereGeometry(.4*sc,10,8),[leaf,leaf2,leaf3][(i+k)%3]);l.scale.set(.6,1.5,.34);const aa=k*1.25+i;l.position.set(x+Math.cos(aa)*.22*sc,.85+.5*sc,z+Math.sin(aa)*.22*sc);l.rotation.set(Math.sin(aa)*.5,aa,Math.cos(aa)*.5);g.add(l)}}
  g.add(glow('#58ffc8',3.6,new THREE.Vector3(gx,1.4,gz)))}
 // generator box front right + two grey tanks at the back left
 add(g,rbox(1.7,1.15,1.2,.22,slate),RX+1.8,.98,RZ+.3);add(g,rbox(.9,.22,.08,.04,cyn),RX+1.8,1.2,RZ+.92);add(g,rbox(.6,.3,.08,.04,std('#44496a')),RX+1.8,.8,RZ+.92);
 for(const [x,z,h] of [[-RX+.3,-RZ+.3,2.3],[-RX-.8,-RZ+1.0,1.8]]){add(g,rbox(1.2,h,1.2,.3,greyD),x,h/2+.45,z);add(g,rbox(1.25,.18,1.25,.08,teal),x,h*.55,z);add(g,rbox(.18,.5,.08,.04,cyn),x,h*.35,z+.62)}
 g.userData.gears=[g.userData.dish,new THREE.Object3D()];
 g.traverse(o=>{if(o.isMesh&&o.material!==glass){o.castShadow=true;o.receiveShadow=true}});return g}

// ---- Log Storage: racks of logs, yellow crane arm, log pile, terminal (from the user's model sheet) ----

// ---- belt stub in the same style as the world belts (used on machines so belts join them) ----
function beltStub(g,cx,cz,len,axis,y){ // axis 'x' or 'z'; y = deck top
 const cream=std('#e4dcc8',{roughness:.5}),yel=std('#e8b02c',{roughness:.45}),dk=std('#1f1c26',{roughness:.85}),grey=std('#8d94a3',{roughness:.45,metalness:.25}),slate=std('#5a6080',{roughness:.55});
 const s=new THREE.Group();s.position.set(cx,0,cz);if(axis==='x')s.rotation.y=Math.PI/2;g.add(s);
 add(s,rbox(1.55,.5,len,.16,cream),0,y-.3,0);add(s,new THREE.Mesh(new THREE.BoxGeometry(1.15,.12,len),dk),0,y-.06,0);
 for(const sd of [-1,1])add(s,new THREE.Mesh(new THREE.BoxGeometry(.08,.12,len),yel),sd*.62,y+.02,0);
 for(const sz of [-1,1]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,1.45,14),yel);r.rotation.z=Math.PI/2;r.position.set(0,y-.16,sz*len/2);s.add(r);const c=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1.66,10),grey);c.rotation.z=Math.PI/2;c.position.set(0,y-.16,sz*len/2);s.add(c)}
 return s}

// ---- Sawmill / press: arch frame with a laser, belt passes through it (from the user's model sheet) ----
function makeSawmill(wood,pp){const g=new THREE.Group();
 const cream=std(wood?'#e4dcc8':'#d6d2e0',{roughness:.5}),slate=std('#5a6080',{roughness:.55}),dk=std('#363a52',{roughness:.65}),yel=std(wood?'#e8b02c':'#e08a3a',{roughness:.45}),teal=std(wood?'#2fb0ac':'#7a6ac0',{roughness:.55}),
  grey=std('#8d94a3',{roughness:.45,metalness:.25}),tealg=std('#5f9aa0',{roughness:.5}),brown=std('#9a6a42',{roughness:.7}),
  scr=new THREE.MeshStandardMaterial({color:'#9fffd0',emissive:'#40ffb0',emissiveIntensity:1.0}),beam=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.6),transparent:true,opacity:.9});
 const cyl=(rt,rb,h,m,seg=16)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);
 add(g,rbox(9.4,.5,6.2,.25,slate),0,.25,0);
 // arch frame: two pillars + top beam
 for(const x of [-2.3,2.3])add(g,rbox(1.7,5.0,3.4,.6,cream),x,3.0,0);
 add(g,rbox(6.3,1.7,3.4,.6,cream),0,4.7,0);
 add(g,rbox(.9,5.0,3.5,.3,yel),2.5,3.0,0);add(g,rbox(2.2,.8,3.5,.3,yel),1.8,4.95,0);
 add(g,cyl(.85,.95,.35,yel,20),0,5.7,0);add(g,cyl(.4,.4,.2,dk,12),0,5.95,0);
 {const t=new THREE.Mesh(new THREE.TorusGeometry(1.0,.14,8,18,Math.PI),teal);t.position.set(0,5.65,0);g.add(t)}
 // pipes on the sides
 add(g,cyl(.17,.17,2.8,teal,8),-3.35,3.0,.9);add(g,cyl(.17,.17,2.8,teal,8),3.35,3.0,-.9);
 {const b=new THREE.Mesh(new THREE.TorusGeometry(.6,.17,8,12,Math.PI),teal);b.rotation.y=Math.PI/2;b.position.set(-3.35,4.4,.3);g.add(b)}
 // laser emitter + beam + sparks
 add(g,rbox(.9,.3,.9,.1,dk),0,3.75,0);
 const laser=new THREE.Mesh(new THREE.BoxGeometry(.14,2.3,.14),beam);laser.position.set(0,2.5,0);g.add(laser);
 const sparks=[];for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.07,6,5),new THREE.MeshBasicMaterial({color:'#fff2b0'}));s.position.set((i-2)*.12,1.6+i*.05,.2);g.add(s);sparks.push(s)}
 // belt through the arch (front to back)
 {const bs=beltStub(g,0,0,9.2,'z',1.35);bs.scale.set(1/1.82,1/1.82,1)}
 for(const z of [-3.6,-1.2,1.2,3.6])for(const x of [-.6,.6])add(g,cyl(.13,.16,.6,cream,8),x,.8,z);
 // control panel, generators, tank, crates
 add(g,rbox(.5,.9,.14,.08,grey),3.2,3.2,1.75);add(g,rbox(.34,.3,.06,.03,scr),3.2,3.4,1.84);
 add(g,rbox(1.9,1.6,1.5,.25,tealg),-3.7,1.3,2.0);add(g,rbox(1.1,.9,.08,.03,slate),-3.7,1.3,2.78);
 add(g,rbox(1.7,1.4,1.4,.25,tealg),3.9,1.2,2.2);add(g,cyl(.65,.65,1.9,yel,16),2.9,1.3,1.7);
 add(g,rbox(.9,.8,.9,.1,brown),-3.9,1.0,-2.0);add(g,rbox(.6,.6,.6,.08,brown),-3.0,.9,-2.4);
 { // finished planks / slabs stack up in front of the mill (shown according to the output buffer)
  const pm=std(wood?'#2fc4c0':'#9aa0aa',{roughness:.7}),pm2=std(wood?'#22a3a0':'#80868f',{roughness:.7});const pile=new THREE.Group();pile.position.set(pp?pp[0]:3.8,0,pp?pp[1]:6.3);pile.scale.setScalar(1.6);g.add(pile);
  add(pile,rbox(1.6,.14,2.2,.05,slate),0,.1,0);
  for(let i=0;i<20;i++){const col=i%2,zz=Math.floor(i/2)%2,L=Math.floor(i/4);const m=new THREE.Mesh(wood?new THREE.BoxGeometry(.5,.2,.8):new THREE.BoxGeometry(.7,.24,.85),i%3===0?pm2:pm);m.position.set((col?.33:-.33)+(L%2?.04:-.04),.3+L*(wood?.22:.26),(zz?.45:-.45)+(L%2?.05:-.05));m.rotation.y=(L%2?.06:-.05);m.visible=false;pile.add(m)}
  g.userData.pile=pile}
 g.userData.wheel=new THREE.Object3D();g.userData.laser=laser;g.userData.sparks=sparks;
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

// ---- Slab press (sheet): the sawmill arch turned sideways, raw stone enters on the west belt, pressed slabs leave on the east side ----
function makeSlabPress(){const g=new THREE.Group();const inner=makeSawmill(false,[-6.3,3.8]);inner.rotation.y=Math.PI/2;g.add(inner);
 if(inner.userData.laser)inner.userData.laser.visible=false;
 const grey=std('#8d94a3',{roughness:.45,metalness:.25}),dk=std('#363a52',{roughness:.65}),teal=std('#2fb0ac',{roughness:.55}),yel=std('#e8b02c',{roughness:.45});
 const head=new THREE.Group();head.position.set(0,3.3,0);g.add(head);
 add(head,rbox(2.2,1.0,2.2,.22,grey),0,0,0);add(head,rbox(2.5,.3,2.5,.1,dk),0,-.62,0);add(head,new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,1.9,14),teal),0,1.3,0);add(head,rbox(1.7,.18,.3,.06,yel),0,.3,1.12);
 const rawG=new THREE.IcosahedronGeometry(.42,0),rawM=std('#c0704e',{roughness:.9,flatShading:true}),raw=[],outs=[];
 [-4.1,-3.2,-2.35,-1.5].forEach((x,i)=>{const m=new THREE.Mesh(rawG,rawM);m.position.set(x,1.0,(i%2?.12:-.1));m.scale.set(1,.8+.15*(i%3),.9+.1*(i%2));m.rotation.set(i,i*2,0);m.visible=false;g.add(m);raw.push(m)});
 [1.7,3.0].forEach((x,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.0,.2,.75),std('#9aa0aa',{roughness:.8}));m.position.set(x,.88,0);m.visible=false;g.add(m);outs.push(m)});
 g.userData=Object.assign({},inner.userData,{laser:null,head,raw,outs});
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeLogStorage(){const g=new THREE.Group();
 const cream=std('#e4dcc8',{roughness:.5}),slate=std('#5a6080',{roughness:.55}),dk=std('#454b66',{roughness:.6}),yel=std('#e8b02c',{roughness:.45}),teal=std('#2fb0ac',{roughness:.55}),
  cap=std('#8fe8d0',{roughness:.6}),grey=std('#8d94a3',{roughness:.45,metalness:.25}),brown=std('#9a6a42',{roughness:.7}),
  scr=new THREE.MeshStandardMaterial({color:'#ffd35a',emissive:'#ffb020',emissiveIntensity:1.2}),cyn=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)});
 const logMats=LOGMATS;const cyl=(rt,rb,h,m,seg=14)=>new THREE.Mesh(m===LOGMATS?barkGeo(rt,rb,h,seg):new THREE.CylinderGeometry(rt,rb,h,seg),m);
 const rackLogs=[],pileLogs=[];
 // base slab
 add(g,rbox(12.4,.6,7.6,.3,slate),.4,.3,0);
 // two log racks (left): cream end pillars, frame bars, two shelves of logs
 for(const x of [-5.2,-.6])add(g,rbox(1.25,5.4,3.0,.55,cream),x,3.3,-.6);
 for(const x of [-5.2,-.6]){add(g,rbox(.5,1.1,.12,.05,yel),x,1.2,.95);const w=cyl(.4,.4,.14,dk,18);w.rotation.x=Math.PI/2;w.position.set(x,4.6,.95);g.add(w)}
 for(const y of [2.1,3.9,5.2])add(g,rbox(4.2,.14,.14,.05,grey),-2.9,y,.7);
 for(const y of [2.1,3.9])add(g,rbox(4.2,.12,2.4,.04,dk),-2.9,y-.12,-.6);
 for(const [y,n] of [[2.65,4],[4.45,4]])for(let i=0;i<n;i++){const l=cyl(.46,.46,4.0,logMats,14);l.rotation.z=Math.PI/2;const row=i%2,lay=Math.floor(i/2);l.position.set(-2.9,y+lay*.88,-1.4+row*1.15);g.add(l);rackLogs.push(l)}
 // crane tower (right) with yellow stripe and arm
 add(g,rbox(2.7,5.8,3.0,.6,cream),3.5,3.5,-.6);add(g,rbox(.5,5.2,.14,.05,yel),3.5,3.5,.95);add(g,rbox(.6,.6,.14,.2,yel),2.4,1.1,.95);
 add(g,cyl(.9,1.0,.4,dk,18),3.5,6.55,-.6);
 const arm=new THREE.Group();arm.position.set(3.5,6.8,-.6);g.add(arm);
 add(arm,cyl(.32,.32,.7,yel,12),0,.3,0);
 const up=new THREE.Group();up.rotation.z=.9;arm.add(up);add(up,rbox(.5,3.0,.5,.2,yel),0,1.5,0);
 const fo=new THREE.Group();fo.position.set(0,3.0,0);fo.rotation.z=-1.9;up.add(fo);add(fo,rbox(.4,2.6,.4,.16,cream),0,1.3,0);
 const claw=new THREE.Group();claw.position.set(0,2.6,0);claw.rotation.z=1.0;fo.add(claw);
 for(const s of [-1,1]){const f=rbox(.12,.9,.14,.05,grey);f.position.set(s*.3,.4,0);f.rotation.z=s*.35;claw.add(f)}
 add(claw,rbox(.8,.28,.3,.08,dk),0,0,0);
 for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(.5,.07,6,12,Math.PI),teal);c.position.set(.12*i,1.0+i*.55,.28);up.add(c)}
 // log pile on a tray in front, yellow rails
 add(g,rbox(4.6,.4,2.8,.14,slate),1.3,.78,3.3);
 for(const x of [-.9,3.5]){add(g,rbox(.16,1.5,2.4,.05,yel),x,1.6,3.3)}add(g,rbox(4.6,.14,.14,.05,yel),1.3,2.3,4.5);
 {let k=0;for(let r=0;r<3;r++)for(let c=0;c<4-r;c++){const l=cyl(.4,.4,2.3,logMats,14);l.rotation.x=Math.PI/2;l.position.set(.1+c*.82+r*.41,1.45+r*.72,3.3);g.add(l);pileLogs.push(l)}}
 // terminal, generator, crates, antennas
 add(g,rbox(.9,1.3,.8,.12,grey),5.5,1.2,3.4);add(g,rbox(.62,.5,.1,.04,scr),5.5,1.55,3.82);add(g,rbox(.5,.1,.08,.03,cyn),5.5,.95,3.82);
 add(g,rbox(1.6,1.1,1.2,.2,slate),6.6,1.1,1.3);add(g,rbox(.9,.2,.08,.04,cyn),6.6,1.3,1.93);
 add(g,rbox(.9,.8,.9,.1,brown),-3.2,1.0,3.5);add(g,rbox(.7,.55,.7,.08,brown),-2.2,.9,4.1);
 for(const x of [-5.5,-4.9,.0,.6]){add(g,cyl(.05,.05,1.5,grey,6),x,6.8,-.6)}
 beltStub(g,-6.65,-1.0,2.1,'x',.7);beltStub(g,7.45,-1.2,2.1,'x',.7);
 g.userData.logs=rackLogs.concat(pileLogs);g.userData.arm=arm;g.userData.up=up;g.userData.fo=fo;
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeLogDepot(){const g=new THREE.Group();
 const cream=std('#e4dcc8',{roughness:.5}),slate=std('#5a6080',{roughness:.55}),dk=std('#363a52',{roughness:.65}),yel=std('#e8b02c',{roughness:.45}),teal=std('#2fb0ac',{roughness:.55}),
  cap=std('#8fe8d0',{roughness:.6}),grey=std('#8d94a3',{roughness:.45,metalness:.25}),binm=std('#b3a898',{roughness:.6}),brown=std('#9a6a42',{roughness:.7}),
  scr=new THREE.MeshStandardMaterial({color:'#ffd35a',emissive:'#ffb020',emissiveIntensity:1.2}),cyn=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)});
 const logMats=LOGMATS;const cyl=(rt,rb,h,m,seg=14)=>new THREE.Mesh(m===LOGMATS?barkGeo(rt,rb,h,seg):new THREE.CylinderGeometry(rt,rb,h,seg),m);
 const binLogs=[];
 // base slab
 add(g,rbox(12.6,.6,7.8,.3,slate),0,.3,.2);
 // main machine body: rounded cream block with yellow side band and arched tunnel on the front
 add(g,rbox(4.4,5.4,3.8,.9,cream),-2.6,3.3,-.5);
 add(g,rbox(.9,5.5,3.9,.3,yel),-4.45,3.3,-.5);                      // yellow band on the left flank
 add(g,rbox(2.0,2.2,.5,.2,dk),-2.4,2.0,1.45);                        // tunnel mouth
 {const arch=cyl(1.0,1.0,.5,dk,20);arch.rotation.x=Math.PI/2;arch.position.set(-2.4,3.1,1.45);g.add(arch)}
 add(g,rbox(1.7,.9,.14,.1,teal),-2.4,5.2,1.42);                      // teal plate above tunnel
 add(g,rbox(.2,.5,.12,.04,cap),-2.4,5.2,1.5);
 // teal pipe along the flank
 add(g,cyl(.14,.14,2.6,teal,8),-4.9,3.0,1.0);{const b=new THREE.Mesh(new THREE.TorusGeometry(.4,.14,6,10,Math.PI),teal);b.position.set(-4.5,4.3,1.0);g.add(b)}
 // conveyor coming out of the tunnel with one log on it
 // open bin on the right with a pile of logs
 add(g,rbox(5.0,.4,4.2,.15,binm),3.2,.8,-.2);
 add(g,rbox(.35,2.9,4.2,.12,binm),.8,2.1,-.2);add(g,rbox(.35,2.9,4.2,.12,binm),5.6,2.1,-.2);
 add(g,rbox(5.0,2.9,.35,.12,binm),3.2,2.1,-2.15);add(g,rbox(5.0,1.5,.35,.12,binm),3.2,1.5,1.75);
 for(const [lay,n] of [[0,3],[1,3],[2,2]])for(let i=0;i<n;i++){const l=cyl(.46,.46,3.0,logMats,14);l.rotation.x=Math.PI/2;l.position.set(3.2+(i-(n-1)/2)*.95,1.5+lay*.78,-.2);g.add(l);binLogs.push(l)}
 // crane on top of the body, claw reaching over the bin
 add(g,cyl(1.0,1.15,.4,dk,18),-2.6,6.25,-.5);
 const arm=new THREE.Group();arm.position.set(-2.6,6.45,-.5);g.add(arm);
 add(arm,cyl(.38,.38,.8,yel,12),0,.35,0);
 const up=new THREE.Group();up.rotation.z=-.85;arm.add(up);add(up,rbox(.55,3.0,.55,.22,yel),0,1.5,0);add(up,rbox(.14,2.6,.58,.05,cream),.2,1.5,0);
 const fo=new THREE.Group();fo.position.set(0,3.0,0);fo.rotation.z=-1.3;up.add(fo);add(fo,rbox(.42,2.8,.42,.16,cream),0,1.4,0);add(fo,cyl(.34,.34,.6,yel,12),0,0,0);
 const claw=new THREE.Group();claw.position.set(0,2.8,0);claw.rotation.z=2.15;fo.add(claw);
 add(claw,rbox(.9,.32,.34,.1,dk),0,0,0);
 for(const s of [-1,1]){const f=rbox(.14,1.0,.16,.05,grey);f.position.set(s*.34,-.5,0);f.rotation.z=s*.3;claw.add(f)}
 for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,6,12,Math.PI),teal);c.position.set(-.1*i,1.0+i*.6,.32);up.add(c)}
 // terminal, generator, crates, bench
 add(g,rbox(1.0,1.5,.9,.14,grey),-5.4,1.35,2.6);add(g,rbox(.7,.55,.1,.04,scr),-5.4,1.75,3.08);add(g,rbox(.5,.1,.08,.03,cyn),-5.4,1.1,3.08);
 add(g,rbox(1.7,1.2,1.3,.2,slate),5.6,1.2,2.8);add(g,rbox(1.0,.22,.08,.04,cyn),5.6,1.4,3.46);add(g,rbox(1.1,.2,.5,.05,grey),5.6,1.95,2.8);
 add(g,rbox(.9,.8,.9,.1,brown),-4.9,1.0,-3.1);add(g,rbox(.7,.55,.7,.08,brown),-3.9,.9,-3.3);
 add(g,rbox(1.4,.18,.5,.04,brown),-5.8,.9,.2);
 g.userData.logs=binLogs;g.userData.arm=arm;g.userData.up=up;g.userData.fo=fo;
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
