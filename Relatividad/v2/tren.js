"use strict";
const c=299792458, byId=id=>document.getElementById(id);
for(const node of document.querySelectorAll('.tex')){
  katex.render(node.textContent,node,{displayMode:node.classList.contains('formula'),output:'htmlAndMathml'});
}
const scene=document.querySelector('.scene'), train=byId('train');
const platform=document.querySelector('.platform-figure');
const panorama=document.querySelector('.panorama');
let trainFrame=false;
const speedLimit=Number(byId('velocity').max);
const clockViews = [
  makeClockView('max', byId('max-time')),
  makeClockView('ein', byId('ein-time'))
];
function makeClockView(owner, output) {
  const hands = Array.from(document.querySelectorAll('[data-clock="'+owner+'"]'), dial => {
    return ['hour','minute','second'].map(name => {
      const hand = document.createElement('i');
      hand.className = name+'-hand';
      dial.append(hand);
      return hand;
    });
  });
  const reading = document.createElement('span');
  const day = document.createElement('small');
  output.replaceChildren(reading, day);
  return {hands, reading, day};
}
const launch = new Date();
// Use a uniform calendar so changing daylight-saving offsets never changes a clock interval.
const startMs = Date.UTC(launch.getFullYear(), launch.getMonth(), launch.getDate(),
  launch.getHours(), launch.getMinutes(), launch.getSeconds(), launch.getMilliseconds());
