// Puente con Android (Capacitor). En el navegador no hace nada.
const C=window.Capacitor,P=C&&C.Plugins;
export const isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
let last='';
async function toFile(o){const r=await fetch(C.convertFileSrc(o.path));return new File([await r.blob()],o.name,{type:o.mime||''})}
export async function initNative(openFile,hasDoc,closeDoc){
 if(!isNative)return;
 const take=async o=>{if(!o||!o.path||o.path===last)return;last=o.path;try{openFile(await toFile(o))}catch(e){alert('No se pudo abrir el archivo recibido.')}};
 P.ZanOpen.addListener('fileOpened',take);take(await P.ZanOpen.getPending());
 P.App.addListener('backButton',()=>hasDoc()?closeDoc():P.App.exitApp());
}
export async function saveFile(file){
 const b64=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(file)});
 const w=await P.Filesystem.writeFile({path:'zan_export/'+file.name,data:b64,directory:'CACHE',recursive:true});
 await P.Share.share({title:file.name,url:w.uri,dialogTitle:'Guardar o compartir'});
}
export const nativePrint=()=>P.ZanOpen.print();
