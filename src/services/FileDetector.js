const V={pdf:'PdfViewer',docx:'WordViewer',doc:'WordViewer',rtf:'WordViewer',xlsx:'ExcelViewer',pptx:'PptxViewer',ppsx:'PptxViewer',ppt:'PptxViewer',xlsm:'ExcelViewer',xls:'SheetViewer',csv:'SheetViewer',tsv:'SheetViewer',ods:'SheetViewer',html:'HtmlViewer',htm:'HtmlViewer',jpg:'ImageViewer',jpeg:'ImageViewer',png:'ImageViewer',webp:'ImageViewer',svg:'ImageViewer'};
const T={txt:'',log:'',md:'markdown',js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',css:'css',scss:'scss',json:'json',xml:'xml',php:'php',py:'python',java:'java',sql:'sql'};
export const PENDING=['odt','odp'];
// Tipos MIME que Android/correo/WhatsApp entregan cuando el nombre llega sin extensión.
const M={'application/pdf':'pdf','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/rtf':'rtf','text/rtf':'rtf',
 'application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-excel.sheet.macroenabled.12':'xlsm','application/vnd.oasis.opendocument.spreadsheet':'ods',
 'text/csv':'csv','text/comma-separated-values':'csv','text/tab-separated-values':'tsv','application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':'ppsx','text/html':'html','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/svg+xml':'svg','text/plain':'txt','application/json':'json','text/xml':'xml','application/xml':'xml',
 'application/vnd.oasis.opendocument.text':'odt','application/vnd.oasis.opendocument.presentation':'odp'};
const known=e=>!!(V[e]||e in T||PENDING.includes(e));
const res=ext=>V[ext]?{ext,viewer:V[ext]}:ext in T?{ext,viewer:'TextViewer',lang:T[ext]}:{ext,viewer:null,pending:PENDING.includes(ext)};
const has=(u8,s)=>{const a=[...s].map(c=>c.charCodeAt(0)),n=a.length;outer:for(let i=0;i<=u8.length-n;i++){for(let j=0;j<n;j++)if(u8[i+j]!==a[j])continue outer;return true}return false};
const utf16=s=>[...s].map(c=>c+'\0').join('');
// Último recurso: se mira el contenido real del archivo.
async function byContent(f){
 const h=new Uint8Array(await f.slice(0,4096).arrayBuffer()),s=String.fromCharCode(...h.slice(0,8));
 if(s.startsWith('%PDF'))return'pdf';if(h[0]===0x89&&s.slice(1,4)==='PNG')return'png';if(h[0]===0xFF&&h[1]===0xD8)return'jpg';if(s.startsWith('RIFF')&&String.fromCharCode(...h.slice(8,12))==='WEBP')return'webp';
 if(s.startsWith('{\\rtf'))return'rtf';
 if(h[0]===0x50&&h[1]===0x4B){const t=new Uint8Array(await f.slice(Math.max(0,f.size-262144)).arrayBuffer()),all=new Uint8Array([...h,...t]);
  if(has(all,'word/'))return'docx';if(has(all,'xl/'))return'xlsx';if(has(all,'ppt/'))return'pptx';return null}
 if(h[0]===0xD0&&h[1]===0xCF&&h[2]===0x11&&h[3]===0xE0){const b=new Uint8Array(await f.slice(0,Math.min(f.size,2e7)).arrayBuffer());
  if(has(b,utf16('WordDocument')))return'doc';if(has(b,utf16('Workbook'))||has(b,utf16('Book')))return'xls';if(has(b,utf16('PowerPoint')))return'ppt';return null}
 if(!h.includes(0)){const t=String.fromCharCode(...h).trimStart().toLowerCase();return t.startsWith('<!doctype html')||t.startsWith('<html')?'html':'txt'}
 return null}
export async function detect(f){
 let ext=f.name.split('.').pop().toLowerCase();
 if(known(ext))return res(ext);
 const m=(f.type||'').toLowerCase().split(';')[0];if(M[m])return res(M[m]);
 const c=await byContent(f).catch(()=>null);if(c)return res(c);
 return{ext,viewer:null,pending:false}}
