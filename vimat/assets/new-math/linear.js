(()=>{
  'use strict';
  const U=MathUI,M=NewMath,{$,fmt,tex,text,colors:C}=U,controls=[];
  [[1,1,3],[1,-1,1]].forEach((row,i)=>controls.push(row.map((v,j)=>U.control(`row${i+1}-controls`,{id:`${'abc'[j]}${i+1}`,label:`${'abc'[j]}${i+1}`,min:-20,max:20,step:.01,value:v,onChange:update}))));
  let plot=new U.Plot('plot',draw);
  function state(){return{rows:controls.map(row=>row.map(c=>c.value))};}
  const ft=s=>s.includes('/')?String.raw`\frac{${s.split('/')[0]}}{${s.split('/')[1]}}`:s;
  function equation([a,b,c]){return `${a}x${b<0?'':'+'}${b}y=${c}`;}
  function update(){
    if(!plot)return;const {rows}=state(),r=M.solve(rows);
    tex('system',String.raw`\begin{cases}${equation(rows[0])}\\${equation(rows[1])}\end{cases}`);
    $('classification').classList.toggle('warn',r.type==='none');
    $('classification').innerHTML=`<strong>${r.type==='unique'?'Solución única':r.type==='none'?'Ninguna solución':'Infinitas soluciones'}</strong><p>${r.type==='unique'?'Sistema compatible determinado.':r.type==='none'?'Sistema incompatible.':r.dimension===2?'Ambas ecuaciones son identidades.':'Sistema compatible indeterminado: una recta.'}</p>`;
    if(r.type==='unique')tex('solution',String.raw`S=\left\{\left(${ft(r.exactX)},${ft(r.exactY)}\right)\right\}`);
    else if(r.type==='none')tex('solution',String.raw`S=\varnothing`);
    else if(r.dimension===2)tex('solution',String.raw`S=\mathbb R^2`);
    else{const row=rows.find(([a,b])=>a!==0||b!==0);tex('solution',String.raw`S=\{(x,y)\in\mathbb R^2:\ ${equation(row)}\}`);}
    text('determinant',fmt(r.det,10));text('x-value',r.type==='unique'?fmt(r.x):'—');text('y-value',r.type==='unique'?fmt(r.y):'—');
    rows.forEach((row,i)=>text(`row${i+1}-state`,`${i+1}: ${r.rowTypes[i]==='plane'?'0 = 0: todo el plano.':r.rowTypes[i]==='empty'?'Contradicción: ningún punto.':row[1]===0?'Recta vertical.':row[0]===0?'Recta horizontal.':'Recta oblicua.'}`));
    tex('det-formula',String.raw`\Delta=(${rows[0][0]})(${rows[1][1]})-(${rows[1][0]})(${rows[0][1]})`);
    plot.canvas.setAttribute('aria-label',`Sistema: ${r.type==='unique'?`solución x = ${fmt(r.x)}, y = ${fmt(r.y)}`:r.type==='none'?'sin solución':'infinitas soluciones'}.`);plot.draw();
  }
  function draw(p){
    const {rows}=state(),r=M.solve(rows),v=p.view;
    if(r.type==='infinite'&&r.dimension===2)p.band(v.xmin,v.xmax,'#eaf6f380');
    rows.forEach(([a,b,c],i)=>{
      if(a===0&&b===0)return;
      const color=i===0?C.blue:C.red;p.line(a,b,c,color,i?[7,5]:[]);
      const norm=Math.hypot(a,b),base={x:a*c/(norm*norm),y:b*c/(norm*norm)},t={x:-b/norm,y:a/norm};
      const offset=i===0?-1.1:1.1;
      p.handle(`translate${i}`,base.x+offset*t.x,base.y+offset*t.y,color,String(i+1),(x,y)=>controls[i][2].set(a*x+b*y));
      const turn=offset+(i===0?-1.7:1.7);
      p.handle(`rotate${i}`,base.x+turn*t.x,base.y+turn*t.y,color,'',(x,y)=>{
        const dx=x-base.x,dy=y-base.y,len=Math.hypot(dx,dy);if(len<.1)return;
        controls[i][0].set(dy/len*norm,false);controls[i][1].set(-dx/len*norm,false);
        controls[i][2].set(controls[i][0].value*base.x+controls[i][1].value*base.y,false);update();
      },true);
    });
    if(r.type==='unique')p.point(r.x,r.y,C.teal,'S',false,7);
    $('offscreen').hidden=r.type!=='unique'||(r.x>=v.xmin&&r.x<=v.xmax&&r.y>=v.ymin&&r.y<=v.ymax);
  }
  function fit(){const r=M.solve(state().rows);const size=r.type==='unique'?Math.max(5,Math.abs(r.x)*1.3,Math.abs(r.y)*1.3):5;plot.setView(-size,size,-size,size);plot.draw();}
  const cases={unique:[[1,1,3],[1,-1,1]],parallel:[[1,1,3],[2,2,8]],same:[[1,1,3],[2,2,6]],axes:[[1,0,2],[0,1,-1]],identity:[[0,0,0],[1,1,3]],impossible:[[0,0,1],[1,1,3]],plane:[[0,0,0],[0,0,0]]};
  $('example').onchange=()=>{cases[$('example').value].forEach((row,i)=>row.forEach((v,j)=>controls[i][j].set(v,false)));update();fit();};
  U.toolbar(plot,fit);document.querySelectorAll('[data-static-tex]').forEach(el=>tex(el,el.dataset.staticTex));
  window.mathLab={state,plot,update,controls};update();fit();
})();
