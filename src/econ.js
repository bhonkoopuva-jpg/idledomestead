// ================= PRODUCTION CHAIN: goods, belts, power =================
const GOODS={
 brick:{n:'Brick',in:{stone:3},v:22,tier:1,col:'#d98a64'},
 plate:{n:'Steel Plate',in:{wood:2,stone:1},v:14,tier:1,col:'#c9d0dc'},
 circuit:{n:'Circuit',in:{ore:2,stone:1},v:34,tier:1,col:'#58ecff'},
 cell:{n:'Power Cell',in:{ore:3,wood:1},v:58,tier:1,col:'#7aa8ff'},
 module:{n:'Machine Module',in:{plate:2,circuit:1},v:100,tier:2,col:'#ffd35a'},
 core:{n:'Quantum Core',in:{circuit:2,cell:1},v:210,tier:2,col:'#ff9ae8'},
 plank:{n:'Plank',in:{wood:2},v:10,tier:1,col:'#2fc4c0',mill:1},
 slab:{n:'Stone Slab',in:{stone:2},v:14,tier:1,col:'#9aa0aa',mill:1},
 stick:{n:'Stick',in:{wood:2},v:12,tier:1,col:'#c98f5a',mill:1}};
const GKEYS=Object.keys(GOODS);for(const k of GKEYS){lootGeo[k]=new THREE.BoxGeometry(.5,.34,.5);lootMat[k]=std(GOODS[k].col,{roughness:.6})}
const MILLS={stick:{n:'Stick Lathe',out:'stick',need:2,base:900,rate:.55,g:{plank:8,slab:4}},wood:{n:'Plank Mill',out:'plank',need:2,base:400,rate:.5,g:{wood:20,stone:10}},stone:{n:'Slab Press',out:'slab',need:2,base:650,rate:.5,g:{plank:6,stone:12}}};
const mkOf=p=>p.mill?MILLS[p.k]:MK[p.k];
const GCARRY=6,GBUF=20,GCAP=100,MBUF=10,BSPEED=3.6,BELT_COST=3;
const beltRate=()=>1.5+.75*S.up.belt;
const finCap=()=>30+20*S.up.fbuf;
const craftRate=()=>.25+.12*S.up.fthru;
const haveOf=k=>k==='coins'?S.coins:(GOODS[k]?S.goods[k]:S.inv[k]);
const canPay=c=>{for(const k in c)if(haveOf(k)<c[k])return false;return true};
const payCost=c=>{for(const k in c){if(k==='coins')S.coins-=c[k];else if(GOODS[k])S.goods[k]-=c[k];else S.inv[k]-=c[k]}};
const costText=c=>Object.keys(c).map(k=>fmtC(c[k])+' '+(k==='coins'?'coins':(GOODS[k]?GOODS[k].n:RNAME[k]).toLowerCase())).join(' · ');
const goodsOnly=c=>{const o={};for(const k in c)if(GOODS[k])o[k]=c[k];return o};
const ECON={items:[],dead:[],events:[],feedAcc:0,transit:{wood:0,stone:0,ore:0,crystal:0,plank:0,slab:0,stick:0},busy:false,waiting:'',sellT:0,craftT:0};
function ensureEcon(){S.goods=Object.assign({brick:0,plate:0,circuit:0,cell:0,module:0,core:0,plank:0,slab:0,stick:0},S.goods);const f=S.fac=S.fac||{};f.off=f.off||{};f.q=f.q||{};for(const k of ['brick','plate','circuit','cell','module','core'])if(f.q[k]===undefined)f.q[k]=0;f.in=Object.assign({wood:0,stone:0,ore:0,crystal:0},f.in);f.made=Object.assign({brick:0,plate:0,circuit:0,cell:0,module:0,core:0,plank:0,slab:0,stick:0},f.made);f.prog=f.prog||0;f.rr=f.rr||0;f.adv=f.adv||0;f.jobs=f.jobs||[];S.links=S.links||{};S.feeder=S.feeder||0;S.stats.crafted=S.stats.crafted||0}
// ---- power ----
const powSupply=()=>12+14*bl('solar')*(typeof EV!=='undefined'&&EV.storm>0?.5:1)+60*bl('reactor');
function powDemand(){let d=8+(S.fac.adv?6:0);for(const p of PADS){const l=machLv(p);if(l)d+=2+l}return d+1.5*S.drones}
const powSat=()=>Math.max(.2,Math.min(1,powSupply()/powDemand()));
// ---- belt segments ----
const SEG={};
const FAC2={id:'FAC2',fixed:1,k:'wood',mill:0,zone:1,x:FACT2.x,z:FACT2.z,y:gy(FACT2.x,FACT2.z),in:0,acc:0,buf:0,work:0,near:false};const FAC2CAP=200;const f2cap=()=>FAC2CAP+100*((S.f2cl)||0),F2MAXL=6,f2upCost=()=>Math.round(300*Math.pow(1.7,(S.f2cl)||0));
const MCAP0=20,MCAPMAXL=6,mcl=p=>(S.mcl&&S.mcl[p.id])||0,mcap=p=>p.mill?MCAP0+10*mcl(p):MBUF,mcapCost=p=>Math.round(MILLS[p.k].base*.35*Math.pow(1.6,mcl(p)));
const FAC2B={id:'FAC2b',fixed:1,k:'stick',x:FACT2.x,z:FACT2.z,y:FAC2.y,near:false};const isF2=p=>p===FAC2||p===FAC2B;
function padById(id){return id==='FAC2'?FAC2:id==='FAC2b'?FAC2B:PADS.find(p=>p.id===id)}
function intakePoint(from,t){const F0=termPos(t||'F'),dx=from.x-F0.x,dz=from.z-F0.z,l=Math.hypot(dx,dz)||1;return{x:F0.x+dx/l*7.8,z:F0.z+dz/l*5.7}}
const isT=t=>t==='F'||t==='F2';const termPos=t=>t==='F2'?FACT2:FACT;
// junction targets: 'J|<belt owner id>|<distance along that belt>|<side +1/-1>' = a T-split onto another belt
function jn(t){if(typeof t!=='string'||t[0]!=='J'||t[1]!=='|')return null;const a=t.split('|');return{id:a[1],d:+a[2],s:+a[3]}}
const _BR=new Map(),TSX=1.6,TSW=1.5;
function bridgeSeg(j){const a=SEG[j.id];const key=j.id+'|'+j.d+'|'+j.s;const r=arcAt(a,j.d);const e=jPort(j,r?.7:TSW)[0];const o={};segAt(a,r?r.de:j.d,o);const ys=r?(()=>{const q={};segAt(a,(r.ds+r.de)/2,q);return q.y})():o.y;
 const c=_BR.get(key);if(c&&c.a===a)return c.seg;const L=Math.hypot(o.x-e.x,o.z-e.z);const seg={id:'br|'+key,pts:[{x:e.x,y:ys,z:e.z,d:0},{x:o.x,y:o.y,z:o.z,d:L}],arcs:[],len:L,br:1};Object.defineProperty(seg,'tok',{get:()=>99,set:()=>{}});_BR.set(key,{a,seg});return seg}
function wrapSeg(a,d){const w={id:a.id,base:a,off:d,len:Math.max(.5,a.len-d)};Object.defineProperty(w,'tok',{get:()=>a.tok,set:v=>{a.tok=v}});return w}
function arcAt(a,d){return (a.arcs||[]).find(r=>d>=r.ds-.01&&d<=r.de+.01)||null}
function arcCorner(a,r,sd){const o1={},o2={};segAt(a,r.ds,o1);segAt(a,r.de,o2);const hu={x:Math.round(Math.sin(o1.yaw)),z:Math.round(Math.cos(o1.yaw))},hv={x:Math.round(Math.sin(o2.yaw)),z:Math.round(Math.cos(o2.yaw))};
 const V={x:o1.x+hu.x*r.R,z:o1.z+hu.z*r.R},arm=sd>0?{x:hu.x,z:hu.z}:{x:-hv.x,z:-hv.z};return{V,arm,hu,hv}}
