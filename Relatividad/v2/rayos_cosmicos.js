(() => {
  const el = id => document.getElementById(id);
  const canvas = el('shower'), ctx = canvas.getContext('2d');
  const playback = el('playback');
  function showPlayback(){
    const label=Number(playback.value)+'×';
    el('playbackOut').textContent=label;
    playback.setAttribute('aria-valuetext',label);
  }
  playback.oninput=showPlayback;
  showPlayback();
  const particles = {
    p:['p','#ffbb56','Protón'], pi:['π','#ff94bc','Piones'],
    g:['γ','#ffe97a','Fotones'], e:['e','#76cfff','Electrones y positrones'],
    mu:['μ','#6affa0','Muones'], nu:['ν','#cab0ff','Neutrinos y antineutrinos']
  };
  for(const [symbol,color,label] of Object.values(particles)){
    const key=document.createElement('span'), chip=document.createElement('b');
    key.className='key';chip.textContent=symbol;chip.style.setProperty('--t',color);
    key.append(chip,' '+label);el('legend').append(key);
  }
  const W=900,H=500,ground=465;
  const archive=document.createElement('canvas');
  archive.width=W;archive.height=H;
  const ink=archive.getContext('2d');
  let fixed=true,fadeStart=0;
  el('trailMode').onclick=()=>{
    fixed=!fixed;fadeStart=time;
    el('trailMode').setAttribute('aria-pressed',String(fixed));
    el('trailMode').textContent=fixed?'Rastro fijo':'Rastro desvaneciente';
    render();
  };
  function archiveShower(event){
    for(const line of event.tracks){
      ink.strokeStyle=particles[line.type][1];ink.globalAlpha=.55;
      ink.lineWidth=line.type==='p'?3.2:2;ink.setLineDash(line.type==='nu'?[5,5]:[]);
      ink.beginPath();ink.moveTo(line.x,line.y);ink.lineTo(line.end.x,line.end.y);ink.stroke();
    }
  }
  const balloon = new Image();
  balloon.src = 'globo-aerostatico.webp';
  const between=(a,b)=>a+(b-a)*Math.random();
  let showers=[],time=0,count=0,rain=false,paused=false,next=0,last=performance.now();
  function shower(beta){
    const tracks=[];
    // A branch starts at exactly the position and time where its parent ends.
    function track(parent,type,symbol,dx,dy,rate=1){
      const x=parent.x,y=parent.y;
      const fraction=Math.min(1,(ground-y)/dy);
      const endX=Math.max(22,Math.min(W-22,x+dx*fraction)),endY=y+dy*fraction;
      const duration=Math.hypot(endX-x,endY-y)/(77*rate);
      const end={x:endX,y:endY,t:parent.t+duration};
      tracks.push({type,symbol,x,y,start:parent.t,end});
      return end;
    }
    function pair(photon,direction,depth){
      if(photon.y>ground-34) return;
      for(const sign of [-1,1]){
        const electron=track(photon,'e',sign<0?'e⁻':'e⁺',direction*14+sign*between(14,36),between(29,56));
        if(depth>0 && electron.y<ground-50){
          // Bremsstrahlung: the original charged particle continues beyond emission.
          track(electron,'e',sign<0?'e⁻':'e⁺',sign*16,between(20,46));
          const gamma=track(electron,'g','γ',sign*between(18,35),between(20,42));
          pair(gamma,sign,depth-1);
        }
      }
    }
    const origin={x:between(W*.32,W*.67),y:10,t:time};
    const hit=track(origin,'p','p',between(-44,44),between(93,142),beta);
    const neutral=track(hit,'pi','π⁰',0,5);
    for(const sign of [-1,1]){
      const gamma=track(neutral,'g','γ',sign*between(17,42),between(32,65));
      pair(gamma,sign,beta>.997?1:0);
      const charged=track(hit,'pi',sign>0?'π⁺':'π⁻',sign*between(52,90),between(33,79));
      track(charged,'nu',sign>0?'νμ':'ν̄μ',sign*between(68,136),ground-charged.y);
      const decay=Math.random()<.45;
      const muon=track(charged,'mu',sign>0?'μ⁺':'μ⁻',sign*between(24,76),decay?between(68,145):ground-charged.y,.985);
      if(decay && muon.y<ground-2){
        track(muon,'e',sign>0?'e⁺':'e⁻',sign*between(13,32),between(33,62));
        track(muon,'nu',sign>0?'νₑ':'ν̄ₑ',sign*between(28,62),ground-muon.y);
        track(muon,'nu',sign>0?'ν̄μ':'νμ',-sign*between(30,75),ground-muon.y);
      }
    }
    const energy=.938272*(1/Math.sqrt(1-beta*beta)-1);
    showers.push({tracks,until:Math.max(...tracks.map(s=>s.end.t))+2.5});
    count++;
    el('reading').textContent='Protones lanzados: '+count+'. Último: '+beta.toFixed(5)+'c · '+energy.toFixed(2)+' GeV de energía cinética.';
  }
  function render(){
    const sx=canvas.width/W,sy=canvas.height/H;
    ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,W,H);
    if (balloon.naturalWidth) {
      ctx.drawImage(balloon, W*.14, H*.42, 15, 23);
      ctx.drawImage(balloon, W*.82, H*.60, 18, 27);
      ctx.drawImage(balloon, W*.26, H*.78, 21, 32);
    }
    ctx.globalAlpha=fixed?1:Math.max(0,1-(time-fadeStart)/2.5);
    ctx.drawImage(archive,0,0);ctx.globalAlpha=1;
    for(const event of showers){
      for(const line of event.tracks){
        if(time<line.start) continue;
        const p=Math.min(1,(time-line.start)/(line.end.t-line.start));
        const x=line.x+p*(line.end.x-line.x),y=line.y+p*(line.end.y-line.y);
        ctx.strokeStyle=particles[line.type][1];ctx.fillStyle=ctx.strokeStyle;
        const opacity=fixed?1:Math.max(0,1-Math.max(0,time-line.end.t)/2.5);
        if(opacity===0)continue;
        ctx.lineWidth=line.type==='p'?3.2:2;ctx.globalAlpha=(p===1?.55:.96)*opacity;
        ctx.setLineDash(line.type==='nu'?[5,5]:[]);
        ctx.beginPath();ctx.moveTo(line.x,line.y);ctx.lineTo(x,y);ctx.stroke();
        if(p<1 || (line.type==='mu' && line.end.y===ground)){
          ctx.globalAlpha=opacity;ctx.beginPath();ctx.arc(x,y,p<1?3.5:4.5,0,2*Math.PI);ctx.fill();
          if(!rain || Number(playback.value)<1 || line.type==='p' || line.type==='mu'){
            ctx.font='bold '+(canvas.clientWidth<620?25:18)+'px system-ui';ctx.lineWidth=3;
            ctx.setLineDash([]);ctx.strokeStyle='#102033';ctx.strokeText(line.symbol,x+5,y+2);ctx.fillText(line.symbol,x+5,y+2);
          }
        }
      }
    }
    ctx.globalAlpha=1;ctx.setLineDash([]);
  }
  new ResizeObserver(()=>{
    const dpr=Math.min(window.devicePixelRatio||1,3);
    canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);render();
  }).observe(canvas);
  function setRain(on){
    rain=on;el('stream').setAttribute('aria-pressed',String(on));
    el('stream').textContent=on?'Detener la lluvia':'Lluvia de rayos';
  }
  function setPause(on){paused=on;last=performance.now();el('pause').textContent=on?'Reanudar':'Pausar';}
  function single(){setRain(false);setPause(false);shower(Number(el('speed').value));}
  el('single').onclick=single;
  el('stream').onclick=()=>{setRain(!rain);if(rain){setPause(false);next=time;}};
  el('pause').onclick=()=>setPause(!paused);
  el('reset').onclick=()=>{setRain(false);setPause(false);time=0;count=0;showers=[];ink.clearRect(0,0,W,H);el('reading').textContent='Protones lanzados: 0.';render();};
  el('speed').oninput=()=>{el('beta').textContent=Number(el('speed').value).toFixed(5)+'c';};
  function frame(now){
    if(!paused){
      time+=Math.min(.1,(now-last)/1000)*Number(playback.value);
      if(rain && time>=next){
        const beta=1-Math.exp(between(Math.log(.00001),Math.log(.02)));
        shower(beta);next=time+2.2;
      }
      showers=showers.filter(s=>{
        if(time<s.until)return true;
        if(fixed)archiveShower(s);
        return false;
      });
      if(!fixed && time-fadeStart>=2.5)ink.clearRect(0,0,W,H);
    }
    last=now;render();requestAnimationFrame(frame);
  }
  el('speed').oninput();single();requestAnimationFrame(frame);
})();
