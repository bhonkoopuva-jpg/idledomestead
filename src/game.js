// ================= GAME STATE =================
const RES=['wood','stone','ore','crystal'];
const RNAME={stick:'Wood',wood:'Wood',stone:'Stone',ore:'Ore',crystal:'Crystal',coins:'Coins'};
const RCOL={stick:'#c98f5a',wood:'#5ff0d8',stone:'#d9b8a4',ore:'#41e0e8',crystal:'#6cb8ff',coins:'#ffd24a'};
const VAL={wood:3,stone:5,ore:9,crystal:20};
const TOOLS=[
 {n:'Rusty Pick',pow:1,yld:1,cost:0,d:'Basic mining kit.'},
 {n:'Iron Pick',pow:1.7,yld:1.25,cost:150,g:{wood:15,stone:10},d:'Cracks ore veins. Faster, more yield.'},
 {n:'Titan Pick',pow:2.8,yld:1.6,cost:650,g:{plank:8,slab:4,ore:6},d:'Breaks crystal clusters.'},
 {n:'Plasma Pick',pow:4.5,yld:2,cost:2400,g:{plank:14,slab:8,stick:6,ore:16,crystal:10},d:'Superheated edge. Very fast.'},
 {n:'Quantum Pick',pow:7,yld:2.6,cost:8500,g:{plank:30,slab:16,stick:14,ore:30,crystal:30},d:'Tears matter apart.'}];
const NT={
 tree:{res:'wood',hard:3.0,yld:3,tier:0,name:'Alien Tree',respawn:[50,80]},
 stone:{res:'stone',hard:3.4,yld:3,tier:0,name:'Stone Rock',respawn:[60,90]},
 ore:{res:'ore',hard:5.2,yld:2,tier:1,name:'Teal Ore',respawn:[90,130]},
 crystal:{res:'crystal',hard:7.5,yld:1.3,tier:2,name:'Crystal Cluster',respawn:[130,190]}};
TOOLS.forEach(t=>{if(t.g&&t.g.crystal){t.g.ore=(t.g.ore||0)+t.g.crystal*2;delete t.g.crystal}});
const MK={wood:{n:"Tree Harvester",base:250,rate:.585,g:{wood:10}},stone:{n:'Mining Rig',base:320,rate:.4,g:{wood:12,stone:6}},ore:{n:'Ore Rig',base:900,rate:.22,g:{plank:4,slab:2}},crystal:{n:'Crystal Rig',base:3000,rate:.15,g:{plank:10,slab:8,ore:8}}};
const buildAll=p=>Object.assign({coins:mkOf(p).base},mkOf(p).g);
const MAXLV=8;
const SAVEKEY='idle-domestead-3d-v4';
function freshState(){return {v:1,coins:0,inv:{wood:0,stone:0,ore:0,crystal:0},tool:0,base:{},rescued:0,spd:1,up:{cargo:0,boost:0,reach:0,battery:0,refine:0,dspeed:0,dcargo:0,dtier:0,fthru:0,fbuf:0,belt:0},fac:{},links:{},feeder:0,auto:0,remote:0,drones:0,unl:[1,0,0,0,0,0,0,0,0,0],paid:[{},{},{},{},{},{},{},{},{},{}],mach:{},mcl:{},f2cl:0,qa:[0,1],qnext:2,stats:{wood:0,stone:0,ore:0,crystal:0,sold:0,earned:0,built:0},sol:1,playT:0,sound:1,saved:Date.now(),seenIntro:0}}
let S=freshState();
function loadSave(){try{const j=localStorage.getItem(SAVEKEY);if(j){const o=JSON.parse(j);const f=freshState();S=Object.assign(f,o);S.inv=Object.assign(f.inv,o.inv);S.up=Object.assign(f.up,o.up);S.stats=Object.assign(f.stats,o.stats)}}catch(e){}}
let saveTimer=0;
let NOSAVE=0;function save(){if(NOSAVE)return;try{S.saved=Date.now();S.pos=[+P.x.toFixed(2),+P.z.toFixed(2)];S.f2in=FAC2.in||0;S.f2buf=FAC2.buf||0;{const o={},m={},c={};for(const p of PADS){if(p.buf>0)o[p.id]=p.buf;if(p.mi>0)m[p.id]=p.mi;if(p.carry>0)c[p.id]=p.carry}S.pbuf=o;S.pmi=m;S.pcar=c;S.items=ECON.items.filter(it=>!it.done).map(it=>[it.k,it.path.map(s=>s.id).join(','),+it.d.toFixed(2),it.dest||''])}localStorage.setItem(SAVEKEY,JSON.stringify(S))}catch(e){}}
const cap=()=>60+40*S.up.cargo;
const toolPow=()=>TOOLS[S.tool].pow;
const reach=()=>3.5+.45*S.up.reach;
const bl=id=>(S.base&&S.base[id])||0;
const EV={pod:null,next:70+Math.random()*50,surge:0,bar:null};const machMul=()=>EV.surge>0?1.5:1;
const droneMul=()=>(1+.15*bl('dish'));
const regrowMul=()=>1+.35*bl('dome');
const refineMul=()=>(1+.1*S.up.refine)*(1+.1*bl('pad'));

// ================= LAYOUT (home) =================
const START={x:0,z:7};
const SELL={x:LAY.sell.x,z:LAY.sell.z};           // factory intake pad
const FAC_R=[10.7,11.1,11.1,10.2,9.0,9.2,9.2,9.1,9.0,8.9,8.6,8.5,8.3,8.1,7.9,7.5,8.1,9.3,10.2,10.8,11.1,11.1,11.0,10.7,10.2,9.2,9.2,9.5,8.6,7.5,7.8,7.1,7.7,7.6,7.2,8.3,8.4,8.6,8.6,8.2,8.7,8.7,7.6,7.8,8.0,8.9,10.4,10.6];const FACT={x:LAY.uc.x,z:LAY.uc.z};const FACT2={x:LAY.store.x,z:LAY.store.z};const FACROT=LAY.uc.r;const FACH=LAY.uc.h||0,F2H=LAY.store.h||0,SELH=LAY.sell.h||0,FACS=LAY.uc.s||1,F2S=LAY.store.s||1;
const HOPPER={x:15,z:-2};
const PADS=[];
const HOME_PADS=[{x:-6,z:12,k:'wood'},{x:18,z:10,k:'stone'},{x:-13,z:-9,k:'ore'}];
// home pads removed: only the area-1 gatherer and later-zone machines remain
ZONES.forEach((z,zi)=>{(z.pads||[]).forEach((p,i)=>PADS.push({id:z.id+i,x:z.x+p.x,z:z.z+p.z,k:p.k,zone:zi,mill:p.mill?1:0,gath:p.gath?1:0,h:(LAY.pads[z.id+i]||{}).h||0,sc:(LAY.pads[z.id+i]||{}).s||1}))});
PADS.forEach(p=>{if(p.gath){let c=ZONES[p.zone].clusters[0],bd=1e9;for(const cc of ZONES[p.zone].clusters){if(cc.type!=='tree')continue;const d=Math.hypot(cc.x-p.x,cc.z-p.z);if(d<bd){bd=d;c=cc}}p.wx=c.x+c.r*.72;p.wz=c.z+2}});

// ================= COLONY BASE =================
const BASE=[
 {id:'solar',name:'Solar Array',a:245,max:3,clr:6,col:'#ffd35a',d:'+14 power per level. Machines, the Upgrade Center and drones all draw power.',cost:l=>({coins:[400,1400,4200][l],plank:[15,35,70][l],ore:[10,25,50][l]})},
 {id:'dome',name:'Greenhouse Dome',a:62,max:3,clr:5,col:'#7ff0c8',d:'Trees regrow 35% faster, per level.',cost:l=>({coins:[500,1600,4500][l],slab:[12,30,60][l],plank:[8,20,40][l],ore:[3,8,16][l]})},
 {id:'dish',name:'Comms Dish',a:200,max:3,clr:4,col:'#9ad0ff',d:'Drones fly and work 15% faster, per level.',cost:l=>({coins:[700,2200,5500][l],stick:[10,24,48][l],ore:[6,14,28][l]})},
 {id:'pad',name:'Landing Pad',a:105,max:3,clr:7,col:'#ffe28a',d:'Sends a Rover along the ring road and adds +10% sale value, per level.',cost:l=>({coins:[900,3000,7500][l],slab:[25,55,100][l],plank:[12,28,50][l],ore:[4,12,24][l]})},
 {id:'homes',name:'Colonist Homes',a:265,max:3,clr:6,col:'#ffd7a0',d:'Homes for the first settlers. Each level adds a row of houses.',cost:l=>({coins:[6000,15000,35000][l],plank:[20,40,80][l],slab:[15,30,60][l],stick:[10,25,50][l]})},
 {id:'beacon',name:'Welcome Beacon',a:95,max:1,clr:4,col:'#fff0a0',d:'Calls the settlers. When it lights up, a ship leaves Earth for Mars.',cost:l=>({coins:60000,plank:60,stick:40,slab:40,crystal:20})},
 {id:'air',name:'Atmosphere Processor',a:60,max:1,clr:5,col:'#bfe6ff',d:'Thickens the thin air. The sky softens and the dust settles.',cost:l=>({coins:4000,slab:20,stick:10,crystal:10})},
 {id:'water',name:'Water Extractor',a:195,max:1,clr:5,col:'#7ad4ff',d:'Draws water from the ground. Small pools appear on the plains.',cost:l=>({coins:9000,slab:30,stick:20,ore:20,crystal:10})},
 {id:'bio',name:'Bio Seeder',a:335,max:1,clr:6,col:'#a8e07a',d:'Seeds the first plants. Green spreads across the flats.',cost:l=>({coins:20000,plank:40,stick:20,slab:30,crystal:15})},
 {id:'reactor',name:'Quantum Reactor',a:287,max:2,clr:5,col:'#58ecff',d:'Fusion core: +60 power per level.',cost:l=>({coins:[6000,20000][l],slab:[10,25][l],stick:[10,25][l],crystal:[5,12][l]})}];
BASE.forEach(b=>{const bp=BASE_POS[b.id],a=bp.a*Math.PI/180;b.a=bp.a;b.x=Math.cos(a)*bp.r;b.z=Math.sin(a)*bp.r;b.y=gy(b.x,b.z);b.obj=null;b.ghost=null;b.lbl=null});
const BMAK={homes:()=>makeHomes(),beacon:()=>makeBeacon(),air:()=>makeAir(),water:()=>makeWater(),bio:()=>makeBio(),solar:()=>makeSolar(),dome:()=>makeDome(),dish:()=>makeDish(),pad:()=>makePad(),reactor:()=>makeReactor()};
const BCOLR={homes:4.5,beacon:2.4,air:3.2,water:3.6,bio:4,solar:4.6,dome:3.3,dish:2.4,pad:0,reactor:3.3};
function baseCanAfford(b){const l=bl(b.id);if(l>=b.max)return false;return canPay(b.cost(l))}
function showBase(b,pop){if(!BASE_ON)return;if(b.obj){scene.remove(b.obj);b.obj=null}const l=bl(b.id);if(b.ghost)b.ghost.visible=!l;if(!l)return;
 const o=BMAK[b.id]();if(o.userData.levels)o.userData.levels.forEach((gr,i)=>{gr.visible=i<l});o.position.set(b.x,b.y,b.z);o.rotation.y=Math.atan2(-b.x,-b.z);scene.add(o);b.obj=o;b.pop=pop?1:0;if(pop)o.scale.setScalar(.01);}
function buildBase(b){const l=bl(b.id);if(l>=b.max)return false;if(!baseCanAfford(b)){AU.deny();UI.toast('Not enough resources',1);return false}
 payCost(b.cost(l));
 S.base[b.id]=l+1;S.stats.built++;showBase(b,true);
 for(let i=0;i<48;i++){const a=i/48*6.283;chips(b.x+Math.cos(a)*b.clr,gy(b.x,b.z)+.5,b.z+Math.sin(a)*b.clr,b.col,1,7,.26,1.3,2,10)}
 chips(b.x,b.y+2,b.z,'#ffe9a0',50,11,.3,1.3,1.5);AU.unlock();shake=.5;{const ST={solar:['THE COLONY HAS POWER','The first step toward a home'],dome:['FIRST GREEN ON MARS','Something is growing here'],dish:['CONTACT WITH EARTH','They can hear you now'],pad:['A PLACE TO LAND','Mars is ready for visitors'],reactor:['A HEART FOR THE CITY','Power for thousands'],homes:['THE FIRST HOMES','Someone is going to live here'],beacon:['THE BEACON IS LIT','A ship leaves Earth for Mars'],air:['THE SKY IS CHANGING','Mars starts to breathe'],water:['WATER ON MARS','The first pools appear'],bio:['LIFE TAKES ROOT','Green spreads across the plains']};const s=ST[b.id];UI.banner(l?b.name.toUpperCase()+' LV '+(l+1):(s?s[0]:'BASE BUILT'),l?b.name:(s?s[1]:b.name))}
 if(b.id==='pad')syncRovers();if(b.id==='beacon')startFinale();UI.pulse('coins');save();return true}
