// ===== 週次報告（保護者向け） =====
// 塾長だけが使う。Vercel の api/weekly.js が塾長のトークンを確認してから中継する（api/shido.js は通さない）。
// 報告は 1生徒×1期間 で1行。生徒の同一判定は studentKey_（空白を除いた名前＋校舎グループ）。
// 状態: （行なし）=未作成 → 下書き → 確定 → 送信済み

const WEEKLY_STATUSES = ['下書き', '確定', '送信済み'];
const WEEKLY_MAX_DAYS = 31;
const WEEKLY_TEXT_MAX = 4000;
const WEEKLY_LOCK_MS = 15000;
const WEEKLY_BUSY_MESSAGE = '混み合っているため保存できませんでした。もう一度お試しください';

function validateWeeklyRange_(from, to) {
  const f = String(from || '').trim();
  const t = String(to || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('期間の指定が不正です');
  if (f > t) throw new Error('期間の開始日が終了日より後になっています');
  const days = (new Date(t + 'T00:00:00Z') - new Date(f + 'T00:00:00Z')) / 86400000 + 1;
  if (!(days >= 1 && days <= WEEKLY_MAX_DAYS)) throw new Error('期間は' + WEEKLY_MAX_DAYS + '日以内で指定してください');
  return { from: f, to: t };
}

function weeklyRowKey_(name, school, from, to) {
  return studentKey_(name, school) + '|' + from + '|' + to;
}

// 期間内の指導記録を生徒ごとにまとめる。onlyKey を指定するとその生徒だけ
function collectWeeklyRecords_(school, from, to, onlyKey) {
  const groups = {};
  const sheet = getSpreadsheet().getSheetByName('指導記録');
  if (!sheet) return groups;
  const schoolKey = schoolGroupKey_(school);
  readSheetObjects_(sheet).forEach(r => {
    const name = String(r['生徒'] || '').trim();
    if (!name) return;
    const date = fmtDate_(r['指導日']);
    if (date < from || date > to) return;
    const rowSchool = canonicalSchool(String(r['校舎'] || ''));
    if (schoolGroupKey_(rowSchool) !== schoolKey) return;
    const key = studentKey_(name, rowSchool);
    if (onlyKey && key !== onlyKey) return;
    if (!groups[key]) groups[key] = { key: key, forms: {}, records: [] };
    const g = groups[key];
    g.forms[name] = (g.forms[name] || 0) + 1;
    g.records.push({
      id: String(r['記録ID'] || ''),
      inputAt: fmtDateTime_(r['入力日時']),
      date: date,
      school: rowSchool,
      teacher: String(r['講師'] || ''),
      subject: String(r['教科'] || ''),
      grade: String(r['学年'] || ''),
      status: String(r['状態'] || ''),
      visits: Number(cellOf_(r, '指導記録', '指導回数')) || 0,
      tags: splitList_(r['つまずきタグ']),
      actions: splitList_(r['対応']),
      memo: String(r['一言メモ'] || '')
    });
  });
  Object.keys(groups).forEach(key => {
    const g = groups[key];
    g.records.sort((a, b) => a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.inputAt < b.inputAt ? -1 : a.inputAt > b.inputAt ? 1 : 0));
    // 表記ゆれがある場合は出現回数が最も多い表記を採用
    g.name = Object.keys(g.forms).sort((a, b) => g.forms[b] - g.forms[a])[0];
    const last = g.records[g.records.length - 1];
    g.grade = last.grade;
    g.school = last.school;
    const dates = {};
    g.records.forEach(r => { dates[r.date] = true; });
    g.days = Object.keys(dates).length;
    // 指導回数＝期間内の各記録の指導回数の合計（1コマ×1教科の記録ごとに入力された回数）
    g.lessons = g.records.reduce((a, r) => a + r.visits, 0);
  });
  return groups;
}

