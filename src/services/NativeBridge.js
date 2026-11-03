// Puente con Android (Capacitor). En el navegador no hace nada.
const C=window.Capacitor,P=C&&C.Plugins;
export const isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
let last='',lk='',lt=0;
async function toFile(o){let b=await (await fetch(C.convertFileSrc(o.path))).blob();
 if(o.size>0&&b.size!==o.size){const r=await P.Filesystem.readFile({path:'file://'+o.path}),s=atob(r.data),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);b=new Blob([u])}
 return new File([b],o.name,{type:o.mime||''})}
const b64=f=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(f)});
const toCache=async(dir,f)=>(await P.Filesystem.writeFile({path:dir+'/'+f.name.replace(/[^\w.\- ]/g,'_'),data:await b64(f),directory:'CACHE',recursive:true})).uri;
export async function initNative(openFile,hasDoc,closeDoc){
 if(!isNative)return;
 const take=async o=>{if(!o||!o.path||o.path===last)return;const key=o.name+'|'+o.size;if(key===lk&&Date.now()-lt<3000)return;last=o.path;lk=key;lt=Date.now();try{openFile(await toFile(o))}catch(e){alert('No se pudo abrir el archivo recibido.')}};
 P.ZanOpen.addListener('fileOpened',take);take(await P.ZanOpen.getPending());
 P.App.addListener('backButton',()=>hasDoc()?closeDoc():P.App.exitApp());
}
export async function saveFile(file){await P.Share.share({title:file.name,url:await toCache('zan_export',file),dialogTitle:'Guardar o compartir'})}
export const nativePrint=s=>P.ZanOpen.print(s?{w:s[0],h:s[1]}:{});
export async function nativePrintPdf(file,pages){const u=await toCache('zan_print',file);await P.ZanOpen.printPdf({path:decodeURIComponent(u.replace(/^file:\/\//,'')),pages})}
