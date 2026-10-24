package id.batanggaring.kasir;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

// Jembatan antara kasir web (JavaScript, objek window.BGApp) dan Android.
// Setiap perintah yang lama (sambung printer, cetak) berjalan di latar belakang
// lalu menjawab lewat window.__bgDone(id, berhasil, data) supaya layar tidak macet.
@SuppressLint("MissingPermission") // izin Bluetooth diminta lewat MainActivity.withBluetoothPermission
public class NativeBridge {
    static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    // layanan BLE yang biasa dipakai printer thermal mini (sama dengan BT_SV di kasir web)
    static final String[] BLE_SERVICES = {"000018f0-0000-1000-8000-00805f9b34fb", "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
            "0000ff00-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455"};

    final MainActivity act;
    final Handler ui = new Handler(Looper.getMainLooper());
    final ExecutorService bt = Executors.newSingleThreadExecutor(); // semua kerja printer berurutan di sini
    final BluetoothAdapter adapter;

    // sambungan printer yang aktif: Bluetooth klasik (SPP) atau BLE (GATT)
    String address;
    BluetoothSocket sock;
    OutputStream out;
    BluetoothGatt gatt;
    BluetoothGattCharacteristic ch;
    volatile CountDownLatch gattStep;
    volatile boolean gattOk;
    int mtu = 23;

    NativeBridge(MainActivity act) {
        this.act = act;
        BluetoothManager m = (BluetoothManager) act.getSystemService(Context.BLUETOOTH_SERVICE);
        adapter = m == null ? null : m.getAdapter();
    }

    // ---------- jawaban ke JavaScript ----------

    void reply(String id, boolean ok, String json) {
        String js = "window.__bgDone&&window.__bgDone(" + JSONObject.quote(id) + "," + ok + "," + json + ")";
        ui.post(() -> act.web.evaluateJavascript(js, null));
    }

    void ok(String id, String json) { reply(id, true, json); }

    void fail(String id, String msg) { reply(id, false, JSONObject.quote(msg)); }

    void event(String name) {
        ui.post(() -> act.web.evaluateJavascript("window.__bgEvent&&window.__bgEvent(" + JSONObject.quote(name) + ")", null));
    }

    void toast(String msg) { ui.post(() -> Toast.makeText(act, msg, Toast.LENGTH_LONG).show()); }

    // ---------- info umum ----------

