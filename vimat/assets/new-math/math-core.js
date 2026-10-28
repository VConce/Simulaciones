(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NewMath=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function value(kind,x){switch(kind){case'square':return x*x;case'abs':return Math.abs(x);case'sign':return Math.sign(x);case'spike':return x===0?1:0;default:throw Error('Unknown function');}}
  function quotient(kind,a,r,s,h){
    if(r===s||h===0||![a,r,s,h].every(Number.isFinite))return NaN;
    // Polynomial identity avoids catastrophic subtraction as h tends to zero.
    if(kind==='square')return 2*a+(r+s)*h;
    return(value(kind,a+r*h)-value(kind,a+s*h))/((r-s)*h);
  }
  function generalizedLimits(kind,a,r,s){
    if(r===s)return{valid:false,left:NaN,right:NaN,exists:false,value:NaN};
    let left,right;
    if(kind==='square')left=right=2*a;
    else if(a!==0)left=right=kind==='abs'?Math.sign(a):0;
    else if(kind==='abs'){right=(Math.abs(r)-Math.abs(s))/(r-s);left=-right;}
    else if(kind==='sign'){
      const c=(Math.sign(r)-Math.sign(s))/(r-s);
      left=right=c===0?0:Math.sign(c)*Infinity;
    }else{
      const c=((r===0?1:0)-(s===0?1:0))/(r-s);
      right=c===0?0:Math.sign(c)*Infinity;left=c===0?0:-Math.sign(c)*Infinity;
    }
    if(left===0)left=0;if(right===0)right=0;
    const exists=Number.isFinite(left)&&left===right;
    return{valid:true,left,right,exists,value:exists?left:NaN};
  }
  function derivativeFacts(kind,a){const o=generalizedLimits(kind,a,1,0),sym=generalizedLimits(kind,a,1,-1);return{continuous:a!==0||kind==='square'||kind==='abs',ordinary:o,symmetric:sym};}
  function taylorValue(kind,x){switch(kind){case'exp':return Math.exp(x);case'sin':return Math.sin(x);case'cos':return Math.cos(x);case'log':return x>-1?Math.log1p(x):NaN;case'geometric':return x!==1?1/(1-x):NaN;default:throw Error('Unknown Taylor function');}}
  function factorial(n){let f=1;for(let k=2;k<=n;k++)f*=k;return f;}
  function coefficients(kind,a,n){
    if(!Number.isInteger(n)||n<0||n>15||!Number.isFinite(a)||!Number.isFinite(taylorValue(kind,a)))return null;
    const c=[taylorValue(kind,a)];
    const cyc=kind==='sin'?[Math.sin(a),Math.cos(a),-Math.sin(a),-Math.cos(a)]:[Math.cos(a),-Math.sin(a),-Math.cos(a),Math.sin(a)];
    for(let k=1;k<=n;k++){
      if(kind==='exp')c.push(c[k-1]/k);
      else if(kind==='sin'||kind==='cos')c.push(cyc[k%4]/factorial(k));
      else if(kind==='log')c.push((k%2?1:-1)/(k*(1+a)**k));
      else c.push(c[k-1]/(1-a));
    }
    return c.map(v=>v===0?0:v);
  }
  function horner(c,dx){if(!c)return NaN;let p=0;for(let k=c.length-1;k>=0;k--)p=p*dx+c[k];return p;}
  function convergence(kind,a,x){
    if(!Number.isFinite(taylorValue(kind,a)))return{valid:false,radius:NaN,converges:false,position:'invalid'};
    const radius=kind==='log'?1+a:kind==='geometric'?Math.abs(1-a):Infinity;
    const lower=a-radius,upper=a+radius;
    if(radius===Infinity)return{valid:true,radius,lower,upper,converges:true,position:'inside'};
    // Decimal endpoints are compared as integers, never with a floating tolerance.
    const low=kind==='log'?compareAffine(x,a,0,-1):a<1?compareAffine(x,a,2,-1):compareAffine(x,a,0,1);
    const high=kind==='log'?compareAffine(x,a,2,1):a<1?compareAffine(x,a,0,1):compareAffine(x,a,2,-1);
    const endpoint=low===0?'left':high===0?'right':null,inside=low>0&&high<0;
    const converges=Number.isFinite(taylorValue(kind,x))&&(inside||(kind==='log'&&endpoint==='right'));
    return{valid:true,radius,lower,upper,converges,position:endpoint||(inside?'inside':'outside')};
  }
  function taylor(kind,a,n,x){
    const c=coefficients(kind,a,n),f=taylorValue(kind,x),p=horner(c,x-a),domain=Number.isFinite(f),conv=convergence(kind,a,x);
    let bound=NaN;const d=Math.abs(x-a),k=n+1;
    if(c&&domain){
      if(kind==='exp')bound=Math.exp(Math.max(a,x))*d**k/factorial(k);
      else if(kind==='sin'||kind==='cos')bound=d**k/factorial(k);
      else if(kind==='log')bound=d**k/(k*Math.min(1+a,1+x)**k);
      else bound=Math.abs(((x-a)/(1-a))**k/(1-x));
    }
    return{c,f,p,error:domain&&c?Math.abs(f-p):NaN,bound,domain,...conv};
  }
  function decimal(v){
    if(!Number.isFinite(v))throw Error('Nonfinite coefficient');
    const [mantissa,e='0']=String(v).toLowerCase().split('e'),parts=mantissa.split('.');
    let integer=BigInt(parts.join('')),scale=(parts[1]||'').length-Number(e);
    if(scale<0){integer*=10n**BigInt(-scale);scale=0;}
    return{integer,scale};
  }
  function gcd(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r;}return a;}
  function compareAffine(x,a,m,b){const ds=[x,a,b].map(decimal),scale=Math.max(...ds.map(d=>d.scale)),v=ds.map(d=>d.integer*10n**BigInt(scale-d.scale)),difference=v[0]-BigInt(m)*v[1]-v[2];return difference<0n?-1:difference>0n?1:0;}
  function fraction(n,d){if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;return d===1n?String(n):`${n}/${d}`;}
  function solve(rows){
    const ds=rows.flat().map(decimal),scale=Math.max(...ds.map(d=>d.scale)),v=ds.map(d=>d.integer*10n**BigInt(scale-d.scale));
    const[a,b,c,d,e,f]=v,det=a*e-b*d,m1=a*f-c*d,m2=b*f-c*e;
    const rowTypes=rows.map(([a,b,c])=>a===0&&b===0?(c===0?'plane':'empty'):'line');
    const detNumber=Number(det)/10**(scale*2);
    if(det!==0n){const nx=c*e-b*f,ny=a*f-c*d;return{type:'unique',x:Number(nx)/Number(det),y:Number(ny)/Number(det),exactX:fraction(nx,det),exactY:fraction(ny,det),det:detNumber,rowTypes};}
    if(rowTypes.includes('empty')||m1!==0n||m2!==0n)return{type:'none',det:0,rowTypes};
    return{type:'infinite',dimension:rowTypes.every(t=>t==='plane')?2:1,det:0,rowTypes};
  }
  function kahan(values){let sum=0,c=0;for(const v of values){const y=v-c,t=sum+y;c=(t-sum)-y;sum=t;}return sum;}
  function binomial(j,n,p){
    if(!Number.isInteger(n)||n<0||n>200||p<0||p>1)throw Error('Invalid binomial parameters');
    if(p===0||n===0)return Array.from({length:n+1},(_,k)=>k===0?1:0);
    if(p===1)return Array.from({length:n+1},(_,k)=>k===n?1:0);
    // Start at the mode with jStat, then use adjacent-mass ratios. Evaluating
    // p^k separately can underflow before the binomial coefficient rescales it.
    const mass=Array(n+1).fill(0),mode=Math.min(n,Math.floor((n+1)*p));
    mass[mode]=j.binomial.pdf(mode,n,p);
    for(let k=mode;k>0;k--)mass[k-1]=mass[k]*(k/(n-k+1))*((1-p)/p);
    for(let k=mode;k<n;k++)mass[k+1]=mass[k]*((n-k)/(k+1))*(p/(1-p));
    const total=kahan(mass);
    return mass.map(v=>v/total);
  }
  function binomialInterval(mass,l,u){if(l>u)return 0;return clamp(kahan(mass.slice(Math.max(0,Math.ceil(l)),Math.max(0,Math.min(mass.length,Math.floor(u)+1)))) ,0,1);}
  function normalInterval(j,mu,sigma,l,u){
    if(!(sigma>0)||![mu,sigma,l,u].every(Number.isFinite))return NaN;
    if(l>=u)return 0;
    const a=Math.max(-39,(l-mu)/sigma),b=Math.min(39,(u-mu)/sigma);
    if(a>=b)return 0;
    // Integrate the density directly: subtracting two CDFs loses remote/narrow tails.
    // jStat's loop needs exact mesh endpoints. A dyadic mesh on [0,1] avoids
    // losing a panel through repeated floating additions; Richardson removes h^4.
    const width=b-a,n=2**Math.ceil(Math.log2(Math.max(128,width*128)));
    const f=t=>j.normal.pdf(a+width*t,0,1),coarse=j.simpson(f,0,1,n),fine=j.simpson(f,0,1,n*2);
    return clamp(width*(16*fine-coarse)/15,0,1);
  }
  return{clamp,value,quotient,generalizedLimits,derivativeFacts,taylorValue,coefficients,horner,convergence,taylor,solve,kahan,binomial,binomialInterval,normalInterval};
});
