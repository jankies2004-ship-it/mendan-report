// ===== 指導記録・進度・マスタ =====
// 既存の HEADERS / doPost の汎用追記ルートとは切り離し、action 単位で処理する。
// 新シートは既存の { sheet: ... } 形式の書き込みでは扱えない（unknown sheet になる）。

const SHIDO_HEADERS = {
  '指導記録': ['記録ID','入力日時','指導日','校舎','講師','教科','生徒','学年','状態','来室回数','つまずきタグ','対応','一言メモ','対応済みフラグ'],
  'タグマスタ': ['教科','タグ名','表示順','有効フラグ'],
  '講師マスタ': ['講師名','所属校舎','有効フラグ'],
  '進度': ['生徒','校舎','学年','教科','教科書','現在の単元','次の定期テスト日','テスト範囲','更新日']
};

// 文字列として保持したい列（日付の自動変換を防ぐ）
const SHIDO_TEXT_COLUMNS = {
  '指導記録': ['記録ID','入力日時','指導日'],
  '進度': ['次の定期テスト日','更新日']
};

const SHIDO_SUBJECTS = ['国語','数学','英語','理科','社会','その他'];
const SHIDO_STATUSES = ['順調','気になる'];
const SHIDO_LIST_SEP = '、';

const SHIDO_DEFAULT_TAGS = {
  '共通': ['宿題未提出','ケアレスミスが多い','集中が続かない','間違い直しをしていない'],
  '国語': ['記述で根拠不足','品詞の識別が弱い','活用が弱い','抜き出しの範囲がずれる','古文の導入でつまずく','漢字・語句が弱い'],
  '数学': ['計算ミス（符号・分数）','文字式の扱いが弱い','方程式の立式ができない','関数・グラフの読み取りが弱い','図形の証明が書けない','文章題の読み取りが弱い'],
  '英語': ['単語・スペルが弱い','文法（時制・語順）が弱い','三単現・複数形のミス','長文読解が遅い','英作文で語順が崩れる','教科書本文の音読・暗記不足'],
  '理科': ['用語の暗記不足','計算問題（密度・濃度・電流など）が弱い','実験・グラフの読み取りが弱い','化学式・反応式が書けない','理由説明が書けない'],
  '社会': ['用語の暗記不足','年代・流れがつかめていない','地図・資料の読み取りが弱い','記述で理由を書けない','用語を漢字で書けない']
};

// 生徒一覧の収集元: [シート名, 生徒名列, 校舎列, 学年列]
const SHIDO_STUDENT_SOURCES = [
  ['生徒面談','生徒名','校舎名','学年'],
  ['保護者面談','生徒名','校舎名','学年'],
  ['成績','生徒名','校舎名','学年'],
  ['カルテ','生徒名','校舎名','学年'],
  ['音声記録','生徒名','校舎名','学年'],
  ['志望校','生徒名','校舎名','学年'],
  ['通知表','生徒名','校舎名','学年'],
  ['指導記録','生徒','校舎','学年']
];

const SHIDO_GRADE_ORDER = ['小1','小2','小3','小4','小5','小6','中1','中2','中3','高1','高2','高3','既卒'];

const SHIDO_GET_ACTIONS = ['getShidoMasters','listStudentsDetailed'];

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 空白（全角・半角）を除去した生徒名の照合キー
function normName_(s) {
  return String(s || '').replace(/[\s　]/g, '');
}

// 先頭が = + - @ の文字列は数式として解釈されないようにする
function safeCell_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// 有効フラグ: 空欄・TRUE・○などは有効、FALSE・0・×・無効は無効
function isEnabled_(v) {
  if (v === false) return false;
  const s = String(v).trim().toUpperCase();
  return ['FALSE','0','×','無効','NO'].indexOf(s) === -1;
}

function ensureShidoSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  const headers = SHIDO_HEADERS[name];
  sheet = ss.insertSheet(name);
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  (SHIDO_TEXT_COLUMNS[name] || []).forEach(h => {
    const col = headers.indexOf(h) + 1;
    sheet.getRange(1, col, sheet.getMaxRows(), 1).setNumberFormat('@');
  });
  if (name === 'タグマスタ') seedTagMaster_(sheet);
  return sheet;
}

