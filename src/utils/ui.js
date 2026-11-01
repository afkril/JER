export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const btn=(ctx,t,fn,title)=>{const b=document.createElement('button');b.textContent=t;b.title=title||t;b.onclick=fn;ctx.tools.append(b);return b};
export const searchBtn=ctx=>btn(ctx,'Buscar',()=>{const q=prompt('Buscar texto');if(q&&!window.find(q))alert('Sin resultados')});
export function pinch(el,cb){let a=0,b=0;const d=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 el.addEventListener('touchstart',e=>{if(e.touches.length==2)a=b=d(e.touches)},{passive:true});
 el.addEventListener('touchmove',e=>{if(a&&e.touches.length==2)b=d(e.touches)},{passive:true});
 el.addEventListener('touchend',e=>{if(a&&e.touches.length<2){const r=b/a;a=0;if(Math.abs(r-1)>.05)cb(r)}});}
