# Kasir Batang Garing Coffee

Aplikasi kasir berbasis web (PWA). Jalan di tablet Android, PC/laptop, atau HP lewat Chrome/Edge, bisa dipasang ke layar utama seperti aplikasi biasa, dan tetap jalan saat internet mati (transaksi dikirim ke spreadsheet begitu online lagi).

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi kasir (satu file) |
| `manifest.json`, `sw.js`, `icon.svg` | Supaya bisa dipasang sebagai aplikasi dan jalan offline |
| `apps-script/Code.gs` | Kode untuk Google Spreadsheet: rekap otomatis + dashboard pemilik |
| `src/app.html` | Sumber tampilan (dipakai untuk membangun `index.html`) |

## Fitur

1. **Mudah dipakai**: ketuk menu, atur jumlah, Bayar. Tombol uang cepat (uang pas, 50 rb, 100 rb), kembalian langsung muncul.
2. **Printer thermal**: sambung USB atau Bluetooth (ESC/POS, 58 mm/80 mm) dari tab Atur. Tanpa printer tersambung, struk dicetak lewat dialog cetak browser.
3. **Edit menu**: tab Menu, tambah/ubah/hapus, tandai habis dengan satu ketukan.
4. **Tampilan modern**: mode terang/gelap otomatis, cocok di tablet dan HP.
5. **Pantau jarak jauh**: pemilik membuka link dashboard dari HP (omzet hari ini, menu terlaris, transaksi terakhir; diperbarui tiap menit).
6. **Spreadsheet**: setiap transaksi masuk ke sheet `Transaksi` dan `Detail Item`, dengan rekap `Rekap Harian` dan `Rekap Menu`.

## Menyambungkan Google Spreadsheet (sekali saja, ±5 menit)

1. Buat Google Spreadsheet baru, misalnya "Penjualan Batang Garing Coffee".
2. Menu **Extensions → Apps Script**. Hapus isi lama, tempel isi `apps-script/Code.gs`.
3. Ganti `KUNCI` di baris atas dengan kata rahasia sendiri, lalu simpan.
4. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*. Izinkan akses saat diminta.
5. Salin URL yang berakhiran `/exec`.
6. Di aplikasi kasir: tab **Atur**, tempel URL dan kunci yang sama, **Simpan**.
7. Tombol **Buka dashboard pemilik** memberi link untuk HP pemilik.

## Menjalankan

- Coba cepat: buka `index.html` di Chrome.
- Untuk dipakai sungguhan (printer USB/Bluetooth dan pasang ke layar utama butuh HTTPS): unggah folder ini ke hosting statis gratis seperti GitHub Pages, Netlify, atau Cloudflare Pages, lalu buka alamatnya di tablet kasir.

## Setelan untuk Batang Garing Coffee

- Perangkat: tablet Android, buka lewat **Chrome**, lalu menu ⋮ → *Tambahkan ke layar utama*.
- Printer: Bluetooth mini 58 mm. Pasangkan dulu printer di pengaturan Bluetooth tablet (PIN biasanya 0000 atau 1234), lalu di aplikasi ketuk **Sambung printer** dan pilih printernya. Chrome meminta ini sekali setiap aplikasi dibuka ulang.
- Satu outlet: satu spreadsheet dan satu link dashboard pemilik.

## Catatan

- Data menu dan transaksi tersimpan di perangkat kasir (browser). Spreadsheet adalah cadangan dan rekapnya.
- Menu dimulai kosong. Isi lewat tab **Menu → + Tambah menu**; tombol **Simpan & tambah lagi** mempercepat input banyak menu.
- Cadangkan menu lewat Atur → Salin data menu setelah selesai mengisi.
- Bluetooth di iPhone/iPad belum didukung Safari; pakai tablet Android atau PC untuk printer Bluetooth.
