"use strict";
(() => {
  const get=id=>document.getElementById(id);
  const yearMs=365.25*86400000, epoch=Date.now();
  const formatDate=new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'medium',timeZone:'UTC'});
  const hands=document.querySelectorAll('.dial b');
  const scene=document.querySelector('.scene');
  const beforeButton=get('before-turn'), afterButton=get('after-turn');
  let shipView=false, beforeTurn=false, rate=Number(get('scale').value);
  let t=0, paused=false, dates=false, last=performance.now();
  function model(){
    const beta=get('v').valueAsNumber, distance=get('distance').valueAsNumber;
    const properRate=Math.sqrt((1-beta)*(1+beta));
    return {beta,distance,properRate,turn:distance/beta};
  }
  function duration(y) {
    if(y>=1) return y.toFixed(2)+' años';
    if(y*365.25>=1) return (y*365.25).toFixed(1)+' días';
    if(y*8766>=1) return (y*8766).toFixed(1)+' h';
    if(y*525960>=1) return (y*525960).toFixed(1)+' min';
    return (y*yearMs/1000).toFixed(1)+' s';
  }
  function write(id,text){const el=get(id);if(el.textContent!==text)el.textContent=text;}
  function clock(id,y){write(id,dates?formatDate.format(new Date(epoch+y*yearMs)):duration(y));}
  function advance(now){
    const dt=Math.max(0,now-last)/1000;
    last=now;
    if(paused||document.hidden)return;
    const {turn,properRate}=model();
    t=Math.min(2*turn,t+dt*rate/(shipView?properRate:1));
  }
  function draw(){
    const {beta,distance,properRate,turn}=model(), total=2*turn;
    const home=t>=total, atTurn=t===turn;
    const inbound=t>turn||(atTurn&&!beforeTurn), leg=inbound?(total-t)/turn:t/turn;
    const ship=t*properRate;
    const assigned=t-(inbound?-1:1)*beta*distance*leg;
    const earthReading=shipView?assigned:t;
    clock('earth-time',earthReading);clock('ship-time',ship);write('gap',duration(Math.abs(earthReading-ship)));
    hands[0].style.transform='rotate('+((earthReading%1)*360)+'deg)';
    hands[1].style.transform='rotate('+((ship%1)*360)+'deg)';
    clock('assigned',assigned);
    clock('before-time',turn-beta*distance);
    clock('after-time',turn+beta*distance);
    beforeButton.setAttribute('aria-pressed',String(atTurn&&!inbound));
    afterButton.setAttribute('aria-pressed',String(atTurn&&inbound));
    write('turn-note','Cambio de hora asignada: '+duration(2*beta*distance)+'. El reloj de la nave marca '+duration(turn*properRate)+' a ambos lados del giro.');
    write('phase',home?'Reencuentro en la Tierra':atTurn?(inbound?'Giro · comienzo de la vuelta':'Giro · final de la ida'):inbound?'Vuelta hacia la Tierra':t===0?'Salida desde la Tierra':'Ida hacia la estrella');
    get('rocket').style.left=(shipView?50:12+76*leg)+'%';
    if(shipView){
      scene.style.setProperty('--earth-x',(50-38*leg)+'%');
      scene.style.setProperty('--star-x',(88-38*leg)+'%');
    }
    get('rocket').style.transform='translate(-50%,-50%) scaleX('+(inbound?-1:1)+')';
    const age=t/total;
    get('older').style.opacity=Math.min(1,Math.max(0,(age-.2)*4));
    get('elder').style.opacity=Math.min(1,Math.max(0,(age-.6)*3));
    get('progress').value=100*age;
    write('gamma',(1/properRate).toFixed(3));write('earth-total',duration(total));write('ship-total',duration(total*properRate));
    write('pause',home?'Repetir viaje':paused?'Reanudar':'Pausar');
  }
  function go(fraction,stop,before=false){last=performance.now();t=2*model().turn*fraction;paused=stop;beforeTurn=before;draw();}
  function frame(now){advance(now);draw();requestAnimationFrame(frame);}
  get('pause').onclick=()=>{advance(performance.now());if(t>=2*model().turn){go(0,false);return;}paused=!paused;draw();};
  get('reset').onclick=()=>go(0,paused);
  get('v').oninput=get('distance').oninput=()=>go(0,paused);
  get('turn').onclick=()=>go(.5,true,shipView);
  beforeButton.onclick=()=>go(.5,true,true);
  afterButton.onclick=()=>go(.5,true,false);
  get('scale').onchange=e=>{advance(performance.now());rate=Number(e.target.value);};
  get('reference').onchange=e=>{
    advance(performance.now());
    shipView=e.target.value==='ship';
    scene.classList.toggle('ship-view',shipView);
    scene.setAttribute('aria-label',shipView?'Vista desde la nave. La Tierra y la estrella se desplazan respecto al viajero.':'Trayecto de ida y vuelta visto desde la Tierra.');
    document.querySelector('.clocks').setAttribute('aria-label',shipView?'Lecturas simultáneas según el viajero':'Lecturas simultáneas en el marco terrestre');
    document.querySelector('.clock abbr').title=shipView?'Diferencia entre las lecturas simultáneas según el viajero':'Diferencia entre las lecturas en el marco de la Tierra';
    write('rate-label',shipView?'Ritmo del reloj de la nave':'Ritmo del reloj terrestre');
    write('earth-label',shipView?'Tierra (asignada)':'Tierra');
    draw();
  };
  get('end').onclick=()=>go(1,true);
  get('progress').oninput=e=>go(e.target.valueAsNumber/100,true);
  get('calendar').onclick=()=>{dates=!dates;write('calendar',dates?'Ver duración':'Ver fechas');draw();};
  document.addEventListener('visibilitychange',()=>{last=performance.now();});
  draw();requestAnimationFrame(frame);
})();
