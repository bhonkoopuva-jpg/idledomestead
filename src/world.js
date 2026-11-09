// ================= WORLD: renderer, terrain, zones =================
const MOBILE=matchMedia('(pointer:coarse)').matches;
const glc=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas:glc,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
let RPR=Math.min(devicePixelRatio,2);renderer.setPixelRatio(RPR);renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#dc7d52');scene.fog=new THREE.Fog('#e3916a',48,118);
const cam=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,1,260);
scene.add(new THREE.HemisphereLight('#ffd8c0','#8c3a28',.3));
const sun=new THREE.DirectionalLight('#ffe8cc',2.4);sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?1536:3072,MOBILE?1536:3072);
Object.assign(sun.shadow.camera,{left:-56,right:56,top:50,bottom:-52,near:1,far:150});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;sun.shadow.radius=4;
// ---- soft studio-style environment (pastel sky dome + warm key panel) for natural reflections / ambient light ----
{const es=new THREE.Scene();
 const dome=new THREE.Mesh(new THREE.SphereGeometry(20,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  vertexShader:'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vp;void main(){float h=vp.y;vec3 top=vec3(.95,.86,.78)*.5,mid=vec3(.95,.62,.48)*.4,low=vec3(.5,.28,.24)*.25;vec3 c=h>0.?mix(mid,top,smoothstep(0.,.8,h)):mix(mid,low,smoothstep(0.,-.6,h));gl_FragColor=vec4(c,1.);}'}));
 es.add(dome);
 const panel=(x,y,z,s,c)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m)};
 panel(-9,12,7,9,new THREE.Color(1.6,1.4,1.1));panel(10,5,10,7,new THREE.Color(.6,.45,.4));
 const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(es,.05).texture;pm.dispose()}
const SUNOFF=new THREE.Vector3(-16,28,12);scene.add(sun);scene.add(sun.target);
const fillL=new THREE.DirectionalLight('#ffb090',.5);fillL.position.set(12,8,14);scene.add(fillL);

// ---- zones: START plus nine irregular regions (numbered in unlock order) ----
const WS=2; // world scale: 4x the area
const mkL=(x,z,a,b,k)=>({x:x*WS,z:z*WS,a:a*k*WS,b:b*k*WS});
const ZONES=[
 {id:'home',name:'Main Base',lobes:[mkL(0,-.8,35.9,29.2,1.03)],free:true},
 {id:'grove',name:'Teal Alien Forest',from:0,lobes:[mkL(9.2,38,36.7,12.1,1.2),mkL(3,29,15,8,1),mkL(-27,24,8,8,1),mkL(33,28,10,9,1)],cost:{wood:30,stone:20},blurb:'Dense teal forest. Lots of wood.',
  trees:{n:0,kinds:['teal']},stone:2,ore:2,crystal:0,
  fixedPads:[{x:-12,z:42,k:'wood',gath:1},{x:38,z:31,k:'wood',mill:1}],
  clusters:[{x:-22,z:38,r:9,type:'tree',kinds:['teal','deep','blue'],n:14,s:[.62,.88]},{x:20,z:49.5,r:8,ex:2,type:'tree',kinds:['sky','blue'],n:10,s:[1.3,1.6]}]},
 {id:'flats',name:'Turquoise Mineral Fields',from:0,lobes:[mkL(-47.2,6.3,17.1,32.1,1.15)],cost:{wood:80,stone:60,coins:200,plate:6,plank:8},blurb:'Rocky flats: stone and teal ore.',
  trees:{n:3,kinds:['sky']},stone:0,ore:0,crystal:1,
  fixedPads:[{x:-52,z:-10,k:'stone'},{x:-42,z:18,k:'stone',mill:1}],
  clusters:[{x:-47,z:-23,r:9,type:'stone',n:12,s:[.6,.9]},{x:-47,z:31,r:8,type:'ore',n:6,s:[.95,1.35]}]},
 {id:'canyon',name:'Crystal Caves',from:0,lobes:[mkL(44.3,-15.9,15.9,35.1,1.15),mkL(33,22,10,10,1)],cost:{wood:120,stone:100,ore:40,coins:600,circuit:6,slab:8},blurb:'Glowing blue crystal veins.',
  trees:{n:3,kinds:['deep']},stone:5,ore:6,crystal:6,padK:['crystal','ore','crystal']},
 {id:'dunes',name:'Sky Dunes',from:0,lobes:[mkL(12.5,-50.5,37.6,24.6,1.12),mkL(25,-24,7,7,1)],cost:{ore:80,stone:120,coins:1400,plate:14,circuit:8,plank:16},blurb:'Towering sky-blue trees.',
  trees:{n:12,kinds:['sky','blue']},stone:5,ore:6,crystal:4,padK:['wood','wood','ore','stone']},
 {id:'rim',name:'Far Rim',from:4,lobes:[mkL(26.7,-73.5,45.1,30.1,1.1)],cost:{crystal:40,ore:120,coins:3000,circuit:14,cell:8},blurb:'Rich deposits on the edge of the map.',
  trees:{n:8,kinds:['blue','deep','sky']},stone:8,ore:10,crystal:10,padK:['crystal','crystal','ore','wood']},
 {id:'badlands',name:'Rust Badlands',from:0,entry:1,lobes:[mkL(-46.8,-88.1,46.8,28,1.08),mkL(-33,-36,14,32,1.2),mkL(-51,-50,11,11,1),mkL(-50,-30,6,6,1)],cost:{crystal:90,coins:6000,brick:60,cell:16,circuit:24},blurb:'Cracked red wastes, packed with ore.',
  trees:{n:10,kinds:['teal','deep']},stone:12,ore:14,crystal:12,padK:['ore','crystal','stone','wood']},
 {id:'glass',name:'Glass Canyon',from:2,lobes:[mkL(-72.6,7.5,22.5,81,1.08)],cost:{coins:10000,crystal:140,module:6,core:3},blurb:'A towering crystal gorge.',
  trees:{n:6,kinds:['blue','sky']},stone:12,ore:14,crystal:18,padK:['crystal','crystal','ore','ore']},
 {id:'basin',name:'Deep Basin',from:1,lobes:[mkL(-5,79.3,64,49.3,1.05)],cost:{coins:25000,module:16,core:8,cell:30},blurb:'A huge basin. Room for everything.',
  trees:{n:22,kinds:['teal','sky','blue','deep']},stone:16,ore:20,crystal:20,padK:['wood','wood','stone','ore','crystal']},
 {id:'titan',name:'Titan Reach',from:3,lobes:[mkL(60.1,59.3,26.7,47.6,1.05)],cost:{coins:60000,module:32,core:16,crystal:300},blurb:'The last frontier. Crystal everywhere.',
  trees:{n:8,kinds:['deep','blue']},stone:10,ore:14,crystal:18,padK:['crystal','crystal','crystal','ore']}
];
ZONES.forEach(z=>{if(z.cost)z.cost=convCost(z.cost)});
ZONES.forEach(z=>{(z.fixedPads||[]).forEach(p=>{p.x*=WS;p.z*=WS});(z.clusters||[]).forEach(c=>{c.x*=WS;c.z*=WS;c.r*=1.4;c.n*=2})});
ZONES.forEach((z,i)=>{z.i=i;const l=z.lobes[0];z.x=l.x;z.z=l.z;z.R=Math.sqrt(l.a*l.b)});
function wob(z,a){return 1+.04*Math.sin(a*3+z.i*1.7)+.03*Math.sin(a*5+z.i*3.1)+.02*Math.sin(a*9+z.i*.7)}
// approx distance (world units) inside a lobe; <0 outside
function lobeS(z,l,x,zz){const dx=x-l.x,dz=zz-l.z;const dn=Math.hypot(dx/l.a,dz/l.b);if(dn<1e-3)return 200;const g=Math.hypot(dx/(l.a*l.a),dz/(l.b*l.b))/dn;return(wob(z,Math.atan2(dz,dx))-dn)/Math.max(g,1e-3)}
const terrS=(z,x,zz)=>{let b=-1e9;for(const l of z.lobes){const v=lobeS(z,l,x,zz);if(v>b)b=v}return b};
function terrVal(x,zz){let b=-1e9,s=0,n=0;const vs=[];for(const q of ZONES){if(q.i&&!(typeof S!=='undefined'&&S.unl[q.i]))continue;const v=terrS(q,x,zz);vs.push(v);if(v>b)b=v}if(vs.length<2)return b;for(const v of vs)if(v>b-6){s+=Math.exp((v-b)*.45);n++}return n>1?b+Math.log(s)/.45:b}
function allVal(x,zz){let b=-1e9;for(const q of ZONES){const v=terrS(q,x,zz);if(v>b)b=v}return b}
function ownerOf(x,zz){for(const q of ZONES)if(terrS(q,x,zz)>0)return q.i;return -1} // earlier regions claim any overlap
const mulb=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function zonePoint(z,margin,rnd){const ar=z.lobes.map(l=>l.a*l.b),tot=ar.reduce((a,b)=>a+b,0);for(let g=0;g<60;g++){let r=rnd()*tot,k=0;while(k<ar.length-1&&r>ar[k]){r-=ar[k];k++}const l=z.lobes[k],a=rnd()*6.2832,rr=Math.sqrt(rnd());const x=l.x+Math.cos(a)*l.a*rr,zz=l.z+Math.sin(a)*l.b*rr;if(ownerOf(x,zz)===z.i&&terrS(z,x,zz)>=margin)return[x,zz]}return null}
// gates: the unlock ring of region N sits at the edge of the region it connects to
const BASE_POS={dome:{a:120,r:18},pad:{a:140,r:24},dish:{a:232,r:27},reactor:{a:258,r:24},solar:{a:288,r:18}};
const KEEP=[[0,-2,12],[-14,5.6,8],[0,7,6],[15,-2,9],[-6,12,6],[18,10,6],[-13,-9,6],
 [-20,-14,5.5],[-9,-18,5.5],[-21,3,5.5],[12,-12,5.5],[16,-15,5.5],[14,-19,5.5],[-3,18,5.5],[4,16,5.5],[0,22,5.5],[8,21,5.5],[11,17,5.5],[22,2,5.5],[25,5,5.5],[23,8,5.5]];
