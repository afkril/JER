// Puente con Android (Capacitor). En el navegador no hace nada.
const C=window.Capacitor,P=C&&C.Plugins;
export const isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
let last='';
async function toFile(o){const r=await fetch(C.convertFileSrc(o.path));return new File([await r.blob()],o.name,{type:o.mime||''})}
const b64=f=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(f)});
const toCache=async(dir,f)=>(await P.Filesystem.writeFile({path:dir+'/'+f.name.replace(/[^\w.\- ]/g,'_'),data:await b64(f),directory:'CACHE',recursive:true})).uri;
export async function initNative(openFile,hasDoc,closeDoc){
 if(!isNative)return;
 const take=async o=>{if(!o||!o.path||o.path===last)return;last=o.path;try{openFile(await toFile(o))}catch(e){alert('No se pudo abrir el archivo recibido.')}};
 P.ZanOpen.addListener('fileOpened',take);take(await P.ZanOpen.getPending());
 P.App.addListener('backButton',()=>hasDoc()?closeDoc():P.App.exitApp());
}
export async function saveFile(file){await P.Share.share({title:file.name,url:await toCache('zan_export',file),dialogTitle:'Guardar o compartir'})}
export const nativePrint=s=>P.ZanOpen.print(s?{w:s[0],h:s[1]}:{});
export async function nativePrintPdf(file,pages){const u=await toCache('zan_print',file);await P.ZanOpen.printPdf({path:decodeURIComponent(u.replace(/^file:\/\//,'')),pages})}
