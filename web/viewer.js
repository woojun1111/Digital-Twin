/* Dependency-free, perspective-projected 3D mesh viewer (Canvas 2D). */
(function(root){
  class EngineViewer {
    constructor(canvas){
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      if(!this.ctx) throw Error('이 브라우저에서 Canvas를 사용할 수 없습니다.');
      this.yaw=-.48;this.pitch=.24;this.zoom=1;this.phase=0;this.running=true;
      this.cutaway=true;this.flow=true;this.power=.75;this.loss=0;
      this.drag=null;this.last=null;this.faces=[];
      canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch+(e.clientY-this.drag.y)*.008));this.drag={x:e.clientX,y:e.clientY};});
      for(const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,()=>this.drag=null);
      canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.55,Math.min(2.3,this.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
      canvas.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;
        e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;
        if(e.key==='ArrowUp')this.pitch=Math.max(-1.2,this.pitch-.1);if(e.key==='ArrowDown')this.pitch=Math.min(1.2,this.pitch+.1);
        if(e.key==='+'||e.key==='=')this.zoom=Math.min(2.3,this.zoom*1.1);if(e.key==='-')this.zoom=Math.max(.55,this.zoom/1.1);
      });
      this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(canvas);this.fit();
      this.frame=this.frame.bind(this);this.animation=requestAnimationFrame(this.frame);
    }
    fit(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
    project(p){
      const [x,y,z]=p,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
      const rx=x*cy+z*sy,rz=-x*sy+z*cy,ry=y*cp-rz*sp,depth=y*sp+rz*cp;
      const scale=Math.min(this.width/8.5,this.height/4.5)*this.zoom*11/(11-depth);
      return [this.width*.50+rx*scale,this.height*.52-ry*scale,depth];
    }
    face(points,color,edge){const projected=points.map(p=>this.project(p));this.faces.push({p:projected,z:projected.reduce((a,p)=>a+p[2],0)/projected.length,color,edge});}
    tube(x1,x2,r1,r2,color,segments=32,cut=false){
      for(let i=0;i<segments;i++){
        const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
        // Remove the near upper quadrant to expose core machinery.
        if(cut&&Math.sin(a)>.05&&Math.cos(a)>.0)continue;
        const light=.65+.35*Math.max(0,Math.sin(a)*.7+Math.cos(a)*.3);
        const rgb=color.slice(0,3).map(v=>Math.round(v*light));
        this.face([[x1,r1*Math.sin(a),r1*Math.cos(a)],[x2,r2*Math.sin(a),r2*Math.cos(a)],
          [x2,r2*Math.sin(b),r2*Math.cos(b)],[x1,r1*Math.sin(b),r1*Math.cos(b)]],`rgba(${rgb.join(',')},${color[3]??1})`);
      }
    }
    rotor(x,r,count,color,phase){
      this.tube(x-.04,x+.12,.19,.19,[122,153,174]);
      for(let i=0;i<count;i++){
        const a=phase+i*2*Math.PI/count;
        const points=[[x,.2*Math.sin(a),.2*Math.cos(a)],
          [x+.10,r*Math.sin(a+.12),r*Math.cos(a+.12)],
          [x+.25,r*Math.sin(a+.27),r*Math.cos(a+.27)],
          [x+.14,.2*Math.sin(a+.3),.2*Math.cos(a+.3)]];
        const brightness=.70+.30*(.5+.5*Math.sin(a));
        const rgb=color.map(v=>Math.round(v*brightness));
        this.face(points,`rgb(${rgb.join(',')})`,'rgba(10,28,42,.5)');
        this.face(points.map(p=>[p[0]+.035,p[1],p[2]]),`rgb(${rgb.map(v=>Math.round(v*.6)).join(',')})`);
      }
    }
    path(points,color,width=1){const ctx=this.ctx;ctx.beginPath();points.forEach((p,i)=>{const s=this.project(p);i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    view(name){this.zoom=1;this.yaw=name==='front'?Math.PI/2:name==='side'?0:-.48;this.pitch=name==='front'?0:name==='side'?.06:.24;}
    frame(time){
      const dt=this.last===null?0:Math.min((time-this.last)/1000,.05);this.last=time;
      if(this.running)this.phase+=(.7+this.power*2)*dt;
      this.draw();this.animation=requestAnimationFrame(this.frame);
    }
    draw(){
      const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);this.faces=[];
      for(let x=-5;x<=5;x++)this.path([[x,-1.55,-3],[x,-1.55,3]],'rgba(83,127,157,.12)');
      for(let z=-3;z<=3;z++)this.path([[-5,-1.55,z],[5,-1.55,z]],'rgba(83,127,157,.12)');
      // Nacelle, core housing, shaft and tapered spinner.
      this.tube(-3.1,1.5,1.34,1.17,[100,159,180,this.cutaway?.11:.82],40,this.cutaway);
      this.tube(-3.2,-3.07,1.34,1.34,[178,211,222,.85],48,this.cutaway);
      this.tube(1.5,1.62,1.17,1.14,[120,177,196,.6],48,this.cutaway);
      this.tube(-2.6,2.6,.69,.57,[96,135,158,.16],32,true);
      this.tube(-3.45,-2.8,.025,.23,[180,204,217]);
      this.tube(-2.8,2.6,.17,.17,[111,149,169]);
      this.rotor(-2.8,1.24,26,[124,211,224],this.phase);
      for(let i=0;i<5;i++)this.rotor(-2.0+i*.34,.64-i*.035,18,[123,164,198],this.phase*1.5);
      this.tube(-.25,.80,.59,.61,[243,135,65,.72],36,true);
      for(let x=-.2;x<.85;x+=.23)this.tube(x,x+.035,.61,.61,[255,179,98,.9],36,true);
      for(let i=0;i<3;i++)this.rotor(1.05+i*.33,.60-i*.025,18,[229,178,113],this.phase*(i===0?1.5:1));
      this.tube(2.10,3.05,.58,.36,[138,157,176,.72],32,this.cutaway);
      this.tube(2.0,3.25,.18,.02,[110,149,173]);
      this.faces.sort((a,b)=>a.z-b.z);
      for(const f of this.faces){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();if(f.edge){ctx.strokeStyle=f.edge;ctx.lineWidth=.5;ctx.stroke();}}
      if(this.flow){
        for(let lane=0;lane<5;lane++)for(let i=0;i<13;i++){
          const x=((i*.54+this.phase*.45)%7)-3.5;
          const a=lane/5*2*Math.PI,rad=lane<3?.94:.35;
          const p=this.project([x,Math.sin(a)*rad,Math.cos(a)*rad]);
          ctx.fillStyle=x>.0&&lane>=3?'rgba(255,168,92,.8)':'rgba(97,227,210,.6)';
          ctx.beginPath();ctx.arc(p[0],p[1],1.5,0,Math.PI*2);ctx.fill();
        }
      }
      if(Math.abs(Math.cos(this.yaw))>.45){
        for(const [x,name] of [[-2.8,'FAN'],[-1.3,'COMPRESSOR'],[.3,'BURNER'],[1.4,'TURBINE'],[2.7,'NOZZLE']]){
          const p=this.project([x,1.58,0]);ctx.fillStyle='#a6bfd0';ctx.font='9px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillText(name,p[0],p[1]);
          const end=this.project([x,1.40,0]);ctx.strokeStyle='#3b586c';ctx.beginPath();ctx.moveTo(p[0],p[1]+5);ctx.lineTo(end[0],end[1]);ctx.stroke();
        }
      }
    }
  }
  root.EngineViewer=EngineViewer;
})(globalThis);
