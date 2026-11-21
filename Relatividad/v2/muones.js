(() => {
  const byId = id => document.getElementById(id);
  const canvas = byId('earthCanvas'), ctx = canvas.getContext('2d');
  const {width:w, height:h} = canvas;
  new ResizeObserver(()=>{
    const scale=Math.max(1,Math.min(4,canvas.clientWidth*(window.devicePixelRatio||1)/w));
    const width=Math.round(w*scale), height=Math.round(h*scale);
    if(canvas.width!==width || canvas.height!==height){
      canvas.width=width; canvas.height=height; ctx.setTransform(width/w,0,0,height/h,0,0);
      ctx.imageSmoothingQuality='high';
    }
  }).observe(canvas);
  const velocity = byId('beta'), altitude = byId('height'), reference = byId('reference');
  const model = byId('model'), beam = byId('beam');
  const lifetime = 2.1969811, c = .299792458, flightSeconds = 5;
  const image = src => Object.assign(new Image(), {src});
  const earthSprite = image('../assets/earth-blue-marble-sprite.png');
  const space = image('reloj-panorama.webp');
  const balloon = image('globo-aerostatico.webp');
  const balloons = [
    {x:w*.20, altitude:.61, width:17, height:26},
    {x:w*.86, altitude:.28, width:21, height:31}
  ];
  let held = null;
  function balloonPointer(e) {
    const rect=canvas.getBoundingClientRect();
    return {x:(e.clientX-rect.left)*w/rect.width,y:(e.clientY-rect.top)*h/rect.height};
  }
  function balloonAt(p) {
    const pad=Math.min(20,7*w/canvas.clientWidth);
    return balloons.find(b=>p.x>=b.x-pad && p.x<=b.x+b.width+pad && p.y>=b.y-pad && p.y<=b.y+b.height+pad);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(held || e.button!==0)return;
    const p=balloonPointer(e), b=balloonAt(p);
    if(!b)return;
    held={b,id:e.pointerId,dx:p.x-b.x,dy:p.y-b.y};
    canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
  });
  canvas.addEventListener('pointermove',e=>{
    const p=balloonPointer(e);
    if(!held){canvas.style.cursor=balloonAt(p)?'grab':'';return}
    if(e.pointerId!==held.id)return;
    const b=held.b;
    b.x=Math.max(0,Math.min(w-b.width,p.x-held.dx));
    b.placedY=Math.max(0,Math.min(h-b.height,p.y-held.dy));
    draw();
  });
  function releaseBalloon(e){if(held?.id===e.pointerId){held=null;canvas.style.cursor=''}}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,releaseBalloon);
  const flying = image('muon-vuelo.webp'), blink = image('muon-ojos-cerrados.webp');
  const wicker = image('cesta-mimbre.webp'), pace = byId('pace');
  const green = image('muon-verde.webp'), flash = image('muon-destello.webp');
  const left = 170, right = 540, depth = 44;
  let particles = [], elapsed = 0, caught = 0, emitted = 0, paused = false;
  // A fixed-size detector image preserves every landing without retaining an unbounded particle list.
  const deposits = document.createElement('canvas');
  deposits.width = (right-left)*3; deposits.height = depth*3;
  const ink = deposits.getContext('2d');
  ink.scale(3,3);
  const stream = () => beam.value === 'stream';
  const classical = () => model.value === 'classic';
  const ready = img => img.complete && img.naturalWidth;
  const factor = () => classical() ? 1 : 1 / Math.sqrt(1 - velocity.value ** 2);
  const earthTime = () => altitude.value / (velocity.value * c);
  const travelTime = () => earthTime() / factor();
  // PDG CSDA range in dry air: kinetic energy in MeV, range in g/cm².
  const airRanges = [[0,0],[10,.7862],[20,2.686],[40,8.633],[80,25.35],[140,55.62],
    [200,88.03],[300,143],[400,197.7],[800,407.4],[1000,507.7],[1400,701.4],
    [2000,979.6],[3000,1421],[4000,1845],[8000,3440]];
  function interpolateAir(value,axis) {
    const i=airRanges.findIndex(row=>row[axis]>=value);
    if(i<=0) return i===0?0:airRanges.at(-1)[1-axis];
    const a=airRanges[i-1], b=airRanges[i];
    return a[1-axis]+(value-a[axis])/(b[axis]-a[axis])*(b[1-axis]-a[1-axis]);
  }
  function pressure(z) {
    if(z<=11) return 101325*(1-6.5*z/288.15)**5.25588;
    if(z<=20) return 22632.06*Math.exp(-(z-11)/6.34162);
    return 5474.89*(216.65/(216.65+z-20))**34.1632;
  }
  function updateAirEstimate(){
    const z=Number(altitude.value), mass=105.6583755;
    const kinetic=mass*(1/Math.sqrt(1-velocity.value**2)-1);
    const range=interpolateAir(kinetic,0), p0=pressure(z);
    const remaining=h=>range-(pressure(h)-p0)/98.0665;
    let result='Con la pérdida media de energía, el muón se detiene antes de alcanzar el suelo.';
    if(remaining(0)>0){
      const steps=512, dz=z/steps;
      let proper=0;
      for(let i=0;i<steps;i++){
        const energy=interpolateAir(remaining((i+.5)*dz),1);
        const betaGamma=Math.sqrt(energy*(energy+2*mass))/mass;
        proper+=dz/(c*betaGamma);
      }
      result='Probabilidad relativista estimada de llegar: '+(100*Math.exp(-proper/lifetime)).toPrecision(3)+' %. Energía cinética al llegar: '+(interpolateAir(remaining(0),1)/1000).toFixed(2)+' GeV.';
    }
    byId('airEstimate').textContent='Energía cinética inicial: '+(kinetic/1000).toFixed(2)+' GeV. '+result;
    byId('strato').className=z>12?'on-route':'';
  }
  const interval = .24;
  let nextEmission = interval;
  function emit(born) {
    const life = -lifetime * Math.log1p(-Math.random());
    particles.push({born, stop:Math.min(life / travelTime(),1),
      x:left+34+(right-left-68)*Math.random(), blinkOffset:Math.random()*2, deposited:false});
    emitted++;
  }
  function restartFlight() {
    elapsed = 0; particles = []; nextEmission = interval; emit(0);
  }
  function setPaused(value) {
    paused = value; byId('pause').textContent = value ? 'Reanudar' : 'Pausar';
  }
  function resetSeries() {
    updateAirEstimate();
    caught = 0; emitted = 0; ink.clearRect(0,0,deposits.width,depth);
    restartFlight(); draw();
  }
  function paint(ctx,img,x,y,size,color) {
    if (ready(img)) {
      const scale = size / Math.max(img.naturalWidth,img.naturalHeight);
      const dw = img.naturalWidth*scale, dh = img.naturalHeight*scale;
      ctx.drawImage(img,x-dw/2,y-dh/2,dw,dh);
    } else {
      ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,size*.28,0,2*Math.PI); ctx.fill();
    }
  }
  function deposit(p) {
    caught++; p.deposited = true;
    paint(ink,green,p.x-left,15+Math.random()*8,35,'#5fea9b');
  }
    function drawStars(ctx, w, h) {
      ctx.fillStyle = "#071126";
      ctx.fillRect(0, 0, w, h);
      if(ready(space)){
        ctx.save(); ctx.globalAlpha=.60;
        const scale=Math.max(w/space.naturalWidth,h/space.naturalHeight);
        ctx.drawImage(space,-20,0,space.naturalWidth*scale+20,space.naturalHeight*scale);ctx.restore();
      }
    }

    function drawEarth(ctx, w, h, y) {
      const size = 540;
      const cx = w / 2;
      const cy = y + size * (0.5 - 17/1024);
      ctx.save();
      if (earthSprite.complete && earthSprite.naturalWidth) {
        ctx.shadowColor = "rgba(91,210,255,.65)";
        ctx.shadowBlur = 28;
        ctx.drawImage(earthSprite, cx - size / 2, cy - size / 2, size, size);
        ctx.shadowBlur = 0;
      } else {
        const grd = ctx.createRadialGradient(cx, cy, 40, cx, cy, 300);
        grd.addColorStop(0, "#7fe0ff");
        grd.addColorStop(0.48, "#1e7bd8");
        grd.addColorStop(0.72, "#1d9d58");
        grd.addColorStop(1, "#0f3f2b");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, cy - y, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }


  function basket(y) {
    const bw = right-left;
    const top=y-8, basketHeight=71;
    if(ready(wicker)) ctx.drawImage(wicker,left,top,bw,basketHeight);
    ctx.drawImage(deposits,left,y-9,bw,depth);
    if(ready(wicker)){
      const rim=.38, cut=Math.round(wicker.naturalHeight*rim);
      ctx.drawImage(wicker,0,cut,wicker.naturalWidth,wicker.naturalHeight-cut,
        left,top+basketHeight*rim,bw,basketHeight*(1-rim));
    }
    ctx.fillStyle='#152a3d';ctx.beginPath();ctx.roundRect(right+10,y-4,175,51,9);ctx.fill();
    ctx.fillStyle='#a4f2c4';ctx.font='bold 21px system-ui';
    ctx.fillText('En la cesta',right+18,y+15);
    ctx.fillStyle='white';ctx.fillText(String(caught),right+18,y+39);
  }
  function watch(x,y,label,time,color) {
    ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(7,20,39,.94)';
    ctx.beginPath();ctx.roundRect(0,0,160,48,10);ctx.fill();
    ctx.translate(23,24);ctx.fillStyle='white';ctx.beginPath();ctx.arc(0,0,18,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=2;
    for(let i=0;i<10;i++){ctx.save();ctx.rotate(i*Math.PI/5);ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(0,-13);ctx.stroke();ctx.restore();}
    ctx.save();ctx.rotate(time*Math.PI/5);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,-12);ctx.stroke();ctx.restore();
    ctx.fillStyle='#d4eafa';ctx.font='bold 15px system-ui';ctx.fillText(label,25,-3);
    ctx.fillStyle='white';ctx.font='bold 20px monospace';ctx.fillText(time.toFixed(2)+' μs',25,17);ctx.restore();
  }
  function draw() {
    const muonFrame = reference.value === 'muon', g = factor();
    let phase = stream() ? 0 : Math.min(elapsed/flightSeconds,particles[0].stop);
    const thickness = altitude.value/(muonFrame?g:1);
    const span = 315/(muonFrame?g:1);
    const start = muonFrame && stream() ? 375-span : 60-(muonFrame?span*phase:0), ground=start+span;
    drawStars(ctx,w,h);
    const sky=ctx.createLinearGradient(0,start,0,ground);
    sky.addColorStop(0,'rgba(69,159,244,.12)');sky.addColorStop(1,'rgba(64,179,247,.55)');
    ctx.fillStyle=sky;ctx.fillRect(0,start,w,span);drawEarth(ctx,w,h,ground);
    if (ready(balloon)) {
      for(const b of balloons){
        b.y=b.placedY ?? ground-span*b.altitude-b.height;
        ctx.drawImage(balloon,b.x,b.y,b.width,b.height);
      }
    }
    if(altitude.value>12){
      const boundary=ground-span*12/altitude.value;
      ctx.fillStyle='rgba(134,118,207,.19)';ctx.fillRect(0,start,w,boundary-start);
      ctx.fillStyle='#c6c0ea';ctx.fillRect(0,boundary,w,1);
    }
    ctx.strokeStyle='#aee9ff';ctx.lineWidth=2;ctx.setLineDash([8,7]);
    ctx.beginPath();ctx.moveTo(0,start);ctx.lineTo(w,start);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='white';ctx.beginPath();ctx.moveTo(36,start);ctx.lineTo(36,ground);
    for(const y of [start,ground]){ctx.moveTo(29,y);ctx.lineTo(43,y);}ctx.stroke();
    ctx.fillStyle='white';ctx.font='bold 22px system-ui';ctx.fillText(thickness.toFixed(2)+' km',49,Math.max(25,start+span/2));
    basket(ground);
    let active=0;
    for(const p of particles){
      // In the stream, synchronise both snapshots at the detector. Lorentz simultaneity
      // shifts creation towards arrival by beta² times the Earth crossing time.
      const clockScale = muonFrame && stream() ? 1/(g*g) : 1;
      const sinceBirth = elapsed-p.born-flightSeconds*(1-clockScale);
      if(sinceBirth<0) continue;
      const progress = sinceBirth/(flightSeconds*clockScale);
      const age=sinceBirth-flightSeconds*clockScale*p.stop;
      const y=muonFrame && !stream() ? 60 : start+span*Math.min(progress,p.stop);
      if(age<0){
        active++;
        if(stream()) phase=Math.max(phase,progress);
        const eyesClosed=(elapsed+p.blinkOffset)%1.85<.16 && ready(blink);
        paint(ctx,eyesClosed?blink:flying,p.x,y,stream()?49:86,'#749dff');
      } else if(p.stop<1 && age<.62){
        ctx.save();ctx.globalAlpha=Math.min(1,(.62-age)/.23);
        paint(ctx,flash,p.x,y,26+age*(stream()?70:103),'#ffcf77');ctx.restore();
      }
    }
    if(!stream()){
      const x=particles[0].x, y=muonFrame?60:start+span*phase;
      watch(x+207>w-175?x-207:x+47,Math.max(5,y-42),'Muón',travelTime()*phase,'#166e88');
      watch(w-168,7,'Tierra',earthTime()*phase,'#17632f');
    }
    byId('sceneTitle').textContent=stream()?(muonFrame?'Chorro desde los muones · cámara en la cesta':'Chorro de muones hacia la Tierra'):muonFrame?'La Tierra se acerca al muón':'El muón cae hacia la Tierra';
    byId('distanceLabel').textContent=muonFrame?'Espesor desde el muón':'Espesor desde la Tierra';
    byId('distanceOut').textContent=thickness.toFixed(2)+' km';
    byId('betaOut').textContent=Number(velocity.value).toFixed(4)+' c';
    byId('heightOut').textContent=Number(altitude.value).toFixed(1)+' km';
    byId('gammaOut').textContent=g.toFixed(2);
    byId('probability').textContent=(100*Math.exp(-travelTime()/lifetime)).toPrecision(3)+' %';
    byId('outcome').textContent=stream()?active+' en vuelo · '+caught+' de '+emitted+' en la cesta':
      (active?'En vuelo':particles[0].stop===1?'Ha llegado':'Se ha desintegrado')+' · Cesta '+caught;
    byId('earthTimeOut').textContent=stream()&&!active?'—':(earthTime()*phase).toFixed(2)+' μs';
    byId('muonTimeOut').textContent=stream()&&!active?'—':(travelTime()*phase).toFixed(2)+' μs';
  }
  let last = performance.now();
  function frame(now) {
    if (!paused) {
      elapsed += Math.min(.1,(now-last)/1000)*Number(pace.value);
      if(stream()) while(nextEmission<=elapsed){emit(nextEmission);nextEmission+=interval;}
      for(const p of particles) if(p.stop===1 && !p.deposited && elapsed>=p.born+flightSeconds) deposit(p);
      if(stream()) particles=particles.filter(p=>elapsed-p.born<=flightSeconds+.65);
    }
    last=now;draw();requestAnimationFrame(frame);
  }
  byId('pause').onclick=()=>setPaused(!paused);
  byId('newMuon').onclick=()=>{if(stream()) emit(elapsed); else restartFlight();setPaused(false);};
  pace.oninput=()=>{byId('paceOut').textContent=pace.value+'×';};
  byId('reset').onclick=()=>{velocity.value=velocity.defaultValue;altitude.value=altitude.defaultValue;pace.value=pace.defaultValue;pace.oninput();setPaused(false);resetSeries();};
  for(const input of [velocity,altitude])input.oninput=resetSeries;
  reference.onchange=draw;
  model.onchange=resetSeries;
  beam.onchange=()=>{byId('newMuon').textContent=stream()?'Emitir otro muón':'Nuevo muón';resetSeries();};
  resetSeries();requestAnimationFrame(frame);
})();