function jPort(j,off=4.6){const a=SEG[j.id];if(!a)return[{x:0,z:0,dx:0,dz:1}];const r=arcAt(a,j.d);
 if(r){const c=arcCorner(a,r,j.s);return[{x:c.V.x+c.arm.x*(off+.1),z:c.V.z+c.arm.z*(off+.1),dx:-c.arm.x,dz:-c.arm.z}]}
 const o={};segAt(a,j.d,o);const hx=Math.round(Math.sin(o.yaw)),hz=Math.round(Math.cos(o.yaw)),nx=-hz,nz=hx;return[{x:o.x+j.s*nx*off,z:o.z+j.s*nz*off,dx:-j.s*nx,dz:-j.s*nz}]}
function segPath(id){const out=[];let cur=id,guard=0;while(cur&&!isT(cur)&&guard++<30){const s=SEG[cur];if(!s)return null;out.push(s);let t=s.tgt,j=jn(t),g2=0;while(j&&g2++<10){const a=SEG[j.id];if(!a)return null;out.push(a);t=a.tgt;j=jn(t)}cur=t}return isT(cur)?out:null}
function segEnd(id){let cur=id,g=0;while(g++<30){let t=S.links[cur];if(!t)return null;let j=jn(t),g2=0;while(j&&g2++<10){cur=j.id;t=S.links[cur];if(!t)return null;j=jn(t)}if(isT(t))return t;const q=padById(t);if(q&&q.mill)return t;cur=t}return null}
function segPathTo(id){const out=[];let cur=id,g=0;while(cur&&g++<30){const s=SEG[cur];if(!s)return null;out.push(s);let t=s.tgt,j=jn(t),g2=0;while(j&&g2++<10){const a=SEG[j.id];if(!a)return null;const ra=arcAt(a,j.d);out.push(bridgeSeg(j));out.push(wrapSeg(a,ra?ra.de:j.d));t=a.tgt;j=jn(t)}
  if(isT(t))return{path:out,dest:t};const q=padById(t);if(q&&q.mill)return{path:out,dest:t};cur=t}return null}
// nearest straight stretch of a belt to a point (for T-splits)
function beltSpot(a,px,pz){let best=null;const pts=a.pts;for(let i=1;i<pts.length;i++){const A=pts[i-1],B=pts[i],dx=B.x-A.x,dz=B.z-A.z,l2=dx*dx+dz*dz;if(l2<1e-6)continue;const u=Math.max(0,Math.min(1,((px-A.x)*dx+(pz-A.z)*dz)/l2)),x=A.x+dx*u,z=A.z+dz*u,d=A.d+(B.d-A.d)*u;
  if(d<3||d>a.len-3)continue;if((a.arcs||[]).some(r=>d>r.ds-TSX-.4&&d<r.de+TSX+.4))continue;const hl=Math.hypot(dx,dz);if(Math.abs(dx/hl)<.97&&Math.abs(dz/hl)<.97)continue;const dist=Math.hypot(px-x,pz-z);if(!best||dist<best.dist)best={x,z,y:A.y+(B.y-A.y)*u,d,dist}}return best}
function junctionFor(p,px,pz,maxd){if(p.gath)return gathJunction(p,px,pz,maxd);return junctionAny(p,px,pz,maxd)}
// harvesters always join at the same spot: the bend of the main belt closest to the harvester (as long as you stand near that belt)
function gathJunction(p,px,pz,maxd){let best=null;for(const k in SEG){if(k===p.id)continue;const a=SEG[k];if(!(a.arcs||[]).length)continue;const rr=segPathTo(k);if(!rr||rr.dest!=='F2')continue;const pa=segPath(k);if(!pa||pa.some(q=>q.id===p.id))continue;
  let near=1e9;for(const q of a.pts)near=Math.min(near,Math.hypot(q.x-px,q.z-pz));if(near>maxd)continue;
  for(const r of a.arcs){if(r.ds<3||r.de>a.len-3)continue;const c=arcCorner(a,r,1);const dh=Math.hypot(p.x-c.V.x,p.z-c.V.z);if(best&&dh>=best.dh)continue;
   best={tgt:'J|'+k+'|'+((r.ds+r.de)/2).toFixed(2)+'|-1',x:c.V.x,z:c.V.z,y:gy(c.V.x,c.V.z)+BDECK+2.4,dist:near,dh}}}return best}
function junctionAny(p,px,pz,maxd){let best=null;for(const k in SEG){if(k===p.id)continue;const a=SEG[k];const rr=segPathTo(k);if(!rr)continue;const pa=segPath(k);if(!pa||pa.some(q=>q.id===p.id))continue;
  const dest=rr.dest;if(dest==='F2'){if(!p.gath)continue}else if(!isT(dest)){const m=padById(dest);if(!m||p.mill||m.k!==p.k)continue}else if(p.gath&&S.storeBuilt)continue;
  const sp=beltSpot(a,px,pz);if(!sp||sp.dist>maxd||(best&&sp.dist>=best.dist))continue;
  const o={};segAt(a,sp.d,o);const hx=Math.round(Math.sin(o.yaw)),hz=Math.round(Math.cos(o.yaw)),nx=-hz,nz=hx;const side=((p.x-sp.x)*nx+(p.z-sp.z)*nz)>=0?1:-1;
  best={tgt:'J|'+k+'|'+sp.d.toFixed(2)+'|'+side,x:sp.x,z:sp.z,y:sp.y+2.4,dist:sp.dist}}
 for(const k in SEG){if(k===p.id)continue;const a=SEG[k];if(!(a.arcs||[]).length)continue;const rr=segPathTo(k);if(!rr)continue;const pa=segPath(k);if(!pa||pa.some(q=>q.id===p.id))continue;
  const dest=rr.dest;if(dest==='F2'){if(!p.gath)continue}else if(!isT(dest)){const m=padById(dest);if(!m||p.mill||m.k!==p.k)continue}else if(p.gath&&S.storeBuilt)continue;
  for(const r of a.arcs){if(r.ds<3||r.de>a.len-3)continue;const c=arcCorner(a,r,1);const dist=Math.hypot(px-c.V.x,pz-c.V.z)-1.5;if(dist>maxd||(best&&dist>=best.dist))continue;
   const d1=(p.x-c.V.x)*c.hu.x+(p.z-c.V.z)*c.hu.z,d2=-((p.x-c.V.x)*c.hv.x+(p.z-c.V.z)*c.hv.z),sd=-1;
   best={tgt:'J|'+k+'|'+((r.ds+r.de)/2).toFixed(2)+'|'+sd,x:c.V.x,z:c.V.z,y:gy(c.V.x,c.V.z)+BDECK+2.4,dist}}}
 return best}
function linkTarget(p,tx,tz){ // resolve a tapped point to 'F' or a connected pad id (not creating a cycle)
 if(!isF2(p)&&S.unl[1]&&S.storeBuilt&&Math.hypot(tx-FACT2.x,tz-FACT2.z)<8.5)return 'F2';
 let best=null,bd=3.6;for(const q of PADS){if(q===p||!S.links[q.id]||!machLv(q)||(isF2(p)&&!q.mill)||(p.gath&&S.storeBuilt))continue;const d=Math.hypot(tx-q.x,tz-q.z);if(d>=bd)continue;
  const pa=segPath(q.id);if(!pa||pa.some(s=>s.id===p.id))continue;
  if(q.mill){if(p.mill||p.k!==q.k)continue}else{const en=segEnd(q.id);if(en&&!isT(en)){const m=padById(en);if(p.mill||m.k!==p.k)continue}}
  bd=d;best=q.id}return best}
function segLen(p,tgt){const r=routeFor(p,tgt);let L=0;for(let i=1;i<r.w.length;i++)L+=Math.hypot(r.w[i].x-r.w[i-1].x,r.w[i].z-r.w[i-1].z);return L}
function linkCost(p,tgt){return Math.round(segLen(p,tgt)*BELT_COST)}
function makeLink(p,tgt,free){const c=linkCost(p,tgt);if(!free){if(S.coins<c){AU.deny();UI.toast('Belt costs '+fmtC(c)+' coins',1);return false}S.coins-=c}
 S.links[p.id]=tgt;buildSeg(p,tgt);if(!free){AU.buy();UI.pulse('coins');UI.toast('Belt connected!');save()}return true}