const BASE_ON=true;const _skyC=new THREE.Color('#9fbfdc');
function setupBase(){if(!BASE_ON)return;if(S.won>=1){spawnShip(S.won>=2)}BASE.forEach(b=>{const g=padRing(b.col,b.x,b.z,2.1);g.position.set(b.x,b.y+.2,b.z);scene.add(g);b.ghost=g;const lab=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTex(b.name.toUpperCase(),'BUILD SITE'),transparent:true,depthWrite:false,fog:false}));lab.scale.set(8.5,3.3,1);lab.position.set(0,5.2,0);g.add(lab);showBase(b,false)})}

// ---- finale: the settlers arrive ----
const SHIP={obj:null,t:0,land:null};
function shipTarget(){const b=BASE.find(q=>q.id==='pad');return b?{x:b.x,z:b.z,y:gy(b.x,b.z)+.6}:{x:0,z:20,y:0}}
function spawnShip(parked){const t=shipTarget();const o=makeShip();o.position.set(t.x,parked?t.y:t.y+90,t.z);scene.add(o);SHIP.obj=o;SHIP.land=t;SHIP.t=parked?99:0}
function startFinale(){if(SHIP.obj)return;S.won=S.won||1;spawnShip(false);UI.banner('THE SETTLERS ARE COMING','A ship is on its way to the Landing Pad');save()}
function shipStep(dt){const o=SHIP.obj;if(!o)return;const t=SHIP.land;if(SHIP.t<99){SHIP.t+=dt;const k=Math.min(1,SHIP.t/9),e=1-Math.pow(1-k,3);o.position.y=t.y+90*(1-e);o.rotation.y+=dt*.25*(1-k);if(o.userData.flame){o.userData.flame.visible=k<1;o.userData.flame.scale.setScalar(.8+Math.random()*.4)}
  if(Math.random()<dt*20&&k<1)chips(t.x,o.position.y-2,t.z,'#ffd9a0',2,5,.3,1.2,-1);
  if(k>=1){SHIP.t=99;shake=.6;chips(t.x,t.y+.5,t.z,'#ffe9a0',60,12,.35,1.5,1.5);AU.unlock();S.won=2;UI.banner('WELCOME HOME','The settlers have arrived. Mars is home now.');save()}}}
function baseStep(dt){if(!BASE_ON)return;shipStep(dt);const t=performance.now()*.001;
 {const qi=S.qa[0];if(qi!==baseStep.lastQ){baseStep.lastQ=qi;const q=QUESTS[qi],o=q&&q.at?q.at():null;if(o&&BASE.includes(o))S.track={x:o.x,z:o.z,t:90}}}
 {const k=Math.min(1,dt*.6),ta=bl('air')?1:0,tw=bl('water')?1:0,tg=bl('bio')?1:0;TERRA.a.value+=(ta-TERRA.a.value)*k;TERRA.w.value+=(tw-TERRA.w.value)*k;TERRA.g.value+=(tg-TERRA.g.value)*k;const m=TERRA.a.value*.4;scene.fog.color.set('#e6987a').lerp(_skyC,m);scene.background.set('#dc7d52').lerp(_skyC,m)}
 for(const b of BASE){const lv=bl(b.id);
  if(!lv){const aq=QUESTS[S.qa[0]],tg=aq&&aq.at?aq.at():null;const near=tg===b&&Math.hypot(P.x-b.x,P.z-b.z)<140;b.ghost.visible=near;if(!near)continue;const pu=.5+.5*Math.sin(t*3+b.a);b.ghost.userData.m1.material.opacity=.35+.4*pu;b.ghost.userData.m2.material.opacity=.08+.1*pu;continue}
  const o=b.obj;if(!o)continue;
  if(b.pop>0){b.pop=Math.max(0,b.pop-dt*2.2);const k=1-b.pop;o.scale.setScalar(Math.max(.01,k<.7?k/.7*1.12:1.12-(k-.7)/.3*.12))}
  if(b.id==='dish'){o.userData.dish.rotation.y+=dt*.5*(1+lv*.4)}
  else if(b.id==='reactor'){o.userData.rings.forEach((r,i)=>{r.rotation.z+=dt*(1.2+i*.6)*(i%2?-1:1)});o.userData.core.material.emissiveIntensity=1.3+.5*Math.sin(t*3);if(Math.random()<dt*5)chips(b.x+(Math.random()-.5)*2,b.y+5,b.z+(Math.random()-.5)*2,'#8ff4ff',1,2,.1,1.2,2.5,-2)}
  else if(b.id==='dome'){if(Math.random()<dt*2.5)chips(b.x+(Math.random()-.5)*3,b.y+2.4,b.z+(Math.random()-.5)*3,'#9ff8e0',1,1.4,.1,1.6,1.4,-1)}}}
// ---- rovers on the ring road ----
const rovers=[];
function roverTotal(){return bl('pad')+(S.rescued?1:0)}
function syncRovers(){while(rovers.length<roverTotal()){const o=makeRover();o.scale.setScalar(1.25);scene.add(o);const i=rovers.length;rovers.push({o,u:(i*.37)%1,dir:i%2?-1:1,sp:.011+i*.0017})}}
function ringPos(u,off){const a=(RING_A0+(RING_A1-RING_A0)*u)*Math.PI/180,r=RING_R+off;return [Math.cos(a)*r,Math.sin(a)*r,a]}
function roverStep(dt){syncRovers();const t=performance.now()*.001;for(const r of rovers){r.u+=r.dir*r.sp*dt*(1+bl('reactor')*.4);if(r.u>1){r.u=1;r.dir=-1}if(r.u<0){r.u=0;r.dir=1}
  const [x,z,a]=ringPos(r.u,r.dir>0?-.8:.8);const y=gy(x,z);const ox=r.o.position.x,oz=r.o.position.z;r.o.position.set(x,y+.05,z);
  const hd=Math.atan2(-Math.sin(a)*r.dir,Math.cos(a)*r.dir);r.o.rotation.y=angLerp(r.o.rotation.y,hd,Math.min(1,dt*8));
  r.o.rotation.x=0;r.o.userData.tip.material.color.setScalar(.55+.45*Math.sin(t*5+r.u*9));if(Math.random()<dt*7)chips(x-Math.sin(r.o.rotation.y)*1.1,y+.2,z-Math.cos(r.o.rotation.y)*1.1,'#e0a078',1,1.5,.15,.7,.5,4)}}
// ---- the lost rover (rescue quest) ----
const LOST={x:-114,z:12,obj:null,beam:null};
function setupLost(){LOST.y=gy(LOST.x,LOST.z);if(S.rescued)return;const o=makeRover();o.scale.setScalar(1.35);o.position.set(LOST.x,LOST.y,LOST.z);o.rotation.set(0,.8,.12);scene.add(o);LOST.obj=o;
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,1.6,22,16,1,true),new THREE.MeshBasicMaterial({color:'#ff7a5a',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));beam.position.set(LOST.x,LOST.y+11,LOST.z);scene.add(beam);LOST.beam=beam;
 const g=padRing('#ff9a6a',LOST.x,LOST.z,1.6);g.position.set(LOST.x,LOST.y+.2,LOST.z);scene.add(g);LOST.ring=g}
function lostStep(dt){if(S.rescued||!LOST.obj)return;const t=performance.now()*.001;LOST.beam.material.opacity=.15+.1*Math.sin(t*4);LOST.ring.userData.m1.material.opacity=.4+.4*(.5+.5*Math.sin(t*4));LOST.obj.userData.tip.material.color.setScalar(Math.sin(t*9)>0?1:.2);
 if(Math.hypot(P.x-LOST.x,P.z-LOST.z)<5){S.rescued=1;scene.remove(LOST.obj);scene.remove(LOST.beam);scene.remove(LOST.ring);LOST.obj=null;chips(LOST.x,LOST.y+2,LOST.z,'#ffe9a0',60,10,.3,1.4,1.5);AU.unlock();shake=.4;UI.banner('ROVER RESCUED','It rejoins the colony');syncRovers();save()}}

// ================= RANDOM EVENTS: supply pods and solar surges =================
function podSpawn(){for(let a=0;a<14;a++){const an=Math.random()*6.283,d=14+Math.random()*12,x=P.x+Math.cos(an)*d,z=P.z+Math.sin(an)*d;const ow=ownerOf(x,z);if(ow>0&&!S.unl[ow])continue;if(ow<0)continue;if(Math.hypot(x-FACT.x,z-FACT.z)<14||Math.hypot(x-FACT2.x,z-FACT2.z)<10)continue;
  const y=gy(x,z);const g=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.9,18,12),new THREE.MeshStandardMaterial({color:'#ffd9a0',roughness:.45,emissive:'#ff9a4a',emissiveIntensity:.5}));body.scale.set(1,.8,1);body.position.y=1;g.add(body);const band=new THREE.Mesh(new THREE.TorusGeometry(.92,.12,8,24),new THREE.MeshStandardMaterial({color:'#38d6c8',roughness:.4,emissive:'#38d6c8',emissiveIntensity:.6}));band.rotation.x=Math.PI/2;band.position.y=1;g.add(band);const cap=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshBasicMaterial({color:'#9ff9ff'}));cap.position.y=1.8;g.add(cap);g.position.set(x,y,z);scene.add(g);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,1.1,26,14,1,true),new THREE.MeshBasicMaterial({color:'#ffcf6a',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));beam.position.set(x,y+13,z);scene.add(beam);
  const ring=padRing('#ffcf6a',x,z,1.2);ring.position.set(x,y+.2,z);scene.add(ring);
  EV.pod={x,z,y,g,beam,ring,t:100,fall:1.2};chips(x,y+1,z,'#ffe9a0',30,9,.25,1.2,1.2);UI.banner('SUPPLY POD','A pod landed nearby. Grab it!');AU.unlock();return true}return false}
function podClear(){const p=EV.pod;if(!p)return;scene.remove(p.g);scene.remove(p.beam);scene.remove(p.ring);EV.pod=null}
function podReward(){const p=EV.pod;const r=Math.random();let txt;
 if(r<.65){const n=Math.max(40,Math.min(6000,Math.round(40+S.stats.earned*.04)));addCoins(n);txt='+'+fmtC(n)+' coins'}
 else{const ks=['wood','stone'];if(S.stats.ore>0)ks.push('ore');if(S.stats.crystal>0)ks.push('crystal');const k=ks[Math.floor(Math.random()*ks.length)];const room=Math.max(0,cap()-S.inv[k]);const n=Math.min(room,Math.max(8,Math.ceil(cap()*.18)));S.inv[k]+=n;S.stats[k]+=n;UI.pulse(k);txt='+'+n+' '+RNAME[k].toLowerCase()}
 chips(p.x,p.y+1.5,p.z,'#ffe9a0',50,10,.3,1.3,1.4);floater(p.x,p.y+4,p.z,txt,'#ffd24a',1);UI.banner('POD OPENED',txt);AU.coin(0);shake=.25;podClear();save()}
function eventStep(dt){if(EDIT.on)return;
 if(EV.surge>0){EV.surge-=dt;if(EV.surge<=0){EV.surge=0;UI.toast('Solar surge ended')}}
 if(!EV.bar){const b=document.createElement('div');b.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 58px);left:50%;transform:translateX(-50%);padding:5px 14px;border-radius:999px;background:linear-gradient(#ffe08a,#ffc24a);color:#6a3a08;font:700 13px Fredoka,system-ui,sans-serif;box-shadow:0 3px 10px rgba(80,30,0,.3);display:none;z-index:20;pointer-events:none';document.body.appendChild(b);EV.bar=b}
 if(EV.surge>0){EV.bar.style.display='block';EV.bar.textContent='☀ Solar surge: +50% production · '+Math.ceil(EV.surge)+'s'}else EV.bar.style.display='none';
 const p=EV.pod;
 if(p){const t=performance.now()*.001;p.t-=dt;p.fall=Math.max(0,p.fall-dt*1.6);p.g.position.y=p.y+p.fall*18+Math.sin(t*2)*.12;p.g.rotation.y+=dt*.6;p.beam.material.opacity=.18+.1*Math.sin(t*4);p.ring.userData.m1&&(p.ring.userData.m1.material.opacity=.4+.4*(.5+.5*Math.sin(t*4)));
  if(p.fall<=0&&Math.hypot(P.x-p.x,P.z-p.z)<4.6){podReward();return}
  if(p.t<=0){podClear();UI.toast('The supply pod faded away')}
  return}
 if(S.playT<60||EV.surge>0)return;EV.next-=dt;if(EV.next>0)return;EV.next=110+Math.random()*90;
 const hasM=Object.keys(S.mach).length>0;
 if(hasM&&Math.random()<.4){EV.surge=45;UI.banner('SOLAR SURGE','+50% production for 45s');AU.unlock();shake=.2}else podSpawn()}
// ================= NODES =================
const nodes=[];const VAR={};
function variant(type,kind,v){const k=type+kind+v;if(VAR[k])return VAR[k];seed=v*977+type.length*31+kind.length*7+11;let g;
 if(type==='tree')g=makeTree(kind,1,v+1);else if(type==='stone')g=makeStoneStage(3,v+1);else if(type==='ore')g=makeGeode(3,v+1);else g=makeCrystal(1,v+1);
 return VAR[k]=bake(g)}
const SV={};function stageObj(n,stage){const v=n.id%2,k=n.type+n.kind+stage+v;if(!SV[k]){seed=900+stage*7+v;SV[k]=bake(n.type==='tree'?makeTreeStage(n.kind,stage,v+1):n.type==='stone'?makeStoneStage(stage,v+1):n.type==='ore'?makeOreStage(stage,v+1):makeCrystalStage(stage,v+1))}return SV[k].clone()}
const RB={};function rubble(type){if(RB[type])return RB[type].clone();const cols=type==='stone'?['#c0704e','#a05a40','#b8886e']:type==='ore'?['#2fb0ac','#1f8a98','#3cc8c0']:['#8a7a70','#6ab8ff','#9a8a80'];const gr=new THREE.Group();seed=type.length*13+3;
 for(let i=0;i<9;i++){const a=R()*6.283,d=R()*1.3,s=RR(.14,.4);const b=new THREE.Mesh(blobGeo(s,{sy:.7,top:cols[i%3],bot:'#5a3a30',amp:.18,detail:2,sd:i,off:[Math.cos(a)*d,s*.3,Math.sin(a)*d]}),clay({roughness:.8}));gr.add(b)}
 if(type==='crystal')for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.18),lootMat.crystal);c.scale.y=2;c.position.set(RR(-.6,.6),.3,RR(-.6,.6));gr.add(c)}
 gr.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});RB[type]=bake(gr);return RB[type].clone()}
