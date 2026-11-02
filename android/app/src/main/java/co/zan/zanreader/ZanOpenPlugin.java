package co.zan.zanreader;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintDocumentInfo;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "ZanOpen")
public class ZanOpenPlugin extends Plugin {
    private static JSObject pending;
    private static ZanOpenPlugin inst;

    @Override
    public void load() {
        inst = this;
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject r = pending != null ? pending : new JSObject();
        pending = null;
        call.resolve(r);
    }

    @PluginMethod
    public void print(final PluginCall call) {
        final Double w = call.getDouble("w");
        final Double h = call.getDouble("h");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView wv = getBridge().getWebView();
                PrintDocumentAdapter ad = wv.createPrintDocumentAdapter("ZAN_READER");
                PrintAttributes.Builder pb = new PrintAttributes.Builder();
                if (w != null && h != null && w > 0 && h > 0) {
                    int a = (int) Math.round(Math.min(w, h) / 72 * 1000);
                    int b = (int) Math.round(Math.max(w, h) / 72 * 1000);
                    PrintAttributes.MediaSize ms = new PrintAttributes.MediaSize("zan_original", "Tamaño original", a, b);
                    pb.setMediaSize(w > h ? ms.asLandscape() : ms);
                    pb.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                }
                pm.print("ZAN_READER", ad, pb.build());
                call.resolve();
            } catch (Exception e) {
                call.reject("print_failed");
            }
        });
    }

    /** Imprime el PDF original, sin volver a dibujarlo, para conservar tamaño y orientación de cada página. */
    @PluginMethod
    public void printPdf(final PluginCall call) {
        final String path = call.getString("path");
        final int pages = call.getInt("pages", 0);
        if (path == null) {
            call.reject("sin_ruta");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                final File f = new File(path);
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter ad = new PrintDocumentAdapter() {
                    @Override
                    public void onLayout(PrintAttributes oldA, PrintAttributes newA, CancellationSignal cs, LayoutResultCallback cb, Bundle extras) {
                        if (cs.isCanceled()) {
                            cb.onLayoutCancelled();
                            return;
                        }
                        PrintDocumentInfo.Builder bd = new PrintDocumentInfo.Builder(f.getName()).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT);
                        if (pages > 0) bd.setPageCount(pages);
                        cb.onLayoutFinished(bd.build(), true);
                    }

                    @Override
                    public void onWrite(PageRange[] ranges, ParcelFileDescriptor dest, CancellationSignal cs, WriteResultCallback cb) {
                        try (InputStream in = new FileInputStream(f); OutputStream os = new FileOutputStream(dest.getFileDescriptor())) {
                            byte[] buf = new byte[65536];
                            int n;
                            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                            cb.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                        } catch (Exception e) {
                            cb.onWriteFailed(e.toString());
                        }
                    }
                };
                pm.print(f.getName(), ad, null);
                call.resolve();
            } catch (Exception e) {
                call.reject("print_failed");
            }
        });
    }

    /** Borra las copias temporales de sesiones anteriores. */
    static void clean(Context ctx) {
        File[] list = new File(ctx.getCacheDir(), "zan_open").listFiles();
        if (list != null) for (File f : list) f.delete();
    }

    /** Copia el archivo recibido (Abrir con / Compartir) a la caché y avisa a la interfaz web. */
    static void ingest(Activity a, Intent i) {
        if (i == null || (i.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        Uri u = null;
        String act = i.getAction();
        if (Intent.ACTION_VIEW.equals(act)) u = i.getData();
        else if (Intent.ACTION_SEND.equals(act)) u = (Uri) i.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null) return;

        String name = null;
        try (Cursor c = a.getContentResolver().query(u, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int k = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (k >= 0) name = c.getString(k);
            }
        } catch (Exception ignored) {
        }
        if (name == null || name.isEmpty()) name = u.getLastPathSegment() != null ? u.getLastPathSegment() : "documento";
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\\\:*?\"<>|]", "_");

        File dir = new File(a.getCacheDir(), "zan_open");
        dir.mkdirs();
        File out = new File(dir, System.currentTimeMillis() + "_" + name);
        try (InputStream in = a.getContentResolver().openInputStream(u); OutputStream os = new FileOutputStream(out)) {
            if (in == null) return;
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
        } catch (Exception e) {
            return;
        }

        JSObject r = new JSObject();
        r.put("path", out.getAbsolutePath());
        r.put("name", name);
        r.put("mime", a.getContentResolver().getType(u));
        pending = r;
        if (inst != null) inst.notifyListeners("fileOpened", r, true);
    }
}
