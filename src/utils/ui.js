export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P={minus:'M5 12h14',plus:'M12 5v14M5 12h14',prev:'M6 15l6-6 6 6',next:'M6 9l6 6 6-6',rot:'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',copy:'M9 9h11v11H9zM5 15V4h11',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',fw:'M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3',fp:'M7 3h10v18H7z'};
const MAP={'−':['minus',1],'+':['plus',1],'Anterior':['prev',1],'Siguiente':['next',1],'Girar':['rot'],'Buscar':['search'],'Copiar':['copy'],'Miniaturas':['grid'],'Ancho':['fw'],'Página':['fp'],'Modo página':['fp']};
export const icon=n=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
export const btn=(ctx,t,fn,title,raw)=>{const b=document.createElement('button'),m=!raw&&MAP[t];
 b.innerHTML=m?icon(m[0])+(m[1]?'':`<span>${esc(t)}</span>`):`<span>${esc(t)}</span>`;b.title=title||t;b.setAttribute('aria-label',title||t);b.onclick=fn;ctx.tools.append(b);return b};
export const searchBtn=ctx=>btn(ctx,'Buscar',()=>{const q=prompt('Buscar texto');if(q&&!window.find(q))alert('Sin resultados')});
// Pellizco fluido: durante el gesto se escala con transform (rápido); al soltar se aplica el zoom real y se conserva el punto bajo los dedos.
export function pinch(view,box,o){let d0=0,z0=1,r=1,mx=0,my=0;const T=e=>e.touches,dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 view.addEventListener('touchstart',e=>{const t=T(e),b=box();if(t.length==2&&b){d0=dist(t);z0=o.get();r=1;mx=(t[0].clientX+t[1].clientX)/2;my=(t[0].clientY+t[1].clientY)/2;const q=b.getBoundingClientRect();b.style.transformOrigin=`${mx-q.left}px ${my-q.top}px`;b.style.willChange='transform'}else d0=0},{passive:true});
 view.addEventListener('touchmove',e=>{if(d0&&T(e).length==2){e.preventDefault();r=Math.min(o.max,Math.max(o.min,z0*dist(T(e))/d0))/z0;box().style.transform=`scale(${r})`}},{passive:false});
 const end=e=>{if(!d0||T(e).length>=2)return;d0=0;const b=box();if(b){b.style.transform='';b.style.willChange='';b.style.transformOrigin=''}
  if(Math.abs(r-1)<.02)return;const v=view.getBoundingClientRect(),cx=mx-v.left,cy=my-v.top,sl=view.scrollLeft,st=view.scrollTop;
  o.set(z0*r);view.scrollLeft=(sl+cx)*r-cx;view.scrollTop=(st+cy)*r-cy};
 view.addEventListener('touchend',end);view.addEventListener('touchcancel',end)}
// Impresión: medidas a puntos (1 pt = 1/72 pulg) y una página con nombre por cada tamaño distinto.
export const toPt=v=>{const n=parseFloat(v);return n>0?(/px$/.test(v)?n*.75:/mm$/.test(v)?n*2.8346:/cm$/.test(v)?n*28.346:/in$/.test(v)?n*72:n):0};
export function pageCss(els,size){const m=new Map();let css='';els.forEach(el=>{const[w,h]=size(el),k=Math.round(w)+'x'+Math.round(h);if(!m.has(k)){m.set(k,'zp'+m.size);css+=`@page ${m.get(k)}{size:${w.toFixed(1)}pt ${h.toFixed(1)}pt;margin:0}`}el.style.setProperty('page',m.get(k))});return css}