const stumpGeo=new THREE.CylinderGeometry(.7,1.0,.7,14);const stumpMat=new THREE.MeshStandardMaterial({color:'#8c8e9a',roughness:.9});
let nid=0;
function spawnNode(type,kind,x,z,sc,zi,v){if(type==='stone'&&typeof SCAN2!=='undefined'&&(v==null||v<3))v=nid%SCAN2.length;sc*=1.35;if(type==='stone')sc*=.96;
 const rot=R()*6.28;const obj=variant(type,kind,v).clone();const base=type==='tree'?.82:1;
 const y=gy(x,z);obj.position.set(x,y,z);obj.rotation.y=rot;obj.scale.setScalar(sc*base);scene.add(obj);
 const stump=new THREE.Mesh(stumpGeo,stumpMat);stump.position.set(x,y+.2,z);stump.scale.setScalar(sc*.9);stump.visible=false;stump.castShadow=true;if(type==='tree')scene.add(stump);
 const r=type==='tree'?1.15*sc:type==='stone'?1.25*sc:type==='ore'?1.05*sc:.95*sc;
 const n={id:nid++,v,type,kind,x,z,y,sc,base,rot,obj,stump,r,prog:0,alive:true,t:0,grow:1,shake:0,rsv:null,zone:zi,hitT:0,cd:0};
 nodes.push(n);return n}
function placeZoneNodes(zi){const z=ZONES[zi];seed=zi*131+17;const placed=[];
 const free=(x,zz,rad,gap=2.2)=>{rad*=1.35;if(PADS.some(q=>q.gath&&Math.hypot(x-q.wx,zz-q.wz)<rad+5.5))return false;if(zi===1&&Math.hypot(x-FACT2.x,zz-FACT2.z)<12)return false;if(zi===0&&(Math.hypot(x,zz)<26||(x>-14&&x<18&&zz>10&&zz<28)))return false;if(zi>0){if(ownerOf(x,zz)!==zi||terrS(z,x,zz)<rad+3)return false}else if(terrS(z,x,zz)<rad+3)return false;
  for(const g of GATES)if(Math.hypot(x-g.x,zz-g.z)<8)return false;
  for(const c of craters)if(Math.hypot(x-c.x,zz-c.z)<c.R*.9+rad)return false;
  if(zi===0){for(const b of BASE_ON?BASE:[])if(Math.hypot(x-b.x,zz-b.z)<b.clr+rad)return false;{const rr=Math.hypot(x,zz);if(Math.abs(rr-RING_R)<2.2+rad&&!(Math.atan2(zz,x)*57.3>-66&&Math.atan2(zz,x)*57.3<-20))return false}if(Math.hypot(x-FACT.x,zz-FACT.z)<11||Math.hypot(x-SELL.x,zz-SELL.z)<7||Math.hypot(x-START.x,zz-START.z)<4.5||(x>0&&x<32&&zz<-2&&zz>-20&&Math.hypot(x-HOPPER.x,zz-HOPPER.z)<7))return false}
  for(const p of PADS)if(Math.hypot(x-p.x,zz-p.z)<5.2+rad)return false;
  for(const q of placed)if(Math.hypot(x-q.x,zz-q.z)<q.r+rad+gap)return false;return true};
 const put=(type,kind,x,zz,sc,v)=>{const n=spawnNode(type,kind,x,zz,sc,zi,v);if(type==='stone'&&sc>=1.6)n.big=2.2;if(zi>0&&!S.unl[zi])n.obj.visible=false;placed.push({x,z:zz,r:n.r});return n};
 const rnd=(type,kind,tries=40)=>{for(let t=0;t<tries;t++){const p=zonePoint(z,3,R);if(!p)continue;const x=p[0],zz=p[1];const sc=type==='tree'?RR(.78,1.1):type==='stone'?RR(.65,1.2):type==='ore'?RR(.8,1.3):RR(.8,1.25);const rad=(type==='tree'?1.2:1.3)*sc;if(free(x,zz,rad)){put(type,kind,x,zz,sc,Math.floor(R()*3));return}}};
 if(zi===0){ // hand-placed starter cluster near the robot
  [['tree','teal',-20,-14,.95],['tree','deep',-9,-18,1.45],['stone','',-23,2,1.8],['stone','',-22,9,1.65],['stone','',-27,5,1.9],
   ['tree','teal',12,-12,1.0],['tree','blue',16,-15,.95],['tree','teal',14,-19,1.05],
   ['tree','teal',-3,18,.95],['tree','teal',8,21,1.0],
   ['stone','',22,2,1.0],['stone','',25,5,.9],['stone','',23,8,.95]].forEach(([t,k,x,zz,sc],i)=>put(t,k,x,zz,sc,i%3))
  const hk=['teal','deep','blue'];for(let i=0;i<22;i++)rnd('tree',hk[i%3]);for(let i=0;i<14;i++)rnd('stone','');for(let i=0;i<4;i++)rnd('ore','')}
 else{
  for(const c of (z.clusters||[])){let made=0;for(let t=0;t<c.n*40&&made<c.n;t++){const a=R()*6.283,rr=Math.sqrt(R())*c.r;const ex=c.ex||1,x=c.x+c.r*(ex-1)*.8+Math.cos(a)*rr*ex,zz=c.z+Math.sin(a)*rr;const sc=RR(c.s[0],c.s[1]);const rad=(c.type==='tree'?1.2:1.3)*sc;if(free(x,zz,rad,.9)){put(c.type,c.kinds?c.kinds[made%c.kinds.length]:'',x,zz,sc,Math.floor(R()*3));made++}}}
  const NM=2.6,T=z.trees;for(let i=0;i<T.n*NM;i++)rnd('tree',T.kinds[i%T.kinds.length]);for(let i=0;i<z.stone*NM;i++)rnd('stone','');for(let i=0;i<z.ore*NM;i++)rnd('ore','');for(let i=0;i<z.crystal*NM;i++)rnd('crystal','')}}
// ================= PADS & MACHINES =================
const padRing=(c,x,z,s=1)=>{const g=new THREE.Group();const y0=gy(x,z);
 const ringG=new THREE.RingGeometry(2.1*s,2.7*s,64,2);const discG=new THREE.CircleGeometry(2.1*s,48,0,6.2832);
 for(const G of [ringG,discG]){const p=G.attributes.position;for(let k=0;k<p.count;k++){const lx=p.getX(k),ly=p.getY(k);p.setZ(k,gy(x+lx,z-ly)-y0)}G.rotateX(-Math.PI/2);}
 const m1=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));g.add(m1);
 const m2=new THREE.Mesh(discG,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.16,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m2.position.y=.03;g.add(m2);g.userData.m1=m1;g.userData.m2=m2;return g};
const PCOL={wood:'#58f0d0',stone:'#ffc08a',ore:'#4fdcff',crystal:'#7aa8ff'};
function tintYellow(o,hex){const th={};new THREE.Color(hex).getHSL(th);const cache=new Map();o.traverse(m=>{if(!m.isMesh)return;const arr=Array.isArray(m.material);const mats=arr?m.material:[m.material];const nm=mats.map(mt=>{if(!mt||!mt.color)return mt;const h={};mt.color.getHSL(h);if(h.h>.08&&h.h<.17&&h.s>.45){if(!cache.has(mt)){const c=mt.clone();c.color.setHSL(th.h,Math.min(1,h.s*.85),h.l);if(c.emissive&&c.emissive.getHex()){const e={};c.emissive.getHSL(e);c.emissive.setHSL(th.h,e.s,e.l)}cache.set(mt,c)}return cache.get(mt)}return mt});m.material=arr?nm:nm[0]})}
function setupPad(p){p.ring=padRing(p.mill?'#ffd24a':PCOL[p.k],p.x,p.z);p.y=gy(p.x,p.z)+p.h;p.ring.position.set(p.x,p.y+.2,p.z);p.ring.visible=false;scene.add(p.ring);p.obj=null;p.acc=0;p.work=0;p.dust=0;if(p.gath)mkGhost(p)}
function mkGhost(p){const gr=padRing('#ffd24a',p.x,p.z,1.3);gr.position.set(p.x,gy(p.x,p.z)+.2+p.h,p.z);gr.visible=false;scene.add(gr);p.ghost=gr}
function padOpen(p){return S.unl[p.zone]===1&&(p.k!=='stick'||PADS.some(q=>q.mill&&q.k==='stone'&&machLv(q)))}
function machLv(p){return p.id==='FAC2'||p.id==='FAC2b'?1:S.mach[p.id]||0}
const gcarry=p=>GCARRY+4*Math.max(0,machLv(p)-1);
function machRate(p){const l=machLv(p);return l?mkOf(p).rate*(p.gath?1:Math.pow(1.5,l-1))*machMul():0}
function buildCost(p){return mkOf(p).base}
function upCost(p){const l=machLv(p);return Math.round(mkOf(p).base*.7*Math.pow(1.75,l-1))}
function showMachine(p){if(p.obj){scene.remove(p.obj);p.obj=null}if(p.gobj){scene.remove(p.gobj);p.gobj=null}const l=machLv(p);if(!l)return;
 if(p.gath){const c=ZONES[p.zone].clusters[0];p.ux=p.x-4.5;p.uz=p.z-2.5;
  const ch=makeLogDepot();ch.scale.setScalar(.91*(p.sc||1));ch.position.set(p.x,p.y,p.z);ch.rotation.y=0;scene.add(ch);p.obj=ch;
  const go=makeGatherer();go.scale.setScalar(1.6875);go.position.set(p.wx,gy(p.wx,p.wz),p.wz);go.rotation.y=-1.57;scene.add(go);p.gobj=go;if(PADS.filter(q=>q.gath).indexOf(p)>0){tintYellow(ch,'#a98be0');tintYellow(go,'#a98be0')}
  p.gst='seek';p.carry=0;p.gt=0;p.tn=null;p.pop=0;return}
 const o=p.mill?(p.k==='stone'?makeSlabPress():p.k==='stick'?makeStickLathe():makeSawmill(true)):p.k==='wood'?makeHarvester():makeDrill();o.scale.setScalar((p.mill?1:p.k==='wood'?1.25:1.35)*(p.sc||1));o.position.set(p.x,p.y,p.z);o.rotation.y=p.mill?0:-.5+(p.x*.37%1);scene.add(o);p.obj=o;p.pop=0}