for(const b of Object.values(BASE_POS)){const a=b.a*Math.PI/180;KEEP.push([Math.cos(a)*b.r,Math.sin(a)*b.r,9])}
const GATES=[];
ZONES.forEach(z=>{z.gate=null;if(z.free)return;const f=ZONES[z.from],tg=z.lobes[z.entry||0];let best=null,bd=1e9;
 for(let x=-230;x<=230;x+=2.5)for(let zz=-270;zz<=290;zz+=2.5){const v=terrS(f,x,zz);if(v<4.8||v>7.6)continue;if(KEEP.some(k=>Math.hypot(x-k[0],zz-k[1])<k[2]))continue;if(f.i===0&&Math.abs(Math.hypot(x,zz)-12.5)<3.5)continue;if(GATES.some(g=>Math.hypot(x-g.x,zz-g.z)<14))continue;const d=Math.hypot(x-tg.x,zz-tg.z);if(d<bd){bd=d;best={x,z:zz}}}
 z.gate=best;GATES.push(best)});
// build-site pads inside each region
ZONES.forEach(z=>{z.crystal=0;if(z.padK)z.padK=z.padK.map(k=>k==='crystal'?'ore':k);if(z.cost&&z.cost.crystal){z.cost.ore=(z.cost.ore||0)+z.cost.crystal*2;delete z.cost.crystal}});
ZONES.forEach(z=>{if(z.fixedPads){z.pads=z.fixedPads.map(p=>({x:p.x-z.x,z:p.z-z.z,k:p.k,mill:p.mill,gath:p.gath}));return}if(!z.padK)return;const rnd=mulb(z.i*977+13),out=[];
 for(let g=0;g<400&&out.length<z.padK.length;g++){const p=zonePoint(z,10,rnd);if(!p)continue;if(GATES.some(q=>Math.hypot(p[0]-q.x,p[1]-q.z)<11))continue;if(out.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<16))continue;out.push(p)}
 z.pads=out.map((p,k)=>({x:p[0]-z.x,z:p[1]-z.z,k:z.padK[k]}))});
// ---- height field ----
const craters=[];
{const rnd=mulb(4242),pads=[];ZONES.forEach(z=>(z.pads||[]).forEach(p=>pads.push([z.x+p.x,z.z+p.z])));
 const okC=(x,zz,R,own)=>{if(ownerOf(x,zz)!==own||terrS(ZONES[own],x,zz)<R+3)return false;if(GATES.some(g=>Math.hypot(x-g.x,zz-g.z)<R+9))return false;if(pads.some(p=>Math.hypot(x-p[0],zz-p[1])<R+6))return false;if(KEEP.some(k=>Math.hypot(x-k[0],zz-k[1])<k[2]*.6+R))return false;if(craters.some(c=>Math.hypot(x-c.x,zz-c.z)<R+c.R+4))return false;for(const q of ZONES)for(const c of (q.clusters||[]))if(Math.hypot(x-c.x,zz-c.z)<R+c.r+2)return false;return true};
 // six crater types from the crater sheet: 0 small dent, 1 small deep, 2 medium wide shallow, 3 medium deep (jagged), 4 large broad shallow, 5 large deep with peak
 const CT=[{R:[2.4,3.4],d:.8,fl:0,rim:.3,w:.3,ro:.03},{R:[3,4],d:1.8,fl:.15,rim:.5,w:.18,ro:.07},{R:[6,8],d:1.1,fl:.55,rim:.5,w:.22,ro:.03},{R:[5,6.5],d:2.8,fl:.2,rim:.45,w:.2,ro:.13},{R:[9,11],d:1.6,fl:.6,rim:.45,w:.25,ro:.04},{R:[10,12],d:3.4,fl:.35,rim:.5,w:.2,ro:.1,pk:2.4}];
 const cnt=[6,5,7,7,12,14,14,16,22,14];
 const slots=[];ZONES.forEach(z=>{for(let k=0;k<(cnt[z.i]||0);k++)slots.push({z,sc:z.i===0?-99:z.i+rnd()*3.2})});
 const N=slots.length,share=[.25,.05,.30,.10,.25,.05];const nt=share.map(s=>Math.round(s*N));nt[2]+=N-nt.reduce((a,b)=>a+b,0);
 // deep craters (1,3,5) go to the later regions, big broad ones also later, small dents early; zone 0 only gets shallow ones
 const byDeep=[...slots].filter(s=>s.z.i>0).sort((a,b)=>b.sc-a.sc),used=new Set();
 const take=(list,n,fromHigh)=>{const o=[];for(const s of list){if(o.length>=n)break;if(used.has(s))continue;used.add(s);o.push(s)}return o};
 const deepOrder=[5,3,1];const dn=deepOrder.map(t=>nt[t]);
 {let pool=byDeep.slice(0,nt[1]+nt[3]+nt[5]+2);let idx=0;pool.forEach((s,i)=>{s.t=null});
  const seq=[];deepOrder.forEach(t=>{for(let i=0;i<nt[t];i++)seq.push(t)});for(let i=seq.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[seq[i],seq[j]]=[seq[j],seq[i]]}
  const dsl=take(byDeep,seq.length);dsl.forEach((s,i)=>{s.t=seq[i]})}
 {const rest=slots.filter(s=>!used.has(s)).sort((a,b)=>a.sc-b.sc);let i=0;[0,2,4].forEach(t=>{for(let k=0;k<nt[t];k++){const s=rest[i++];if(s)s.t=t}});rest.forEach(s=>{if(s.t==null)s.t=2});
  // mix: swap some neighbours so it is not strictly banded
  for(let k=0;k<rest.length;k++){if(rnd()<.6){const j=Math.min(rest.length-1,k+1+Math.floor(rnd()*9));{const t=rest[k].t;rest[k].t=rest[j].t;rest[j].t=t}}}}
 slots.forEach(s=>{const z=s.z,T=CT[s.t];for(let g=0;g<60;g++){const p=zonePoint(z,6,rnd);if(!p)continue;const sh=g<20?1:g<40?.8:.62;const R=(T.R[0]+rnd()*(T.R[1]-T.R[0]))*sh;if(okC(p[0],p[1],R,z.i)){craters.push({x:p[0],z:p[1],R,d:T.d*(.85+rnd()*.3)*(R/(T.R[1]+T.R[0])*2),t:s.t,fl:T.fl,rim:T.rim,w:T.w,ro:T.ro,pk:T.pk||0,ph:rnd()*6.28,ph2:rnd()*6.28});break}}})}
