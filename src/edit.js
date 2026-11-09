// ================= EDIT MODE: drag buildings to where you want them =================
(function(){
const ED=JSON.parse(JSON.stringify({uc:LAY.uc,store:LAY.store,sell:LAY.sell,pads:LAY.pads}));let nodesDirty=!!LAY.nodes;
let H=[],sel=null,drag=null,marks=[],panel=null;
const rd=v=>Math.round(v*2)/2;
const gpt=(cx,cy)=>{_p2.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(_p2,cam);const o=ray.ray.origin,d=ray.ray.direction;let t=(gy(P.x,P.z)-o.y)/d.y;let x=0,z=0;for(let i=0;i<5;i++){x=o.x+d.x*t;z=o.z+d.z*t;t=(gy(x,z)-o.y)/d.y}return{x:o.x+d.x*t,z:o.z+d.z*t}};
const shift=(o,dx,dz,ox,oz)=>{if(!o)return;const ny=o.position.y+gy(ox+dx,oz+dz)-gy(ox,oz);o.position.set(o.position.x+dx,ny,o.position.z+dz)};
function nodeHandle(n,i){const d={x:n.x,z:n.z,h:0},nm={tree:'Boom',stone:'Steen',ore:'Erts',crystal:'Kristal'}[n.type]||n.type;
  const h={key:'n:'+i,node:1,n,i,name:nm+(n.kind?' ('+n.kind+')':'')+' #'+i,rad:Math.max(1.8,n.r*1.1),col:{tree:'#9affc8',stone:'#ffb08a',ore:'#b49aff',crystal:'#8fe8ff'}[n.type]||'#fff',get:()=>d,
   set(x,z){const ox=d.x,oz=d.z,dx=x-ox,dz=z-oz;d.x=x;d.z=z;const a=ED.nodes[i];a[2]=x;a[3]=z;nodesDirty=true;n.x=x;n.z=z;n.y=gy(x,z);for(const o of [n.obj,n.stump,n.cur,n.rub])if(o)o.position.set(o.position.x+dx,o.position.y+gy(x,z)-gy(ox,oz),o.position.z+dz)}};
  H.push(h);return h}
function mkMark(h){const mat=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
 const g=new THREE.Group();const r=new THREE.Mesh(new THREE.RingGeometry(h.rad*.9,h.rad,48),mat(h.col));const f=new THREE.Mesh(new THREE.CircleGeometry(h.rad*.9,48),mat(h.col));f.material.opacity=.12;[r,f].forEach(m=>{m.rotation.x=-Math.PI/2;m.renderOrder=30;g.add(m)});g.userData={r,f};scene.add(g);h.mk=g;marks.push(g)}
function addNode(type,kind){const x=rd(P.x+Math.sin(P.face)*4),z=rd(P.z+Math.cos(P.face)*4),zi=Math.max(0,ownerOf(x,z));const raw=1;
 const n=spawnNode(type,kind,x,z,raw,zi,0);n.t=-1e9;const i=nodes.length-1;ED.nodes[i]=[type,kind,x,z,raw,n.v||0,zi];nodesDirty=true;const h=nodeHandle(n,i);mkMark(h);sel=h;refresh()}
function delNode(){if(!sel||!sel.node)return;const n=sel.n;n.alive=false;n.t=-1e9;n.respawnIn=1e12;for(const o of [n.obj,n.stump,n.cur,n.rub])if(o){o.visible=false;scene.remove(o)}n.cur=null;ED.nodes[sel.i]=null;nodesDirty=true;scene.remove(sel.mk);const k=H.indexOf(sel);if(k>=0)H.splice(k,1);sel=null;refresh()}
function build(){H=[];
 H.push({key:'uc',name:'Upgrade Center',rad:11,col:'#7ff0ff',rot:1,get:()=>ED.uc,set(x,z){ED.uc.x=x;ED.uc.z=z;const f=props.fac;f.position.set(x,gy(x,z)+(ED.uc.h||0),z);f.rotation.y=ED.uc.r}});
 H.push({key:'store',name:'Log Storage',rad:6,col:'#ffd24a',get:()=>ED.store,set(x,z){ED.store.x=x;ED.store.z=z;for(const o of [props.fac2,props.fac2g])o&&o.position.set(x,gy(x,z)+(ED.store.h||0)+(o===props.fac2g?.2:0),z);if(props.fac2l)props.fac2l.position.set(x,gy(x,z)+10.5,z)}});
 H.push({key:'sell',name:'Sell pad',rad:2.6,col:'#8fff8f',get:()=>ED.sell,set(x,z){ED.sell.x=x;ED.sell.z=z;props.sell.position.set(x,gy(x,z)+.2+(ED.sell.h||0),z)}});
 PADS.forEach(p=>{const kind=p.gath?'wood gatherer':p.mill?(p.k==='stone'?'slab press':'sawmill'):p.k==='wood'?'harvester':'drill ('+p.k+')';
  H.push({key:'pad:'+p.id,name:'Zone '+p.zone+' '+kind,rad:p.gath?6:5,col:p.mill?'#ffd24a':({wood:'#9affc8',stone:'#ffb08a',ore:'#b49aff'}[p.k]||'#fff'),
   get:()=>ED.pads[p.id]||(ED.pads[p.id]={x:p.x,z:p.z,h:p.h||0}),set(x,z){const c=ED.pads[p.id]||(ED.pads[p.id]={x:p.x,z:p.z,h:p.h||0}),dx=x-c.x,dz=z-c.z,h=c.h||0;c.x=x;c.z=z;p.y=gy(x,z)+h;for(const o of [p.ring,p.ghost])o&&o.position.set(o.position.x+dx,p.y+.2,o.position.z+dz);if(p.obj)p.obj.position.set(p.obj.position.x+dx,p.y,p.obj.position.z+dz)}})});
 ED.nodes=nodes.map(n=>[n.type,n.kind,+n.x.toFixed(2),+n.z.toFixed(2),+(n.sc/1.35/(n.type==='stone'?.96:1)).toFixed(3),n.v||0,n.zone]);
 nodes.forEach((n,i)=>nodeHandle(n,i));
 H.forEach(mkMark);}
function place(h){const c=h.get();h.mk.position.set(c.x,gy(c.x,c.z)+.5+(c.h||0),c.z)}
function refresh(){H.forEach(h=>{place(h);const on=h===sel;h.mk.userData.r.material.opacity=on?1:.55;h.mk.userData.f.material.opacity=on?.3:.08;h.mk.scale.setScalar(on?1.04:1)});
 if(panel){panel.querySelector('#edn').textContent=sel?sel.name+'  ('+sel.get().x+', '+sel.get().z+', hoogte '+(sel.get().h||0)+')':'Tik op een ring en sleep';panel.querySelector('#edrot').style.display=sel&&sel.rot?'inline-flex':'none';const s=panel.querySelector('select');if(sel)s.value=sel.key}}
const json=()=>JSON.stringify(Object.assign({uc:ED.uc,store:ED.store,sell:ED.sell,pads:ED.pads},nodesDirty?{nodes:ED.nodes.filter(Boolean)}:{}));
function pick(x,z){let b=null,br=1e9,bd=1e9;for(const h of H){const c=h.get(),d=Math.hypot(x-c.x,z-c.z),r=h.node?Math.max(h.rad,2.2):Math.max(h.rad,3);if(d<r&&(h.rad<br||(h.rad===br&&d<bd))){br=h.rad;bd=d;b=h}}return b}
function onDown(e){if(!EDIT.on)return;const g=gpt(e.clientX,e.clientY);const h=pick(g.x,g.z);if(!h)return;e.stopImmediatePropagation();e.preventDefault();sel=h;const c=h.get();drag={id:e.pointerId,ox:c.x-g.x,oz:c.z-g.z};glc.setPointerCapture&&glc.setPointerCapture(e.pointerId);refresh()}
function onMove(e){if(!EDIT.on||!drag||e.pointerId!==drag.id)return;e.stopImmediatePropagation();const g=gpt(e.clientX,e.clientY);sel.set(rd(g.x+drag.ox),rd(g.z+drag.oz));refresh()}
function onUp(e){if(!drag||e.pointerId!==drag.id)return;e.stopImmediatePropagation();drag=null}
glc.addEventListener('pointerdown',onDown,true);glc.addEventListener('pointermove',onMove,true);glc.addEventListener('pointerup',onUp,true);glc.addEventListener('pointercancel',onUp,true);
function leave(){location.reload()}
function enter(){if(EDIT.on)return;EDIT.on=1;build();sel=H[0];
 panel=document.createElement('div');panel.id='editp';
 panel.style.cssText='position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;width:min(94vw,520px);background:rgba(40,16,24,.92);color:#fff;border:2px solid #ffd24a;border-radius:14px;padding:10px 12px;font:600 13px Fredoka,system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;pointer-events:auto';
 const bs='background:#ffd24a;color:#40143a;border:0;border-radius:9px;padding:7px 11px;font:700 13px Fredoka,system-ui,sans-serif;cursor:pointer';
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>VRIJ PLAATSEN</b><span id="edn" style="opacity:.9;text-align:right;min-width:0"></span></div>'
 +'<div style="opacity:.8">Sleep een gekleurde ring over de grond (ook elke boom, steen, erts en kristal). Lopen en zoomen werkt gewoon (buiten de ringen).</div>'
 +'<div style="display:flex;gap:6px;flex-wrap:wrap"><select style="flex:1;min-width:140px;border-radius:9px;padding:6px;font:600 13px Fredoka,system-ui,sans-serif"></select><button id="edgo" style="'+bs+'">Ga erheen</button><button id="edme" style="'+bs+'">Zet op mijn plek</button></div>'
 +'<div style="display:flex;gap:6px;flex-wrap:wrap"><button id="edup" style="'+bs+'">▲ hoger</button><button id="eddn" style="'+bs+'">▼ lager</button><span id="edrot" style="display:none;gap:6px"><button id="edl" style="'+bs+'">⟲ 15°</button><button id="edr" style="'+bs+'">⟳ 15°</button></span><button id="edsv" style="'+bs+'">Opslaan</button><button id="edex" style="'+bs+'">Exporteer</button><button id="edrs" style="'+bs+';background:#ff9a6a">Reset alles</button><button id="edx" style="'+bs+';background:#ddd">Sluiten</button></div>'
 +'<div style="display:flex;gap:6px;flex-wrap:wrap"><select id="edty" style="flex:1;min-width:120px;border-radius:9px;padding:6px;font:600 13px Fredoka,system-ui,sans-serif"><option value="tree:teal">Boom (groen)</option><option value="tree:deep">Boom (deep)</option><option value="tree:blue">Boom (blauw)</option><option value="stone:">Steen</option><option value="ore:">Erts</option><option value="crystal:">Kristal</option></select><button id="edadd" style="'+bs+'">+ Plaats</button><button id="eddel" style="'+bs+';background:#ff9a6a">Verwijder</button></div>'
 +'<textarea id="edta" readonly style="display:none;height:70px;border-radius:8px;font:11px monospace"></textarea>';
 document.body.appendChild(panel);
 const s=panel.querySelector('select');H.filter(h=>!h.node).forEach(h=>{const o=document.createElement('option');o.value=h.key;o.textContent=h.name;s.appendChild(o)});
 const q=id=>panel.querySelector('#'+id);
 s.onchange=()=>{sel=H.find(h=>h.key===s.value);refresh()};
 q('edgo').onclick=()=>{const c=sel.get();P.x=c.x;P.z=c.z+Math.max(9,sel.rad+3);P.moveTo=null;P.vx=P.vz=0;refresh()};
 q('edme').onclick=()=>{sel.set(rd(P.x),rd(P.z));refresh()};
 const rot=d=>{if(sel&&sel.rot){ED.uc.r=+(ED.uc.r+d).toFixed(3);sel.set(ED.uc.x,ED.uc.z);refresh()}};
 const hgt=d=>{const c=sel.get();c.h=+((c.h||0)+d).toFixed(2);sel.set(c.x,c.z);refresh()};q('edup').onclick=()=>hgt(.5);q('eddn').onclick=()=>hgt(-.5);
 q('edl').onclick=()=>rot(-Math.PI/12);q('edr').onclick=()=>rot(Math.PI/12);
 q('edsv').onclick=()=>{try{localStorage.setItem(LAYOUT_KEY,json())}catch(e){}leave()};
 q('edex').onclick=()=>{const t=q('edta');t.style.display='block';t.value=json();t.select();try{navigator.clipboard.writeText(t.value).catch(()=>{})}catch(e){}};
 q('edrs').onclick=()=>{try{localStorage.removeItem(LAYOUT_KEY)}catch(e){}leave()};
 q('edx').onclick=leave;
 q('edadd').onclick=()=>{const [t,k]=q('edty').value.split(':');addNode(t,k)};q('eddel').onclick=delNode;
 refresh()}
window.__edit={enter,ED,H:()=>H};
const b=document.createElement('button');b.id='editb';b.textContent='✥';b.title='Plaatsen (edit mode)';b.style.cssText='position:fixed;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));z-index:40;width:38px;height:38px;border-radius:50%;border:2px solid #fff8;background:rgba(40,16,24,.7);color:#fff;font-size:18px;cursor:pointer';
b.onpointerdown=e=>{e.stopPropagation();e.preventDefault();enter()};document.body.appendChild(b);
if(/[?&]edit\b/.test(location.search))setTimeout(enter,800);
})();