function gathStep(p,dt){const o=p.gobj,sat=ECON.sat||1,a=performance.now()*.001,lg=o.userData.logs;
 if((p.buf||0)>=(S.links[p.id]?MBUF:GBUF)&&p.gst!=='to'&&p.gst!=='unl'){p.blocked=1;return}p.blocked=0;
 const go=(tx,tz)=>{const dx=tx-o.position.x,dz=tz-o.position.z,d=Math.hypot(dx,dz);if(d<.6)return true;const st=Math.min(d,13*(1+.1*(machLv(p)-1))*sat*dt);o.position.x+=dx/d*st;o.position.z+=dz/d*st;o.position.y=gy(o.position.x,o.position.z);
  let da=Math.atan2(dx,dz)-o.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));o.rotation.y+=da*Math.min(1,dt*6);o.position.y+=Math.sin(a*14)*.04;return false};
 const pickTree=()=>{let b=null,bd=1e9;for(const n of nodes){if(n.type!=='tree'||!n.alive||n.zone!==p.zone)continue;const d=Math.hypot(n.x-p.wx,n.z-p.wz);if(d<bd){bd=d;b=n}}if(!b)return;p.tn=b;const dx=p.ux-b.x,dz=p.uz-b.z,l=Math.hypot(dx,dz)||1;p.ax=b.x+dx/l*3.6;p.az=b.z+dz/l*3.6};
 if(p.gst==='saw'||p.gst==='seek'){if(!p.tn||!p.tn.alive)pickTree();if(!p.tn){p.gst='saw'}else if(p.gst==='seek'){if(go(p.ax,p.az))p.gst='saw'}}
 if(p.gst==='saw'){if(p.tn){let da=Math.atan2(p.tn.x-o.position.x,p.tn.z-o.position.z)-o.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));o.rotation.y+=da*Math.min(1,dt*5);p.tn.shake=Math.max(p.tn.shake||0,.25)}
  o.userData.saw.rotation.x+=dt*16*sat;o.userData.boom.rotation.x=Math.sin(a*2.2)*.12;
  if(Math.random()<dt*6)chips(o.position.x+Math.sin(o.rotation.y)*2.6,o.position.y+2.2,o.position.z+Math.cos(o.rotation.y)*2.6,'#5ff0d8',1,3,.1,.5,1);if(p.carry>=gcarry(p))p.gst='to'}
 else if(p.gst==='to'){if(go(p.ux,p.uz)){p.gst='unl';p.gt=1.1}}
 else if(p.gst==='unl'){p.gt-=dt;if(p.gt<=0){p.buf=Math.min(S.links[p.id]?MBUF:GBUF,(p.buf||0)+p.carry);p.carry=0;p.gst='back';p.tn=null;AU.pick(1)}}
 else if(p.gst==='back'){if(!p.tn)pickTree();if(!p.tn||go(p.ax,p.az))p.gst='saw'}
 const vis=Math.round(18*Math.min(1,(p.carry||0)/gcarry(p)));lg.forEach((l,i)=>l.visible=i<vis);
 const cl=p.obj.userData.logs,cv=Math.round(cl.length*Math.min(1,(p.buf||0)/10));cl.forEach((l,i)=>l.visible=i<cv);{const ar=p.obj.userData.arm;if(ar){const t=performance.now()*.001;ar.rotation.y=Math.sin(t*.7)*.25}}}
// ================= PARTICLES =================
const MAXP=520;const pg=new THREE.IcosahedronGeometry(1,0);
const pMesh=new THREE.InstancedMesh(pg,new THREE.MeshStandardMaterial({roughness:.7,color:'#fff'}),MAXP);pMesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(MAXP*3),3);pMesh.frustumCulled=false;pMesh.castShadow=false;{const z=new THREE.Matrix4().makeScale(.0001,.0001,.0001);for(let i=0;i<MAXP;i++){pMesh.setMatrixAt(i,z);pMesh.setColorAt(i,new THREE.Color('#fff'))}}scene.add(pMesh);
const PT=[];for(let i=0;i<MAXP;i++)PT.push({on:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,max:1,s:.1,g:20});
let pHead=0;const _c=new THREE.Color();
function chip(x,y,z,color,speed=5,size=.14,life=.8,up=1,g=22){const p=PT[pHead];pHead=(pHead+1)%MAXP;const a=R()*6.283,sp=speed*(.3+R()*.8);p.on=true;p.x=x;p.y=y;p.z=z;p.vx=Math.cos(a)*sp;p.vz=Math.sin(a)*sp;p.vy=sp*(.5+R()*.9)*up;p.life=p.max=life*(.7+R()*.5);p.s=size*(.6+R()*.8);p.g=g;_c.set(color);pMesh.setColorAt(pHead===0?MAXP-1:pHead-1,_c)}
function chips(x,y,z,color,n,speed,size,life,up,g){for(let i=0;i<n;i++)chip(x,y,z,color,speed,size,life,up,g)}
const _o=new THREE.Object3D();
function updateParticles(dt){let dirty=false;for(let i=0;i<MAXP;i++){const p=PT[i];if(!p.on){if(p.vis){_o.position.set(0,-99,0);_o.scale.setScalar(.0001);_o.updateMatrix();pMesh.setMatrixAt(i,_o.matrix);p.vis=false;dirty=true}continue}
  p.life-=dt;if(p.life<=0){p.on=false;continue}p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const gh=gy(p.x,p.z);if(p.y<gh+.05&&p.vy<0){p.y=gh+.05;p.vy*=-.35;p.vx*=.6;p.vz*=.6}
  const k=Math.min(1,p.life/(p.max*.4));_o.position.set(p.x,p.y,p.z);_o.scale.setScalar(p.s*k);_o.rotation.set(p.life*7,p.life*5,0);_o.updateMatrix();pMesh.setMatrixAt(i,_o.matrix);p.vis=true;dirty=true}
 if(dirty){pMesh.instanceMatrix.needsUpdate=true;if(pMesh.instanceColor)pMesh.instanceColor.needsUpdate=true}}
// ---- loot orbs (fly to a target then deliver) ----
function pebbleGeo(r){const gm=new THREE.IcosahedronGeometry(r,3);const p=gm.attributes.position;const cr=[[.6,.5,.62],[-.7,.3,.65],[.1,-.2,.97],[.3,.9,.3]].map(a=>{const v=new THREE.Vector3(...a).normalize();return v});for(let i=0;i<p.count;i++){const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).normalize();let k=1+.07*Math.sin(v.x*5.1+v.y*3.7)*Math.cos(v.z*4.3)+.05*Math.sin(v.y*9+v.z*7);for(const c of cr){const d=v.angleTo(c);if(d<.38)k-=.13*Math.cos(d/.38*Math.PI/2)}k*=1+.12*(v.y-.3*v.x);p.setXYZ(i,v.x*r*k,v.y*r*k*.92,v.z*r*k)}gm.computeVertexNormals();return gm}
function shardGeo(r){const pts=[[0,1.5],[.55,.55],[.55,-.55],[0,-1.5]].map(a=>new THREE.Vector2(a[0]*r,a[1]*r));return new THREE.LatheGeometry(pts,6)}
const LOOT=[];const lootGeo={wood:barkGeo(.26,.26,.8,14),stone:pebbleGeo(.36),ore:shardGeo(.3),crystal:shardGeo(.2),coins:new THREE.CylinderGeometry(.34,.34,.1,16),plank:new THREE.BoxGeometry(.8,.14,.32),slab:new THREE.BoxGeometry(.55,.22,.55)};
const lootMat={wood:LOGMATS,stone:new THREE.MeshStandardMaterial({color:'#c4482c',roughness:.85}),ore:new THREE.MeshStandardMaterial({color:'#3ee0ee',roughness:.2,emissive:'#12b4cc',emissiveIntensity:.9,flatShading:true}),crystal:new THREE.MeshStandardMaterial({color:'#3ee0ee',roughness:.2,emissive:'#12b4cc',emissiveIntensity:.9,flatShading:true}),coins:new THREE.MeshStandardMaterial({color:'#ffd24a',roughness:.3,metalness:.5,emissive:'#c8861a',emissiveIntensity:.5}),plank:new THREE.MeshStandardMaterial({color:'#e6bc76',roughness:.7}),slab:new THREE.MeshStandardMaterial({color:'#9aa3b5',roughness:.8})};
function lootTo(res,amt,from,target,cb,delay=0){const m=new THREE.Mesh(lootGeo[res],lootMat[res]);m.position.copy(from);m.castShadow=false;scene.add(m);
 const a=R()*6.283,sp=3+R()*3;LOOT.push({m,res,amt,v:new THREE.Vector3(Math.cos(a)*sp,6+R()*3,Math.sin(a)*sp),t:-delay,target,cb,phase:0,speed:0});m.visible=delay<=0}
function updateLoot(dt){for(let i=LOOT.length-1;i>=0;i--){const l=LOOT[i];l.t+=dt;if(l.t<0)continue;l.m.visible=true;const tp=l.target();
  if(l.phase===0){l.v.y-=24*dt;l.m.position.addScaledVector(l.v,dt);const gh=gy(l.m.position.x,l.m.position.z)+.3;if(l.m.position.y<gh){l.m.position.y=gh;l.v.y*=-.3;l.v.x*=.7;l.v.z*=.7}if(l.t>.42)l.phase=1}
  else{l.speed=Math.min(40,l.speed+70*dt+5);const d=tp.clone().sub(l.m.position);const dist=d.length();if(dist<.9+l.speed*dt){scene.remove(l.m);LOOT.splice(i,1);l.cb&&l.cb();continue}l.m.position.addScaledVector(d,Math.min(1,l.speed*dt/dist))}
  l.m.rotation.x+=dt*6;l.m.rotation.y+=dt*4}}
// ---- floating texts (DOM) ----
const flEl=document.getElementById('fl');const FL=[];const _v=new THREE.Vector3();
function toScreen(x,y,z,out){_v.set(x,y,z).project(cam);out.x=(_v.x*.5+.5)*innerWidth;out.y=(-_v.y*.5+.5)*innerHeight;out.z=_v.z;return out}
const _s={x:0,y:0,z:0};
function floater(x,y,z,text,color,big){const el=document.createElement('div');el.className='ft'+(big?' big':'');el.textContent=text;el.style.color=color||'#fff';flEl.appendChild(el);FL.push({el,x,y,z,t:0,life:big?1.5:1.1,text});if(FL.length>40){const o=FL.shift();o.el.remove()}}
function updateFloaters(dt){for(let i=FL.length-1;i>=0;i--){const f=FL[i];f.t+=dt;if(f.t>f.life){f.el.remove();FL.splice(i,1);continue}toScreen(f.x,f.y+f.t*2.2,f.z,_s);f.el.style.transform='translate('+_s.x+'px,'+_s.y+'px) translate(-50%,-50%) scale('+(f.t<.12?.5+f.t*4:1)+')';f.el.style.opacity=Math.min(1,(f.life-f.t)*3)}}
// ================= PLAYER =================
const P={x:START.x,z:START.z,vx:0,vz:0,face:Math.PI,robot:null,swing:0,bat:100,tgt:null,hitCd:0,moveTo:null,speedNow:0,bob:0,harvPct:0,harvName:'',blocked:''};
function makeNodesAndWorld(){
 PROPOBJ.length=0;for(const a of LAY.props)PROPOBJ.push(spawnProp(a[0],a[1],a[2],a[3],a[4]));
 if(LAY.nodes&&LAY.nodes.length){seed=4242;for(const [t,k,x,z,s,v,zi,rt] of LAY.nodes){const n=spawnNode(t,k,x,z,s,zi,v);if(rt!=null){n.rot=rt;n.obj.rotation.y=rt}if(t==='stone'&&s>=1.6)n.big=2.2;if(zi>0&&!S.unl[zi])n.obj.visible=false}}
 else for(let i=0;i<ZONES.length;i++)placeZoneNodes(i);
 PADS.forEach(setupPad);
 const rb=makeRobot(1.5);rb.traverse(o=>{if(o.isMesh)o.layers.enable(1)});P.robot=rb;scene.add(rb);}