// 週次報告シートの行を { 行キー: {row, report} } で返す
function readWeeklyReports_(sheet) {
  const out = {};
  const rows = sheet.getDataRange().getValues();
  const h = rows[0];
  const col = name => h.indexOf(name);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r[col('生徒')] || '');
    if (!normName_(name)) continue;
    const from = fmtDate_(r[col('期間開始')]);
    const to = fmtDate_(r[col('期間終了')]);
    out[weeklyRowKey_(name, String(r[col('校舎')] || ''), from, to)] = {
      row: i + 1,
      values: r,
      report: {
        id: String(r[col('報告ID')] || ''),
        status: String(r[col('ステータス')] || ''),
        text: String(r[col('本文')] || ''),
        generatedAt: fmtDateTime_(r[col('生成日時')]),
        confirmedAt: fmtDateTime_(r[col('確定日時')]),
        sentAt: fmtDateTime_(r[col('送信日時')]),
        updatedAt: fmtDateTime_(r[col('更新日時')])
      }
    };
  }
  return out;
}

// ===== 一覧（塾長の確認画面用。講師メモも含む） =====
function listWeekly_(school, from, to) {
  if (!canonicalSchool(school)) throw new Error('校舎が指定されていません');
  const range = validateWeeklyRange_(from, to);
  const groups = collectWeeklyRecords_(canonicalSchool(school), range.from, range.to, '');
  const wSheet = getSpreadsheet().getSheetByName('週次報告');
  const reports = wSheet ? readWeeklyReports_(wSheet) : {};
  const students = Object.keys(groups).map(key => {
    const g = groups[key];
    const found = reports[key + '|' + range.from + '|' + range.to];
    return {
      key: key, name: g.name, school: g.school, grade: g.grade,
      days: g.days, lessons: g.lessons, count: g.records.length, records: g.records,
      report: found ? found.report : null
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return { from: range.from, to: range.to, students: students };
}

// ===== AI生成の材料（api/weekly.js 用） =====
// 講師メモ・講師名はここで落とし、AIへ渡す経路に乗せない
function getWeeklySource_(name, school, from, to) {
  if (!normName_(name)) throw new Error('生徒名が指定されていません');
  if (!canonicalSchool(school)) throw new Error('校舎が指定されていません');
  const range = validateWeeklyRange_(from, to);
  const key = studentKey_(name, school);
  const g = collectWeeklyRecords_(canonicalSchool(school), range.from, range.to, key)[key];
  if (!g) throw new Error('この期間の指導記録がありません');

  const records = g.records.map(r => ({
    date: r.date, subject: r.subject, status: r.status, tags: r.tags, actions: r.actions
  }));

  const subjects = {};
  records.forEach(r => { subjects[r.subject] = true; });
  const progress = [];
  const pSheet = getSpreadsheet().getSheetByName('進度');
  if (pSheet) {
    readSheetObjects_(pSheet).forEach(r => {
      if (studentKey_(String(r['生徒'] || ''), String(r['校舎'] || '')) !== key) return;
      const subject = String(r['教科'] || '');
      if (!subjects[subject]) return;
      progress.push({ subject: subject, unit: String(r['現在の単元'] || ''), testDate: fmtDate_(r['次の定期テスト日']) });
    });
  }

  const wSheet = getSpreadsheet().getSheetByName('週次報告');
  const found = wSheet ? readWeeklyReports_(wSheet)[key + '|' + range.from + '|' + range.to] : null;
  return {
    name: g.name, school: g.school, grade: g.grade, from: range.from, to: range.to,
    days: g.days, lessons: g.lessons, count: records.length, records: records, progress: progress,
    report: found ? { status: found.report.status } : null
  };
}

// ===== 保存 =====
// op: generated（AI生成の下書き。確定・送信済みは force がなければ上書きしない）
//     draft（編集した下書きの保存） / confirm（確定） / sent（送信済みにする。確定済みの本文と一致する場合のみ）
function saveWeeklyReport_(p) {
  if (!p || typeof p !== 'object') throw new Error('報告の内容がありません');
  const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
  const op = str(p.op, 20);
  if (['generated', 'draft', 'confirm', 'sent'].indexOf(op) === -1) throw new Error('操作の指定が不正です');
  const student = str(p.student, 50);
  const school = canonicalSchool(str(p.school, 50));
  if (!normName_(student)) throw new Error('生徒名が指定されていません');
  if (!school) throw new Error('校舎が指定されていません');
  const range = validateWeeklyRange_(p.from, p.to);
  const text = String(p.text === undefined || p.text === null ? '' : p.text).replace(/\r\n?/g, '\n').trim();
  if (text.length > WEEKLY_TEXT_MAX) throw new Error('報告文が長すぎます（' + WEEKLY_TEXT_MAX + '字まで）');
  if (op !== 'sent' && !text) throw new Error('報告文が空です');

  // 同時に保存が集中したときは待ちすぎない（Vercel の実行時間内に応答を返すため）。
  // この文言は api/weekly.js が「再試行してよいエラー」と判定するのに使う
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(WEEKLY_LOCK_MS)) throw new Error(WEEKLY_BUSY_MESSAGE);
  let result, backupRow;
  try {
    const sheet = ensureShidoSheet_(getSpreadsheet(), '週次報告');
    const headers = SHIDO_HEADERS['週次報告'];
    const found = readWeeklyReports_(sheet)[weeklyRowKey_(student, school, range.from, range.to)];
    const cur = found ? found.report : null;
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

    const next = {
      id: cur && cur.id ? cur.id : Utilities.getUuid(),
      status: cur ? cur.status : '',
      text: cur ? cur.text : '',
      generatedAt: cur ? cur.generatedAt : '',
      confirmedAt: cur ? cur.confirmedAt : '',
      sentAt: cur ? cur.sentAt : '',
      updatedAt: now
    };
    if (op === 'generated') {
      if (cur && (cur.status === '確定' || cur.status === '送信済み') && p.force !== true) {
        throw new Error('この報告はすでに' + cur.status + 'です。作り直す場合は確認のうえ再作成してください');
      }
      next.status = '下書き'; next.text = text; next.generatedAt = now; next.confirmedAt = ''; next.sentAt = '';
    } else if (op === 'draft') {
      next.status = '下書き'; next.text = text; next.confirmedAt = ''; next.sentAt = '';
    } else if (op === 'confirm') {
      next.status = '確定'; next.text = text; next.confirmedAt = now; next.sentAt = '';
    } else {
      if (!cur || (cur.status !== '確定' && cur.status !== '送信済み')) throw new Error('確定してから送信済みにしてください');
      if (text && text !== cur.text) throw new Error('確定後に本文が変更されています。もう一度確定してから送信済みにしてください');
      next.status = '送信済み';
      next.sentAt = cur.status === '送信済み' ? cur.sentAt : now;
    }

    const counts = {
      count: Number(p.count) >= 0 ? Math.min(Math.floor(Number(p.count)), 999) : '',
      lessons: Number(p.lessons) >= 0 ? Math.min(Math.floor(Number(p.lessons)), 999) : ''
    };
    const values = buildRow(headers, {
      '報告ID': next.id,
      '生徒': safeCell_(student),
      '校舎': safeCell_(school),
      '学年': safeCell_(str(p.grade, 10)),
      '期間開始': range.from,
      '期間終了': range.to,
      'ステータス': next.status,
      '本文': safeCell_(next.text),
      '記録件数': counts.count,
      '指導回数': counts.lessons,
      '生成日時': next.generatedAt,
      '確定日時': next.confirmedAt,
      '送信日時': next.sentAt,
      '更新日時': next.updatedAt
    });
    if (found) {
      // 既存の生徒名の表記・件数は残す（件数は生成時の値。空で上書きしない）
      const h = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      ['生徒', '学年', '記録件数', '指導回数'].forEach(name => {
        const idx = headers.indexOf(name);
        if (name === '生徒' || values[idx] === '') values[idx] = found.values[h.indexOf(name)];
      });
      sheet.getRange(found.row, 1, 1, headers.length).setValues([values]);
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([values]);
    }
    result = { ok: true, report: next };
    backupRow = backupWeeklyRow_(op, { student: student, school: school, grade: str(p.grade, 10), from: range.from, to: range.to }, next, now);
  } finally {
    releaseLockAfterFlush_(lock);
  }
  // 保存操作ごとに1行、別ファイルへ追記（書き換え前の文面も残る）
  backupAppend_('週次報告履歴', [backupRow]);
  return result;
}
