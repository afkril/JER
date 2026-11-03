/* Worker de hojas sin estilos: CSV, XLS (binario), ODS.
 * Misma interfaz que excel.worker.js (load / sheet / rows) para que ambos usen el mismo visor.
 * El CSV no se convierte a objetos: se indexa dónde empieza cada fila y solo se interpretan las filas que se piden,
 * así un CSV de cientos de miles de filas ocupa lo que pesa su texto. */
importScripts('../vendor/xlsx.full.min.js');
const MAXC=200;
let mode='',csv=null,wb=null,names=[];
// ---- CSV ----
function decode(buf){const u=new Uint8Array(buf);try{return new TextDecoder('utf-8',{fatal:true}).decode(u).replace(/^\uFEFF/,'')}catch(e){return new TextDecoder('windows-1252').decode(u)}}
function csvOpen(buf){const t=decode(buf),n=t.length,off=[0];let q=false;
 for(let i=0;i<n;i++){const c=t.charCodeAt(i);if(c===34)q=!q;else if(c===10&&!q&&i+1<n)off.push(i+1)}
 const rows=new Uint32Array(off),first=t.slice(0,Math.min(n,t.indexOf('\n')<0?n:t.indexOf('\n')));let d=',',best=-1;
 for(const x of[',',';','\t','|']){const k=first.split(x).length;if(k>best){best=k;d=x}}
 return{t,rows,d,N:rows.length}}
function csvRow(r){const{t,rows,d,N}=csv,a=rows[r],b=r+1<N?rows[r+1]:t.length;let e=b;while(e>a&&(t.charCodeAt(e-1)===10||t.charCodeAt(e-1)===13))e--;
 const out=[];let f='',q=false,i=a;
 for(;i<e;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"'&&f==='')q=true;else if(c===d){out.push(f);f=''}else f+=c}
 out.push(f);return out}
// ---- ancho automático (CSV/XLS sin anchos): según el contenido de las primeras filas ----
const fit=(len,C)=>{const w=[];for(let c=0;c<C;c++)w.push(Math.max(64,Math.min(420,Math.round((len[c]||0)*7.5+16))));return w};
const ops={
 load(buf,kind,name){
  if(kind==='csv'){mode='csv';csv=csvOpen(buf);names=[name||'CSV'];return{data:{sheets:[{i:0,name:names[0]}]}}}
  mode='xls';wb=XLSX.read(buf,{type:'array'});names=[];const hid=wb.Workbook&&wb.Workbook.Sheets||[];
  const sh=[];wb.SheetNames.forEach((n,i)=>{if(!(hid[i]&&hid[i].Hidden))sh.push({i,name:n})});if(!sh.length)throw new Error('el libro no tiene hojas visibles');return{data:{sheets:sh}}},
 sheet(n){
  if(mode==='csv'){const R=csv.N;let C=1;const len=[];
   for(let r=0;r<Math.min(R,3000);r++){const x=csvRow(r);C=Math.max(C,x.length);if(r<400)x.forEach((v,c)=>{len[c]=Math.max(len[c]||0,Math.min(v.length,60))})}
   C=Math.min(C,MAXC);if(R===1&&!csvRow(0).join(''))return{data:{empty:true}};
   const rh=new Float32Array(R).fill(20);return{data:{R,C,cw:fit(len,C),rh,merges:new Int32Array(0),xs:0,ys:0,grid:true,imgs:[],page:{},cutCols:0},transfer:[rh.buffer]}}
  const ws=wb.Sheets[wb.SheetNames[n]];if(!ws||!ws['!ref'])return{data:{empty:true}};
  const g=XLSX.utils.decode_range(ws['!ref']),R=g.e.r+1,tc=g.e.c+1,C=Math.min(tc,MAXC),len=[],cols=ws['!cols']||[],rws=ws['!rows']||[];
  for(let r=0;r<Math.min(R,300);r++)for(let c=0;c<C;c++){const x=ws[XLSX.utils.encode_cell({r,c})];if(x)len[c]=Math.max(len[c]||0,Math.min(String(x.w??x.v).length,60))}
  const auto=fit(len,C),cw=auto.map((a,c)=>{const k=cols[c];return k?k.hidden?0:Math.round(k.wpx||(k.wch?k.wch*7+5:a)):a});
  const rh=new Float32Array(R);for(let r=0;r<R;r++){const k=rws[r];rh[r]=k?k.hidden?0:Math.round(k.hpx||(k.hpt?k.hpt*1.333:20)):20}
  const mg=[];for(const m of ws['!merges']||[])mg.push(m.s.r+1,m.s.c+1,m.e.r+1,m.e.c+1);const merges=new Int32Array(mg);
  return{data:{R,C,cw,rh,merges,xs:0,ys:0,grid:true,imgs:[],page:{},cutCols:tc>C?tc:0},transfer:[rh.buffer,merges.buffer]}},
 rows(n,r0,r1){const out=[];
  if(mode==='csv'){for(let r=r0;r<=r1&&r<=csv.N;r++){const x=csvRow(r-1),cells=[];for(let c=0;c<x.length&&c<MAXC;c++)if(x[c]!=='')cells.push([c+1,x[c],0,0]);if(cells.length)out.push([r,cells])}return{data:{rows:out,styles:[]}}}
  const ws=wb.Sheets[wb.SheetNames[n]],g=XLSX.utils.decode_range(ws['!ref']),C=Math.min(g.e.c+1,MAXC);
  for(let r=r0;r<=r1;r++){const cells=[];
   for(let c=0;c<C;c++){const x=ws[XLSX.utils.encode_cell({r:r-1,c})];if(!x)continue;
    const k=x.t==='n'?1:x.t==='s'?0:2,t=x.w!==undefined?String(x.w):x.v==null?'':String(x.v),rw=k===1&&t!==String(x.v)?String(x.v):undefined;
    cells.push(x.f||rw!==undefined?[c+1,t,k,0,x.f||undefined,rw]:[c+1,t,k,0])}
   if(cells.length)out.push([r,cells])}
  return{data:{rows:out,styles:[]}}}};
self.onmessage=async e=>{const{id,op,args}=e.data;
 try{const r=await ops[op](...args);self.postMessage({id,ok:true,data:r.data},r.transfer||[])}
 catch(err){self.postMessage({id,ok:false,error:{message:err.message||String(err),userMsg:err.userMsg}})}};
