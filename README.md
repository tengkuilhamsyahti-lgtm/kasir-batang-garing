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

## Login kasir & shift

- **Pertama kali dibuka:** buat akun pemilik (nama + PIN 6 angka). Aplikasi lalu menampilkan **kode pemulihan** satu kali. Catat kode itu; hanya kode itu yang bisa mengatur ulang PIN pemilik kalau lupa.
- **Tambah kasir:** Atur → Pengguna & keamanan → **+ Tambah kasir**. Setiap kasir punya PIN 6 angka sendiri.
- **Mulai shift:** kasir memilih namanya, mengetik PIN 6 angka di tombol angka (langsung masuk begitu angka ke-6 diketik), lalu mengisi modal awal di laci. Pembayaran hanya bisa diterima saat ada shift terbuka. Nama kasir tercetak di struk.
- **Tutup shift:** ketuk nama di pojok kiri bawah → **Tutup shift**. Kasir menghitung uang di laci tanpa melihat angka sistem, lalu aplikasi menampilkan selisih kas dan bisa mencetak rekap shift.
- **Hak akses:** kasir hanya bisa membuka Kasir dan Laporan. Menu, Pengaturan, dan Riwayat shift hanya untuk pemilik.
- **PIN 6 angka:** akun yang dibuat sebelum aturan PIN tetap bisa masuk dengan password lamanya (tombol *Pakai keyboard* bila berisi huruf), lalu langsung diminta membuat PIN 6 angka.
- **Kunci otomatis:** layar terkunci setelah tidak dipakai (default 5 menit, bisa diatur). Salah PIN 5 kali membuat login terkunci 1 menit.
- Rekap shift ikut dikirim ke sheet `Shift` di spreadsheet dan tampil di dashboard pemilik. Kalau Apps Script sudah terpasang sebelumnya, tempel ulang `apps-script/Code.gs` lalu **Deploy → Manage deployments → Edit → New version**.
- PIN disimpan sebagai hash (PBKDF2) di tablet, bukan teks asli. Ini pengaman akses kasir, bukan enkripsi data: orang yang menguasai tablet dan paham teknis tetap bisa membaca data browser.

## Meja & pesanan belum dibayar

- **Pilih meja:** setiap pesanan memakai meja (atau *Bawa pulang*). Ketuk tombol **Pilih meja** di atas daftar pesanan; aplikasi juga memintanya otomatis saat Simpan atau Bayar. Nama pemesan boleh diisi. Jumlah meja diatur di Atur → Toko → **Jumlah meja** (default 12).
- **Simpan (bayar nanti):** tombol **Simpan** menyimpan pesanan tanpa dibayar. Pesanan muncul di tombol **Belum bayar** (merah, dengan jumlahnya) di layar kasir, ditandai **BELUM BAYAR**, dan mejanya tampil merah di pilihan meja.
- **Tambah pesanan:** pilih meja yang merah untuk menambahkan menu ke tagihan meja itu, atau buka dari daftar Belum bayar → **Buka / tambah**, lalu **Simpan ubahan**.
- **Bayar:** dari daftar Belum bayar → **Bayar**. Setelah dibayar, tanda BELUM BAYAR hilang dan pesanan keluar dari daftar. Nomor meja dan nama pemesan tercetak di struk.
- **Cetak tagihan:** mencetak tagihan sementara untuk diantar ke meja. **Batalkan** hanya bisa dilakukan pemilik.
- Saat tutup shift, aplikasi mengingatkan kalau masih ada pesanan belum dibayar dan menyebutkannya di laporan WhatsApp.

## Konsumsi owner & pegawai

- **Mencatat:** masukkan menu ke pesanan seperti biasa, lalu ketuk **Konsumsi staf** (di atas daftar pesanan). Pilih untuk siapa (nama pemilik/kasir yang terdaftar, atau *Lainnya* untuk nama lain), isi keterangan bila perlu, lalu **Catat konsumsi**.
- Konsumsi **tidak masuk omzet** dan tidak mengubah uang laci, tetapi stok bahan tetap berkurang dan HPP-nya dihitung.
- **Rekap per orang:** tab Laporan → *Konsumsi owner & pegawai*, bisa dilihat hari ini, 7 hari terakhir, bulan ini, atau bulan lalu. Tombol **Rincian** menampilkan setiap konsumsi orang itu.
- Rekap tutup shift (cetak dan WhatsApp) memuat konsumsi per orang. Spreadsheet mendapat sheet `Konsumsi`, dan dashboard pemilik menampilkan konsumsi staf hari ini.

## Stok bahan & HPP

- **Tambah bahan** (pemilik): tab **Stok → + Tambah bahan**. Isi nama, satuan (gram, ml, pcs), harga beli per kemasan dan isi kemasannya (misalnya Rp180.000 untuk 1000 gram), stok sekarang, dan batas stok menipis. Harga per satuan dihitung otomatis.
- **Resep menu:** tab **Menu → Ubah**, bagian *Resep per porsi*. Contoh Es Kopi Susu: Biji kopi 18 gram, Susu UHT 150 ml, Cup plastik 1 pcs. HPP dan margin per porsi langsung muncul, dan daftar menu menampilkan kolom HPP dan Margin.
- **Stok keluar otomatis:** setiap menu terjual, stok bahannya dipotong sesuai resep. Kartu menu di layar kasir menampilkan sisa porsi, dan aplikasi memberi tahu saat ada bahan yang menipis.
- **Stok masuk:** tab Stok → **Stok masuk** (atau tombol Masuk di baris bahan). Ada tombol cepat per kemasan. Harga per satuan diperbarui dengan rata-rata. Kalau dibayar dari laci, centang pilihan agar ikut tercatat sebagai pengeluaran shift.
- **Hitung stok / opname** (pemilik): tombol **Hitung** untuk menyamakan stok dengan jumlah sebenarnya, termasuk mencatat bahan rusak atau terbuang. Semua pergerakan tercatat di *Riwayat stok*.
- **Laporan:** tab Laporan menampilkan HPP, laba kotor, dan stok keluar hari ini. Rekap tutup shift (cetak dan WhatsApp) memuat HPP, laba kotor, stok keluar beserta sisanya, dan daftar bahan yang perlu dibeli.
- **Spreadsheet:** sheet `Stok` (riwayat pergerakan), `Sisa Stok` (posisi stok terbaru), kolom HPP dan Laba kotor di `Transaksi`, `Detail Item`, dan `Shift`. Dashboard pemilik menampilkan HPP, laba kotor, dan stok menipis.

