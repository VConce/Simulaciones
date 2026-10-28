(()=>{
  'use strict';
  const U=MathUI,M=NewMath,{$,fmt,tex,text,colors:C}=U;
  const a=U.control('a-control',{id:'a',label:'Punto a',min:-5,max:5,value:1,onChange:update});
  const h=U.control('h-control',{id:'h',label:'Magnitud |h|',min:-6,max:.3,step:.02,value:.5,log:true,onChange:update});
  const r=U.control('rs-controls',{id:'r',label:'r',min:-4,max:4,value:1,onChange:update});
  const s=U.control('rs-controls',{id:'s',label:'s',min:-4,max:4,value:-1,onChange:update});
  let plot=new U.Plot('plot',draw);
  function state(){const mode=$('mode').value;return{kind:$('function').value,mode,a:a.value,r:mode==='generalized'?r.value:1,s:mode==='generalized'?s.value:mode==='symmetric'?-1:0,h:h.value*(mode==='left'?-1:mode==='right'?1:+$('h-sign').value)};}
  function update(){
    if(!plot)return;const t=state(),q=M.quotient(t.kind,t.a,t.r,t.s,t.h),lim=M.generalizedLimits(t.kind,t.a,t.r,t.s),facts=M.derivativeFacts(t.kind,t.a);
    $('rs-controls').hidden=t.mode!=='generalized';$('h-sign').disabled=t.mode==='left'||t.mode==='right';
    if(t.mode==='left'||t.mode==='right')$('h-sign').value=t.mode==='left'?'-1':'1';
    $('invalid').hidden=lim.valid;
    text('quotient',fmt(q));text('h-current',fmt(t.h));text('separation',fmt((t.r-t.s)*t.h));text('xs',fmt(t.a+t.s*t.h));text('xr',fmt(t.a+t.r*t.h));
    const selected=t.mode==='left'?lim.left:t.mode==='right'?lim.right:lim.value;
    const exists=lim.valid&&(t.mode==='left'||t.mode==='right'?Number.isFinite(selected):lim.exists);
    $('exact-status').classList.toggle('warn',!exists);
    $('exact-status').innerHTML=`<strong>${!lim.valid?'Cociente no definido':exists?'Límite seleccionado: '+fmt(selected):'No existe un límite finito'}</strong><p>Continuidad en a: ${facts.continuous?'sí':'no'}.<br>Derivada ordinaria: ${facts.ordinary.exists?fmt(facts.ordinary.value):'no existe'}.<br>Derivada simétrica: ${facts.symmetric.exists?fmt(facts.symmetric.value):'no existe finita'}.</p>`;
    let def;
    if(t.mode==='generalized')def=String.raw`Q_{r,s}(h)=\frac{f(a+rh)-f(a+sh)}{(r-s)h}`;
    else if(t.mode==='symmetric')def=String.raw`Q_s(h)=\frac{f(a+h)-f(a-h)}{2h}`;
    else def=String.raw`Q(h)=\frac{f(a+h)-f(a)}h`;
    tex('definition',def);
    tex('exact-formula',lim.valid?String.raw`\lim_{h\to0^-}Q(h)=${texNum(lim.left)},\quad\lim_{h\to0^+}Q(h)=${texNum(lim.right)}`:String.raw`r=s\Rightarrow (r-s)h=0`);
    $('quotient-table').innerHTML=[1,.1,.01,.001,.0001,.00001,.000001].map(v=>`<tr><td>${fmt(v)}</td><td>${fmt(M.quotient(t.kind,t.a,t.r,t.s,-v))}</td><td>${fmt(M.quotient(t.kind,t.a,t.r,t.s,v))}</td></tr>`).join('');
    plot.canvas.setAttribute('aria-label',`Función ${t.kind}, a = ${fmt(t.a)}. Cociente ${fmt(q)}. Límite derecho ${fmt(lim.right)}; izquierdo ${fmt(lim.left)}.`);plot.draw();
  }
  function texNum(v){return Number.isNaN(v)?String.raw`\text{no definido}`:v===Infinity?String.raw`+\infty`:v===-Infinity?String.raw`-\infty`:String(v);}
  function draw(p){
    const t=state(),f=x=>M.value(t.kind,x),q=M.quotient(t.kind,t.a,t.r,t.s,t.h),facts=M.derivativeFacts(t.kind,t.a);
    if(t.kind==='spike'){p.curve(()=>0);p.point(0,0,C.ink,'',true);p.point(0,1,C.ink);}
    else if(t.kind==='sign'){p.curve(x=>x===0?NaN:Math.sign(x),C.ink,[],[0]);p.point(0,1,C.ink,'',true);p.point(0,-1,C.ink,'',true);p.point(0,0,C.ink);}
    else p.curve(f);
    const xs=t.a+t.s*t.h,xr=t.a+t.r*t.h;
    if(Number.isFinite(q))p.line(-q,1,f(xs)-q*xs,C.blue);
    if(facts.ordinary.exists)p.line(-facts.ordinary.value,1,f(t.a)-facts.ordinary.value*t.a,C.red,[5,5]);
    if(t.kind==='spike'){p.point(0,0,C.ink,'',true);p.point(0,1,C.ink);}
    if(t.kind==='sign'){p.point(0,1,C.ink,'',true);p.point(0,-1,C.ink,'',true);p.point(0,0,C.ink);}
    if(t.r!==t.s){p.point(xs,f(xs),C.teal,'s',true);p.point(xr,f(xr),C.blue,'r',true);}
    p.vertical(t.a,C.red,[2,5]);p.handle('a',t.a,f(t.a),C.red,'a',x=>a.set(x));
  }
  function fit(){const t=state();plot.setView(t.a-3.5,t.a+3.5,t.kind==='square'?-1:-2,t.kind==='square'?Math.max(5,t.a*t.a+5):2.5);plot.draw();}
  $('function').onchange=()=>{update();fit();};$('mode').onchange=update;$('h-sign').onchange=update;
  $('example').onchange=()=>{const v=$('example').value;if(!v)return;$('function').value={smooth:'square',corner:'abs',isolated:'spike',jump:'sign'}[v];a.set(v==='smooth'?1:0,false);$('mode').value=v==='smooth'?'ordinary':'symmetric';h.set(.5,false);update();fit();};
  U.toolbar(plot,fit);document.querySelectorAll('[data-static-tex]').forEach(el=>tex(el,el.dataset.staticTex));
  window.mathLab={state,plot,update,controls:{a,h,r,s}};update();fit();
})();
