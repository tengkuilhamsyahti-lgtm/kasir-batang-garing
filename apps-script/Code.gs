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
  }
  return sh;
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.key !== KUNCI) return ContentService.createTextOutput('kunci salah');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const trx = sheet_('Transaksi', ['Waktu', 'Tanggal', 'No Struk', 'Toko', 'Metode', 'Subtotal', 'Pajak', 'Total', 'Dibayar', 'Kembali', 'Jumlah Item']);
    const det = sheet_('Detail Item', ['Tanggal', 'No Struk', 'Menu', 'Qty', 'Harga', 'Subtotal']);
    const ada = new Set(trx.getLastRow() > 1 ? trx.getRange(2, 3, trx.getLastRow() - 1, 1).getValues().flat().map(String) : []);
    const rowsT = [], rowsD = [];
    (data.transactions || []).forEach(t => {
      if (ada.has(String(t.no))) return; // cegah dobel kalau dikirim ulang
      const d = new Date(t.time);
      const tgl = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      rowsT.push([d, tgl, t.no, data.store, t.method, t.sub, t.tax, t.total, t.paid, t.change, t.items.reduce((a, i) => a + i.qty, 0)]);
      t.items.forEach(i => rowsD.push([tgl, t.no, i.name, i.qty, i.price, i.qty * i.price]));
    });
    if (rowsT.length) trx.getRange(trx.getLastRow() + 1, 1, rowsT.length, rowsT[0].length).setValues(rowsT);
    if (rowsD.length) det.getRange(det.getLastRow() + 1, 1, rowsD.length, rowsD[0].length).setValues(rowsD);
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
  const rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues() : [];
  const hari = rows.filter(r => r[1] === today || (r[1] instanceof Date && Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') === today));
  const omzet = hari.reduce((a, r) => a + Number(r[7]), 0);
  const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const det = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Detail Item');
  const items = {};
  if (det && det.getLastRow() > 1) det.getRange(2, 1, det.getLastRow() - 1, 6).getValues().forEach(r => {
    const t = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : r[0];
    if (t === today) items[r[2]] = (items[r[2]] || 0) + Number(r[3]);
  });
  const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const last = hari.slice(-10).reverse();
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="60"><title>Pantau Kasir</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#f6f2ee;color:#231a14}
h1{font-size:20px;margin:0 0 2px}.s{color:#5d6b62;font-size:13px;margin-bottom:16px}
.k{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.c{background:#fff;border:1px solid #e0d5cb;border-radius:14px;padding:12px 14px}
.l{font-size:12px;color:#5d6b62}.v{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:8px 4px;border-bottom:1px solid #e6ebe7}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
h2{font-size:15px;margin:0 0 8px}</style>
<h1>${data_(e)}</h1><div class="s">${Utilities.formatDate(new Date(), tz, 'dd MMM yyyy HH:mm')} · diperbarui tiap menit</div>
<div class="k"><div class="c"><div class="l">Omzet hari ini</div><div class="v">${rp(omzet)}</div></div>
<div class="c"><div class="l">Transaksi</div><div class="v">${hari.length}</div></div></div>
<div class="c" style="margin-bottom:12px"><h2>Menu terlaris</h2><table>${top.map(([n, q]) => `<tr><td>${n}</td><td>${q}×</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>
<div class="c"><h2>Transaksi terakhir</h2><table>${last.map(r => `<tr><td>${Utilities.formatDate(new Date(r[0]), tz, 'HH:mm')} · ${r[2]} · ${r[4]}</td><td>${rp(r[7])}</td></tr>`).join('') || '<tr><td>Belum ada</td><td></td></tr>'}</table></div>`;
  return HtmlService.createHtmlOutput(html).setTitle('Pantau Kasir').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function data_() { return SpreadsheetApp.getActiveSpreadsheet().getName(); }
