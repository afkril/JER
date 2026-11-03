/* Procesamiento de Word fuera del hilo principal.
 *  - parseDoc: lector del formato binario .doc (Word 97-2003): texto, párrafos, tablas, saltos de página,
 *    negrita/cursiva/subrayado directos e imágenes JPEG/PNG en línea.
 *  - mammoth: conversión simplificada de .docx (respaldo del visor principal).
 * Este archivo también se puede cargar en Node (require) para pruebas. */
(function(root){
'use strict';
const u16=(b,o)=>b[o]|b[o+1]<<8,u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
const fail=(userMsg,detail)=>Object.assign(new Error(detail||userMsg),{userMsg});
const SZ=[1,1,2,4,2,2,0,3]; // tamaño del operando según los 3 bits altos del sprm (spra)

// Recorre una lista de modificadores (grpprl) y llama fn(opcode, posiciónDelOperando).
function walk(b,s,e,fn){
 while(s+2<=e){const op=u16(b,s);s+=2;const sp=op>>13;let n;
  if(sp===6){if(op===0xD608||op===0xD606||(op===0xC615&&b[s]===255))return;n=1+b[s];fn(op,s+1);}
  else{n=SZ[sp];fn(op,s)}
  s+=n}}

// Lee un PlcfBte (páginas FKP) y devuelve, ordenado, [desde, hasta, inicioGrpprl, finGrpprl] por cada rango.
function fkps(wd,tb,fc,lcb,pap){
 const out=[];if(!lcb)return out;const n=((lcb-4)/8)|0;
 for(let i=0;i<n;i++){const pg=u32(tb,fc+(n+1)*4+i*4)*512;if(pg+512>wd.length)continue;const cr=wd[pg+511];
  for(let j=0;j<cr;j++){const a=u32(wd,pg+j*4),b=u32(wd,pg+j*4+4);let g0=0,g1=0;
   if(pap){const bx=wd[pg+(cr+1)*4+j*13];if(bx){const o=pg+bx*2;let cb=wd[o];if(cb){g0=o+3;g1=o+2*cb}else{cb=wd[o+1];g0=o+4;g1=o+2+2*cb}}}
   else{const bx=wd[pg+(cr+1)*4+j];if(bx){const o=pg+bx*2;g0=o+1;g1=o+1+wd[o]}}
   out.push([a,b,g0,g1])}}
 return out}
const find=(L,fc)=>{let lo=0,hi=L.length-1;while(lo<=hi){const m=(lo+hi)>>1,r=L[m];if(fc<r[0])hi=m-1;else if(fc>=r[1])lo=m+1;else return r}return null};

// Imagen en línea: busca el bloque JPEG/PNG dentro de los registros OfficeArt del flujo "Data".
function picAt(d,off){
 if(!d||off+8>d.length)return null;const lcb=u32(d,off),end=Math.min(off+lcb,d.length);let p=off+u16(d,off+4);
 if(u16(d,off+6)===0x66)p+=1+d[p];
 while(p+8<=end){const h=u16(d,p),ty=u16(d,p+2),ln=u32(d,p+4),ver=h&15,inst=h>>4;
  if(ver===15){p+=8;continue}
  if(ty===0xF007){p+=8+36+d[p+8+33];continue}
  if(ty===0xF01D||ty===0xF02A||ty===0xF01E){const two=ty===0xF01E?inst===0x6E1:(inst===0x46B||inst===0x6E3),s=p+8+(two?32:16)+1,e=Math.min(p+8+ln,d.length);
   if(e>s)return{mime:ty===0xF01E?'image/png':'image/jpeg',bytes:d.slice(s,e)}}
  p+=8+ln}
 return null}

function parseDoc(file,CFB){
 const cfb=CFB.read(file,{type:'array'}),get=n=>{const e=CFB.find(cfb,n);return e&&e.content?Uint8Array.from(e.content):null};
 const wd=get('WordDocument');
 if(!wd){if(get('Workbook')||get('Book'))throw fail('Es una hoja de cálculo de Excel, no un documento de Word. Cambia la extensión a .xls y ábrelo de nuevo.');
  if(get('PowerPoint Document'))throw fail('Es una presentación de PowerPoint, no un documento de Word.');throw fail('El archivo no contiene un documento de Word legible.','sin flujo WordDocument')}
 const id=u16(wd,0);if(id!==0xA5EC&&id!==0xA5DC&&id!==0xA5DB)throw fail('El archivo no es un documento de Word válido.',`firma ${id.toString(16)}`);
 const nFib=u16(wd,2),fl=u16(wd,10);
 if(fl&0x100)throw fail('El documento está protegido con contraseña. Quita la contraseña en Word y vuelve a abrirlo.');
 let pieces=[],ccp,papL=[],chpL=[],tb=null;
 if(nFib>=0xC1){
  tb=get(fl&0x200?'1Table':'0Table');if(!tb)throw fail('El documento está dañado (falta la tabla de contenido).','sin flujo Table');
  let o=32;o+=2+u16(wd,o)*2;const nw=u16(wd,o),lw=o+2;o=lw+nw*4;const fc=o+2,P=i=>[u32(wd,fc+i*8),u32(wd,fc+i*8+4)];
  ccp=u32(wd,lw+12);const[fcClx,lcbClx]=P(33);
  // CLX: se saltan los bloques de propiedades (tipo 1) hasta la tabla de piezas (tipo 2).
  let p=fcClx;const end=fcClx+lcbClx;while(p<end&&tb[p]===1)p+=3+u16(tb,p+1);
  if(tb[p]!==2)throw fail('El documento está dañado (tabla de piezas ausente).','sin Pcdt');
  const n=((u32(tb,p+1)-4)/12)|0,b=p+5;
  for(let i=0;i<n;i++){const cp0=u32(tb,b+i*4),cp1=u32(tb,b+i*4+4),raw=u32(tb,b+(n+1)*4+i*8+2),comp=!!(raw&0x40000000),v=raw&0x3FFFFFFF;pieces.push({cp0,cp1,fc:comp?v>>1:v,comp})}
  const[fP,lP]=P(13),[fC,lC]=P(12);papL=fkps(wd,tb,fP,lP,true);chpL=fkps(wd,tb,fC,lC,false);
 }else{ // Word 6/95: texto contiguo de 8 bits
  const a=u32(wd,0x18),z=u32(wd,0x1C);ccp=z-a;pieces=[{cp0:0,cp1:ccp,fc:a,comp:true}]}
 const data=get('Data'),d1252=new TextDecoder('windows-1252'),d16=new TextDecoder('utf-16le');
 const blocks=[],images=[];let para=[],tbl=null,row=null,cell=null,afterPb=false,total=0,fs=[],ch=null,fmt={};
 const papAt=fc=>{const r=find(papL,fc);let inT=0,ttp=0,jc=0,itap=-1,pb=0,il=0,lv=0;
  if(r&&r[2])walk(wd,r[2],r[3],(op,q)=>{if(op===0x2416)inT=wd[q];else if(op===0x2417)ttp=wd[q];else if(op===0x2461||op===0x2403)jc=wd[q];else if(op===0x6649)itap=u32(wd,q);else if(op===0x2407)pb=wd[q];else if(op===0x460B)il=u16(wd,q);else if(op===0x260A)lv=wd[q]});
  return{d:itap>=0?itap:inT?1:0,ttp:!!ttp,jc,pb:!!pb,li:il>0&&il<0x8000?lv+1:0}};
 const chpAt=fc=>{const r=find(chpL,fc);const f={};if(r&&r[2])walk(wd,r[2],r[3],(op,q)=>{
  if(op===0x0835)f.b=wd[q]===1;else if(op===0x0836)f.i=wd[q]===1;else if(op===0x2A3E)f.u=wd[q]>0;else if(op===0x0818)f.h=wd[q]===1;else if(op===0x0855)f.s=wd[q]===1;else if(op===0x6A03)f.p=u32(wd,q);else if(op===0x0806)f.d=wd[q]===1});return f};
 const add=(s,f)=>{const l=para[para.length-1];if(l&&l.s!==undefined&&!l.b===!f.b&&!l.i===!f.i&&!l.u===!f.u)l.s+=s;else{const r={s};if(f.b)r.b=1;if(f.i)r.i=1;if(f.u)r.u=1;para.push(r)}};
 const flushTbl=()=>{if(tbl){if(row&&row.length)tbl.rows.push(row);if(tbl.rows.length)blocks.push(tbl)}tbl=row=cell=null};
 const endPara=(mark,fc)=>{const pp=papAt(fc),runs=para;para=[];if(pp.li)runs.unshift({s:'• '});const p={jc:pp.jc,runs,li:pp.li};
  if(pp.d===0){flushTbl();if(pp.pb&&!afterPb)blocks.push({k:'pb'});if(!runs.length&&afterPb){afterPb=false;return}afterPb=false;blocks.push(p);return}
  if(!tbl){tbl={k:'t',rows:[]};row=[];cell=[]}
  if(mark===7&&pp.ttp){if(pp.d===1){if(cell&&cell.length&&!row.length)row.push(cell);if(row.length)tbl.rows.push(row);row=[];cell=[]}return}
  if(!cell)cell=[];if(runs.length||!cell.length||mark===7)cell.push(p);
  if(mark===7&&pp.d===1){row.push(cell);cell=[]}};
 outer:for(const pc of pieces){const n=pc.cp1-pc.cp0;if(n<=0)continue;
  const s=pc.comp?d1252.decode(wd.subarray(pc.fc,pc.fc+n)):d16.decode(wd.subarray(pc.fc,pc.fc+n*2)),step=pc.comp?1:2;
  for(let k=0;k<s.length&&total<ccp;k++,total++){const c=s.charCodeAt(k),fc=pc.fc+k*step;
   if(c===0x13){fs.push(0);continue}if(c===0x14){if(fs.length)fs[fs.length-1]=1;continue}if(c===0x15){fs.pop();continue}
   if(c===13||c===7){endPara(c,fc);continue}
   if(fs.some(x=>!x))continue;
   if(c===12){if(para.length)endPara(13,fc);flushTbl();blocks.push({k:'pb'});afterPb=true;continue}
   if(!ch||fc<ch[0]||fc>=ch[1]){ch=find(chpL,fc)||[fc,fc+1,0,0];fmt=chpAt(fc)}
   if(fmt.h)continue;
   if(c===1){if(fmt.s&&fmt.p!==undefined&&!fmt.d){try{const im=picAt(data,fmt.p);if(im){images.push(im);para.push({img:images.length-1})}}catch(e){}}continue}
   if(c===9)add('\t',fmt);else if(c===11)add('\n',fmt);else if(c===0x1E)add('-',fmt);else if(c>=32)add(s[k],fmt)}
  if(total>=ccp)break outer}
 if(para.length)endPara(13,0);flushTbl();
 return{blocks,images}}

root.parseDoc=parseDoc;
if(typeof module==='object'&&module.exports)module.exports={parseDoc};
else if(typeof importScripts==='function'){
 const loaded={};const need=n=>{if(!loaded[n]){importScripts('../vendor/'+n);loaded[n]=1}};
 const ops={
  doc(buf){need('xlsx.full.min.js');const r=parseDoc(new Uint8Array(buf),self.XLSX.CFB);return{data:r,transfer:r.images.map(i=>i.bytes.buffer)}},
  async mammoth(buf){need('mammoth.browser.min.js');const r=await self.mammoth.convertToHtml({arrayBuffer:buf});return{data:r.value}}};
 self.onmessage=async e=>{const{id,op,args}=e.data;
  try{const r=await ops[op](...args);self.postMessage({id,ok:true,data:r.data},r.transfer||[])}
  catch(err){self.postMessage({id,ok:false,error:{message:err.message||String(err),userMsg:err.userMsg}})}}}
})(typeof self!=='undefined'?self:globalThis);
