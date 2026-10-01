// ===== バックアップ（別のスプレッドシートへ追記のみ） =====
// 講師の指導記録と保護者への週次報告を、保存のたびに別ファイルへ1行ずつ追記する（上書き・削除はしない）。
// 週次報告は保存操作ごと（AI生成・下書き保存・確定・送信済み）に1行残るので、書き換える前の文面もたどれる。
// バックアップ先はスクリプトプロパティ BACKUP_SPREADSHEET_ID。未設定なら最初のバックアップ時に
// 「<本体の名前>_バックアップ」を作成し、それまでの指導記録・週次報告をまとめてコピーする。
// 追記できなかった分は本体の「バックアップ待ち」シートに残し、次のバックアップ時（またはメニュー）に再送する。
// 本体の保存はロック（スクリプトロック）の外でバックアップするので、バックアップが遅くても保存は待たされない。

const BACKUP_PENDING_SHEET = 'バックアップ待ち';
const BACKUP_LOCK_MS = 10000;

function backupHeaders_(kind) {
  if (kind === '指導記録') return ['バックアップ日時'].concat(SHIDO_HEADERS['指導記録']);
  if (kind === '週次報告履歴') return ['バックアップ日時', '操作', '報告ID', '生徒', '校舎', '学年', '期間開始', '期間終了', 'ステータス', '本文', '生成日時', '確定日時', '送信日時'];
  throw new Error('unknown backup kind: ' + kind);
}

function backupNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
}

// 本体のスプレッドシートとは別のロック（ドキュメントロック）でバックアップ同士の追記だけを直列にする
function backupLock_() {
  return LockService.getDocumentLock() || LockService.getScriptLock();
}

function ensureBackupSheet_(bss, kind) {
  let sheet = bss.getSheetByName(kind);
  if (sheet) { if (kind === '指導記録') renameOldHeaders_(sheet, '指導記録'); return sheet; }
  const headers = backupHeaders_(kind);
  sheet = bss.insertSheet(kind);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // 日付・ID・本文などは文字列のまま残す（自動で日付や数値に変換させない）
  sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).setNumberFormat('@');
  return sheet;
}

// バックアップ先を開く。なければ作成し、それまでのデータを初回コピーする（ロック内で呼ぶ）
function openBackupSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BACKUP_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  const ss = getSpreadsheet();
  const bss = SpreadsheetApp.create(ss.getName() + '_バックアップ');
  const now = backupNow_();
  const recSheet = ensureBackupSheet_(bss, '指導記録');
  const weekSheet = ensureBackupSheet_(bss, '週次報告履歴');
  const first = bss.getSheets().filter(s => s.getName() !== '指導記録' && s.getName() !== '週次報告履歴');
  first.forEach(s => bss.deleteSheet(s));

  const src = ss.getSheetByName('指導記録');
  if (src && src.getLastRow() > 1) {
    const rows = src.getRange(2, 1, src.getLastRow() - 1, SHIDO_HEADERS['指導記録'].length).getDisplayValues().map(r => [now].concat(r));
    recSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  const wsrc = ss.getSheetByName('週次報告');
  if (wsrc && wsrc.getLastRow() > 1) {
    const h = SHIDO_HEADERS['週次報告'];
    const rows = wsrc.getRange(2, 1, wsrc.getLastRow() - 1, h.length).getDisplayValues().map(r => {
      const v = name => r[h.indexOf(name)];
      return [now, '初回コピー', v('報告ID'), v('生徒'), v('校舎'), v('学年'), v('期間開始'), v('期間終了'), v('ステータス'), v('本文'), v('生成日時'), v('確定日時'), v('送信日時')];
    });
    weekSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  props.setProperty('BACKUP_SPREADSHEET_ID', bss.getId());
  return bss;
}

function pendingSheet_() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(BACKUP_PENDING_SHEET);
  if (sheet) return sheet;
  sheet = ss.insertSheet(BACKUP_PENDING_SHEET);
  sheet.getRange(1, 1, 1, 3).setValues([['登録日時', '種類', '内容(JSON)']]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, sheet.getMaxRows(), 3).setNumberFormat('@');
  return sheet;
}

// 追記できなかった行をバックアップ待ちに残す（appendRow は同時に呼ばれても行が重ならない）
function queueBackup_(kind, rows) {
  const sheet = pendingSheet_();
  rows.forEach(r => sheet.appendRow([backupNow_(), kind, JSON.stringify(r)]));
}