function seedTagMaster_(sheet) {
  const rows = [];
  Object.keys(SHIDO_DEFAULT_TAGS).forEach(subject => {
    SHIDO_DEFAULT_TAGS[subject].forEach((tag, i) => rows.push([subject, tag, i + 1, true]));
  });
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).insertCheckboxes();
}

// スプレッドシートのメニューから実行: 指導系シートをまとめて作成（既存シートは変更しない）
function setupShidoSheets() {
  const ss = getSpreadsheet();
  const created = [];
  Object.keys(SHIDO_HEADERS).forEach(name => {
    if (!ss.getSheetByName(name)) created.push(name);
    ensureShidoSheet_(ss, name);
  });
  SpreadsheetApp.getUi().alert(created.length
    ? '作成しました：' + created.join('、') + '\n「講師マスタ」に講師名を追加してください。'
    : '指導系のシートはすべて作成済みです。');
}

function readSheetObjects_(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = rows[i][idx]; });
    out.push(obj);
  }
  return out;
}

// 指導系の処理は AUTH_TOKEN に加えて合言葉 SHIDO_KEY（スクリプトプロパティ）を要求する。
// api/shido.js だけが付与するため、旧 save-public など他の経路からは届かない。
// SHIDO_KEY 未設定時は常に拒否する。
function isShidoKeyValid_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHIDO_KEY');
  return !!expected && typeof key === 'string' && key === expected;
}

// ===== GET =====
function handleShidoGet_(e) {
  try {
    if (!isShidoKeyValid_(e.parameter.shidoKey)) return jsonOut_({ error: 'unauthorized' });
    const action = e.parameter.action;
    if (action === 'getShidoMasters') return jsonOut_(getShidoMasters_());
    if (action === 'listStudentsDetailed') return jsonOut_(listStudentsDetailed_(e.parameter.school || ''));
    return jsonOut_({ error: 'unknown action' });
  } catch (err) {
    return jsonOut_({ error: err.message });
  }
}

function getShidoMasters_() {
  const ss = getSpreadsheet();
  const tagRows = readSheetObjects_(ensureShidoSheet_(ss, 'タグマスタ'));
  const teacherRows = readSheetObjects_(ensureShidoSheet_(ss, '講師マスタ'));

  const orderOf = v => (v === '' || isNaN(Number(v))) ? Infinity : Number(v);
  const tags = {};
  tagRows
    .map((r, i) => ({
      subject: String(r['教科'] || '').trim(),
      tag: String(r['タグ名'] || '').trim().split(SHIDO_LIST_SEP).join('・'),
      order: orderOf(r['表示順']),
      enabled: isEnabled_(r['有効フラグ']),
      row: i
    }))
    .filter(t => t.subject && t.tag && t.enabled)
    .sort((a, b) => a.order !== b.order ? a.order - b.order : a.row - b.row)
    .forEach(t => {
      if (!tags[t.subject]) tags[t.subject] = [];
      if (tags[t.subject].indexOf(t.tag) === -1) tags[t.subject].push(t.tag);
    });

  const teachers = teacherRows
    .filter(r => String(r['講師名'] || '').trim() && isEnabled_(r['有効フラグ']))
    .map(r => ({
      name: String(r['講師名']).trim(),
      // 所属校舎は「、」または「,」区切りで複数可。空欄は全校舎扱い
      schools: String(r['所属校舎'] || '').split(/[、,，]/).map(s => canonicalSchool(s)).filter(Boolean)
    }));

  return { tags: tags, teachers: teachers };
}

