// Carga de librerías bajo demanda: cada <script> se inyecta una sola vez, solo cuando un visor lo necesita.
// Las dependencias (p. ej. docx-preview necesita JSZip) se cargan antes y en orden.
const LIBS={
 pdf:{src:'src/vendor/pdf.min.js',global:'pdfjsLib'},
 jszip:{src:'src/vendor/jszip.min.js',global:'JSZip'},
 docx:{src:'src/vendor/docx-preview.min.js',global:'docx',deps:['jszip']},
 mammoth:{src:'src/vendor/mammoth.browser.min.js',global:'mammoth'},
 xlsx:{src:'src/vendor/xlsx.full.min.js',global:'XLSX'},
 exceljs:{src:'src/vendor/exceljs.min.js',global:'ExcelJS'},
 pptx:{src:'src/vendor/pptx-preview.umd.js',global:'pptxPreview'},
 hljs:{src:'src/vendor/highlight.min.js',global:'hljs'}
};
const done=new Map();
function inject(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=ok;s.onerror=()=>{s.remove();no(new Error('No se pudo cargar '+src))};document.head.append(s)})}
export function lib(name){
 const L=LIBS[name];if(!L)return Promise.reject(new Error('Librería desconocida: '+name));
 if(done.has(name))return done.get(name);
 const p=(async()=>{for(const d of L.deps||[])await lib(d);if(!window[L.global])await inject(L.src);if(!window[L.global])throw new Error(L.global+' no quedó disponible');return window[L.global]})();
 // Si falla, se olvida para poder reintentar en la próxima apertura.
 p.catch(()=>done.delete(name));done.set(name,p);return p}
export const libs=(...n)=>Promise.all(n.map(lib));
