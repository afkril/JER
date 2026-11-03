import {btn,esc} from '../utils/ui.js';
import {Viewer} from '../core/Viewer.js';
export default class HtmlViewer extends Viewer{
 async init(){
  const{view,status}=this,t=await this.file.text();this.alive();let mode='prev',w='100%';
  const draw=()=>{if(mode==='prev'){view.innerHTML=`<iframe sandbox="" referrerpolicy="no-referrer" style="max-width:${w}"></iframe>`;view.firstChild.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">`+t}
   else view.innerHTML=`<pre style="margin:0;padding:12px;white-space:pre-wrap;font:13px ui-monospace,monospace">${esc(t)}</pre>`;status.textContent=mode==='prev'?'Vista previa aislada (sin scripts)':'Código fuente'};
  const ctx=this.ctx;btn(ctx,'Vista previa',()=>{mode='prev';draw()});btn(ctx,'Código',()=>{mode='src';draw()});
  btn(ctx,'Móvil',()=>{w='390px';mode='prev';draw()});btn(ctx,'Tablet',()=>{w='820px';mode='prev';draw()});btn(ctx,'Escritorio',()=>{w='100%';mode='prev';draw()});draw()}
}
