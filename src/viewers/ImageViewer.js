import {btn,pinch} from '../utils/ui.js';
export async function open(file,ctx){
 const {view,status}=ctx,u=URL.createObjectURL(file);view.innerHTML=`<div class="img"><img alt="" src="${u}"></div>`;const i=view.querySelector('img');let z=1,r=0;
 const ap=()=>{i.style.width=z*100+'%';i.style.maxWidth=z>1?'none':'100%';i.style.transform=`rotate(${r}deg)`;status.textContent=`Zoom ${Math.round(z*100)}%`};
 btn(ctx,'−',()=>{z=Math.max(.2,z-.25);ap()});btn(ctx,'+',()=>{z=Math.min(8,z+.25);ap()});btn(ctx,'Ajustar',()=>{z=1;ap()});
 btn(ctx,'Girar',()=>{r=(r+90)%360;ap()});pinch(view,k=>{z=Math.min(8,Math.max(.2,z*k));ap()});
 i.ondblclick=()=>{z=z>1?1:2.5;ap()};ap();return()=>URL.revokeObjectURL(u)}
