// utils
let seed=7;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;const RR=(a,b)=>a+R()*(b-a);
const hash=(x,y,z)=>{let h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)};
const sm=t=>t*t*(3-2*t);
function noise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=sm(x-xi),yf=sm(y-yi),zf=sm(z-zi);let r=0;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){r+=hash(xi+a,yi+b,zi+c)*(a?xf:1-xf)*(b?yf:1-yf)*(c?zf:1-zf)}return r}
const fbm=(x,y,z)=>noise3(x,y,z)*.6+noise3(x*2.1,y*2.1,z*2.1)*.3+noise3(x*4.3,y*4.3,z*4.3)*.1;
const col=c=>new THREE.Color(c);
function merge(geos){let n=0;const gs=geos.map(g=>g.index?g.toNonIndexed():g);gs.forEach(g=>n+=g.attributes.position.count);
 const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
 for(const g of gs){P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);if(g.attributes.color)C.set(g.attributes.color.array,o*3);else C.fill(1,o*3,(o+g.attributes.position.count)*3);o+=g.attributes.position.count}
 const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('color',new THREE.BufferAttribute(C,3));return m}
// lumpy clay blob with vertical gradient. returns geometry in place
function blobGeo(r,{sx=1,sy=1,sz=1,top='#6fe0d0',bot='#1d86a0',amp=.12,freq=1.4,detail=4,off=[0,0,0],sd=0,mid=.5,ctr=null}={}){
 const g=new THREE.IcosahedronGeometry(1,detail);const p=g.attributes.position,nrm=g.attributes.normal,c=new Float32Array(p.count*3);const ct=col(top),cb=col(bot),t=new THREE.Color();
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const l=Math.hypot(x,y,z);x/=l;y/=l;z/=l;
  const d=1+amp*(fbm(x*freq+sd,y*freq+sd*.7,z*freq+sd*1.3)-.5)*2;
  p.setXYZ(i,x*d*r*sx+off[0],y*d*r*sy+off[1],z*d*r*sz+off[2]);nrm.setXYZ(i,x/sx,y/sy,z/sz);
  const wy=p.getY(i);const k=Math.min(1,Math.max(0,(ctr?((wy-ctr[0])/ctr[1])*.5+.5:.5+.5*y)+(fbm(x*2+sd,y*2,z*2)-.5)*.18));t.copy(cb).lerp(ct,Math.pow(k,mid*2));c[i*3]=t.r;c[i*3+1]=t.g;c[i*3+2]=t.b}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));
 const n=g.attributes.normal;for(let i=0;i<n.count;i++){const v=new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)).normalize();n.setXYZ(i,v.x,v.y,v.z)}return g}
const clay=(o={})=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,...o});
const std=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.5,...o});
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
function glow(color,size,pos){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.55}));s.scale.setScalar(size);s.position.copy(pos);return s}
function rbox(w,h,d,r,mat,seg=6){const g=new THREE.BoxGeometry(w,h,d,seg,seg,seg);const p=g.attributes.position,n=g.attributes.normal;const ix=w/2-r,iy=h/2-r,iz=d/2-r;const v=new THREE.Vector3(),q=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i));q.set(Math.max(-ix,Math.min(ix,v.x)),Math.max(-iy,Math.min(iy,v.y)),Math.max(-iz,Math.min(iz,v.z)));const dir=v.sub(q).normalize();p.setXYZ(i,q.x+dir.x*r,q.y+dir.y*r,q.z+dir.z*r);n.setXYZ(i,dir.x,dir.y,dir.z)}
 const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;return m}
const add=(parent,mesh,x=0,y=0,z=0)=>{mesh.position.set(x,y,z);parent.add(mesh);return mesh};
const shadowy=m=>{m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return m};