function dropLink(p,refund){const q=[p.id];while(q.length){const id=q.pop();if(S.links[id]){for(const k in S.links){const lv=S.links[k];if(lv===id||(jn(lv)&&jn(lv).id===id))q.push(k)};if(refund&&id===p.id)addCoins(Math.floor(linkCost(padById(id),S.links[id])*.5));delete S.links[id];killSeg(id)}}save()}
// ---- belt routing: orthogonal paths with rounded 90-degree corners, joined to machine ports ----
const BDIRS=[[0,1],[1,0],[0,-1],[-1,0]],BR=1.9,BDECK=.74;
const f2split=()=>S.f2split===undefined?.5:S.f2split;const F2Q=Math.round((LAY.store.r||0)/(Math.PI/2));function f2p(ox,oz,dx,dz){ox*=F2S;oz*=F2S;const k=((F2Q%4)+4)%4;let a=[ox,oz,dx,dz];for(let i=0;i<k;i++)a=[a[1],-a[0],a[3],-a[2]];return{x:FACT2.x+a[0],z:FACT2.z+a[1],dx:a[2],dz:a[3]}}
function portsOut(p){const q=p.sc||1;if(p.gath)return[{x:p.x-2.18*q,z:p.z+1.73*q,dx:0,dz:1}];
 if(p===FAC2)return[f2p(8.93,-1.26,1,0)];
 if(p===FAC2B)return[f2p(1.5,-6.25,0,-1)];
 if(p.mill&&p.k==='stick')return[{x:p.x,z:p.z-4.64*q,dx:0,dz:-1}];
 if(p.mill)return p.k==='stone'?[{x:p.x+4.64*q,z:p.z,dx:1,dz:0}]:[{x:p.x,z:p.z+4.64*q,dx:0,dz:1}];
 return BDIRS.map(d=>({x:p.x+d[0]*2.7*q,z:p.z+d[1]*2.7*q,dx:d[0],dz:d[1]}))}
function portsIn(t){if(jn(t))return jPort(jn(t));if(t==='F2')return[f2p(-8.09,-1.05,1,0)];
 if(t==='F'){const c=FACT;return BDIRS.map(d=>({x:c.x-d[0]*10.2*FACS,z:c.z-d[1]*8.4*FACS,dx:d[0],dz:d[1]}))}
 const c=padById(t),q=(c&&c.sc)||1;if(c&&c.mill&&c.k==='stick')return[{x:c.x,z:c.z+4.64*q,dx:0,dz:-1}];if(c&&c.mill)return c.k==='stone'?[{x:c.x-4.64*q,z:c.z,dx:1,dz:0}]:[{x:c.x,z:c.z-4.64*q,dx:0,dz:1}];
 return BDIRS.map(d=>({x:c.x-d[0]*2.7*q,z:c.z-d[1]*2.7*q,dx:d[0],dz:d[1]}))}
function routeTry(a,b,R){const A={x:a.x,z:a.z},B={x:b.x,z:b.z},dot=a.dx*b.dx+a.dz*b.dz,fw=(B.x-A.x)*a.dx+(B.z-A.z)*a.dz;
 if(dot===0){ // L shape
  const C=a.dz!==0?{x:A.x,z:B.z}:{x:B.x,z:A.z};
  const l1=(C.x-A.x)*a.dx+(C.z-A.z)*a.dz,l2=(B.x-C.x)*b.dx+(B.z-C.z)*b.dz;
  if(l1>=R-.01&&l2>=R-.01)return[A,C,B];
  // L does not fit: leave, sideways, back across, then in (3 corners)
  {const m=R*1.3,C1={x:A.x+a.dx*m,z:A.z+a.dz*m},eC=(B.x*b.dx+B.z*b.dz)-3-(C1.x*b.dx+C1.z*b.dz);
   if(eC>=R*1.2){const C2={x:C1.x+b.dx*eC,z:C1.z+b.dz*eC},dd=(B.x*a.dx+B.z*a.dz)-(C2.x*a.dx+C2.z*a.dz);
    if(Math.abs(dd)>=R*1.2){const C3={x:C2.x+a.dx*dd,z:C2.z+a.dz*dd};return[A,C1,C2,C3,B]}}}
  { // wrap around: run on, turn toward the far side of the target, come in along the entry heading
   const Lr=R*2,P={x:B.x-b.dx*(R*1.3),z:B.z-b.dz*(R*1.3)};
   const D1=(P.x-A.x)*a.dx+(P.z-A.z)*a.dz-Lr;
   if(D1>=R*1.3){const C1={x:A.x+a.dx*D1,z:A.z+a.dz*D1},C2=a.dx!==0?{x:C1.x,z:P.z}:{x:P.x,z:C1.z},C3={x:C2.x+a.dx*Lr,z:C2.z+a.dz*Lr};
    const l2=Math.hypot(C2.x-C1.x,C2.z-C1.z);if(l2>=R*1.2&&Math.hypot(B.x-C3.x,B.z-C3.z)>=R*1.2)return[A,C1,C2,C3,B]}}
  return null}
 if(dot>0){ // same heading: straight or Z
  const lat=a.dz!==0?Math.abs(B.x-A.x):Math.abs(B.z-A.z);
  if(fw<0)return null;if(lat<.05&&fw>=0)return[A,B];
  if(fw<2*R)return null;const m=fw/2;const C1={x:A.x+a.dx*m,z:A.z+a.dz*m},C2=a.dz!==0?{x:B.x,z:C1.z}:{x:C1.x,z:B.z};return lat>=1.2?[A,C1,C2,B]:null}
 // opposite headings: leave, run sideways past both ends, come back (two corners)
 const lat=a.dz!==0?Math.abs(B.x-A.x):Math.abs(B.z-A.z);if(lat<2*R*.65)return null;
 const sA=A.x*a.dx+A.z*a.dz,sB=B.x*a.dx+B.z*a.dz,st=Math.max(sA,sB)+R*1.3;
 const C1={x:A.x+a.dx*(st-sA),z:A.z+a.dz*(st-sA)},C2={x:B.x+a.dx*(st-sB),z:B.z+a.dz*(st-sB)};return[A,C1,C2,B]}
function routeFor(p,tgt){
 let outs=portsOut(p),ins=portsIn(tgt);let best=null,bs=1e9,bo=null,bi=null;
 {const bo2=[],bi2=[];for(const k in SEG){const s=SEG[k];if(s.tgt===p.id&&s.inn)bo2.push(-s.inn.dx+'|'+-s.inn.dz);if(k===tgt&&s.out)bi2.push(s.out.dx+'|'+s.out.dz)}
  const o2=outs.filter(a=>!bo2.includes(a.dx+'|'+a.dz)),i2=ins.filter(b=>!bi2.includes(-b.dx+'|'+-b.dz));if(o2.length)outs=o2;if(i2.length)ins=i2}
 for(const ext of [0,3,7]){for(const a of outs)for(const b of ins){const a2={x:a.x+a.dx*ext,z:a.z+a.dz*ext,dx:a.dx,dz:a.dz},b2={x:b.x-b.dx*ext*.5,z:b.z-b.dz*ext*.5,dx:b.dx,dz:b.dz};
   const w=routeTry(a2,b2,BR);if(!w)continue;let L=0;for(let i=1;i<w.length;i++)L+=Math.hypot(w[i].x-w[i-1].x,w[i].z-w[i-1].z);const sc=L+(w.length-2)*3+ext*2;
   if(sc<bs){bs=sc;bo=a;bi=b;const full=[{x:a.x,z:a.z}];if(ext)full.push({x:a2.x,z:a2.z});for(const q of w.slice(ext?1:0))full.push(q);if(ext){full.pop();full.push({x:b2.x,z:b2.z});full.push({x:b.x,z:b.z})}best=full}}
  if(best)break}
 if(!best){const a=outs[0],b=ins[0];best=[{x:a.x,z:a.z},{x:b.x,z:b.z}]} // fallback: direct
 // drop duplicate / collinear waypoints
 const w=[best[0]];for(let i=1;i<best.length;i++){const q=best[i],l=w[w.length-1];if(Math.hypot(q.x-l.x,q.z-l.z)<.05)continue;w.push(q)}
 for(let i=w.length-2;i>0;i--){const a=w[i-1],b=w[i],c=w[i+1];if(Math.abs((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x))<1e-3)w.splice(i,1)}
 return {w,out:bo?{dx:bo.dx,dz:bo.dz}:null,inn:bi?{dx:bi.dx,dz:bi.dz}:null}}
