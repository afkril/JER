import {detect} from './services/FileDetector.js';
import {isNative,initNative,saveFile,nativePrint} from './services/NativeBridge.js';
import {addRecent,listRecent,removeRecent,clearRecent} from './services/StorageService.js';
import {esc} from './utils/ui.js';
const $=s=>document.querySelector(s),ctx={view:$('#view'),tools:$('#tools'),bottom:$('#bottom'),status:$('#status')};
let clean=null,cur=null;
const size=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB',ext=n=>(n.split('.').pop()||'').toLowerCase().slice(0,5);
const COL={pdf:'#e5484d',docx:'#2a7de1',xlsx:'#2fa36b',xlsm:'#2fa36b',xls:'#2fa36b',csv:'#2fa36b',html:'#e08a2b',png:'#8a5be0',jpg:'#8a5be0',jpeg:'#8a5be0',webp:'#8a5be0',svg:'#8a5be0'};
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'ahora':m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:new Date(t).toLocaleDateString('es-CO')};
const reset=()=>{clean?.();clean=null;ctx.view.onclick=null;ctx.tools.innerHTML=ctx.bottom.innerHTML='';ctx.status.textContent=''};
const chrome=o=>{for(const i of['dl','pr','cl'])$('#'+i).hidden=!o};
async function home(){reset();cur=null;chrome(false);$('#title').textContent='ZAN_READER';$('#title').title='';$('#meta').textContent='Lector de documentos';
 const l=await listRecent().catch(()=>[]);
 ctx.view.innerHTML=`<section class="home"><label class="drop"><b>Abrir un documento</b><small>PDF, Word, Excel (.xlsx, .xlsm), texto, código, HTML e imágenes. Todo se lee en tu dispositivo.</small><input type="file" id="file3" hidden></label>${l.length?`<div class="rh2"><h2>Recientes</h2><button id="clr">Borrar lista</button></div><ul class="rl">${l.map(r=>`<li><button class="rc" data-id="${esc(r.id)}"><span class="bd" style="--c:${COL[ext(r.name)]||'#5b7fe0'}">${esc(ext(r.name))}</span><span class="rn"><b>${esc(r.name)}</b><small>${size(r.size)} · ${ago(r.t)}</small></span></button><button class="rx" data-x="${esc(r.id)}" aria-label="Quitar de recientes">×</button></li>`).join('')}</ul>`:''}</section>`;
 $('#file3').onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
 ctx.view.onclick=async e=>{const b=e.target.closest('.rc'),x=e.target.closest('.rx');
  if(b){const r=(await listRecent()).find(q=>q.id===b.dataset.id);if(r)openFile(new File([r.blob],r.name,{type:r.type}),1)}
  else if(x){await removeRecent(x.dataset.x);home()}else if(e.target.id==='clr'){await clearRecent();home()}}}
async function openFile(f,again){
 if(!f)return;reset();cur=f;const k=detect(f);$('#title').textContent=f.name;$('#title').title=f.name;$('#meta').textContent=`.${k.ext} · ${size(f.size)}`;chrome(true);
 if(!k.viewer){ctx.view.innerHTML=`<p class="err">${k.pending?`Los archivos .${k.ext} aún no tienen visor. Conviértelo a PDF o a su versión moderna y vuelve a abrirlo.`:`El formato .${k.ext} no es compatible.`}</p>`;return}
 if(f.size<6e7)addRecent(f).catch(()=>{});
 ctx.view.innerHTML='<p class="err">Abriendo…</p>';
 try{clean=await (await import(`./viewers/${k.viewer}.js`)).open(f,ctx,k)}
 catch(e){console.error(e);ctx.view.innerHTML=`<p class="err">No se pudo abrir ${esc(f.name)}. Puede estar dañado o protegido con contraseña.</p>`}}
$('#file').onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
$('#dl').onclick=()=>{if(isNative)return saveFile(cur).catch(()=>alert('No se pudo guardar o compartir el archivo.'));const a=document.createElement('a');a.href=URL.createObjectURL(cur);a.download=cur.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
$('#pr').onclick=()=>isNative?nativePrint().catch(()=>alert('No se pudo abrir la impresión.')):window.print();
$('#cl').onclick=home;
home().then(()=>initNative(openFile,()=>!!cur,()=>$('#cl').click()));
