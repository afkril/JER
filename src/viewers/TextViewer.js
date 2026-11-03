import {btn,esc,searchBtn,pinch} from '../utils/ui.js';
import {Viewer} from '../core/Viewer.js';
import {lib} from '../core/Loader.js';
export default class TextViewer extends Viewer{
 async init(){
  const{view,status}=this,{lang}=this.kind;let t=await this.file.text(),big=t.length>2e6,fs=13;this.alive();
  if(lang&&!big)await lib('hljs');this.alive();
  const html=lang&&!big&&hljs.getLanguage(lang)?hljs.highlight(t,{language:lang}).value:esc(t);
  const n=t.split('\n').length;view.innerHTML=`<div class="code"><pre class="g">${Array.from({length:n},(_,i)=>i+1).join('\n')}</pre><pre><code class="hljs">${html}</code></pre></div>`;
  const c=view.firstChild,set=v=>{fs=Math.min(30,Math.max(9,v));c.style.fontSize=fs+'px'},ctx=this.ctx;
  btn(ctx,'−',()=>set(fs-1));btn(ctx,'+',()=>set(fs+1));btn(ctx,'Ajustar',()=>c.classList.toggle('wrap'),'Ajustar líneas');
  btn(ctx,'Copiar',()=>navigator.clipboard.writeText(t).then(()=>status.textContent='Copiado'));searchBtn(ctx);
  pinch(view,()=>view.firstChild,{get:()=>fs,set,min:9,max:30});ctx.print={size:[612,792],css:()=>'@page{size:612pt 792pt;margin:50pt}'};status.textContent=`${n} líneas${big?' · sin resaltado (archivo grande)':''}`}
}
