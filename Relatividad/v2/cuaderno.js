"use strict";
const c=299792458, G=6.67430e-11, earthRadius=6371000, earthMass=5.9722e24, solarMass=1.98847e30;
const gamma=b=>1/Math.sqrt((1-b)*(1+b));
const beta=["Velocidad v/c",0,.99,.01,.6];
const distance=["Separación Δx (m)",0,600,5,300];
const time=["Intervalo Δt (μs)",-3,3,.05,0];
const transform=(b,x,t)=>[gamma(b)*(t-b*x/(c/1e6)),gamma(b)*(x-b*c*t/1e6)];
const cases={
  dos_observadores:{inputs:[beta,distance,time],results:["Δt′ (μs)","Δx′ (m)"],calc:transform,ask:"¿Dos sucesos simultáneos en el andén siguen siendo simultáneos en el tren?",law:"Δt′ = γ(Δt − vΔx/c²), Δx′ = γ(Δx − vΔt)."},
  minkowski:{inputs:[beta,distance,time],results:["Δt′ (μs)","Δx′ (m)"],calc:transform,ask:"El suceso A está en el origen. Sitúa B y observa las rectas de simultaneidad de los dos marcos.",law:"Las dos rectas de luz cumplen x = ±ct. Sobre el eje x′ se cumple ct = βx y sobre el eje ct′ se cumple x = βct."},
  observador_paseando:{inputs:[beta,distance],results:["Δt′ (μs)","Δx′ (m)"],calc:(b,x)=>transform(b,x,0),ask:"Dos destellos ocurren a la vez en el suelo. ¿Cuál ocurre primero para quien camina en el sentido de x creciente?",law:"Para Δt = 0 y Δx positivo, Δt′ = −γvΔx/c²."},
  bicicleta_einstein:{inputs:[beta,["Velocidad de lanzamiento u′/c",-.99,.99,.01,.5]],results:["u/c (Einstein)","u/c (Galileo)"],calc:(b,u)=>[(u+b)/(1+b*u),u+b],ask:"Lanza hacia delante y hacia atrás. ¿Cuándo se aprecia la diferencia entre las dos leyes?",law:"Para velocidades colineales, u/c = (u′/c + β)/(1 + βu′/c)."},
  reloj_einstein:{inputs:[beta,["Separación de espejos (m)",.1,5,.1,1]],results:["Ida y vuelta Δt (ns)","Tiempo propio Δτ (ns)"],calc:(b,h)=>[2*h*gamma(b)/c*1e9,2*h/c*1e9],ask:"¿Qué le ocurre al periodo si duplicas la altura del reloj?",law:"Para espejos separados transversalmente una distancia H, Δτ = 2H/c y Δt = γΔτ."},
  muon_einstein:{inputs:[["Velocidad v/c",.5,.999,.001,.98],["Altitud (km)",1,30,.5,10]],results:["Supervivencia (%)","Tiempo propio (μs)","Tiempo terrestre (μs)"],calc:(b,h)=>{const t=h*1e9/(b*c),tau=t/gamma(b);return [100*Math.exp(-tau/2.1969811),tau,t];},ask:"¿Qué fracción de un conjunto de muones alcanzaría el suelo?",law:"Vuelo vertical a velocidad constante. P = exp(−Δτ/τμ), con vida media τμ ≈ 2.197 μs."},
  lanza_granero:{inputs:[beta,["Longitud propia de la lanza (m)",2,20,.5,10],["Longitud propia del granero (m)",2,20,.5,8]],results:["Holgura en el granero (m)","Holgura en la lanza (m)"],calc:(b,l,d)=>[d-l/gamma(b),d/gamma(b)-l],ask:"Una holgura positiva permite contener toda la lanza en un mismo instante de ese marco. ¿Coinciden los veredictos?",law:"En cada marco solo se contrae el objeto en movimiento. Los cierres de las dos puertas son sucesos distintos."},
  gemelos:{inputs:[["Velocidad v/c",.05,.99,.01,.8],["Distancia de ida (años luz)",.5,20,.5,4]],results:["Tiempo del viajero (años)","Tiempo terrestre (años)"],calc:(b,d)=>[2*d/(b*gamma(b)),2*d/b],ask:"Al reunirse los gemelos, ¿qué edad ha ganado cada uno?",law:"Velocidad de módulo constante en cada tramo y giro instantáneo idealizado. Δt = 2D/v, Δτ = Δt/γ."},
  ascensor_einstein:{inputs:[["Aceleración (m/s²)",0,30,.1,9.8],["Ancho de la cabina (m)",1,20,.5,5]],results:["Caída del rayo (fm)","Tiempo de cruce (ns)"],calc:(a,l)=>[.5*a*(l/c)**2*1e15,l/c*1e9],ask:"Un rayo entra horizontalmente en la cabina. ¿Cuánto desciende respecto a una cabina que acelera hacia arriba?",law:"En una cabina pequeña, aL/c² ≪ 1. Durante el cruce Δt ≈ L/c, la cabina asciende aΔt²/2."},
  torre_gravitatoria:{inputs:[["Altura (km)",0,100000,10,1000],["Masa (M⊕)",.1,10,.1,1]],results:["Adelanto (ns/día de la base)","Altura (km)"],calc:(h,m)=>{const rs=2*G*m*earthMass/c**2,delta=rs*h*1000/(earthRadius*(earthRadius+h*1000)*(1-rs/earthRadius));return [86400e9*delta/(1+Math.sqrt(1+delta)),h];},ask:"Compara relojes estáticos a distintos radios. ¿Se duplica el adelanto al duplicar una altura grande?",law:"Exterior esférico de Schwarzschild. La razón de ritmos alto/bajo es √[(1 − rₛ/r₂)/(1 − rₛ/r₁)]."},
  lente_gravitacional:{inputs:[["Posición de la fuente β/θE",-3,3,.05,1]],results:["Imagen θ+/θE","Imagen θ−/θE"],calc:y=>[(y+Math.hypot(y,2))/2,(y-Math.hypot(y,2))/2],ask:"¿Dónde se forman las imágenes al atravesar la alineación perfecta?",law:"Lente puntual delgada. En unidades del radio angular de Einstein, y = x − 1/x. En alineación, ±1 son los cortes de un único anillo."},
  espaguetizacion:{inputs:[["Radio r/rₛ",1,15,.05,3],["Masa (M☉)",1,100,1,10]],results:["Marea radial (m/s²)","Marea transversal (m/s²)"],calc:(q,m)=>{const mass=m*solarMass,r=q*2*G*mass/c**2,k=G*mass/r**3;return [4*k,-2*k];},ask:"A igual r/rₛ, ¿produce más marea el agujero negro de mayor masa?",law:"Desviación geodésica local para separaciones de 2 m en caída radial. Δa radial = 2GMℓ/r³ y Δa transversal = −GMℓ/r³."},
  horizonte:{inputs:[["Radio de emisión r/rₛ",1.01,12,.01,3],["Masa (M☉)",1,100,1,10]],results:["Corrimiento z","Caída hasta rₛ (ms propios)"],calc:(q,m)=>[1/Math.sqrt(1-1/q)-1,1000*4*G*m*solarMass/(3*c**3)*(q**1.5-1)],ask:"Compara dos mediciones distintas cerca del horizonte. ¿Qué depende de la masa al fijar r/rₛ?",law:"z corresponde a un emisor estático y un receptor en el infinito. El tiempo propio corresponde a una partícula en caída libre radial desde el reposo en el infinito."},
  doppler:{inputs:[["Velocidad de alejamiento v/c",-.95,.95,.01,.6],["Frecuencia emitida (THz)",100,800,10,600]],results:["Frecuencia recibida (THz)","Cociente f/f₀"],calc:(b,f)=>{const k=Math.sqrt((1-b)/(1+b));return [f*k,k];},ask:"Invierte el sentido del movimiento de la fuente. ¿Cómo cambia la frecuencia?",law:"Doppler longitudinal. f/f₀ = √[(1 − β)/(1 + β)] para β positiva si la fuente se aleja."},
  energia:{inputs:[beta,["Masa en reposo (kg)",.1,10,.1,1]],results:["Energía cinética (PJ)","Energía total (PJ)","Momento (10⁸ kg·m/s)"],calc:(b,m)=>[(gamma(b)-1)*m*c*c/1e15,gamma(b)*m*c*c/1e15,gamma(b)*m*b*c/1e8],ask:"¿Cuánta energía cinética hay que añadir para acercarse un poco más a c?",law:"E = γmc², K = (γ − 1)mc² y p = γmv. En reposo E = mc²."}
};
const el=id=>document.getElementById(id);
const format=x=>x!==0&&(Math.abs(x)<.001||Math.abs(x)>=1e5)?x.toExponential(3):String(Number(x.toFixed(4)));
const query=new URLSearchParams(location.search), select=el('topic');
if(Object.hasOwn(cases,query.get('experimento')))select.value=query.get('experimento');
let model, values;
function readTopic(){
  model=cases[select.value];
  values=model.inputs.map(input=>input[4]);
  el('topic-title').textContent=select.selectedOptions[0].textContent;
  el('question').textContent=model.ask;
  el('equation').textContent=model.law;
  const link=el('scene-link'), extras=['minkowski','horizonte','doppler','energia'];
  link.hidden=extras.includes(select.value);
  link.href=select.value+'.html';
  el('controls').replaceChildren();
  model.inputs.forEach(([caption,min,max,step,value],i)=>{
    const control=document.createElement('div'),label=document.createElement('label'),output=document.createElement('output'),input=document.createElement('input');
    control.className='control';input.type='range';input.id='parameter-'+i;
    Object.assign(input,{min,max,step,value});label.htmlFor=input.id;label.append(caption,output);
    output.textContent=value;
    input.oninput=()=>{values[i]=input.valueAsNumber;output.textContent=input.value;update();};
    control.append(label,input);el('controls').append(control);
  });
  update();
}
function svgNode(tag,attrs,text){
  const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
  if(text!==undefined)n.textContent=text;
  return n;
}
function plot(){
  const svg=el('graph'), [label,min,max]=model.inputs[0];
  svg.replaceChildren();
  const line=(x1,y1,x2,y2,stroke)=>svg.append(svgNode('line',{x1,y1,x2,y2,stroke,'stroke-width':2}));
  const caption=(x,y,str,align='start')=>svg.append(svgNode('text',{x,y,'text-anchor':align,fill:'#20394c','font-size':15},str));
  if(select.value==='minkowski'){
    const [b,x,t]=values, extent=Math.max(320,Math.abs(t*c/1e6)*1.1,x*1.1),s=103/extent;
    const X=x=>290+s*x,Y=ct=>138-s*ct;
    line(125,138,458,138,'#344c60');line(290,252,290,26,'#344c60');
    for(const sign of [-1,1])line(X(-extent),Y(-sign*extent),X(extent),Y(sign*extent),'#dfa02c');
    line(X(-extent),Y(-b*extent),X(extent),Y(b*extent),'#00806e');
    line(X(-b*extent),Y(-extent),X(b*extent),Y(extent),'#00806e');
    caption(465,143,'x');caption(292,20,'ct');caption(22,265,'Verde: ejes de S′ · Ámbar: luz · Azul: suceso B');
    svg.append(svgNode('circle',{cx:X(x),cy:Y(t*c/1e6),r:5,fill:'#1765b3'}));caption(X(x)+8,Y(t*c/1e6)-5,'B');
    svg.setAttribute('aria-label','Diagrama espacio-tiempo con ambos ejes en metros');return;
  }
  const lower=253,upper=21,left=80,right=554;
  const steps=150,samples=Array.from({length:steps+1},(_,i)=>model.calc(min+(max-min)*i/steps,...values.slice(1))[0]);
  const ymin=Math.min(0,...samples),ymax=Math.max(...samples,0),span=ymax-ymin||1;
  const px=x=>left+(right-left)*(x-min)/(max-min),py=y=>lower-(lower-upper)*(y-ymin)/span;
  for(let i=0;i<=4;i++){
    const v=ymin+span*i/4;line(left,py(v),right,py(v),'#dce7e9');caption(left-6,py(v)+4,format(v),'end');
  }
  svg.append(svgNode('polyline',{points:samples.map((y,i)=>(left+(right-left)*i/steps)+','+py(y)).join(' '),fill:'none',stroke:'#007786','stroke-width':3}));
  svg.append(svgNode('circle',{cx:px(values[0]),cy:py(model.calc(...values)[0]),r:6,fill:'#b14d24'}));
  caption(left,273,String(min));caption(right,273,String(max),'end');caption((left+right)/2,273,label,'middle');caption(left,15,model.results[0]);
  svg.setAttribute('aria-label',model.results[0]+' en función de '+label);
}
function update(){
  const results=model.calc(...values);
  el('metrics').replaceChildren(...results.map((v,i)=>{
    const box=document.createElement('div'),value=document.createElement('strong');
    box.className='metric';value.textContent=format(v);box.append(model.results[i],value);return box;
  }));plot();
}
el('record').onclick=()=>{
  const row=el('records').insertRow();
  for(const text of [el('topic-title').textContent,model.inputs.map(([s],i)=>s+' = '+values[i]).join(' · '),model.results.map((s,i)=>s+' = '+format(model.calc(...values)[i])).join(' · ')])row.insertCell().textContent=text;
};
el('print').onclick=()=>window.print();
el('reset').onclick=readTopic;select.onchange=readTopic;
if(query.get('solo')==='1')document.querySelector('.tools').hidden=true;
readTopic();
