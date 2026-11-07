// utils
let seed=7;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;const RR=(a,b)=>a+R()*(b-a);
const hash=(x,y,z)=>{let h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)};
const sm=t=>t*t*(3-2*t);
function noise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=sm(x-xi),yf=sm(y-yi),zf=sm(z-zi);let r=0;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){r+=hash(xi+a,yi+b,zi+c)*(a?xf:1-xf)*(b?yf:1-yf)*(c?zf:1-zf)}return r}
const fbm=(x,y,z)=>noise3(x,y,z)*.6+noise3(x*2.1,y*2.1,z*2.1)*.3+noise3(x*4.3,y*4.3,z*4.3)*.1;
const col=c=>new THREE.Color(c);
function merge(geos){let n=0;const gs=geos.map(g=>g.index?g.toNonIndexed():g);gs.forEach(g=>n+=g.attributes.position.count);
 const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3),hasUV=gs.every(g=>g.attributes.uv),U=hasUV?new Float32Array(n*2):null;let o=0;
 for(const g of gs){P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);if(hasUV){const a=g.attributes.uv;for(let k=0;k<a.count;k++){U[(o+k)*2]=a.getX(k);U[(o+k)*2+1]=a.getY(k)}}if(g.attributes.color)C.set(g.attributes.color.array,o*3);else C.fill(1,o*3,(o+g.attributes.position.count)*3);o+=g.attributes.position.count}
 const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('color',new THREE.BufferAttribute(C,3));if(hasUV)m.setAttribute('uv',new THREE.BufferAttribute(U,2));return m}
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

// ---- bake: flatten a Group into a few merged meshes (shared materials) ----
const _bmats={};
function bakeMat(key,rough,metal){return _bmats[key]||(_bmats[key]=new THREE.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal}))}
function bake(root){
 root.updateMatrixWorld(true);const inv=new THREE.Matrix4();
 const buckets=new Map();const out=new THREE.Group();const tmp=new THREE.Matrix4();
 root.traverse(o=>{
  if(o.isSprite){const s=o.clone();tmp.multiplyMatrices(inv,o.matrixWorld);s.position.setFromMatrixPosition(tmp);s.scale.multiplyScalar(new THREE.Vector3().setFromMatrixScale(tmp).x);out.add(s);return}
  if(!o.isMesh)return;const m=o.material;let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();
  tmp.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(tmp);
  const n=g.attributes.position.count;let key,mat,cast=true;
  const hasC=!!g.attributes.color;
  const fillC=(mul)=>{const c=new Float32Array(n*3);const src=hasC?g.attributes.color.array:null;for(let i=0;i<n;i++){c[i*3]=(src?src[i*3]:1)*mul.r;c[i*3+1]=(src?src[i*3+1]:1)*mul.g;c[i*3+2]=(src?src[i*3+2]:1)*mul.b}g.setAttribute('color',new THREE.BufferAttribute(c,3))};
  if(m.isMeshBasicMaterial&&!m.transparent){key='basic';mat=bakeMat('basic',1,0);mat=mat.userData.b||(mat.userData.b=new THREE.MeshBasicMaterial({vertexColors:true}));cast=false;fillC(m.color)}
  else if(m.transparent){key='tr'+m.uuid;mat=m;cast=false;if(g.attributes.color)g.deleteAttribute('color')}
  else if(m.map){key='tx'+m.uuid;mat=m;if(g.attributes.color)g.deleteAttribute('color')}
  else if(m.emissive&&m.emissive.getHex()!==0&&m.emissiveIntensity>0){key='em'+m.uuid;mat=m;if(g.attributes.color&&!m.vertexColors)g.deleteAttribute('color')}
  else{const r=Math.round((m.roughness??.6)*3);const mt=(m.metalness||0)>.12;key='std'+r+mt;mat=bakeMat(key,r/3,mt?.25:0);fillC(m.color||new THREE.Color(1,1,1))}
  if(!buckets.has(key))buckets.set(key,{mat,cast,geos:[]});buckets.get(key).geos.push(g)});
 for(const b of buckets.values()){const geo=merge(b.geos);const mesh=new THREE.Mesh(geo,b.mat);mesh.castShadow=b.cast;mesh.receiveShadow=b.cast;out.add(mesh)}
 return out}
function smoothstep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function lerp(a,b,t){return a+(b-a)*t}

// old factory goods -> raw materials and mill goods
function convCost(g){const o={};const add=(k,n)=>{o[k]=(o[k]||0)+n};for(const k in g){const n=g[k];
 if(k==='brick')add('slab',n);else if(k==='plate')add('plank',n);else if(k==='circuit')add('ore',2*n);else if(k==='cell')add('crystal',2*n);
 else if(k==='module'){add('plank',2*n);add('slab',n)}else if(k==='core'){add('crystal',3*n);add('ore',3*n)}else add(k,n)}return o}

// ---- raw log look (sheet): grey bark with a glowing teal end-grain ----
const LOGTEX=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#1c9a9a';x.fillRect(0,0,128,128);for(let i=0;i<7;i++){x.strokeStyle=i%2?'#a6fff4':'#36d6d0';x.lineWidth=5;x.beginPath();x.arc(64,64,6+i*8.6,0,6.3);x.stroke()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
const LOGRING=new THREE.MeshStandardMaterial({map:LOGTEX,roughness:.5,emissive:'#12a8a4',emissiveMap:LOGTEX,emissiveIntensity:.55});
const LOGMATS=[new THREE.MeshStandardMaterial({color:'#62646c',roughness:.95,flatShading:true}),LOGRING,LOGRING];
function barkGeo(rt,rb,h,seg=14){const g=new THREE.CylinderGeometry(rt,rb,h,seg,4);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);if(r<Math.max(rt,rb)*.2)continue;const a=Math.atan2(z,x),n=1+.07*Math.sin(y*9/Math.max(.6,h*.4)+a*5)+.05*Math.sin(a*11+y*3);p.setX(i,x*n);p.setZ(i,z*n)}g.computeVertexNormals();return g}
