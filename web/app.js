(function(){'use strict';
 const $=id=>document.getElementById(id),engine=new EngineDynamics.DynamicEngine();
 let viewer=null,paused=false,rate=1,last=null,sample=0,history=[],baseline=[],scenario=null,chartMode='speed',lastUI=0;
 try{viewer=new EngineScene.EngineViewer($('viewport'),selectPart);}catch(e){$('render-error').hidden=false;$('render-error').textContent='3D 화면을 열 수 없습니다. Edge/Chrome의 그래픽 가속을 확인하세요. '+e.message;}
 const fmt=(v,n=1)=>Number(v).toFixed(n);
 function selectPart(id){const p=EngineScene.PARTS.find(p=>p.id===id);if(!p)return;$('inspect-part').value=id;$('part-name').textContent=p.name;$('part-detail').textContent=p.text;document.querySelectorAll('[data-part]').forEach(b=>b.classList.toggle('active',b.dataset.part===id));viewer?.select(id);}
 EngineScene.PARTS.forEach(p=>{const b=document.createElement('button');b.textContent=p.name;b.dataset.part=p.id;b.addEventListener('click',()=>selectPart(p.id));$('parts-list').appendChild(b);});selectPart('fan');
 function sync(){const c=engine.command;$('throttle').value=c.throttle;$('loss').value=c.loss;$('ambient').value=c.ambient-273.15;$('augmentor').checked=c.augmentor;$('throttle-value').textContent=Math.round(c.throttle*100)+'%';$('loss-value').textContent=fmt(c.loss*100)+'%';$('ambient-value').textContent=fmt(c.ambient-273.15,0)+'°C';$('engine-switch').textContent=c.running?'● 운전 중 · 정지':'▶ 엔진 운전 시작';$('engine-switch').classList.toggle('engine-on',c.running);}
 function stopScenario(){scenario=null;$('scenario-status').textContent='수동 조작';$('stop-scenario').hidden=true;}
 function manual(){stopScenario();engine.set({throttle:Number($('throttle').value),loss:Number($('loss').value),ambient:Number($('ambient').value)+273.15,augmentor:$('augmentor').checked});sync();}
 for(const id of ['throttle','loss','ambient'])$(id).addEventListener('input',manual);$('augmentor').addEventListener('change',manual);
 $('engine-switch').addEventListener('click',()=>{stopScenario();engine.set({running:!engine.command.running});sync();});
 function reset(){engine.reset();history=[];sample=0;paused=false;last=null;stopScenario();$('pause').textContent='Ⅱ 일시정지';sync();}
 $('reset').addEventListener('click',()=>{reset();$('notice').textContent=baseline.length?'초기화했습니다. 저장된 기준선은 유지됩니다.':'초기 조건으로 돌아왔습니다.';});
 $('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ 시뮬레이션 재생':'Ⅱ 일시정지';});
 document.querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>{rate=Number(b.dataset.rate);document.querySelectorAll('[data-rate]').forEach(x=>x.classList.toggle('active',x===b));}));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{viewer?.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));}));
 $('experiment-preset').addEventListener('change',e=>{const configs={nominal:[288.15,0],cold:[253.15,0],hot:[313.15,0],degraded:[288.15,.1]},c=configs[e.target.value];if(!c)return;stopScenario();engine.set({running:true,throttle:.6,augmentor:false,ambient:c[0],loss:c[1]});sync();$('notice').textContent='시험 조건을 적용했습니다. 기존 기록과 이어서 비교합니다.';});
 $('inspect-part').addEventListener('change',e=>selectPart(e.target.value));
 $('focus-part').addEventListener('click',()=>viewer?.focus?.());
 for(const [id,key] of [['isolate','isolate'],['auto-orbit','autoOrbit'],['wireframe','wireframe']])$(id).addEventListener('change',e=>{if(viewer){viewer[key]=e.target.checked;if(key==='isolate'&&e.target.checked)viewer.focus?.();}});
 for(const [id,key,scale] of [['shell-opacity','shellOpacity',1],['section-angle','sectionAngle',Math.PI/180],['rotor-scale','rotorScale',1]])$(id).addEventListener('input',e=>{if(viewer)viewer[key]=Number(e.target.value)*scale;});
 $('display-preset').addEventListener('change',e=>{const name=e.target.value,options={section:[true,1,0],exterior:[false,1,0],xray:[false,.2,0],assembly:[true,1,1]},v=options[name];if(!v)return;
  $('cutaway').checked=v[0];$('shell-opacity').value=v[1];$('explode').value=v[2];$('isolate').checked=false;$('wireframe').checked=false;$('section-angle').value=0;
  if(viewer){Object.assign(viewer,{cutaway:v[0],shellOpacity:v[1],explode:v[2],isolate:false,wireframe:false,sectionAngle:0});viewer.view('iso');}
 });
 $('camera-reset').addEventListener('click',()=>viewer?.view('iso'));
 for(const [id,key] of [['cutaway','cutaway'],['flow','flow'],['heat','heat']])$(id).addEventListener('change',e=>{if(viewer)viewer[key]=e.target.checked;});
 $('explode').addEventListener('input',e=>{if(viewer)viewer.explode=Number(e.target.value);});
 $('chart-mode').addEventListener('change',e=>{chartMode=e.target.value;drawChart();});
 document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{reset();scenario={type:b.dataset.scenario,stage:-1};$('stop-scenario').hidden=false;$('notice').textContent='자동 실험을 시작했습니다. 입력을 조절하면 수동으로 전환됩니다.';}));
 $('stop-scenario').addEventListener('click',stopScenario);
 function runScenario(){if(!scenario)return;const t=engine.time,thermal=scenario.type==='thermal';
  const stage=thermal?(t<3?0:t<18?1:t<50?2:3):(t<4?0:t<17?1:t<27?2:t<40?3:4);
  if(stage===scenario.stage)return;scenario.stage=stage;
  if(thermal){if(stage===0)engine.set({throttle:.15});if(stage===1)engine.set({throttle:.85,augmentor:true});if(stage===2)engine.set({running:false,augmentor:false});if(stage===3){stopScenario();return;}}
  else{if(stage===0)engine.set({throttle:.15});if(stage===1)engine.set({throttle:.9});if(stage===2)engine.set({throttle:.2});if(stage===3)engine.set({running:false});if(stage===4){stopScenario();return;}}
  $('scenario-status').textContent=(thermal?'열 응답':'가속·감속')+' · '+(stage+1)+'단계';sync();
 }
 function record(){history.push({...engine.outputs});if(history.length>12000)history.shift();}
 $('baseline').addEventListener('click',()=>{if(history.length<2){$('notice').textContent='잠시 운전한 뒤 기준선을 저장해 주세요.';return;}baseline=history.map(p=>({...p}));$('notice').textContent='기준선을 저장했습니다. 초기화 후 다른 조건으로 비교하세요.';});
 $('download').addEventListener('click',()=>{const records=history.length?history:[engine.outputs];const columns=['time','throttle','running','loss','ambient','lp','hp','gas','metal','compressor','exhaust','pressureRatio','response','fuel','nozzle','augment','cycleValid','thrustKN','massFlow','fuelFlow','compressorPowerKW','fanPowerKW','nozzleMach','nozzleVelocity','nozzleArea','choked','burnerResidualW','shaftResidualW','heatKW','radiationKW'];
  const stationColumns=Array.from({length:7},(_,i)=>['station'+i+'_T_K','station'+i+'_Pt_Pa']).flat();
  const lines=['model_kind,'+[...columns,...stationColumns].join(','),...records.map(r=>'generic_cycle_v04,'+[...columns.map(k=>typeof r[k]==='number'?r[k].toFixed(6):r[k]),...r.stations.flatMap(s=>[s.T.toFixed(6),s.P.toFixed(6)])].join(','))];
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='engine-experiment-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('notice').textContent=records.length+'개 시점의 교육용 모델 기록을 저장했습니다.';
 });
 for(const id of ['evidence','source-open'])$(id).addEventListener('click',()=>{if($('sources').showModal)$('sources').showModal();else $('sources').setAttribute('open','');});
 $('close-sources').addEventListener('click',()=>$('sources').close());
 const exit=document.createElement('button');exit.textContent='전체 화면 닫기';exit.className='fs-exit';exit.hidden=true;$('viewport').appendChild(exit);exit.addEventListener('click',()=>document.exitFullscreen());
 document.addEventListener('fullscreenchange',()=>{exit.hidden=!document.fullscreenElement;});
 $('fullscreen').addEventListener('click',async()=>{try{await $('viewport').requestFullscreen();}catch{$('notice').textContent='전체 화면이 제한된 환경입니다. 사이트를 별도 탭에서 열어 주세요.';}});
 function paint(){const o=engine.outputs;
 $('cycle-thrust').textContent=o.cycleValid?fmt(o.thrustKN,2):'—';$('cycle-power').textContent=fmt(o.compressorPowerKW,0);
 $('cycle-mach').textContent='M '+fmt(o.nozzleMach,2);$('cycle-nozzle').textContent=o.cycleValid?(o.choked?'초크 · 수축 노즐 근사':'비초크 · 수축 노즐 근사'):'준정상 추력 해석 범위 밖';
 $('cycle-heat').textContent=fmt(o.heatKW,1);$('cycle-status').textContent=o.cycleValid?'일반 모델 · 계산 중':'정지 / 해석 제한';
 $('station-rows').innerHTML=o.stations.map(s=>'<tr><td>'+s.name+'</td><td>'+fmt(s.T,1)+'</td><td>'+fmt(s.P/1000,1)+'</td></tr>').join('');
 $('cycle-balance').textContent='가정 흡입유량 '+fmt(o.massFlow,2)+' kg/s · 연료 '+fmt(o.fuelFlow,3)+' kg/s · 연소기 / 축동력 대수 잔차 '+o.burnerResidualW.toExponential(1)+' / '+o.shaftResidualW.toExponential(1)+' W';for(const k of ['lp','hp','gas','metal'])$(k).textContent=fmt(o[k],k==='gas'||k==='metal'?0:1);$('lp-bar').style.width=Math.min(100,o.lp)+'%';$('hp-bar').style.width=Math.min(100,o.hp)+'%';$('response').textContent=fmt(o.response)+' / 기준 100';$('nozzle-value').textContent=fmt(o.nozzle*100,0)+'%';$('clock').textContent=String(Math.floor(o.time/60)).padStart(2,'0')+':'+fmt(o.time%60).padStart(4,'0');$('status').textContent=paused?'시간 정지':engine.command.running?'운전 중':'감속 · 냉각 중';drawChart();}
 function drawChart(){const canvas=$('chart'),ctx=canvas.getContext('2d');if(!ctx)return;const r=canvas.getBoundingClientRect(),w=r.width||600,h=170,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==h*dpr){canvas.width=Math.round(w*dpr);canvas.height=h*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const modes={thermal:{keys:['gas','metal'],max:1900,min:0,label:'● 가스　● 금속 [K]',colors:['#e8ae72','#de7d67']},response:{keys:['response'],max:130,min:0,label:'● 교육용 응답 지수'},thrust:{keys:['thrustKN'],max:35,min:0,label:'● 가상 정적 추력 [kN] · 정지/해석 제한 시 0'},heat:{keys:['heatKW'],max:450,min:-150,label:'● 금속 순열유입 [kW]'},speed:{keys:['lp','hp'],max:110,min:0,label:'● N₁　● N₂ [%]'}};
  const config=modes[chartMode]||modes.speed,keys=config.keys,min=config.min,colors=config.colors||['#79d8c2','#80aff5'];
  const end=Math.max(10,engine.time),start=Math.max(0,end-60),left=40,right=w-12,top=15,bottom=145,x=t=>left+(t-start)/(end-start)*(right-left);
  const visible=[...history,...baseline].filter(p=>p.time>=start&&p.time<=end),max=Math.max(config.max,...visible.flatMap(p=>keys.map(k=>p[k]*1.05))),y=v=>bottom-(v-min)/(max-min)*(bottom-top);

  ctx.font='9px Segoe UI';ctx.lineWidth=1;for(let i=0;i<=3;i++){const v=min+(max-min)*i/3,yy=y(v);ctx.strokeStyle='#233446';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='#657e95';ctx.fillText(Math.round(v),0,yy+3);}
  for(let i=0;i<=4;i++){const t=start+(end-start)*i/4;ctx.fillStyle='#657e95';ctx.fillText(Math.round(t)+' s',x(t)-8,162);}
  function trace(data,key,color,dashed){ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();ctx.strokeStyle=color;ctx.lineWidth=dashed?1:1.8;ctx.globalAlpha=dashed?.4:1;ctx.setLineDash(dashed?[4,4]:[]);ctx.beginPath();let begun=false;for(const p of data){if(p.time<start||p.time>end)continue;if(!begun){ctx.moveTo(x(p.time),y(p[key]));begun=true;}else ctx.lineTo(x(p.time),y(p[key]));}ctx.stroke();ctx.restore();}
  keys.forEach((k,i)=>{if(baseline.length)trace(baseline,k,colors[i],true);trace(history,k,colors[i],false);});$('chart-legend').textContent=config.label+(baseline.length?'　┄ 저장 기준선':'');
 }
 function frame(now){const elapsed=last===null?0:Math.min((now-last)/1000,.10);last=now;let dt=paused||document.hidden?0:elapsed*rate;
  while(dt>1e-9){runScenario();const h=Math.min(.01,dt);engine.step(h);sample+=h;if(sample>=.1-1e-9){record();sample-=.1;}dt-=h;}
  try{viewer?.update(engine.outputs,paused||document.hidden?0:elapsed*rate);}catch(e){$('render-error').hidden=false;$('render-error').textContent='3D 렌더링 오류: '+e.message;viewer=null;}
  if(now-lastUI>100){paint();lastUI=now;}requestAnimationFrame(frame);
 }
 sync();record();paint();requestAnimationFrame(frame);
 rootState();function rootState(){globalThis.engineLab={engine,getHistory:()=>history.map(r=>({...r})),getBaseline:()=>baseline.map(r=>({...r})),getViewer:()=>viewer};}
})();