// ---- tap/joystick input ----
const keys={};addEventListener('keydown',e=>{if(e.target&&/input|textarea/i.test(e.target.tagName))return;keys[e.code]=true;AU.init();if(e.code==='Escape'){cancelLink();UI.closeAll()}if(e.code==='KeyF')UI.open('sell');if(e.code==='KeyM')UI.toggleMute()});addEventListener('keyup',e=>keys[e.code]=false);
const joy={on:false,id:null,ox:0,oy:0,dx:0,dy:0,mag:0};
const jEl=document.getElementById('joy'),jKnob=document.getElementById('jk');
let tapStart=null;
const ptrs=new Map();let pinch=null;
glc.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoomT*Math.exp(e.deltaY*(e.ctrlKey?.01:.0012)))},{passive:false});
glc.addEventListener('pointerdown',e=>{AU.init();ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===2){joy.on=false;joy.mag=0;jEl.style.display='none';tapStart=null;const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:zoomT};return}if(ptrs.size>2||pinch)return;if(joy.on)return;joy.on=true;joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.dx=joy.dy=joy.mag=0;tapStart={x:e.clientX,y:e.clientY,t:performance.now()};glc.setPointerCapture&&glc.setPointerCapture(e.pointerId)});
glc.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId)){ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&ptrs.size>=2){const [a,b]=[...ptrs.values()];setZoom(pinch.z*pinch.d/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)));return}}if(!joy.on||e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const d=Math.hypot(dx,dy),M=58;if(d>14){jEl.style.display='block';jEl.style.left=joy.ox+'px';jEl.style.top=joy.oy+'px'}if(d>M){joy.ox+=dx/d*(d-M);joy.oy+=dy/d*(d-M);dx=dx/d*M;dy=dy/d*M;jEl.style.left=joy.ox+'px';jEl.style.top=joy.oy+'px'}joy.dx=dx/M;joy.dy=dy/M;joy.mag=Math.min(1,Math.hypot(dx,dy)/M);if(d>14)P.moveTo=null;jKnob.style.transform='translate('+dx+'px,'+dy+'px)'});
function endPtr(e){if(!joy.on||e.pointerId!==joy.id)return;joy.on=false;jEl.style.display='none';joy.mag=0;if(tapStart&&performance.now()-tapStart.t<320&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<12)tapGround(e.clientX,e.clientY);tapStart=null}
const upPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;endPtr(e)};glc.addEventListener('pointerup',upPtr);glc.addEventListener('pointercancel',upPtr);
const ray=new THREE.Raycaster(),_p2=new THREE.Vector2();
function tapGround(cx,cy){_p2.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(_p2,cam);const o=ray.ray.origin,d=ray.ray.direction;let t=(P_planeY()-o.y)/d.y;for(let i=0;i<4;i++){const x=o.x+d.x*t,z=o.z+d.z*t;t=(gy(x,z)-o.y)/d.y}}
const P_planeY=()=>gy(P.x,P.z);
const moveMark=new THREE.Mesh(new THREE.RingGeometry(.5,.8,24),new THREE.MeshBasicMaterial({color:'#9ffcff',transparent:true,opacity:.9,depthWrite:false}));moveMark.rotation.x=-Math.PI/2;moveMark.visible=false;scene.add(moveMark);
// ================= COLLISION =================
const PR=1.55;
function collide(){
 for(const n of nodes){if(!n.alive||(n.zone>0&&!S.unl[n.zone]))continue;const dx=P.x-n.x,dz=P.z-n.z;if(Math.abs(dx)>6||Math.abs(dz)>6)continue;const d=Math.hypot(dx,dz),m=n.r+PR;if(d<m&&d>1e-4){P.x=n.x+dx/d*m;P.z=n.z+dz/d*m}}
 for(const p of PADS){if(!p.obj)continue;const dx=P.x-p.x,dz=P.z-p.z,d=Math.hypot(dx,dz),m=1.9+PR;if(d<m&&d>1e-4){P.x=p.x+dx/d*m;P.z=p.z+dz/d*m}}
 for(const b of BASE){if(!BASE_ON||!bl(b.id)||!BCOLR[b.id])continue;const dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz),m=BCOLR[b.id]+PR;if(d<m&&d>1e-4){P.x=b.x+dx/d*m;P.z=b.z+dz/d*m}}
 if(S.unl[1]&&S.storeBuilt){const dx=P.x-FACT2.x,dz=P.z-FACT2.z,cr=Math.cos(LAY.store.r||0),sr=Math.sin(LAY.store.r||0),lx=dx*cr-dz*sr,lz=dx*sr+dz*cr,d=Math.hypot(lx*.75,lz*1.0),m=6.4;if(d<m&&d>1e-4){const k=m/d,nx=lx*k,nz=lz*k;P.x=FACT2.x+nx*cr+nz*sr;P.z=FACT2.z-nx*sr+nz*cr}}
 {const dx=P.x-FACT.x,dz=P.z-FACT.z,d=Math.hypot(dx,dz);if(d>1e-4){const f=((Math.atan2(dz,dx)+(FACROT-.698)+Math.PI*5)%(Math.PI*2))/(2*Math.PI)*48,i0=Math.floor(f)%48,i1=(i0+1)%48,t=f-Math.floor(f),m=FAC_R[i0]*(1-t)+FAC_R[i1]*t+1.2;if(d<m){const k=m/d;P.x=FACT.x+dx*k;P.z=FACT.z+dz*k}}}
 if(!EDIT.on){const lim=-6,band=4,v0=terrVal(P.x,P.z);if(P.lx!==undefined&&v0<lim+band){const e=.5,gx=(terrVal(P.x+e,P.z)-terrVal(P.x-e,P.z))/(2*e),gz=(terrVal(P.x,P.z+e)-terrVal(P.x,P.z-e))/(2*e),gm=Math.hypot(gx,gz);
  if(gm>.05){const ux=gx/gm,uz=gz/gm,dn=-((P.x-P.lx)*ux+(P.z-P.lz)*uz);if(dn>0){const t=Math.max(0,Math.min(1,(lim+band-v0)/band)),f=t*t*(3-2*t);P.x+=ux*dn*f;P.z+=uz*dn*f}}}}
 if(!EDIT.on){const lim=-6;if(terrVal(P.x,P.z)<lim){for(let it=0;it<6;it++){const v=terrVal(P.x,P.z);if(v>=lim)break;const e=.4,gx=(terrVal(P.x+e,P.z)-terrVal(P.x-e,P.z))/(2*e),gz=(terrVal(P.x,P.z+e)-terrVal(P.x,P.z-e))/(2*e),gm=Math.hypot(gx,gz);if(gm<.05)break;const st=Math.min(3,(lim-v)/Math.max(gm,.3));P.x+=gx/gm*st;P.z+=gz/gm*st}}}P.lx=P.x;P.lz=P.z}
// ================= HARVEST =================
function nodeReachDist(n){return n.r+PR+reach()}
function bestTarget(){let best=null,bd=1e9;for(const n of nodes){if(!n.alive||n.grow<.9)continue;const dx=n.x-P.x,dz=n.z-P.z;if(Math.abs(dx)>12||Math.abs(dz)>12)continue;const d=Math.hypot(dx,dz);if(d<nodeReachDist(n)&&d<bd){bd=d;best=n}}return best}
function yieldOf(n,mult){const y=NT[n.type].yld*mult*(n.big||1)*(.9+R()*.3);let k=Math.floor(y);if(R()<y-k)k++;return Math.max(1,k)}
function breakNode(n,by){ // by: 'player' or {drone}
 n.alive=false;n.prog=0;n.t=0;const T=NT[n.type];n.respawnIn=RR(T.respawn[0],T.respawn[1]);
 const col=n.type==='tree'?'#3fe0c8':n.type==='stone'?'#c8a090':n.type==='ore'?'#40d8e8':'#6ab8ff';
 chips(n.x,n.y+1.5*n.sc,n.z,col,26,9,.22,1.1,1.1);chips(n.x,n.y+1,n.z,n.type==='tree'?'#9a9ca8':'#8a6a5a',8,6,.18,1,.8);
 AU.brk(n.type);shake=Math.max(shake,.25);n.dying=1;
 if(n.type==='tree')n.stump.visible=true;
 if(n.rub)n.rub.visible=false;n.stg2=-1;
 return T}
let shake=0;
function giveRes(res,amt,x,y,z){ // deliver to inventory (respects cap, auto-sell overflow)
 const c=cap();const room=Math.max(0,c-S.inv[res]);const take=Math.min(room,amt);S.inv[res]+=take;S.stats[res]+=take;
 if(take>0){UI.pulse(res);}
 const over=amt-take;if(over>0){if(S.auto){const gain=Math.round(over*VAL[res]*refineMul()*.8);addCoins(gain);S.stats.sold+=over;floater(x,y+1.4,z,'+'+gain+' auto-sold','#ffd24a');}else{floater(x,y+1.4,z,res.toUpperCase()+' FULL','#ff9a7a');UI.flashFull(res);AU.deny()}}
 return take}
