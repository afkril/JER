import {btn,esc,pinch,toPt} from '../utils/ui.js';
import {sniff,fail,zipCompleto} from '../utils/sniff.js';
import {Viewer} from '../core/Viewer.js';
import {lib} from '../core/Loader.js';
const W=960;
export default class PptxViewer extends Viewer{
 async init(){
  const{view,status}=this,ctx=this.ctx,buf=await this.file.arrayBuffer();this.alive();const k=sniff(buf);
  if(k==='ole-enc')throw fail('La presentación está protegida con contraseña (cifrado de Office). Quita la contraseña en PowerPoint y vuelve a abrirla.');
  if(k==='ole')throw fail('Es una presentación antigua (.ppt). Ábrela en PowerPoint y guárdala como .pptx para verla aquí.');
  if(k!=='zip')throw fail('El contenido no corresponde a una presentación de PowerPoint. Puede estar dañado o no ser un .pptx real.',`firma desconocida (${k})`);
  if(!zipCompleto(buf))throw fail('El archivo parece incompleto (la descarga o la copia se cortó). Vuelve a descargarlo o copiarlo.','zip sin fin de directorio central');
  status.textContent='Procesando presentación…';
  const pptxPreview=await lib('pptx');this.alive();
  view.innerHTML='<div class="pv"></div>';const host=view.firstChild;let sl=[],err;
  try{const pv=pptxPreview.init(host,{width:W,mode:'list'});await Promise.race([pv.preview(buf.slice(0)),new Promise((_,j)=>this.timer(()=>j(new Error('tiempo de espera agotado')),30000))]);this.alive();
   sl=[...host.querySelectorAll('.pptx-preview-slide-wrapper')];if(!sl.length)throw new Error('sin diapositivas')}catch(e){if(e.stale)throw e;err=e;console.warn('pptx-preview',e)}
  if(err){let t;try{await lib('jszip');this.alive();const{slidesText}=await import('../utils/pptxText.js');t=await slidesText(buf)}catch(e2){if(e2.stale)throw e2;throw fail('No se pudo leer la presentación.',`visor: ${err.message}; texto: ${e2.message}`)}
   this.alive();if(!t.length)throw fail('No se pudo leer la presentación.',`visor: ${err.message}`);
   view.innerHTML=t.map((s,i)=>`<section class="doc"><h3>Diapositiva ${i+1}</h3>${s.map(x=>`<p>${esc(x)}</p>`).join('')||'<p><i>(sin texto)</i></p>'}</section>`).join('');
   status.textContent=`Vista de texto · ${t.length} diapositivas (no se pudo dibujar el diseño)`;ctx.print={size:[612,792],css:()=>'@page{size:612pt 792pt;margin:50pt}'};return}
  const wr=host.querySelector('.pptx-preview-wrapper');let z=1,cur=1,pi=0,pres=false,lock=false,sw=0,sx=0;
  const unlock=()=>{lock=false},pos=()=>{if(lock||pres)return;const t=view.getBoundingClientRect().top+view.clientHeight/3,i=sl.findIndex(s=>s.getBoundingClientRect().bottom>t);cur=i<0?sl.length:i+1;ui()};
  const ui=()=>{status.textContent=`Diapositiva ${cur} de ${sl.length} · ${Math.round(z*100)}%`};
  const set=v=>{z=Math.min(3,Math.max(.2,v));wr.style.zoom=z;lock=false;pos();ui()},go=n=>{cur=Math.min(sl.length,Math.max(1,n));lock=true;sl[cur-1].scrollIntoView();ui()};
  const showP=i=>{pi=Math.min(sl.length-1,Math.max(0,i));sl.forEach((s,j)=>{s.style.display=j===pi?'block':'none'});const s=sl[pi];s.style.transform=`scale(${Math.min(innerWidth/s.offsetWidth,innerHeight/s.offsetHeight)})`;status.textContent=`Presentación ${pi+1} de ${sl.length}`};
  const exit=()=>{pres=false;host.classList.remove('pres');host.querySelector('.pres-x')?.remove();sl.forEach(s=>{s.style.display='';s.style.transform=''});cur=pi+1;go(cur)};
  const enter=()=>{pres=true;host.classList.add('pres');const x=document.createElement('button');x.className='pres-x';x.textContent='✕';x.setAttribute('aria-label','Salir de la presentación');x.onclick=exit;host.append(x);showP(cur-1)};
  this.on(host,'click',e=>{if(pres&&!e.target.closest('.pres-x')&&Date.now()-sw>400)showP(pi+(e.clientX>innerWidth/2?1:-1))});
  this.on(host,'touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
  this.on(host,'touchend',e=>{if(!pres)return;const d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50){sw=Date.now();showP(pi+(d<0?1:-1))}});
  const key=e=>{if(!pres)return;if(['ArrowRight','PageDown',' '].includes(e.key))showP(pi+1);else if(['ArrowLeft','PageUp'].includes(e.key))showP(pi-1);else if(e.key==='Escape')exit()};
  this.on(document,'keydown',key);this.on(view,'scroll',pos);for(const ev of['touchstart','wheel'])this.on(view,ev,unlock,{passive:true});
  btn(ctx,'Anterior',()=>go(cur-1),'Diapositiva anterior');btn(ctx,'Siguiente',()=>go(cur+1),'Diapositiva siguiente');btn(ctx,'−',()=>set(z-.1),'Reducir');btn(ctx,'+',()=>set(z+.1),'Ampliar');
  btn(ctx,'Ancho',()=>set((view.clientWidth-16)/W),'Ajustar a ancho');btn(ctx,'Presentación',enter,'Modo presentación');
  pinch(view,()=>host,{get:()=>z,set,min:.2,max:3});
  ctx.print={css:()=>{const s=sl[0],w=toPt(s.style.width)||720,h=toPt(s.style.height)||405;ctx.print.size=[w,h];return`@page{size:${w.toFixed(1)}pt ${h.toFixed(1)}pt;margin:0}.pv .pptx-preview-wrapper{zoom:1!important}.pv .pptx-preview-slide-wrapper{margin:0!important;box-shadow:none!important;break-after:page}`}};
  set(Math.min(1,(view.clientWidth-16)/W))}
}
