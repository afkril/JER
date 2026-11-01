// Documentos recientes: copia local (IndexedDB) para poder reabrirlos desde el inicio.
const S='recent',db=()=>new Promise((ok,no)=>{const r=indexedDB.open('zan_reader',1);r.onupgradeneeded=()=>r.result.createObjectStore(S,{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=async(m,fn)=>{const d=await db();return new Promise((ok,no)=>{const t=d.transaction(S,m),q=fn(t.objectStore(S));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})};
export const listRecent=async()=>((await tx('readonly',s=>s.getAll()))||[]).sort((a,b)=>b.t-a.t);
export const removeRecent=id=>tx('readwrite',s=>s.delete(id));
export const clearRecent=()=>tx('readwrite',s=>s.clear());
export async function addRecent(f){await tx('readwrite',s=>s.put({id:f.name+'|'+f.size,name:f.name,size:f.size,type:f.type,t:Date.now(),blob:f}));
 for(const r of (await listRecent()).slice(12))await removeRecent(r.id)}