const daySeconds = 86400, yearSeconds = 365.25*daySeconds;
const calendarRates = [[1,'1 s'],[60,'1 min'],[3600,'1 h'],[daySeconds,'1 día'],[yearSeconds,'1 año'],[100*yearSeconds,'100 años']];
const secondRates = [[1,'1 s'],[3,'3 s'],[6,'6 s']];
const stopwatch = {station:0, passenger:0, rate:3};
let calendarClocks;
let clocks=stopwatch, calendar=false;
let distance=0, beta=.8, paused=false;
let last=performance.now();
function advance(now){
  const dt=Math.max(0,(now-last)/1000);
  last=now;
  if(paused||document.hidden)return;
  const elapsed=dt*clocks.rate;
  const movingElapsed=elapsed*Math.sqrt((1-beta)*(1+beta));
  clocks.station+=trainFrame ? movingElapsed : elapsed;
  clocks.passenger+=trainFrame ? elapsed : movingElapsed;
  distance+=dt*beta*.055;
}
const pad = n => String(n).padStart(2,'0');
function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}
function drawClock(view, elapsed) {
  let dialSeconds = elapsed;
  if (calendar) {
    const totalMs = startMs + elapsed*1000;
    const cycleMs = 146097*daySeconds*1000; // The Gregorian calendar repeats every 400 years.
    const date = new Date(totalMs % cycleMs);
    const year = date.getUTCFullYear() + 400*Math.floor(totalMs/cycleMs);
    setText(view.reading,[date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds()].map(pad).join(':'));
    setText(view.day,[pad(date.getUTCDate()),pad(date.getUTCMonth()+1),year].join('/'));
    dialSeconds = (totalMs % (daySeconds*1000))/1000;
  } else {
    setText(view.reading,elapsed.toFixed(1)+' s');
    setText(view.day,'');
  }
  for (const [hour,minute,second] of view.hands) {
    if (calendar) {
      hour.style.transform='rotate('+((dialSeconds%43200)/120)+'deg)';
      minute.style.transform='rotate('+((dialSeconds%3600)/10)+'deg)';
    }
    second.style.transform='rotate('+((dialSeconds%60)*6)+'deg)';
  }
}
const durationUnits = [[yearSeconds,'año','años'],[daySeconds,'día','días'],[3600,'h'],[60,'min']];
function formatDuration(seconds) {
  const [size,unit,plural=unit]=durationUnits.find(([size])=>seconds>=size) || [1,'s'];
  const value=(seconds/size).toFixed(size===1 ? 1 : 2);
  return value+' '+(Number(value)===1 ? unit : plural);
}
function showClocks(){
  const {station,passenger}=clocks;
  drawClock(clockViews[0],station);
  drawClock(clockViews[1],passenger);
  setText(byId('gap'),formatDuration(Math.abs(station-passenger)));
}
byId('time-view').onclick = () => {
  advance(performance.now());
  if (!calendarClocks) calendarClocks={...stopwatch,rate:daySeconds};
  calendar=!calendar;
  clocks=calendar ? calendarClocks : stopwatch;
  document.body.classList.toggle('calendar',calendar);
  byId('time-view').textContent=calendar ? 'segundos' : 'fecha';
  const choices=calendar ? calendarRates : secondRates;
  byId('rate').replaceChildren(...choices.map(([value,label])=>new Option(label+' por 1 s real',value)));
  byId('rate').value=String(clocks.rate);
  showClocks();
};
function frame(now){
  advance(now);
  showClocks();
  const w=scene.clientWidth, tw=train.offsetWidth, pw=platform.offsetWidth;
  const travel=distance*(w+tw);
  const startX=.31*w+.52*pw-.598*tw;
  const trainX=trainFrame ? startX : (travel+startX+tw)%(w+tw)-tw;
  train.style.transform='translateX('+trainX+'px)';
  const period=3*w;
  const scroll=trainFrame && w ? (w+travel)%period : 0;
  const platformX=trainFrame && w ? (1.31*w-scroll+2*pw+period)%period-2*pw-.31*w : 0;
  platform.style.transform='translateX('+platformX+'px)';
  panorama.style.transform='translateX('+(-scroll)+'px)';
  requestAnimationFrame(frame);
}
byId('reference').onchange=e=>{
  trainFrame=e.target.value==='train';
  last=performance.now();
  for (const state of [stopwatch,calendarClocks]) {
    if (state) {state.station=0;state.passenger=0;}
  }
  distance=0;
  scene.classList.toggle('train-frame',trainFrame);
  scene.setAttribute('aria-label',trainFrame ? 'Vista desde el tren. Einstein permanece quieto y el andén con Maxwell se desplaza hacia la izquierda.' : 'Vista desde el andén. Maxwell permanece quieto y el tren con Einstein se desplaza hacia la derecha.');
  byId('rate-label').textContent=trainFrame ? 'Ritmo de Einstein' : 'Ritmo de Maxwell';
  byId('ratio-label').textContent=trainFrame ? 'Por cada 10 s del tren' : 'Por cada 10 s del andén';
  byId('other-location').textContent=trainFrame ? 'en el andén' : 'en el tren';
  showClocks();
};
function updateSpeed(value){
  advance(performance.now());
  beta=Math.min(speedLimit,Math.max(0,value));
  byId('velocity').value=beta;
  const ms=byId('unit').value==='ms';
  byId('exact').value=String(Number((ms?beta*c:beta).toPrecision(9)));
  const fraction=Math.sqrt((1-beta)*(1+beta));
  byId('ratio').textContent=(10*fraction).toFixed(10*fraction<1 ? 4 : 2)+' s';
  byId('gamma').textContent=(1/fraction).toFixed(3);
}
byId('velocity').oninput=e=>updateSpeed(e.target.valueAsNumber);
byId('exact').onblur=e=>{
  const raw=e.target.value.trim().replace(',','.');
  const value=Number(byId('unit').value==='c' ? raw.replace(/\s*c$/i,'') : raw);
  updateSpeed(raw&&Number.isFinite(value)?value/(byId('unit').value==='ms'?c:1):beta);
};
byId('exact').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};
byId('unit').onchange=()=>updateSpeed(beta);
byId('rate').onchange=e=>{advance(performance.now());clocks.rate=Number(e.target.value);};
byId('pause').onclick=e=>{advance(performance.now());paused=!paused;e.target.textContent=paused?'Reanudar':'Pausar';showClocks();};
byId('reset').onclick=()=>{last=performance.now();clocks.station=0;clocks.passenger=0;distance=0;showClocks();};
document.addEventListener('visibilitychange',()=>{last=performance.now();});
updateSpeed(beta);requestAnimationFrame(frame);
