import {btn,esc,searchBtn,pinch,toPt,pageCss} from '../utils/ui.js';
import {sniff,fail,zipCompleto,rtfTexto} from '../utils/sniff.js';
import {Viewer,Rpc} from '../core/Viewer.js';
import {lib} from '../core/Loader.js';
const FULL={experimental:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true};
const LITE={renderHeaders:false,renderFooters:false,renderFootnotes:false,renderEndnotes:false,breakPages:false,ignoreFonts:true};
const JC=['left','center','right','justify'];
const frame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r)));
// Word: .docx (docx-preview), .doc antiguo (lector propio en Worker), RTF y HTML con extensión de Word.
export default class WordViewer extends Viewer{
 async init(){
  const{view,status}=this,ext=this.kind.ext||'docx',buf=await this.file.arrayBuffer();this.alive();const k=sniff(buf);
  if(k==='ole-enc')throw fail('El documento está protegido con contraseña (cifrado de Office). Quita la contraseña en Word y vuelve a abrirlo.');
  if(k==='ole')return this.openDoc(buf);
  if(k==='html'){await this.delegate('./HtmlViewer.js');status.textContent=`Es HTML con extensión .${ext} · `+status.textContent;return}
  if(k==='rtf'){this.simple(`<p>${esc(rtfTexto(new TextDecoder('latin1').decode(buf))).replace(/\n/g,'<br>')}</p>`,`Es RTF (.${ext}) · se muestra solo el texto, sin formato`,true);return}
  if(k!=='zip')throw fail('El contenido no corresponde a un documento de Word. Puede estar dañado o no ser un documento real.',`firma desconocida (${k})`);
  if(!zipCompleto(buf))throw fail('El archivo parece incompleto (la descarga o la copia se cortó). Vuelve a descargarlo o copiarlo.','zip sin fin de directorio central');
  return this.openDocx(buf)}
 // Vista simple de texto: la usan .doc, RTF y el respaldo de .docx.
 simple(html,note,pre){const{view,status}=this;view.innerHTML=`<article class="doc${pre?' dd':''}">${html}</article>`;status.textContent=note;
  let z=16;const a=view.firstChild,set=v=>{z=Math.min(32,Math.max(10,v));a.style.fontSize=z+'px'};
  btn(this.ctx,'−',()=>set(z-2),'Reducir');btn(this.ctx,'+',()=>set(z+2),'Ampliar');searchBtn(this.ctx);pinch(view,()=>a,{get:()=>z,set,min:10,max:32});
  this.ctx.print={size:[612,792],css:()=>'@page{size:612pt 792pt;margin:54pt}'}}
 // ---- .doc (Word 97-2003) ----
 async openDoc(buf){this.status.textContent='Procesando documento…';
  let r;try{r=await new Rpc(this,'src/workers/word.worker.js').call('doc',[buf],[buf])}catch(e){if(e.stale||e.userMsg)throw e;throw fail('No se pudo leer este documento de Word antiguo. Puede estar dañado.',e.message)}
  this.alive();const im=r.images.map(i=>this.url(new Blob([i.bytes],{type:i.mime})));
  const run=x=>{if(x.img!==undefined)return`<img src="${im[x.img]}" alt="">`;let t=esc(x.s).replace(/\n/g,'<br>');if(x.b)t=`<b>${t}</b>`;if(x.i)t=`<i>${t}</i>`;if(x.u)t=`<u>${t}</u>`;return t},
   para=p=>`<p${p.jc?` style="text-align:${JC[p.jc]||'left'}"`:''}>${p.runs.map(run).join('')||'<br>'}</p>`;
  const html=r.blocks.map(b=>b.k==='pb'?'<hr class="pb">':b.k==='t'?`<table>${b.rows.map(w=>`<tr>${w.map(c=>`<td>${c.map(para).join('')||'&nbsp;'}</td>`).join('')}</tr>`).join('')}</table>`:para(b)).join('');
  if(!html)throw fail('El documento no tiene texto que mostrar.');
  this.simple(html,`Documento Word antiguo (.doc) · texto, tablas e imágenes; sin encabezados, pies de página ni diseño de hoja`,true)}
 // ---- .docx ----
 async openDocx(buf){const{view,status}=this;status.textContent='Procesando documento…';await lib('docx');this.alive();await frame();this.alive();
  let host,pg,err,nivel=-1;
  for(const[i,o]of[FULL,LITE].entries()){view.innerHTML='<div class="dw"></div>';host=view.firstChild;
   try{await docx.renderAsync(buf,host,null,{className:'docx',inWrapper:true,...o});this.alive();pg=[...host.querySelectorAll('section.docx')];if(!pg.length)throw new Error('sin páginas');nivel=i;break}
   catch(e){if(e.stale)throw e;err=e;console.warn('docx-preview nivel '+i,e)}}
  if(nivel<0){ // último recurso: conversión simplificada (texto, tablas, imágenes), también en el Worker
   try{const h=await new Rpc(this,'src/workers/word.worker.js').call('mammoth',[buf],[buf]);this.alive();
    return this.simple(h,'Vista simplificada: texto, tablas e imágenes (sin encabezados, pies de página ni diseño de hoja)')}
   catch(e2){if(e2.stale)throw e2;throw fail('No se pudo leer el contenido del documento.',`visor: ${err&&err.message}; simplificado: ${e2.message}`)}}
  const wr=host.querySelector('.docx-wrapper'),pw=pg[0].offsetWidth||800,nota=nivel?' · vista reducida (no se pudieron leer encabezados, pies o estilos)':'';let z=1,cur=1;
  // Documentos largos: las páginas fuera de pantalla no se pintan ni se recalculan (content-visibility), con su alto ya medido.
  if(pg.length>8){const hs=pg.map(p=>p.offsetHeight);pg.forEach((p,i)=>{p.style.containIntrinsicSize='auto '+hs[i]+'px'});host.classList.add('cv')}
  const pos=()=>{const t=view.getBoundingClientRect().top+view.clientHeight/3,i=pg.findIndex(p=>p.getBoundingClientRect().bottom>t);cur=i<0?pg.length:i+1;status.textContent=`Página ${cur} de ${pg.length} · ${Math.round(z*100)}%${nota}`};
  const set=v=>{z=Math.min(3,Math.max(.3,v));wr.style.zoom=z;pos()},go=n=>{cur=Math.min(pg.length,Math.max(1,n));pg[cur-1].scrollIntoView();pos()};
  btn(this.ctx,'Anterior',()=>go(cur-1),'Página anterior');btn(this.ctx,'Siguiente',()=>go(cur+1),'Página siguiente');btn(this.ctx,'−',()=>set(z-.1),'Reducir');btn(this.ctx,'+',()=>set(z+.1),'Ampliar');
  btn(this.ctx,'Ancho',()=>set((view.clientWidth-16)/pw),'Ajustar a ancho');btn(this.ctx,'Página',()=>set(Math.min((view.clientWidth-16)/pw,(view.clientHeight-16)/(pg[0].offsetHeight||1100))),'Ajustar a página');
  const dim=p=>[toPt(p.style.width)||595.3,toPt(p.style.minHeight||p.style.height)||841.9];this.ctx.print={size:dim(pg[0]),css:()=>pageCss(pg,dim)};
  searchBtn(this.ctx);this.on(view,'scroll',pos);pinch(view,()=>host,{get:()=>z,set,min:.3,max:3});set(Math.min(1,(view.clientWidth-16)/pw))}
}
