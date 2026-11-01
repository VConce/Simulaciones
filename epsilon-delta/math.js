/* Parser acotado: no eval, ni acceso a objetos o código del navegador. */
(function(root){
const functions={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,ln:Math.log,log:Math.log,log10:Math.log10,floor:Math.floor,ceil:Math.ceil,sign:Math.sign,min:Math.min,max:Math.max,pow:Math.pow};
function compile(source){
 if(source.length>300)throw Error('La expresión es demasiado larga.');
 const tokens=source.toLowerCase().replaceAll('π','pi').replaceAll('−','-').match(/(?:\d*\.?\d+(?:e[+-]?\d+)?)|[a-z]+|<=|>=|==|!=|[+\-*/^(),<>]/g)||[];
 if(tokens.join('')!==source.toLowerCase().replaceAll('π','pi').replaceAll('−','-').replace(/\s/g,''))throw Error('Hay símbolos no admitidos.');
 let i=0;const peek=()=>tokens[i],take=()=>tokens[i++];
 function expr(min=0){let t=take(),left;
  if(t==='+'||t==='-'){const n=expr(3);left=x=>t==='-'?-n(x):n(x);}
  else if(t==='('){left=expr();if(take()!==')')throw Error('Falta cerrar un paréntesis.');}
  else if(t==='x')left=x=>x;
  else if(t==='pi'||t==='e')left=()=>t==='pi'?Math.PI:Math.E;
  else if(t&&/^(?:\d|\.)/.test(t)){const v=Number(t);left=()=>v;}
  else if(t==='if'||functions[t]){if(take()!=='(')throw Error('Usa paréntesis en las funciones.');const args=[expr()];while(peek()===','){take();args.push(expr());}if(take()!==')')throw Error('Falta cerrar la función.');if(t==='if'){if(args.length!==3)throw Error('if necesita condición, valor verdadero y valor falso.');left=x=>args[0](x)?args[1](x):args[2](x);}else{if(!['min','max','pow'].includes(t)&&args.length!==1||t==='pow'&&args.length!==2)throw Error('Número de argumentos incorrecto.');left=x=>functions[t](...args.map(a=>a(x)));}}
  else throw Error('Expresión no reconocida. Usa x, números y las funciones indicadas.');
  const prec={'<':1,'>':1,'<=':1,'>=':1,'==':1,'!=':1,'+':2,'-':2,'*':3,'/':3,'^':4};
  while(prec[peek()]&&prec[peek()]>=min){let op=take(),p=prec[op],a=left,b=expr(op==='^'?p:p+1);left=x=>{const u=a(x),v=b(x);return op==='+'?u+v:op==='-'?u-v:op==='*'?u*v:op==='/'?u/v:op==='^'?u**v:op==='<'?+(u<v):op==='>'?+(u>v):op==='<='?+(u<=v):op==='>='?+(u>=v):op==='=='?+(u===v):+(u!==v);};}return left;
 }const fn=expr();if(i!==tokens.length)throw Error('Revisa la expresión. Escribe las multiplicaciones con *.');return fn;
}
const gcd=(a,b)=>{a=Math.abs(a);while(b){let t=b;b=a%b;a=t;}return a;};
function rationals(lo,hi,Q){const out=[];let steps=0;for(let q=1;q<=Q;q++)for(let p=Math.ceil(lo*q);p<=Math.floor(hi*q);p++){if(gcd(p,q)===1)out.push({x:p/q,y:1/q,p,q});if(++steps>100000){out.truncated=true;return out;}}return out;}
const inside=(x,s)=>x!==s.a&&Math.abs(x-s.a)<s.d&&(s.side==='both'||s.side==='left'&&x<s.a||s.side==='right'&&x>s.a);
function check(s,fn){
 if(s.kind==='dirichlet'){const ok=Math.max(Math.abs(s.L),Math.abs(1-s.L))<s.e;return {status:ok?'proof':'fail',text:ok?'Ambos valores, 0 y 1, quedan dentro de la banda para este ε. Esto no demuestra la existencia del límite.':'La densidad de racionales e irracionales garantiza puntos que incumplen la condición en cualquier entorno.',detail:'Dirichlet no tiene límite en ningún punto, tampoco lateral. Para cualquier L, una de las distancias a 0 o a 1 es ≥ 1/2.',witness:null};}
 if(s.kind==='thomae'){
  if(Math.abs(s.L)>=s.e)return {status:'fail',text:'Los irracionales tienen valor 0 y son densos: |0−L| ≥ ε.',detail:'Hay contraejemplos en cualquier entorno por cualquiera de los lados.',witness:null};
  const Q=Math.floor(1/(s.L+s.e));if(Q>500)return {status:'sample',text:'Para esta banda harían falta demasiados denominadores. Aumenta ε para la comprobación completa.',detail:'La representación sigue siendo una muestra finita.',witness:null};let all=rationals(s.a-s.d,s.a+s.d,Q),bad=all.find(r=>inside(r.x,s)&&Math.abs(r.y-s.L)>=s.e);
  return {status:bad?'fail':all.truncated?'sample':'proof',text:bad?`El racional ${bad.p}/${bad.q} incumple: |1/${bad.q}−L| ≥ ε.`:all.truncated?'La enumeración ha alcanzado su límite de cálculo. No se certifica este δ.':`Se han excluido los picos que podrían salir de la banda (q ≤ ${Q}). Los de mayor denominador y los irracionales quedan dentro.`,detail:'Thomae tiene límite 0 en todo punto. Es continua en los irracionales y discontinua en los racionales. Cálculo de distancias con precisión numérica.',witness:bad};}
 let candidates=[];for(let i=1;i<1800;i++){let x=s.a-s.d+2*s.d*i/1800;if(inside(x,s))candidates.push(x);}for(let k=1;k<=12;k++){for(const sign of [-1,1]){let x=s.a+sign*s.d*10**(-k);if(inside(x,s))candidates.push(x);}}let valid=0,witness=null;for(const x of candidates){const y=fn(x);if(Number.isFinite(y)){valid++;if(Math.abs(y-s.L)>=s.e&&(!witness||Math.abs(y-s.L)>Math.abs(witness.y-s.L)))witness={x,y};}}
 if(witness)return {status:'fail',text:'Hay puntos del entorno que quedan fuera de la banda ε.',detail:'Un solo contraejemplo basta para descartar este δ (no necesariamente el límite).',witness};
 let bound=null,reason='';if(s.kind==='square'&&s.L===s.a*s.a){bound=s.d*(2*Math.abs(s.a)+s.d);reason='|x²−a²| = |x−a||x+a| < δ(2|a|+δ).';}if(s.kind==='linear'&&s.L===2*s.a+1){bound=2*s.d;reason='|f(x)−f(a)| = 2|x−a| < 2δ.';}if(s.kind==='abs'&&s.L===Math.abs(s.a)){bound=s.d;reason='||x|−|a|| ≤ |x−a| < δ.';}if(s.kind==='sin'&&s.L===Math.sin(s.a)){bound=s.d;reason='|sin(x)−sin(a)| ≤ |x−a| < δ.';}if(s.kind==='damped'&&s.a===0&&s.L===0){bound=s.d;reason='|x sin(1/x)| ≤ |x| < δ.';}if(s.kind==='removable'&&s.a===1&&s.L===2){bound=s.d;reason='Para x ≠ 1, (x²−1)/(x−1) = x+1; la distancia a 2 es |x−1| < δ.';}
 if(bound!==null&&bound<=s.e)return {status:'proof',text:'Este δ sirve: hay una cota matemática que garantiza la condición.',detail:reason,witness:null};
 return {status:'sample',text:valid?'No se ha encontrado un contraejemplo en la muestra.':'No se han encontrado puntos del dominio en la muestra.',detail:'Una muestra finita no demuestra un límite. Las oscilaciones, los huecos y los picos estrechos pueden pasar inadvertidos.',witness:null};
}
function suggest(s){if(s.kind==='square'&&s.L===s.a*s.a)return .999999*s.e/(Math.sqrt(s.a*s.a+s.e)+Math.abs(s.a));if(s.kind==='linear'&&s.L===2*s.a+1)return s.e/2;if(s.kind==='abs'&&s.L===Math.abs(s.a)||s.kind==='sin'&&s.L===Math.sin(s.a)||s.kind==='damped'&&s.a===0&&s.L===0||s.kind==='removable'&&s.a===1&&s.L===2)return s.e;if(s.kind==='thomae'&&s.L===0&&s.e>=.002){const all=rationals(s.a-2,s.a+2,Math.floor(1/s.e));if(all.truncated)return null;const bad=all.filter(r=>r.x!==s.a);return Math.min(1,...bad.map(r=>Math.abs(r.x-s.a)))*.9;}return null;}
root.EDMath={compile,gcd,rationals,inside,check,suggest};if(typeof module!=='undefined')module.exports=root.EDMath;
})(typeof window!=='undefined'?window:globalThis);