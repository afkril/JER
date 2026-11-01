import {btn,esc,pinch} from '../utils/ui.js';
const TH=['FFFFFF','000000','E7E6E6','44546A','4472C4','ED7D31','A5A5A5','FFC000','5B9BD5','70AD47'],HW=44,HH=24;
const col=c=>{if(!c)return'';let h;if(c.argb)h=c.argb.slice(-6);else if(c.theme!=null){h=TH[c.theme]||'000000';const t=c.tint||0;if(t)h=[0,2,4].map(i=>{const v=parseInt(h.substr(i,2),16);return Math.round(t>0?v+(255-v)*t:v*(1+t)).toString(16).padStart(2,'0')}).join('')}else return'';return'#'+h};
const dec=a=>{const m=/^([A-Z]+)(\d+)$/.exec(a);let c=0;for(const x of m[1])c=c*26+x.charCodeAt(0)-64;return[+m[2],c]};
const raw=c=>{let v=c.value;if(v&&v.result!==undefined)v=v.result;if(v&&typeof v==='object'&&!(v instanceof Date))v=v.richText?v.richText.map(r=>r.text).join(''):v.text??v.error??'';return v??''};
const fmt=(v,nf)=>{if(v instanceof Date)return v.toLocaleDateString('es-CO',{timeZone:'UTC'});
 if(typeof v==='number'&&nf&&nf!=='General'){const p=nf.includes('%'),m=/\.([0#]+)/.exec(nf),d=m?m[1].length:0;return(nf.includes('$')?'$':'')+(p?v*100:v).toLocaleString('es-CO',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:/#,#|0,0/.test(nf)})+(p?'%':'')}return v};
const css=c=>{const s=c.style||{},f=s.font||{},a=s.alignment||{},b=s.border||{};let o='';
 if(s.fill&&s.fill.type==='pattern'&&s.fill.pattern==='solid'&&col(s.fill.fgColor))o+=`background:${col(s.fill.fgColor)};`;
 if(col(f.color))o+=`color:${col(f.color)};`;if(f.bold)o+='font-weight:700;';if(f.italic)o+='font-style:italic;';
 if(f.underline||f.strike)o+=`text-decoration:${f.underline?'underline ':''}${f.strike?'line-through':''};`;
 if(f.size)o+=`font-size:${Math.round(f.size*1.33)}px;`;if(f.name)o+=`font-family:'${f.name}',sans-serif;`;
 if(a.vertical)o+=`vertical-align:${a.vertical==='center'?'middle':a.vertical};`;if(a.wrapText)o+='white-space:normal;word-break:break-word;';
 for(const k of['top','right','bottom','left']){const e=b[k];if(e&&e.style)o+=`border-${k}:${/thick|medium/.test(e.style)?2:1}px ${/dash|dot/.test(e.style)?'dashed':'solid'} ${col(e.color)||'#000'};`}return o};
export async function open(file,ctx){
 const {view,tools,status}=ctx,wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
 let ws,zoom=1,fm=false,urls=[],tabs=[];const fx=document.createElement('input');fx.className='fx';fx.readOnly=true;fx.placeholder='Selecciona una celda';
 function show(){const vw=ws.views&&ws.views[0]||{},ys=vw.state==='frozen'?vw.ySplit||0:0,xs=vw.state==='frozen'?vw.xSplit||0:0;
  const R=Math.min(ws.rowCount,2000),C=Math.min(ws.columnCount,200),cw=[0],rh=[0],lo=[HW],to=[HH];
  for(let c=1;c<=C;c++){const k=ws.getColumn(c);cw[c]=k.hidden?0:Math.round((k.width||8.43)*7+5);lo[c]=lo[c-1]+cw[c]}
  for(let r=1;r<=R;r++){const w=ws.getRow(r);rh[r]=w.hidden?0:Math.round((w.height||15)*1.333);to[r]=to[r-1]+rh[r]}
  const mg={},sk={};for(const m of ws.model.merges||[]){const[a,b]=m.split(':'),[r1,c1]=dec(a),[r2,c2]=dec(b);mg[r1+','+c1]=[r2-r1+1,c2-c1+1];for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!=r1||c!=c1)sk[r+','+c]=1}
  let h=`<div class="xlw"><table class="xl${vw.showGridLines===false?' ng':''}" style="width:${lo[C]}px"><colgroup><col style="width:${HW}px">${cw.slice(1).map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr><th class="cn"></th>`;
  for(let c=1;c<=C;c++)if(cw[c])h+=`<th style="${c<=xs?`left:${lo[c-1]}px;z-index:4`:''}">${XLSX.utils.encode_col(c-1)}</th>`;h+='</tr></thead><tbody>';
  for(let r=1;r<=R;r++){if(!rh[r])continue;h+=`<tr style="height:${rh[r]}px"><th class="rh" style="${r<=ys?`top:${to[r-1]}px;z-index:4`:''}">${r}</th>`;
   for(let c=1;c<=C;c++){if(!cw[c]||sk[r+','+c])continue;const cell=ws.getCell(r,c),v=raw(cell),sp=mg[r+','+c],st=(r<=ys?`position:sticky;top:${to[r-1]}px;z-index:${c<=xs?3:2};`:'')+(c<=xs&&r>ys?`position:sticky;left:${lo[c-1]}px;z-index:2;`:'')+(c<=xs&&r<=ys?`left:${lo[c-1]}px;`:'');
    const t=fm&&cell.formula?'='+cell.formula:fmt(v,cell.numFmt);h+=`<td data-a="${r},${c}"${sp?` rowspan="${sp[0]}" colspan="${sp[1]}"`:''} style="${typeof v==='number'?'text-align:right;':''}${css(cell)}${st}">${esc(t)}</td>`}h+='</tr>'}
  view.innerHTML=h+'</tbody></table></div>';const w=view.firstChild;w.style.zoom=zoom;
  for(const im of ws.getImages?ws.getImages():[]){try{const m=wb.getImage(im.imageId),a=im.range.tl,b=im.range.br,ox=x=>lo[Math.floor(x)]+(x%1)*(cw[Math.floor(x)+1]||0),oy=y=>to[Math.floor(y)]+(y%1)*(rh[Math.floor(y)+1]||0);
   const u=URL.createObjectURL(new Blob([m.buffer],{type:'image/'+m.extension}));urls.push(u);const i=new Image();i.src=u;
   const L=ox(a.col),T=oy(a.row),W=im.range.ext?im.range.ext.width:ox(b.col)-L,H=im.range.ext?im.range.ext.height:oy(b.row)-T;i.style.cssText=`position:absolute;left:${L}px;top:${T}px;width:${W}px;height:${H}px;pointer-events:none`;w.append(i)}catch(e){}}
  status.textContent=`${ws.name} · ${R} filas · ${C} columnas${ws.rowCount>R?' (se muestran las primeras 2000)':''}${ys||xs?' · paneles inmovilizados':''}`}
 const pick=s=>{ws=s;tabs.forEach(t=>t.b.setAttribute('aria-pressed',t.s===s));show()};
 for(const s of wb.worksheets){if(s.state==='hidden'||s.state==='veryHidden')continue;const b=btn(ctx,s.name,()=>pick(s)),tc=col(s.properties&&s.properties.tabColor);if(tc)b.style.borderBottom='4px solid '+tc;tabs.push({s,b})}
 const fb=btn(ctx,'Fórmulas',()=>{fm=!fm;fb.setAttribute('aria-pressed',fm);show()},'Mostrar fórmulas en las celdas');
 const z=d=>{zoom=Math.min(2,Math.max(.4,zoom+d));view.firstChild.style.zoom=zoom};btn(ctx,'−',()=>z(-.1));btn(ctx,'+',()=>z(.1));tools.append(fx);
 view.onclick=e=>{const t=e.target.closest('td');if(!t)return;view.querySelector('.sel')?.classList.remove('sel');t.classList.add('sel');const[r,c]=t.dataset.a.split(',').map(Number),cell=ws.getCell(r,c);fx.value=`${cell.address}: ${cell.formula?'='+cell.formula:raw(cell)}`};
 pinch(view,r=>z(r>1?.2:-.2));pick(tabs[0].s);return()=>{view.onclick=null;urls.forEach(URL.revokeObjectURL)}}
