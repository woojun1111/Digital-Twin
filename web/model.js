/* Generic reduced-order dynamics, NOT an identified F414 plant or controller. */
(function(root){'use strict';
 // Independent constant-property teaching model. See docs/physics-v04.md.
 const physics=Object.freeze({cp:1004.675,R:287.05,gamma:1.4,ambientPressure:101325,
  coreFlow:20,bypassRatio:.4,fanPR:1.8,compressorPR:9,fanEfficiency:.88,
  compressorEfficiency:.86,turbineEfficiency:.9,shaftEfficiency:.99,
  burnerRecovery:.95,augmentorRecovery:.97,burnerEfficiency:.98,LHV:43e6,
  metalCapacity:18000,gasConductance:700,ambientConductance:50,emissivity:.7,area:.8,sigma:5.670374419e-8});
 function compress(T,P,ratio,eff){return {T:T*(1+(ratio**((physics.gamma-1)/physics.gamma)-1)/eff),P:P*ratio};}
 function expand(T,P,power,mass){const p=physics,drop=mass>0?power/(mass*p.cp*p.shaftEfficiency):0;
  const base=1-drop/(p.turbineEfficiency*T);
  return {T:T-drop,P:base>0?P*base**(p.gamma/(p.gamma-1)):0,valid:base>0};}
 function nozzle(Tt,Pt,Pa,mass){const p=physics;
  if(!(Tt>0&&Pt>Pa&&mass>0))return {valid:false,choked:false,mach:0,velocity:0,area:0,thrust:0,T:Tt,P:Pa};
  const critical=((p.gamma+1)/2)**(p.gamma/(p.gamma-1)),choked=Pt/Pa>=critical;
  const P=choked?Pt/critical:Pa,T=Tt*(P/Pt)**((p.gamma-1)/p.gamma);
  const velocity=Math.sqrt(2*p.cp*(Tt-T)),area=mass/(P/(p.R*T)*velocity);
  return {valid:true,choked,mach:velocity/Math.sqrt(p.gamma*p.R*T),velocity,area,thrust:mass*velocity+(P-Pa)*area,T,P};
 }
 function cycle(s,c){const p=physics,Pa=p.ambientPressure,mdot=p.coreFlow*s.hp,total=mdot*(1+p.bypassRatio);
  const fan=compress(c.ambient,Pa,1+(p.fanPR-1)*s.lp*s.lp,p.fanEfficiency*(1-c.loss));
  const comp=compress(fan.T,fan.P,1+(p.compressorPR-1)*s.hp*s.hp,p.compressorEfficiency*(1-c.loss));
  const fuelRatio=.008*Math.min(1,s.fuel/.12)+.018*s.fuel,fuelFlow=mdot*fuelRatio,hot=mdot+fuelFlow;
  const T4=(comp.T+fuelRatio*p.burnerEfficiency*p.LHV/p.cp)/(1+fuelRatio),P4=comp.P*p.burnerRecovery;
  const fanPower=total*p.cp*(fan.T-c.ambient),compressorPower=mdot*p.cp*(comp.T-fan.T);
  const hpt=expand(T4,P4,compressorPower,hot),lpt=expand(hpt.T,hpt.P,fanPower,hot);
  const abRatio=.008*s.augment,abFuel=hot*abRatio,T7=(lpt.T+abRatio*p.burnerEfficiency*p.LHV/p.cp)/(1+abRatio);
  const P7=lpt.P*(1-(1-p.augmentorRecovery)*s.augment);
  const core=nozzle(T7,P7,Pa,hot+abFuel),bypass=nozzle(fan.T,fan.P,Pa,mdot*p.bypassRatio);
  const valid=hpt.valid&&lpt.valid&&core.valid&&bypass.valid&&s.fuel>1e-5;
  const burnerResidual=hot*p.cp*T4-mdot*p.cp*comp.T-fuelFlow*p.burnerEfficiency*p.LHV;
  const shaftResidual=hot*p.cp*(T4-lpt.T)*p.shaftEfficiency-compressorPower-fanPower;
  return {valid,core,bypass,compressor:comp.T,gas:T4,exhaust:T7,pressureRatio:comp.P/Pa,
   massFlow:total,coreAir:mdot,mainFuelFlow:fuelFlow,augmentorFuelFlow:abFuel,fuelFlow:fuelFlow+abFuel,fanPower,compressorPower,
   thrust:valid?core.thrust+bypass.thrust:0,burnerResidual,shaftResidual,
   stations:[{name:'흡입',T:c.ambient,P:Pa},{name:'팬',...fan},{name:'압축기',...comp},
    {name:'연소기',T:T4,P:P4},{name:'고압 터빈',...hpt},{name:'저압 터빈',...lpt},{name:'후연소기',T:T7,P:P7}]};
 }
 function heatRates(metal,gas,ambient,flow){const p=physics;
  const convection=p.gasConductance*flow*(gas-metal),ambientLoss=p.ambientConductance*(metal-ambient),
   radiation=p.emissivity*p.sigma*p.area*(metal**4-ambient**4);
  return {convection,ambientLoss,radiation,net:convection-ambientLoss-radiation};
 }

 const lag=(v,t,dt,tau)=>t+(v-t)*Math.exp(-dt/tau);
 const assumptions=Object.freeze({lpRise:3.6,hpRise:1.9,lpCoast:7,hpCoast:4.5,fuelLag:.7,nozzleLag:1.2});
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
 const thermal=cycle(s,c);s.gas=thermal.gas;
 const heat=heatRates(s.metal,c.running?s.gas:c.ambient,c.ambient,c.running?s.hp:0);
 s.metal+=h*heat.net/physics.metalCapacity;
 s.augment=lag(s.augment,c.running&&c.augmentor&&s.hp>.55?1:0,h,.9);
 s.nozzle=lag(s.nozzle,.25+.22*s.fuel+.42*s.augment,h,a.nozzleLag);
 this.time+=h;left-=h;}return this.outputs=this.observe();}
 observe(){const s=this.state,c=this.command,q=cycle(s,c),heat=heatRates(s.metal,c.running?q.gas:c.ambient,c.ambient,c.running?s.hp:0);
 return {time:this.time,lp:s.lp*100,hp:s.hp*100,gas:q.gas,metal:s.metal,compressor:q.compressor,exhaust:q.exhaust,pressureRatio:q.pressureRatio,
 response:100*s.lp*s.lp*(.5+.5*s.hp)*(1-.6*c.loss)*(1+.22*s.augment),fuel:s.fuel,nozzle:s.nozzle,augment:s.augment,throttle:c.throttle,running:c.running,loss:c.loss,ambient:c.ambient,
 cycleValid:q.valid&&c.running,thrustKN:q.valid&&c.running?q.thrust/1000:0,massFlow:q.massFlow,fuelFlow:q.fuelFlow,
 compressorPowerKW:q.compressorPower/1000,fanPowerKW:q.fanPower/1000,nozzleMach:q.core.mach,nozzleVelocity:q.core.velocity,
 nozzleArea:q.core.area,choked:q.core.choked,burnerResidualW:q.burnerResidual,shaftResidualW:q.shaftResidual,
 heatKW:heat.net/1000,radiationKW:heat.radiation/1000,stations:q.stations};}

 }
 root.EngineDynamics={DynamicEngine,assumptions,lag,physics,compress,expand,nozzle,cycle,heatRates};
})(globalThis);
