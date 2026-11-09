// ================= LOOK: soft post-processing (bloom, vignette, warm grade); switch off in Settings =================
const POST={rt:null,b1:null,b2:null,w:0,h:0,ok:true};
function postBuild(W,H){for(const k of ['rt','b1','b2'])if(POST[k])POST[k].dispose();
 POST.rt=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples:4,depthBuffer:true});
 const bw=Math.max(2,W>>2),bh=Math.max(2,H>>2);POST.b1=new THREE.WebGLRenderTarget(bw,bh,{type:THREE.HalfFloatType});POST.b2=new THREE.WebGLRenderTarget(bw,bh,{type:THREE.HalfFloatType});POST.w=W;POST.h=H;
 if(!POST.cam){POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,2,0,0,2]),2));
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';const mk=(fs,u,tm)=>{const m=new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false});m.toneMapped=!!tm;return m};
  POST.mBright=mk('uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));float k=smoothstep(.95,1.9,l);gl_FragColor=vec4(c*k,1.);}',{t:{value:null}});
  POST.mBlur=mk('uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*.227;s+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316;s+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.070;gl_FragColor=vec4(s,1.);}',{t:{value:null},d:{value:new THREE.Vector2()}});
  POST.mFinal=mk('uniform sampler2D t;uniform sampler2D b;varying vec2 vUv;\nvoid main(){vec3 c=texture2D(t,vUv).rgb+texture2D(b,vUv).rgb*.55;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.14)*.9;c*=mix(vec3(1.04,.97,.93),vec3(1.0,1.0,.99),smoothstep(.1,.8,l));vec2 p=vUv-.5;c*=1.-smoothstep(.28,.78,length(p*vec2(1.1,1.)))*.3;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',{t:{value:null},b:{value:null}},true);
  POST.mesh=new THREE.Mesh(g,POST.mBright);POST.mesh.frustumCulled=false;POST.sc=new THREE.Scene();POST.sc.add(POST.mesh)}}
function postPass(mat,target){POST.mesh.material=mat;renderer.setRenderTarget(target);renderer.render(POST.sc,POST.cam)}
const _pv=new THREE.Vector2();
function postRender(){if(!POST.ok)return false;try{const sz=renderer.getDrawingBufferSize(_pv),W=sz.x|0,H=sz.y|0;if(!POST.rt||POST.w!==W||POST.h!==H)postBuild(W,H);
 renderer.setRenderTarget(POST.rt);renderer.clear();renderer.render(scene,cam);
 POST.mBright.uniforms.t.value=POST.rt.texture;postPass(POST.mBright,POST.b1);
 for(let i=0;i<2;i++){POST.mBlur.uniforms.t.value=POST.b1.texture;POST.mBlur.uniforms.d.value.set(1/POST.b1.width,0);postPass(POST.mBlur,POST.b2);POST.mBlur.uniforms.t.value=POST.b2.texture;POST.mBlur.uniforms.d.value.set(0,1/POST.b1.height);postPass(POST.mBlur,POST.b1)}
 POST.mFinal.uniforms.t.value=POST.rt.texture;POST.mFinal.uniforms.b.value=POST.b1.texture;postPass(POST.mFinal,null);return true}catch(e){POST.ok=false;renderer.setRenderTarget(null);console.warn('post off',e);return false}}
