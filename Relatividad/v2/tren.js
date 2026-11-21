"use strict";
const c=299792458, byId=id=>document.getElementById(id);
for(const node of document.querySelectorAll('.tex')){
  katex.render(node.textContent,node,{displayMode:node.classList.contains('formula'),output:'htmlAndMathml'});
}
const scene=document.querySelector('.scene'), train=byId('train'), dials=document.querySelectorAll('.dial i');
let station=0, passenger=0, distance=0, beta=.8, rate=3, paused=false;
let last=performance.now();
function advance(now){
  const dt=Math.max(0,(now-last)/1000);
  last=now;
  if(paused||document.hidden)return;
  station+=dt*rate;
  passenger+=dt*rate*Math.sqrt((1-beta)*(1+beta));
  distance+=dt*beta*.055;
}
function showClocks(){
  byId('max-time').textContent=station.toFixed(1)+' s';
  byId('ein-time').textContent=passenger.toFixed(1)+' s';
  byId('gap').textContent=(station-passenger).toFixed(1)+' s';
  dials[0].style.transform='rotate('+((station%60)*6)+'deg)';
  dials[1].style.transform='rotate('+((passenger%60)*6)+'deg)';
}
function frame(now){
  advance(now);
  showClocks();
  const w=scene.clientWidth, tw=train.offsetWidth, cycle=w+tw;
  const offset=(distance*cycle+.56*w+.43*tw)%cycle-tw;
  train.style.transform='translateX('+offset+'px)';
  requestAnimationFrame(frame);
}
function updateSpeed(value){
  advance(performance.now());
  beta=Math.min(.99,Math.max(0,value));
  byId('velocity').value=beta;
  const ms=byId('unit').value==='ms';
  byId('exact').value=String(Number((ms?beta*c:beta).toPrecision(9)));
  const fraction=Math.sqrt((1-beta)*(1+beta));
  byId('ratio').textContent=(10*fraction).toFixed(2)+' s';
  byId('gamma').textContent=(1/fraction).toFixed(3);
}
byId('velocity').oninput=e=>updateSpeed(e.target.valueAsNumber);
byId('exact').onchange=e=>{
  const raw=e.target.value.trim().replace(',','.');
  const value=Number(raw);
  updateSpeed(raw&&Number.isFinite(value)?value/(byId('unit').value==='ms'?c:1):beta);
};
byId('exact').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};
byId('unit').onchange=()=>updateSpeed(beta);
byId('rate').onchange=e=>{advance(performance.now());rate=Number(e.target.value);};
byId('pause').onclick=e=>{advance(performance.now());paused=!paused;e.target.textContent=paused?'Reanudar':'Pausar';showClocks();};
byId('reset').onclick=()=>{last=performance.now();station=0;passenger=0;distance=0;showClocks();};
document.addEventListener('visibilitychange',()=>{last=performance.now();});
updateSpeed(beta);requestAnimationFrame(frame);