const pathPts=[];
ZONES.forEach(z=>{if(!z.gate)return;const g=z.gate,f=ZONES[z.from],fp=z.from===0?[0,6]:[f.x,f.z],tg=z.lobes[z.entry||0];const e=[tg.x,tg.z];
 const L=[fp,[(fp[0]+g.x)/2,(fp[1]+g.z)/2],[g.x,g.z],[g.x+(e[0]-g.x)*.45,g.z+(e[1]-g.z)*.45],e];
 const pts=[];for(let t=0;t<=1.001;t+=.05){const seg=t*(L.length-1),i=Math.min(L.length-2,Math.floor(seg)),fr=seg-i;const a=L[i],b=L[i+1],c=L[Math.max(0,i-1)],d=L[Math.min(L.length-1,i+2)];const cr=(p0,p1,p2,p3,t)=>.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);pts.push([cr(c[0],a[0],b[0],d[0],fr),cr(c[1],a[1],b[1],d[1],fr)])}
 pathPts.push(pts)});
const RING_R=12.5,RING_A0=0,RING_A1=360;const RING=[];for(let i=0;i<=72;i++){const a=(RING_A0+(RING_A1-RING_A0)*i/72)*Math.PI/180;RING.push([Math.cos(a)*RING_R,Math.sin(a)*RING_R])}pathPts.push(RING);
pathPts.forEach(pts=>{let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of pts){a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1])}pts.bb=[a-7,b+7,c-7,d+7]});
function pathDist(x,z){let best=1e9;for(const pts of pathPts){const bb=pts.bb;if(x<bb[0]||x>bb[1]||z<bb[2]||z>bb[3])continue;for(let i=0;i<pts.length-1;i++){const[a,b]=pts[i],[c,d]=pts[i+1];const vx=c-a,vz=d-b;let t=((x-a)*vx+(z-b)*vz)/(vx*vx+vz*vz+1e-9);t=Math.max(0,Math.min(1,t));const q=Math.hypot(x-(a+vx*t),z-(b+vz*t));if(q<best)best=q}}return best}
function duneAt(x,z){const u=(x*.17+z*.1)+(fbm(x*.035,7,z*.035)-.5)*10,s=Math.sin(u);const m=smoothstep(.38,.62,fbm(x*.02+4,3,z*.02));return (s>0?s:s*.55)*m}
function heightRaw(x,z){const r0=Math.hypot(x,z);let h=(fbm(x*.07+3,0,z*.07)-.5)*4+(fbm(x*.27,5,z*.27)-.5)*.4;
 h*=lerp(.35,1,smoothstep(8,30,r0));h+=(LOOK.on?.62:.42)*duneAt(x,z)*smoothstep(26,60,r0);
 for(const c of craters){const dx=x-c.x,dz=(z-c.z)*1.1;let r=Math.hypot(dx,dz)/c.R;if(r>1.7)continue;const an=Math.atan2(dz,dx);r*=1+c.ro*smoothstep(.45,1.05,r)*(Math.sin(an*3+c.ph)*.35+Math.sin(an*7+c.ph2)*.3+Math.sin(an*13+c.ph*2)*.2+Math.sin(an*23+c.ph2*3)*.15);
  const bowl=r<1?-c.d*(1-smoothstep(c.fl,1,r)):0;const rim=c.rim*c.d*Math.exp(-Math.pow((r-1.04)/c.w,2));const pk=c.pk?c.pk*Math.exp(-Math.pow(r/.2,2))*(.9+.1*Math.sin(an*5+c.ph)):0;h+=bowl+rim+pk}
 const pd=pathDist(x,z);h-=(LOOK.on?.3:.22)*Math.exp(-Math.pow(pd/(LOOK.on?2.6:2.1),2));
 const out=-allVal(x,z);if(out>12)h+=20*smoothstep(12,72,out)*(.8+.4*fbm(x*.03,9,z*.03));
 return h}
