/* Procedural reference geometry; internal blade profiles/counts are illustrative. */
(function(root){'use strict';
 const T=()=>root.THREE;
 const PARTS=[
  {id:'fan',name:'팬 / 저압 압축부',text:'공기를 흡입하는 저압 회전자와 고정자를 표현합니다. 블레이드 형상·단수·치수는 공개 사진을 참고한 시각화 근사입니다.',x:-1.53},
  {id:'compressor',name:'고압 압축부',text:'고압축에 연결된 회전 날개와 고정 날개를 교대로 배치했습니다. 실제 F414의 부품 성능 맵이나 내부 설계 형상은 사용하지 않았습니다.',x:-.86},
  {id:'burner',name:'환형 연소기',text:'환형 라이너와 인젝터를 개념적으로 표현합니다. 가스는 빠르게 변하고 금속은 천천히 가열되는 열 응답을 관찰할 수 있습니다.',x:-.13},
  {id:'turbine',name:'고압·저압 터빈',text:'두 축에 연결된 고압·저압 터빈을 구분합니다. 서로 다른 회전 속도와 감속을 보이되, 표시 회전은 관찰을 위해 느리게 재생됩니다.',x:.38},
  {id:'augmentor',name:'후연소부',text:'긴 후방 덕트, 라이너와 화염 안정기 구조를 시각화했습니다. 후연소 선택은 교육용 열·노즐 응답을 보여주며 실제 분사·점화 제어를 재현하지 않습니다.',x:1.05},
  {id:'nozzle',name:'가변 노즐',text:'수축·확대형 노즐의 겹치는 플랩을 표현합니다. 개방은 지연을 갖고 움직이며 실제 F414 제어 스케줄과 유량 매칭은 포함되지 않습니다.',x:1.7}
 ];
 function bladeGeometry(inner,outer,chord,twist){
  const THREE=T(),pos=[],indices=[],nr=10,nc=14;
  for(let side=0;side<2;side++)for(let j=0;j<=nr;j++)for(let k=0;k<=nc;k++){
   const v=j/nr,u=k/nc,r=inner+(outer-inner)*v,angle=twist*(1-.65*v);
   const c=chord*(1-.3*v),xx=(u-.5)*c+.035*v*v,zz=(side?1:-1)*.065*c*Math.sin(Math.PI*u)+.12*c*Math.sin(Math.PI*u);
   pos.push(xx*Math.cos(angle)-zz*Math.sin(angle),r,xx*Math.sin(angle)+zz*Math.cos(angle));
  }
  const layer=(nr+1)*(nc+1);
  for(let s=0;s<2;s++)for(let j=0;j<nr;j++)for(let k=0;k<nc;k++){
   const a=s*layer+j*(nc+1)+k,b=a+1,c=a+nc+1,d=c+1;
   if(s)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
  }
  for(let j=0;j<nr;j++)for(const k of [0,nc]){const a=j*(nc+1)+k,b=a+nc+1;indices.push(a,b,a+layer,b,b+layer,a+layer);}
  for(const j of [0,nr])for(let k=0;k<nc;k++){const a=j*(nc+1)+k;indices.push(a,a+layer,a+1,a+1,a+layer,a+layer+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 class EngineViewer{
  constructor(container,onSelect){
   const THREE=T();if(!THREE)throw Error('3D 라이브러리를 불러오지 못했습니다. 압축을 모두 풀었는지 확인하세요.');
   this.container=container;this.onSelect=onSelect;this.theta=-.28;this.phi=.24;this.distance=5.5;this.explode=0;this.cutaway=true;this.heat=false;this.flow=true;this.phase=0;this.shellOpacity=1;this.sectionAngle=0;this.wireframe=false;this.isolate=false;this.autoOrbit=false;this.rotorScale=1;this.focused=false;
   this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
   this.renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;this.renderer.localClippingEnabled=true;
   this.canvas=this.renderer.domElement;this.canvas.style.touchAction='none';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','3D 엔진: 드래그 또는 방향키로 회전, 휠 또는 +/-로 확대');container.prepend(this.canvas);
   this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(35,1,.05,80);
   this.scene.add(new THREE.HemisphereLight(0xd6eaff,0x102331,2));
   for(const [color,intensity,x,y,z] of [[0xeaf4ff,4,-2,4,5],[0x7ca5d3,3,1,2,-4],[0xffc18a,2,4,1,1]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);this.scene.add(l);}
   // Procedural studio environment; no external textures or asset requests.
   const env=new THREE.Scene();env.background=new THREE.Color(0x536475);
   for(const [x,y,z,sx,sy,sz] of [[0,4,0,8,.1,5],[-4,1,2,.1,3,5],[1,0,-4,6,2,.1]]){const box=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:0xd9e9ff}));box.position.set(x,y,z);env.add(box);}
   const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,.08);this.scene.environment=this.environment.texture;pmrem.dispose();env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   const grid=new THREE.GridHelper(16,64,0x2b4658,0x1c2e3d);grid.position.y=-.68;grid.material.transparent=true;grid.material.opacity=.35;this.scene.add(grid);
   this.root=new THREE.Group();this.scene.add(this.root);this.groups={};this.rotors=[];this.casingMaterials=[];this.hotMaterials=[];this.nozzles=[];
   this.clip=new THREE.Plane(new THREE.Vector3(0,-.65,-.76),0);
   this.build();this.createFlow();this.createPlume();
   this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.bind();
   this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(container);this.fit();
   this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();const el=document.getElementById('render-error');el.hidden=false;el.textContent='그래픽 연결이 중단되었습니다. 페이지를 새로고침해 주세요.';});
  }
  mat(color,metal=.72,rough=.32,caseMaterial=false){const THREE=T(),m=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,side:THREE.DoubleSide});if(caseMaterial){m.clippingPlanes=[this.clip];this.casingMaterials.push(m);}return m;}
  mesh(group,geometry,material,x=0,y=0,z=0){const m=new (T().Mesh)(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
  tube(group,x1,x2,r1,r2,mat,open=true){const THREE=T(),g=new THREE.CylinderGeometry(r2,r1,x2-x1,64,1,open);g.rotateZ(-Math.PI/2);return this.mesh(group,g,mat,(x1+x2)/2);}
  ring(group,x,r,t,mat){const g=new (T().TorusGeometry)(r,t,8,64);g.rotateY(Math.PI/2);return this.mesh(group,g,mat,x);}
  bolts(group,x,r,count,material){const THREE=T(),g=new THREE.CylinderGeometry(.009,.009,.014,6);g.rotateZ(Math.PI/2);const m=new THREE.InstancedMesh(g,material,count),dummy=new THREE.Object3D();for(let i=0;i<count;i++){const a=i/count*Math.PI*2;dummy.position.set(x,Math.cos(a)*r,Math.sin(a)*r);dummy.rotation.set(0,0,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}group.add(m);}
  blades(group,x,inner,outer,count,chord,twist,material,spool){const THREE=T(),row=new THREE.Group();row.position.x=x;group.add(row);const g=bladeGeometry(inner,outer,chord,twist),m=new THREE.InstancedMesh(g,material,count),dummy=new THREE.Object3D();for(let i=0;i<count;i++){dummy.rotation.x=i/count*2*Math.PI;dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}row.add(m);this.tube(row,-.03,.03,inner,inner,material,false);if(spool)this.rotors.push({group:row,spool});return row;}
  build(){const THREE=T();
   const silver=this.mat(0xaebcc7),steel=this.mat(0x7c939f),dark=this.mat(0x43515b),gold=this.mat(0xa78d61),hot=this.mat(0x9a785a);
   this.hotMaterials.push(hot);
   for(const p of PARTS){const g=new THREE.Group();g.userData.part=p.id;this.groups[p.id]=g;this.root.add(g);}
   let g=this.groups.fan;
   this.tube(g,-1.955,-1.80,.01,.15,silver,false);this.tube(g,-1.80,-1.22,.15,.19,steel,false);
   const caseFan=this.mat(0x8fabbc,.8,.3,true);this.tube(g,-1.85,-1.13,.395,.41,caseFan);this.ring(g,-1.85,.397,.017,caseFan);this.ring(g,-1.14,.412,.018,caseFan);this.bolts(g,-1.13,.414,28,silver);
   for(let i=0;i<3;i++){const x=-1.75+i*.19;this.blades(g,x,.145+i*.014,.381-i*.008,24+i*4,.115,.85,silver,'lp');this.blades(g,x+.10,.16,.38-i*.008,29+i*2,.065,-.7,dark,null);}
   g=this.groups.compressor;
   this.tube(g,-1.12,-.40,.19,.24,steel,false);
   for(let i=0;i<7;i++){const x=-1.09+i*.096;this.blades(g,x,.18+i*.009,.345-i*.009,30+i*2,.055,.9,silver,'hp');this.blades(g,x+.047,.18+i*.009,.34-i*.009,33+i*2,.035,-.65,gold,null);}
   const caseComp=this.mat(0x96a5af,.82,.35,true);this.tube(g,-1.13,-.38,.403,.355,caseComp);
   for(let i=0;i<5;i++){const x=-1.1+i*.17;this.ring(g,x,.401-i*.012,.007,caseComp);}
   this.ring(g,-.4,.356,.016,caseComp);this.bolts(g,-.395,.357,24,silver);
   g=this.groups.burner;this.tube(g,-.38,.16,.35,.36,this.mat(0x909a9e,.8,.32,true));
   const liner=this.mat(0xb79267,.7,.44,true);this.hotMaterials.push(liner);this.tube(g,-.33,.12,.30,.31,liner);this.tube(g,-.32,.12,.20,.22,hot);
   for(let i=0;i<9;i++)this.ring(g,-.3+i*.047,.305,.003,liner);
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const injector=this.mesh(g,new THREE.CylinderGeometry(.015,.02,.065,8),gold,-.28,.27*Math.cos(a),.27*Math.sin(a));injector.rotation.z=Math.PI/2;}
   g=this.groups.turbine;
   this.tube(g,.16,.65,.36,.35,this.mat(0x7d9099,.7,.35,true));
   this.blades(g,.24,.18,.315,40,.07,.75,hot,'hp');this.blades(g,.34,.18,.32,43,.05,-.7,gold,null);
   this.blades(g,.48,.16,.322,42,.085,.75,hot,'lp');this.blades(g,.59,.16,.328,45,.05,-.7,dark,null);
   this.tube(g,.18,.62,.13,.14,steel,false);
   g=this.groups.augmentor;
   const aft=this.mat(0xa5adb0,.8,.4,true);this.tube(g,.65,1.48,.35,.365,aft);
   const inner=this.mat(0x7a7067,.7,.48,true);this.tube(g,.69,1.46,.315,.33,inner);this.hotMaterials.push(inner);
   for(let i=0;i<30;i++)this.ring(g,.7+i*.024,.323+i*.0004,.0035,inner);
   this.ring(g,.79,.21,.009,gold);this.ring(g,.79,.29,.008,gold);
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const bar=this.mesh(g,new THREE.BoxGeometry(.018,.22,.012),gold,.79,.22*Math.cos(a),.22*Math.sin(a));bar.rotation.x=a;}
   this.tube(g,.66,.98,.12,.015,dark,false);
   for(const x of [.69,1.13,1.46]){this.ring(g,x,x<1?.355:.368,.01,aft);this.bolts(g,x,.369,24,silver);}
   g=this.groups.nozzle;this.ring(g,1.48,.37,.019,steel);
   for(let i=0;i<18;i++){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(36),3));const petal=this.mesh(g,geo,this.mat(i%2?0x8e9aa4:0x677d8c,.85,.32));this.nozzles.push({mesh:petal,angle:i/18*2*Math.PI});}
   // Added manufactured-looking details; all dimensions are illustrative.
   const seam=this.mat(0x364653,.8,.4,true),rim=this.mat(0xb9c8d1,.88,.24,true);
   for(const [id,x,r] of [['fan',-1.85,.395],['compressor',-1.12,.403],['compressor',-.39,.355],['turbine',.17,.36],['augmentor',.66,.35],['augmentor',1.46,.365]]){
    this.ring(this.groups[id],x,r,.012,rim);this.ring(this.groups[id],x+.022,r,.004,seam);
   }
   // Radially oriented dark recesses suggest liner cooling perforations, not CFD holes.
   const recess=this.mat(0x17202a,.2,.8,true),holeGeo=new THREE.CircleGeometry(.006,8);
   const holes=new THREE.InstancedMesh(holeGeo,recess,8*48),d=new THREE.Object3D();
   for(let row=0;row<8;row++)for(let j=0;j<48;j++){const a=(j+(row%2)*.5)/48*Math.PI*2,r=.306+row*.001;
    d.position.set(-.29+row*.052,r*Math.cos(a),r*Math.sin(a));d.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(0,Math.cos(a),Math.sin(a)));d.updateMatrix();holes.setMatrixAt(row*48+j,d.matrix);}
   this.groups.burner.add(holes);
   for(let j=0;j<12;j++){const a=j/12*Math.PI*2;
    const lug=this.mesh(this.groups.nozzle,new THREE.BoxGeometry(.12,.028,.045),steel,1.50,.38*Math.cos(a),.38*Math.sin(a));lug.rotation.x=a;
    const rod=this.mesh(this.groups.nozzle,new THREE.CylinderGeometry(.007,.007,.18,10),silver,1.57,.39*Math.cos(a),.39*Math.sin(a));rod.rotation.z=Math.PI/2;
   }
   for(let j=0;j<8;j++){const a=j/8*Math.PI*2;const rib=this.mesh(this.groups.compressor,new THREE.BoxGeometry(.64,.012,.025),caseComp,-.78,.383*Math.cos(a),.383*Math.sin(a));rib.rotation.x=a;}
   // External lines and accessory gearbox: diagrammatic routing, not service CAD.
   const pipeMat=this.mat(0xc6b897,.8,.28);
   for(let i=0;i<7;i++){const a=3.5+i*.16,r=.44;const points=[[-1.12,Math.cos(a)*r,Math.sin(a)*r],[-.9,Math.cos(a)*r,Math.sin(a)*r],[-.35,Math.cos(a)*r,Math.sin(a)*r],[.0,Math.cos(a+.1)*r,Math.sin(a+.1)*r]];const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));this.mesh(this.groups.compressor,new THREE.TubeGeometry(curve,32,.006,6,false),pipeMat);}
   this.mesh(this.groups.compressor,new THREE.BoxGeometry(.36,.12,.15),steel,-.83,-.44,-.13);
   for(let i=0;i<3;i++){const c=this.mesh(this.groups.compressor,new THREE.CylinderGeometry(.055,.055,.15,20),silver,-.9+i*.13,-.49,-.08);c.rotation.x=Math.PI/2;}
   // Thin display supports beneath engine; not engine parts.
   for(const x of [-1.1,1.05]){this.mesh(this.scene,new THREE.BoxGeometry(.14,.16,.55),this.mat(0x233544,.4,.6),x,-.59,0);}
   this.selection=new THREE.Box3Helper(new THREE.Box3(),0x77d8c2);this.selection.visible=false;this.scene.add(this.selection);
  }
  createFlow(){const THREE=T(),count=500,p=new Float32Array(count*3),colors=new Float32Array(count*3);this.particleData=[];
   for(let i=0;i<count;i++){this.particleData.push({x:(i*.61803398875)%1,a:(i*.381966)%1*2*Math.PI,r:.17+.14*((i*.75487)%1)});}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
   this.particles=new THREE.Points(geo,new THREE.PointsMaterial({size:.012,vertexColors:true,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}));this.root.add(this.particles);
  }
  createPlume(){const THREE=T();const geo=new THREE.CylinderGeometry(.1,.34,1.4,32,1,true);geo.rotateZ(-Math.PI/2);
   this.plumeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform float strength; void main(){float tail=1.0-vUv.y;float wave=.65+.35*sin(vUv.y*52.0-time*10.0);vec3 c=mix(vec3(.2,.45,1.0),vec3(1.0,.42,.12),vUv.y);float a=pow(tail,1.5)*(.18+.14*wave)*strength;gl_FragColor=vec4(c,a);}' });
   this.plume=this.mesh(this.groups.nozzle,geo,this.plumeMaterial,2.6);
   this.fireLight=new THREE.PointLight(0xff9345,0,2.5);this.fireLight.position.set(.9,0,0);this.root.add(this.fireLight);
  }
  fit(){const r=this.container.getBoundingClientRect();if(r.width<=0||r.height<=0)return;this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.renderer.setSize(r.width,r.height,false);}
  bind(){let drag=null,moved=0;const canvas=this.canvas;
   canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];moved=0;canvas.setPointerCapture(e.pointerId);});
   canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag[0],dy=e.clientY-drag[1];moved+=Math.abs(dx)+Math.abs(dy);this.theta-=dx*.006;this.phi=Math.max(-1.2,Math.min(1.2,this.phi+dy*.005));drag=[e.clientX,e.clientY];}});
   canvas.addEventListener('pointerup',e=>{if(moved<6)this.pick(e);drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);
   canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(1.2,Math.min(12,this.distance*Math.exp(e.deltaY*.001)));},{passive:false});
   canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')this.theta-=.1;if(e.key==='ArrowRight')this.theta+=.1;if(e.key==='ArrowUp')this.phi=Math.min(1.2,this.phi+.08);if(e.key==='ArrowDown')this.phi=Math.max(-1.2,this.phi-.08);if(e.key==='+'||e.key==='=')this.distance=Math.max(1.2,this.distance*.9);if(e.key==='-')this.distance=Math.min(12,this.distance*1.1);});
  }
  pick(event){const r=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(Object.values(this.groups),true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object!==this.plume&&!(h.object.material?.clippingPlanes||[]).some(p=>p.distanceToPoint(h.point)<0);});if(!hit)return;let o=hit.object;while(o&&!o.userData.part)o=o.parent;if(o){this.select(o.userData.part);this.onSelect?.(o.userData.part);}}
  select(id){this.selected=id;this.selection.visible=true;}
  focus(){if(!this.selected)this.select('fan');this.focused=true;this.distance=2.1;}
  view(name){const views={front:[-Math.PI/2,0],rear:[Math.PI/2,0],side:[0,0],top:[0,1.50],bottom:[0,-1.50],iso:[-.45,.32]};const v=views[name]||views.iso;[this.theta,this.phi]=v;this.distance=5.5;this.focused=false;}
  update(o,dt){const THREE=T();this.phase+=dt;if(this.autoOrbit)this.theta+=dt*.18;
   PARTS.forEach((p,i)=>{this.groups[p.id].position.x=(i-2.5)*this.explode*.30;this.groups[p.id].visible=!this.isolate||p.id===this.selected;});
   const part=PARTS.find(p=>p.id===this.selected),target=this.focused&&part?part.x+this.groups[part.id].position.x:0;
   const dist=this.distance*(1+this.explode*.35)*Math.max(1,1.5/this.camera.aspect);
   this.camera.position.set(target+Math.sin(this.theta)*Math.cos(this.phi)*dist,Math.sin(this.phi)*dist,Math.cos(this.theta)*Math.cos(this.phi)*dist);this.camera.lookAt(target,0,0);
   const angle=this.sectionAngle||0;this.clip.normal.set(0,-Math.cos(angle+.7),-Math.sin(angle+.7));
   this.root.traverse(obj=>{if(obj.isMesh&&obj.material.type==='MeshStandardMaterial')obj.material.wireframe=!!this.wireframe;});
   for(const r of this.rotors)r.group.rotation.x+=dt*(r.spool==='lp'?o.lp:o.hp)*.045*(this.rotorScale??1);
   PARTS.forEach((p,i)=>this.groups[p.id].position.x=(i-2.5)*this.explode*.30);
   this.casingMaterials.forEach(m=>{m.clippingPlanes=this.cutaway?[this.clip]:[];m.opacity=this.shellOpacity??1;const transparent=m.opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=!transparent;});
   const hot=Math.max(0,Math.min(1,(o.metal-350)/900));this.hotMaterials.forEach(m=>{m.emissive.setHex(this.heat?0xff6524:0x33160b);m.emissiveIntensity=this.heat?hot*.8:hot*.12;});
   for(const {mesh,angle} of this.nozzles){const a=angle-.15,b=angle+.15,r=.18+.12*o.nozzle;
    const p=(x,r,t)=>[x,r*Math.cos(t),r*Math.sin(t)],A=p(1.48,.365,a),B=p(1.48,.365,b),C=p(1.76,r,a),D=p(1.76,r,b),E=p(1.955,r+.05,a),F=p(1.955,r+.05,b);
    mesh.geometry.attributes.position.array.set([...A,...C,...B,...B,...C,...D,...C,...E,...D,...D,...E,...F]);mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
   this.particles.visible=this.flow&&!this.isolate&&this.explode<.35;
   const pos=this.particles.geometry.attributes.position.array,colors=this.particles.geometry.attributes.color.array;
   for(let i=0;i<this.particleData.length;i++){const p=this.particleData[i];p.x=(p.x+dt*(.025+.16*o.lp/100))%1;const x=-1.9+p.x*4.7;pos.set([x,Math.cos(p.a)*p.r,Math.sin(p.a)*p.r],i*3);const hot=x>-.35,blue=x>1.8&&o.augment>.3;colors.set(blue?[.4,.5,1]:hot?[1,.45,.12]:[.25,.75,.85],i*3);}
   this.particles.geometry.attributes.position.needsUpdate=true;this.particles.geometry.attributes.color.needsUpdate=true;
   this.plumeMaterial.uniforms.time.value=this.phase;this.plumeMaterial.uniforms.strength.value=o.augment*.9+(o.fuel>.1?.04:0);this.plume.visible=this.flow&&!this.isolate&&this.explode<.35;this.fireLight.intensity=o.augment*3;
   if(this.selected){this.selection.box.setFromObject(this.groups[this.selected]);this.selection.updateMatrixWorld(true);}
   this.renderer.render(this.scene,this.camera);
  }
 }
 root.EngineScene={EngineViewer,PARTS,bladeGeometry};
})(globalThis);
