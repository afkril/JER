# ZAN_READER
Probar en navegador: `npm run dev` y abrir http://localhost:5173 (en el teléfono: la IP local del equipo, mismo Wi-Fi).
APK: `npm i && npx cap add android && npm run android`, luego Build > Build APK en Android Studio.
Las librerías están en src/vendor (funciona sin conexión): pdf.js, docx-preview, ExcelJS, SheetJS, JSZip y highlight.js.
Pendiente: gráficas de Word y Excel, PPT/PPTX, DOC, RTF y ODF, selector nativo y "Abrir con" de Android.
Android: aparece en "Abrir con…" y "Compartir" para PDF, Word, Excel, CSV, texto, HTML e imágenes. Imprimir usa el servicio de impresión de Android (permite "Guardar como PDF"); Descargar abre el menú de compartir/guardar. El botón Atrás cierra el documento y, sin documento, sale de la app.
