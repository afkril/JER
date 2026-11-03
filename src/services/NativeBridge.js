// Puente con Android (Capacitor). En el navegador no hace nada.
const C=window.Capacitor,P=C&&C.Plugins;
export const isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
let last='',lk='',lt=0;
// Se lee la copia que dejó Android en la caché: primero por la URL local de Capacitor y, si falla o llega incompleta, por el plugin Filesystem.
async function toFile(o){let b=null;const why=[];
 try{const r=await fetch(C.convertFileSrc(o.path));if(!r.ok)throw new Error('HTTP '+r.status);b=await r.blob();if(o.size>0&&b.size!==o.size)throw new Error(`llegó ${b.size} de ${o.size} bytes`)}catch(e){why.push('url: '+(e.message||e));b=null}
 if(!b)try{const r=await P.Filesystem.readFile({path:'file://'+o.path});b=await (await fetch('data:application/octet-stream;base64,'+r.data)).blob()}catch(e){why.push('archivo: '+(e.message||e));throw new Error(why.join(' | '))}
 return new File([b],o.name,{type:o.mime||''})}
const b64=f=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(f)});
const toCache=async(dir,f)=>(await P.Filesystem.writeFile({path:dir+'/'+f.name.replace(/[^\w.\- ]/g,'_'),data:await b64(f),directory:'CACHE',recursive:true})).uri;
export async function initNative(openFile,hasDoc,closeDoc){
 if(!isNative)return;
 const take=async o=>{if(!o||!o.path||o.path===last)return;const key=o.name+'|'+o.size;if(key===lk&&Date.now()-lt<3000)return;last=o.path;lk=key;lt=Date.now();try{openFile(await toFile(o))}catch(e){console.error(e);alert('No se pudo abrir el archivo recibido.\n\n'+(e.message||e))}};
 P.ZanOpen.addListener('fileOpened',take);take(await P.ZanOpen.getPending());
 P.App.addListener('backButton',()=>hasDoc()?closeDoc():P.App.exitApp());
}
export async function saveFile(file){await P.Share.share({title:file.name,url:await toCache('zan_export',file),dialogTitle:'Guardar o compartir'})}
export const nativePrint=s=>P.ZanOpen.print(s?{w:s[0],h:s[1]}:{});
export async function nativePrintPdf(file,pages){const u=await toCache('zan_print',file);await P.ZanOpen.printPdf({path:decodeURIComponent(u.replace(/^file:\/\//,'')),pages})}
