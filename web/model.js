/* Generic reduced-order dynamics, NOT an identified F414 plant or controller. */
(function(root){'use strict';
 const lag=(v,t,dt,tau)=>t+(v-t)*Math.exp(-dt/tau);
 const assumptions=Object.freeze({lpRise:3.6,hpRise:1.9,lpCoast:7,hpCoast:4.5,fuelLag:.7,gasLag:.9,metalLag:22,nozzleLag:1.2});
 class DynamicEngine{
 constructor(){this.reset();}
 reset(){this.time=0;this.command={running:true,throttle:.3,augmentor:false,loss:0,ambient:288.15};this.state={lp:.46,hp:.56,fuel:.3,gas:680,metal:430,nozzle:.35,augment:0};this.outputs=this.observe();}
 set(values){const c={...this.command,...values};for(const [k,lo,hi] of [['throttle',0,1],['loss',0,.15],['ambient',253.15,313.15]])if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('Invalid '+k);if(typeof c.running!=='boolean'||typeof c.augmentor!=='boolean')throw Error('Invalid mode');this.command=c;}
 step(dt){if(!Number.isFinite(dt)||dt<0||dt>10)throw Error('Invalid dt');let left=dt;while(left>1e-10){const h=Math.min(.01,left),s=this.state,c=this.command,a=assumptions;
 s.fuel=lag(s.fuel,c.running?.12+.88*c.throttle:0,h,a.fuelLag);
 const hpTarget=c.running?(.42+.58*Math.sqrt(s.fuel))*(1-.2*c.loss):0;
 const lpTarget=c.running?(.26+.74*s.hp)*(1-.15*c.loss):0;
 // Stored energy proportional to squared normalized speed. Illustrative time constants.
 s.hp=Math.sqrt(Math.max(0,lag(s.hp*s.hp,hpTarget*hpTarget,h,c.running?a.hpRise:a.hpCoast)));
 s.lp=Math.sqrt(Math.max(0,lag(s.lp*s.lp,lpTarget*lpTarget,h,c.running?a.lpRise:a.lpCoast)));
 const comp=c.ambient*(1+((1+10*s.hp*s.hp)**(2/7)-1)/(.86*(1-c.loss)));
 s.gas=lag(s.gas,c.running?Math.max(comp,c.ambient+420+650*s.fuel):c.ambient,h,a.gasLag);
 s.metal=lag(s.metal,s.gas,h,a.metalLag);
 s.augment=lag(s.augment,c.running&&c.augmentor&&s.hp>.55?1:0,h,.9);
 s.nozzle=lag(s.nozzle,.25+.22*s.fuel+.42*s.augment,h,a.nozzleLag);
 this.time+=h;left-=h;}return this.outputs=this.observe();}
 observe(){const s=this.state,c=this.command,pr=1+10*s.hp*s.hp;return {time:this.time,lp:s.lp*100,hp:s.hp*100,gas:s.gas,metal:s.metal,compressor:c.ambient*(1+(pr**(2/7)-1)/(.86*(1-c.loss))),exhaust:s.gas*.7+c.ambient*.3+260*s.augment,pressureRatio:pr,response:100*s.lp*s.lp*(.5+.5*s.hp)*(1-.6*c.loss)*(1+.22*s.augment),fuel:s.fuel,nozzle:s.nozzle,augment:s.augment,throttle:c.throttle,running:c.running,loss:c.loss,ambient:c.ambient};}
 }
 root.EngineDynamics={DynamicEngine,assumptions,lag};
})(globalThis);