function buildSeg(p,tgt){killSeg(p.id);const R0=routeFor(p,tgt),w=R0.w,pts=[],arcs=[];
 {const jj=jn(tgt);if(jj&&SEG[jj.id]){const e=jPort(jj,arcAt(SEG[jj.id],jj.d)?.7:TSW)[0];w[w.length-1]={x:e.x,z:e.z}}}
 const dist=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z),push=(x,z)=>pts.push({x,z,y:gy(x,z)+BDECK});
 const line=(a,b)=>{const n=Math.max(1,Math.ceil(dist(a,b)/1.4));for(let i=(pts.length?1:0);i<=n;i++)push(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n)};
 // corner radii
 const rad=w.map((q,i)=>{if(i===0||i===w.length-1)return 0;const l1=dist(w[i-1],q)/(i>1?2:1),l2=dist(q,w[i+1])/(i<w.length-2?2:1);return Math.max(0,Math.min(BR,l1,l2))});
 let cur=w[0];
 for(let i=1;i<w.length;i++){const q=w[i];if(i===w.length-1){line(cur,q);break}
  const R=rad[i],u={x:Math.sign(q.x-w[i-1].x)*(Math.abs(q.x-w[i-1].x)>Math.abs(q.z-w[i-1].z)?1:0),z:Math.sign(q.z-w[i-1].z)*(Math.abs(q.z-w[i-1].z)>=Math.abs(q.x-w[i-1].x)?1:0)},
   nx=w[i+1],v={x:Math.sign(nx.x-q.x)*(Math.abs(nx.x-q.x)>Math.abs(nx.z-q.z)?1:0),z:Math.sign(nx.z-q.z)*(Math.abs(nx.z-q.z)>=Math.abs(nx.x-q.x)?1:0)};
  const T1={x:q.x-u.x*R,z:q.z-u.z*R},O={x:T1.x+v.x*R,z:T1.z+v.z*R};line(cur,T1);
  const a0=Math.atan2(T1.z-O.z,T1.x-O.x),cr=u.x*v.z-u.z*v.x,sw=cr>0?Math.PI/2:-Math.PI/2,ni=pts.length-1;
  const n=8;for(let k=1;k<=n;k++){const a=a0+sw*k/n;push(O.x+Math.cos(a)*R,O.z+Math.sin(a)*R)}
  arcs.push({i0:ni,i1:pts.length-1,cx:O.x,cz:O.z,R,a0,sw});cur={x:O.x+Math.cos(a0+sw)*R,z:O.z+Math.sin(a0+sw)*R}}
 const n=pts.length-1;
 for(let k=0;k<2;k++)for(let i=1;i<n;i++)pts[i].y=(pts[i-1].y+pts[i].y*2+pts[i+1].y)/4;
 let acc=0;pts[0].d=0;for(let i=1;i<=n;i++){acc+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);pts[i].d=acc}
 for(const a of arcs){a.ds=pts[a.i0].d;a.de=pts[a.i1].d}
 const seg={id:p.id,tgt,pts,arcs,out:R0.out,inn:R0.inn,len:acc,tok:3,ratio:1,vis:null};SEG[p.id]=seg;seg.vis=segVisual(seg);{const jj2=jn(tgt);if(jj2&&SEG[jj2.id])refreshVis(jj2.id)}refreshBeltClear()}
function refreshBeltClear(){BELTPTS=[];for(const k in SEG){const s=SEG[k];for(let i=0;i<s.pts.length;i+=1)BELTPTS.push(s.pts[i])}
 for(const n of nodes){if(!n.alive)continue;let b=null,bd=1e9;for(const q of BELTPTS){const d=Math.hypot(n.x-q.x,n.z-q.z);if(d<bd){bd=d;b=q}}const need=n.r+2.4;if(b&&bd<need){const dx=n.x-b.x,dz=n.z-b.z,l=Math.hypot(dx,dz)||1;n.x=b.x+dx/l*need;n.z=b.z+dz/l*need;n.y=gy(n.x,n.z);n.obj.position.set(n.x,n.y,n.z);if(n.stump)n.stump.position.set(n.x,n.y+.2,n.z)}}
 applyDecor()}
function refreshVis(id){const s=SEG[id];if(!s||!s.vis)return;scene.remove(s.vis.grp);s.vis.grp.traverse(o=>{if(o.geometry)o.geometry.dispose()});s.vis=segVisual(s)}
function killSeg(id){const s=SEG[id];if(!s)return;const _jj=jn(s.tgt);if(s.vis){scene.remove(s.vis.grp);s.vis.grp.traverse(o=>{if(o.geometry)o.geometry.dispose()})}delete SEG[id];if(_jj&&SEG[_jj.id])refreshVis(_jj.id);
 for(let i=ECON.items.length-1;i>=0;i--){const it=ECON.items[i];if(it.path.some(s=>s.id===id)){if(it.m)ECON.dead.push(it.m);ECON.transit[it.k]--;ECON.items.splice(i,1)}}}