// ---------------- tree ----------------
const TREE_COLORS={teal:['#4fe0d0','#1380b0'],deep:['#2fc0c0','#0a5a86'],blue:['#7a92ff','#2430b4'],sky:['#5cc2f0','#1c5aa8']};
function makeTree(kind='teal',scale=1,sd=1){
 const [top,bot]=TREE_COLORS[kind];const g=new THREE.Group();
 const tm=new THREE.MeshStandardMaterial({color:'#9a9ca8',roughness:.88,vertexColors:false});
 // trunk: flared, slightly twisted, lumpy root base
 const tg=new THREE.CylinderGeometry(.52,.82,2.7,28,16,true);{const p=tg.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const t=(y+1.35)/2.7;const a=Math.atan2(z,x)+t*.9;const flare=1+1.35*Math.pow(Math.max(0,1-t),4.5);const lump=1+.1*Math.sin(a*3+sd)*(1-t*.6)+.05*Math.sin(a*5+sd*2);const waist=1-.12*Math.sin(t*3.1);p.setXYZ(i,x*flare*lump*waist,y,z*flare*lump*waist)}tg.computeVertexNormals()}
 const trunk=new THREE.Mesh(tg,tm);trunk.position.y=1.35;g.add(trunk);
 const base=new THREE.Mesh(new THREE.SphereGeometry(1.0,24,12,0,6.283,0,Math.PI/2),tm);base.scale.set(1,.16,1);g.add(base);
 // branch arms cradling canopy
 const nArms=3;for(let i=0;i<nArms;i++){const a=i*(6.283/nArms)+sd*.9+.4;const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,2.2,0),new THREE.Vector3(Math.cos(a)*.3,2.9,Math.sin(a)*.3),new THREE.Vector3(Math.cos(a)*.9,3.5,Math.sin(a)*.9),new THREE.Vector3(Math.cos(a)*1.3,4.05,Math.sin(a)*1.3)]);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(c,16,.26,10,false),tm);g.add(tube);const cap=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),tm);cap.position.copy(c.getPoint(1));g.add(cap);
  const tc=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),tm);tc.position.copy(c.getPoint(0));tc.scale.setScalar(1.4);g.add(tc)}
 // canopy: ONE smooth surface = sphere + sum of soft gaussian lumps (no hard seams)
 const cy=5.75,CR=2.75;const sg=new THREE.SphereGeometry(1,150,96);{const p=sg.attributes.position;const cc=new Float32Array(p.count*3);const ct=col(top),cb=col(bot),tmp=new THREE.Color();
  const lumps=[];const nl=80;for(let i=0;i<nl;i++){const yy=1-2*(i+.5)/nl,rad=Math.sqrt(1-yy*yy),a=i*2.39996+R()*.5;const big=i%9===0;lumps.push({d:new THREE.Vector3(rad*Math.cos(a),yy+RR(-.06,.06),rad*Math.sin(a)).normalize(),h:big?RR(.16,.26):RR(.08,.17),w:big?RR(.22,.32):RR(.14,.22)})}
  lumps.push({d:new THREE.Vector3(0,-1,0),h:-.35,w:.38});
  const v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i)).normalize();let r=1+(fbm(v.x*1.6+sd,v.y*1.6,v.z*1.6+sd)-.5)*.08;let bm=0;for(const l of lumps){const c=1-v.dot(l.d);bm=Math.max(bm,l.h*Math.exp(-c/(l.w*l.w)))+(l.h<0?l.h*Math.exp(-c/(l.w*l.w)):0)*0;if(l.h<0)r+=l.h*Math.exp(-c/(l.w*l.w))}r+=bm
   // squash bottom a bit, keep a heavy underside
   const y=v.y*r*CR*.96,x=v.x*r*CR,z=v.z*r*CR;p.setXYZ(i,x,y+cy,z);
   const k=Math.min(1,Math.max(0,.5+.5*(y/(CR*1.1))+(fbm(v.x*3+sd,v.y*3,v.z*3)-.5)*.2));tmp.copy(cb).lerp(ct,Math.pow(k,1.15));cc[i*3]=tmp.r;cc[i*3+1]=tmp.g;cc[i*3+2]=tmp.b}
  sg.setAttribute('color',new THREE.BufferAttribute(cc,3));sg.computeVertexNormals()}
 const can=new THREE.Mesh(sg,clay({roughness:.88}));g.add(can);
 // glowing spots, ray-cast to the real surface
 const gc=kind==='blue'?'#a8c4ff':kind==='sky'?'#b4f2ff':'#7dfcf2';
 g.updateMatrixWorld(true);const rc=new THREE.Raycaster();
 const specs=[[.4,.12,1.15],[2.4,-.12,.62],[3.7,.3,.72],[5.3,-.3,.55],[4.5,.02,1.0]];
 specs.forEach(([a,yy,sz])=>{a+=sd;const q=Math.sqrt(1-yy*yy);const dir=new THREE.Vector3(Math.cos(a)*q,yy,Math.sin(a)*q);const org=new THREE.Vector3(0,cy,0).addScaledVector(dir,9);rc.set(org,dir.clone().negate());const hit=rc.intersectObject(can)[0];if(!hit)return;
  const n=hit.face.normal.clone().transformDirection(can.matrixWorld);const pos=hit.point.clone();
  const d=new THREE.Mesh(new THREE.CircleGeometry(.3*sz,28),new THREE.MeshBasicMaterial({color:new THREE.Color(gc).multiplyScalar(1.6)}));d.position.copy(pos).addScaledVector(n,.03);d.scale.set(1,1.2,1);d.lookAt(pos.clone().add(n));g.add(d);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3*sz,.44*sz,28),new THREE.MeshBasicMaterial({color:gc,transparent:true,opacity:.3,depthWrite:false}));ring.position.copy(d.position).addScaledVector(n,.01);ring.scale.copy(d.scale);ring.quaternion.copy(d.quaternion);g.add(ring);
  g.add(glow(gc,.5*sz,pos.clone().addScaledVector(n,.12)))});
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
function makeRock(scale=1,kind='teal',sd=1){return kind==='teal'?makeNode(scale,sd):makeStone(scale,sd)}
function makeCrystal(scale=1,sd=1){const g=new THREE.Group();const mat=new THREE.MeshPhysicalMaterial({color:'#4fb8ff',emissive:'#1f86ff',emissiveIntensity:.85,roughness:.18,metalness:0,clearcoat:1,clearcoatRoughness:.15,flatShading:true});
 const specs=[[0,0,2.5,.42,0,0],[.62,.1,1.7,.34,.38,-.1],[-.62,.05,1.85,.36,-.4,.1],[.15,.52,1.0,.28,.15,.5],[-.35,.45,.85,.26,-.3,.55],[.85,-.3,.9,.24,.55,-.2],[-.9,-.25,1.0,.25,-.55,-.1]];
 for(const [x,z,h,r,tx,tz] of specs){const lat=new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(r,0),new THREE.Vector2(r,h*.68),new THREE.Vector2(r*.78,h*.82),new THREE.Vector2(0,h)],6);const m=new THREE.Mesh(lat,mat);m.position.set(x,.1,z);m.rotation.set(tz*.55,R()*3,-tx*.55);m.castShadow=true;g.add(m)}
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
function makeRobot(scale=1){const g=new THREE.Group();
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
  for(const z of [-.55,0,.55]){const hub=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.12,20),std('#8e97a8',{roughness:.4,metalness:.3}));hub.rotation.z=Math.PI/2;hub.position.set(sx*1.1,.42,z);g.add(hub)}
  const tl=rbox(.1,.1,.2,.04,cyan);tl.position.set(sx*1.14,.42,0);g.add(tl);
  {const rm=std('#202228',{roughness:.9});const add1=(y,z,rot)=>{const rg=rbox(.735,.05,.11,.02,rm,2);rg.position.set(sx*.74,y,z);rg.rotation.x=rot;g.add(rg)};
   for(let i=0;i<7;i++){const z=-.5+i*(1/6);add1(.42+.42,z,0);add1(.42-.42,z,0)}
   for(let i=1;i<5;i++){const a=i/5*Math.PI;add1(.42+Math.cos(a)*.42,.5+Math.sin(a)*.4,-(Math.PI/2-a)*1);add1(.42+Math.cos(a)*.42,-.5-Math.sin(a)*.4,(Math.PI/2-a)*1)}}
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
function makeFactory(){const g=new THREE.Group();const beige=std('#d6bfa2',{roughness:.6}),purp=std('#a692c6',{roughness:.55}),steel=std('#6a5d7a',{roughness:.45,metalness:.2}),yel=new THREE.MeshStandardMaterial({color:'#ffd35a',emissive:'#ffb020',emissiveIntensity:1.1,roughness:.4}),cyn=new THREE.MeshBasicMaterial({color:new THREE.Color('#7ff6ff').multiplyScalar(1.4)});
 add(g,rbox(5.6,2.6,3.8,.8,beige),0,1.4,0);add(g,rbox(5.0,1.2,3.3,.55,purp),0,3.2,-.1);add(g,rbox(5.9,.45,4.1,.2,std('#5c4f6a')),0,.25,0);
 for(const sx of [-1,1]){const w=rbox(1.05,1.7,.3,.5,yel);add(g,w,sx*1.75,1.35,1.95);const arch=rbox(1.5,2.0,.2,.6,steel);add(g,arch,sx*1.75,1.4,1.85);g.add(glow('#ffb840',1.6,new THREE.Vector3(sx*1.75,1.4,2.3)))}
 for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.2,16),cyn);e.rotation.z=Math.PI/2;e.position.set(sx*2.9,1.9,.9);g.add(e)}
 const strip=rbox(2.2,.18,.1,.05,cyn);add(g,strip,.2,2.35,1.97);
 for(const x of [1.15,2.0]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,2.2,18),steel);c.position.set(x,4.9,-.9);g.add(c);const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.09,10,20),std('#4a3f58'));ring.rotation.x=Math.PI/2;ring.position.set(x,6.0,-.9);g.add(ring)}
 const gear=(r,mat,y,x,z)=>{const gg=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.35,32),mat);gg.add(body);for(let i=0;i<12;i++){const t=rbox(r*.32,.35,r*.3,.04,mat,2);const a=i*Math.PI/6;t.position.set(Math.cos(a)*r,0,Math.sin(a)*r);t.rotation.y=-a;gg.add(t)}const hole=new THREE.Mesh(new THREE.CylinderGeometry(r*.3,r*.3,.4,20),std('#2a2230'));gg.add(hole);gg.position.set(x,y,z);gg.rotation.x=.25;g.add(gg);return gg};
 gear(.8,std('#f1b32c',{roughness:.4,metalness:.1}),4.15,-.35,-.1);gear(.62,std('#8190ad',{roughness:.4,metalness:.2}),3.95,.95,.45);
 for(let i=0;i<4;i++)add(g,rbox(.5,.35,.5,.12,std('#7a6a8a')),-2.4+i*.45,3.9,.9);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeBelt(len){const g=new THREE.Group();add(g,rbox(len,.45,1.1,.2,std('#6b5a7a',{roughness:.5})),len/2,.3,0);add(g,rbox(len-.2,.1,.8,.05,std('#2e2838')),len/2,.55,0);
 for(let i=0;i<len*1.6;i++){const s=rbox(.12,.08,.7,.03,std('#b6a3c8'));add(g,s,.2+i*.62,.62,0)}g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeLogs(){const g=new THREE.Group();const side=std('#2da396',{roughness:.6}),cap=std('#bfeedd',{roughness:.7}),mats=[side,cap,cap];
 const pos=[[0,0],[.72,0],[1.44,0],[.36,.62],[1.08,.62],[.72,1.2]];pos.forEach(([x,y],i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,2.1,20),mats);m.rotation.z=Math.PI/2;m.rotation.y=.02*i;m.position.set(x,.36+y,0);m.castShadow=m.receiveShadow=true;g.add(m);const ring=new THREE.Mesh(new THREE.TorusGeometry(.17,.03,8,20),std('#78c9b4'));ring.position.set(x-1.06,.36+y,0);ring.rotation.y=Math.PI/2;g.add(ring)});g.rotation.y=-.5;return g}
