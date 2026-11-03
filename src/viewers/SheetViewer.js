import {GridViewer} from './GridViewer.js';
// Hojas sin estilos: CSV/TSV (lectura por ventanas), XLS antiguo y ODS (SheetJS), todo en un Worker.
export default class SheetViewer extends GridViewer{
 constructor(...a){super(...a);this.src='src/workers/sheet.worker.js';this.select=true}
 loadArgs(){return[/^(csv|tsv)$/.test(this.kind.ext||'')?'csv':'xls',this.file.name.replace(/\.[^.]+$/,'')]}
}