    @JavascriptInterface
    public String info() {
        try {
            return new JSONObject().put("version", MainActivity.BuildInfo.version(act))
                    .put("bluetooth", adapter != null).toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void copy(String text) {
        ui.post(() -> {
            ClipboardManager cm = (ClipboardManager) act.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Kasir Batang Garing", text));
        });
    }

    @JavascriptInterface
    public void print() { ui.post(act::printPage); }

    @JavascriptInterface
    public void openUrl(String url) { ui.post(() -> act.openExternal(url)); }

    // simpan teks (cadangan data) ke folder Download tablet
    @JavascriptInterface
    public void saveFile(String name, String mime, String text, String id) {
        bt.execute(() -> {
            try {
                byte[] data = text.getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri u = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (u == null) throw new IOException("folder Download tidak bisa dibuka");
                    try (OutputStream o = act.getContentResolver().openOutputStream(u)) {
                        if (o == null) throw new IOException("file tidak bisa ditulis");
                        o.write(data);
                    }
                } else {
                    // Android 9 ke bawah: coba folder Download, kalau tidak diizinkan simpan di folder aplikasi
                    File f = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), name);
                    try (FileOutputStream o = new FileOutputStream(f)) {
                        o.write(data);
                    } catch (IOException e) {
                        f = new File(act.getExternalFilesDir(null), name);
                        try (FileOutputStream o = new FileOutputStream(f)) { o.write(data); }
                        ok(id, JSONObject.quote(f.getAbsolutePath()));
                        return;
                    }
                }
                ok(id, JSONObject.quote("Download/" + name));
            } catch (Exception e) {
                fail(id, "Gagal menyimpan file: " + e.getMessage());
            }
        });
    }

    // ---------- printer Bluetooth ----------

    // jalankan kerja Bluetooth setelah izin ada dan Bluetooth tablet menyala
    void withBluetooth(String id, Runnable work) {
        if (adapter == null) { fail(id, "Tablet ini tidak punya Bluetooth"); return; }
        ui.post(() -> act.withBluetoothPermission(() -> {
            if (!adapter.isEnabled()) {
                try { act.startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)); } catch (Exception ignored) { }
                fail(id, "Bluetooth tablet masih mati. Nyalakan Bluetooth lalu coba lagi.");
                return;
            }
            bt.execute(work);
        }, () -> fail(id, "Izin Bluetooth ditolak. Buka Pengaturan > Aplikasi > Batang Garing > Izin, lalu izinkan Perangkat sekitar.")));
    }

    static JSONObject dev(BluetoothDevice d, boolean paired) throws Exception {
        String n = d.getName();
        return new JSONObject().put("name", n == null || n.isEmpty() ? d.getAddress() : n)
                .put("address", d.getAddress()).put("paired", paired);
    }

    // printer yang sudah dipasangkan (pairing) di pengaturan Bluetooth tablet
    @JavascriptInterface
    public void btList(String id) {
        withBluetooth(id, () -> {
            try {
                JSONArray a = new JSONArray();
                for (BluetoothDevice d : adapter.getBondedDevices()) a.put(dev(d, true));
                ok(id, a.toString());
            } catch (Exception e) {
                fail(id, "Gagal membaca daftar Bluetooth: " + e.getMessage());
            }
        });
    }

    // cari printer di sekitar selama ~10 detik (Bluetooth klasik dan BLE)
    @JavascriptInterface
    public void btScan(String id) {
        withBluetooth(id, () -> {
            Map<String, JSONObject> found = new LinkedHashMap<>();
            BroadcastReceiver rx = new BroadcastReceiver() {
                @Override
                public void onReceive(Context c, Intent i) {
                    BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (d != null) add(found, d);
                }
            };
            ScanCallback le = new ScanCallback() {
                @Override
                public void onScanResult(int type, ScanResult r) { add(found, r.getDevice()); }
            };
            BluetoothLeScanner scanner = adapter.getBluetoothLeScanner();
            try {
                act.registerReceiver(rx, new IntentFilter(BluetoothDevice.ACTION_FOUND));
                adapter.startDiscovery();
                if (scanner != null) scanner.startScan(le);
                Thread.sleep(10000);
            } catch (Exception ignored) {
            } finally {
                try { adapter.cancelDiscovery(); } catch (Exception ignored) { }
                try { if (scanner != null) scanner.stopScan(le); } catch (Exception ignored) { }
                try { act.unregisterReceiver(rx); } catch (Exception ignored) { }
            }
            JSONArray a = new JSONArray();
            synchronized (found) { for (JSONObject o : found.values()) a.put(o); }
            ok(id, a.toString());
        });
    }

    static void add(Map<String, JSONObject> found, BluetoothDevice d) {
        synchronized (found) {
            JSONObject old = found.get(d.getAddress());
            // perangkat tanpa nama biasanya bukan printer; simpan yang bernama saja
            if (d.getName() == null || (old != null && !old.optString("name").equals(d.getAddress()))) return;
            try { found.put(d.getAddress(), dev(d, d.getBondState() == BluetoothDevice.BOND_BONDED)); } catch (Exception ignored) { }
        }
    }

    @JavascriptInterface
    public void btConnect(String addr, String id) {
        withBluetooth(id, () -> {
            try {
                open(addr);
                BluetoothDevice d = adapter.getRemoteDevice(addr);
                ok(id, dev(d, true).toString());
            } catch (Exception e) {
                close();
                fail(id, "Printer tidak tersambung. Pastikan printer menyala dan dekat tablet. (" + e.getMessage() + ")");
            }
        });
    }

    // kirim data ESC/POS (base64); kalau sambungan putus, sambung ulang sekali lalu kirim lagi
    @JavascriptInterface
    public void btWrite(String b64, String id) {
        byte[] data = Base64.decode(b64, Base64.DEFAULT);
        bt.execute(() -> {
            if (address == null) { fail(id, "Printer belum tersambung"); return; }
            try {
                write(data);
                ok(id, "true");
            } catch (Exception first) {
                String addr = address;
                try {
                    close();
                    open(addr);
                    write(data);
                    ok(id, "true");
                } catch (Exception e) {
                    close();
                    address = addr; // tetap ingat printernya supaya cetak berikutnya mencoba lagi
                    event("btlost");
                    fail(id, "Printer terputus: " + e.getMessage());
                }
            }
        });
    }

    @JavascriptInterface
    public void btClose() {
        bt.execute(() -> { close(); address = null; });
    }

    void open(String addr) throws Exception {
        close();
        BluetoothDevice d = adapter.getRemoteDevice(addr);
        try { adapter.cancelDiscovery(); } catch (Exception ignored) { }
        Exception err = null;
        if (d.getType() != BluetoothDevice.DEVICE_TYPE_LE) {
            try { openSpp(d); address = addr; return; } catch (Exception e) { err = e; }
        }
        if (d.getType() != BluetoothDevice.DEVICE_TYPE_CLASSIC) {
            try { openGatt(d); address = addr; return; } catch (Exception e) { err = e; }
        }
        throw err != null ? err : new IOException("jenis Bluetooth tidak dikenali");
    }

    void openSpp(BluetoothDevice d) throws Exception {
        BluetoothSocket s = null;
        try {
            s = d.createRfcommSocketToServiceRecord(SPP);
            s.connect();
        } catch (IOException e) {
            try { if (s != null) s.close(); } catch (IOException ignored) { }
            // banyak printer murah butuh cara lama: langsung ke kanal 1
            Method m = d.getClass().getMethod("createRfcommSocket", int.class);
            s = (BluetoothSocket) m.invoke(d, 1);
            s.connect();
        }
        sock = s;
        out = s.getOutputStream();
    }

    boolean waitStep(int sec) throws InterruptedException {
        CountDownLatch l = gattStep;
        return l != null && l.await(sec, TimeUnit.SECONDS) && gattOk;
    }

    void step() { gattStep = new CountDownLatch(1); gattOk = false; }

    void done(boolean ok) { gattOk = ok; CountDownLatch l = gattStep; if (l != null) l.countDown(); }

    final BluetoothGattCallback gattCb = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int state) {
            if (state == BluetoothProfile.STATE_CONNECTED) done(true);
            else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                done(false);
                if (g == gatt) event("btlost");
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) { done(status == BluetoothGatt.GATT_SUCCESS); }

        @Override
        public void onMtuChanged(BluetoothGatt g, int m, int status) {
            if (status == BluetoothGatt.GATT_SUCCESS) mtu = m;
            done(true);
        }

        @Override
        public void onCharacteristicWrite(BluetoothGatt g, BluetoothGattCharacteristic c, int status) {
            done(status == BluetoothGatt.GATT_SUCCESS);
        }
    };

    void openGatt(BluetoothDevice d) throws Exception {
        mtu = 23;
        step();
        gatt = Build.VERSION.SDK_INT >= 23 ? d.connectGatt(act, false, gattCb, BluetoothDevice.TRANSPORT_LE)
                : d.connectGatt(act, false, gattCb);
        if (gatt == null || !waitStep(15)) throw new IOException("tidak menjawab");
        step();
        if (!gatt.discoverServices() || !waitStep(15)) throw new IOException("layanan printer tidak terbaca");
        ch = null;
        for (String uuid : BLE_SERVICES) {
            BluetoothGattService s = gatt.getService(UUID.fromString(uuid));
            if (s != null && (ch = writable(s)) != null) break;
        }
        if (ch == null) for (BluetoothGattService s : gatt.getServices()) if ((ch = writable(s)) != null) break;
        if (ch == null) throw new IOException("karakteristik tulis tidak ditemukan");
        if (Build.VERSION.SDK_INT >= 21) {
            step();
            if (gatt.requestMtu(185)) waitStep(5);
        }
    }

    static BluetoothGattCharacteristic writable(BluetoothGattService s) {
        for (BluetoothGattCharacteristic c : s.getCharacteristics()) {
            int p = c.getProperties();
            if ((p & (BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0) return c;
        }
        return null;
    }

    @SuppressWarnings("deprecation")
    void write(byte[] data) throws Exception {
        if (out != null) {
            out.write(data);
            out.flush();
            return;
        }
        if (gatt == null || ch == null) throw new IOException("belum tersambung");
        boolean noResp = (ch.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0;
        ch.setWriteType(noResp ? BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE : BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
        int size = Math.max(20, Math.min(mtu - 3, 180));
        for (int i = 0; i < data.length; i += size) {
            byte[] part = new byte[Math.min(size, data.length - i)];
            System.arraycopy(data, i, part, 0, part.length);
            ch.setValue(part);
            step();
            if (!gatt.writeCharacteristic(ch)) {
                Thread.sleep(30); // antrian Bluetooth penuh, tunggu sebentar lalu ulang sekali
                step();
                if (!gatt.writeCharacteristic(ch)) throw new IOException("gagal mengirim ke printer");
            }
            if (!waitStep(5)) throw new IOException("printer tidak menjawab");
        }
    }

    void close() {
        try { if (sock != null) sock.close(); } catch (IOException ignored) { }
        sock = null;
        out = null;
        BluetoothGatt g = gatt;
        gatt = null;
        ch = null;
        if (g != null) {
            try { g.disconnect(); g.close(); } catch (Exception ignored) { }
        }
    }

    void shutdown() {
        bt.execute(this::close);
        bt.shutdown();
    }
}
