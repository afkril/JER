# ZAN_READER
Probar en navegador: `npm run dev` y abrir http://localhost:5173 (en el teléfono: la IP local del equipo, mismo Wi-Fi).
APK: `npm i && npx cap add android && npm run android`, luego Build > Build APK en Android Studio.
Las librerías están en src/vendor (funciona sin conexión): pdf.js, docx-preview, ExcelJS, SheetJS, JSZip y highlight.js.
Recientes: se guardan localmente (IndexedDB, máx. 12) y se pueden borrar desde el inicio.
Arquitectura (v0.4):
- `src/core/Viewer.js`: base común de todos los visores. Listeners, paneles fuera de #view, URLs, observers y workers se registran ahí y se liberan juntos en `dispose()`, incluso si se abre otro archivo mientras uno carga.
- `src/core/Loader.js`: cada librería de `src/vendor` se carga solo al abrir su formato (al arrancar solo se carga `main.js`).
- `src/workers/`: `excel.worker.js` (ExcelJS), `sheet.worker.js` (CSV por ventanas, XLS, ODS) y `word.worker.js` (lector de .doc y conversión de respaldo). El libro vive en el Worker; la pantalla solo recibe las filas que va a dibujar.
- `src/viewers/GridViewer.js`: cuadrícula virtualizada (sin tope de filas), texto largo que se extiende sobre celdas vecinas vacías, combinadas, paneles inmovilizados e impresión.
Formatos: PDF, DOCX, DOC (97-2003), RTF (solo texto), XLSX/XLSM, XLS, ODS, CSV/TSV, PPTX, texto/código, HTML e imágenes.
Límites conocidos: .doc sin encabezados/pies, sin formas flotantes, listas con viñeta genérica y tablas sin celdas combinadas; hojas de más de 200 columnas se recortan a 200; al imprimir una hoja se dibujan hasta 10.000 filas.
Pendiente: gráficas de Word y Excel, PPT antiguo, ODT/ODP, "Abrir con" para más formatos.
Android: aparece en "Abrir con…" y "Compartir" para PDF, Word, Excel, CSV, texto, HTML e imágenes. Imprimir usa el servicio de impresión de Android (permite "Guardar como PDF"); Descargar abre el menú de compartir/guardar. El botón Atrás cierra el documento y, sin documento, sale de la app.
