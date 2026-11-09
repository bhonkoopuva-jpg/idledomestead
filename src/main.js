// ================= PROPS =================
const props={belts:[],smoke:[],crates:[]};
function placeBelt(len,sx,sz,ex,ez,y0){const b=makeBelt(len);const dx=ex-sx,dz=ez-sz;b.rotation.y=Math.atan2(-dz,dx);b.position.set(sx,gy(sx,sz)+(y0||0),sz);scene.add(b);props.belts.push(b);return b}
function buildProps(){
 const fy=gy(FACT.x,FACT.z)+FACH;
 const fac=makeUpgradeCenter();fac.position.set(FACT.x,fy,FACT.z);fac.rotation.y=FACROT;fac.scale.setScalar(1.45);scene.add(fac);props.fac=fac;{const f2=makeLogStorage();f2.position.set(FACT2.x,gy(FACT2.x,FACT2.z)+F2H,FACT2.z);f2.rotation.y=0;f2.scale.setScalar(1.05);f2.visible=false;scene.add(f2);props.fac2=f2;
  const gh=padRing('#ffd24a',FACT2.x,FACT2.z,1.6);gh.position.set(FACT2.x,gy(FACT2.x,FACT2.z)+.2+F2H,FACT2.z);gh.visible=false;scene.add(gh);props.fac2g=gh;
  const lb=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,fog:false}));lb.scale.set(9,3.2,1);lb.position.set(FACT2.x,gy(FACT2.x,FACT2.z)+10.5,FACT2.z);lb.visible=false;scene.add(lb);props.fac2l=lb}
 // sell pad
 const sp=padRing('#ffd24a',SELL.x,SELL.z,1.19);sp.position.set(SELL.x,gy(SELL.x,SELL.z)+.2+SELH,SELL.z);scene.add(sp);props.sell=sp;
 // objective arrow
 const sh=new THREE.Shape();sh.moveTo(0,1.1);sh.lineTo(.8,-.5);sh.lineTo(0,-.1);sh.lineTo(-.8,-.5);sh.closePath();
 const ar=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshBasicMaterial({color:'#ffe27a',transparent:true,opacity:.95,depthTest:false,depthWrite:false}));ar.rotation.x=-Math.PI/2;ar.renderOrder=20;const arg=new THREE.Group();arg.add(ar);scene.add(arg);props.arrow=arg;
}
function beltCrate(res){const b=props.b1;const m=new THREE.Mesh(new THREE.BoxGeometry(.7,.55,.7),lootMat[res]);m.castShadow=true;m.position.set(BELT_START.x,gy(BELT_START.x,BELT_START.z)+1.1,BELT_START.z);scene.add(m);props.crates.push({m,t:0})}
function propsStep(dt){const t=performance.now()*.001;
 for(const b of props.belts){const U=b.userData,total=U.n*.62;U.slats.forEach((s,i)=>{s.position.x=.2+((i*.62+t*1.4)%total)})}
 const g=props.fac.userData.gears;g[0].rotateY(dt*.5);
 for(const m of props.smoke){m.userData.ph=(m.userData.ph+dt*.12)%1;const k=m.userData.ph;m.position.set(FACT.x+2.5+Math.sin(k*5+m.userData.ph*3)*.6+k*3.5,gy(FACT.x,FACT.z)+12+k*7,FACT.z-1.8);m.scale.setScalar(.6+k*2.2);m.material.opacity=.5*(1-k)*Math.min(1,k*8)}
 const L1=BELT_START.z-BELT_END.z,L2=BELT_END.x-BELT_START.x,LT=L1+L2;
 for(let i=props.crates.length-1;i>=0;i--){const c=props.crates[i];c.t+=dt/2.4;if(c.t>=1){scene.remove(c.m);props.crates.splice(i,1);chips(BELT_END.x,gy(BELT_END.x,BELT_END.z)+2,BELT_END.z,'#ffe9a0',6,3,.12,.6,1);continue}
  const d=c.t*LT;let x,z,yaw;if(d<L1){x=BELT_START.x;z=BELT_START.z-d;yaw=Math.PI/2}else{x=BELT_START.x+(d-L1);z=BELT_END.z;yaw=0}c.m.position.set(x,gy(x,z)+1.1,z);c.m.rotation.y=yaw}
 // gentle life: tree sway, window glow, fireflies
 lifeStep(dt,t);
 // sell pad pulse
 const pl=.5+.5*Math.sin(t*4);props.sell.userData.m1.material.opacity=.5+.4*pl;
 // arrow
 const ob=objective();const ar=props.arrow;
 if(ob&&Math.hypot(ob.x-P.x,ob.z-P.z)>8&&!UI.openId){ar.visible=true;const a=Math.atan2(ob.x-P.x,ob.z-P.z);const gyp=gy(P.x,P.z);ar.position.set(P.x+Math.sin(a)*5.2,gyp+.5+Math.sin(t*6)*.12,P.z+Math.cos(a)*5.2);ar.rotation.y=a+Math.PI}else ar.visible=false;
 if(S.track){S.track.t-=dt;if(Math.hypot(S.track.x-P.x,S.track.z-P.z)<8)S.track.t=0}}
