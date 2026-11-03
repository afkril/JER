// Base común de todos los visores.
// Todo lo que un visor engancha al mundo exterior (listeners, elementos fuera de #view, URLs, observers, workers)
// se registra aquí y se libera de una sola vez en dispose(). Así, si se abre otro documento mientras este aún
// carga, nada queda colgado: lo que se registre después de dispose() se libera al instante.
export class Stale extends Error{constructor(){super('visor descartado');this.stale=true}}
export class Viewer{
 constructor(file,ctx,kind){this.file=file;this.ctx=ctx;this.kind=kind||{};this.disposed=false;this._free=[]}
 get view(){return this.ctx.view} get tools(){return this.ctx.tools} get bottom(){return this.ctx.bottom} get status(){return this.ctx.status}
 // El anfitrión crea el visor, lo registra como activo y luego llama a start(): así puede descartarlo aunque aún esté cargando.
 async start(){try{await this.init()}catch(e){this.dispose();throw e}return this}
 async init(){}
 // Cede la apertura a otro visor (p. ej. un .docx que en realidad es HTML). El visor hijo se descarta junto con este.
 async delegate(path,kind){const M=(await import(path)).default;this.alive();const v=new M(this.file,this.ctx,kind||this.kind);this.onDispose(()=>v.dispose());await v.start();return v}
 // Tras cada await largo: si ya no somos el visor activo, se corta la carga.
 alive(){if(this.disposed)throw new Stale();return this}
 async guard(p){const r=await p;this.alive();return r}
 onDispose(fn){if(this.disposed)try{fn()}catch(e){}else this._free.push(fn);return fn}
 on(t,ev,fn,o){t.addEventListener(ev,fn,o);return this.onDispose(()=>t.removeEventListener(ev,fn,o))}
 // Elemento que vive fuera de #view (p. ej. un panel en <body>): se quita al cerrar.
 own(el,parent=document.body){parent.append(el);this.onDispose(()=>el.remove());return el}
 url(blob){const u=URL.createObjectURL(blob);this.onDispose(()=>URL.revokeObjectURL(u));return u}
 observe(Ctor,cb,o){const x=new Ctor(cb,o);this.onDispose(()=>x.disconnect());return x}
 worker(src){const w=new Worker(src);this.onDispose(()=>w.terminate());return w}
 timer(fn,ms){const t=setTimeout(fn,ms);this.onDispose(()=>clearTimeout(t));return t}
 dispose(){if(this.disposed)return;this.disposed=true;for(const f of this._free.splice(0).reverse())try{f()}catch(e){console.warn('dispose',e)}}
}
// Pequeño cliente para hablar con un Worker por mensajes con respuesta (promesas).
export class Rpc{
 constructor(viewer,src){this.n=0;this.p=new Map();this.w=viewer.worker(src);
  this.w.onmessage=e=>{const{id,ok,data,error}=e.data,h=this.p.get(id);if(!h)return;this.p.delete(id);ok?h.ok(data):h.no(Object.assign(new Error(error.message),error))};
  this.w.onerror=e=>{const x=new Error(e.message||'error en el procesamiento');for(const h of this.p.values())h.no(x);this.p.clear()};
  viewer.onDispose(()=>{const x=new Stale();for(const h of this.p.values())h.no(x);this.p.clear()})}
 call(op,args,transfer){return new Promise((ok,no)=>{const id=++this.n;this.p.set(id,{ok,no});this.w.postMessage({id,op,args},transfer||[])})}
}
