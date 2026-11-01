import {btn,pinch} from '../utils/ui.js';
export async function open(file,ctx){
 const {view,tools,status}=ctx;pdfjsLib.GlobalWorkerOptions.workerSrc='src/vendor/pdf.worker.min.js';
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,N=pdf.numPages,p1=await pdf.getPage(1);
 let scale=1,rot=0,cur=1,paged=false,mark=null;const Q=1.5;view.innerHTML='<div class="pages"></div>';const box=view.firstChild;
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!e.target.done)draw(e.target)}),{root:view,rootMargin:'500px'});
 async function draw(c){c.done=1;const p=await pdf.getPage(+c.dataset.n);if(!c.isConnected)return;const vp=p.getViewport({scale:scale*Q,rotation:rot});
  c.width=vp.width;c.height=vp.height;c.style.width=vp.width/Q+'px';c.style.height=vp.height/Q+'px';await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
 const inp=document.createElement('input');inp.type='number';inp.min=1;inp.max=N;inp.className='pg';inp.title='Ir a la página';inp.onchange=()=>go(+inp.value);
 function build(){const v=p1.getViewport({scale,rotation:rot});box.innerHTML='';io.disconnect();
  for(const n of paged?[cur]:Array.from({length:N},(_,i)=>i+1)){const c=document.createElement('canvas');c.dataset.n=n;c.style.width=v.width+'px';c.style.height=v.height+'px';box.append(c);io.observe(c)}
  if(!paged&&cur>1)box.children[cur-1].scrollIntoView();pos()}
 function pos(){if(!paged){const cs=[...box.children],i=cs.findIndex(c=>c.offsetTop+c.offsetHeight>view.scrollTop+view.clientHeight/3);cur=i<0?N:i+1}
  inp.value=cur;status.textContent=`Página ${cur} de ${N} · ${Math.round(scale*100)}% · ${paged?'modo página':'modo continuo'}`;
  mark?.classList.remove('cur');mark=dr.children[cur-1];mark?.classList.add('cur')}
 function go(n){cur=Math.min(N,Math.max(1,Math.round(n)||1));if(paged){build();view.scrollTop=0}else{box.children[cur-1].scrollIntoView();pos()}}
 const fw=()=>(view.clientWidth-24)/p1.getViewport({scale:1,rotation:rot}).width,set=s=>{scale=Math.min(4,Math.max(.3,s));build()};
 const dr=document.createElement('aside');dr.className='drawer';document.body.append(dr);
 const tio=new IntersectionObserver(es=>es.forEach(async e=>{const c=e.target;if(!e.isIntersecting||c.done)return;c.done=1;const p=await pdf.getPage(+c.dataset.n),vp=p.getViewport({scale:.25,rotation:rot});c.width=vp.width;c.height=vp.height;await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}),{root:dr});
 const v1=p1.getViewport({scale:1,rotation:rot});
 for(let n=1;n<=N;n++){const c=document.createElement('canvas');c.dataset.n=n;c.style.aspectRatio=v1.width+'/'+v1.height;c.title='Página '+n;c.onclick=()=>{go(n);dr.classList.remove('on')};dr.append(c);tio.observe(c)}
 btn(ctx,'Anterior',()=>go(cur-1),'Página anterior');tools.append(inp);btn(ctx,'Siguiente',()=>go(cur+1),'Página siguiente');
 btn(ctx,'Miniaturas',()=>dr.classList.toggle('on'));
 const mb=btn(ctx,'Modo página',()=>{paged=!paged;mb.textContent=paged?'Modo continuo':'Modo página';build()},'Cambiar entre desplazamiento continuo y una página a la vez');
 btn(ctx,'−',()=>set(scale-.2),'Reducir');btn(ctx,'+',()=>set(scale+.2),'Ampliar');
 btn(ctx,'Ancho',()=>set(fw()),'Ajustar a ancho');btn(ctx,'Página',()=>set(Math.min(fw(),(view.clientHeight-24)/v1.height)),'Ajustar a página');
 btn(ctx,'Girar',()=>{rot=(rot+90)%360;build()});
 let x0,y0,top0,end0;
 const ts=e=>{if(e.touches.length!=1){y0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY;top0=view.scrollTop<=4;end0=view.scrollTop+view.clientHeight>=view.scrollHeight-4};
 const te=e=>{if(y0==null||!paged)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;y0=null;
  if(dy<-70&&end0)go(cur+1);else if(dy>70&&top0)go(cur-1);else if(Math.abs(dx)>90&&Math.abs(dy)<50&&view.scrollWidth<=view.clientWidth+4)go(cur+(dx<0?1:-1))};
 const key=e=>{if(!paged||e.target.tagName==='INPUT')return;if(['ArrowRight','PageDown'].includes(e.key))go(cur+1);if(['ArrowLeft','PageUp'].includes(e.key))go(cur-1)};
 view.addEventListener('touchstart',ts,{passive:true});view.addEventListener('touchend',te);document.addEventListener('keydown',key);view.addEventListener('scroll',pos);
 pinch(view,r=>set(scale*r));set(Math.min(fw(),1.2));
 return()=>{io.disconnect();tio.disconnect();dr.remove();document.removeEventListener('keydown',key);view.removeEventListener('scroll',pos);view.removeEventListener('touchstart',ts);view.removeEventListener('touchend',te);pdf.destroy()}}
