import {btn,esc,pinch} from '../utils/ui.js';
export async function open(file,ctx){
 const {view,tools,status}=ctx,wb=XLSX.read(await file.arrayBuffer(),{type:'array'});let ws,zoom=1;
 const sel=document.createElement('select');sel.innerHTML=wb.SheetNames.map(n=>`<option>${esc(n)}</option>`).join('');tools.append(sel);
 const fx=document.createElement('input');fx.className='fx';fx.readOnly=true;fx.placeholder='Selecciona una celda';tools.append(fx);
 const z=d=>{zoom=Math.min(2,Math.max(.5,zoom+d));view.firstChild.style.zoom=zoom};
 btn(ctx,'−',()=>z(-.1));btn(ctx,'+',()=>z(.1));
 function show(n){ws=wb.Sheets[n];if(!ws['!ref']){view.innerHTML='<p class="err">Hoja vacía.</p>';return}
  const r=XLSX.utils.decode_range(ws['!ref']),last=Math.min(r.e.r,r.s.r+1999);let h='<table class="xl"><thead><tr><th></th>';
  for(let c=r.s.c;c<=r.e.c;c++)h+=`<th>${XLSX.utils.encode_col(c)}</th>`;h+='</tr></thead><tbody>';
  for(let i=r.s.r;i<=last;i++){h+=`<tr><th>${i+1}</th>`;for(let c=r.s.c;c<=r.e.c;c++){const a=XLSX.utils.encode_cell({r:i,c}),x=ws[a];h+=`<td data-a="${a}">${x?esc(x.w??x.v):''}</td>`}h+='</tr>'}
  view.innerHTML=h+'</tbody></table>';view.firstChild.style.zoom=zoom;status.textContent=`${last-r.s.r+1} de ${r.e.r-r.s.r+1} filas · ${r.e.c-r.s.c+1} columnas`}
 sel.onchange=()=>show(sel.value);
 view.onclick=e=>{const t=e.target.closest('td');if(!t)return;view.querySelector('.sel')?.classList.remove('sel');t.classList.add('sel');const x=ws[t.dataset.a];fx.value=x?(x.f?'='+x.f:x.v):''};
 pinch(view,r=>z(r>1?.2:-.2));show(wb.SheetNames[0]);return()=>{view.onclick=null}}
