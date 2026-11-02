// Respaldo: texto de cada diapositiva leído directamente del .pptx
export async function slidesText(buf){const zip=await JSZip.loadAsync(buf),num=n=>parseInt(n.match(/\d+/g).pop());
 const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>num(a)-num(b)),out=[];
 for(const n of names){const d=new DOMParser().parseFromString(await zip.file(n).async('string'),'application/xml');
  out.push([...d.getElementsByTagName('a:p')].map(p=>[...p.getElementsByTagName('a:t')].map(t=>t.textContent).join('')).filter(Boolean))}
 return out}
