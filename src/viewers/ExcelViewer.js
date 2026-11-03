import {GridViewer,Fallback} from './GridViewer.js';
import {sniff,fail} from '../utils/sniff.js';
// Excel moderno (.xlsx/.xlsm): ExcelJS en un Worker (estilos, combinadas, paneles, imágenes).
// Si no es un .xlsx real (xls antiguo, CSV con otra extensión) o ExcelJS no puede leerlo, se usa el lector alterno.
export default class ExcelViewer extends GridViewer{
 constructor(...a){super(...a);this.src='src/workers/excel.worker.js';this.formulas=true}
 check(buf){const k=sniff(buf);if(k==='ole-enc')throw fail('El libro está protegido con contraseña (cifrado de Office). Quita la contraseña en Excel y vuelve a abrirlo.');if(k!=='zip')throw new Fallback()}
 async init(){
  try{await this.load()}catch(e){if(e.stale||(e.userMsg&&!(e instanceof Fallback)))throw e;if(!(e instanceof Fallback))console.warn('ExcelJS no pudo leer el libro; se usa el lector alterno',e);
   this.rpc&&this.rpc.w.terminate();return this.delegate('./SheetViewer.js')}
  await this.show()}
}
