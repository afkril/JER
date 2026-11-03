import {detect} from './services/FileDetector.js';
import {isNative,initNative,saveFile,nativePrint,nativePrintPdf} from './services/NativeBridge.js';
import {printPdfWeb} from './services/PrintService.js';
import {addRecent,listRecent,removeRecent,clearRecent} from './services/StorageService.js';
import {esc} from './utils/ui.js';
import {VERSION} from './version.js';
const $=s=>document.querySelector(s);
let ctx={view:$('#view'),tools:$('#tools'),bottom:$('#bottom'),status:$('#status'),print:null},active=null,cur=null,seq=0;
const size=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB',ext=n=>(n.split('.').pop()||'').toLowerCase().slice(0,5);
const CAT={pdf:'PDF',word:'Word',excel:'Excel',ppt:'PowerPoint',img:'Imágenes',txt:'Texto y código'};
const catOf=n=>{const e=ext(n);return e==='pdf'?'pdf':['docx','doc','rtf','odt'].includes(e)?'word':['xlsx','xlsm','xls','csv','tsv','ods'].includes(e)?'excel':['pptx','ppt','ppsx','odp'].includes(e)?'ppt':['jpg','jpeg','png','webp','svg'].includes(e)?'img':'txt'};
const COL={pdf:'#e5484d',word:'#2a7de1',excel:'#2fa36b',ppt:'#d9622b',img:'#8a5be0',txt:'#5b7fe0'};
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'ahora':m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:new Date(t).toLocaleDateString('es-CO')};
// El visor activo se descarta al instante (aunque aún esté cargando) y cada apertura recibe elementos nuevos: si una apertura lenta termina tarde, escribe en elementos ya descartados y no mezcla su barra ni su estado con el documento actual.
const swap=id=>{const o=$('#'+id),n=o.cloneNode(false);o.replaceWith(n);return n};
const reset=()=>{seq++;active?.dispose();active=null;document.getElementById('ps')?.remove();ctx={view:swap('view'),tools:swap('tools'),bottom:swap('bottom'),status:swap('status'),print:null}};
const nm=n=>esc(n).replace(/([_\-.])/g,'$1\u200b');
const chrome=o=>{for(const i of['dl','pr','cl'])$('#'+i).hidden=!o};
async function home(){reset();cur=null;chrome(false);$('#title').textContent='ZAN_READER';$('#title').title='';$('#meta').textContent='Lector de documentos';
 let L=await listRecent().catch(()=>[]),flt=localStorage.getItem('zanFlt')||'all',qry='';
 ctx.view.innerHTML=`<section class="home"><label class="drop"><b>Abrir un documento</b><small>PDF, Word (.docx, .doc), Excel (.xlsx, .xlsm, .xls, .csv), PowerPoint (.pptx), texto, código, HTML e imágenes. Todo se lee en tu dispositivo.</small><input type="file" id="file3" hidden></label>
 <div id="rec" ${L.length?'':'hidden'}><div class="rh2"><h2>Recientes</h2><button id="clr">Borrar lista</button></div><input id="q" class="fx" type="search" placeholder="Buscar en recientes" aria-label="Buscar en recientes"><div class="chips" id="chips"></div><ul class="rl" id="rl"></ul></div></section>`;
 const draw=()=>{const n={};L.forEach(r=>{const c=catOf(r.name);n[c]=(n[c]||0)+1});if(flt!=='all'&&!n[flt])flt='all';
  const q=qry.trim().toLowerCase(),rows=L.filter(r=>(flt==='all'||catOf(r.name)===flt)&&(!q||r.name.toLowerCase().includes(q)));
  $('#chips').innerHTML=[['all','Todos',L.length],...Object.entries(CAT).filter(([c])=>n[c]).map(([c,t])=>[c,t,n[c]])].map(([c,t,m])=>`<button class="chip" data-f="${c}" aria-pressed="${flt===c}">${t} <small>${m}</small></button>`).join('');
  $('#rl').innerHTML=rows.length?rows.map(r=>{const c=catOf(r.name);return`<li><button class="rc" data-id="${esc(r.id)}"><span class="bd" style="--c:${COL[c]}">${esc(ext(r.name))}</span><span class="rn"><b>${esc(r.name)}</b><small>${CAT[c]} · ${size(r.size)} · ${ago(r.t)}</small></span></button><button class="rx" data-x="${esc(r.id)}" aria-label="Quitar de recientes">×</button></li>`}).join(''):'<li class="none">No hay documentos que coincidan.</li>'};
 if(L.length){draw();$('#q').oninput=e=>{qry=e.target.value;draw()}}
 $('#file3').onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
 ctx.view.onclick=async e=>{const b=e.target.closest('.rc'),x=e.target.closest('.rx'),c=e.target.closest('.chip');
  if(b){const r=L.find(q=>q.id===b.dataset.id);if(r){const f=new File([r.buf||r.blob],r.name,{type:r.type});if(f.size)openFile(f);else{await removeRecent(r.id);alert('La copia guardada de ese documento estaba vacía y se quitó de la lista. Ábrelo de nuevo desde el almacenamiento.');home()}}}
  else if(x){await removeRecent(x.dataset.x);L=L.filter(r=>r.id!==x.dataset.x);if(L.length)draw();else home()}
  else if(c){flt=c.dataset.f;localStorage.setItem('zanFlt',flt);draw()}
  else if(e.target.id==='clr'&&confirm('¿Borrar toda la lista de recientes?')){await clearRecent();home()}}}
