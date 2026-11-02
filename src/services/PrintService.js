// Imprime el PDF original (conserva tamaño y orientación de cada página) con el visor de PDF del navegador.
export function printPdfWeb(file){const u=URL.createObjectURL(new Blob([file],{type:'application/pdf'})),f=document.createElement('iframe');
 f.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';f.src=u;
 f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){window.open(u)}};document.body.append(f);
 setTimeout(()=>{f.remove();URL.revokeObjectURL(u)},3e5)}