## Refund

- Buka dari **Laporan → Refund hari ini → + Refund**, tombol **Refund** di baris transaksi, tombol **Refund** saat membuka struk lama, atau menu nama kasir (pojok kiri bawah) → **Refund**.
- Pilih struk (7 hari terakhir), pilih item dan jumlahnya (bisa sebagian), alasan, dan cara uang dikembalikan (tunai dari laci atau sesuai metode bayar).
- Kasir butuh **PIN pemilik** untuk menyetujui refund. Pemilik langsung bisa.
- Centang **Kembalikan bahan ke stok** kalau menu belum dibuat, supaya stok dan HPP ikut kembali.
- Refund mengurangi omzet hari itu, laba kotor, dan uang yang seharusnya ada di laci shift yang sedang berjalan. Rekap tutup shift dan laporan WhatsApp mencantumkan setiap refund.
- Bukti refund bisa dicetak. Struk asal yang dicetak ulang menampilkan refund dan sisa bersihnya.
- Masuk ke sheet **Refund** di spreadsheet dan tampil di dashboard pemilik (tempel ulang `apps-script/Code.gs` lalu deploy versi baru).

## Pengeluaran & laporan WhatsApp

- **Catat pengeluaran:** saat shift berjalan, buka tab Laporan → **+ Catat pengeluaran**, atau ketuk nama di pojok kiri bawah → **Catat pengeluaran**. Isi jumlah, kategori (es batu, gas, bahan baku, dan lain-lain), keterangan, dan sumber uangnya.
- **Sumber uang:** pilih *Laci kasir* kalau uangnya diambil dari laci (mengurangi uang yang seharusnya ada di laci), atau *Uang lain / transfer* kalau dibayar dari luar laci (hanya dicatat).
- **Nomor penerima:** Atur → Laporan shift ke WhatsApp → isi nomor (format 08… atau 628…) → **Simpan nomor**. **Coba kirim** untuk mengetes.
- **Saat tutup shift:** WhatsApp terbuka otomatis dengan laporan berisi penjualan per metode bayar, daftar pengeluaran, hitungan kas laci, selisih, dan hasil bersih shift. Kasir tinggal menekan **Kirim**. Tombol **Kirim ke WhatsApp** di layar rekap bisa dipakai kalau perlu mengirim ulang.
- Pengeluaran juga masuk ke sheet `Pengeluaran` di spreadsheet dan tampil di dashboard pemilik (pengeluaran hari ini dan hasil bersih).

## Aplikasi Android (APK)

- Unduh dari tablet: https://github.com/tengkuilhamsyahti-lgtm/kasir-batang-garing/releases/latest/download/KasirBatangGaring.apk lalu buka file-nya. Izinkan *pasang dari sumber tidak dikenal* untuk Chrome bila diminta.
- APK ini membuka kasir web di Chrome (Trusted Web Activity), jadi printer Bluetooth tetap jalan, data yang sudah ada di Chrome ikut terbaca, dan pembaruan web langsung ikut tanpa memasang ulang.
- Butuh Google Chrome terpasang di tablet.
- APK dibangun otomatis oleh GitHub Actions (`.github/workflows/apk.yml`) dari folder `android/`.

## Mode offline

- Setelah aplikasi pernah dibuka sekali saat online, kasir bisa dibuka dan dipakai penuh tanpa internet: login, transaksi, simpan pesanan, cetak struk Bluetooth, stok, pengeluaran, dan tutup shift.
- Saat offline muncul tanda merah **Offline · kasir tetap jalan** beserta jumlah transaksi yang menunggu dikirim. Semua data tersimpan di tablet.
- Begitu internet kembali, transaksi, shift, pengeluaran, stok, dan konsumsi otomatis dikirim ke spreadsheet (tanpa dobel).
- Yang butuh internet: kiriman ke spreadsheet, dashboard pemilik, dan pesan WhatsApp (pesan yang ditekan Kirim saat offline akan terkirim otomatis oleh WhatsApp saat online).

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
- Ukuran tampilan: di tablet aplikasi otomatis memperbesar teks, tombol, dan kartu menu. Ubah di Atur → Toko → **Ukuran tampilan** (Normal sampai Sangat besar). Di layar yang sempit, ukuran dibatasi supaya kartu menu dan pesanan tetap muat.

## Catatan

- Data menu dan transaksi tersimpan di perangkat kasir (browser). Spreadsheet adalah cadangan dan rekapnya.
- Menu dimulai kosong. Isi lewat tab **Menu → + Tambah menu**; tombol **Simpan & tambah lagi** mempercepat input banyak menu.
- Cadangkan menu lewat Atur → Salin data menu setelah selesai mengisi.
- Bluetooth di iPhone/iPad belum didukung Safari; pakai tablet Android atau PC untuk printer Bluetooth.