function makeDrill(){const g=new THREE.Group();const cream=std('#e8e0c6',{roughness:.45});
 for(const sx of [-1,1]){add(g,rbox(.5,.4,1.7,.18,std('#8a9a62')),sx*.7,.28,0)}add(g,rbox(1.5,.5,1.4,.2,std('#a8b57a')),0,.65,0);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,1.7,22),cream);body.position.set(0,1.6,0);g.add(body);const eye=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),new THREE.MeshBasicMaterial({color:new THREE.Color('#8ffcff').multiplyScalar(1.5)}));eye.scale.set(1,1,.5);eye.position.set(0,1.8,.46);g.add(eye);g.add(glow('#7ff6ff',.9,new THREE.Vector3(0,1.8,.55)));
 const bit=new THREE.Mesh(new THREE.ConeGeometry(.28,1.1,14),std('#8a8a98',{metalness:.5,roughness:.35}));bit.position.set(.35,.5,.75);bit.rotation.set(Math.PI*.78,0,-.5);g.add(bit);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12),std('#9ad0c8'));cap.position.set(0,2.5,0);g.add(cap);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}
function makeCoral(){const g=new THREE.Group();for(let i=0;i<22;i++){const a=R()*6.283,tilt=RR(.15,.7),h=RR(.9,1.8);const m=new THREE.Mesh(new THREE.CapsuleGeometry(.07,h,4,8),std(i%2?'#f4a384':'#ea8a68',{roughness:.7}));m.position.set(Math.cos(a)*RR(.1,.7),h/2,Math.sin(a)*RR(.1,.7));m.rotation.set(Math.sin(a)*tilt,0,-Math.cos(a)*tilt);m.castShadow=true;g.add(m)}return g}
