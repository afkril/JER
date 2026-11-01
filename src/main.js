import {isNative,initNative,saveFile,nativePrint} from './services/NativeBridge.js';
import {detect} from './services/FileDetector.js';
const $=s=>document.querySelector(s),ctx={view:$('#view'),tools:$('#tools'),status:$('#status')};
let clean=null,cur=null;
const size=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
async function openFile(f){
 if(!f)return;clean?.();clean=null;cur=f;ctx.tools.innerHTML='';ctx.status.textContent='';
 const k=detect(f);$('#title').textContent=f.name;$('#meta').textContent=`.${k.ext} · ${size(f.size)}`;
 for(const i of['dl','pr','cl'])$('#'+i).hidden=false;
 if(!k.viewer){ctx.view.innerHTML=`<p class="err">${k.pending?`Los archivos .${k.ext} aún no tienen visor. Conviértelo a PDF o a su versión moderna y vuelve a abrirlo.`:`El formato .${k.ext} no es compatible.`}</p>`;return}
 ctx.view.innerHTML='<p class="err">Abriendo…</p>';
 try{clean=await (await import(`./viewers/${k.viewer}.js`)).open(f,ctx,k)}
 catch(e){console.error(e);ctx.view.innerHTML=`<p class="err">No se pudo abrir ${f.name}. Puede estar dañado o protegido con contraseña.</p>`}}
for(const i of['#file','#file2'])$(i).onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
$('#dl').onclick=()=>{if(isNative)return saveFile(cur).catch(()=>alert('No se pudo guardar o compartir el archivo.'));const a=document.createElement('a');a.href=URL.createObjectURL(cur);a.download=cur.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
$('#pr').onclick=()=>isNative?nativePrint().catch(()=>alert('No se pudo abrir la impresión.')):window.print();
$('#cl').onclick=()=>{clean?.();clean=cur=null;ctx.tools.innerHTML='';ctx.status.textContent='';$('#title').textContent='ZAN_READER';$('#meta').textContent='';for(const i of['dl','pr','cl'])$('#'+i).hidden=true;
 ctx.view.innerHTML='<label id="empty">Toca para abrir un documento<small>PDF, Word, Excel, texto, código, HTML e imágenes.</small><input type="file" id="file3" hidden></label>';$('#file3').onchange=e=>openFile(e.target.files[0])};

initNative(openFile,()=>!!cur,()=>$('#cl').click());
