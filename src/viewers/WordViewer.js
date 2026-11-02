import {btn,esc,searchBtn,pinch,toPt,pageCss} from '../utils/ui.js';
import {sniff,fail,zipCompleto,rtfTexto} from '../utils/sniff.js';
const FULL={experimental:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true};
const LITE={renderHeaders:false,renderFooters:false,renderFootnotes:false,renderEndnotes:false,breakPages:false,ignoreFonts:true};
export async function open(file,ctx){
 const {view,status}=ctx,buf=await file.arrayBuffer(),k=sniff(buf);
 if(k==='ole-enc')throw fail('El documento está protegido con contraseña (cifrado de Office). Quita la contraseña en Word y vuelve a abrirlo.');
 if(k==='ole')throw fail('Tiene extensión .docx pero es un documento Word antiguo (.doc). Ábrelo en Word y guárdalo como .docx.');
 if(k==='html'){const c=await (await import('./HtmlViewer.js')).open(file,ctx);status.textContent='Es HTML con extensión .docx · '+status.textContent;return c}
 if(k==='rtf'){view.innerHTML=`<article class="doc" style="white-space:pre-wrap">${esc(rtfTexto(new TextDecoder('latin1').decode(buf)))}</article>`;status.textContent='Es RTF con extensión .docx · se muestra solo el texto, sin formato';return}
 if(k!=='zip')throw fail('El contenido no corresponde a un documento de Word. Puede estar dañado o no ser un .docx real.',`firma desconocida (${k})`);
 if(!zipCompleto(buf))throw fail('El archivo parece incompleto (la descarga o la copia se cortó). Vuelve a descargarlo o copiarlo.','zip sin fin de directorio central');
 let host,pg,err,nivel=-1;
 for(const [i,o] of [FULL,LITE].entries()){view.innerHTML='<div class="dw"></div>';host=view.firstChild;
  try{await docx.renderAsync(buf,host,null,{className:'docx',inWrapper:true,...o});pg=[...host.querySelectorAll('section.docx')];if(!pg.length)throw new Error('sin páginas');nivel=i;break}catch(e){err=e;console.warn('docx-preview nivel '+i,e)}}
 if(nivel<0){ // último recurso: lector simplificado (texto, tablas, imágenes)
  try{const r=await mammoth.convertToHtml({arrayBuffer:buf});view.innerHTML=`<article class="doc">${r.value}</article>`;status.textContent='Vista simplificada: texto, tablas e imágenes (sin encabezados, pies de página ni diseño de hoja)';
   let z=16;const a=view.firstChild,set=v=>{z=Math.min(32,Math.max(10,v));a.style.fontSize=z+'px'};btn(ctx,'−',()=>set(z-2),'Reducir');btn(ctx,'+',()=>set(z+2),'Ampliar');searchBtn(ctx);pinch(view,()=>a,{get:()=>z,set,min:10,max:32});ctx.print={size:[612,792],css:()=>'@page{size:612pt 792pt;margin:54pt}'};return}
  catch(e2){throw fail('No se pudo leer el contenido del documento.',`visor: ${err&&err.message}; simplificado: ${e2.message}`)}}
 const wr=host.querySelector('.docx-wrapper'),pw=pg[0].offsetWidth||800,nota=nivel?' · vista reducida (no se pudieron leer encabezados, pies o estilos)':'';let z=1,cur=1;
 const pos=()=>{const t=view.getBoundingClientRect().top+view.clientHeight/3,i=pg.findIndex(p=>p.getBoundingClientRect().bottom>t);cur=i<0?pg.length:i+1;status.textContent=`Página ${cur} de ${pg.length} · ${Math.round(z*100)}%${nota}`};
 const set=v=>{z=Math.min(3,Math.max(.3,v));wr.style.zoom=z;pos()},go=n=>{cur=Math.min(pg.length,Math.max(1,n));pg[cur-1].scrollIntoView();pos()};
 btn(ctx,'Anterior',()=>go(cur-1),'Página anterior');btn(ctx,'Siguiente',()=>go(cur+1),'Página siguiente');btn(ctx,'−',()=>set(z-.1),'Reducir');btn(ctx,'+',()=>set(z+.1),'Ampliar');
 btn(ctx,'Ancho',()=>set((view.clientWidth-16)/pw),'Ajustar a ancho');btn(ctx,'Página',()=>set(Math.min((view.clientWidth-16)/pw,(view.clientHeight-16)/(pg[0].offsetHeight||1100))),'Ajustar a página');
 const dim=p=>[toPt(p.style.width)||595.3,toPt(p.style.minHeight||p.style.height)||841.9];ctx.print={size:dim(pg[0]),css:()=>pageCss(pg,dim)};
 searchBtn(ctx);view.addEventListener('scroll',pos);pinch(view,()=>host,{get:()=>z,set,min:.3,max:3});set(Math.min(1,(view.clientWidth-16)/pw));
 return()=>view.removeEventListener('scroll',pos)}