function addCoins(n){S.coins+=n;if(n>0)S.stats.earned+=n;UI.pulse('coins')}
const DROPS=[];const dropRingG=new THREE.RingGeometry(.75,1.0,24);
function dropLoot(res,amt,from){const parts=Math.min(amt,6);const each=Math.floor(amt/parts);let rem=amt-each*parts;for(let i=0;i<parts;i++){const a=each+(i<rem?1:0);if(a<=0)continue;const m=new THREE.Mesh(lootGeo[res],lootMat[res]);m.position.copy(from);m.castShadow=false;scene.add(m);const an=R()*6.283,sp=2+R()*3.2;const rg=new THREE.Mesh(dropRingG,new THREE.MeshBasicMaterial({color:RCOL[res]||'#fff',transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));rg.rotation.x=-Math.PI/2;rg.visible=false;scene.add(rg);DROPS.push({rg,m,res,amt:a,vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:6+R()*3,t:0,fly:0});
  if(DROPS.length>90){const o=DROPS.shift();scene.remove(o.m);scene.remove(o.rg);giveRes(o.res,o.amt,P.x,gy(P.x,P.z)+3,P.z)}}}
function updateDrops(dt){for(let i=DROPS.length-1;i>=0;i--){const d=DROPS[i];d.t+=dt;const m=d.m,gh=gy(m.position.x,m.position.z)+.35;
  if(!d.fly){if(d.t<1.2){d.vy-=24*dt;m.position.x+=d.vx*dt;m.position.z+=d.vz*dt;m.position.y+=d.vy*dt;if(m.position.y<gh){m.position.y=gh;d.vy*=-.3;d.vx*=.6;d.vz*=.6}}else m.position.y=gh+Math.sin(performance.now()*.004+i)*.08;m.rotation.y+=dt*1.5}
  if(!d.fly&&d.t>1.2){d.rg.visible=true;d.rg.position.set(m.position.x,gh-.12,m.position.z);d.rg.scale.setScalar(1+.12*Math.sin(performance.now()*.005+i))}else d.rg.visible=false;
  const dx=P.x-m.position.x,dz=P.z-m.position.z,dist=Math.hypot(dx,dz);
  if(d.t>.5&&dist<4.2&&S.inv[d.res]<cap())d.fly=1;
  if(d.fly){const tp=_chest();d.sp=Math.min(40,(d.sp||6)+60*dt);const v=tp.clone().sub(m.position),L=v.length();if(L<1){scene.remove(m);scene.remove(d.rg);DROPS.splice(i,1);giveRes(d.res,d.amt,P.x,gy(P.x,P.z)+3,P.z);AU.pick(i%4);lastGain(d.res,d.amt);continue}m.position.addScaledVector(v,Math.min(1,d.sp*dt/L))}}}
function playerLoot(res,amt,from){const parts=Math.min(amt,6);const each=Math.floor(amt/parts);let rem=amt-each*parts;for(let i=0;i<parts;i++){const a=each+(i<rem?1:0);if(a<=0)continue;lootTo(res,a,from,()=>_chest(),()=>{giveRes(res,a,P.x,gy(P.x,P.z)+3,P.z);AU.pick(i);lastGain(res,a)},i*.03)}}
const _ch=new THREE.Vector3();const _chest=()=>_ch.set(P.x,gy(P.x,P.z)+2.4,P.z);
let gainFl=null;function lastGain(res,a){const now=performance.now();if(gainFl&&now-gainFl.t<500&&gainFl.res===res&&FL.includes(gainFl.f)){gainFl.n+=a;gainFl.f.el.textContent='+'+gainFl.n+' '+RNAME[res];gainFl.f.t=Math.min(gainFl.f.t,.2);gainFl.t=now}else{floater(P.x,gy(P.x,P.z)+5.2,P.z,'+'+a+' '+RNAME[res],RCOL[res]);gainFl={t:now,res,n:a,f:FL[FL.length-1]}}}
function harvestStep(dt){
 const moving=P.speedNow>1.6;let t=null;
 if(!moving)t=bestTarget();
 P.blocked='';
 if(t&&NT[t.type].tier>S.tool){P.blocked=NT[t.type].tier===1?'Needs Iron Pick':NT[t.type].tier===2?'Needs Titan Pick':'Needs a better pick';P.blockedNode=t;t=null}
 if(P.tgt&&P.tgt!==t){}
 P.tgt=t;
 if(!t){P.swing=Math.max(0,P.swing-dt*3);P.harvPct=0;P.bat=Math.min(100,P.bat+(4+2*S.up.battery*0)*dt);return}
 // face node
 const fa=Math.atan2(t.x-P.x,t.z-P.z);P.face=angLerp(P.face,fa,Math.min(1,dt*12));
 const T=NT[t.type];const bf=P.bat>0?1:.45;const hard=T.hard*(t.big?1.5:1);const rate=toolPow()*bf/hard;
 t.prog+=rate*dt;P.bat=Math.max(0,P.bat-dt*.9/(1+.22*S.up.battery));
 P.swing+=dt*(7+toolPow()*.7);P.harvPct=Math.min(1,t.prog);P.harvName=T.name;
 t.cd-=dt;const hitEvery=Math.max(.2,.5/Math.pow(toolPow(),.4));
 if(t.cd<=0){t.cd=hitEvery;t.shake=.4;const col=t.type==='tree'?'#3fe0c8':t.type==='stone'?'#d6a890':t.type==='ore'?'#40d8e8':'#6ab8ff';
  const tip=tipWorld();chips(tip.x,tip.y,tip.z,col,5,6,.14,.6,1);chips(tip.x,tip.y,tip.z,'#ffe9a0',2,8,.08,.3,1);AU.hit(t.type)}
 if(t.prog>=1){const mult=TOOLS[S.tool].yld;const n=yieldOf(t,mult);const T2=breakNode(t,'player');dropLoot(T2.res,n,new THREE.Vector3(t.x,t.y+2.2*t.sc,t.z));P.tgt=null;P.harvPct=0}}
const _tip=new THREE.Vector3();function tipWorld(){if(!P.robot)return _tip.set(P.x,3,P.z);P.robot.updateMatrixWorld(true);return _tip.copy(P.robot.userData.tip).applyMatrix4(P.robot.matrixWorld)}
function angLerp(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t}
function nodeVisuals(dt){for(const n of nodes){
  if(!n.alive){n.t+=dt*(n.type==='tree'?regrowMul():1);if(n.dying>0){n.dying=Math.max(0,n.dying-dt*3.2);const k=n.dying;n.obj.scale.setScalar(n.sc*n.base*Math.max(.001,k));n.obj.position.y=n.y+(1-k)*-.3;if(k<=0)n.obj.visible=false}
   if(n.dying<=0){const f=n.t/n.respawnIn;const st=f<.12?0:f<.4?1:f<.68?2:3;if(n.type!=='tree'){if(!n.rub){n.rub=rubble(n.type);n.rub.position.set(n.x,n.y,n.z);n.rub.rotation.y=n.rot;n.rub.scale.setScalar(n.sc);scene.add(n.rub)}n.rub.visible=st<2}
    if(st!==n.stg){n.stg=st;if(n.cur){scene.remove(n.cur);n.cur=null}n.stump.visible=st===0;if(st>0){const o=stageObj(n,st);o.position.set(n.x,n.y,n.z);o.rotation.y=n.rot;o.scale.setScalar(.01);o.userData.pop=0;scene.add(o);n.cur=o;chips(n.x,n.y+.4,n.z,'#bff8e8',6,3,.1,.7,1);}}
    if(n.cur){const o=n.cur;o.userData.pop=Math.min(1,o.userData.pop+dt*2.2);const p=o.userData.pop,e=p<.7?p/.7*1.1:1.1-.1*((p-.7)/.3);o.scale.setScalar(n.sc*(n.type==='tree'?(n.stg===3?.82:1)*.82:1)*Math.max(.01,e))}}
   if(n.t>n.respawnIn){n.alive=true;n.grow=0;n.prog=0;n.obj.visible=true;n.obj.scale.setScalar(.01);if(n.rub)n.rub.visible=false;n.stg2=-1;n.obj.position.y=n.y;n.stump.visible=false;if(n.cur){scene.remove(n.cur);n.cur=null}n.stg=-1;n.rsv=null;n.dying=0;chips(n.x,n.y+.3,n.z,'#ffe9c0',6,3,.1,.7,1)}continue}
  if(n.grow<1){n.grow=Math.min(1,n.grow+dt*1.6);const g=n.grow,e=1-Math.pow(1-g,3)*Math.cos(g*9)*(1-g)*0;const s=(g<.7?g/.7*1.12:1.12-.12*((g-.7)/.3));n.obj.scale.setScalar(n.sc*n.base*s);n.obj.position.y=n.y}
  if(n.shake>0){n.shake=Math.max(0,n.shake-dt*2.5);const s=Math.sin(n.shake*45)*n.shake*.09;n.obj.rotation.z=s;n.obj.rotation.x=s*.6}else if(n.obj.rotation.z!==0){n.obj.rotation.z=0;n.obj.rotation.x=0}
  if(n.prog>0&&n!==P.tgt&&!n.rsv){n.prog=Math.max(0,n.prog-dt*.12)}}}
// ================= FACTORY / SELL =================
function sellPrice(res){return Math.round(VAL[res]*refineMul()*100)/100}
function sellNow(map){let total=0,units=0;for(const r of RES){const q=Math.min(S.inv[r],map[r]|0);if(q<=0)continue;S.inv[r]-=q;total+=Math.round(q*VAL[r]*refineMul());units+=q}
 for(const k of GKEYS){if(!GOODS[k].mill)continue;const q=Math.min(S.goods[k],map[k]|0);if(q<=0)continue;S.goods[k]-=q;total+=Math.round(q*GOODS[k].v*refineMul());units+=q}
 if(total<=0)return 0;S.stats.sold+=units;addCoins(total);AU.coin(0);floater(P.x,gy(P.x,P.z)+5,P.z,'+'+fmtC(total)+' coins','#ffd24a');UI.toast('Sold '+units+' items for '+fmtC(total)+' coins');save();return total}
function sell(map){let total=0,units=0;for(const r of RES){const q=Math.min(S.inv[r],map[r]|0);if(q<=0)continue;S.inv[r]-=q;total+=Math.round(q*VAL[r]*refineMul());units+=q;
  const parts=Math.min(5,q);for(let i=0;i<parts;i++)lootTo(r,1,new THREE.Vector3(P.x,gy(P.x,P.z)+2.5,P.z),()=>BELT_IN(),()=>beltCrate(r),i*.05)}
 if(total<=0)return 0;S.stats.sold+=units;
 addCoins(total);setTimeout(()=>{AU.coin(0);for(let i=0;i<14;i++)lootTo('coins',1,new THREE.Vector3(HOPPER.x,gy(HOPPER.x,HOPPER.z)+2,HOPPER.z),()=>_chest(),i>=13?()=>{}:null,i*.04);floater(HOPPER.x,gy(HOPPER.x,HOPPER.z)+4,HOPPER.z,'+'+total.toLocaleString()+' coins','#ffd24a',true)},1900);
 AU.whoosh();return total}
const _bi=new THREE.Vector3();const BELT_START={x:-14,z:2.3};const BELT_END={x:-4.4,z:-2};const BELT_IN=()=>_bi.set(BELT_START.x,gy(BELT_START.x,BELT_START.z)+1.6,BELT_START.z);
// ================= MACHINES: update =================
const DEPOT=new THREE.Vector3(SELL.x-1.6,0,SELL.z-1.2);
 const STORECOST={coins:400,wood:40,stone:20};
function buildStorage(){if(S.storeBuilt)return;if(!canPay(STORECOST)){AU.deny();UI.toast('Needs '+costText(STORECOST),1);return}payCost(STORECOST);S.storeBuilt=1;{const gp=PADS.find(q=>q.gath);if(gp&&S.links[gp.id]&&S.links[gp.id]!=='F2'){const mill=S.links[gp.id];S.links[gp.id]='F2';buildSeg(gp,'F2');if(padById(mill)&&padById(mill).mill&&!S.links.FAC2){S.links.FAC2=mill;buildSeg(FAC2,mill)}}}AU.unlock();shake=.4;chips(FACT2.x,FAC2.y+3,FACT2.z,'#ffe9a0',50,11,.3,1.3,1.5);UI.banner('LOG STORAGE BUILT','Belt logs here from the gatherer');save()}
function sellStorage(k){const n=Math.min(k==null?FAC2.in:Math.floor(k),FAC2.in);if(n<=0)return;const v=Math.round(n*VAL.wood*refineMul());FAC2.in-=n;addCoins(v);S.stats.sold+=n;AU.coin(0);floater(FACT2.x,FAC2.y+7,FACT2.z,'+'+fmtC(v)+' coins','#ffd24a');UI.toast('Sold '+n+' logs for '+fmtC(v)+' coins')}
const F2MAXRATE=84,f2rate=()=>S.f2rate==null?30:S.f2rate;
function takeStorage(k){const room=Math.max(0,cap()-S.inv.wood);const n=Math.min(Math.floor(k),FAC2.in,room);if(n<=0){AU.deny();UI.toast(room<=0?'Inventory full':'Nothing to take',1);return}FAC2.in-=n;S.inv.wood+=n;S.stats.wood+=0;UI.pulse('wood');AU.pick(1);UI.toast('Took '+n+' logs')}
function stepStorage(dt){if(!props.fac2)return;const built=!!S.storeBuilt,open1=!!S.unl[1],f=props.fac2;f.visible=(built&&open1)||!!EDIT.on;props.fac2g.visible=open1&&!built&&!EDIT.on;FAC2.near=open1&&Math.hypot(P.x-FACT2.x,P.z-FACT2.z)<10.5;
 const lb=props.fac2l;lb.visible=f.visible;
 if(f.visible){const t=performance.now()*.001;f.userData.arm.rotation.y=Math.sin(t*.6)*(FAC2.work?.9:.18);f.userData.up.rotation.z=.9+Math.sin(t*1.3)*(FAC2.work?.12:.03);
  if(FAC2._n!==FAC2.in){FAC2._n=FAC2.in;const L=f.userData.logs,k=FAC2.in>0?Math.max(1,Math.ceil(L.length*FAC2.in/f2cap())):0;L.forEach((l,i)=>l.visible=i<k);
   const cv=lb.userData.cv||(lb.userData.cv=document.createElement('canvas'));cv.width=256;cv.height=90;const x=cv.getContext('2d');x.fillStyle='rgba(20,30,50,.75)';x.beginPath();x.roundRect(6,10,244,68,18);x.fill();x.fillStyle='#bff8ff';x.font='bold 30px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('LOGS '+FAC2.in+' / '+f2cap(),128,45);
   if(!lb.material.map){lb.material.map=new THREE.CanvasTexture(cv);lb.material.map.colorSpace=THREE.SRGBColorSpace}lb.material.map.needsUpdate=true;lb.material.needsUpdate=true}}}
function machineStep(dt){stepStorage(dt);for(const p of PADS){const open=padOpen(p);const lv=machLv(p);
  const near=Math.hypot(P.x-p.x,P.z-p.z)<(lv?(p.mill?9:4.6):3.2);const pw=(p.mill&&p.obj&&p.obj.userData.pile)?p.obj.userData.pile.getWorldPosition(new THREE.Vector3()):null;const pickNear=pw?Math.hypot(P.x-pw.x,P.z-pw.z)<3.0:Math.hypot(P.x-p.x,P.z-p.z)<3.0;p.near=near&&open;
  if(p.ghost)p.ghost.visible=open&&!lv;
  if(!open){p.ring.visible=false;continue}
  p.ring.visible=Math.hypot(P.x-p.x,P.z-p.z)<9;const pulse=.55+.45*Math.sin(performance.now()*.004+p.x);p.ring.userData.m1.material.opacity=lv?.35:.55+.4*pulse;p.ring.scale.setScalar(lv?1.25:1+.03*pulse);
  if(!lv)continue;
  p.stall=(p.buf||0)>=mcap(p)&&!S.links[p.id];
  if(p.mill&&p.obj&&p.obj.userData.raw){const ud=p.obj.userData;ud.raw.forEach((m,i)=>m.visible=i<Math.min(4,p.mi|0));ud.outs.forEach((m,i)=>m.visible=i<Math.min(2,p.buf|0))}
  if(p.mill&&p.obj&&p.obj.userData.pile){const pc=p.obj.userData.pile.children;const cp=mcap(p),n=p.buf>0?Math.max(1,Math.round(20*p.buf/cp)):0;for(let i=1;i<pc.length;i++)pc[i].visible=i-1<n}
  const pk0=p.mill?MILLS[p.k].out:p.k;if(pickNear&&lv&&!S.links[p.id]&&(p.buf||0)>0&&(p.mill||S.inv[pk0]<cap())){p.pk=(p.pk||0)+dt*5;while(p.pk>=1&&p.buf>0){p.pk-=1;p.buf--;const k=pk0;lootTo(k,1,(p.mill&&p.obj&&p.obj.userData.pile?p.obj.userData.pile.getWorldPosition(new THREE.Vector3()):new THREE.Vector3(p.x,p.y,p.z)).add(new THREE.Vector3(0,1.8,0)),()=>_chest(),()=>{if(p.mill){if(S.goods[k]<GCAP){S.goods[k]++;S.fac.made[k]++}else addCoins(Math.round(GOODS[k].v*refineMul()*.5));if(!RNAME[k]){RNAME[k]=GOODS[k].n;RCOL[k]=GOODS[k].col}lastGain(k,1)}else giveRes(k,1,P.x,gy(P.x,P.z)+3,P.z);AU.pick(2)},0)}}
  if(p.gath&&p.gobj)gathStep(p,dt);
  if(p.gath&&p.obj){if(p.pop>0)p.pop=Math.max(0,p.pop-dt*2.2);const k=1-p.pop;p.obj.scale.setScalar(.91*Math.max(.01,k<.7?k/.7*1.12:1.12-(k-.7)/.3*.12))}
  if(p.obj&&!p.stall&&!p.gath){const o=p.obj;const a=performance.now()*.001;if(p.mill){const L=o.userData.laser;if(o.userData.head){o.userData.head.position.y=3.3-(p.work?(.5+.5*Math.sin(a*4))*1.15:0)}if(p.work){o.position.y=p.y+Math.abs(Math.sin(a*10+p.x))*.015;if(L){L.scale.x=L.scale.z=.8+.5*Math.abs(Math.sin(a*30));L.visible=true}if(Math.random()<dt*9)chips(p.x,p.y+1.2,p.z+.1,'#ffe9a0',1,3,.12,.7,1.2)}else if(L){L.scale.x=L.scale.z=.5}}
   else if(p.k==='wood'){o.userData.saw.rotation.x+=dt*16*ECON.sat;o.userData.boom.rotation.x=Math.sin(a*2.2)*.12;o.position.y=p.y+Math.sin(a*8+p.x)*.03;if(Math.random()<dt*6)chips(p.x+Math.sin(o.rotation.y)*2.7,p.y+2.2,p.z+Math.cos(o.rotation.y)*2.7,'#5ff0d8',1,3,.1,.5,1)}
   else{o.position.y=p.y+Math.abs(Math.sin(a*14+p.x))*.07;o.rotation.z=Math.sin(a*30+p.z)*.012;if(Math.random()<dt*8)chips(p.x+Math.sin(o.rotation.y)*1.2,p.y+.4,p.z+Math.cos(o.rotation.y)*1.2,p.k==='stone'?'#c8a090':p.k==='ore'?'#40d8e8':'#6ab8ff',1,3,.12,.6,1)}
   if(p.pop>0){p.pop=Math.max(0,p.pop-dt*4);const s=(p.mill?1:p.k==='wood'?1.25:1.35)*(1+.1*p.pop);o.scale.setScalar(s)}}}}
const _dpv=new THREE.Vector3();const _dp=()=>_dpv.set(DEPOT.x,gy(DEPOT.x,DEPOT.z)+2.2,DEPOT.z);
function buyMachine(p){const c=buildAll(p);if(!canPay(c)){AU.deny();UI.toast('Needs '+costText(c),1);return false}payCost(c);S.mach[p.id]=1;S.stats.built++;showMachine(p);p.obj.scale.setScalar(.01);p.pop=1;chips(p.x,p.y+1,p.z,(p.mill?'#ffd24a':PCOL[p.k]),40,10,.25,1.2,1.2);AU.buy();shake=.3;UI.pulse('coins');UI.toast(mkOf(p).n+' built!');save();return true}
function upMCap(p){if(!p.mill||mcl(p)>=MCAPMAXL)return false;const c=mcapCost(p);if(S.coins<c){AU.deny();UI.toast('Not enough coins',1);return false}S.coins-=c;S.mcl=S.mcl||{};S.mcl[p.id]=mcl(p)+1;p.pop=1;AU.buy();UI.toast('Storage: '+mcap(p)+' '+GOODS[MILLS[p.k].out].n.toLowerCase()+'s');save();return true}
function upF2Cap(){if((S.f2cl||0)>=F2MAXL)return false;const c=f2upCost();if(S.coins<c){AU.deny();UI.toast('Not enough coins',1);return false}S.coins-=c;S.f2cl=(S.f2cl||0)+1;AU.buy();UI.toast('Log Storage: '+f2cap()+' logs');save();return true}
function upMachine(p){const l=machLv(p);if(l>=MAXLV)return false;const c=upCost(p);if(S.coins<c){AU.deny();UI.toast('Not enough coins',1);return false}S.coins-=c;S.mach[p.id]=l+1;p.pop=1;chips(p.x,p.y+2,p.z,'#ffe9a0',24,8,.18,1,1.2);AU.buy();UI.pulse('coins');save();return true}
// ================= DRONES =================
const drones=[];const beamGeo=new THREE.CylinderGeometry(.06,.06,1,6);beamGeo.translate(0,.5,0);beamGeo.rotateX(Math.PI/2);
function droneAllowed(n){const t=NT[n.type];if(n.type==='ore')return S.up.dtier>=1;if(n.type==='crystal')return S.up.dtier>=2;return true}
function syncDrones(){while(drones.length<S.drones){const o=makeDrone(1.15);const beam=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:'#7ff6ff',transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));beam.visible=false;scene.add(beam);scene.add(o);
  const carry=new THREE.Mesh(lootGeo.wood,lootMat.wood);carry.scale.setScalar(.8);carry.visible=false;scene.add(carry);
  const i=drones.length;drones.push({o,beam,carry,x:DEPOT.x+Math.cos(i*1.1)*3,z:DEPOT.z+Math.sin(i*1.1)*3,y:5,st:'idle',n:null,t:0,res:null,amt:0,ph:i*1.7,idleT:i*.4})}}
