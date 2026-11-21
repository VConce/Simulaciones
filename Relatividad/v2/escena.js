const sliders=Array.from(document.querySelectorAll('input[type=range]'));
for(const slider of sliders){
  const label=slider.labels?.[0]?.textContent||slider.closest('.control,.row')?.querySelector('label')?.textContent||slider.getAttribute('aria-label')||slider.id;
  const row=document.createElement('div'),number=document.createElement('input');
  row.className='precision-row';number.className='precise';number.type='number';
  for(const key of ['min','max','step'])if(slider.hasAttribute(key))number[key]=slider[key];
  if(!slider.labels?.length)slider.setAttribute('aria-label',label.trim());
  number.setAttribute('aria-label',label.trim()+' (valor exacto)');
  slider.before(row);row.append(slider,number);
  const sync=()=>{if(document.activeElement!==number)number.value=slider.value;number.disabled=slider.disabled;};
  const applyNumber=()=>{
    if(number.value!==''&&number.validity.valid&&number.valueAsNumber!==slider.valueAsNumber){
      slider.value=number.value;
      slider.dispatchEvent(new Event('input',{bubbles:true}));
      slider.dispatchEvent(new Event('change',{bubbles:true}));
    }
  };
  number.addEventListener('input',applyNumber);
  number.addEventListener('change',applyNumber);
  number.addEventListener('blur',()=>{applyNumber();number.value=slider.value;});
  slider.addEventListener('input',sync);slider.addEventListener('change',sync);
  document.addEventListener('click',()=>queueMicrotask(sync));sync();
}
const scene=document.querySelector('.scene, .scenes, canvas');
if(scene&&sliders.length){
  const nav=document.createElement('nav');
  nav.className='jump-tools';nav.setAttribute('aria-label','Navegación del experimento');
  for(const [label,target] of [['Escena',scene],['Controles',sliders[0].closest('.control,.panel,.controlCard,.side,.speedPanel')||sliders[0]]]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=()=>target.scrollIntoView({block:'start'});nav.append(button);
  }
  document.body.append(nav);
}
