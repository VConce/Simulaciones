(function(){
  'use strict';
  const $=id=>document.getElementById(id),clamp=NewMath.clamp;
  const fmt=(v,d=6)=>{if(Number.isNaN(v)||v===undefined)return 'No definido';if(!Number.isFinite(v))return v<0?'−∞':'+∞';if(v===0)return '0';return (Math.abs(v)<1e-5||Math.abs(v)>=1e7?v.toExponential(d-1).replace(/(\.\d*?[1-9])0+e/,'$1e').replace(/\.0+e/,'e'):Number(v.toPrecision(d)).toString()).replace('.',',');};
  function tex(id,text,display=true){const el=typeof id==='string'?$(id):id;if(el.dataset.tex===text)return;el.dataset.tex=text;if(window.katex)katex.render(text,el,{displayMode:display,throwOnError:false,strict:'warn'});else el.textContent=text;}
  function text(id,value){$(id).textContent=value;}
  const colors={ink:'#17202f',blue:'#0864c7',red:'#c43442',teal:'#087f80',gold:'#a66a05'};
  function control(parent,{id,label,min,max,step=.01,value,log=false,onChange}){
    const el=document.createElement('div');el.className='control';
    el.innerHTML=`<div class="control-top"><label for="${id}-value">${label}</label><input id="${id}-value" type="text" inputmode="decimal" aria-describedby="${id}-error" autocomplete="off" spellcheck="false"></div><input id="${id}" type="range" aria-label="${label}" min="${min}" max="${max}" step="${step}"><span id="${id}-error" class="field-error" aria-live="polite"></span>`;
    (typeof parent==='string'?$(parent):parent).append(el);
    const range=$(id),input=$(id+'-value'),error=$(id+'-error');let current=value;
    const toRange=v=>log?Math.log10(v):v,fromRange=v=>log?10**v:v;
    const clean=v=>log?v:Number((Math.round(v/step)*step).toFixed(10));
    function sync(){range.value=toRange(current);if(document.activeElement!==input)input.value=fmt(current,9);}
    function set(v,notify=true){current=clean(clamp(v,fromRange(+range.min),fromRange(+range.max)));error.textContent='';input.removeAttribute('aria-invalid');sync();if(notify)onChange?.(current);}
    range.addEventListener('input',()=>{set(fromRange(+range.value));input.value=fmt(current,9);});
    function commit(){const raw=input.value.trim().replace(',','.');const v=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)?Number(raw):NaN;
      if(!Number.isFinite(v)||v<fromRange(+range.min)||v>fromRange(+range.max)){input.setAttribute('aria-invalid','true');error.textContent=`Entre ${fmt(fromRange(+range.min))} y ${fmt(fromRange(+range.max))}.`;return;}
      set(v);input.value=fmt(current,9);
    }
    input.addEventListener('change',commit);input.addEventListener('keydown',e=>{if(e.key==='Enter'){commit();input.blur();}if(e.key==='Escape'){input.value=fmt(current,9);error.textContent='';input.removeAttribute('aria-invalid');input.blur();}});
    set(value,false);
    return{el,range,input,get value(){return current;},set,bounds(a,b){range.min=a;range.max=b;set(current,false);}};
  }
  function nice(span,target=8){const raw=span/target,p=10**Math.floor(Math.log10(raw)),u=raw/p;return(u<1.5?1:u<3?2:u<7?5:10)*p;}
  class Plot{
    constructor(id,draw){this.canvas=$(id);this.ctx=this.canvas.getContext('2d');this.drawScene=draw;this.view={xmin:-4,xmax:4,ymin:-2,ymax:6};this.handles=[];this.drag=null;this.yLabel='y';this.xLabel='x';this.canvas.tabIndex=0;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Gráfica interactiva; parámetros equivalentes en los campos numéricos.');this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(this.canvas);this.events();}
    setView(xmin,xmax,ymin,ymax){this.view={xmin,xmax,ymin,ymax};}
    X(x){return this.left+(x-this.view.xmin)/(this.view.xmax-this.view.xmin)*this.pw;}
    Y(y){return this.top+(this.view.ymax-y)/(this.view.ymax-this.view.ymin)*this.ph;}
    wx(p){return this.view.xmin+(p-this.left)/this.pw*(this.view.xmax-this.view.xmin);}
    wy(p){return this.view.ymax-(p-this.top)/this.ph*(this.view.ymax-this.view.ymin);}
    resize(){const rect=this.canvas.getBoundingClientRect();this.w=rect.width;this.h=rect.height;const dpr=window.devicePixelRatio||1;const w=Math.round(this.w*dpr),h=Math.round(this.h*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.font='11px system-ui';const v=this.view,step=nice(v.ymax-v.ymin);let widest=0;for(let i=Math.ceil(v.ymin/step);i<=Math.floor(v.ymax/step);i++)widest=Math.max(widest,this.ctx.measureText(fmt(i*step,4)).width);this.left=Math.max(this.w<450?47:57,Math.ceil(widest+12));this.right=18;this.top=25;this.bottom=34;this.pw=this.w-this.left-this.right;this.ph=this.h-this.top-this.bottom;}
    draw(){this.resize();const c=this.ctx;c.clearRect(0,0,this.w,this.h);c.fillStyle='#fff';c.fillRect(0,0,this.w,this.h);this.grid();this.handles=[];c.save();c.beginPath();c.rect(this.left,this.top,this.pw,this.ph);c.clip();this.drawScene(this);c.restore();}
    grid(){const c=this.ctx,v=this.view,sx=nice(v.xmax-v.xmin,Math.max(3,Math.floor(this.pw/70))),sy=nice(v.ymax-v.ymin);c.font='11px system-ui';c.lineWidth=1;
      for(let i=Math.ceil(v.xmin/sx),end=Math.floor(v.xmax/sx);i<=end;i++){const x=i*sx,px=this.X(x);c.strokeStyle=i===0?'#8896a2':'#e7edf1';c.beginPath();c.moveTo(px,this.top);c.lineTo(px,this.h-this.bottom);c.stroke();c.fillStyle='#596574';c.textAlign='center';c.fillText(fmt(x,4),px,this.h-14);}
      for(let i=Math.ceil(v.ymin/sy),end=Math.floor(v.ymax/sy);i<=end;i++){const y=i*sy,py=this.Y(y);c.strokeStyle=i===0?'#8896a2':'#e7edf1';c.beginPath();c.moveTo(this.left,py);c.lineTo(this.w-this.right,py);c.stroke();c.fillStyle='#596574';c.textAlign='right';c.fillText(fmt(y,4),this.left-7,py+4);}
      c.fillStyle=colors.ink;c.textAlign='left';c.fillText(this.yLabel,this.left,14);c.textAlign='right';c.fillText(this.xLabel,this.w-3,this.h-14);
    }
    curve(f,color=colors.ink,dash=[],breaks=[]){const c=this.ctx;c.save();c.strokeStyle=color;c.lineWidth=2.5;c.setLineDash(dash);c.beginPath();let prev=null;
      for(let px=this.left;px<=this.w-this.right;px+=.8){const x=this.wx(px),y=f(x),py=this.Y(y);const discontinuity=prev&&breaks.some(b=>prev.x<=b&&x>=b);if(!Number.isFinite(y)||Math.abs(py)>1e7){prev=null;continue;}if(!prev||discontinuity)c.moveTo(px,py);else c.lineTo(px,py);prev={x,y};}c.stroke();c.restore();}
    segment(x1,y1,x2,y2,color,dash=[],width=2){const c=this.ctx;c.save();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();c.moveTo(this.X(x1),this.Y(y1));c.lineTo(this.X(x2),this.Y(y2));c.stroke();c.restore();}
    line(a,b,c,color,dash=[]){if(a===0&&b===0)return;const v=this.view;if(Math.abs(b)>=Math.abs(a))this.segment(v.xmin,(c-a*v.xmin)/b,v.xmax,(c-a*v.xmax)/b,color,dash,2.5);else this.segment((c-b*v.ymin)/a,v.ymin,(c-b*v.ymax)/a,v.ymax,color,dash,2.5);}
    vertical(x,color,dash=[4,4]){this.segment(x,this.view.ymin,x,this.view.ymax,color,dash,1.5);}
    point(x,y,color,label='',open=false,radius=6){const c=this.ctx,px=this.X(x),py=this.Y(y);if(!Number.isFinite(px)||!Number.isFinite(py))return;c.save();c.beginPath();c.arc(px,py,radius,0,2*Math.PI);c.fillStyle=open?'#fff':color;c.fill();c.lineWidth=2;c.strokeStyle=color;c.stroke();if(label){c.font='600 12px system-ui';const width=c.measureText(label).width;const lx=clamp(px+10,this.left+3,this.w-this.right-width-3),ly=clamp(py-12,this.top+16,this.h-this.bottom-5);c.fillStyle='#fff';c.fillRect(lx-2,ly-12,width+4,16);c.fillStyle=color;c.textAlign='left';c.fillText(label,lx,ly);}c.restore();}
    handle(id,x,y,color,label,move,open=false){this.point(x,y,color,label,open,7);this.handles.push({id,x,y,move});}
    area(f,lo,hi,color){const a=Math.max(lo,this.view.xmin),b=Math.min(hi,this.view.xmax);if(a>b)return;const c=this.ctx;c.beginPath();c.moveTo(this.X(a),this.Y(0));for(let px=this.X(a);px<=this.X(b);px+=1)c.lineTo(px,this.Y(f(this.wx(px))));c.lineTo(this.X(b),this.Y(f(b)));c.lineTo(this.X(b),this.Y(0));c.closePath();c.fillStyle=color;c.fill();}
    band(a,b,color){const c=this.ctx;c.fillStyle=color;c.fillRect(this.X(a),this.top,this.X(b)-this.X(a),this.ph);}
    zoom(factor,px=this.left+this.pw/2,py=this.top+this.ph/2){const v=this.view,x=this.wx(px),y=this.wy(py),span=v.xmax-v.xmin;if(span/factor<1e-5||span/factor>1e10)return;this.setView(x+(v.xmin-x)/factor,x+(v.xmax-x)/factor,y+(v.ymin-y)/factor,y+(v.ymax-y)/factor);this.resize();const dx=x-this.wx(px);this.view.xmin+=dx;this.view.xmax+=dx;this.draw();}
    events(){const canvas=this.canvas,pos=e=>{const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};};
      canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.h:1);this.zoom(Math.exp(-clamp(delta,-400,400)*.0015),p.x,p.y);},{passive:false});
      canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=pos(e),hits=this.handles.map(h=>({h,d:Math.hypot(this.X(h.x)-p.x,this.Y(h.y)-p.y)})).filter(h=>h.d<21).sort((a,b)=>a.d-b.d);this.drag={p,view:{...this.view},handle:hits[0]?.h};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
      canvas.addEventListener('pointermove',e=>{const p=pos(e);if(!this.drag){canvas.style.cursor=this.handles.some(h=>Math.hypot(this.X(h.x)-p.x,this.Y(h.y)-p.y)<21)?'ew-resize':'grab';if($('coordinates'))text('coordinates',`x = ${fmt(this.wx(p.x),5)} · y = ${fmt(this.wy(p.y),5)}`);return;}
        const d=this.drag;if(d.handle)d.handle.move(this.wx(p.x),this.wy(p.y));else{const sx=(d.view.xmax-d.view.xmin)/this.pw,sy=(d.view.ymax-d.view.ymin)/this.ph,dx=(p.x-d.p.x)*sx,dy=(p.y-d.p.y)*sy;this.setView(d.view.xmin-dx,d.view.xmax-dx,d.view.ymin+dy,d.view.ymax+dy);this.draw();}});
      const end=()=>{this.drag=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
      canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();this.zoom(1.25);}if(e.key==='-'){e.preventDefault();this.zoom(.8);}if(e.key==='Home'){e.preventDefault();this.home?.();}});
    }
  }
  function toolbar(plot,fit){plot.home=fit;$('zoom-in').onclick=()=>plot.zoom(1.25);$('zoom-out').onclick=()=>plot.zoom(.8);$('fit').onclick=fit;window.lucide?.createIcons();}
  window.MathUI={$ ,fmt,tex,text,control,Plot,toolbar,colors};
})();