const _belMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,side:THREE.DoubleSide});
const slatGeo=new THREE.BoxGeometry(1.0,.05,.14);const slatMat=new THREE.MeshStandardMaterial({color:'#3b3647',roughness:.7});
function segVisual(seg){const grp=new THREE.Group();let hideR=null;const carve=[];for(const k in S.links){const j=jn(S.links[k]);if(j&&j.id===seg.id)carve.push(j)}
 const arcs=seg.arcs||[],spans=[];{const gaps=arcs.map(a=>[a.ds,a.de]).concat(carve.filter(c=>!arcAt(seg,c.d)).map(c=>[c.d-TSX,c.d+TSX])).sort((x,y)=>x[0]-y[0]);let c=0;for(const g of gaps){if(g[0]>c+.3)spans.push([c,g[0]]);c=Math.max(c,g[1])}if(seg.len>c+.3)spans.push([c,seg.len])}
 const mods=[];for(const [s0,s1] of spans){const n=Math.max(1,Math.round((s1-s0)/2.4)),L=(s1-s0)/n;for(let i=0;i<n;i++)mods.push({d:s0+(i+.5)*L,L})}
 const N=mods.length,Lmax=Math.max(1,...mods.map(m=>m.L));
 const cream=std('#e4dcc8',{roughness:.5}),yel=std('#e8b02c',{roughness:.45}),dkm=std('#1f1c26',{roughness:.85}),teal=std('#2fb0ac',{roughness:.55}),grey=std('#8d94a3',{roughness:.45,metalness:.25}),slate=std('#5a6080',{roughness:.55});
 const bodyG=rbox(1.55,.5,1,.16,cream).geometry,deckG=new THREE.BoxGeometry(1.15,.12,1),railG=new THREE.BoxGeometry(.08,.12,1),plG=rbox(.05,.42,.55,.04,yel).geometry,hdG=rbox(.08,.1,.45,.03,teal).geometry;
 const legG=new THREE.CylinderGeometry(.13,.16,1,8),footG=new THREE.CylinderGeometry(.26,.28,.1,10);
 const rolG=new THREE.CylinderGeometry(.36,.36,1.45,14);rolG.rotateZ(Math.PI/2);const capG=new THREE.CylinderGeometry(.2,.2,1.66,10);capG.rotateZ(Math.PI/2);
 const nLeg=N*2+arcs.length*2+4,nPl=Math.ceil(N/3)*2+2;
 const mk=(g,m,n)=>{const im=new THREE.InstancedMesh(g,m,Math.max(1,n));im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;grp.add(im);return im};
 const iBody=mk(bodyG,cream,N),iDeck=mk(deckG,dkm,N),iRail=mk(railG,yel,N*2),iPl=mk(plG,yel,nPl),iHd=mk(hdG,teal,nPl),iLeg=mk(legG,cream,nLeg),iFoot=mk(footG,slate,nLeg),iRol=mk(rolG,yel,2),iCap=mk(capG,grey,2);
 const M=new THREE.Matrix4(),Lm=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S1=new THREE.Vector3(1,1,1),po={x:0,y:0,z:0,yaw:0,pitch:0},Q0=new THREE.Quaternion();
 const put=(im,k,lx,ly,lz,sz)=>{Lm.makeTranslation(lx,ly,lz);if(sz){const Sm=new THREE.Matrix4().makeScale(1,1,sz);im.setMatrixAt(k,M.clone().multiply(Lm).multiply(Sm))}else im.setMatrixAt(k,M.clone().multiply(Lm))};
 let kr=0,kp=0,kl=0;
 const leg=(wx,wz,top)=>{const gnd=gy(wx,wz),h=Math.max(.12,top-gnd);iLeg.setMatrixAt(kl,new THREE.Matrix4().compose(new THREE.Vector3(wx,gnd+h/2,wz),Q0,new THREE.Vector3(1,h,1)));iFoot.setMatrixAt(kl,new THREE.Matrix4().compose(new THREE.Vector3(wx,gnd+.05,wz),Q0,S1));kl++};
 mods.forEach((m,i)=>{segAt(seg,m.d,po);E.set(po.pitch,po.yaw,0,'YXZ');Q.setFromEuler(E);V.set(po.x,po.y,po.z);M.compose(V,Q,S1);const sz=m.L+.02;
  put(iBody,i,0,-.3,0,sz);put(iDeck,i,0,-.06,0,sz);for(const sx of [-1,1]){if(carve.some(c=>!arcAt(seg,c.d)&&Math.abs(m.d-c.d)<m.L/2+.9&&sx===-c.s))continue;put(iRail,kr++,sx*.62,.02,0,sz)}
  if(i%3===1)for(const sd of [-1,1]){put(iPl,kp,sd*.8,-.3,0);put(iHd,kp,sd*.88,-.38,0);kp++}
  if(i%2===0)for(const sd of [-1,1]){const lx=sd*.55;leg(po.x+lx*Math.cos(po.yaw),po.z-lx*Math.sin(po.yaw),po.y-.5)}});
 // 90-degree corner pieces: ribbon along the arc with the same cross-section
 const cC=new THREE.Color('#e4dcc8'),cY=new THREE.Color('#e8b02c'),cD=new THREE.Color('#1f1c26');
 const PR=[[-.58,0,cD],[.58,0,cD],[.58,.1,cY],[.7,.1,cY],[.78,-.05,cC],[.78,-.55,cC],[-.78,-.55,cC],[-.78,-.05,cC],[-.7,.1,cY],[-.58,.1,cY],[-.58,0,cD]];
function tStrip(x0,z0,x1,z1,y0,y1,hideDir){const L=Math.hypot(x1-x0,z1-z0),dx=(x1-x0)/L,dz=(z1-z0)/L,lx=-dz,lz=dx,ns=Math.max(2,Math.round(L/.5));const hp=hideDir?((lx*hideDir.x+lz*hideDir.z)>0?1:-1):0;const Ppos=[],Pcol=[],Idx=[];
  for(let ei=0;ei<PR.length-1;ei++){if(hp&&((hp>0&&ei>=1&&ei<=4)||(hp<0&&ei>=6&&ei<=9)))continue;const base=Ppos.length/3,p0=PR[ei],p1=PR[ei+1];
   for(let k=0;k<=ns;k++){const t=k/ns,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,y=y0+(y1-y0)*t;for(const pp of [p0,p1]){Ppos.push(x+lx*pp[0],y+pp[1],z+lz*pp[0]);Pcol.push(pp[2].r,pp[2].g,pp[2].b)}}
   for(let k=0;k<ns;k++){const i0=base+k*2;Idx.push(i0,i0+1,i0+2,i0+1,i0+3,i0+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Ppos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Pcol,3));g.setIndex(Idx);g.computeVertexNormals();
  const me=new THREE.Mesh(g,_belMat);me.castShadow=true;me.receiveShadow=true;grp.add(me)}
function tPiece(Vx,Vz,yv,hu,hv,XB,XR,WR){const HW=.58,RF=.6,Y=yv,W3=(x,w)=>[Vx+hv.x*x-hu.x*w,Vz+hv.z*x-hu.z*w];
    // deck: one flat T-shaped plate with rounded inner corners
    const P=[[-XB,-HW],[XR,-HW],[XR,HW]];for(let k=0;k<=8;k++){const g=(270-90*k/8)*Math.PI/180;P.push([HW+RF+RF*Math.cos(g),HW+RF+RF*Math.sin(g)])}
    P.push([HW,WR],[-HW,WR]);for(let k=0;k<=8;k++){const g=(0-90*k/8)*Math.PI/180;P.push([-HW-RF+RF*Math.cos(g),HW+RF+RF*Math.sin(g)])}P.push([-XB,HW]);
    const tri=THREE.ShapeUtils.triangulateShape(P.map(q=>new THREE.Vector2(q[0],q[1])),[]);const dp=[];for(const q of P){const w=W3(q[0],q[1]);dp.push(w[0],Y+.0,w[1])}
    const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));dg.setIndex(tri.flat());dg.computeVertexNormals();dkm.side=THREE.DoubleSide;const dm=new THREE.Mesh(dg,dkm);dm.receiveShadow=true;grp.add(dm);
    // walls/rims swept along the outline (yellow rim + cream skirt)
    const WP=[[0,0,cY],[0,.1,cY],[.12,.1,cY],[.2,-.05,cC],[.2,-.55,cC]];
    const sweep=(path,sg)=>{const Pp=[],Pc=[],Ix=[],n=path.length;const nr=[];for(let q=0;q<n;q++){const a0=path[Math.max(0,q-1)],a1=path[Math.min(n-1,q+1)];let tx=a1[0]-a0[0],tw=a1[1]-a0[1];const l=Math.hypot(tx,tw)||1;tx/=l;tw/=l;nr.push(sg>0?[-tw,tx]:[tw,-tx])}
     for(let e=0;e<WP.length-1;e++){const b=Pp.length/3;for(let q=0;q<n;q++)for(const pp of [WP[e],WP[e+1]]){const w=W3(path[q][0]+nr[q][0]*pp[0],path[q][1]+nr[q][1]*pp[0]);Pp.push(w[0],Y+pp[1],w[1]);Pc.push(pp[2].r,pp[2].g,pp[2].b)}for(let q=0;q<n-1;q++){const i0=b+q*2;Ix.push(i0,i0+1,i0+2,i0+1,i0+3,i0+2)}}
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Pp,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Pc,3));g.setIndex(Ix);g.computeVertexNormals();const m=new THREE.Mesh(g,_belMat);m.castShadow=true;m.receiveShadow=true;grp.add(m)};
    const arcP=(cx,cw,g0,g1)=>{const o=[];for(let k=0;k<=8;k++){const g=(g0+(g1-g0)*k/8)*Math.PI/180;o.push([cx+RF*Math.cos(g),cw+RF*Math.sin(g)])}return o};
    sweep([[-XB,-HW],[XR,-HW]],-1);                                                                   // outer wall of the bar
    const L=[[-XB,HW],...arcP(-HW-RF,HW+RF,-90,0).map(q=>q),[-HW,WR]];sweep(L,1);                  // left inner corner
    const Rr=[[XR,HW],...arcP(HW+RF,HW+RF,270,180),[HW,WR]];sweep(Rr,-1);                          // right inner corner
    const rim=(path,sg)=>{const n=path.length,v=[];for(let q=0;q<n;q++){const a0=path[Math.max(0,q-1)],a1=path[Math.min(n-1,q+1)];let tx=a1[0]-a0[0],tw=a1[1]-a0[1];const l=Math.hypot(tx,tw)||1;tx/=l;tw/=l;const nn=sg>0?[-tw,tx]:[tw,-tx];const w=W3(path[q][0]+nn[0]*.08,path[q][1]+nn[1]*.08);v.push(new THREE.Vector3(w[0],Y+.12,w[1]))}
     const t=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v,false,'catmullrom',.1),Math.max(8,n*3),.085,8),yel);t.castShadow=true;grp.add(t)};
    rim([[-XB,-HW],[XR,-HW]],-1);rim(L,1);rim(Rr,-1);
    // grey pipe handrails around the two inner corners
    const rail=(pts)=>{const v=pts.map(q=>{const w=W3(q[0],q[1]);return new THREE.Vector3(w[0],Y+.62,w[1])});const t=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v),28,.085,8),grey);t.castShadow=true;grp.add(t);
     for(const q of [v[0],v[Math.floor(v.length/2)],v[v.length-1]]){const pc=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.62,8),grey);pc.position.set(q.x,Y+.3,q.z);grp.add(pc)}};
    const arcR=(cx,cw,g0,g1,r)=>{const o=[];for(let k=0;k<=8;k++){const g=(g0+(g1-g0)*k/8)*Math.PI/180;o.push([cx+r*Math.cos(g),cw+r*Math.sin(g)])}return o};
    rail([[-HW-RF-.9,HW+.25],...arcR(-HW-RF,HW+RF,-90,0,RF-.25),[-HW-.25,HW+RF+.9]]);
    rail([[HW+RF+.9,HW+.25],...arcR(HW+RF,HW+RF,270,180,RF-.25),[HW+.25,HW+RF+.9]]);
    for(let x=-XB+.5;x<XR-.2;x+=.95){const w=W3(x,0),sl=new THREE.Mesh(slatGeo,slatMat);sl.position.set(w[0],Y+.04,w[1]);sl.rotation.y=Math.atan2(hv.x,hv.z);grp.add(sl)}
    for(let y=HW+.7;y<WR-.2;y+=.95){const w=W3(0,y),sl=new THREE.Mesh(slatGeo,slatMat);sl.position.set(w[0],Y+.04,w[1]);sl.rotation.y=Math.atan2(hu.x,hu.z);grp.add(sl)}
    // teal display + frame on the outer wall, and legs
    const yaw=Math.atan2(hu.x,hu.z),dpos=W3(.45,-HW-.27);const fr=rbox(1.3,.62,.16,.06,grey);fr.position.set(dpos[0],Y-.3,dpos[1]);fr.rotation.y=yaw;grp.add(fr);
    const scr=rbox(1.02,.42,.06,.03,std('#5fe3c0',{roughness:.3,emissive:'#2fb89a',emissiveIntensity:.7}));scr.position.set(dpos[0]+hu.x*.08,Y-.3,dpos[1]+hu.z*.08);scr.rotation.y=yaw;grp.add(scr);
    for(const ox of [-.32,-.12]){const a0=W3(.45+ox,-HW-.3),a1=W3(.45+ox+.25,-HW-.42),a2=W3(.45+ox+.9,-HW-.25),a3=W3(.45+ox+1.25,-HW-.05);
     const cv=new THREE.CatmullRomCurve3([new THREE.Vector3(a0[0],Y-.62,a0[1]),new THREE.Vector3(a1[0],Y-.85,a1[1]),new THREE.Vector3(a2[0],Y-.8,a2[1]),new THREE.Vector3(a3[0],Y-.5,a3[1])]);
     const cb=new THREE.Mesh(new THREE.TubeGeometry(cv,16,.05,6),teal);cb.castShadow=true;grp.add(cb)}
    for(const [lx,lw] of [[-.45,-.4],[1.35,-.4],[0,1.45],[-.45,.4]]){const w=W3(lx,lw);leg(w[0],w[1],Y-.5)}}
  for(const c of carve){if(arcAt(seg,c.d))continue;const o={};segAt(seg,c.d,o);const hx=Math.round(Math.sin(o.yaw)),hz=Math.round(Math.cos(o.yaw));tPiece(o.x,o.z,o.y,{x:c.s*hz,z:-c.s*hx},{x:hx,z:hz},TSX,TSX,TSW)}
 for(const a of arcs){const Ppos=[],Pcol=[],Idx=[],ns=14,cv=carve.filter(c=>c.d>=a.ds-.01&&c.d<=a.de+.01);
  if(cv.length){ // dedicated T-piece instead of the rounded corner
   const o1={},o2={};segAt(seg,a.ds,o1);segAt(seg,a.de,o2);const hu={x:Math.round(Math.sin(o1.yaw)),z:Math.round(Math.cos(o1.yaw))},hv={x:Math.round(Math.sin(o2.yaw)),z:Math.round(Math.cos(o2.yaw))};
   const Vx=o1.x+hu.x*a.R,Vz=o1.z+hu.z*a.R,yv=(o1.y+o2.y)/2;
   tPiece(Vx,Vz,yv,hu,hv,.8,a.R,a.R);
   (hideR=hideR||[]).push([a.ds,a.de]);continue}
  for(let ei=0;ei<PR.length-1;ei++){const base=Ppos.length/3;const p0=PR[ei],p1=PR[ei+1];
   for(let k=0;k<=ns;k++){const t=k/ns,ang=a.a0+a.sw*t;segAt(seg,a.ds+(a.de-a.ds)*t,po);const cs=Math.cos(ang),sn=Math.sin(ang);
    for(const pp of [p0,p1]){const r=a.R+pp[0];Ppos.push(a.cx+cs*r,po.y+pp[1],a.cz+sn*r);Pcol.push(pp[2].r,pp[2].g,pp[2].b)}}
   for(let k=0;k<ns;k++){if(ei>=1&&ei<=4&&cv.some(c=>{const tc=1-Math.atan(Math.sqrt((a.R+.78)*(a.R+.78)-a.R*a.R)/a.R)/(Math.PI/2),hw=Math.asin(.66/(a.R+.78))/(Math.PI/2);const tk=(k+.5)/ns;return Math.abs(tk-tc)<hw+.5/ns}))continue;const i0=base+k*2;Idx.push(i0,i0+1,i0+2,i0+1,i0+3,i0+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Ppos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Pcol,3));g.setIndex(Idx);g.computeVertexNormals();
  const me=new THREE.Mesh(g,_belMat);me.castShadow=true;me.receiveShadow=true;grp.add(me);
  // legs on the curve + a yellow plate on the outer wall
  for(const tt of [.3,.7]){const ang=a.a0+a.sw*tt;segAt(seg,a.ds+(a.de-a.ds)*tt,po);for(const sd of [-.55,.55]){const r=a.R+sd;leg(a.cx+Math.cos(ang)*r,a.cz+Math.sin(ang)*r,po.y-.5)}}}
 for(let j=0;j<2;j++){if(j&&jn(seg.tgt))continue;segAt(seg,j?seg.len-.05:.05,po);E.set(po.pitch,po.yaw,0,'YXZ');Q.setFromEuler(E);V.set(po.x,po.y,po.z);M.compose(V,Q,S1);put(iRol,j,0,-.16,0);put(iCap,j,0,-.16,0)}
 for(const im of [iBody,iDeck,iRail,iPl,iHd,iLeg,iFoot,iRol,iCap])im.instanceMatrix.needsUpdate=true;
 iLeg.count=kl;iFoot.count=kl;iPl.count=kp;iHd.count=kp;
 const count=Math.max(2,Math.floor(seg.len/.95));const im=new THREE.InstancedMesh(slatGeo,slatMat,count);im.frustumCulled=false;grp.add(im);scene.add(grp);return{grp,im,count,mesh:iBody,hide:hideR}}
