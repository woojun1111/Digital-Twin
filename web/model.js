/* Same conceptual equilibrium model as engine.py. SI units. */
(function(root){
  const cp=1004.5,gamma=1.4,R=287, bpr=5;
  function simulate(c){
    for(const [key,min,max] of [['power',.2,1],['altitude_m',0,11000],['mach',0,.85],['compressor_loss',0,.15]]){
      if(!Number.isFinite(c[key])||c[key]<min||c[key]>max) throw Error('입력 범위 오류: '+key);
    }
    const ta=288.15-.0065*c.altitude_m, pa=101325*(ta/288.15)**(9.80665/(R*.0065));
    const v0=c.mach*Math.sqrt(gamma*R*ta), t2=ta*(1+.2*c.mach**2),p2=pa*(t2/ta)**3.5*.99;
    const fpr=1.08+.42*c.power,cpr=3+12*c.power,eta=.88*(1-c.compressor_loss);
    const t13=t2*(1+(fpr**(2/7)-1)/.90),p13=p2*fpr;
    const t3=t13*(1+(cpr**(2/7)-1)/eta),p3=p13*cpr,t4=1000+500*c.power,p4=.95*p3;
    const f=cp*(t4-t3)/(.99*43e6-cp*t4),work=cp*((t3-t13)+6*(t13-t2));
    const t5=t4-work/((1+f)*cp*.99),p5=p4*(1-(t4-t5)/(.91*t4))**3.5;
    if(f<=0||t5<=0||p5<=pa||p13<=pa) throw Error('이 조건은 모델 적용 범위를 벗어납니다.');
    const velocity=(t,p)=>Math.sqrt(2*cp*t*.97*(1-(pa/p)**(2/7)));
    const mass=20*(.5+.5*c.power)*(p2/101325)/Math.sqrt(t2/288.15);
    const core=mass*((1+f)*velocity(t5,p5)-v0),bypass=bpr*mass*(velocity(t13,p13)-v0);
    return {temperatures:[t2,t13,t3,t4,t5],pressures:[p2,p13,p3,p4,p5],thrust:core+bypass,
      coreThrust:core,bypassThrust:bypass,fuel:mass*f,mass,efficiency:eta};
  }
  root.EngineModel={simulate};
})(globalThis);
