import {btn,pinch} from '../utils/ui.js';
import {Viewer} from '../core/Viewer.js';
import {lib} from '../core/Loader.js';
export default class PdfViewer extends Viewer{
 async init(){
  const{view,tools,status}=this,ctx=this.ctx,pdfjsLib=await lib('pdf');this.alive();pdfjsLib.GlobalWorkerOptions.workerSrc='src/vendor/pdf.worker.min.js';
  const data=await this.file.arrayBuffer();this.alive();const doc=await pdfjsLib.getDocument({data}).promise;
  this.onDispose(()=>doc.destroy());this.alive();
  const pdf=doc,N=pdf.numPages,p1=await this.guard(pdf.getPage(1));
  let scale=1,rot=0,cur=1,paged=false,mark=null,lock=false;const Q=1.5;view.innerHTML='<div class="pages"></div>';const box=view.firstChild;
  const io=this.observe(IntersectionObserver,es=>es.forEach(e=>{if(e.isIntersecting&&!e.target.done)draw(e.target)}),{root:view,rootMargin:'500px'});
  // El lienzo se limita a ~12 millones de píxeles: con zoom alto un lienzo mayor sale en blanco o falla en el teléfono.
  const self=this;
  async function draw(c){c.done=1;try{const p=await pdf.getPage(+c.dataset.n);if(self.disposed||!c.isConnected)return;const b=p.getViewport({scale:1,rotation:rot}),rs=Math.min(scale*Q,Math.sqrt(12e6/(b.width*b.height))),vp=p.getViewport({scale:rs,rotation:rot});
   c.width=vp.width;c.height=vp.height;c.style.width=b.width*scale+'px';c.style.height=b.height*scale+'px';await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}catch(e){if(!self.disposed)console.warn('pdf',e)}}
  const inp=document.createElement('input');inp.type='number';inp.min=1;inp.max=N;inp.className='pg';inp.title='Ir a la página';inp.onchange=()=>go(+inp.value);
  const ui=()=>{inp.value=cur;status.textContent=`Página ${cur} de ${N} · ${Math.round(scale*100)}% · ${paged?'modo página':'modo continuo'}`;mark?.classList.remove('cur');mark=dr.children[cur-1];mark?.classList.add('cur')};
  // Tras pulsar Anterior/Siguiente la página actual queda fijada (lock) hasta que la persona vuelve a desplazar; así el botón avanza siempre una página.
  const pos=()=>{if(!paged&&!lock){const cs=[...box.children],i=cs.findIndex(c=>c.offsetTop+c.offsetHeight>view.scrollTop+view.clientHeight/3);cur=i<0?N:i+1}ui()};
  function build(){const v=p1.getViewport({scale,rotation:rot});box.innerHTML='';io.disconnect();
   for(const n of paged?[cur]:Array.from({length:N},(_,i)=>i+1)){const c=document.createElement('canvas');c.dataset.n=n;c.style.width=v.width+'px';c.style.height=v.height+'px';box.append(c);paged?draw(c):io.observe(c)}ui()}
  const show=()=>{lock=true;if(paged)view.scrollTop=0;else box.children[cur-1]?.scrollIntoView()};
  function go(n){cur=Math.min(N,Math.max(1,Math.round(n)||1));if(paged){build();view.scrollTop=0;view.scrollLeft=0}else{lock=true;box.children[cur-1].scrollIntoView();ui()}}
  const fw=()=>(view.clientWidth-24)/p1.getViewport({scale:1,rotation:rot}).width;
  const set=s=>{lock=false;const f=view.scrollTop/(view.scrollHeight||1);scale=Math.min(4,Math.max(.3,s));build();view.scrollTop=f*view.scrollHeight;pos()};
  const dr=document.createElement('aside');dr.className='drawer';this.own(dr);
  const tio=this.observe(IntersectionObserver,es=>es.forEach(async e=>{const c=e.target;if(!e.isIntersecting||c.done)return;c.done=1;try{const p=await pdf.getPage(+c.dataset.n);if(self.disposed)return;const vp=p.getViewport({scale:.25,rotation:rot});c.width=vp.width;c.height=vp.height;await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}catch(e){}}),{root:dr});
  const v1=p1.getViewport({scale:1,rotation:rot});
  for(let n=1;n<=N;n++){const c=document.createElement('canvas');c.dataset.n=n;c.style.aspectRatio=v1.width+'/'+v1.height;c.title='Página '+n;c.onclick=()=>{go(n);dr.classList.remove('on')};dr.append(c);tio.observe(c)}
  btn(ctx,'Anterior',()=>go(cur-1),'Página anterior');tools.append(inp);btn(ctx,'Siguiente',()=>go(cur+1),'Página siguiente');
  btn(ctx,'Miniaturas',()=>dr.classList.toggle('on'));
  const mb=btn(ctx,'Modo página',()=>{paged=!paged;mb.lastChild.textContent=paged?'Modo continuo':'Modo página';build();show()},'Cambiar entre desplazamiento continuo y una página a la vez');
  btn(ctx,'−',()=>set(scale-.2),'Reducir');btn(ctx,'+',()=>set(scale+.2),'Ampliar');
  btn(ctx,'Ancho',()=>set(fw()),'Ajustar a ancho');btn(ctx,'Página',()=>set(Math.min(fw(),(view.clientHeight-24)/v1.height)),'Ajustar a página');
  btn(ctx,'Girar',()=>{rot=(rot+90)%360;build();show()});
  let x0,y0,top0,end0;const unlock=()=>{lock=false};
  const ts=e=>{if(e.touches.length!=1){y0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY;top0=view.scrollTop<=4;end0=view.scrollTop+view.clientHeight>=view.scrollHeight-4};
  const te=e=>{if(y0==null||!paged)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;y0=null;
   if(dy<-70&&end0)go(cur+1);else if(dy>70&&top0)go(cur-1);else if(Math.abs(dx)>90&&Math.abs(dy)<50&&view.scrollWidth<=view.clientWidth+4)go(cur+(dx<0?1:-1))};
  const key=e=>{if(e.target.tagName==='INPUT')return;lock=false;if(!paged)return;if(['ArrowRight','PageDown'].includes(e.key))go(cur+1);if(['ArrowLeft','PageUp'].includes(e.key))go(cur-1)};
  this.on(view,'touchstart',ts,{passive:true});this.on(view,'touchend',te);this.on(document,'keydown',key);this.on(view,'scroll',pos);
  for(const ev of['touchstart','wheel','mousedown'])this.on(view,ev,unlock,{passive:true});
  ctx.print={pdf:true,pages:N};
  pinch(view,()=>box,{get:()=>scale,set,min:.3,max:4});set(Math.min(fw(),1.2))}
}
