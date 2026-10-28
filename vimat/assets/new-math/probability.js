(()=>{
  'use strict';
  const U=MathUI,M=NewMath,J=jStat,{$,fmt,tex,text,colors:C}=U;
  const n=U.control('binomial-controls',{id:'n',label:'Ensayos n',min:0,max:200,step:1,value:10,onChange:parameterChange});
  const p=U.control('binomial-controls',{id:'p',label:'Probabilidad p',min:0,max:1,step:.001,value:.5,onChange:parameterChange});
  const mu=U.control('normal-controls',{id:'mu',label:'Media μ',min:-10,max:10,step:.01,value:0,onChange:parameterChange});
  const sigma=U.control('normal-controls',{id:'sigma',label:'Desviación σ',min:.1,max:10,step:.01,value:1,onChange:parameterChange});
  const lower=U.control('interval-controls',{id:'lower',label:'Extremo L',min:-20,max:220,step:.01,value:3,onChange:update});
  const upper=U.control('interval-controls',{id:'upper',label:'Extremo U',min:-20,max:220,step:.01,value:7,onChange:update});
  let plot=new U.Plot('plot',draw),mass=[],cached='',prob=0;
  function state(){return{kind:$('distribution').value,n:n.value,p:p.value,mu:mu.value,sigma:sigma.value,l:lower.value,u:upper.value};}
  function getMass(){const key=n.value+':'+p.value;if(key!==cached){mass=M.binomial(J,n.value,p.value);cached=key;}return mass;}
  function update(){
    if(!plot)return;const t=state(),bin=t.kind==='binomial';$('binomial-controls').hidden=!bin;$('normal-controls').hidden=bin;
    prob=bin?M.binomialInterval(getMass(),t.l,t.u):M.normalInterval(J,t.mu,t.sigma,t.l,t.u);
    text('probability',fmt(prob,10));text('mean',fmt(bin?t.n*t.p:t.mu));text('variance',fmt(bin?t.n*t.p*(1-t.p):t.sigma**2));
    $('probability-fill').style.width=100*prob+'%';tex('event-formula',String.raw`P(${t.l}\le X\le ${t.u})`);
    tex('distribution-formula',bin?String.raw`X\sim\operatorname{B}(${t.n},${t.p})`:String.raw`X\sim N(${t.mu},${Number((t.sigma**2).toPrecision(12))})`);
    let msg=t.l>t.u?'Intervalo vacío: L > U.':bin?`Valores enteros incluidos: ${Math.max(0,Math.ceil(t.l))} a ${Math.min(t.n,Math.floor(t.u))}.`:'El área sombreada es la probabilidad del intervalo.';
    if(bin&&prob===0&&t.l<=t.u)msg='Ninguna masa positiva en el intervalo.';
    if(!bin&&t.l===t.u)msg='Un solo punto tiene probabilidad 0, aunque su densidad sea positiva.';
    $('probability-status').innerHTML=`<strong>${bin?'Variable discreta':'Variable continua'}</strong><p>${msg}</p>`;$('probability-status').classList.toggle('warn',t.l>t.u);
    text('method',bin?'Suma numérica de masas binomiales (sin aproximación normal). Las barras representan P(X = k), no densidades.':'Integración numérica de la densidad normal estandarizada. Los extremos abiertos o cerrados dan la misma probabilidad.');text('hover-value','');
    if(bin){
      text('table-title','Masas y selección');$('probability-head').innerHTML='<tr><th>k</th><th>P(X = k)</th><th>Incluido</th></tr>';
      $('probability-table').innerHTML=getMass().map((v,k)=>`<tr><td>${k}</td><td>${fmt(v,8)}</td><td>${k>=t.l&&k<=t.u?'Sí':'No'}</td></tr>`).join('');
    }else{
      text('table-title','Densidad en puntos del intervalo');$('probability-head').innerHTML='<tr><th>x</th><th>f(x)</th><th>P(X = x)</th></tr>';
      $('probability-table').innerHTML=[t.l,(t.l+t.u)/2,t.u].map(v=>`<tr><td>${fmt(v)}</td><td>${fmt(J.normal.pdf(v,t.mu,t.sigma),8)}</td><td>0</td></tr>`).join('');
    }
    plot.yLabel=bin?'P(X = k)':'Densidad f(x)';plot.xLabel=bin?'k':'x';
    plot.canvas.setAttribute('aria-label',`${bin?'Binomial':'Normal'}: probabilidad de ${fmt(t.l)} a ${fmt(t.u)} = ${fmt(prob,10)}.`);plot.draw();
  }
  function draw(g){
    const t=state(),bin=t.kind==='binomial',c=g.ctx;
    if(bin){getMass().forEach((v,k)=>{const selected=k>=t.l&&k<=t.u;c.fillStyle=selected?C.teal:'#b8d5f3';const left=g.X(k-.37),right=g.X(k+.37);c.fillRect(left,g.Y(v),Math.max(1,right-left),g.Y(0)-g.Y(v));g.point(k,v,selected?C.teal:C.blue,'',false,2);});}
    else{const f=x=>J.normal.pdf(x,t.mu,t.sigma);g.area(f,t.l,t.u,'#bfe5dc');g.curve(f,C.blue);}
    // Separate heights keep both handles reachable when L = U.
    const span=g.view.ymax-g.view.ymin;g.vertical(t.l,C.teal);g.vertical(t.u,C.red);
    g.handle('lower',t.l,g.view.ymin+.10*span,C.teal,'L',x=>lower.set(x));g.handle('upper',t.u,g.view.ymin+.20*span,C.red,'U',x=>upper.set(x));
  }
  function fit(){const t=state();if(t.kind==='binomial'){const max=Math.max(...getMass());plot.setView(-1,Math.max(2,t.n+1),-max*.17,max*1.28);}else{const max=J.normal.pdf(t.mu,t.mu,t.sigma);plot.setView(t.mu-4*t.sigma,t.mu+4*t.sigma,-max*.17,max*1.28);}plot.draw();}
  function parameterChange(){if(!plot)return;update();fit();}
  $('distribution').onchange=()=>{if($('distribution').value==='normal'){lower.bounds(-110,110);upper.bounds(-110,110);lower.set(mu.value-sigma.value,false);upper.set(mu.value+sigma.value,false);}else{lower.bounds(-20,220);upper.bounds(-20,220);lower.set(3,false);upper.set(7,false);}update();fit();};
  $('example').onchange=()=>{
    const v=$('example').value;if(!v)return;const bin=v==='coin'||v==='certain';$('distribution').value=bin?'binomial':'normal';lower.bounds(bin?-20:-110,bin?220:110);upper.bounds(bin?-20:-110,bin?220:110);
    if(bin){n.set(10,false);p.set(v==='certain'?1:.5,false);lower.set(v==='certain'?10:3,false);upper.set(v==='certain'?10:7,false);}
    else{mu.set(0,false);sigma.set(1,false);lower.set(v==='point'?0:v==='tail'?8:-1,false);upper.set(v==='point'?0:v==='tail'?9:1,false);}
    update();fit();if(v==='tail'){plot.setView(7.5,9.5,-1e-16,8e-15);plot.draw();}
  };
  plot.canvas.addEventListener('pointermove',e=>{if(plot.drag)return;const b=plot.canvas.getBoundingClientRect(),x=plot.wx(e.clientX-b.left),t=state();if(t.kind==='binomial'){const k=Math.round(x);text('hover-value',k>=0&&k<=t.n?`k = ${k} · P(X = k) = ${fmt(getMass()[k],9)}`:'Fuera del soporte.');}else text('hover-value',`x = ${fmt(x)} · densidad = ${fmt(J.normal.pdf(x,t.mu,t.sigma),9)} · P(X = x) = 0`);});
  U.toolbar(plot,fit);document.querySelectorAll('[data-static-tex]').forEach(el=>tex(el,el.dataset.staticTex));
  window.mathLab={state,plot,update,controls:{n,p,mu,sigma,lower,upper},get probability(){return prob;}};update();fit();
})();