const _s0=new THREE.Vector3(0,0,0),_sm=new THREE.Matrix4(),_sq=new THREE.Quaternion(),_sp=new THREE.Vector3(),_ss=new THREE.Vector3(1,1,1),_se=new THREE.Euler();
function segAt(seg,d,out){const pts=seg.pts;d=Math.max(0,Math.min(seg.len,d));let i=1;while(i<pts.length-1&&pts[i].d<d)i++;const a=pts[i-1],b=pts[i],t=(d-a.d)/Math.max(1e-4,b.d-a.d);out.x=a.x+(b.x-a.x)*t;out.y=a.y+(b.y-a.y)*t;out.z=a.z+(b.z-a.z)*t;out.yaw=Math.atan2(b.x-a.x,b.z-a.z);out.pitch=-Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z));return out}
const _po={x:0,y:0,z:0,yaw:0,pitch:0};
// ---- simulation ----
function tryCraft(silent){const F=S.fac,G=S.goods;const keys=GKEYS.filter(k=>!GOODS[k].mill&&(GOODS[k].tier===1||F.adv)&&!F.off[k]&&G[k]<GCAP&&!(F.q&&F.q[k]===0));let miss='';
 for(let j=0;j<keys.length;j++){const k=keys[(F.rr+j)%keys.length],R=GOODS[k];let ok=true;
  for(const r in R.in){const have=RES.includes(r)?S.inv[r]:G[r];if(have<R.in[r]){ok=false;if(!miss)miss=r}}
  if(!ok)continue;
  for(const r in R.in){if(RES.includes(r))S.inv[r]-=R.in[r];else G[r]-=R.in[r]}
  G[k]++;F.made[k]++;S.stats.crafted++;if(F.q&&F.q[k]>0)F.q[k]--;F.rr=(F.rr+j+1)%keys.length;
  if(!silent)ECON.events.push({t:'craft',k});
  return true}
 ECON.waiting=miss;return false}