// rows はバックアップ先の列順（先頭はバックアップ日時）。失敗しても例外にしない（本体の保存は成功しているため）
function backupAppend_(kind, rows) {
  if (!rows || !rows.length) return 'ok';
  const lock = backupLock_();
  if (!lock.tryLock(BACKUP_LOCK_MS)) {
    try { queueBackup_(kind, rows); } catch (e) { console.error('backup queue failed: ' + e.message); }
    return 'queued';
  }
  try {
    const existed = !!PropertiesService.getScriptProperties().getProperty('BACKUP_SPREADSHEET_ID');
    const bss = openBackupSpreadsheet_();
    // 作成時の初回コピーには、それまでの指導記録（待ちの分・いま保存した分を含む）がすべて入っている（二重にしない）
    flushPendingBackups_(bss, existed ? [] : ['指導記録']);
    if (existed || kind !== '指導記録') appendBackupRows_(bss, kind, rows);
    return 'ok';
  } catch (err) {
    console.error('backup failed: ' + err.message);
    try { queueBackup_(kind, rows); } catch (e) { console.error('backup queue failed: ' + e.message); }
    return 'queued';
  } finally {
    releaseLockAfterFlush_(lock);
  }
}

function appendBackupRows_(bss, kind, rows) {
  const sheet = ensureBackupSheet_(bss, kind);
  const width = backupHeaders_(kind).length;
  const values = rows.map(r => {
    const row = r.slice(0, width).map(v => v === null || v === undefined ? '' : String(v));
    while (row.length < width) row.push('');
    return row;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, width).setValues(values);
}

// バックアップ待ちの行を送る（バックアップのロック内で呼ぶ）。送った行だけ待ちから消す。
// skipKinds の種類は送らずに消す（初回コピーに含まれているもの）
function flushPendingBackups_(bss, skipKinds) {
  const sheet = getSpreadsheet().getSheetByName(BACKUP_PENDING_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const n = sheet.getLastRow() - 1;
  const items = sheet.getRange(2, 1, n, 3).getValues();
  const byKind = {};
  items.forEach(it => {
    const kind = String(it[1]);
    if ((skipKinds || []).indexOf(kind) !== -1) return;
    try { (byKind[kind] = byKind[kind] || []).push(JSON.parse(String(it[2]))); }
    catch (e) { (byKind['週次報告履歴'] = byKind['週次報告履歴'] || []).push([backupNow_(), '読めない待ち行（' + kind + '）', '', '', '', '', '', '', '', String(it[2])]); }
  });
  Object.keys(byKind).forEach(kind => appendBackupRows_(bss, kind, byKind[kind]));
  // 読み取ったあとに追加された行は残る（先頭から n 行だけ消す）
  sheet.deleteRows(2, n);
  return n;
}

// 指導記録の行（本体の列順）をバックアップ用に変換
function backupShidoRows_(rows, now) {
  return rows.map(r => [now].concat(r));
}

// 週次報告の保存操作を1行にする
function backupWeeklyRow_(op, p, next, now) {
  return [now, op, next.id, p.student, p.school, p.grade, p.from, p.to, next.status, next.text, next.generatedAt, next.confirmedAt, next.sentAt];
}

// バックアップの状態（塾長の画面に表示する。api/weekly.js からのみ呼ばれる）
function getBackupStatus_() {
  const pending = getSpreadsheet().getSheetByName(BACKUP_PENDING_SHEET);
  const out = { configured: false, pending: pending ? Math.max(pending.getLastRow() - 1, 0) : 0 };
  const id = PropertiesService.getScriptProperties().getProperty('BACKUP_SPREADSHEET_ID');
  if (!id) return out;
  const bss = SpreadsheetApp.openById(id);
  const rows = name => { const s = bss.getSheetByName(name); return s ? Math.max(s.getLastRow() - 1, 0) : 0; };
  out.configured = true;
  out.name = bss.getName();
  out.url = bss.getUrl();
  out.shidoRows = rows('指導記録');
  out.weeklyRows = rows('週次報告履歴');
  return out;
}

// スプレッドシートのメニューから実行：バックアップ先の作成・確認と、待ちの再送
function setupBackup() {
  const lock = backupLock_();
  lock.waitLock(30000);
  let bss, sent;
  try {
    const existed = !!PropertiesService.getScriptProperties().getProperty('BACKUP_SPREADSHEET_ID');
    bss = openBackupSpreadsheet_();
    sent = flushPendingBackups_(bss, existed ? [] : ['指導記録']);
  } finally {
    releaseLockAfterFlush_(lock);
  }
  SpreadsheetApp.getUi().alert('バックアップ先：' + bss.getName() + '\n' + bss.getUrl() +
    (sent ? '\n\nバックアップ待ちだった ' + sent + ' 件を送りました。' : '\n\nバックアップ待ちはありません。'));
}