const droneSpeed=()=>(11+1.4*S.up.dspeed)*droneMul()*powSat();
function droneStep(dt){syncDrones();const now=performance.now()*.001;
 for(const d of drones){const o=d.o;let tx=d.x,tz=d.z,ty=5;
  if(d.st==='idle'){d.idleT-=dt;tx=DEPOT.x+Math.cos(now*.6+d.ph)*3.2;tz=DEPOT.z+Math.sin(now*.6+d.ph)*3.2;ty=gy(tx,tz)+4.6;
   if(d.idleT<=0){d.idleT=1.2;let best=null,bs=1e9;for(const n of nodes){if(!n.alive||n.rsv||n.grow<1||!droneAllowed(n)||!S.unl[n.zone])continue;const sc=Math.hypot(n.x-d.x,n.z-d.z)+Math.hypot(n.x-DEPOT.x,n.z-DEPOT.z)*.8-(n.type==='crystal'?10:n.type==='ore'?6:0);if(sc<bs){bs=sc;best=n}}if(best){d.n=best;best.rsv=d;d.st='go'}}}
  else if(d.st==='go'){const n=d.n;if(!n.alive||n.rsv!==d){d.st='idle';d.n=null;}else{tx=n.x;tz=n.z;ty=n.y+n.sc*3.2+2.6;if(Math.hypot(d.x-tx,d.z-tz)<1.5){d.st='work';d.t=0}}}
  else if(d.st==='work'){const n=d.n;if(!n.alive||n.rsv!==d){d.st='idle';d.n=null;d.beam.visible=false}else{tx=n.x;tz=n.z;ty=n.y+n.sc*3.2+2.6;d.t+=dt*(1+.2*S.up.dspeed)*.9*powSat();n.shake=Math.max(n.shake,.12);
    if(Math.random()<dt*14)chips(n.x,n.y+1.5,n.z,n.type==='tree'?'#3fe0c8':n.type==='stone'?'#d6a890':n.type==='ore'?'#40d8e8':'#6ab8ff',1,4,.12,.5,1);
    n.dprog=d.t/NT[n.type].hard*1.6;if(Math.floor(d.t*3)!==Math.floor((d.t-dt)*3))AU.ring();
    if(d.t>=NT[n.type].hard/1.6){const amt=Math.max(1,Math.round(yieldOf(n,1+.25*S.up.dcargo)));const T=breakNode(n,'drone');d.res=T.res;d.amt=amt;d.n=null;d.st='back';d.beam.visible=false;n.rsv=null}}}
  else if(d.st==='back'){tx=DEPOT.x;tz=DEPOT.z;ty=gy(tx,tz)+4;if(Math.hypot(d.x-tx,d.z-tz)<1.4){const res=d.res,amt=d.amt;giveRes(res,amt,DEPOT.x,gy(DEPOT.x,DEPOT.z)+2,DEPOT.z);floater(d.x,d.y+1.5,d.z,'+'+amt+' '+RNAME[res],RCOL[res]);AU.pick(1);chips(d.x,d.y,d.z,RCOL[res],8,4,.12,.6,1);d.res=null;d.st='idle';d.idleT=.3}}
  // move
  const dx=tx-d.x,dz=tz-d.z,dist=Math.hypot(dx,dz);const sp=Math.min(dist/dt*.9,droneSpeed()*(d.st==='work'?.6:1));if(dist>.05){d.x+=dx/dist*sp*dt;d.z+=dz/dist*sp*dt}
  const wantY=(d.st==='idle'||d.st==='work'?ty:Math.max(ty,gy(d.x,d.z)+4.2));d.y+=(wantY-d.y)*Math.min(1,dt*3);
  o.position.set(d.x,d.y+Math.sin(now*3+d.ph)*.18,d.z);if(dist>.4)o.rotation.y=angLerp(o.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*6));o.rotation.z=Math.sin(now*2+d.ph)*.05;o.rotation.x=dist>.5?.18:0;
  if(d.st==='work'&&d.n){d.beam.visible=true;const a=o.position,b=_v.set(d.n.x,d.n.y+d.n.sc*2,d.n.z);d.beam.position.copy(a);d.beam.lookAt(b);d.beam.scale.set(1,1,a.distanceTo(b));d.beam.material.opacity=.5+Math.random()*.4}
  if(d.st==='back'&&d.res){d.carry.visible=true;d.carry.geometry=lootGeo[d.res];d.carry.material=lootMat[d.res];d.carry.position.set(d.x,d.y-1.9,d.z);d.carry.rotation.y+=dt*3}else d.carry.visible=false}}
// ================= ZONES: unlock rings =================
const ZREQ={
 1:{t:'Buy the Iron Pick',g:1,c:()=>S.tool>=1?1:0},
 2:{t:'Build a machine on a build site',g:1,c:()=>Math.min(1,Object.keys(S.mach).length)},
 3:{t:'Rescue the lost rover',g:1,c:()=>S.rescued?1:0},
 4:{t:'Make 20 slabs at the Slab Press',g:20,c:()=>S.fac.made.slab},
 5:{t:'Connect 2 machines with belts',g:2,c:()=>Object.keys(S.links).length},
 6:{t:'Own 3 drones',g:3,c:()=>S.drones},
 7:{t:'Make 60 planks at the Plank Mill',g:60,c:()=>S.fac.made.plank},
 8:{t:'Build 6 machines',g:6,c:()=>Object.keys(S.mach).length},
 9:{t:'Own 8 drones',g:8,c:()=>S.drones}};
ZONES.forEach(z=>{if(ZREQ[z.i])z.req=ZREQ[z.i]});
const zoneAvail=z=>!!z.free||z.i===1||!!S.unl[z.i-1];
const reqProg=z=>z.req?Math.min(z.req.g,z.req.c()):1;
const reqOk=z=>!z.req||reqProg(z)>=z.req.g;
const zoneOpen=z=>zoneAvail(z)&&reqOk(z);
function zoneState(z){return S.unl[z.i]?'cleared':!zoneAvail(z)?'locked':!reqOk(z)?'req':'open'}
const gateObjs=[];
function setupGates(){ZONES.forEach(z=>{if(z.free)return;const y=gy(z.gate.x,z.gate.z);const g=padRing('#9ffcff',z.gate.x,z.gate.z,1.45);g.position.set(z.gate.x,y+.2,z.gate.z);scene.add(g);z.gateRing=g;z.gy=y;z.payT=0;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,12,32,1,true),new THREE.MeshBasicMaterial({color:'#9ffcff',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));beam.position.set(z.gate.x,y+6,z.gate.z);scene.add(beam);z.gateBeam=beam;
  g.visible=false;beam.visible=false;if(S.unl[z.i]){z.ff.grp.visible=false}})}
function zoneCostLeft(z){const out={};for(const k in z.cost){const left=z.cost[k]-(S.paid[z.i][k]||0);if(left>0)out[k]=left}return out}
function gateStep(dt){for(const z of ZONES){if(z.free||S.unl[z.i])continue;const ok=zoneOpen(z),av=zoneAvail(z);const pulse=.5+.5*Math.sin(performance.now()*.004+z.i);
  const gd=Math.hypot(P.x-z.gate.x,P.z-z.gate.z);const show=av&&gd<22;z.gateRing.visible=z.gateBeam.visible=show;z.near=gd<4.4;z.ff.mat.uniforms.t.value=performance.now()*.001;
  if(show){const c=ok?'#9ffcff':'#ff9a6a';z.gateRing.userData.m1.material.color.set(c);z.gateRing.userData.m2.material.color.set(c);z.gateBeam.material.color.set(c);z.gateRing.userData.m1.material.opacity=(ok?.55:.35)+.4*pulse;z.gateBeam.material.opacity=(ok?.1:.06)+.08*pulse}
  if(z.near&&ok){z.payT-=dt;if(z.payT<=0){z.payT=.1;const left=zoneCostLeft(z);const keys=Object.keys(left);
    if(keys.length){let paid=false;for(const k of keys){const have=haveOf(k);if(have<=0)continue;const chunk=Math.max(1,Math.min(left[k],Math.floor(have),Math.ceil(z.cost[k]*.06)));if(chunk<1)continue;
      payCost({[k]:chunk});S.paid[z.i][k]=(S.paid[z.i][k]||0)+chunk;paid=true;UI.pulse(k);
      lootTo(k,chunk,new THREE.Vector3(P.x,gy(P.x,P.z)+2.4,P.z),()=>_gv(z),null,0);AU.pick(Math.floor(Math.random()*6));break}
     if(!paid&&!z.warned){z.warned=true;UI.toast('Gather more for '+z.name,1)}}
    if(!Object.keys(zoneCostLeft(z)).length)unlockZone(z)}}else if(!z.near)z.warned=false;
  if(z.near&&!ok&&!z.warnedR){z.warnedR=true;UI.toast(av?'Requirement: '+z.req.t:'Clear region '+(z.i-1)+' first',1)}if(!z.near)z.warnedR=false}}
const _gvv=new THREE.Vector3();const _gv=z=>_gvv.set(z.gate.x,z.gy+1.5,z.gate.z);
function zoneEdgePt(z,i,n){const l=z.lobes[i%z.lobes.length],t=i/n*6.2832,ph=Math.atan2(Math.sin(t)*l.b,Math.cos(t)*l.a),r=wob(z,ph)/Math.hypot(Math.cos(ph)/l.a,Math.sin(ph)/l.b);return[l.x+Math.cos(ph)*r,l.z+Math.sin(ph)*r]}
function unlockZone(z,silent){S.unl[z.i]=1;nodes.forEach(n=>{if(n.zone===z.i&&n.alive)n.obj.visible=true});refreshTerritory(!!silent);if(UI.fogMap)UI.fogMap();z.gateRing.visible=false;z.gateBeam.visible=false;z.ffFade=1;
 if(!silent){AU.unlock();shake=.7;for(let i=0;i<90;i++){const [ex,ez]=zoneEdgePt(z,i,90);chips(ex,gy(ex,ez)+1,ez,i%2?'#e8a070':'#9ffcff',1,8,.3,1.6,2.4,10);}
 chips(z.gate.x,z.gy+2,z.gate.z,'#ffe9a0',60,12,.3,1.4,1.4);UI.banner('REGION '+z.i+' CLEARED',z.name);PADS.forEach(p=>{if(p.zone===z.i)p.ring.visible=true});save()}}
