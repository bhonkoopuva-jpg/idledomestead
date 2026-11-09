// ================= LAYOUT (placed by the in-game edit mode; saved in localStorage, bake a copy into DEFAULT_LAYOUT) =================
const EDIT={on:0};
const LOOK={on:(()=>{let v='1';try{v=localStorage.getItem('idle-domestead-look')||'1'}catch(e){}const m=/[?&]look=(\d)/.exec(location.search);if(m)v=m[1];return v!=='0'})()};const TERR_SOFT={value:LOOK.on?1:0};
const LAYOUT_KEY='idle-domestead-layout-v1';
const DEFAULT_LAYOUT=null;
const LAY=(()=>{const d={uc:{x:0,z:-10,r:.698},store:{x:14,z:80},sell:{x:0,z:5.4},pads:{},nodes:null,props:[],decorDel:[]};let s=null;try{s=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null')}catch(e){}s=s||DEFAULT_LAYOUT;
 if(s){for(const k of ['uc','store','sell'])if(s[k]&&isFinite(s[k].x)&&isFinite(s[k].z))d[k]=Object.assign(d[k],s[k]);if(s.pads)d.pads=s.pads;if(Array.isArray(s.nodes))d.nodes=s.nodes;if(Array.isArray(s.props))d.props=s.props;if(Array.isArray(s.decorDel))d.decorDel=s.decorDel}return d})();
function applyLayoutZones(zs){zs.forEach(z=>(z.pads||[]).forEach((p,i)=>{if(p.ox===undefined){p.ox=p.x;p.oz=p.z}const o=LAY.pads[z.id+i];if(o&&isFinite(o.x)&&isFinite(o.z)){p.x=o.x-z.x;p.z=o.z-z.z}}))}
