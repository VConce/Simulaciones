(() => {
  const byId = id => document.getElementById(id);
  const canvas = byId('earthCanvas'), ctx = canvas.getContext('2d');
  const {width:w, height:h} = canvas;
  const velocity = byId('beta'), altitude = byId('height'), reference = byId('reference');
  const model = byId('model'), beam = byId('beam');
  const lifetime = 2.1969811, c = .299792458, flightSeconds = 5;
  const image = src => Object.assign(new Image(), {src});
  const earthSprite = image('../assets/earth-blue-marble-sprite.png');
  const flying = image('../assets/muon-character-sprite.png'), blink = image('muon-parpadeo.webp');
  const green = image('muon-verde.webp'), flash = image('muon-destello.webp');
  const left = 170, right = 540, depth = 44;
  let particles = [], elapsed = 0, caught = 0, emitted = 0, paused = false;
  // A fixed-size detector image preserves every landing without retaining an unbounded particle list.
  const deposits = document.createElement('canvas');
  deposits.width = right-left; deposits.height = depth;
  const ink = deposits.getContext('2d');
  const stream = () => beam.value === 'stream';
  const classical = () => model.value === 'classic';
  const ready = img => img.complete && img.naturalWidth;
  const factor = () => classical() ? 1 : 1 / Math.sqrt(1 - velocity.value ** 2);
  const earthTime = () => altitude.value / (velocity.value * c);
  const travelTime = () => earthTime() / factor();
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
    paint(ink,green,p.x-left,17+Math.random()*12,31,'#5fea9b');
  }
    function drawStars(ctx, w, h, shift = 0) {
      ctx.fillStyle = "#071126";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 110; i++) {
        const x = (i * 73 + 31) % w;
        const y = (i * 47 + shift) % Math.floor(h * 0.72);
        const a = 0.25 + ((i * 17) % 65) / 100;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, i % 8 ? 1.5 : 2.7, i % 8 ? 1.5 : 2.7);
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
    ctx.save(); ctx.translate(left,y);
    const bw = right-left;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(bw,0); ctx.lineTo(bw-17,depth);
    ctx.lineTo(17,depth); ctx.closePath(); ctx.fillStyle='#684632'; ctx.fill(); ctx.clip();
    ctx.strokeStyle='#9d7151'; ctx.lineWidth=2;
    ctx.beginPath(); for(let i=-depth;i<bw+depth;i+=15){
      ctx.moveTo(i,0);ctx.lineTo(i+depth,depth);ctx.moveTo(i,0);ctx.lineTo(i-depth,depth);
    } ctx.stroke(); ctx.drawImage(deposits,0,0); ctx.restore();
    ctx.strokeStyle='#eac298';ctx.lineCap='round';ctx.lineWidth=5;ctx.beginPath();
    ctx.moveTo(left,y);ctx.lineTo(left+17,y+depth);ctx.lineTo(right-17,y+depth);
    ctx.lineTo(right,y);ctx.stroke();
    ctx.fillStyle='#ddac79'; ctx.fillRect(left-3,y-2,bw+6,4);
    ctx.fillStyle='#152a3d';ctx.beginPath();ctx.roundRect(right+10,y-4,175,51,9);ctx.fill();
    ctx.fillStyle='#a4f2c4';ctx.font='bold 21px system-ui';
    ctx.fillText('En la cesta',right+18,y+15);
    ctx.fillStyle='white';ctx.fillText(String(caught),right+18,y+39);
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
        paint(ctx,eyesClosed?blink:flying,p.x,y,stream()?42:73,'#749dff');
      } else if(p.stop<1 && age<.62){
        ctx.save();ctx.globalAlpha=Math.min(1,(.62-age)/.23);
        paint(ctx,flash,p.x,y,26+age*(stream()?70:103),'#ffcf77');ctx.restore();
      }
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
      elapsed += Math.min(.1,(now-last)/1000);
      if(stream()) while(nextEmission<=elapsed){emit(nextEmission);nextEmission+=interval;}
      for(const p of particles) if(p.stop===1 && !p.deposited && elapsed>=p.born+flightSeconds) deposit(p);
      if(stream()) particles=particles.filter(p=>elapsed-p.born<=flightSeconds+.65);
    }
    last=now;draw();requestAnimationFrame(frame);
  }
  byId('pause').onclick=()=>setPaused(!paused);
  byId('newMuon').onclick=()=>{if(stream()) emit(elapsed); else restartFlight();setPaused(false);};
  byId('reset').onclick=()=>{velocity.value=velocity.defaultValue;altitude.value=altitude.defaultValue;setPaused(false);resetSeries();};
  for(const input of [velocity,altitude])input.oninput=resetSeries;
  reference.onchange=draw;
  model.onchange=resetSeries;
  beam.onchange=()=>{byId('newMuon').textContent=stream()?'Emitir otro muón':'Nuevo muón';resetSeries();};
  resetSeries();requestAnimationFrame(frame);
})();