function ffStep(dt){const tt=performance.now()*.001;wallStep(dt,tt);terrStep(dt);for(const z of ZONES){if(z.free||!z.ff)continue;if(z.ffFade>0){z.ffFade=Math.max(0,z.ffFade-dt*.7);z.ff.mat.uniforms.k.value=z.ffFade;z.ff.ring.scale.setScalar(1+(1-z.ffFade)*.02);z.ff.lab.material.opacity=z.ffFade;if(z.ffFade<=0)z.ff.grp.visible=false}
  else if(!S.unl[z.i]){const gd=Math.hypot(P.x-z.gate.x,P.z-z.gate.z),tg=zoneAvail(z)&&gd<24?1:0;z.labK=(z.labK||0)+(tg-(z.labK||0))*Math.min(1,dt*3);z.ff.lab.material.opacity=z.labK;z.ff.grp.visible=z.labK>.02}
}}

// ================= GRID OVERLAY (toggle) =================
const GRID={grp:new THREE.Group(),cx:1e9,cz:1e9,tex:{},hud:null};scene.add(GRID.grp);GRID.grp.visible=false;
const GCELL=10,GR=70;
function gridLabel(txt){if(GRID.tex[txt])return GRID.tex[txt];const c=document.createElement('canvas');c.width=160;c.height=56;const x=c.getContext('2d');x.fillStyle='rgba(20,30,50,.62)';x.beginPath();x.roundRect(4,6,152,44,12);x.fill();x.fillStyle='#bff8ff';x.font='bold 28px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,80,29);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return GRID.tex[txt]=t}
function gridBuild(cx,cz){while(GRID.grp.children.length){const o=GRID.grp.children.pop();if(o.geometry)o.geometry.dispose();if(o.material&&!o.isSprite)o.material.dispose();if(o.material&&o.isSprite)o.material.dispose()}
 const minor=[],major=[],axis=[];const step=2.5;
 const line=(arr,fx,fz,tx,tz)=>{const n=Math.max(1,Math.round(Math.hypot(tx-fx,tz-fz)/step));for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;const x0=fx+(tx-fx)*a,z0=fz+(tz-fz)*a,x1=fx+(tx-fx)*b,z1=fz+(tz-fz)*b;arr.push(x0,gy(x0,z0)+.45,z0,x1,gy(x1,z1)+.45,z1)}};
 for(let x=cx-GR;x<=cx+GR;x+=GCELL){const arr=x===0?axis:(x%50===0?major:minor);line(arr,x,cz-GR,x,cz+GR)}
 for(let z=cz-GR;z<=cz+GR;z+=GCELL){const arr=z===0?axis:(z%50===0?major:minor);line(arr,cx-GR,z,cx+GR,z)}
 const mk=(arr,col,op)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const l=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false,fog:false}));l.frustumCulled=false;GRID.grp.add(l)};
 mk(minor,'#ffffff',.5);mk(major,'#7ff6ff',.7);mk(axis,'#ffc040',.8);
 for(let x=Math.ceil((cx-50)/20)*20;x<=cx+50;x+=20)for(let z=Math.ceil((cz-50)/20)*20;z<=cz+50;z+=20){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:gridLabel(x+','+z),transparent:true,depthWrite:false,fog:false,opacity:.9}));s.scale.set(5.6,2,1);s.position.set(x,gy(x,z)+1.4,z);GRID.grp.add(s)}
 GRID.cx=cx;GRID.cz=cz}
function gridSet(on){S.grid=on?1:0;GRID.grp.visible=!!on;GRID.cx=1e9;if(GRID.hud)GRID.hud.style.display=on?'block':'none';if(GRID.btn)GRID.btn.classList.toggle('on',!!on);try{save()}catch(e){}}
function gridStep(dt){if(!GRID.grp.visible)return;const cx=Math.round(P.x/GCELL)*GCELL,cz=Math.round(P.z/GCELL)*GCELL;if(cx!==GRID.cx||cz!==GRID.cz)gridBuild(cx,cz);
 if(GRID.hud){const tx=Math.round(P.x)+' · '+Math.round(P.z);if(GRID.hud._t!==tx){GRID.hud._t=tx;GRID.hud.textContent='x '+Math.round(P.x)+'   z '+Math.round(P.z)}}}
// ================= QUESTS =================
const QUESTS=[
 {t:'Harvest wood',goal:12,c:s=>s.wood,r:25,at:()=>nearestNode('tree')},
 {t:'Mine stone',goal:10,c:s=>s.stone,r:35,at:()=>nearestNode('stone')},
 {t:'Sell wood or stone at the Upgrade Center',goal:1,c:s=>s.earned>0?1:0,r:45,at:()=>SELL},
 {t:'Sell at the Upgrade Center',goal:15,c:s=>s.sold,r:50,at:()=>SELL},
 {t:'Buy the Iron Pick',goal:1,c:()=>S.tool>=1?1:0,r:60,shop:1},
 {t:'Clear Sandstorm: Teal Alien Forest',goal:1,c:()=>S.unl[1],r:100,at:()=>ZONES[1].gate},
 {t:'Build a Tree Harvester',goal:1,c:()=>PADS.filter(p=>p.k==='wood'&&!p.mill&&machLv(p)).length,r:150,at:()=>nearestPad('wood')||PADS.find(p=>p.gath)},
 {t:'Build the Log Storage',goal:1,c:()=>S.storeBuilt?1:0,r:150,at:()=>FACT2},
 {t:'Belt the Harvester to the Log Storage',goal:1,c:()=>{const g=PADS.find(p=>p.gath);return g&&S.links[g.id]==='F2'?1:0},r:180,at:()=>PADS.find(p=>p.gath)},
 {t:'Build a Plank Mill',goal:1,c:()=>PADS.filter(p=>p.mill&&p.k==='wood'&&machLv(p)).length,r:140,at:()=>PADS.find(p=>p.mill&&p.k==='wood'&&padOpen(p)&&!machLv(p))||PADS.find(p=>p.mill&&p.k==='wood')},
 {t:'Belt the Log Storage to the Plank Mill',goal:1,c:()=>S.links.FAC2?1:0,r:200,at:()=>FACT2},
 {t:'Mine teal ore',goal:10,c:s=>s.ore,r:120,at:()=>nearestNode('ore')},
 {t:'Buy a Collector Drone',goal:1,c:()=>S.drones,r:200,shop:1},
 {t:'Make 15 planks at the Plank Mill',goal:15,c:()=>S.fac.made.plank,r:220,at:()=>PADS.find(p=>p.mill&&p.k==='wood'&&machLv(p))},
 {t:'Build a Solar Array',goal:1,c:()=>bl('solar'),r:250,at:()=>BASE[0]},
 {t:'Earn 1,000 coins',goal:1000,c:s=>s.earned,r:250},
 {t:'Clear Sandstorm: Turquoise Mineral Fields',goal:1,c:()=>S.unl[2],r:300,at:()=>ZONES[2].gate},
 {t:'Build a Slab Press',goal:1,c:()=>PADS.filter(p=>p.mill&&p.k==='stone'&&machLv(p)).length,r:350,at:()=>PADS.find(p=>p.mill&&p.k==='stone'&&padOpen(p)&&!machLv(p))},
 {t:'Build a Stick Lathe',goal:1,c:()=>PADS.filter(p=>p.mill&&p.k==='stick'&&machLv(p)).length,r:400,at:()=>PADS.find(p=>p.k==='stick')},
 {t:'Belt the Log Storage to the Stick Lathe',goal:1,c:()=>S.links.FAC2b?1:0,r:450,at:()=>FACT2},
 {t:'Rescue Lost Rover',goal:1,c:()=>S.rescued,r:400,at:()=>S.rescued?null:LOST},
 {t:'Build a Greenhouse Dome',goal:1,c:()=>bl('dome'),r:450,at:()=>BASE[1]},
 {t:'Buy the Titan Pick',goal:1,c:()=>S.tool>=2?1:0,r:400,shop:1},
 {t:'Collect crystals',goal:10,c:s=>s.crystal,r:500,at:()=>nearestNode('crystal')},
 {t:'Build 3 machines',goal:3,c:()=>Object.keys(S.mach).length,r:600,at:()=>nearestPad()},
 {t:'Build a Comms Dish',goal:1,c:()=>bl('dish'),r:700,at:()=>BASE[2]},
 {t:'Upgrade Cargo Bay to Lv 3',goal:3,c:()=>S.up.cargo,r:500,shop:1},
 {t:'Clear Sandstorm: Crystal Caves',goal:1,c:()=>S.unl[3],r:800,at:()=>ZONES[3].gate},
 {t:'Build the Landing Pad',goal:1,c:()=>bl('pad'),r:1000,at:()=>BASE[3]},
 {t:'Own 4 drones',goal:4,c:()=>S.drones,r:900,shop:1},
 {t:'Earn 10,000 coins',goal:10000,c:s=>s.earned,r:1500},
 {t:'Clear Sandstorm: Sky Dunes',goal:1,c:()=>S.unl[4],r:2000,at:()=>ZONES[4].gate},
 {t:'Buy the Plasma Pick',goal:1,c:()=>S.tool>=3?1:0,r:2500,shop:1},
 {t:'Build 8 machines',goal:8,c:()=>Object.keys(S.mach).length,r:3000,at:()=>nearestPad()},
 {t:'Make 30 slabs at the Slab Press',goal:30,c:()=>S.fac.made.slab,r:3500,at:()=>PADS.find(p=>p.mill&&p.k==='stone'&&machLv(p))},
 {t:'Build the Quantum Reactor',goal:1,c:()=>bl('reactor'),r:4000,at:()=>BASE.find(b=>b.id==='reactor')},
 {t:'Build Colonist Homes',goal:1,c:()=>bl('homes'),r:6000,at:()=>BASE.find(b=>b.id==='homes')},
 {t:'Terraform: build the Atmosphere Processor',goal:1,c:()=>bl('air'),r:5000,at:()=>BASE.find(b=>b.id==='air')},
 {t:'Terraform: build the Water Extractor',goal:1,c:()=>bl('water'),r:9000,at:()=>BASE.find(b=>b.id==='water')},
 {t:'Terraform: build the Bio Seeder',goal:1,c:()=>bl('bio'),r:15000,at:()=>BASE.find(b=>b.id==='bio')},
 {t:'Expand Colonist Homes to Lv 3',goal:3,c:()=>bl('homes'),r:12000,at:()=>BASE.find(b=>b.id==='homes')},
 {t:'Light the Welcome Beacon',goal:1,c:()=>bl('beacon'),r:50000,at:()=>BASE.find(b=>b.id==='beacon')},
 {t:'Clear Sandstorm: Far Rim',goal:1,c:()=>S.unl[5],r:5000,at:()=>ZONES[5].gate},
 {t:'Clear Sandstorm: Rust Badlands',goal:1,c:()=>S.unl[6],r:8000,at:()=>ZONES[6].gate},
 {t:'Clear Sandstorm: Glass Canyon',goal:1,c:()=>S.unl[7],r:12000,at:()=>ZONES[7].gate},
 {t:'Clear Sandstorm: Deep Basin',goal:1,c:()=>S.unl[8],r:25000,at:()=>ZONES[8].gate},
 {t:'Earn 100,000 coins',goal:100000,c:s=>s.earned,r:15000},
 {t:'Clear Sandstorm: Titan Reach',goal:1,c:()=>S.unl[9],r:60000,at:()=>ZONES[9].gate},
 {t:'Buy the Quantum Pick',goal:1,c:()=>S.tool>=4?1:0,r:20000,shop:1},
 {t:'Own 10 drones',goal:10,c:()=>S.drones,r:30000,shop:1}];
if(!BASE_ON)for(let i=QUESTS.length-1;i>=0;i--)if(/BASE\[/.test(String(QUESTS[i].at)))QUESTS.splice(i,1);
for(let i=QUESTS.length-1;i>=0;i--)if(/crystal/i.test(QUESTS[i].t+String(QUESTS[i].c)+String(QUESTS[i].at)))QUESTS.splice(i,1);
function nearestNode(type){let b=null,bd=1e9;for(const n of nodes){if(n.type!==type||!n.alive||!S.unl[n.zone])continue;const d=Math.hypot(n.x-P.x,n.z-P.z);if(d<bd){bd=d;b=n}}return b}
function nearestPad(k){let b=null,bd=1e9;for(const p of PADS){if(!padOpen(p)||machLv(p)||(k&&(p.k!==k||p.mill)))continue;const d=Math.hypot(p.x-P.x,p.z-P.z);if(d<bd){bd=d;b=p}}return b}
function qProg(i){const q=QUESTS[i];return q?Math.min(q.goal,q.c(S.stats)):0}
function questStep(){let ch=false;if(S.qa[1]!=null){if(S.qa[1]===S.qnext-1)S.qnext--;S.qa[1]=null}if(S.qa[0]==null&&S.qnext<QUESTS.length)S.qa[0]=S.qnext++;for(let k=0;k<1;k++){const i=S.qa[k];if(i==null)continue;if(qProg(i)>=QUESTS[i].goal){const q=QUESTS[i];S.qa[k]=S.qnext<QUESTS.length?S.qnext++:null;addCoins(q.r);AU.quest();UI.banner('QUEST COMPLETE','+'+q.r.toLocaleString()+' coins');floater(P.x,gy(P.x,P.z)+6,P.z,'Quest +'+q.r.toLocaleString(),'#ffd24a',true);ch=true}}return ch}