function sellGoods(k,n){n=Math.min(n,S.goods[k]);if(n<=0)return 0;S.goods[k]-=n;const v=Math.round(GOODS[k].v*refineMul())*n;addCoins(v);S.stats.sold+=n;ECON.events.push({t:'sell',v,k});return v}
const ISP=1.4,roomAt=s=>!ECON.items.some(it=>it.path[0]===s&&it.d<ISP);
function deliverItem(it){
  if(it.dest&&!isT(it.dest)){const M=padById(it.dest);if(M&&machLv(M)){if((M.mi||0)<MBUF){M.mi=(M.mi||0)+1;return true}return false}addCoins(Math.round(VAL[it.k]*refineMul()*.5));S.stats.sold++;return true}
  if(it.dest==='F2'&&it.k==='wood'){if(FAC2.in<f2cap()){FAC2.in++;return true}return false}
  if(GOODS[it.k]&&GOODS[it.k].mill){if(S.goods[it.k]<GCAP){S.goods[it.k]++;S.fac.made[it.k]++}else{addCoins(Math.round(GOODS[it.k].v*refineMul()*.5));S.stats.sold++}return true}
  if(S.inv[it.k]<cap()){S.inv[it.k]++}else{addCoins(Math.round(VAL[it.k]*refineMul()*.5));S.stats.sold++}return true}
function econStep(dt,silent){const F=S.fac,sat=powSat();ECON.sat=sat;
 // machines produce into a local buffer, then push onto their belt
 for(const p of PADS){const lv=machLv(p);if(!lv||!padOpen(p))continue;
  if(p.buf===undefined)p.buf=0;
  if(p.mill){const M=MILLS[p.k];p.mi=p.mi||0;p.acc+=machRate(p)*sat*dt;if(p.acc>2)p.acc=2;while(p.acc>=1&&p.mi>=M.need&&p.buf<mcap(p)){p.mi-=M.need;p.buf++;p.acc-=1}p.work=p.mi>=M.need?1:0}
  else if(p.gath&&!silent&&p.gobj){p.acc+=machRate(p)*sat*dt;if(p.acc>2)p.acc=2;while(p.acc>=1){if(p.gst==='saw'&&p.carry<gcarry(p)&&p.buf<(S.links[p.id]?MBUF:GBUF)){p.carry++;p.acc-=1}else{p.acc=Math.min(p.acc,1);break}}}
  else{p.acc+=machRate(p)*sat*dt;
  while(p.acc>=1){if(p.buf<MBUF){p.buf++;p.acc-=1}else{p.acc=1;break}}}
  const rr=S.links[p.id]&&segPathTo(p.id);const sg=rr&&rr.path;const ok2=p.mill?MILLS[p.k].out:p.k;
  if(sg){while(p.buf>0&&sg.every(s=>s.tok>=1)&&roomAt(sg[0])){sg.forEach(s=>s.tok-=1);p.buf--;let L=0;for(const s of sg)L+=s.len;ECON.items.push({k:ok2,path:sg,L,d:0,m:null,dest:rr.dest});ECON.transit[ok2]++}}}
 if(S.unl[1]){const f=FAC2;f.acc=Math.min(2,f.acc+(f2rate()/60)*sat*dt);const lk=S.storeBuilt&&(S.links.FAC2||S.links.FAC2b);if(lk)while(f.acc>=1&&f.in>=1&&f.buf<MBUF){f.in--;f.buf++;f.acc-=1}f.work=lk&&f.in>0?1:0;
  {const r=f2split();const hasA=!!S.links.FAC2,hasB=!!S.links.FAC2b;let gn=0;while(f.buf>0&&(hasA||hasB)&&gn++<4){let first;if(hasA&&hasB){if(r<=0)first=['FAC2'];else if(r>=1)first=['FAC2b'];else{f.cb=(f.cb||0)+r;first=f.cb>=1?['FAC2b','FAC2']:['FAC2','FAC2b']}}else first=[hasB?'FAC2b':'FAC2'];
   let done=false;for(const id of first){const rr=segPathTo(id),sg=rr&&rr.path;if(sg&&sg.every(s=>s.tok>=1)&&roomAt(sg[0])){sg.forEach(s=>s.tok-=1);f.buf--;let L=0;for(const s of sg)L+=s.len;ECON.items.push({k:'wood',path:sg,L,d:0,m:null,dest:rr.dest});ECON.transit.wood++;if(id==='FAC2b'&&hasA&&hasB&&r>0&&r<1)f.cb=Math.max(0,f.cb-1);done=true;break}}if(!done){if(hasA&&hasB&&r>0&&r<1&&f.cb>=1)f.cb-=r;break}}}}
 for(const k in SEG)SEG[k].tok=Math.min(3,SEG[k].tok+beltRate()*dt);
 { // items queue up on the belt when their destination is full (backpressure)
  const Q=new Map();for(const it of ECON.items){const k=it.path[it.path.length-1].id+'>'+it.dest;let q=Q.get(k);if(!q)Q.set(k,q=[]);q.push(it)}
  // T-splits: belts that join another belt (side lane) and the region on the main belt they merge into
  const JR={};for(const k in S.links){const j=jn(S.links[k]);if(!j||!SEG[j.id]||!SEG[k])continue;const a=SEG[j.id],r=arcAt(a,j.d);JR[j.id]={ds:r?r.ds:j.d,de:r?r.de:j.d,side:k}}
  const laneOf=it=>{let d=it.d;for(const sg of it.path){if(d<=sg.len||sg===it.path[it.path.length-1]){if(sg.br||sg.base)return{l:'S'};if(SEG[sg.id]&&jn(SEG[sg.id].tgt))return{l:'P'+sg.id,side:1,toEnd:it.L-it.d-(it.L-(()=>{let a=0;for(const s2 of it.path){a+=s2.len;if(s2===sg)break}return a})())};
     const jr=JR[sg.id];if(jr&&d<jr.ds)return{l:'P'+sg.id,main:sg.id,toEntry:jr.ds-d};return{l:'S'}}d-=sg.len}return{l:'S'}};
  for(const q of Q.values()){q.sort((x,y)=>(x.L-x.d)-(y.L-y.d));const prev={S:-ISP};const lanes=q.map(laneOf);
   const mainNear=lanes.some(ln=>ln.main&&ln.toEntry<2.4);
   q.forEach((it,qi)=>{const ln=lanes[qi],R0=it.L-it.d;const pl=prev[ln.l]!==undefined?prev[ln.l]:-ISP;let nr=Math.min(R0,Math.max(pl+ISP,prev.S+ISP,R0-BSPEED*dt));
    if(ln.side&&mainNear){const Rentry=R0-ln.toEnd;if(nr<Rentry)nr=Math.min(R0,Rentry)} // side belt waits until the main belt has a gap
    if(nr<=.0001){nr=0;if(deliverItem(it)){it.done=1;ECON.transit[it.k]--;prev.S=-ISP;return}}
    if(it.L-nr>it.d+1e-4){let dd=it.L-nr;for(const sg of it.path){if(dd<=sg.len){const bs=sg.base||sg;if(SEG[bs.id]===bs)bs.mvT=performance.now();break}dd-=sg.len}}
    it.d=it.L-nr;prev[ln.l]=nr;if(ln.l==='S')prev.S=nr})}
  for(let i=ECON.items.length-1;i>=0;i--){const it=ECON.items[i];if(it.done){if(it.m)ECON.dead.push(it.m);ECON.items.splice(i,1)}}}
 // factory
 ECON.busy=false;ECON.waiting='';const J=F.jobs[0];
 if(J){J.done+=craftRate()*sat*dt;ECON.busy=true;F.ct=(F.ct||0)+dt;if(!silent&&F.ct>1.1){F.ct=0;ECON.events.push({t:'craft',k:'plank'})}if(J.done>=J.need){F.jobs.shift();finishJob(J,silent)}}}
