const select=document.querySelector('#scene');
const stage=document.querySelector('#stage');
const standalone=new Set(["dos_observadores","observador_paseando","bicicleta_einstein","reloj_einstein","muon_einstein","lanza_granero","gemelos","ascensor_einstein","torre_gravitatoria","lente_gravitacional","espaguetizacion"]);
function display(){
  const id=select.value;
  const path=standalone.has(id)?id+'.html':'simulador_relatividad_ib.html?experimento='+id+'&solo=1';
  stage.src=path;
  stage.title=select.selectedOptions[0].textContent;
  document.querySelector('#direct').href=path;
  history.replaceState(null,'','#'+id);
}
if(Array.from(select.options).some(o=>o.value===location.hash.slice(1)))select.value=location.hash.slice(1);
select.addEventListener('change',display);
display();
