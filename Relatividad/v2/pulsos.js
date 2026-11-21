'use strict';
const el=id=>document.getElementById(id);
const G=6.67430e-11,C=299792458;
const bodies={intermediate:[1.98847e35,null],stellar:[1.98847e31,null],earth:[5.9722e24,6371000]};
let model,elapsed=0,running=false,started=false,finished=false,last=performance.now();
function setupModel(){
  const [m,physicalRadius]=bodies[el('source').value],rs=2*G*m/C**2;
  const compactness=physicalRadius?rs/physicalRadius:1;
  const end=physicalRadius?1:1.001;
  el('radius').min=end;
  const initial=Math.max(end,Number(el('radius').value)),s0=Math.sqrt(initial/compactness);
  const ts=rs/C,fall=el('mode').value==='fall';
  const tauEnd=fall?2*ts/3*(s0**3-(end/compactness)**1.5):Infinity;
  return {compactness,initial,s0,ts,fall,end,earth:!!physicalRadius,tauEnd};
}
function radiusAt(t){
  if(!model.fall)return model.initial;
  return Math.max(model.end,model.compactness*Math.max(0,model.s0**3-1.5*Math.min(model.tauEnd,t)/model.ts)**(2/3));
}
function rates(q){const k=model.compactness,beta=Math.sqrt(k/q),rest=Math.sqrt(1-k/q);return model.fall?[(1-k/q)/(1+beta),1/(1+beta)]:[rest,1/rest]}
function receivedAt(t){
  if(!model.fall)return t/rates(model.initial)[0];
  // Integrate du/dτ = 1/(1-1/s), s = sqrt(r/rs). Express s0-s using τ for weak fields.
  const s=Math.sqrt(radiusAt(t)/model.compactness),s0=model.s0;
  const ds=1.5*t/(model.ts*(s0*s0+s0*s+s*s));
  return t+2*model.ts*(ds*(s0+s)/2+ds+Math.log1p(ds/(s-1)));
}
function emittedAt(externalTime){
  if(!model.fall)return externalTime*rates(model.initial)[0];
  if(externalTime>=receivedAt(model.tauEnd))return model.tauEnd;
  let lo=0,hi=Math.min(externalTime,model.tauEnd);
  for(let i=0;i<42;i++){const mid=(lo+hi)/2;if(receivedAt(mid)<externalTime)lo=mid;else hi=mid}
  return (lo+hi)/2;
}
function band(n){return n<380?'ultravioleta':n>780?'infrarrojo':'visible'}
function numberOf(t){return started?Math.floor(t+1e-8)+1:0}
function history(id,clock,count,arrival,color){
  const cv=el(id),g=cv.getContext('2d'),w=cv.clientWidth,h=cv.clientHeight,d=Math.min(2,devicePixelRatio||1);
  if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.strokeStyle='#314758';g.lineWidth=1;g.beginPath();g.moveTo(0,h*.78);g.lineTo(w,h*.78);g.stroke();g.strokeStyle=color;g.lineWidth=2;g.beginPath();
  for(let i=count-1;i>=0;i--){const age=clock-arrival(i);if(age>8)break;const x=(w-3)*(1-age/8)+1;g.moveTo(x-2,h*.78);g.lineTo(x,h*.22);g.lineTo(x+2,h*.78)}g.stroke();
}
function render(){
  const tau=Math.min(elapsed,model.tauEnd),seen=emittedAt(elapsed),q=radiusAt(seen),shipQ=radiusAt(tau),em=numberOf(tau),rec=numberOf(seen);
  const initial=Number(el('radius').value),nm=Number(el('wave').value),observed=nm/rates(q)[0];
  const unit=model.earth?' R⊕':' rₛ',secs=n=>n.toFixed(2)+' s';
  el('radiusOut').value=initial.toFixed(3)+unit;el('waveOut').value=nm+' nm';
  el('shipClock').textContent='τ '+secs(tau);el('extClock').textContent='t '+secs(elapsed);
  el('emitGap').textContent=em>1?'1.00 s':'—';el('receiveGap').textContent=rec>1?(receivedAt(rec-1)-receivedAt(rec-2)).toFixed(model.earth?6:2)+' s':'—';
  el('emitCount').textContent=em+' emitidos';el('receiveCount').textContent=rec+' recibidos';
  el('shipSpectrum').textContent=nm+' nm · '+band(nm)+' · r = '+shipQ.toFixed(3)+unit;
  el('extSpectrum').textContent=observed.toFixed(model.earth?5:1)+' nm · '+band(observed)+' · r visto = '+q.toFixed(3)+unit;
  el('incoming').textContent=(nm/rates(shipQ)[1]).toFixed(model.earth?6:1)+' nm';
  const depth=Math.min(1,Math.max(0,(q-1)/9)),x=51+36*depth,y=46+24*depth,width=8+45*depth;
  const ship=el('ship');ship.style.left=x+'%';ship.style.top=y+'%';ship.style.width=width+'%';ship.style.opacity=.45+.55*rates(q)[0];
  const emitAge=elapsed-(em-1),arrivalAge=elapsed-receivedAt(Math.max(0,rec-1));
  const flash=(age)=>Math.max(0,1-age/.32);
  el('emission').style.opacity=em?flash(emitAge):0;
  const travel=Math.min(1,emitAge/.85),out=el('outgoing');out.style.opacity=em&&emitAge<.85?.95*(1-travel):0;out.style.left=(49.5+12*travel)+'%';out.style.top=(73-46*travel)+'%';out.style.width=(16-11*travel)+'%';
  const received=el('reception');received.style.left=(x+width*.39)+'%';received.style.top=(y-width*.12)+'%';received.style.width=(20+width*.18)+'%';received.style.opacity=rec?flash(arrivalAge):0;
  history('emissions',tau,em,i=>i,'#8ce5f4');history('arrivals',elapsed,rec,receivedAt,'#ffbd7c');
  el('play').textContent=finished?'Repetir':running?'Pausar':started?'Reanudar':'Iniciar';
  let note='El pulso inicial fija el cero en cada reloj. Las dos franjas avanzan a la misma escala.';
  if(model.fall&&model.tauEnd<1)note='Desde este radio queda menos de un segundo propio de caída. Solo sale el pulso inicial. Elige el agujero negro de 100 000 masas solares para comparar varios intervalos.';
  else if(started&&tau>=model.tauEnd)note=finished?'Ha llegado la última luz del tramo simulado.':'La nave ha alcanzado el límite de la simulación. La estación todavía está viendo una etapa anterior.';
  if(el('note').textContent!==note)el('note').textContent=note;
}
function reset(){model=setupModel();elapsed=0;started=running=finished=false;el('body').src=model.earth?'../assets/earth-blue-marble-sprite.png':'mareas-agujero.webp';el('body').style.width=model.earth?'32%':'76%';render()}
el('source').onchange=reset;el('mode').onchange=reset;el('radius').oninput=reset;el('wave').oninput=render;
el('play').onclick=()=>{if(finished)reset();started=true;running=!running;last=performance.now();render()};el('reset').onclick=reset;
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(running){elapsed+=dt*Number(el('speed').value);if(model.fall&&elapsed>=receivedAt(model.tauEnd)+.4){elapsed=receivedAt(model.tauEnd)+.4;running=false;finished=true}render()}requestAnimationFrame(frame)}
window.addEventListener('resize',render);reset();requestAnimationFrame(frame);
