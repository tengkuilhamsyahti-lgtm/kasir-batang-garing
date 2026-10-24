package id.batanggaring.kasir;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Aplikasi kasir Batang Garing: menampilkan kasir web di WebView milik aplikasi sendiri,
// jadi tidak butuh Chrome. File kasir dibawa di dalam APK, jadi jalan tanpa internet sejak awal. Printer Bluetooth, simpan file, salin teks, dan cetak
// lewat jembatan native (NativeBridge) karena WebView tidak punya Web Bluetooth.
public class MainActivity extends Activity {
    static final int REQ_FILE = 11, REQ_PERM = 12;

    WebView web;
    NativeBridge bridge;
    String siteUrl;
    ValueCallback<Uri[]> fileCb;
    Runnable permOk, permFail;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        siteUrl = getString(R.string.site_url);
        getWindow().setStatusBarColor(getResources().getColor(R.color.brand));
        getWindow().setNavigationBarColor(getResources().getColor(R.color.brand));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#F3F6E9"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " BatangGaringApp/" + BuildInfo.version(this));

        bridge = new NativeBridge(this);
        web.addJavascriptInterface(bridge, "BGApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        // permintaan dari service worker lama juga dilayani dari dalam APK
        if (Build.VERSION.SDK_INT >= 24) {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest r) { return local(r.getUrl()); }
            });
        }

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(siteUrl);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        bridge.shutdown();
        web.destroy();
        super.onDestroy();
    }

    boolean isOwnPage(Uri u) {
        Uri site = Uri.parse(siteUrl);
        return "https".equals(u.getScheme()) && site.getHost().equals(u.getHost())
                && u.getPath() != null && u.getPath().startsWith(site.getPath());
    }

    // File kasir (index.html, ikon, manifest) ada di dalam APK (assets/www, disalin saat build).
    // Alamatnya tetap alamat GitHub Pages supaya data yang tersimpan (localStorage) tetap sama.
    WebResourceResponse local(Uri u) {
        if (!isOwnPage(u)) return null;
        String path = u.getPath().substring(Uri.parse(siteUrl).getPath().length());
        if (path.isEmpty() || path.endsWith("/")) path += "index.html";
        try {
            InputStream in = getAssets().open("www/" + path);
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(path));
            if (path.endsWith(".json")) mime = "application/json";
            if (path.endsWith(".svg")) mime = "image/svg+xml";
            if (mime == null) mime = "application/octet-stream";
            boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("xml");
            WebResourceResponse res = new WebResourceResponse(mime, text ? "utf-8" : null, in);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            res.setResponseHeaders(h);
            return res;
        } catch (IOException e) {
            return null; // file tidak ada di APK: ambil dari internet
        }
    }

    // WhatsApp, tautan luar, dan skema lain dibuka di aplikasi yang sesuai
    void openExternal(String url) {
        try {
            Intent i = url.startsWith("intent:") ? Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            bridge.toast("Tidak ada aplikasi untuk membuka tautan ini");
        }
    }

    // window.print(): cetak lewat layanan cetak Android (cadangan kalau printer Bluetooth tidak ada)
    void printPage() {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        if (pm == null) return;
        pm.print("Struk Batang Garing", web.createPrintDocumentAdapter("Struk Batang Garing"),
                new PrintAttributes.Builder().build());
    }

    // izin Bluetooth diminta saat pertama kali menyambung printer
    void withBluetoothPermission(Runnable ok, Runnable fail) {
        List<String> need = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            need.add(Manifest.permission.BLUETOOTH_CONNECT);
            need.add(Manifest.permission.BLUETOOTH_SCAN);
        } else if (Build.VERSION.SDK_INT >= 23) {
            need.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        List<String> missing = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 23)
            for (String p : need) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
        if (missing.isEmpty()) { ok.run(); return; }
        permOk = ok;
        permFail = fail;
        requestPermissions(missing.toArray(new String[0]), REQ_PERM);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req != REQ_PERM) return;
        boolean connectOk = true;
        for (int i = 0; i < perms.length; i++) {
            // izin lokasi (Android lama) hanya untuk mencari printer baru, jadi tidak wajib
            boolean optional = Manifest.permission.ACCESS_FINE_LOCATION.equals(perms[i]);
            if (res[i] != PackageManager.PERMISSION_GRANTED && !optional) connectOk = false;
        }
        Runnable r = connectOk ? permOk : permFail;
        permOk = permFail = null;
        if (r != null) r.run();
    }

    @Override
    protected void onActivityResult(int req, int code, Intent data) {
        if (req == REQ_FILE && fileCb != null) {
            Uri[] r = null;
            if (code == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
            fileCb.onReceiveValue(r);
            fileCb = null;
            return;
        }
        super.onActivityResult(req, code, data);
    }

    class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return local(r.getUrl()); }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            if (isOwnPage(r.getUrl())) return false;
            openExternal(r.getUrl().toString());
            return true;
        }

        @Override
        public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
            if (!r.isForMainFrame()) return;
            v.loadDataWithBaseURL(null, "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                    + "<body style='font-family:sans-serif;background:#f3f6e9;color:#13211a;display:grid;place-items:center;height:90vh;text-align:center'>"
                    + "<div><h2>Kasir belum bisa dibuka</h2><p>Sambungkan tablet ke internet untuk pembukaan pertama.<br>Setelah itu kasir tetap jalan walau internet mati.</p>"
                    + "<button style='font-size:18px;padding:12px 24px;border:0;border-radius:12px;background:#1d6b45;color:#fff' onclick=\"location.href='"
                    + siteUrl + "'\">Coba lagi</button></div>", "text/html", "utf-8", null);
        }
    }

    class Chrome extends WebChromeClient {
        // window.open (mis. wa.me untuk laporan shift): tangkap alamatnya lalu buka di aplikasi luar
        @Override
        public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message msg) {
            WebView tmp = new WebView(MainActivity.this);
            tmp.setWebViewClient(new WebViewClient() {
                boolean done;

                void take(WebView w, String url) {
                    if (done || url == null || url.startsWith("about:")) return;
                    done = true;
                    Uri u = Uri.parse(url);
                    if (isOwnPage(u)) web.loadUrl(url);
                    else openExternal(url);
                    w.stopLoading();
                    w.post(w::destroy);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest r) {
                    take(w, r.getUrl().toString());
                    return true;
                }

                @Override
                public void onPageStarted(WebView w, String url, android.graphics.Bitmap icon) {
                    take(w, url);
                }
            });
            ((WebView.WebViewTransport) msg.obj).setWebView(tmp);
            msg.sendToTarget();
            return true;
        }

        // <input type="file"> (muat file menu / pulihkan cadangan)
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCb != null) fileCb.onReceiveValue(null);
            fileCb = cb;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            try {
                startActivityForResult(Intent.createChooser(i, "Pilih file"), REQ_FILE);
            } catch (ActivityNotFoundException e) {
                fileCb = null;
                return false;
            }
            return true;
        }
    }

    static class BuildInfo {
        static String version(Activity a) {
            try {
                return a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "0";
            }
        }
    }
}