async function openFile(f){
 if(!f)return;reset();const my=seq,c=ctx;cur=f;const k=detect(f);$('#title').innerHTML=nm(f.name);$('#title').title=f.name;$('#meta').textContent=`.${k.ext} · ${size(f.size)}`;chrome(true);
 if(!f.size){c.view.innerHTML=`<div class="err"><b>${esc(f.name)} está vacío (0 KB)</b><p>La copia o la descarga no se completó. Vuelve a descargarlo o a enviarlo y ábrelo de nuevo.</p></div>`;return}
 if(!k.viewer){c.view.innerHTML=`<p class="err">${k.pending?`Los archivos .${k.ext} aún no tienen visor. Conviértelo a PDF o a su versión moderna y vuelve a abrirlo.`:`El formato .${k.ext} no es compatible.`}</p>`;return}
 if(f.size<4e7)addRecent(f).catch(()=>{});
 c.view.innerHTML='<p class="err">Abriendo…</p>';
 try{const M=(await import(`./viewers/${k.viewer}.js`)).default;if(my!==seq)return;const v=new M(f,c,k);active=v;await v.start()}
 catch(e){if(my!==seq||(e&&e.stale))return;console.error(e);c.view.innerHTML=`<div class="err"><b>No se pudo abrir ${esc(f.name)}</b><p>${esc(e.userMsg||'Ocurrió un error al leer el archivo.')}</p><small>Detalle técnico: ${esc(e.message||e)}</small></div>`}}
// Impresión al tamaño original: cada visor aporta su @page (ctx.print.css) y su tamaño (ctx.print.size); los PDF se imprimen tal cual.
async function doPrint(){const p=ctx.print;
 if(p&&p.pdf)return isNative?nativePrintPdf(cur,p.pages):printPdfWeb(cur);
 if(p&&p.prepare)await p.prepare(); // p. ej. la hoja de Excel dibuja todas sus filas antes de imprimir
 document.getElementById('ps')?.remove();const css=p&&p.css?p.css():'';
 if(css){const st=document.createElement('style');st.id='ps';st.textContent=css;document.head.append(st)}
 if(isNative)return nativePrint(p&&p.size);window.print()}
$('#file').onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
$('#dl').onclick=()=>{if(isNative)return saveFile(cur).catch(()=>alert('No se pudo guardar o compartir el archivo.'));const a=document.createElement('a');a.href=URL.createObjectURL(cur);a.download=cur.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
$('#pr').onclick=()=>doPrint().catch(e=>{if(!(e&&e.cancel))alert('No se pudo abrir la impresión.')});
$('#cl').onclick=home;$('#ver').textContent='v'+VERSION;
home().then(()=>initNative(openFile,()=>!!cur,()=>$('#cl').click()));
