// Detecta el formato real de un archivo por su contenido (no por la extensión) y arma errores claros.
export const fail=(userMsg,detail)=>Object.assign(new Error(detail||userMsg),{userMsg});
const has=(u,pat)=>{for(let i=0,n=u.length-pat.length;i<=n;i++){if(u[i]!==pat[0])continue;let j=1;while(j<pat.length&&u[i+j]===pat[j])j++;if(j===pat.length)return true}return false};
export function sniff(buf){const u=new Uint8Array(buf);if(u[0]===0x50&&u[1]===0x4B)return'zip';
 if(u[0]===0xD0&&u[1]===0xCF&&u[2]===0x11&&u[3]===0xE0)return has(u,[...'EncryptedPackage'].flatMap(c=>[c.charCodeAt(0),0]))?'ole-enc':'ole';
 const t=new TextDecoder('latin1').decode(u.subarray(0,300)).replace(/^\uFEFF/,'').trimStart().toLowerCase();
 if(t.startsWith('{\\rtf'))return'rtf';if(/^(<!doctype html|<html|mime-version)/.test(t))return'html';return'other'}
// Un zip completo termina con la firma "fin de directorio central"; si falta, la copia o descarga quedó incompleta.
export function zipCompleto(buf){const u=new Uint8Array(buf);for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(u[i]===0x50&&u[i+1]===0x4B&&u[i+2]===5&&u[i+3]===6)return true;return false}
// Extrae el texto de un RTF (sin formato).
export function rtfTexto(s){let out='',skip=-1,d=0,i=0;const SK=/^(fonttbl|colortbl|stylesheet|info|pict|header|footer|\*)/;
 while(i<s.length){const c=s[i];
  if(c==='{'){d++;i++;if(skip<0&&s[i]==='\\'){const m=/^\\(\*|[a-z]+)/i.exec(s.slice(i,i+20));if(m&&SK.test(m[1]))skip=d}continue}
  if(c==='}'){if(skip===d)skip=-1;d--;i++;continue}
  if(c==='\\'){const n=s[i+1];
   if(n==="'"){if(skip<0)out+=String.fromCharCode(parseInt(s.substr(i+2,2),16));i+=4;continue}
   if(/[a-z]/i.test(n)){const m=/^\\([a-z]+)(-?\d+)? ?/i.exec(s.slice(i,i+40));i+=m[0].length;
    if(skip<0){if(m[1]==='par'||m[1]==='line')out+='\n';else if(m[1]==='tab')out+='\t';else if(m[1]==='u'){out+=String.fromCharCode(+m[2]<0?+m[2]+65536:+m[2]);i++}}continue}
   if(skip<0&&'\\{}'.includes(n))out+=n;i+=2;continue}
  if(skip<0&&c!=='\r'&&c!=='\n')out+=c;i++}
 return out.replace(/\n{3,}/g,'\n\n').trim()}