function listStudentsDetailed_(school) {
  const ss = getSpreadsheet();
  const map = {};
  SHIDO_STUDENT_SOURCES.forEach(([sheetName, nameCol, schoolCol, gradeCol]) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const nameIdx = headers.indexOf(nameCol);
    const schoolIdx = headers.indexOf(schoolCol);
    const gradeIdx = headers.indexOf(gradeCol);
    if (nameIdx === -1) return;
    for (let i = 1; i < rows.length; i++) {
      const name = String(rows[i][nameIdx] || '').trim();
      if (!name) continue;
      const rowSchool = canonicalSchool(schoolIdx >= 0 ? String(rows[i][schoolIdx] || '') : '');
      if (!schoolMatches_(rowSchool, school)) continue;
      const key = normName_(name);
      if (!map[key]) map[key] = { forms: {}, grades: {} };
      map[key].forms[name] = (map[key].forms[name] || 0) + 1;
      const grade = gradeIdx >= 0 ? String(rows[i][gradeIdx] || '').trim() : '';
      if (grade) map[key].grades[grade] = true;
    }
  });

  const students = Object.keys(map).map(key => {
    const forms = map[key].forms;
    // 表記ゆれがある場合は出現回数が最も多い表記を採用
    const name = Object.keys(forms).sort((a, b) => forms[b] - forms[a])[0];
    const grades = Object.keys(map[key].grades).sort((a, b) => SHIDO_GRADE_ORDER.indexOf(a) - SHIDO_GRADE_ORDER.indexOf(b));
    return { name: name, key: key, grades: grades, grade: grades[grades.length - 1] || '' };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  return { students: students };
}

// ===== POST =====
function handleShidoPost_(data) {
  try {
    if (!isShidoKeyValid_(data.shidoKey)) return jsonOut_({ error: 'unauthorized' });
    if (data.action === 'saveShidoRecords') return jsonOut_(saveShidoRecords_(data.records));
    return jsonOut_({ error: 'unknown action' });
  } catch (err) {
    return jsonOut_({ error: err.message });
  }
}

function validateShidoRecord_(r, i) {
  const where = (i + 1) + '件目';
  const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
  const list = v => (Array.isArray(v) ? v : []).slice(0, 30).map(x => str(x, 60).split(SHIDO_LIST_SEP).join('・')).filter(Boolean);

  const rec = {
    id: str(r.id, 64),
    date: str(r.date, 10),
    school: canonicalSchool(str(r.school, 50)),
    teacher: str(r.teacher, 50),
    subject: str(r.subject, 10),
    student: str(r.student, 50),
    grade: str(r.grade, 10),
    status: str(r.status, 10),
    visits: Number(r.visits),
    tags: list(r.tags),
    actions: list(r.actions),
    memo: str(r.memo, 1000)
  };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(rec.id)) throw new Error(where + '：記録IDが不正です');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) throw new Error(where + '：指導日が不正です');
  if (!rec.school) throw new Error(where + '：校舎が未入力です');
  if (!rec.teacher) throw new Error(where + '：講師が未入力です');
  if (SHIDO_SUBJECTS.indexOf(rec.subject) === -1) throw new Error(where + '：教科が不正です');
  if (!rec.student) throw new Error(where + '：生徒名が未入力です');
  if (SHIDO_STATUSES.indexOf(rec.status) === -1) throw new Error(where + '：状態が不正です');
  if (!Number.isInteger(rec.visits) || rec.visits < 0 || rec.visits > 99) throw new Error(where + '：来室回数が不正です');
  if (rec.status === '順調') { rec.tags = []; rec.actions = []; rec.memo = ''; }
  return rec;
}

// 1件でも不正があれば全件保存しない（入力画面側に内容を残したまま修正・再送できるようにする）
function saveShidoRecords_(records) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('保存する記録がありません');
  if (records.length > 200) throw new Error('一度に保存できるのは200件までです');
  const recs = records.map(validateShidoRecord_);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = getSpreadsheet();
    const sheet = ensureShidoSheet_(ss, '指導記録');
    const headers = SHIDO_HEADERS['指導記録'];
    const lastRow = sheet.getLastRow();
    const existing = new Set(lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]))
      : []);

    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
    const rows = [];
    let skipped = 0;
    recs.forEach(rec => {
      // 通信失敗後の再送などで同じ記録IDが届いた場合は二重登録しない
      if (existing.has(rec.id)) { skipped++; return; }
      existing.add(rec.id);
      rows.push(buildRow(headers, {
        '記録ID': rec.id,
        '入力日時': now,
        '指導日': rec.date,
        '校舎': safeCell_(rec.school),
        '講師': safeCell_(rec.teacher),
        '教科': rec.subject,
        '生徒': safeCell_(rec.student),
        '学年': safeCell_(rec.grade),
        '状態': rec.status,
        '来室回数': rec.visits,
        'つまずきタグ': safeCell_(rec.tags.join(SHIDO_LIST_SEP)),
        '対応': safeCell_(rec.actions.join(SHIDO_LIST_SEP)),
        '一言メモ': safeCell_(rec.memo),
        '対応済みフラグ': ''
      }));
    });
    if (rows.length) sheet.getRange(lastRow + 1, 1, rows.length, headers.length).setValues(rows);
    return { ok: true, saved: rows.length, skipped: skipped };
  } finally {
    lock.releaseLock();
  }
}
