// No browser dependency. Checks model and UI handlers with a minimal DOM.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(process.argv[2]||'web');
vm.runInThisContext(fs.readFileSync(path.join(root,'model.js'),'utf8'));
if(process.argv[3]){
 const expected=JSON.parse(fs.readFileSync(process.argv[3]));
 for(const e of expected){const r=EngineModel.simulate(e.controls);assert.ok(Math.abs(r.thrust-e.thrust)<1e-7);assert.ok(Math.abs(r.fuel-e.fuel)<1e-10);r.temperatures.forEach((t,i)=>assert.ok(Math.abs(t-e.temperatures[i])<1e-8));}
 console.log('Python / JavaScript parity:',expected.length,'operating points passed');
}
assert.throws(()=>EngineModel.simulate({power:NaN,altitude_m:0,mach:0,compressor_loss:0}));
const noop=()=>{},ctx=new Proxy({}, {get:(t,k)=>t[k]||noop,set:(t,k,v)=>(t[k]=v,true)});
const elements={};function element(id){return elements[id]??=( {id,value:0,checked:true,listeners:{},dataset:{},classList:{toggle:noop},textContent:'',innerHTML:'',
 addEventListener(n,f){this.listeners[n]=f},setAttribute(n,v){this[n]=v},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:450}),setPointerCapture:noop,click(){this.clicked=true},remove:noop});}
Object.entries({power:.75,altitude_m:0,mach:0,compressor_loss:0}).forEach(([k,v])=>element(k).value=v);
const presets=['ground','cruise','degraded'].map(name=>({...element('preset-'+name),dataset:{preset:name}}));
let anchor;global.document={getElementById:element,querySelectorAll:()=>presets,body:{appendChild:noop},createElement:()=>anchor=element('download')};
global.devicePixelRatio=1;global.ResizeObserver=class{observe(){}};global.requestAnimationFrame=noop;
global.setTimeout=f=>f();
vm.runInThisContext(fs.readFileSync(path.join(root,'viewer.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'app.js'),'utf8'));
const baseline=Number(element('thrust').textContent);
presets[2].listeners.click();assert.ok(Number(element('thrust').textContent)<baseline);assert.equal(Number(element('compressor_loss').value),.1);
presets[1].listeners.click();assert.equal(Number(element('altitude_m').value),10000);assert.ok(Number.isFinite(Number(element('thrust').textContent)));
element('pause').listeners.click();assert.equal(element('pause')['aria-pressed'],'true');
element('save').listeners.click();assert.ok(anchor.clicked);assert.ok(anchor.download.endsWith('.csv'));
element('reset').listeners.click();assert.equal(Number(element('compressor_loss').value),0);assert.equal(element('pause')['aria-pressed'],'false');assert.equal(Number(element('thrust').textContent),baseline);
const viewer=new EngineViewer(element('test-canvas'));viewer.frame(0);viewer.frame(100);assert.ok(viewer.faces.length>200);const phase=viewer.phase;viewer.running=false;viewer.frame(200);assert.equal(viewer.phase,phase);
viewer.view('front');assert.equal(viewer.yaw,Math.PI/2);viewer.draw();viewer.view('home');viewer.draw();
console.log('UI handlers: presets, sliders, pause, reset, CSV, mesh and camera checks passed. Browser rendering not covered.');