// flat building plateaus: terrain eases toward the centre height so machines sit level
applyLayoutZones(ZONES);
const FLATS=[];function addFlat(x,z,R){FLATS.push({x,z,R,R2:R*1.7,h:undefined})}
function heightAt(x,z){let h=heightRaw(x,z);for(let i=0;i<FLATS.length;i++){const f=FLATS[i],dx=x-f.x,dz=z-f.z;if(dx>f.R2||dx<-f.R2||dz>f.R2||dz<-f.R2)continue;const d=Math.hypot(dx,dz);if(d>=f.R2)continue;if(f.h===undefined)f.h=heightRaw(f.x,f.z);h+=(f.h-h)*(1-smoothstep(f.R,f.R2,d))}return h}
ZONES.forEach(z=>(z.pads||[]).forEach(p=>addFlat(z.x+p.x,z.z+p.z,p.gath?9:p.mill?7:6)));
addFlat(LAY.store.x,LAY.store.z,12);addFlat(LAY.uc.x,LAY.uc.z,21);for(const b of Object.values(BASE_POS)){const a=b.a*Math.PI/180;addFlat(Math.cos(a)*b.r,Math.sin(a)*b.r,6)}
const gy=heightAt;
// ---- terrain mesh ----
const TW=620,TCX=-10,TCZ=14,TS=MOBILE?360:440;
let TERR_BASE=null;const tgeo=new THREE.PlaneGeometry(TW,TW,TS,TS);tgeo.rotateX(-Math.PI/2);tgeo.translate(TCX,0,TCZ);
const ZTINT=[null,{c:'#dd8a62'},{c:'#e5995e',p:'crack'},{c:'#cf6c48',p:'band'},{c:'#ebA36a'.toLowerCase(),p:'rip'},{c:'#bb5238'},{c:'#b8503a',p:'band'},{c:'#9a4658',p:'crack'},{c:'#e29a64',p:'rip'},{c:'#8a3a30',p:'band'}];
ZTINT.forEach(t=>{if(t)t.col=col(t.c)});
{const p=tgeo.attributes.position,cc=new Float32Array(p.count*3);const base=col('#de8450'),lite=col('#f4b688'),dark=col('#b4552f'),pth=col('#f2b080'),warm=col('#d1703f'),rimC=col('#8f3a26'),t=new THREE.Color();
 const cB=col('#8a3a30'),cC=col('#a5472c'),cR=col('#f0a874'),cP=col('#c4604a');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const h=heightAt(x,z);p.setY(i,h);
  let k=fbm(x*.2,1,z*.2);t.copy(base).lerp(warm,Math.max(0,(k-.45)*2.2)).lerp(lite,Math.max(0,(fbm(x*.11+9,2,z*.11)-.5)*1.6));
  for(let zi=1;zi<ZONES.length;zi++){const zn=ZONES[zi],tn=ZTINT[zi];const v=terrS(zn,x,z);if(v<-8)continue;const w=smoothstep(-8,16,v);t.lerp(tn.col,w*.6);
   if(tn.p==='rip'){const rip=Math.sin((x*.9+z*.5)+fbm(x*.15,3,z*.15)*7);t.lerp(cR,(rip*.5+.5)*.35*w)}
   else if(tn.p==='band'){const band=Math.sin(h*7+fbm(x*.1,4,z*.1)*5);t.lerp(cB,(band*.5+.5)*.3*w)}
   else if(tn.p==='crack'){const cr=Math.abs(fbm(x*.35,6,z*.35)-.5);t.lerp(cC,(cr<.03?.45:0)*w)}}
  for(const c of craters){const r=Math.hypot(x-c.x,(z-c.z)*1.1)/c.R;if(r<1)t.lerp(dark,Math.pow(1-r,.7)*.8);else if(r<1.25)t.lerp(lite,Math.exp(-Math.pow((r-1.04)/.12,2))*.7)}
  {const dn=duneAt(x,z)*smoothstep(26,60,Math.hypot(x,z));t.lerp(col('#f6bc88'),Math.max(0,dn-.15)*.55);t.lerp(cB,Math.max(0,-dn)*.0+Math.max(0,.2-dn)*.07)}
  const pd=pathDist(x,z);t.lerp(pth,Math.max(0,1-pd/(LOOK.on?3.8:2.8))*(LOOK.on?.9:.85));
  const out=-allVal(x,z);if(out>4)t.lerp(rimC,smoothstep(4,26,out)*.8);
  t.offsetHSL(0,0,(noise3(x*3,0,z*3)-.5)*.05);{const hs={};t.getHSL(hs);t.setHSL(hs.h,Math.min(1,hs.s*1.2),hs.l*.95)}cc[i*3]=t.r;cc[i*3+1]=t.g;cc[i*3+2]=t.b}
 tgeo.setAttribute('color',new THREE.BufferAttribute(cc,3));tgeo.computeVertexNormals();}