// ---- workshop jobs (pickaxes, drones, upgrades) ----
const jobPend=(k,id)=>S.fac.jobs.filter(j=>j.k===k&&(id===undefined||j.id===id)).length;
function enqueueJob(j){if(S.fac.jobs.length>=6){AU.deny();UI.toast('Upgrade Center queue is full',1);return false}j.done=0;S.fac.jobs.push(j);UI.toast(j.n+' sent to the Upgrade Center');return true}
function finishJob(j,silent){
 if(j.k==='tool'){S.tool=Math.max(S.tool,j.id);if(!silent){AU.buy();UI.banner(TOOLS[j.id].n.toUpperCase(),'Equipped!')}}
 else if(j.k==='up'){S.up[j.id]++;if(!silent){AU.buy();UI.toast(j.n+' upgraded!')}}
 else if(j.k==='drone'){S.drones++;syncDrones();if(!silent){const d=drones[drones.length-1];if(d)chips(d.x,d.y,d.z,'#7ff6ff',30,8,.2,1,1);AU.buy();UI.toast('Collector Drone ready!')}}
 save()}
function econOffline(sec){const s0=S.stats.earned;const steps=Math.min(5400,Math.ceil(sec));const dt=sec/steps;for(let i=0;i<steps;i++)econStep(dt,true);ECON.items.forEach(it=>{});return S.stats.earned-s0}
// ---- visuals ----
VAL.trunk=VAL.wood;ECON.transit.trunk=0;lootMat.trunk=std('#ecd9a4',{roughness:.6});lootGeo.trunk=new THREE.BoxGeometry(.5,.34,.5);
const ITEM_BOX=new THREE.BoxGeometry(.62,.5,.62);
const ITEM_GEO={trunk:(()=>{const g=new THREE.CylinderGeometry(.2,.2,1.25,10);g.rotateZ(Math.PI/2);g.translate(0,.02,0);return g})(),wood:(()=>{const g=barkGeo(.27,.27,1.15,10);g.rotateZ(Math.PI/2);g.translate(0,.05,0);return g})(),
 stone:new THREE.DodecahedronGeometry(.45,0),ore:new THREE.OctahedronGeometry(.48,0),crystal:(()=>{const g=new THREE.OctahedronGeometry(.4,0);g.scale(1,1.5,1);return g})(),
 plank:new THREE.BoxGeometry(1.2,.16,.5),slab:new THREE.BoxGeometry(.95,.24,.95),stick:new THREE.BoxGeometry(1.3,.15,.15)};
function econVis(dt){const t=performance.now()*.001;
 const now=performance.now();for(const k in SEG){const s=SEG[k],v=s.vis;if(!v)continue;const run=s.mvT&&now-s.mvT<250;if(!run&&s.offS!==undefined)continue;s.offS=((s.offS||0)+(run?dt*1.4:0))%.95;const off=s.offS;for(let i=0;i<v.count;i++){const d=(i*.95+off)%(v.count*.95);segAt(s,Math.min(s.len,d),_po);_sp.set(_po.x,_po.y+.04,_po.z);_se.set(_po.pitch,_po.yaw,0,'YXZ');_sq.setFromEuler(_se);_sm.compose(_sp,_sq,v.hide&&v.hide.some(h=>d>h[0]&&d<h[1])?_s0:_ss);v.im.setMatrixAt(i,_sm)}v.im.instanceMatrix.needsUpdate=true}
 for(const it of ECON.items){if(!it.m){it.m=new THREE.Mesh(ITEM_GEO[it.k]||ITEM_BOX,lootMat[it.k]);it.m.castShadow=false;scene.add(it.m)}
  let d=it.d,seg=null;for(const s of it.path){if(d<=s.len){seg=s;break}d-=s.len}if(!seg){seg=it.path[it.path.length-1];d=seg.len}
  segAt(seg.base||seg,d+(seg.off||0),_po);it.m.position.set(_po.x,_po.y+.34,_po.z);it.m.rotation.set(_po.pitch,_po.yaw,0,'YXZ')}
 while(ECON.dead.length){const m=ECON.dead.pop();scene.remove(m)}
 ECON.craftT-=dt;ECON.sellT-=dt;for(const e of ECON.events.splice(0)){if(e.t==='craft'){if(ECON.craftT<=0||ECON.craftT===undefined){ECON.craftT=.4;AU.pick(3);chips(FACT.x+(Math.random()-.5)*4,gy(FACT.x,FACT.z)+4.2,FACT.z+2.2,GOODS[e.k].col,6,4,.14,.7,1)}}if(e.t==='sell'&&ECON.sellT<=0){ECON.sellT=.35;AU.coin(0);chips(HOPPER.x,gy(HOPPER.x,HOPPER.z)+2.2,HOPPER.z,'#ffe9a0',6,4,.14,.7,1);floater(HOPPER.x,gy(HOPPER.x,HOPPER.z)+4.2,HOPPER.z,'+'+e.v+' '+GOODS[e.k].n,GOODS[e.k].col)}}}
// ---- link mode (tap machine, then tap destination) ----
const LINK={from:null};
function linkNear(p,px,pz){ // walk-up targeting: the machine/terminal the player stands next to (for the CONNECT button)
 let best=null,bd=1e9;const cand=(tgt,x,z,y,r)=>{const d=Math.hypot(px-x,pz-z);if(d<r&&d<bd){bd=d;best={tgt,x,z,y}}};
 if(!isF2(p)){if(S.unl[1]&&S.storeBuilt)cand('F2',FACT2.x,FACT2.z,gy(FACT2.x,FACT2.z)+9,11)}
 for(const q of PADS){if(q===p||!machLv(q))continue;
  if(q.mill){if(p===FAC2){if(q.k!=='wood')continue}else if(p===FAC2B){if(q.k!=='stick')continue}else{if(p.mill||p.k!==q.k||(p.gath&&S.storeBuilt))continue}cand(q.id,q.x,q.z,q.y+8,7)}
  else if(!isF2(p)&&!(p.gath&&S.storeBuilt)&&S.links[q.id]){const pa=segPath(q.id);if(!pa||pa.some(s=>s.id===p.id))continue;const en=segEnd(q.id);if(en&&!isT(en)){const m=padById(en);if(p.mill||m.k!==p.k)continue}cand(q.id,q.x,q.z,q.y+6,6)}}
 if(!isF2(p)&&!p.mill){const jc=junctionFor(p,px,pz,5);if(jc&&jc.dist<(best?bd:1e9)){best={tgt:jc.tgt,x:jc.x,z:jc.z,y:jc.y}}}
 return best}
function startLink(p){LINK.from=p;UI.toast(p.gath&&S.storeBuilt?'Walk to the Log Storage or to a belt':p===FAC2B?'Walk to the Stick Lathe':p.fixed?'Walk to the Plank Mill':p.mill?'Walk to a connected machine':'Walk to a Mill or a connected machine');}
function cancelLink(){if(LINK.from){LINK.from=null;UI.toast('Belt cancelled')}}
function tryLink(x,z){if(!LINK.from)return false;const p=LINK.from;const tgt=linkTarget(p,x,z);if(!tgt){cancelLink();return true}
 if(makeLink(p,tgt)){LINK.from=null}return true}
function rebuildLinks(){for(const id in S.links){const p=padById(id);if(!p||!machLv(p)||S.links[id]==='F'){delete S.links[id];continue}}
 const pend=Object.keys(S.links);let guard=0;while(pend.length&&guard++<200){const id=pend.shift(),tg=S.links[id],p=padById(id);if(isT(tg)||SEG[tg]||(jn(tg)&&SEG[jn(tg).id])||(padById(tg)&&padById(tg).mill&&machLv(padById(tg))))buildSeg(p,tg);else if(S.links[jn(tg)?jn(tg).id:tg])pend.push(id);else delete S.links[id]}}
