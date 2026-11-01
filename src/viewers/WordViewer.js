import {btn,searchBtn,pinch} from '../utils/ui.js';
export async function open(file,ctx){
 const {view,status}=ctx;view.innerHTML='<div class="dw"></div>';const host=view.firstChild;
 await docx.renderAsync(await file.arrayBuffer(),host,null,{className:'docx',inWrapper:true,breakPages:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,experimental:true});
 const pg=[...host.querySelectorAll('section.docx')],wr=host.querySelector('.docx-wrapper'),pw=pg[0]?pg[0].offsetWidth:800;let z=1,cur=1;
 const pos=()=>{const t=view.getBoundingClientRect().top+view.clientHeight/3,i=pg.findIndex(p=>p.getBoundingClientRect().bottom>t);cur=i<0?pg.length:i+1;status.textContent=`Página ${cur} de ${pg.length} · ${Math.round(z*100)}%`};
 const set=v=>{z=Math.min(3,Math.max(.3,v));wr.style.zoom=z;pos()},go=n=>{cur=Math.min(pg.length,Math.max(1,n));pg[cur-1].scrollIntoView();pos()};
 btn(ctx,'Anterior',()=>go(cur-1),'Página anterior');btn(ctx,'Siguiente',()=>go(cur+1),'Página siguiente');btn(ctx,'−',()=>set(z-.1),'Reducir');btn(ctx,'+',()=>set(z+.1),'Ampliar');
 btn(ctx,'Ancho',()=>set((view.clientWidth-16)/pw),'Ajustar a ancho');btn(ctx,'Página',()=>set(Math.min((view.clientWidth-16)/pw,(view.clientHeight-16)/(pg[0]?.offsetHeight||1100))),'Ajustar a página');
 searchBtn(ctx);view.addEventListener('scroll',pos);pinch(view,()=>host,{get:()=>z,set,min:.3,max:3});set(Math.min(1,(view.clientWidth-16)/pw));
 return()=>view.removeEventListener('scroll',pos)}