TERR_BASE=new Float32Array(tgeo.attributes.color.array);
const terrMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95});
terrMat.onBeforeCompile=sh=>{sh.uniforms.uSoft=TERR_SOFT;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTP=position;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vTP;uniform float uSoft;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 h22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float crk(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));float d=length(g+h22(i+g)-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return d2-d1;}`).replace('#include <color_fragment>',`#include <color_fragment>
{vec2 q=vTP.xz;
 float pat=smoothstep(.64,.76,vn(q*.03+7.));float cr=crk(q*.42+vn(q*.35)*.7);float ln=1.-smoothstep(.02,.07,cr);diffuseColor.rgb*=1.-ln*pat*.28*(1.-.65*uSoft);
 float rp=sin(dot(q,vec2(.82,.57))*1.1+vn(q*.1)*9.)*.5+.5;float rm=smoothstep(.35,.75,vn(q*.018+3.));diffuseColor.rgb*=1.+(rp-.5)*.09*rm;
 float sb=sin(dot(q,vec2(.6,.8))*.17+vn(q*.011+9.)*7.)*.5+.5;float sl=smoothstep(.42,.5,sb)*(1.-smoothstep(.5,.58,sb));float sm=smoothstep(.3,.7,vn(q*.009+5.));diffuseColor.rgb*=1.-sl*.14*sm;diffuseColor.rgb*=.975+.05*smoothstep(.2,.8,sb)*sm;
 diffuseColor.rgb*=.93+(.14*vn(q*4.2)+.05*vn(q*13.))*(1.-.5*uSoft)+.035*uSoft;}`)};
const terrain=new THREE.Mesh(tgeo,terrMat);terrain.receiveShadow=true;scene.add(terrain);

// ---- dust storm walls ----
const stormTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');for(let k=0;k<7;k++){const px=40+Math.random()*48,py=40+Math.random()*48,r=26+Math.random()*26;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,7);x.fill()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
function labelTex(title,sub,w=512,h=200){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.textAlign='center';x.lineJoin='round';
 let fs=74;x.font='700 '+fs+'px Fredoka,"Trebuchet MS",system-ui,sans-serif';while(x.measureText(title).width>w-40&&fs>28){fs-=3;x.font='700 '+fs+'px Fredoka,"Trebuchet MS",system-ui,sans-serif'}x.lineWidth=14;x.strokeStyle='#40143a';x.strokeText(title,w/2,86);x.fillStyle='#ffe9dc';x.fillText(title,w/2,86);
 if(sub){x.font='700 50px Fredoka,"Trebuchet MS",system-ui,sans-serif';x.lineWidth=11;x.strokeText(sub,w/2,158);x.fillStyle='#8ff3ff';x.fillText(sub,w/2,158)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
const ffList=[];
ZONES.forEach(z=>{if(z.free)return;
 const lab=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTex(z.i+' · '+z.name.toUpperCase(),'SANDSTORM'),transparent:true,depthWrite:false,fog:false}));lab.scale.set(15,5.9,1);lab.position.set(z.x,gy(z.x,z.z)+13,z.z);scene.add(lab);
 z.ff={grp:lab,sprites:[],mat:{uniforms:{t:{value:0},k:{value:1}}},ring:{scale:{setScalar(){}},material:{opacity:1}},lab,k:1};ffList.push(z)});
function stormAnim(){}
// ---- territory: storm wall along the edge of the explored area + dust over the unknown ----
const WALLS=[];
function buildWall(){for(const g of WALLS)g.target=0;
 const grp=new THREE.Group(),sprites=[];const unl=ZONES.filter(q=>!q.i?true:(typeof S!=='undefined'&&S.unl[q.i]));
 const mk=(x,zz,h,size,op,out)=>{const m=new THREE.SpriteMaterial({map:stormTex,color:new THREE.Color().setHSL(.04+Math.random()*.02,.74,.3+Math.random()*.1),transparent:true,opacity:0,depthWrite:false,rotation:Math.random()*6.28});if(unl.some(o=>terrS(o,x,zz)>-.5))return;const s=new THREE.Sprite(m);s.position.set(x,gy(x,zz)+h,zz);s.scale.setScalar(size);s.userData={x,z:zz,h,size,o:op,ph:Math.random()*6.28,sp:.4+Math.random()*.5,rot:(Math.random()-.5)*.1,out};grp.add(s);sprites.push(s)};
 for(const q of unl)for(const l of q.lobes){const n=Math.ceil(2*Math.PI*Math.sqrt((l.a*l.a+l.b*l.b)/2)/3.6);for(let k=0;k<n;k++){const t=k/n*6.2832+(Math.random()-.5)*.03,ph=Math.atan2(Math.sin(t)*l.b,Math.cos(t)*l.a),w=wob(q,ph),r=w/Math.hypot(Math.cos(ph)/l.a,Math.sin(ph)/l.b);const x=l.x+Math.cos(ph)*r,zz=l.z+Math.sin(ph)*r;
   if(unl.some(o=>o!==q&&terrS(o,x,zz)>-1.5)||q.lobes.some(l2=>l2!==l&&lobeS(q,l2,x,zz)>-1.5))continue;let nx=Math.cos(ph)/l.a,nz=Math.sin(ph)/l.b;const nl=Math.hypot(nx,nz);nx/=nl;nz/=nl;
   const o1=9+Math.random()*2;mk(x+nx*o1,zz+nz*o1,.8+Math.random()*3,15+Math.random()*7,.85);
   const o2=11+Math.random()*4;mk(x+nx*o2,zz+nz*o2,3+Math.random()*5,15+Math.random()*8,.8);
   const o3=16+Math.random()*7;if(k%2===0)mk(x+nx*o3,zz+nz*o3,1+Math.random()*5,18+Math.random()*9,.75);
   const o4=23+Math.random()*8;if(k%3===0)mk(x+nx*o4,zz+nz*o4,2+Math.random()*7,22+Math.random()*10,.7)}}
 scene.add(grp);WALLS.push({grp,sprites,k:0,target:1})}
function wallStep(dt,t){for(let i=WALLS.length-1;i>=0;i--){const W=WALLS[i];W.k+=(W.target-W.k)*Math.min(1,dt*(W.target?1.2:2.2));if(W.target===0&&W.k<.02){scene.remove(W.grp);W.sprites.forEach(s=>s.material.dispose());WALLS.splice(i,1);continue}
  for(const s of W.sprites){const u=s.userData;s.position.x=u.x+Math.sin(t*u.sp+u.ph)*.8;s.position.y=gy(u.x,u.z)+u.h+Math.sin(t*.6+u.ph)*.5;s.material.opacity=u.o*W.k;s.material.rotation+=u.rot*.016}}}
const TERR={base:TERR_BASE,from:null,to:null,t:1,dust:col('#a05a40')};
function terrAmt(x,zz){const v=terrVal(x,zz);return 1-smoothstep(-14,2,v)}
function terrTarget(snap){const p=tgeo.attributes.position,n=p.count;if(!TERR.to){TERR.to=new Float32Array(n);TERR.from=new Float32Array(n);TERR.nt=new Float32Array(n)}
 if(snap){for(let i=0;i<n;i++)TERR.to[i]=terrAmt(p.getX(i),p.getZ(i));TERR.from.set(TERR.to);TERR.t=1;TERR.job=null;terrApply();return}
 TERR.job={i:0}}
function terrApply(){const c=tgeo.attributes.color,b=TERR.base,n=c.count,d=TERR.dust,k=TERR.t,f=TERR.from,o=TERR.to,A=c.array;
 for(let i=0;i<n;i++){const a=(f[i]+(o[i]-f[i])*k)*.9;const j=i*3;A[j]=b[j]+(d.r-b[j])*a;A[j+1]=b[j+1]+(d.g-b[j+1])*a;A[j+2]=b[j+2]+(d.b-b[j+2])*a}c.needsUpdate=true}
function terrStep(dt){const j=TERR.job;if(j){const p=tgeo.attributes.position,n=p.count,e=Math.min(n,j.i+22000);for(let i=j.i;i<e;i++)TERR.nt[i]=terrAmt(p.getX(i),p.getZ(i));j.i=e;if(e>=n){TERR.job=null;TERR.from.set(TERR.to);TERR.to.set(TERR.nt);TERR.t=0}}
 if(TERR.t<1){TERR.t=Math.min(1,TERR.t+dt*.7);terrApply()}}
function refreshTerritory(snap){applyDecor();buildWall();if(snap)WALLS.forEach(W=>W.k=1);terrTarget(snap)}

// ---- decor (instanced) ----
function scatter(baked,list){baked.children.forEach(ch=>{if(!ch.isMesh)return;const im=new THREE.InstancedMesh(ch.geometry,ch.material,list.length);list.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=im.receiveShadow=true;im.frustumCulled=false;scene.add(im)})}
const _d=new THREE.Object3D();const DK={};const PROPOBJ=[];
function spawnProp(kind,x,z,rot,sc){const b=DK[kind];if(!b)return null;const o=b.clone();o.position.set(x,gy(x,z)-.03,z);o.rotation.y=rot||0;o.scale.setScalar(sc||1);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});scene.add(o);return o}
function eraseDecor(x,z,r){for(const d of DECOR){if(!d.im)continue;const A=d.im.instanceMatrix.array,O=d.orig,n=d.im.count;let ch=0;for(let i=0;i<n;i++){const j=i*16;if(Math.hypot(O[j+12]-x,O[j+14]-z)<r&&O[j+15]!==0){for(let k=0;k<16;k++){O[j+k]=0;A[j+k]=0}ch=1}}if(ch)d.im.instanceMatrix.needsUpdate=true}}
function decorPos(n,minR,maxR,avoid){const out=[];let guard=0;while(out.length<n&&guard++<n*10){const x=-205+R()*390,z=-240+R()*510;if(Math.hypot(x,z)<minR||allVal(x,z)<2.5)continue;if(avoid&&avoid(x,z))continue;out.push([x,z])}return out}
const nearFactory=(x,z)=>Math.hypot(x-LAY.uc.x,z-LAY.uc.z)<27||Math.hypot(x,z)<5;
{ // pebbles
 const pg=new THREE.IcosahedronGeometry(1,1);const cols=['#f3b684','#e29c68','#c97c4a','#f0c492','#a35a36'];
 cols.forEach((c,k)=>{const pos=decorPos(480,0,0,nearFactory);const im=new THREE.InstancedMesh(pg,std(c,{roughness:.8}),pos.length);pos.forEach(([x,z],i)=>{const s=RR(.07,.22);_d.position.set(x,gy(x,z)+s*.3,z);_d.scale.set(s,s*.7,s);_d.rotation.y=R()*6;_d.updateMatrix();im.setMatrixAt(i,_d.matrix)});im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;scene.add(im)})}
{ // coral clumps
 for(let v=0;v<3;v++){seed=300+v;const b=bake(makeCoral());const pos=decorPos(50,6,0,nearFactory);scatter(b,pos.map(([x,z])=>{_d.position.set(x,gy(x,z)-.05,z);const s=RR(.8,1.5);_d.scale.setScalar(s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();return _d.matrix.clone()}))}}
{ // teal bushes (small mineral blobs)
 for(let v=0;v<3;v++){seed=400+v;const b=bake(makeNode(1,v+20));const pos=decorPos(0,6,0,nearFactory);scatter(b,pos.map(([x,z])=>{_d.position.set(x,gy(x,z)-.05,z);const s=RR(.25,.5);_d.scale.setScalar(s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();return _d.matrix.clone()}))}}
{ // flowers
 const fl=['#c28ae0','#7fb8f0','#f2d070','#ff8fb8'];fl.forEach((c,k)=>{const pos=decorPos(70,3,0,nearFactory);const sg=new THREE.CylinderGeometry(.015,.02,.35,5);sg.translate(0,.18,0);const bg=new THREE.SphereGeometry(.09,8,6);bg.translate(0,.4,0);const a=new THREE.InstancedMesh(sg,std('#6a8a58'),pos.length),b=new THREE.InstancedMesh(bg,std(c,{roughness:.5}),pos.length);pos.forEach(([x,z],i)=>{_d.position.set(x,gy(x,z),z);_d.scale.setScalar(RR(1,1.7));_d.rotation.set(0,0,0);_d.updateMatrix();a.setMatrixAt(i,_d.matrix);b.setMatrixAt(i,_d.matrix)});a.frustumCulled=b.frustumCulled=false;scene.add(a,b)})}

// ---- camera ----
const camT=new THREE.Vector3(0,0,6);
function layoutCam(){const asp=innerWidth/innerHeight;cam.aspect=asp;cam.fov=asp<1?36:32;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)}
addEventListener('resize',layoutCam);layoutCam();
let zoomT=1,zoomC=1;const setZoom=z=>{zoomT=Math.max(.5,Math.min(1.9,z));if(typeof S!=='undefined')S.zoom=zoomT};
function placeCam(tx,tz,snap){const asp=innerWidth/innerHeight;zoomC+=(zoomT-zoomC)*(snap?1:.2);const k=Math.min(1.5,Math.max(1,1.2/asp))*1.45*zoomC;scene.fog.near=48*k*1.05;scene.fog.far=118*k*1.05;camT.x+=(tx-camT.x)*(snap?1:.12);camT.z+=(tz-camT.z)*(snap?1:.12);const ty=gy(camT.x,camT.z)*.6;if(LOOK.on)cam.position.set(camT.x,ty+28*k*.9,camT.z+37*k*.9);else cam.position.set(camT.x,ty+35*k,camT.z+35*k);cam.lookAt(camT.x,ty,camT.z+1.5);
 sun.position.set(camT.x+SUNOFF.x,SUNOFF.y,camT.z+SUNOFF.z);sun.target.position.set(camT.x,0,camT.z)}

// drifting dust motes
const dustN=260,dustP=new Float32Array(dustN*3);for(let i=0;i<dustN;i++){dustP[i*3]=(Math.random()-.5)*70;dustP[i*3+1]=Math.random()*14;dustP[i*3+2]=(Math.random()-.5)*60}
const dustG=new THREE.BufferGeometry();dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));
const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:'#ffd9b0',size:.28,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));dust.frustumCulled=false;scene.add(dust);
function dustStep(dt,px,pz){const p=dustG.attributes.position.array,t=performance.now()*.0004;for(let i=0;i<dustN;i++){p[i*3]+=dt*(1.2+Math.sin(t+i)*.4);p[i*3+1]+=Math.sin(t*2+i)*dt*.3;if(p[i*3]>35)p[i*3]-=70}dustG.attributes.position.needsUpdate=true;dust.position.set(px,gy(px,pz)+1,pz)}

// glowing impact craters
{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const gr=x.createRadialGradient(64,64,4,64,64,62);gr.addColorStop(0,'rgba(170,255,255,.95)');gr.addColorStop(.5,'rgba(60,220,230,.8)');gr.addColorStop(1,'rgba(40,200,220,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 window.craterGlow=[];const cs=[];
 cs.forEach((cr,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(cr.R*2,cr.R*2),new THREE.MeshBasicMaterial({map:tex,color:'#30e8ff',toneMapped:false,transparent:true,opacity:.8,depthWrite:false,fog:true}));m.rotation.x=-Math.PI/2;m.position.set(cr.x,gy(cr.x,cr.z)+.25,cr.z);scene.add(m);
  const n=14,pos=new Float32Array(n*3),ph=[];for(let k=0;k<n;k++){const a=Math.random()*6.283,r=Math.random()*cr.R*.55;pos[k*3]=Math.cos(a)*r;pos[k*3+1]=Math.random()*2;pos[k*3+2]=Math.sin(a)*r;ph.push(Math.random())}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({color:'#aaffff',size:.3,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));pts.position.set(cr.x,gy(cr.x,cr.z)+.4,cr.z);pts.frustumCulled=false;scene.add(pts);craterGlow.push({m,pts,ph,n,cr})})}
function craterStep(dt){const t=performance.now()*.001;for(const c of craterGlow){c.m.material.opacity=.75+.15*Math.sin(t*1.5+c.cr.x);const p=c.pts.geometry.attributes.position.array;for(let k=0;k<c.n;k++){p[k*3+1]+=dt*(.5+c.ph[k]*.6);if(p[k*3+1]>2.6)p[k*3+1]=0}c.pts.geometry.attributes.position.needsUpdate=true}}

// debris & rubble decor (sheet 03)
{const clayMat=(c)=>clay({roughness:.85});
 const mk=(fn)=>{const g=new THREE.Group();fn(g);return bake(g)};
 seed=77;
 const mound=mk(g=>{g.add(new THREE.Mesh(blobGeo(1.2,{sy:.38,top:'#d9774a',bot:'#a8452a',amp:.14,detail:3,sd:3,off:[0,.1,0]}),clayMat()));g.add(new THREE.Mesh(blobGeo(.5,{sy:.5,top:'#e08a58',bot:'#a8452a',amp:.2,detail:2,sd:5,off:[1.1,.1,.3]}),clayMat()))});
 const dune=mk(g=>{g.add(new THREE.Mesh(blobGeo(1.5,{sy:.3,sx:1.3,top:'#f2b078',bot:'#d9774a',amp:.1,detail:3,sd:8,off:[0,.05,0]}),clayMat()))});
 const chunks=mk(g=>{for(let i=0;i<8;i++){const a=R()*6.28,d=R()*.9,s=RR(.12,.34);g.add(new THREE.Mesh(blobGeo(s,{sy:.8,top:i%3?'#c8704c':'#8a5a48',bot:'#6a3428',amp:.28,detail:1,sd:i,off:[Math.cos(a)*d,s*.4,Math.sin(a)*d]}),clayMat()))}});
 const tealPile=mk(g=>{for(let i=0;i<5;i++){const a=R()*6.28,d=R()*.8,s=RR(.2,.5);g.add(new THREE.Mesh(blobGeo(s,{sy:.8,top:'#3cc8c0',bot:'#1f6a8a',amp:.12,detail:2,sd:i,off:[Math.cos(a)*d,s*.4,Math.sin(a)*d]}),clayMat()))}});
 const place=(b,n,sMin,sMax,minR,fn)=>{const pos=decorPos(n,minR||5,0,nearFactory);scatter(b,pos.map(([x,z])=>{_d.position.set(x,gy(x,z)-.05,z);const s=RR(sMin,sMax);_d.scale.set(s,s*RR(.8,1.2),s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();return _d.matrix.clone()}))};
 DK.mound=mound;DK.chunks=chunks;DK.pile=tealPile;place(mound,150,.7,1.5);place(chunks,210,.8,1.6);place(tealPile,130,.7,1.4);
 { // dunes in the sandy regions
  const rd=mulb(88),dl=[];for(const zi of [4,8]){for(let k=0;k<(zi===4?50:80);k++){const p=zonePoint(ZONES[zi],4,rd);if(!p)continue;_d.position.set(p[0],gy(p[0],p[1])-.05,p[1]);const sc=RR(1.2,2.4);_d.scale.set(sc,sc,sc);_d.rotation.set(0,R()*6,0);_d.updateMatrix();dl.push(_d.matrix.clone())}}scatter(dune,dl)}
 { // crater rim rocks
  const rim=[];for(const c of craters){if(c.R<4.5)continue;for(let i=0;i<12;i++){const a=R()*6.28,r=c.R*RR(.95,1.12);const x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;_d.position.set(x,gy(x,z)-.05,z);const s=RR(.5,1.1);_d.scale.setScalar(s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();rim.push(_d.matrix.clone())}}scatter(chunks,rim)}
}

// ---- ground-detail props: agave, gem clusters, cairns, bones ----
{const mk=fn=>{const g=new THREE.Group();fn(g);return bake(g)};
 const place=(b,n,sMin,sMax,minR)=>{const pos=decorPos(n,minR||6,0,nearFactory);scatter(b,pos.map(([x,z])=>{_d.position.set(x,gy(x,z)-.03,z);const s=RR(sMin,sMax);_d.scale.setScalar(s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();return _d.matrix.clone()}))};
 const agaveMats=[std('#2fb0a2',{roughness:.5}),std('#1f8f98',{roughness:.5}),std('#47c9a8',{roughness:.5})];
 for(let v=0;v<2;v++){seed=800+v;const ag=mk(g=>{const n=7+v*2;for(let i=0;i<n;i++){const a=i/n*6.283+R()*.4,lean=.35+R()*.55,len=RR(.9,1.5);const bl=new THREE.Mesh(new THREE.ConeGeometry(.17,len,5),agaveMats[i%3]);bl.geometry.translate(0,len/2,0);bl.scale.z=.35;bl.position.set(Math.cos(a)*.08,.05,Math.sin(a)*.08);bl.rotation.set(Math.sin(a)*lean,-a+Math.PI/2*0,-Math.cos(a)*lean);bl.rotation.order='YXZ';bl.rotation.y=-a;bl.rotation.x=0;bl.rotation.z=0;const piv=new THREE.Group();piv.rotation.y=a;bl.rotation.set(lean,0,0);bl.position.set(0,.05,0);piv.add(bl);g.add(piv)}
  const core=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),std('#a8f0d8',{roughness:.3}));core.position.y=.12;g.add(core)});DK['agave'+v]=ag;place(ag,v?45:55,1.3,2.2)}
 {seed=850;const gem=mk(g=>{g.add(new THREE.Mesh(blobGeo(.55,{sy:.25,top:'#d9774a',bot:'#a8452a',amp:.15,detail:2,sd:4,off:[0,.05,0]}),clay({roughness:.9})));const gm=[std('#2cc4b6',{roughness:.25,metalness:.1}),std('#3ad8c8',{roughness:.25}),std('#9a7ad2',{roughness:.3})];for(let i=0;i<12;i++){const a=R()*6.283,d=Math.sqrt(R())*.55,s=RR(.05,.15);const sp=new THREE.Mesh(new THREE.IcosahedronGeometry(s,1),gm[i%5===0?2:i%2]);sp.position.set(Math.cos(a)*d,s*.8+.04,Math.sin(a)*d);g.add(sp)}});DK.gem=gem;place(gem,120,1.3,2.2,5)}
 {seed=860;const cairn=mk(g=>{const m=clay({roughness:.85});let y=0;[[.95,.55,.85,0],[.68,.45,.6,.1],[.42,.34,.4,-.08]].forEach(([w2,h2,d2,ox],i)=>{const r=new THREE.Mesh(rockGeo(w2,h2,d2,'#d9764a','#7e3622',i*3+2,{rad:.3,seg:8,amp:.14}),m);r.position.set(ox,y+h2/2-.04,0);r.rotation.y=i*.7;g.add(r);y+=h2*.82});for(let i=0;i<4;i++){const a=i*1.7,s=RR(.1,.2);const pb=new THREE.Mesh(rockGeo(s*2,s*1.4,s*1.6,'#6e7686','#363b49',i,{rad:.3,seg:6,amp:.15}),m);pb.position.set(Math.cos(a)*.75,s*.5,Math.sin(a)*.65);g.add(pb)}});DK.cairn=cairn;place(cairn,38,.9,1.5,8)}
 {const bone=mk(g=>{const bm=std('#ece0c8',{roughness:.7});for(let i=0;i<2;i++){const c=new THREE.CatmullRomCurve3([new THREE.Vector3(i*.15,.02,0),new THREE.Vector3(.35,.25+i*.1,.1),new THREE.Vector3(.75,.2,.05+i*.1),new THREE.Vector3(1.1,.02,.2)]);g.add(new THREE.Mesh(new THREE.TubeGeometry(c,12,.05-i*.01,6,false),bm))}});DK.bone=bone;place(bone,22,.8,1.4,8)}
}
// crystal patches, crater crystals, loose debris (sheet 01/02/03)
{seed=555;const mk=fn=>{const g=new THREE.Group();fn(g);return bake(g)};const cm=()=>clay({roughness:.85});
 const place=(b,list,sMin,sMax)=>scatter(b,list.map(([x,z])=>{_d.position.set(x,gy(x,z)-.02,z);const s=RR(sMin,sMax);_d.scale.setScalar(s);_d.rotation.set(0,R()*6,0);_d.updateMatrix();return _d.matrix.clone()}));
 const cry=[0,1].map(i=>{seed=600+i;return mk(g=>g.add(makeCrystal(1,i+30,3+i*2)))});
 const inZones=(ids,n)=>{const out=[],rd=mulb(99);for(let k=0;k<n;k++){const p=zonePoint(ZONES[ids[k%ids.length]],3,rd);if(p)out.push(p)}return out};
 
 // crystals inside glowing craters
 const inCr=[];for(const c of craters){if(c.R<5.5)continue;const n=1+Math.floor(R()*3);for(let i=0;i<n;i++){const a=R()*6.28,r=R()*c.R*.4;inCr.push([c.x+Math.cos(a)*r,c.z+Math.sin(a)*r])}}
 
 // loose debris
 const scrap=mk(g=>{g.add(new THREE.Mesh(blobGeo(1,{sy:.25,top:'#d9774a',bot:'#a8452a',amp:.12,detail:2,sd:2,off:[0,.1,0]}),cm()));const m=std('#4a4650',{roughness:.7});for(const [x,z,ry,w] of [[.2,.1,.6,.9],[-.4,-.2,-.4,.7],[.5,-.4,1.2,.6]]){const b=rbox(w,.08,.4,.03,m,2);b.position.set(x,.35,z);b.rotation.set(R()*.4,ry,R()*.4);g.add(b)}});
 const peb=mk(g=>{for(let i=0;i<12;i++){const a=R()*6.28,d=R()*1.4,s=RR(.06,.17);g.add(new THREE.Mesh(blobGeo(s,{sy:.75,top:['#f3b684','#c97c4a','#3cc8c0','#a35a36'][i%4],bot:'#7a3a2a',amp:.15,detail:1,sd:i,off:[Math.cos(a)*d,s*.35,Math.sin(a)*d]}),cm()))}});
 const shard=mk(g=>{g.add(makeCrystal(.22,5,2));for(let i=0;i<4;i++){const a=R()*6.28,s=RR(.1,.22);g.add(new THREE.Mesh(blobGeo(s,{sy:.7,top:'#c8704c',bot:'#6a3428',amp:.25,detail:1,sd:i,off:[Math.cos(a)*.6,s*.3,Math.sin(a)*.6]}),cm()))}});
 DK.scrap=scrap;DK.peb=peb;DK.shard=shard;window.__clus=[];if(LOOK.on){seed=7070;const sp=decorPos(26,16,0,nearFactory),kd=['pile','mound','chunks','peb'];sp.forEach(([x,z],i)=>{window.__clus.push([x,z]);const g=new THREE.Group();const cr=cry[i%2].clone();cr.scale.setScalar(RR(1.3,1.9));g.add(cr);
  for(let k=0;k<4;k++){const b=DK[kd[(i+k)%4]].clone();const a=k*1.6+R(),d=RR(1.6,2.6);b.position.set(Math.cos(a)*d,0,Math.sin(a)*d);b.scale.setScalar(RR(.6,1));b.rotation.y=R()*6;g.add(b)}
  g.position.set(x,gy(x,z)-.03,z);g.rotation.y=R()*6;g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});scene.add(g)})}
 DK.scrap=scrap;DK.peb=peb;DK.shard=shard;place(scrap,decorPos(60,8,0,nearFactory),.8,1.3);place(peb,decorPos(250,3,0,nearFactory),.8,1.5);
}

// ---- ground reference extras: glowing cables, layered sandstone cliffs ----
{const mk=fn=>{const g=new THREE.Group();fn(g);return bake(g)};
 const place=(b,list,sMin,sMax,sink,ry)=>scatter(b,list.map(([x,z,r2])=>{_d.position.set(x,gy(x,z)-(sink||.04),z);const s=RR(sMin,sMax);_d.scale.setScalar(s);_d.rotation.set(0,r2!==undefined?r2:R()*6.28,0);_d.updateMatrix();return _d.matrix.clone()}));
 // glowing blue cables (lie on the ground, bright cyan strip on top)
 const glowM=new THREE.MeshStandardMaterial({color:'#9ff8ff',emissive:'#2fd8ff',emissiveIntensity:1.5,roughness:.3});
 for(let v=0;v<2;v++){seed=900+v;const cab=mk(g=>{const dk=std(v?'#2c3279':'#38409a',{roughness:.45});const pts=(o,y)=>new THREE.CatmullRomCurve3([[-3.4,0,0],[-1.7,0,.9+o],[0,0,-.5+o],[1.8,0,.5+o],[3.5,0,-.1]].map(([x,yy,z],i)=>new THREE.Vector3(x,y+(i%2?.05:0),z)));
   g.add(new THREE.Mesh(new THREE.TubeGeometry(pts(0,.16),40,.15,8),dk));g.add(new THREE.Mesh(new THREE.TubeGeometry(pts(.28,.14),40,.12,8),std('#232860',{roughness:.5})));
   const gl=new THREE.CatmullRomCurve3(pts(.1,.3).getPoints(40).map(q=>new THREE.Vector3(q.x,q.y+.02,q.z+.02)));g.add(new THREE.Mesh(new THREE.TubeGeometry(gl,40,.055,6),glowM));
   const clip=std('#8e97a8',{roughness:.6});for(const t of [.3,.62]){const q=pts(0,.16).getPoint(t);const c=new THREE.Mesh(new THREE.BoxGeometry(.3,.34,.55),clip);c.position.set(q.x,q.y+.02,q.z+.12);g.add(c)}});
  const pos=decorPos(v?14:18,12,0,nearFactory);place(cab,pos,1,1.7,.08)}
 // continuous layered sandstone canyon walls along the outer edge (valley feel)
 const CL=['#e0905e','#c26a42','#eba878','#a85438','#d27a4c','#f2bc8a'];
 const walls=[0,1,2].map(v=>{seed=950+v;return mk(g=>{const m=clay({roughness:.92});let y=0;const n=5;for(let i=0;i<n;i++){const w=RR(9.5,11)*(1-i*.05),h=RR(.9,1.5),d=RR(3.2,4.2)*(1-i*.09);const a=CL[(i+v)%CL.length],b2=CL[(i+v+2)%CL.length];
   const sl=new THREE.Mesh(slabGeo(w,h,d,.4,a,b2,seed*7+i,{amp:.14,streak:.3,seg:3}),m);sl.position.set(RR(-.6,.6),y+h/2,RR(-.3,.3)+i*.12);sl.rotation.y=RR(-.06,.06);g.add(sl);y+=h*.86}})});
 {const pts=[],rd=mulb(2024);const G=3;for(let x=-215;x<=215;x+=G)for(let z=-250;z<=265;z+=G){const v=allVal(x,z);if(v<2.8||v>4.6||Math.hypot(x,z)<28)continue;pts.push([x+(rd()-.5)*G,z+(rd()-.5)*G])}
  const keep=[];for(const q of pts){if(keep.every(k=>Math.hypot(k[0]-q[0],k[1]-q[1])>5.2))keep.push(q)}
  const list=keep.map(([x,z])=>{const e=1.5,gx=allVal(x+e,z)-allVal(x-e,z),gz=allVal(x,z+e)-allVal(x,z-e);return [x,z,Math.atan2(gz,gx)]});
  walls.forEach((cb,k)=>{const L=list.filter((_,i)=>i%3===k);scatter(cb,L.map(([x,z,a])=>{_d.position.set(x,gy(x,z)-.25,z);_d.scale.set(RR(.95,1.15),RR(1.3,2.3),RR(1.3,1.7));_d.rotation.set(0,-(a+Math.PI/2),0);_d.updateMatrix();return _d.matrix.clone()}))});window.__cliffN=list.length}
}

// registry of scenery that is hidden until its area is explored
const DECOR=[];scene.children.forEach(o=>{if(o===terrain||o.isLight||o.isSprite||o.isPoints||!(o.isMesh||o.isGroup))return;if(o.isInstancedMesh)DECOR.push({im:o,orig:o.instanceMatrix.array.slice()});else DECOR.push({o})});
for(const a of (LAY.decorDel||[]))eraseDecor(a[0],a[1],a[2]);
let BELTPTS=[];const beltNear=(x,z)=>{for(let i=0;i<BELTPTS.length;i++){const q=BELTPTS[i];if(Math.abs(q.x-x)<2.3&&Math.abs(q.z-z)<2.3&&Math.hypot(q.x-x,q.z-z)<2.3)return true}return false};
function applyDecor(){for(const d of DECOR){if(d.im){const A=d.im.instanceMatrix.array,O=d.orig,n=d.im.count;for(let i=0;i<n;i++){const j=i*16;if(terrVal(O[j+12],O[j+14])>-1&&!beltNear(O[j+12],O[j+14])){for(let k=0;k<16;k++)A[j+k]=O[j+k]}else{for(let k=0;k<11;k++)A[j+k]=0;A[j+12]=O[j+12];A[j+13]=O[j+13];A[j+14]=O[j+14]}}d.im.instanceMatrix.needsUpdate=true}else d.o.visible=terrVal(d.o.position.x,d.o.position.z)>-1&&!beltNear(d.o.position.x,d.o.position.z)}}

// ---- tyre tracks along the paths ----
{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.clearRect(0,0,64,64);x.fillStyle='rgba(255,255,255,1)';for(let i=0;i<4;i++){x.beginPath();x.moveTo(8,i*16+2);x.lineTo(32,i*16+9);x.lineTo(56,i*16+2);x.lineTo(56,i*16+7);x.lineTo(32,i*16+14);x.lineTo(8,i*16+7);x.closePath();x.fill()}
 const tex=new THREE.CanvasTexture(c);tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const tm=new THREE.MeshBasicMaterial({map:tex,color:'#7a3220',transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,fog:true});
 const trackGroup=new THREE.Group();
 for(const pts of pathPts){if(pts===RING)continue;
  const L=[];for(let i=0;i<pts.length-1;i++){const [a,b]=pts[i],[c2,d]=pts[i+1];const n=Math.max(1,Math.ceil(Math.hypot(c2-a,d-b)/1.0));for(let k=0;k<n;k++)L.push([a+(c2-a)*k/n,b+(d-b)*k/n])}L.push(pts[pts.length-1]);
  for(const off of [-.95,.95]){const pos=[],uv=[],idx=[];let len=0;for(let i=0;i<L.length;i++){const p=L[i],q=L[Math.min(L.length-1,i+1)],o=L[Math.max(0,i-1)];let dx=q[0]-o[0],dz=q[1]-o[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const nx=-dz,nz=dx;const wob=Math.sin(i*.37+off*3)*.18;for(const sd of [-1,1]){const px=p[0]+nx*(off+wob+sd*.28),pz=p[1]+nz*(off+wob+sd*.28);pos.push(px,heightAt(px,pz)+.05,pz);uv.push(sd<0?0:1,len/1.4)}if(i>0){const dd=Math.hypot(p[0]-L[i-1][0],p[1]-L[i-1][1]);len+=dd}
    if(i<L.length-1){const b2=i*2;idx.push(b2,b2+1,b2+2,b2+1,b2+3,b2+2)}}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);trackGroup.add(new THREE.Mesh(g,tm))}}
 scene.add(trackGroup)}