// ---- ambient life (subtle): trees sway, Upgrade Center windows breathe, fireflies drift ----
const FFN=70,ffP=new Float32Array(FFN*3),ffS=new Float32Array(FFN);for(let i=0;i<FFN;i++){ffP[i*3]=(Math.random()-.5)*44;ffP[i*3+1]=.6+Math.random()*3.2;ffP[i*3+2]=(Math.random()-.5)*36;ffS[i]=Math.random()*6.28}
const ffG=new THREE.BufferGeometry();ffG.setAttribute('position',new THREE.BufferAttribute(ffP,3));
const ffM=new THREE.PointsMaterial({color:'#ffe9a0',size:.2,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
const ffPts=new THREE.Points(ffG,ffM);ffPts.frustumCulled=false;scene.add(ffPts);
function lifeStep(dt,t){
 for(const n of nodes){if(n.type!=='tree'||!n.alive||n.shake>0||!n.obj.visible)continue;if(Math.abs(n.x-P.x)>50||Math.abs(n.z-P.z)>50)continue;n.obj.rotation.z=Math.sin(t*.8+n.id*1.7)*.016;n.obj.rotation.x=Math.cos(t*.65+n.id*1.3)*.011}
 try{ucMat().emissiveIntensity=.14+.05*Math.sin(t*1.5)}catch(e){}
 const a=ffG.attributes.position.array;for(let i=0;i<FFN;i++){const s=ffS[i];a[i*3]+=Math.sin(t*.5+s)*dt*.5;a[i*3+1]+=Math.cos(t*.7+s*2)*dt*.25;a[i*3+2]+=Math.cos(t*.4+s*3)*dt*.5;if(a[i*3+1]<.4)a[i*3+1]=.4;if(a[i*3+1]>4.2)a[i*3+1]=4.2}
 ffG.attributes.position.needsUpdate=true;ffPts.position.set(P.x,gy(P.x,P.z),P.z);ffM.opacity=.55+.3*Math.sin(t*2.1)}
// ================= MAIN LOOP =================
const clock=new THREE.Clock();let qT=0,svT=0,frameN=0;
function playerStep(dt){
 let ix=0,iz=0;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1;
 if(joy.on&&joy.mag>.12){ix=joy.dx;iz=joy.dy;P.moveTo=null}
 let mag=Math.min(1,Math.hypot(ix,iz));
 if(!mag&&P.moveTo){const dx=P.moveTo.x-P.x,dz=P.moveTo.z-P.z,d=Math.hypot(dx,dz);if(d<.6){P.moveTo=null;moveMark.visible=false}else{ix=dx/d;iz=dz/d;mag=Math.min(1,d/3)}}
 else if(mag&&keys.KeyW!==undefined)P.moveTo=null;
 if(UI.openId){ix=iz=0;mag=0}
 const bf=P.bat>0?1:.6;const sp=13*(1+.08*S.up.boost)*bf;
 const l=Math.hypot(ix,iz)||1;const tx=ix/l*sp*mag,tz=iz/l*sp*mag;
 const k=Math.min(1,dt*(mag?9:12));P.vx+=(tx-P.vx)*k;P.vz+=(tz-P.vz)*k;
 P.x+=P.vx*dt;P.z+=P.vz*dt;collide();
 P.speedNow=Math.hypot(P.vx,P.vz);
 if(P.speedNow>.6){P.face=angLerp(P.face,Math.atan2(P.vx,P.vz),Math.min(1,dt*11));if(Math.random()<dt*14)chips(P.x-Math.sin(P.face)*1.2,gy(P.x,P.z)+.2,P.z-Math.cos(P.face)*1.2,'#e8a070',1,2.5,.16,.55,.5,6)}
 if(P.speedNow>1.6&&!P.tgt)P.bat=Math.min(100,P.bat+dt*1.2);
 if(moveMark.visible){moveMark.userData.t+=dt;const s=1+Math.sin(moveMark.userData.t*8)*.12;moveMark.scale.setScalar(s);if(!P.moveTo)moveMark.visible=false}
 harvestStep(dt);
 // robot pose
 const rb=P.robot;const gp=gy(P.x,P.z);rb.position.set(P.x,gp,P.z);rb.rotation.y=P.face;
 P.bob+=dt*P.speedNow*1.4;rollRobot(rb,dt*P.speedNow/1.5);const body=rb.children[0];if(body){body.position.y=(rb.userData.scan?0:1.95)+Math.abs(Math.sin(P.bob))*.06*Math.min(1,P.speedNow/4);if(rb.userData.scan){body.rotation.x=P.tgt?Math.max(0,Math.sin(P.swing))*.06:0;body.rotation.z=P.speedNow<.6?Math.sin(performance.now()*.0026)*.018:body.rotation.z*.9}}
 const tool=rb.userData.tool;if(tool){if(P.tgt){tool.rotation.x=-.25+Math.sin(P.swing*1.0)*.55;tool.position.y=1.32+Math.max(0,Math.sin(P.swing))*.12;rb.rotation.x=Math.max(0,Math.sin(P.swing))*.04}else{tool.rotation.x+=(0-tool.rotation.x)*Math.min(1,dt*8);rb.rotation.x*=.8}}
 // slope-aware lean
 const ahead=gy(P.x+Math.sin(P.face)*1.2,P.z+Math.cos(P.face)*1.2)-gp;rb.rotation.x+=(-Math.atan2(ahead,1.2)*.5-rb.rotation.x)*Math.min(1,dt*6)*0+0;
}
const xray=new THREE.MeshBasicMaterial({color:'#8ff4ff',transparent:true,opacity:.85,depthFunc:THREE.GreaterDepth,depthWrite:false});
function logic(dt){frameN++;
 playerStep(dt);nodeVisuals(dt);machineStep(dt);econStep(dt);droneStep(dt);gateStep(dt);ffStep(dt);baseStep(dt);roverStep(dt);lostStep(dt);updateLoot(dt);updateDrops(dt);gridStep(dt);updateParticles(dt);updateFloaters(dt);propsStep(dt);econVis(dt);dustStep(dt,P.x,P.z);craterStep(dt);
 S.playT+=dt;S.sol=1+Math.floor(S.playT/240);
 qT+=dt;if(qT>.4){qT=0;if(questStep())save()}
 svT+=dt;if(svT>6){svT=0;save()}
 shake=Math.max(0,shake-dt*1.6);
 placeCam(P.x,P.z,frameN<2);if(shake>0){cam.position.x+=(Math.random()-.5)*shake*.8;cam.position.y+=(Math.random()-.5)*shake*.8}
 UI.update(dt)}
function occluded(){for(const n of nodes){if(!n.alive||n.type==='ore')continue;const dz=n.z-P.z;if(dz<0||dz>16)continue;const rr=(n.type==='tree'?3.2:n.type==='stone'?1.6:1.4)*n.sc;if(Math.abs(n.x-P.x)<rr+1.4&&(n.type==='tree'||dz<8))return true}return false}
function draw(){cam.layers.set(0);renderer.autoClear=true;if(LOOK.on&&postRender())return;renderer.render(scene,cam);
 return;cam.layers.set(1);scene.overrideMaterial=xray;renderer.autoClear=false;const bg=scene.background,fg=scene.fog;scene.background=null;scene.fog=null;renderer.render(scene,cam);scene.background=bg;scene.fog=fg;scene.overrideMaterial=null;renderer.autoClear=true;cam.layers.set(0)}
let _fa=0,_fn=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(.05,clock.getDelta());
 if(dt<.2){_fa+=dt;_fn++;if(_fn>=90){const avg=_fa/_fn;_fa=0;_fn=0;if(avg>.034&&RPR>1.1){RPR=Math.max(1,RPR-.25);renderer.setPixelRatio(RPR);renderer.setSize(innerWidth,innerHeight,false)}}}
for(let i=0;i<(S.spd||1);i++)logic(dt);draw()}
// ================= INIT =================
function offlineGain(){const el=Math.min((Date.now()-S.saved)/1000,3*3600);if(el<45||!S.saved)return;const e0=S.coins;
 const dr={wood:0,stone:0,ore:0,crystal:0};for(let i=0;i<S.drones;i++){dr.wood+=.12*el*.5;if(S.up.dtier>=1)dr.ore+=.04*el*.5}
 for(const r of RES){const t=Math.min(Math.floor(dr[r]),Math.max(0,cap()-S.inv[r]));S.inv[r]+=t}
 PADS.forEach(p=>{p.buf=p.buf||0});
 econOffline(el*.5);const gain=S.coins-e0;ECON.dead.length=0;
 if(gain>0)setTimeout(()=>UI.toast('While you were away: +'+fmtC(gain)+' coins'),1200)}
function init(){
 const T0=performance.now();loadSave();if(S.pos&&isFinite(S.pos[0])&&isFinite(S.pos[1])){P.x=S.pos[0];P.z=S.pos[1]}ensureEcon();zoomT=zoomC=S.zoom||1;AU.on=!!S.sound;
 makeNodesAndWorld();buildProps();setupGates();setupBase();setupLost();syncRovers();
 PADS.forEach(p=>{p.buf=(S.pbuf&&S.pbuf[p.id])||0;if(machLv(p))showMachine(p)});FAC2.in=S.f2in||0;FAC2.buf=S.f2buf||0;{const gp=PADS.find(q=>q.gath);if(gp&&S.storeBuilt&&S.links[gp.id]&&S.links[gp.id]!=='F2'){const mill=S.links[gp.id];S.links[gp.id]='F2';if(!S.links.FAC2)S.links.FAC2=mill}}{const mp=PADS.find(q=>q.mill&&machLv(q));if(S.storeBuilt&&mp&&!S.links.FAC2)S.links.FAC2=mp.id}PADS.forEach(q=>{if(q.mill)delete S.links[q.id]});rebuildLinks();PADS.forEach(p=>{p.mi=(S.pmi&&S.pmi[p.id])||0;if(p.gath)p.carry=(S.pcar&&S.pcar[p.id])||0});ECON.items.length=0;for(const [k,ids,d,dest] of (S.items||[])){const path=ids.split(',').map(i=>SEG[i]);if(path.some(s=>!s))continue;let L=0;for(const s of path)L+=s.len;ECON.items.push({k,path,L,d:Math.min(d,L),m:null,dest:dest||undefined});ECON.transit[k]=(ECON.transit[k]||0)+1}gridSet(S.grid);S.spd=1;
 ZONES.forEach(z=>{if(!z.free&&S.unl[z.i]){z.ffFade=0;z.ff.grp.visible=false;z.gateRing.visible=false;z.gateBeam.visible=false}});refreshTerritory(true);
 syncDrones();UI.init();offlineGain();
 placeCam(P.x,P.z,true);
 // intro
 const L=$('load');if(L)L.remove();
 if(!S.seenIntro){const m=$('modal');m.classList.add('open');$('mp').innerHTML='<div id="intro"><div class="panel"><div class="ph"><h2>IDLE DOMESTEAD</h2></div><div class="pb"><p><b>Welcome to Mars, Operator.</b> Your robot has landed in a quiet basin full of teal alien trees, stone and ore.</p><p>• <b>Move</b>: WASD, arrow keys or the on-screen joystick.<br>• <b>Harvest</b>: stand next to a tree, rock or ore — your robot works automatically.<br>• <b>Craft</b>: bring materials to the Upgrade Center and load it. It turns them into bricks, plates, circuits and cells.<br>• <b>Build</b> machines, belts, drones and base buildings with those goods. Sell any surplus for coins.<br>• <b>Unlock</b> new zones by standing in their glowing gate ring.</p><button class="btn gold" id="go" style="height:46px;font-size:19px">START MINING</button></div></div></div>';
  $('go').onclick=()=>{AU.init();AU.unlock();S.seenIntro=1;UI.closeAll();save()};UI.openId='intro'}
 addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
 console.log('init ms',Math.round(performance.now()-T0));frame();window.__ready=true}
window.__g={makeScanUC,makeScanRobot,makeUpgradeCenter,DECOR,scene,makeRobot,linkNear,cancelLink,icon,gy,makeGeode,makeStoneStage,makeTree,makeTreeStage,bake,THREE,SEG,routeFor,reqOk,zoneAvail,unlockZone,sellNow,buildStorage,sellStorage,gcarry,FAC2,FACT2,buyTool,DROPS,dropLoot,breakNode,sellGoods,buyTool,nodeReachDist,canPay,buildAll,buyDrone,finCap,placeCam,camT,zoneAvail,zoneState,reqOk,reqProg,LOST,ownerOf,GATES,craters,heightAt,stageObj,logic,draw,S,P,nodes,PADS,ZONES,drones,UI,AU,scene,cam,renderer,setZoom,DECOR,terrVal,buyMachine,startLink,tryLink,dropLink,LINK,makeLink,linkCost,ECON,powSupply,powDemand,buildBase,BASE,rovers,unlockZone,sell,save,questStep,QUESTS,giveRes,addCoins,chips};
setTimeout(()=>{try{init()}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style="position:fixed;inset:0;z-index:999;background:#300;color:#fff;padding:12px;font-size:12px;white-space:pre-wrap">'+e.stack+'</pre>');throw e}},30);
