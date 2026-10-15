/**
 * Kasir Batang Garing Coffee -> Google Spreadsheet + dashboard pemilik.
 * Pasang: Extensions > Apps Script di spreadsheet, tempel file ini,
 * ganti KUNCI, lalu Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Salin URL /exec ke aplikasi kasir.
 */
const KUNCI = 'ganti-kunci-ini';

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  } else if (sh.getLastColumn() < header.length) {
    // versi baru menambah kolom di kanan: lengkapi judul kolomnya
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  }
  return sh;
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.key !== KUNCI) return ContentService.createTextOutput('kunci salah');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const trx = sheet_('Transaksi', ['Waktu', 'Tanggal', 'No Struk', 'Toko', 'Metode', 'Subtotal', 'Pajak', 'Total', 'Dibayar', 'Kembali', 'Jumlah Item', 'Kasir', 'HPP', 'Laba kotor', 'Meja', 'Nama pemesan']);
    const det = sheet_('Detail Item', ['Tanggal', 'No Struk', 'Menu', 'Qty', 'Harga', 'Subtotal', 'HPP satuan', 'Total HPP']);
    const ada = new Set(trx.getLastRow() > 1 ? trx.getRange(2, 3, trx.getLastRow() - 1, 1).getValues().flat().map(String) : []);
    const rowsT = [], rowsD = [];
    (data.transactions || []).forEach(t => {
      if (ada.has(String(t.no))) return; // cegah dobel kalau dikirim ulang
      const d = new Date(t.time);
      const tgl = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      rowsT.push([d, tgl, t.no, data.store, t.method, t.sub, t.tax, t.total, t.paid, t.change, t.items.reduce((a, i) => a + i.qty, 0), t.cashier || '', t.hpp || 0, t.sub - (t.hpp || 0), t.table === 'TA' ? 'Bawa pulang' : (t.table || ''), t.customer || '']);
      t.items.forEach(i => rowsD.push([tgl, t.no, i.name, i.qty, i.price, i.qty * i.price, i.hpp || 0, (i.hpp || 0) * i.qty]));
    });
    if (rowsT.length) trx.getRange(trx.getLastRow() + 1, 1, rowsT.length, rowsT[0].length).setValues(rowsT);
    if (rowsD.length) det.getRange(det.getLastRow() + 1, 1, rowsD.length, rowsD[0].length).setValues(rowsD);
    const shifts = data.shifts || [];
    if (shifts.length) {
      const sh = sheet_('Shift', ['ID', 'Kasir', 'Buka', 'Tutup', 'Transaksi', 'Modal awal', 'Penjualan tunai', 'Non-tunai', 'Seharusnya di laci', 'Uang dihitung', 'Selisih', 'Ditutup oleh', 'Pengeluaran', 'Pengeluaran dari laci', 'Penjualan tanpa pajak', 'HPP', 'Laba kotor', 'Refund', 'Refund tunai']);
      const adaS = new Set(sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String) : []);
      const rowsS = shifts.filter(x => !adaS.has(String(x.id))).map(x => [x.id, x.name, new Date(x.start), new Date(x.end), x.trxCount, x.openCash, x.cashSales, x.nonCash, x.expected, x.counted, x.diff, x.closedBy, x.expTotal || 0, x.expCash || 0, x.netSales || 0, x.hpp || 0, (x.netSales || 0) - (x.hpp || 0), x.refund ? x.refund.total : 0, x.refund ? x.refund.cash : 0]);
      if (rowsS.length) sh.getRange(sh.getLastRow() + 1, 1, rowsS.length, rowsS[0].length).setValues(rowsS);
    }
    const exps = data.expenses || [];
    if (exps.length) {
      const se = sheet_('Pengeluaran', ['ID', 'Waktu', 'Tanggal', 'Kasir', 'Kategori', 'Keterangan', 'Sumber', 'Jumlah', 'ID Shift']);
      const adaE = new Set(se.getLastRow() > 1 ? se.getRange(2, 1, se.getLastRow() - 1, 1).getValues().flat().map(String) : []);
      const rowsE = exps.filter(x => !adaE.has(String(x.id))).map(x => {
        const d = new Date(x.time);
        return [x.id, d, Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'), x.cashier, x.cat, x.note || '', x.src === 'Laci' ? 'Laci kasir' : 'Uang lain', x.amount, x.shift];
      });
      if (rowsE.length) se.getRange(se.getLastRow() + 1, 1, rowsE.length, rowsE[0].length).setValues(rowsE);
    }
    const mv = data.moves || [];
    if (mv.length) {
      const sm = sheet_('Stok', ['ID', 'Waktu', 'Tanggal', 'Bahan', 'Jenis', 'Jumlah', 'Satuan', 'Harga per satuan', 'Nilai', 'Keterangan', 'Oleh']);
      const adaM = new Set(sm.getLastRow() > 1 ? sm.getRange(2, 1, sm.getLastRow() - 1, 1).getValues().flat().map(String) : []);
      const rowsM = mv.filter(x => !adaM.has(String(x.id))).map(x => {
        const d = new Date(x.time);
        return [x.id, d, Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'), x.name, x.type, x.qty, x.unit, x.cost || 0, Math.round(x.qty * (x.cost || 0)), x.note || '', x.by || ''];
      });
      if (rowsM.length) sm.getRange(sm.getLastRow() + 1, 1, rowsM.length, rowsM[0].length).setValues(rowsM);
    }
    const ks = data.konsumsi || [];
    if (ks.length) {
      const sk = sheet_('Konsumsi', ['ID', 'Waktu', 'Tanggal', 'Untuk', 'Menu', 'Jumlah item', 'Nilai jual', 'HPP', 'Keterangan', 'Dicatat oleh']);
      const adaK = new Set(sk.getLastRow() > 1 ? sk.getRange(2, 1, sk.getLastRow() - 1, 1).getValues().flat().map(String) : []);
      const rowsK = ks.filter(x => !adaK.has(String(x.id))).map(x => {
        const d = new Date(x.time);
        return [x.id, d, Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'), x.who, x.items.map(i => i.qty + 'x ' + i.name).join(', '), x.items.reduce((a, i) => a + i.qty, 0), x.value, x.hpp || 0, x.note || '', x.by || ''];
      });
      if (rowsK.length) sk.getRange(sk.getLastRow() + 1, 1, rowsK.length, rowsK[0].length).setValues(rowsK);
    }
    const rf = data.refunds || [];
    if (rf.length) {
      const sr = sheet_('Refund', ['ID', 'Waktu', 'Tanggal', 'No Refund', 'Struk asal', 'Menu', 'Jumlah item', 'Subtotal', 'Pajak', 'Total refund', 'Dikembalikan lewat', 'Alasan', 'Keterangan', 'Kasir', 'Disetujui', 'Bahan kembali ke stok', 'HPP kembali']);
      const adaR = new Set(sr.getLastRow() > 1 ? sr.getRange(2, 1, sr.getLastRow() - 1, 1).getValues().flat().map(String) : []);
      const rowsR = rf.filter(x => !adaR.has(String(x.id))).map(x => {
        const d = new Date(x.time);
        return [x.id, d, Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'), x.no, x.trxNo, x.items.map(i => i.qty + 'x ' + i.name).join(', '), x.items.reduce((a, i) => a + i.qty, 0), x.sub, x.tax || 0, x.amount, x.method, x.reason, x.note || '', x.cashier, x.approvedBy, x.restock ? 'Ya' : 'Tidak', x.hppBack || 0];
      });
      if (rowsR.length) sr.getRange(sr.getLastRow() + 1, 1, rowsR.length, rowsR[0].length).setValues(rowsR);
    }
    if (data.stock && data.stock.length) {
      const ss = sheet_('Sisa Stok', ['Bahan', 'Sisa', 'Satuan', 'Batas menipis', 'Harga per satuan', 'Nilai stok', 'Status', 'Diperbarui']);
      if (ss.getLastRow() > 1) ss.getRange(2, 1, ss.getLastRow() - 1, 8).clearContent();
      const now = new Date();
      const rows = data.stock.map(b => [b.name, b.stock, b.unit, b.min || 0, b.cost, Math.round(Math.max(0, b.stock) * b.cost), b.stock <= 0 ? 'Habis' : b.stock <= (b.min || 0) ? 'Menipis' : 'Aman', now]);
      ss.getRange(2, 1, rows.length, 8).setValues(rows);
    }
    rekap_();
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

/** Sheet "Rekap Harian": omzet & jumlah transaksi per tanggal (rumus, selalu terbaru). */
function rekap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('Rekap Harian')) return;
  const sh = ss.insertSheet('Rekap Harian');
  sh.getRange('A1').setFormula('=QUERY(Transaksi!B:K,"select B, count(C), sum(H) where B is not null group by B order by B desc label count(C) \'Transaksi\', sum(H) \'Omzet\'",1)');
  const sm = ss.insertSheet('Rekap Menu');
  sm.getRange('A1').setFormula('=QUERY(\'Detail Item\'!A:F,"select C, sum(D), sum(F) where C is not null group by C order by sum(F) desc label sum(D) \'Terjual\', sum(F) \'Omzet\'",1)');
}

/** Dashboard pemilik: buka URL /exec?key=KUNCI dari HP. */
function doGet(e) {
  if ((e.parameter.key || '') !== KUNCI) return HtmlService.createHtmlOutput('<p style="font-family:sans-serif">Link tidak valid.</p>');
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transaksi');
  const rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(11, Math.min(14, sh.getLastColumn()))).getValues() : [];
  const hari = rows.filter(r => r[1] === today || (r[1] instanceof Date && Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') === today));
  const shR = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Refund');
  const refHari = shR && shR.getLastRow() > 1 ? shR.getRange(2, 1, shR.getLastRow() - 1, 17).getValues()
    .filter(r => (r[2] instanceof Date ? Utilities.formatDate(r[2], tz, 'yyyy-MM-dd') : r[2]) === today) : [];
  const refund = refHari.reduce((a, r) => a + Number(r[9]), 0);
  const omzet = hari.reduce((a, r) => a + Number(r[7]), 0) - refund;
  const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const det = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Detail Item');
  const items = {};
  if (det && det.getLastRow() > 1) det.getRange(2, 1, det.getLastRow() - 1, 6).getValues().forEach(r => {
    const t = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : r[0];
    if (t === today) items[r[2]] = (items[r[2]] || 0) + Number(r[3]);
  });
  const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const last = hari.slice(-10).reverse();
  const shE = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengeluaran');
  const expHari = shE && shE.getLastRow() > 1 ? shE.getRange(2, 1, shE.getLastRow() - 1, 8).getValues()
    .filter(r => (r[2] instanceof Date ? Utilities.formatDate(r[2], tz, 'yyyy-MM-dd') : r[2]) === today) : [];
  const keluar = expHari.reduce((a, r) => a + Number(r[7]), 0);
  const hpp = hari.reduce((a, r) => a + (Number(r[12]) || 0), 0);
  const shK = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Konsumsi');
  const konsHari = shK && shK.getLastRow() > 1 ? shK.getRange(2, 1, shK.getLastRow() - 1, 8).getValues()
    .filter(r => (r[2] instanceof Date ? Utilities.formatDate(r[2], tz, 'yyyy-MM-dd') : r[2]) === today) : [];
  const laba = hari.reduce((a, r) => a + Number(r[5]), 0) - hpp - refHari.reduce((a, r) => a + Number(r[7]) - Number(r[16] || 0), 0);
  const shSisa = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sisa Stok');
  const menipis = shSisa && shSisa.getLastRow() > 1 ? shSisa.getRange(2, 1, shSisa.getLastRow() - 1, 7).getValues().filter(r => r[0] && r[6] !== 'Aman') : [];
  const shS = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Shift');
  const shifts = shS && shS.getLastRow() > 1 ? shS.getRange(2, 1, shS.getLastRow() - 1, 12).getValues().slice(-5).reverse() : [];
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="60"><title>Pantau Kasir</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#f0f5f1;color:#13211a}
h1{font-size:20px;margin:0 0 2px}.s{color:#5d6b62;font-size:13px;margin-bottom:16px}
.k{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.c{background:#fff;border:1px solid #d2e0d6;border-radius:14px;padding:12px 14px}
.l{font-size:12px;color:#5d6b62}.v{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:8px 4px;border-bottom:1px solid #e6ebe7}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
h2{font-size:15px;margin:0 0 8px}</style>
<h1>${data_(e)}</h1><div class="s">${Utilities.formatDate(new Date(), tz, 'dd MMM yyyy HH:mm')} · diperbarui tiap menit</div>
<div class="k"><div class="c"><div class="l">Omzet bersih hari ini</div><div class="v">${rp(omzet)}</div></div>
<div class="c"><div class="l">Transaksi</div><div class="v">${hari.length}</div></div>
<div class="c"><div class="l">Refund hari ini</div><div class="v" style="color:${refund ? '#c8501e' : 'inherit'}">${rp(refund)}</div></div>
<div class="c"><div class="l">Jumlah refund</div><div class="v">${refHari.length}</div></div>
<div class="c"><div class="l">Pengeluaran hari ini</div><div class="v">${rp(keluar)}</div></div>
<div class="c"><div class="l">Bersih</div><div class="v">${rp(omzet - keluar)}</div></div>
<div class="c"><div class="l">HPP hari ini</div><div class="v">${rp(hpp)}</div></div>
<div class="c"><div class="l">Laba kotor</div><div class="v">${rp(laba)}</div></div>
<div class="c"><div class="l">Konsumsi staf (nilai jual)</div><div class="v">${rp(konsHari.reduce((a, r) => a + Number(r[6]), 0))}</div></div>
<div class="c"><div class="l">Konsumsi staf (HPP)</div><div class="v">${rp(konsHari.reduce((a, r) => a + Number(r[7]), 0))}</div></div></div>
<div class="c" style="margin-bottom:12px"><h2>Stok menipis</h2><table>${menipis.map(r => `<tr><td>${r[0]} · ${r[6]}</td><td style="color:#c8501e">${Number(r[1]).toLocaleString('id-ID')} ${r[2]}</td></tr>`).join('') || '<tr><td>Semua stok aman</td><td></td></tr>'}</table></div>
<div class="c" style="margin-bottom:12px"><h2>Menu terlaris</h2><table>${top.map(([n, q]) => `<tr><td>${n}</td><td>${q}×</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>
<div class="c" style="margin-bottom:12px"><h2>Shift terakhir</h2><table>${shifts.map(r => `<tr><td>${r[1]} · ${Utilities.formatDate(new Date(r[3]), tz, 'dd MMM HH:mm')}</td><td style="color:${Number(r[10]) === 0 ? '#1f7a3f' : '#c8501e'}">${Number(r[10]) > 0 ? '+' : ''}${rp(r[10])}</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>
${refHari.length ? `<div class="c" style="margin-bottom:12px"><h2>Refund hari ini</h2><table>${refHari.slice().reverse().map(r => `<tr><td>${Utilities.formatDate(new Date(r[1]), tz, 'HH:mm')} · ${r[4]} · ${r[5]}<br><small style="color:#5d6b62">${r[11]}${r[12] ? ' · ' + r[12] : ''} · ${r[13]}, disetujui ${r[14]}</small></td><td style="color:#c8501e">-${rp(r[9])}</td></tr>`).join('')}</table></div>` : ''}
<div class="c" style="margin-bottom:12px"><h2>Pengeluaran hari ini</h2><table>${expHari.slice().reverse().map(r => `<tr><td>${Utilities.formatDate(new Date(r[1]), tz, 'HH:mm')} · ${r[4]}${r[5] ? ' · ' + r[5] : ''} · ${r[3]}</td><td>${rp(r[7])}</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>
<div class="c"><h2>Transaksi terakhir</h2><table>${last.map(r => `<tr><td>${Utilities.formatDate(new Date(r[0]), tz, 'HH:mm')} · ${r[2]} · ${r[4]}</td><td>${rp(r[7])}</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>`;
  return HtmlService.createHtmlOutput(html).setTitle('Pantau Kasir').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function data_() { return SpreadsheetApp.getActiveSpreadsheet().getName(); }
