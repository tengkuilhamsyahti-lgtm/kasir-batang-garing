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
- **Ubah nama akun:** Atur → Pengguna & keamanan → **Ubah nama** di baris pemilik atau kasir. Transaksi dan struk lama tetap memakai nama lama; shift yang sedang berjalan dan catatan konsumsi ikut berganti.
- **Printer untuk semua akun:** pemilik dan kasir bisa menyambung, mengganti, menguji, dan memutus printer lewat tombol **Sambung printer / Printer siap** di layar Kasir. Pengaturan kertas dan cetak otomatis tetap di Atur (khusus pemilik).
- **Printer Bluetooth tersambung ulang otomatis:** kalau printer tertidur atau sinyal putus, aplikasi mencoba menyambung lagi (beberapa kali), juga saat aplikasi dibuka kembali dan sebelum mencetak. Setelah aplikasi ditutup penuh, Chrome di sebagian tablet tetap meminta printer dipilih ulang.
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

## Uang diterima dengan nominal bebas

- Di layar pembayaran tunai ada tombol cepat **Uang pas, Rp50.000, Rp100.000, …** dan tombol **Lainnya**.
- Kalau pelanggan memberi nominal lain (mis. 73.500), ketuk **Lainnya** lalu ketik jumlahnya di tombol angka yang muncul (ada tombol 000 dan hapus).
- Kembalian dihitung otomatis; tombol Selesaikan baru aktif kalau uangnya cukup.

## Nama customer & logo di struk

- Tombol **Pilih meja & nama** membuka isian **Nama customer** di bagian atas, lalu pilih meja. Nama yang pernah dipakai muncul sebagai saran. Untuk mengganti nama tanpa pindah meja, ketuk **Simpan nama**.
- Nama customer tercetak di struk, tampil di daftar pesanan belum bayar, dan masuk ke spreadsheet (kolom Nama pemesan).
- Logo Batang Garing tercetak di atas struk (printer thermal Bluetooth/USB lewat perintah gambar ESC/POS, atau lewat dialog cetak browser). Bisa dimatikan di **Atur → Printer → Logo di atas struk**.

## Struk total tutup shift

- Saat shift ditutup, struk total otomatis tercetak kalau printer tersambung (bisa dimatikan di **Atur → Printer**). Kalau belum tersambung, ketuk **Cetak struk total** di layar rekap.
- Isi struk: kasir, jam buka/tutup, jumlah transaksi, menu terjual (dipisah Kafe dan Ice Cream), pembayaran per metode, total penjualan, refund, total bersih, pengeluaran, HPP dan laba kotor, konsumsi staf, stok keluar/sisa, hitungan kas laci dan selisih, serta kolom tanda tangan kasir.
- Pemilik bisa mencetak ulang struk total shift mana pun dari **Laporan → Riwayat shift → Struk total**.

## Ice Cream (terpisah dari menu kafe)

- Kasir, Menu, dan Stok punya tab **Kafe** dan **Ice Cream**. Tab yang dipilih menentukan menu, kategori, dan stok yang tampil. Satu pesanan tetap boleh berisi kopi dan es krim sekaligus.
- Menu ice cream baru otomatis memakai **Stok dihitung per barang**: isi stok tersedia (pcs), harga modal per pcs, dan batas menipis. Sisa stok tampil di kartu menu kasir dan berkurang tiap terjual.
- Untuk es krim per scoop dari kemasan besar, matikan centang itu lalu pakai resep (mis. Es krim vanila 80 ml + Cone 1 pcs) dari barang di **Stok → Ice Cream → + Tambah barang**.
- Halaman Stok tab Ice Cream: sisa, terjual hari ini, nilai stok, stok masuk, hitung ulang (opname), dan riwayat khusus ice cream.
- Laporan, pendapatan per hari, rekap tutup shift, WhatsApp, dan spreadsheet (kolom **Bagian** di Detail Item dan Sisa Stok) memisahkan penjualan Kafe dan Ice Cream.

## Pendapatan per hari

- Di **Laporan → Pendapatan per hari**: pilih 7 hari, 30 hari, bulan ini, atau bulan lalu.
- Grafik batang pendapatan bersih per hari (ketuk batang untuk melihat angkanya), total periode, rata-rata per hari buka, dan hari tertinggi.
- Tabel per tanggal: jumlah transaksi, penjualan, refund, pendapatan bersih, pengeluaran, dan laba kotor, dengan baris total.
- Dashboard pemilik (Apps Script) juga menampilkan pendapatan 7 hari terakhir.

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
7. Ketuk **Tes koneksi**. Kalau muncul "Tersambung. Kunci rahasia cocok", sambungan sudah benar.
8. Tombol **Buka dashboard pemilik** memberi link untuk HP pemilik.

Aplikasi sekarang membaca balasan Apps Script: data baru ditandai terkirim kalau Apps Script menjawab "ok". Kalau kunci tidak cocok, data tetap disimpan di tablet dan muncul peringatan merah di **Atur**.

