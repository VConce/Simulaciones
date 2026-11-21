'use strict';
(() => {
  const G=6.67430e-11, c=299792458, earth=5.9722e24, solar=1.98847e30;
  const $=id=>document.getElementById(id);
  const rs=m=>2*G*m/c**2/1000;
  const presets={moon:[7.342e22,1737.4,'kg'],earth:[earth,6371,'earth'],sun:[solar,696340,'solar'],stellar:[10*solar,rs(10*solar),'solar'],garg:[1e8*solar,rs(1e8*solar),'solar']};
  const units={kg:1,earth,solar};
  const images={};
  for(const [name,path] of Object.entries({sky:'../assets/espaguetizacion-space-background.png',earth:'../assets/earth-blue-marble-sprite.png',moon:'mareas-luna.webp',sun:'mareas-sol.webp',hole:'mareas-agujero.webp',man:'einstein-mareas.webp'})){
    images[name]=new Image();images[name].src=path;
  }
  let mass,km,r=3,start=3,v=0,angle=0,playing=false,drag=null,last=performance.now(),ended=false;
  const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
  const boundary=()=>Math.max(km,rs(mass));
  const isHole=()=>km<=rs(mass)*(1+1e-10);
  function metrics(){const tidal=2*G*mass*1.7/(r*boundary()*1000)**3;
    const factor=(start/r)**3;
    const strength=1-Math.exp(-tidal/9.81);
    const stretch=1+1.18*strength*(1-Math.exp(-Math.max(0,Math.log(factor))*.53));
    return {tidal,factor,stretch,crush:1/Math.sqrt(stretch)};
  }
  function setStatus(){ $('pause').textContent=playing?'Pausar':ended?'Repetir caída':v?'Reanudar':'Iniciar caída';
    $('statusOut').textContent=ended?(isHole()?'El viajero ha alcanzado el horizonte.':'El viajero ha alcanzado la superficie.'):drag!==null?'Suelta al viajero para iniciar la caída.':playing?'Caída libre desde el reposo. El tiempo de la animación está reescalado.':v?'Caída en pausa.':'El viajero está preparado. Pulsa «Iniciar caída» o arrástralo para elegir otro punto de partida.';
  }
  function reset(run=false){r=start=+$('releaseDistance').value;v=0;ended=r<=1;playing=run&&!ended;angle=0;$('releaseOut').value=start.toFixed(2)+' R';setStatus()}
  function syncModel(){const u=units[$('unit').value];$('massValue').value=Number((mass/u).toPrecision(8));$('radiusValue').value=Number(km.toPrecision(9));$('mass').value=Math.log10(mass);$('radius').value=Math.log10(km)}
  function applyPreset(){const p=presets[$('preset').value];[mass,km,$('unit').value]=p;syncModel();reset()}
  $('preset').onchange=applyPreset;$('unit').onchange=syncModel;
  function custom(m,k){if(!(m>=100&&m<=1e40&&k>=1&&k<=1e11)){syncModel();return}mass=m;km=k;$('preset').value='custom';syncModel();reset()}
  $('mass').oninput=e=>custom(10**e.target.value,km);$('radius').oninput=e=>custom(mass,10**e.target.value);
  $('massValue').onchange=e=>custom(+e.target.value*units[$('unit').value],km);$('radiusValue').onchange=e=>custom(mass,+e.target.value);
  $('releaseDistance').oninput=()=>reset();$('reset').onclick=()=>reset(true);
  $('pause').onclick=()=>{if(ended){reset(true);return}playing=!playing;setStatus()};
  function surface(id){const cv=$(id),w=cv.clientWidth,h=cv.clientHeight,d=Math.min(devicePixelRatio||1,2);if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);return {g,w,h}}
  function bitmap(g,img,x,y,w,h){if(img.naturalWidth)g.drawImage(img,x-w/2,y-h/2,w,h)}
  function geometry(w,h){return {x:w*.22,y:h*.51,R:Math.min(w*.132,h*.205)}}
  function orbit(){const {g,w,h}=surface('track'),p=geometry(w,h),x=p.x+Math.cos(angle)*p.R*r,y=p.y+Math.sin(angle)*p.R*r;
    g.fillStyle='#081320';g.fillRect(0,0,w,h);if(images.sky.naturalWidth){const s=Math.max(w/images.sky.width,h/images.sky.height);bitmap(g,images.sky,w/2,h/2,images.sky.width*s,images.sky.height*s)}
    const hole=isHole(),kind=hole?'hole':mass>.2*solar?'sun':mass<.2*earth?'moon':'earth',scale=hole?4.55:kind==='earth'?2.05:2.34;
    bitmap(g,images[kind],p.x,p.y,p.R*scale,p.R*scale);
    g.save();g.setLineDash([4,5]);g.lineWidth=1.2;g.strokeStyle='#b8ced9';g.beginPath();g.arc(p.x,p.y,p.R,0,2*Math.PI);g.stroke();
    g.beginPath();g.moveTo(p.x+Math.cos(angle)*p.R,p.y+Math.sin(angle)*p.R);g.lineTo(p.x+Math.cos(angle)*p.R*start,p.y+Math.sin(angle)*p.R*start);g.stroke();g.restore();
    g.save();g.translate(x,y);g.rotate(angle+Math.PI/2);const len=Math.min(w*.105,h*.18);bitmap(g,images.man,0,0,len*.67,len);g.restore();
    g.font='600 '+(w<300?11:14)+'px system-ui';g.fillStyle='#f6e0c9';g.textAlign='left';g.fillText(hole?'Horizonte · R':'Superficie · R',8,h-12);
  }
  function arrow(g,x,y,dx,dy,len,color){g.strokeStyle=color;g.fillStyle=color;g.lineWidth=2.6;let ex=x+dx*len,ey=y+dy*len;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();g.beginPath();g.moveTo(ex,ey);g.lineTo(ex-dx*6-dy*3.5,ey-dy*6+dx*3.5);g.lineTo(ex-dx*6+dy*3.5,ey-dy*6-dx*3.5);g.fill()}
  function detail(m){const {g,w,h}=surface('zoom');g.fillStyle='#0c2030';g.fillRect(0,0,w,h);
    const x=w/2,y=h*.54,base=Math.min(h*.32,w*.62),wide=base*(images.man.naturalWidth||2)/(images.man.naturalHeight||3);
    g.save();g.globalAlpha=.26;bitmap(g,images.man,x,y,wide,base);g.restore();bitmap(g,images.man,x,y,wide*m.crush,base*m.stretch);
    const halfH=base*m.stretch/2,halfW=wide*m.crush/2;
    const shaft=Math.min(h*.067,w*.105)*(1+.3*Math.min(1,Math.log1p(m.tidal)/15));
    for(const s of [-1,1]){arrow(g,x,y+s*(halfH+3),0,s,shaft,'#ffc174');arrow(g,x+s*(halfW+shaft*.6+5),y,-s,0,shaft*.55,'#83dbef')}
  }
  const track=$('track');
  function pointer(e){const b=track.getBoundingClientRect(),p=geometry(b.width,b.height);return {p,x:e.clientX-b.left,y:e.clientY-b.top}}
  track.onpointerdown=e=>{const {p,x,y}=pointer(e);if(Math.hypot(x-p.x-Math.cos(angle)*p.R*r,y-p.y-Math.sin(angle)*p.R*r)>Math.max(23,p.R*.7))return;drag=e.pointerId;playing=false;ended=false;v=0;track.setPointerCapture(e.pointerId);setStatus()};
  track.onpointermove=e=>{if(e.pointerId!==drag)return;const {p,x,y}=pointer(e);angle=Math.atan2(y-p.y,x-p.x);r=start=clamp(Math.hypot(x-p.x,y-p.y)/p.R,1,5);$('releaseDistance').value=r;$('releaseOut').value=r.toFixed(2)+' R'};
  function release(e){if(e.pointerId!==drag)return;drag=null;ended=r<=1;playing=!ended;setStatus()}
  track.onpointerup=release;track.onpointercancel=release;
  function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(playing){const a=-.8/r**2;r+=v*dt+.5*a*dt**2;v+=.5*(a-.8/Math.max(1,r)**2)*dt;if(r<=1){r=1;playing=false;ended=true;v=0;setStatus()}}
    const m=metrics();orbit();detail(m);$('tidalOut').textContent=m.tidal.toExponential(2)+' m/s²';$('distOut').textContent=r.toFixed(2)+' R';$('factorOut').textContent=m.factor.toFixed(2)+' ×';requestAnimationFrame(frame)}
  applyPreset();requestAnimationFrame(frame);
})();
