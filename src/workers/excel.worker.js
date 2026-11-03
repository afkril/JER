/* Worker de Excel (.xlsx/.xlsm con ExcelJS).
 * El libro se lee y se queda aquí; el hilo principal solo recibe lo que va a dibujar:
 *   load(buf)          -> lista de hojas
 *   sheet(i)           -> geometría de la hoja (anchos, altos, combinadas, inmovilizados, imágenes)
 *   rows(i, r0, r1)    -> celdas de ese rango de filas (texto ya formateado + id de estilo)
 * Los estilos se deduplican: cada celda lleva solo un número y la tabla de estilos viaja una vez. */
importScripts('../vendor/exceljs.min.js');
const TH=['FFFFFF','000000','E7E6E6','44546A','4472C4','ED7D31','A5A5A5','FFC000','5B9BD5','70AD47'],MAXC=200;
const col=c=>{if(!c)return'';let h;if(c.argb)h=c.argb.slice(-6);else if(c.theme!=null){h=TH[c.theme]||'000000';const t=c.tint||0;if(t)h=[0,2,4].map(i=>{const v=parseInt(h.substr(i,2),16);return Math.round(t>0?v+(255-v)*t:v*(1+t)).toString(16).padStart(2,'0')}).join('')}else return'';return'#'+h};
const raw=c=>{let v=c.value;if(v&&v.result!==undefined)v=v.result;if(v&&typeof v==='object'&&!(v instanceof Date))v=v.richText?v.richText.map(r=>r.text).join(''):v.text??v.error??'';return v??''};
const fmt=(v,nf)=>{if(v instanceof Date)return v.toLocaleDateString('es-CO',{timeZone:'UTC'});if(typeof v==='boolean')return v?'VERDADERO':'FALSO';
 if(typeof v==='number'&&nf&&nf!=='General'){const p=nf.includes('%'),m=/\.([0#]+)/.exec(nf),d=m?m[1].length:0;return(nf.includes('$')?'$':'')+(p?v*100:v).toLocaleString('es-CO',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:/#,#|0,0/.test(nf)})+(p?'%':'')}return String(v)};
// Estilo -> CSS. "box" va en la celda; "tx" es solo del texto (también lo usa el texto desbordado).
function parts(s){const f=s.font||{},a=s.alignment||{},b=s.border||{};let box='',tx='';
 if(s.fill&&s.fill.type==='pattern'&&s.fill.pattern==='solid'&&col(s.fill.fgColor))box+=`background:${col(s.fill.fgColor)};`;
 if(col(f.color))tx+=`color:${col(f.color)};`;if(f.bold)tx+='font-weight:700;';if(f.italic)tx+='font-style:italic;';
 if(f.underline||f.strike)tx+=`text-decoration:${f.underline?'underline ':''}${f.strike?'line-through':''};`;
 const px=f.size?Math.round(f.size*1.33):14;if(f.size)tx+=`font-size:${px}px;`;if(f.name)tx+=`font-family:'${f.name}',sans-serif;`;
 if(a.vertical)box+=`vertical-align:${a.vertical==='center'?'middle':a.vertical};`;if(a.wrapText)box+='white-space:normal;word-break:break-word;';
 for(const k of['top','right','bottom','left']){const e=b[k];if(e&&e.style)box+=`border-${k}:${/thick|medium/.test(e.style)?2:1}px ${/dash|dot/.test(e.style)?'dashed':'solid'} ${col(e.color)||'#000'};`}
 const h=a.horizontal==='right'?1:a.horizontal==='center'||a.horizontal==='centerContinuous'?2:0,v=a.vertical==='top'?0:a.vertical==='center'?1:2;
 return{box,tx,h,v,wrap:a.wrapText?1:0,font:`${f.italic?'italic ':''}${f.bold?'700 ':''}${px}px ${f.name?`'${f.name}',sans-serif`:'Calibri,Arial,sans-serif'}`}}
let wb=null,sheets=[],ids=new Map(),list=[[0,'','',0,2,0,'14px Calibri,Arial,sans-serif']],sent=0;
ids.set('',0);
function sid(cell){const p=parts(cell.style||{});const k=p.box+'|'+p.tx+'|'+p.h+p.v+p.wrap;if(!p.box&&!p.tx&&!p.h&&!p.wrap&&p.v===2)return 0;
 let i=ids.get(k);if(i===undefined){i=list.length;ids.set(k,i);list.push([i,p.box+p.tx,p.tx,p.h,p.v,p.wrap,p.font])}return i}
const dec=a=>{const m=/^([A-Z]+)(\d+)$/.exec(a);let c=0;for(const x of m[1])c=c*26+x.charCodeAt(0)-64;return[+m[2],c]};
const ops={
 async load(buf){wb=new ExcelJS.Workbook();await wb.xlsx.load(buf);sheets=[];
  wb.worksheets.forEach((ws,i)=>{if(ws.state!=='hidden'&&ws.state!=='veryHidden')sheets.push({i,name:ws.name,color:col(ws.properties&&ws.properties.tabColor)})});
  if(!sheets.length)throw new Error('el libro no tiene hojas visibles');return{data:{sheets}}},
 sheet(n){const ws=wb.worksheets[sheets[n].i],R=ws.rowCount,tc=ws.columnCount,C=Math.min(tc,MAXC);
  if(!R||!C)return{data:{empty:true,name:ws.name}};
  const dcw=ws.properties.defaultColWidth||8.43,dh=ws.properties.defaultRowHeight||15,cw=[],rh=new Float32Array(R);
  for(let c=1;c<=C;c++){const k=ws.getColumn(c);cw.push(k.hidden?0:Math.round((k.width||dcw)*7+5))}
  for(let r=1;r<=R;r++){const w=ws.findRow(r);rh[r-1]=w&&w.hidden?0:Math.round(((w&&w.height)||dh)*1.333)}
  const mg=[];for(const m of ws.model.merges||[]){const[a,b]=m.split(':'),[r1,c1]=dec(a),[r2,c2]=dec(b);mg.push(r1,c1,r2,c2)}
  const vw=ws.views&&ws.views[0]||{},fz=vw.state==='frozen',imgs=[],tr=[rh.buffer];
  for(const im of ws.getImages?ws.getImages():[]){try{const m=wb.getImage(im.imageId);if(!/^(png|jpe?g|gif|webp|bmp|svg)/i.test(m.extension))continue;
   const u=new Uint8Array(m.buffer).slice().buffer;tr.push(u);imgs.push({buf:u,ext:m.extension,tl:im.range.tl,br:im.range.br,size:im.range.ext||null})}catch(e){}}
  const s=ws.pageSetup||{};
  const merges=new Int32Array(mg);tr.push(merges.buffer);
  return{data:{R,C,cw,rh,merges,xs:fz?vw.xSplit||0:0,ys:fz?vw.ySplit||0:0,grid:vw.showGridLines!==false,imgs,
   page:{size:s.paperSize,land:s.orientation==='landscape',m:s.margins||null},cutCols:tc>C?tc:0,name:ws.name,color:col(ws.properties&&ws.properties.tabColor)},transfer:tr}},
 rows(n,r0,r1){const ws=wb.worksheets[sheets[n].i],C=Math.min(ws.columnCount,MAXC),out=[];
  for(let r=r0;r<=r1;r++){const w=ws.findRow(r);if(!w)continue;const L=w._cells||[],cells=[];
   for(let i=0;i<L.length&&i<C;i++){const cell=L[i];if(!cell||cell.type===1)continue; // 1 = celda combinada (la dibuja su celda principal)
    let v=raw(cell),t='',k=2,rw;
    if(v!==''){k=typeof v==='number'?1:typeof v==='string'?0:2;t=fmt(v,cell.numFmt);if(k===1&&t!==String(v))rw=String(v);else if(v instanceof Date)rw=v.toISOString().slice(0,10)}
    const s=sid(cell),f=cell.formula||undefined;if(t===''&&!s&&!f)continue;
    cells.push(f||rw!==undefined?[i+1,t,k,s,f,rw]:[i+1,t,k,s])}
   if(cells.length)out.push([r,cells])}
  const st=list.slice(sent);sent=list.length;return{data:{rows:out,styles:st}}}};
self.onmessage=async e=>{const{id,op,args}=e.data;
 try{const r=await ops[op](...args);self.postMessage({id,ok:true,data:r.data},r.transfer||[])}
 catch(err){self.postMessage({id,ok:false,error:{message:err.message||String(err),userMsg:err.userMsg}})}};