## Rekap otomatis ke Google Drive

1. Buka Apps Script dalam keadaan masuk ke akun Google pemilik (mis. batanggaringcoffe@gmail.com) dan pastikan isi `Code.gs` sudah versi terbaru.
2. Di atas editor, pilih fungsi **pasangRekapOtomatis**, klik **Run**, lalu izinkan akses Google Drive.
3. Folder **Rekap Aplikasi Kasir** muncul di Google Drive dengan subfolder per bulan. Setiap pagi (pukul 06–07) rekap hari kemarin disimpan sebagai spreadsheet + PDF: ringkasan omzet per metode bayar, refund, pengeluaran, HPP, laba, menu terjual, transaksi, shift.
4. Setelah mengganti `Code.gs`, jangan lupa **Deploy → Manage deployments → Edit → New version** supaya Web App ikut diperbarui.

## Dua perangkat kasir

Nomor struk berisi kode perangkat, mis. `261021-A-007` (tanggal-kode-urutan). Setiap perangkat mendapat kode acak otomatis; ganti di **Atur → Toko → Kode perangkat ini** (mis. tablet utama `A`, HP `B`). Kode ini tidak ikut sinkron, jadi dua perangkat tidak pernah membuat nomor struk yang sama.

## Menjalankan

- Coba cepat: buka `index.html` di Chrome.
- Untuk dipakai sungguhan (printer USB/Bluetooth dan pasang ke layar utama butuh HTTPS): unggah folder ini ke hosting statis gratis seperti GitHub Pages, Netlify, atau Cloudflare Pages, lalu buka alamatnya di tablet kasir.

## Setelan untuk Batang Garing Coffee

- Perangkat: tablet Android, buka lewat **Chrome**, lalu menu ⋮ → *Tambahkan ke layar utama*.
- Printer: Bluetooth mini 58 mm. Pasangkan dulu printer di pengaturan Bluetooth tablet (PIN biasanya 0000 atau 1234), lalu di aplikasi ketuk **Sambung printer** dan pilih printernya. Chrome meminta ini sekali setiap aplikasi dibuka ulang.
- Satu outlet: satu spreadsheet dan satu link dashboard pemilik.
- Ukuran tampilan: mode **Otomatis** menghitung skala dari lebar dan tinggi layar (antara 0,85× dan 1,3×), dan menghitung ulang saat tablet diputar atau jendela diubah ukurannya. Jadi tampilan pas di HP, tablet tegak/mendatar, maupun laptop. Bisa diatur manual di Atur → Toko → **Ukuran tampilan** (Kecil sampai Sangat besar).

## Catatan

- Data menu dan transaksi tersimpan di perangkat kasir (browser). Spreadsheet adalah cadangan dan rekapnya.
- Menu dimulai kosong. Isi lewat tab **Menu → + Tambah menu**; tombol **Simpan & tambah lagi** mempercepat input banyak menu.
- Cadangkan menu lewat Atur → Salin data menu setelah selesai mengisi.
- Bluetooth di iPhone/iPad belum didukung Safari; pakai tablet Android atau PC untuk printer Bluetooth.

## Cetak penjualan per produk

Di **Laporan → Penjualan per produk**, pilih periode (Hari ini, Kemarin, 7 hari terakhir, Bulan ini, Bulan lalu). Tabel menampilkan nama produk, jumlah terjual, dan pendapatannya, dipisah Kafe dan Ice Cream. Angka sudah dikurangi refund. Ketuk **Cetak** untuk melihat contoh struk lalu cetak ke printer thermal: daftar produk, subtotal per bagian, jumlah item, jumlah transaksi, dan TOTAL PENDAPATAN.

## Simpan data di cloud (Supabase)

Data kasir (menu, transaksi, stok, shift, pengeluaran, refund, akun kasir, pengaturan) bisa disimpan juga di Supabase project **kasir-batang-garing**. Tabelnya `kasir_data` (lihat `supabase/schema.sql`), dilindungi Row Level Security: setiap akun cloud hanya bisa membaca dan menulis datanya sendiri.

1. Buka kasir sebagai pemilik → **Atur → Simpan data di cloud**.
2. Pertama kali: isi email dan kata sandi, ketuk **Buat akun baru**, lalu klik link konfirmasi di email dari Supabase. Setelah itu ketuk **Masuk & sinkron**.
3. Sinkron berjalan otomatis beberapa detik setelah ada perubahan dan setiap 30 detik. Saat offline, kasir tetap jalan dan data dikirim begitu internet kembali.
4. Perangkat baru (tablet kedua, HP, laptop): di layar **Buat akun pemilik**, ketuk **Data kasir sudah ada di cloud? Ambil dari Supabase**, lalu masuk dengan akun cloud yang sama. Akun kasir dan PIN ikut terunduh.

Kalau dua perangkat mengubah catatan yang sama, perubahan terakhir yang menang.
