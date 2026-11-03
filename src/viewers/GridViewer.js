import {Viewer,Rpc} from '../core/Viewer.js';
import {btn,esc,pinch} from '../utils/ui.js';
// Visor de cuadrículas (Excel, CSV, XLS, ODS). El archivo se lee en un Worker; aquí solo se dibujan las filas que se ven
// (más una pantalla de margen arriba y abajo), de modo que una hoja de cientos de miles de filas abre igual de rápido.
const HW=44,HH=24,CH=64,MAXSPAN=300,DF='14px Calibri,Arial,sans-serif',DEF=[0,'','',0,2,0,DF];
const PS={1:[612,792],5:[612,1008],7:[522,756],8:[842,1191],9:[595.3,841.9],11:[419.5,595.3]};
export const colName=n=>{let s='';for(;n>0;n=(n-1)/26|0)s=String.fromCharCode(65+(n-1)%26)+s;return s};
export class Fallback extends Error{}
export class GridViewer extends Viewer{
 constructor(...a){super(...a);this.src='';this.formulas=false;this.select=false;this.zoom=1;this.fm=false;this.tok=0;this.styles=[];this.chunks=new Map();this.pend=new Map();this.g=null;this.win=null;this.sel=null;this.pm=0;this.imgUrls=[]}
 loadArgs(){return[]}
 check(buf){}
 async load(){const buf=await this.file.arrayBuffer();this.alive();this.check(buf);this.rpc=new Rpc(this,this.src);
  const m=await this.rpc.call('load',[buf,...this.loadArgs()],[buf]);this.alive();this.sheets=m.sheets}
 async init(){await this.load();await this.show()}
 async show(){const{view,tools,bottom}=this;this.tabs=[];
  if(this.select){const s=document.createElement('select');s.innerHTML=this.sheets.map((x,k)=>`<option value="${k}">${esc(x.name)}</option>`).join('');s.onchange=()=>this.pick(+s.value);bottom.append(s)}
  else for(const[k,s]of this.sheets.entries()){const b=btn({tools:bottom},s.name,()=>this.pick(k),s.name,1);if(s.color)b.style.borderBottom='4px solid '+s.color;this.tabs.push(b)}
  if(this.formulas){const fb=btn(this.ctx,'Fórmulas',()=>{this.fm=!this.fm;fb.setAttribute('aria-pressed',this.fm);this.paint(true)},'Mostrar fórmulas en las celdas')}
  btn(this.ctx,'−',()=>this.setZoom(this.zoom-.1));btn(this.ctx,'+',()=>this.setZoom(this.zoom+.1));
  const fx=this.fx=document.createElement('input');fx.className='fx';fx.readOnly=true;fx.placeholder='Selecciona una celda';tools.append(fx);
  this.on(view,'click',e=>this.click(e));
  let raf=0;this.on(view,'scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(!this.disposed)this.paint()})});
  pinch(view,()=>view.firstChild,{get:()=>this.zoom,set:v=>this.setZoom(v),min:.4,max:2.5});
  this.onDispose(()=>this.imgUrls.forEach(u=>URL.revokeObjectURL(u)));
  this.ctx.print={css:()=>this.printCss(),prepare:()=>this.prepare(),restore:()=>this.restore()};
  await this.pick(0)}
 setZoom(v){this.zoom=Math.min(2.5,Math.max(.4,v));if(this.w)this.w.style.zoom=this.zoom;this.paint(true)}
 async pick(n){const tok=++this.tok;this.cur=n;this.tabs.forEach((b,k)=>b.setAttribute('aria-pressed',k===n));this.status.textContent='Procesando hoja…';
  const g=await this.rpc.call('sheet',[n]);this.alive();if(tok!==this.tok)return;this.setup(g)}
 setup(g){const{view}=this;this.imgUrls.forEach(u=>URL.revokeObjectURL(u));this.imgUrls=[];this.chunks=new Map();this.pend=new Map();this.sel=null;this.win=null;this.pm=0;this.spillMax=0;this.fx.value='';
  if(g.empty){this.g=null;this.w=null;view.innerHTML='<p class="err">Hoja vacía.</p>';this.status.textContent='Hoja vacía';return}
  const{R,C}=g,cw=[0,...g.cw],lo=[HW],tops=new Float64Array(R+1);tops[0]=HH;
  for(let c=1;c<=C;c++)lo[c]=lo[c-1]+cw[c];for(let r=1;r<=R;r++)tops[r]=tops[r-1]+g.rh[r-1];
  this.g=g;this.cw=cw;this.lo=lo;this.tops=tops;
  // Combinadas: las pequeñas se indexan por fila inicial; las gigantes se recortan a lo que se ve.
  const m=g.merges,L=[];for(let i=0;i<m.length;i+=4)L.push([m[i],m[i+1],m[i+2],m[i+3]]);L.sort((a,b)=>a[0]-b[0]);this.mg=L;
  const ys=g.ys,xs=g.xs;let ths='';for(let c=1;c<=C;c++)if(cw[c])ths+=`<th style="${c<=xs?`left:${lo[c-1]}px;z-index:4`:''}">${colName(c)}</th>`;
  view.innerHTML=`<div class="zb"><div class="xlw"><table class="xl${g.grid?'':' ng'}" style="width:${lo[C]}px"><colgroup><col style="width:${HW}px">${cw.slice(1).map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr><th class="cn"></th>${ths}</tr></thead><tbody></tbody></table></div></div>`;
  this.w=view.querySelector('.xlw');this.tb=view.querySelector('tbody');this.w.style.zoom=this.zoom;view.scrollTop=0;view.scrollLeft=0;
  this.images(g);this.paint(true)}
 images(g){const{lo,tops,cw,w}=this,R=g.R,ox=x=>{const k=Math.min(g.C,Math.floor(x));return lo[k]+(x%1)*(cw[k+1]||0)},oy=y=>{const k=Math.min(R,Math.floor(y));return tops[k]+(y%1)*(g.rh[k]||0)};
  for(const im of g.imgs){try{const u=URL.createObjectURL(new Blob([im.buf],{type:'image/'+im.ext}));this.imgUrls.push(u);const i=new Image(),a=im.tl,b=im.br,x=ox(a.col),y=oy(a.row);i.src=u;
   i.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${im.size?im.size.width:ox(b.col)-x}px;height:${im.size?im.size.height:oy(b.row)-y}px;pointer-events:none`;w.append(i)}catch(e){}}}
 // ---- ventana de filas visibles ----
 rowAt(y){const t=this.tops;let a=1,b=this.g.R;while(a<b){const m=(a+b+1)>>1;if(t[m-1]<=y)a=m;else b=m-1}return a}
 paint(force){const g=this.g;if(!g||this.pm)return;const{view}=this,z=this.zoom,y0=view.scrollTop/z,v0=this.rowAt(y0),v1=this.rowAt(y0+view.clientHeight/z),buf=Math.max(30,v1-v0);
  this.vis=[v0,v1];this.stat();
  const win=this.win;if(!force&&win){const m=buf>>1;if((win[0]===1||v0>=win[0]+m)&&(win[1]===g.R||v1<=win[1]-m))return}
  this.render(Math.max(1,v0-buf),Math.min(g.R,v1+buf))}
 stat(){const g=this.g,v=this.vis||[1,1];this.status.textContent=`${this.sheets[this.cur].name} · filas ${v[0].toLocaleString('es-CO')}–${v[1].toLocaleString('es-CO')} de ${g.R.toLocaleString('es-CO')} · ${g.C} columnas${g.cutCols?` (de ${g.cutCols}; se muestran 200)`:''}${g.ys||g.xs?' · paneles inmovilizados':''}`}
 rowData(r){const c=this.chunks.get((r-1)/CH|0);return c&&c.get(r)}
 fetch(k){if(this.chunks.has(k))return Promise.resolve();let p=this.pend.get(k);if(p)return p;const tok=this.tok,r0=k*CH+1,r1=Math.min(this.g.R,r0+CH-1);
  p=this.rpc.call('rows',[this.cur,r0,r1]).then(d=>{this.pend.delete(k);if(tok!==this.tok||this.disposed)return;for(const s of d.styles)this.styles[s[0]]=s;this.chunks.set(k,new Map(d.rows));this.evict(k);this.refresh()},e=>{this.pend.delete(k);if(!e.stale)console.warn('filas',e)});
  this.pend.set(k,p);return p}
 evict(k){if(this.chunks.size<=160)return;const mid=this.win?((this.win[0]+this.win[1])/2-1)/CH|0:k;[...this.chunks.keys()].sort((a,b)=>Math.abs(b-mid)-Math.abs(a-mid)).slice(0,40).forEach(x=>this.chunks.delete(x))}
 refresh(){if(this.rf)return;this.rf=requestAnimationFrame(()=>{this.rf=0;if(!this.disposed&&this.win&&!this.pm)this.render(this.win[0],this.win[1])})}
 measure(t,font){const x=this.mc||(this.mc=document.createElement('canvas').getContext('2d'));if(this.mf!==font){x.font=font;this.mf=font}return x.measureText(t).width}
 // Texto largo: en Excel se extiende sobre las celdas vecinas vacías (si la vecina tiene algo, el texto se corta ahí).
 spill(c,text,sty,occ,blocked){const{cw,g}=this,C=g.C,fs=+(/(\d+)px/.exec(sty[6])||[0,14])[1],own=cw[c];
  if(text.length*fs*.9+9<=own)return null;const W=this.measure(text,sty[6])+9;if(W<=own)return null;
  const free=j=>{const x=occ.get(j);return!blocked.has(j)&&!(x&&x[1]!=='')};
  const right=need=>{let a=0,j=c+1;while(a<need){if(j>C){a=need;break}if(!free(j))break;a+=cw[j];j++}return a},left=need=>{let a=0,j=c-1;while(a<need&&j>=1){if(!free(j))break;a+=cw[j];j--}return a};
  let L=0,R=0;const need=W-own;
  if(sty[3]===0)R=right(need);else if(sty[3]===1)L=left(need);else{const h=Math.min(right(need/2),left(need/2));L=R=h}
  return L+R>0?{L,R,W:own+L+R}:null}
 rowHtml(r,ctx){const{g,cw,lo,tops}=this,hgt=g.rh[r-1];if(!hgt)return'';const{ys,xs,C}=g,cells=this.rowData(r)||[],occ=new Map(cells.map(x=>[x[0],x]));
  let h=`<tr data-r="${r}" style="height:${hgt}px"><th class="rh" style="${r<=ys?`top:${tops[r-1]}px;z-index:4`:''}">${r}</th>`;
  const blocked=new Set();for(let c=1;c<=C;c++)if(ctx.sk.has(r*1e3+c)||ctx.an.has(r*1e3+c))blocked.add(c);
  for(let c=1;c<=C;c++){if(!cw[c]||ctx.sk.has(r*1e3+c))continue;
   const x=occ.get(c),sty=x&&this.styles[x[3]]||DEF,mg=ctx.an.get(r*1e3+c);let t=x?x[1]:'',k=x?x[2]:2;if(this.fm&&x&&x[4]){t='='+x[4];k=0}
   const fr=r<=ys,fc=c<=xs;let pos=fr?`position:sticky;top:${tops[r-1]}px;z-index:${fc?3:2};${fc?`left:${lo[c-1]}px;`:''}`:fc?`position:sticky;left:${lo[c-1]}px;z-index:2;`:'';
   const sp=x&&k===0&&!mg&&!sty[5]&&t!==''?this.spill(c,t,sty,occ,blocked):null;let body=esc(t),cls='';
   if(sp){cls=' class="sp"';this.spillMax=Math.max(this.spillMax,lo[c-1]+sp.W-sp.L);
    pos=pos?pos.replace(/z-index:(\d)/,(_,z)=>'z-index:'+(+z+1)):`position:relative;z-index:${sp.L?3:1};`;
    body=`<span class="so" style="left:${-sp.L}px;width:${sp.W}px;justify-content:${sty[3]===1?'flex-end':sty[3]===2?'center':'flex-start'};align-items:${sty[4]===0?'flex-start':sty[4]===1?'center':'flex-end'};${sty[2]}">${body}</span>`}
   h+=`<td data-c="${c}"${cls}${mg?` rowspan="${mg[0]}" colspan="${mg[1]}"`:''} style="${k===1?'text-align:right;':''}${sty[1]}${pos}">${body}</td>`}
  return h+'</tr>'}
 render(a,b){const g=this.g,{ys,C,R}=g,L=this.mg,rh=g.rh,vis=this.cw;
  // La ventana crece lo necesario para no partir una combinada pequeña por la mitad.
  if(ys&&a<=ys+1)a=1;
  for(let ch=1;ch;){ch=0;for(const m of L){const r1=m[0],r2=m[2];if(r1>b)break;if(r2-r1>MAXSPAN)continue;
   if(r1<a&&r2>=a&&r1>ys){a=r1;ch=1}else if(r1>=a&&r2>b){b=Math.min(R,r2);ch=1}}}
  const first=ys&&a>ys+1?ys:0,sk=new Set(),an=new Map();
  const vr=(x,y)=>{let n=0;for(let i=x;i<=y;i++)if(rh[i-1])n++;return n},vc=(x,y)=>{let n=0;for(let i=x;i<=y;i++)if(vis[i])n++;return n};
  for(const m of L){const r1=m[0];if(r1>b)break;let r2;
   if(r1<=first)r2=Math.min(m[2],first);else if(r1>=a)r2=Math.min(m[2],b);else continue; // ancla fuera de lo dibujado: sus celdas salen sueltas
   const c1=m[1],c2=Math.min(m[3],C);if(r1===r2&&c1===c2)continue;
   an.set(r1*1e3+c1,[Math.max(1,vr(r1,r2)),Math.max(1,vc(c1,c2))]);
   for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)sk.add(r*1e3+c)}
  // Se piden al Worker las filas que falten; mientras llegan, esas filas salen vacías (con su alto correcto).
  for(let k=(a-1)/CH|0;k<=(b-1)/CH|0;k++)this.fetch(k);
  const ctx={sk,an};let h='';
  for(let r=1;r<=first;r++)h+=this.rowHtml(r,ctx);
  if(a-1>first)h+=this.spacer(this.tops[a-1]-this.tops[first]);
  for(let r=Math.max(a,first+1);r<=b;r++)h+=this.rowHtml(r,ctx);
  if(b<R&&!this.pm)h+=this.spacer(this.tops[R]-this.tops[b]);
  this.tb.innerHTML=h;this.win=[a,b];
  if(this.sel){const t=this.tb.querySelector(`tr[data-r="${this.sel[0]}"] td[data-c="${this.sel[1]}"]`);t&&t.classList.add('sel')}}
 spacer(px){return`<tr class="spr" style="height:${px}px"><td colspan="${this.g.C+1}" style="height:${px}px;padding:0;border:0"></td></tr>`}
 click(e){const td=e.target.closest('td');if(!td||!td.dataset.c)return;const tr=td.parentElement,r=+tr.dataset.r,c=+td.dataset.c;if(!r)return;
  this.tb.querySelector('.sel')?.classList.remove('sel');td.classList.add('sel');this.sel=[r,c];
  const x=(this.rowData(r)||[]).find(q=>q[0]===c);this.fx.value=`${colName(c)}${r}: ${x?(x[4]?'='+x[4]:x[5]!==undefined?x[5]:x[1]):''}`}
 // ---- impresión: se dibujan todas las filas (hasta 10.000) y al terminar se vuelve a la ventana ----
 async prepare(){const g=this.g;if(!g)return;let last=g.R;
  if(last>1e4){if(!confirm(`Esta hoja tiene ${last.toLocaleString('es-CO')} filas. Se imprimirán las primeras 10.000. ¿Continuar?`))throw Object.assign(new Error('cancelado'),{cancel:true});last=1e4}
  const ks=[];for(let k=0;k<=(last-1)/CH|0;k++)ks.push(this.fetch(k));await Promise.all(ks);this.alive();
  this.pm=last;this.render(1,last);
  // Al volver de la impresión (o al tocar de nuevo la pantalla) se regresa a la ventana de filas.
  const back=()=>this.restore();window.addEventListener('afterprint',back,{once:true});document.addEventListener('pointerdown',back,{once:true,capture:true})}
 restore(){if(!this.pm)return;this.pm=0;this.paint(true)}
 printCss(){const g=this.g,s=g.page||{},[a,b]=PS[s.size]||PS[1],ld=s.land,W=ld?b:a,H=ld?a:b,m=s.m||{},L=(m.left??.7)*72,R=(m.right??.7)*72,T=(m.top??.75)*72,B=(m.bottom??.75)*72,
   f=Math.min(1,((W-L-R)/.75)/Math.max(this.lo[g.C],this.spillMax||0));this.ctx.print.size=[W,H];
  return`@page{size:${W}pt ${H}pt;margin:${T}pt ${R}pt ${B}pt ${L}pt}.xlw{zoom:${f.toFixed(3)}!important}`}
}
