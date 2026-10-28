(()=>{
  'use strict';
  const U=MathUI,M=NewMath,{$,fmt,tex,text,colors:C}=U;
  const a=U.control('taylor-controls',{id:'a',label:'Centro a',min:-3,max:3,step:.01,value:0,onChange:update});
  const n=U.control('taylor-controls',{id:'n',label:'Orden n',min:0,max:15,step:1,value:4,onChange:update});
  const x=U.control('taylor-controls',{id:'x',label:'Evaluación x',min:-6,max:8,step:.01,value:1,onChange:update});
  let plot=new U.Plot('plot',draw);
  function state(){return{kind:$('function').value,a:a.value,n:n.value,x:x.value};}
  function update(){
    if(!plot)return;const t=state(),r=M.taylor(t.kind,t.a,t.n,t.x);
    $('center-invalid').hidden=r.valid;
    text('f-value',fmt(r.f));text('p-value',fmt(r.p));text('error-value',fmt(r.error));text('bound-value',fmt(r.bound));text('radius',r.radius===Infinity?'∞':fmt(r.radius));
    text('bound-label',t.kind==='geometric'?'Módulo del resto exacto (aprox.)':'Cota de Lagrange (aprox.)');
    $('convergence').classList.toggle('warn',!r.valid||!r.converges);
    const message=!r.valid?'Centro fuera del dominio.':!r.domain?'x está fuera del dominio de f.':r.converges?(r.position==='right'&&t.kind==='log'?'Extremo derecho: convergencia condicional.':'La serie converge a f(x) en este punto.'):'La serie no converge a f(x) en este punto.';
    $('convergence').innerHTML=`<strong>${message}</strong><p>${!r.valid?'No se representan coeficientes de Taylor.':Number.isFinite(r.radius)?'El radio no incluye automáticamente los extremos.':'Convergencia en todo ℝ para cualquier centro real.'}</p>`;
    if(!r.valid)tex('interval',String.raw`\text{No existe el desarrollo en este centro}`);
    else if(r.radius===Infinity)tex('interval',String.raw`x\in\mathbb R`);
    else if(t.kind==='log')tex('interval',String.raw`x\in(-1,\,${Number((2*t.a+1).toFixed(10))}]`);
    else tex('interval',String.raw`x\in(${Number((t.a-r.radius).toFixed(10))},\,${Number((t.a+r.radius).toFixed(10))})`);
    $('coefficients').innerHTML=r.c?r.c.map((v,k)=>`<tr><td>${k}</td><td>${fmt(v,9)}</td></tr>`).join(''):'<tr><td colspan="2">Centro no válido</td></tr>';
    plot.canvas.setAttribute('aria-label',`Taylor de ${t.kind}, orden ${t.n}, centro ${fmt(t.a)}. Error en x = ${fmt(t.x)}: ${fmt(r.error)}.`);plot.draw();
  }
  function draw(p){
    const t=state(),r=M.taylor(t.kind,t.a,t.n,t.x),f=z=>M.taylorValue(t.kind,z),v=p.view;
    if(r.valid){const lo=Number.isFinite(r.radius)?Math.max(v.xmin,t.a-r.radius):v.xmin,hi=Number.isFinite(r.radius)?Math.min(v.xmax,t.a+r.radius):v.xmax;if(lo<hi)p.band(lo,hi,'#eaf6f380');if(Number.isFinite(r.radius)){p.vertical(t.a-r.radius,C.teal);p.vertical(t.a+r.radius,C.teal);}}
    p.curve(f,C.ink,[],t.kind==='geometric'?[1]:t.kind==='log'?[-1]:[]);
    if(r.c)p.curve(z=>M.horner(r.c,z-t.a),C.blue);
    if(r.valid)p.handle('a',t.a,f(t.a),C.teal,'a',z=>a.set(z));
    if(r.valid&&r.domain)p.segment(t.x,r.f,t.x,r.p,C.red,[3,3],3);
    p.vertical(t.x,C.red,[2,5]);p.handle('x',t.x,0,C.red,'x',z=>x.set(z));
    if(r.domain)p.point(t.x,r.f,C.ink,'',true,5);
  }
  function fit(){const t=state();plot.setView(t.a-3,t.a+3,t.kind==='exp'?-1:-3,t.kind==='exp'?Math.max(5,Math.exp(t.a)*3):4);plot.draw();}
  $('function').onchange=()=>{update();fit();};
  $('example').onchange=()=>{const examples={exp:['exp',0,4,1],'log-edge':['log',0,15,1],'geo-out':['geometric',0,6,1.5],shift:['sin',1,7,2]};const v=examples[$('example').value];if(!v)return;$('function').value=v[0];a.set(v[1],false);n.set(v[2],false);x.set(v[3],false);update();fit();};
  U.toolbar(plot,fit);document.querySelectorAll('[data-static-tex]').forEach(el=>tex(el,el.dataset.staticTex));
  window.mathLab={state,plot,update,controls:{a,n,x}};update();fit();
})();
