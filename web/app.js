(function(){
  const $=id=>document.getElementById(id), keys=['power','altitude_m','mach','compressor_loss'];
  const presets={ground:{power:.75,altitude_m:0,mach:0,compressor_loss:0},
    cruise:{power:.7,altitude_m:10000,mach:.78,compressor_loss:0},
    degraded:{power:.75,altitude_m:0,mach:0,compressor_loss:.1}};
  let viewer=null,result=null,controls=null;
  try{viewer=new EngineViewer($('engine'));}catch(error){$('notice').textContent=error.message;}
  const names=['흡입구','팬','압축기','연소기','터빈'];
  function update(){
    controls=Object.fromEntries(keys.map(k=>[k,Number($(k).value)]));
    $('power-value').textContent=Math.round(controls.power*100)+'%';
    $('altitude_m-value').textContent=controls.altitude_m.toLocaleString('ko-KR')+' m';
    $('mach-value').textContent=controls.mach.toFixed(2)+' M';
    $('compressor_loss-value').textContent=(controls.compressor_loss*100).toFixed(1)+'%';
    try{
      result=EngineModel.simulate(controls);
      const healthy=EngineModel.simulate({...controls,compressor_loss:0});
      $('thrust').textContent=(result.thrust/1000).toFixed(2);
      $('fuel').textContent=result.fuel.toFixed(3);
      $('temperature').textContent=result.temperatures[2].toFixed(0);
      $('pressure').textContent=(result.pressures[2]/1000).toFixed(0);
      const delta=(result.thrust-healthy.thrust)/healthy.thrust*100;
      $('thrust-delta').textContent=controls.compressor_loss>0?`정상 대비 ${delta.toFixed(1)}%`:'정상 기준 상태';
      $('healthy').textContent=(healthy.thrust/1000).toFixed(2)+' kN';
      $('current').textContent=(result.thrust/1000).toFixed(2)+' kN';
      $('efficiency').textContent=(result.efficiency*100).toFixed(2)+'%';
      drawChart(result.temperatures);
      $('stations').innerHTML=names.map((name,i)=>`<div>${name}<b>${result.temperatures[i].toFixed(0)} K</b><small>${(result.pressures[i]/1000).toFixed(1)} kPa</small></div>`).join('');
      $('save').disabled=false;
      if(viewer){viewer.power=controls.power;viewer.loss=controls.compressor_loss;}
      document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',keys.every(k=>controls[k]===presets[b.dataset.preset][k])));
    }catch(error){result=null;$('notice').textContent=error.message;$('save').disabled=true;}
  }
  function drawChart(temps){
    const W=620,H=180,left=45,top=20,base=155;
    const x=i=>left+i*(W-left-25)/4,y=t=>base-t/1700*(base-top);
    const pts=temps.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="各 지점 전온도: ${temps.map(t=>t.toFixed(0)).join(', ')} 켈빈"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffab6b" stop-opacity=".19"/><stop offset="1" stop-color="#ffab6b" stop-opacity="0"/></linearGradient></defs>`;
    for(let t=0;t<=1500;t+=500)svg+=`<line x1="${left}" x2="${W-20}" y1="${y(t)}" y2="${y(t)}" stroke="#243144" stroke-dasharray="3 5"/><text x="0" y="${y(t)+4}" fill="#7b91a9" font-size="10">${t} K</text>`;
    svg+=`<polygon points="${left},${base} ${pts} ${x(4)},${base}" fill="url(#fill)"/><polyline points="${pts}" fill="none" stroke="#ffab6b" stroke-width="2.5"/>`;
    temps.forEach((t,i)=>svg+=`<circle cx="${x(i)}" cy="${y(t)}" r="4" fill="#ffab6b"/><text x="${x(i)}" y="${y(t)-11}" text-anchor="middle" font-size="10" fill="#edc4a4">${t.toFixed(0)}</text>`);
    $('chart').innerHTML=svg+'</svg>';
  }
  function setPreset(name){for(const k of keys)$(k).value=presets[name][k];$('notice').textContent='';update();}
  keys.forEach(k=>$(k).addEventListener('input',()=>{$('notice').textContent='';update();}));
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));
  $('pause').addEventListener('click',()=>{if(!viewer)return;viewer.running=!viewer.running;$('pause').textContent=viewer.running?'Ⅱ 회전 일시정지':'▶ 회전 재생';$('pause').setAttribute('aria-pressed',String(!viewer.running));});
  $('cutaway').addEventListener('change',e=>{if(viewer)viewer.cutaway=e.target.checked;});
  $('flow').addEventListener('change',e=>{if(viewer)viewer.flow=e.target.checked;});
  for(const name of ['side','front','home'])$('view-'+name).addEventListener('click',()=>viewer?.view(name));
  $('reset').addEventListener('click',()=>{setPreset('ground');if(viewer){viewer.view('home');viewer.running=true;viewer.phase=0;viewer.cutaway=true;viewer.flow=true;}$('cutaway').checked=true;$('flow').checked=true;$('pause').textContent='Ⅱ 회전 일시정지';$('pause').setAttribute('aria-pressed','false');});
  $('fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement){if(!$('viewport').requestFullscreen)throw Error('unsupported');await $('viewport').requestFullscreen();}else await document.exitFullscreen();}catch{$('notice').textContent='전체 화면이 제한된 환경입니다. 브라우저에서 사이트를 직접 열어 주세요.';}});
  $('save').addEventListener('click',()=>{
    if(!result)return;
    const row={...controls,thrust_n:result.thrust,core_thrust_n:result.coreThrust,bypass_thrust_n:result.bypassThrust,fuel_flow_kg_s:result.fuel,core_flow_kg_s:result.mass,compressor_efficiency:result.efficiency};
    ['inlet','fan','compressor','burner','turbine'].forEach((n,i)=>{row[n+'_total_temperature_k']=result.temperatures[i];row[n+'_total_pressure_pa']=result.pressures[i];});
    const csv=Object.keys(row).join(',')+'\r\n'+Object.values(row).join(',')+'\r\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='engine-result-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('notice').textContent='현재 운전 조건과 계산 결과를 다운로드했습니다.';
  });
  update();
})();
