const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(process.argv[2]||'web');
vm.runInThisContext(fs.readFileSync(path.join(root,'model.js'),'utf8'));
const {DynamicEngine,lag}=EngineDynamics;let count=0;
function test(name,fn){fn();console.log('PASS',name);count++;}
function run(e,seconds,dt=.01){for(let i=0;i<Math.round(seconds/dt);i++)e.step(dt);return e.outputs;}
test('analytic constant-target heat exchange',()=>assert.ok(Math.abs(lag(300,900,22,22)-(900-600/Math.E))<1e-10));
test('zero dt preserves state',()=>{const e=new DynamicEngine(),s=JSON.stringify(e.outputs);e.step(0);assert.equal(JSON.stringify(e.outputs),s);});
test('command does not instantaneously change shaft state',()=>{const e=new DynamicEngine(),lp=e.outputs.lp;e.set({throttle:1});assert.equal(e.outputs.lp,lp);e.step(.01);assert.ok(e.outputs.lp-lp<1);});
test('high pressure spool initially responds faster',()=>{const e=new DynamicEngine();run(e,60);const a=e.outputs;e.set({throttle:1});run(e,1);assert.ok(e.outputs.hp-a.hp>e.outputs.lp-a.lp);});
test('temperature lag and cooling',()=>{const e=new DynamicEngine();e.set({throttle:1});run(e,10);assert.ok(e.outputs.gas>e.outputs.metal);e.set({running:false});run(e,5);assert.ok(e.outputs.metal>e.outputs.gas);run(e,400);assert.ok(Math.abs(e.outputs.metal-e.command.ambient)<.01);assert.ok(e.outputs.lp<.01);});
test('frame partition invariance',()=>{const a=new DynamicEngine(),b=new DynamicEngine();a.set({throttle:.8});b.set({throttle:.8});run(a,20,.01);run(b,20,.1);for(const k of ['lp','hp','gas','metal'])assert.ok(Math.abs(a.outputs[k]-b.outputs[k])<1e-7);});
test('step size convergence .01 vs .005',()=>{const a=new DynamicEngine(),b=new DynamicEngine();a.set({throttle:1});b.set({throttle:1});run(a,10,.01);run(b,10,.005);assert.ok(Math.abs(a.outputs.hp-b.outputs.hp)<.05);assert.ok(Math.abs(a.outputs.metal-b.outputs.metal)<.5);});
test('augmentor raises exhaust and opening',()=>{const a=new DynamicEngine(),b=new DynamicEngine();a.set({throttle:.8});b.set({throttle:.8,augmentor:true});run(a,40);run(b,40);assert.ok(b.outputs.exhaust>a.outputs.exhaust);assert.ok(b.outputs.nozzle>a.outputs.nozzle);});
test('shutdown removes augmentor',()=>{const e=new DynamicEngine();e.set({augmentor:true,throttle:1});run(e,20);e.set({running:false});run(e,20);assert.ok(e.outputs.augment<1e-6);});
test('efficiency scenario decreases response',()=>{const a=new DynamicEngine(),b=new DynamicEngine();b.set({loss:.15});run(a,80);run(b,80);assert.ok(b.outputs.response<a.outputs.response);});
test('long running input sweep is finite and bounded',()=>{for(const ambient of [253.15,313.15])for(const loss of [0,.15])for(const throttle of [0,1]){const e=new DynamicEngine();e.set({ambient,loss,throttle,augmentor:true});run(e,120,.1);for(const v of Object.values(e.outputs))if(typeof v==='number')assert.ok(Number.isFinite(v));assert.ok(e.outputs.lp>=0&&e.outputs.lp<=100);assert.ok(e.outputs.nozzle>=0&&e.outputs.nozzle<=1);}});
test('invalid controls and dt rejected',()=>{const e=new DynamicEngine();for(const v of [NaN,Infinity,-1,2])assert.throws(()=>e.set({throttle:v}));for(const v of [NaN,-1,11])assert.throws(()=>e.step(v));});
console.log(count+' dynamics tests passed');
