import {btn,pinch} from '../utils/ui.js';
export async function open(file,ctx){
 const {view,status}=ctx,u=URL.createObjectURL(file);view.innerHTML=`<div class="img"><div class="ib"><img alt="" src="${u}"></div></div>`;const i=view.querySelector('img');let z=1,r=0;
 const ap=()=>{i.style.maxWidth='none';i.style.width=Math.round((view.clientWidth-16)*z)+'px';i.style.transform=`rotate(${r}deg)`;status.textContent=`Zoom ${Math.round(z*100)}%`},set=v=>{z=Math.min(8,Math.max(.2,v));ap()};
 btn(ctx,'−',()=>set(z-.25),'Reducir');btn(ctx,'+',()=>set(z+.25),'Ampliar');btn(ctx,'Ajustar',()=>set(1),'Ajustar a pantalla');btn(ctx,'Girar',()=>{r=(r+90)%360;ap()});
 pinch(view,()=>view.querySelector('.ib'),{get:()=>z,set,min:.2,max:8});i.ondblclick=()=>set(z>1?1:2.5);ctx.print={css:()=>{let w=(i.naturalWidth||794)*.75,h=(i.naturalHeight||1123)*.75;const k=Math.min(1,1190/Math.max(w,h));w*=k;h*=k;ctx.print.size=[w,h];return`@page{size:${w.toFixed(1)}pt ${h.toFixed(1)}pt;margin:0}.ib img{width:100%!important;height:auto!important;transform:none!important}.img,.ib{margin:0!important;display:block}`}};ap();return()=>URL.revokeObjectURL(u)}
