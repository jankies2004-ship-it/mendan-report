function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// 一括取り込みシートの校舎名(「エイメイ学院 みずほ台校舎」形式)を
// Webフォームの校舎名(「みずほ台校舎」形式)に統一するマッピング
const SCHOOL_ALIASES = {
  'エイメイ学院 みずほ台校舎': 'みずほ台校舎',
  'エイメイ学院 鶴瀬校舎': '鶴瀬校舎',
  'エイメイ学院 ふじみ野校舎': 'ふじみ野校舎',
  'エイメイ学院 トナリエふじみ野校舎': 'トナリエふじみ野校舎',
  'エイメイ学院 富士見羽沢校舎': '富士見羽沢校舎',
  'エイメイ学院 水谷校舎': '水谷校舎',
  '明成個別 鶴瀬東校舎': '鶴瀬東校舎',
  '明成個別 鶴瀬西校舎': '鶴瀬西校舎',
  '明成個別 三芳藤久保校舎': '三芳藤久保校舎',
  '明成個別 ふじみ野大井校舎': 'ふじみ野大井校舎',
  '明成個別 トナリエふじみ野校舎': 'トナリエふじみ野校舎（個別）',
  '明成個別 ふじみ野西口校舎': 'ふじみ野西口校舎',
  '明成個別 ふじみ野上福岡校舎': 'ふじみ野上福岡校舎',
  '明成個別 新河岸校舎': '新河岸校舎',
  '明成個別 南古谷校舎': '南古谷校舎',
  '明成個別 川越南大塚校舎': '川越南大塚校舎',
  '明成個別 志木校舎': '志木校舎',
  '明成個別 朝霞台校舎': '朝霞台校舎',
  'Elena個別女子 水谷校舎': '水谷校舎（Elena）',
  'Elena個別女子 ふじみ野西口校舎': 'ふじみ野西口校舎（Elena）',
  'EIMEI予備校 鶴瀬校舎': '鶴瀬校舎（予備校）',
  'EIMEI予備校 ふじみ野駅前校舎': 'ふじみ野駅前校舎',
  'Luce個別指導 みずほ台校舎': 'みずほ台校舎（Luce）',
  'Luce個別指導 鶴瀬校舎': '鶴瀬校舎（Luce）'
};

function canonicalSchool(school) {
  const s = (school || '').trim();
  return SCHOOL_ALIASES[s] || s;
}

const HEADERS = {
  '生徒面談': ['日付','生徒名','校舎名','学年','チェック項目','楽しいこと','生活メモ','授業態度','得意科目','苦手科目','成績推移','勉強メモ','進路関心度','志望校','進路メモ','いいところ','指導方針','特記事項','報告文'],
  '保護者面談': ['日付','生徒名','校舎名','学年','続柄','生活リズム','チェック項目','家庭メモ','相談・要望メモ','塾の提案','保護者印象','次回アクション','まとめ文'],
  '成績': ['日付','生徒名','校舎名','学年','テスト名','北辰実施回','国語','数学','英語','理科','社会','合計','クラス順位','学年順位','国語偏差値','数学偏差値','英語偏差値','理科偏差値','社会偏差値','3科偏差値','5科偏差値','コメント'],
  'カルテ': ['日付','生徒名','校舎名','カルテ文'],
  '音声記録': ['日付','生徒名','校舎名','種類','まとめ文'],
  '志望校': ['日付','生徒名','校舎名','学年','第一志望','第二志望','第三志望','第四志望'],
  '通知表': ['日付','生徒名','校舎名','学年',
    '中1_国語_1学期','中1_国語_2学期','中1_国語_3学期','中1_国語_年',
    '中1_数学_1学期','中1_数学_2学期','中1_数学_3学期','中1_数学_年',
    '中1_英語_1学期','中1_英語_2学期','中1_英語_3学期','中1_英語_年',
    '中1_理科_1学期','中1_理科_2学期','中1_理科_3学期','中1_理科_年',
    '中1_社会_1学期','中1_社会_2学期','中1_社会_3学期','中1_社会_年',
    '中1_音楽_1学期','中1_音楽_2学期','中1_音楽_3学期','中1_音楽_年',
    '中1_美術_1学期','中1_美術_2学期','中1_美術_3学期','中1_美術_年',
    '中1_保健体育_1学期','中1_保健体育_2学期','中1_保健体育_3学期','中1_保健体育_年',
    '中1_技術家庭_1学期','中1_技術家庭_2学期','中1_技術家庭_3学期','中1_技術家庭_年',
    '中2_国語_1学期','中2_国語_2学期','中2_国語_3学期','中2_国語_年',
    '中2_数学_1学期','中2_数学_2学期','中2_数学_3学期','中2_数学_年',
    '中2_英語_1学期','中2_英語_2学期','中2_英語_3学期','中2_英語_年',
    '中2_理科_1学期','中2_理科_2学期','中2_理科_3学期','中2_理科_年',
    '中2_社会_1学期','中2_社会_2学期','中2_社会_3学期','中2_社会_年',
    '中2_音楽_1学期','中2_音楽_2学期','中2_音楽_3学期','中2_音楽_年',
    '中2_美術_1学期','中2_美術_2学期','中2_美術_3学期','中2_美術_年',
    '中2_保健体育_1学期','中2_保健体育_2学期','中2_保健体育_3学期','中2_保健体育_年',
    '中2_技術家庭_1学期','中2_技術家庭_2学期','中2_技術家庭_3学期','中2_技術家庭_年',
    '中3_国語_1学期','中3_国語_2学期','中3_国語_3学期','中3_国語_年',
    '中3_数学_1学期','中3_数学_2学期','中3_数学_3学期','中3_数学_年',
    '中3_英語_1学期','中3_英語_2学期','中3_英語_3学期','中3_英語_年',
    '中3_理科_1学期','中3_理科_2学期','中3_理科_3学期','中3_理科_年',
    '中3_社会_1学期','中3_社会_2学期','中3_社会_3学期','中3_社会_年',
    '中3_音楽_1学期','中3_音楽_2学期','中3_音楽_3学期','中3_音楽_年',
    '中3_美術_1学期','中3_美術_2学期','中3_美術_3学期','中3_美術_年',
    '中3_保健体育_1学期','中3_保健体育_2学期','中3_保健体育_3学期','中3_保健体育_年',
    '中3_技術家庭_1学期','中3_技術家庭_2学期','中3_技術家庭_3学期','中3_技術家庭_年']
};

function ensureSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
  }
  return sheet;
}

function buildRow(headers, data) {
  return headers.map(h => data[h] !== undefined ? data[h] : '');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet_name = data.sheet;
    if (!HEADERS[sheet_name]) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unknown sheet' })).setMimeType(ContentService.MimeType.JSON);
    }
    const ss = getSpreadsheet();
    const sheet = ensureSheet(ss, sheet_name);

    const rowData = {};
    rowData['日付'] = data.date || '';
    rowData['生徒名'] = data.name || '';
    rowData['校舎名'] = data.school || '';

    if (sheet_name === '生徒面談') {
      rowData['学年'] = data.grade || '';
      rowData['チェック項目'] = data.checks || '';
      rowData['楽しいこと'] = data.enjoy || '';
      rowData['生活メモ'] = data.life_memo || '';
      rowData['授業態度'] = data.attitude || '';
      rowData['得意科目'] = data.strong || '';
      rowData['苦手科目'] = data.weak || '';
      rowData['成績推移'] = data.result || '';
      rowData['勉強メモ'] = data.study_memo || '';
      rowData['進路関心度'] = data.career_interest || '';
      rowData['志望校'] = data.target || '';
      rowData['進路メモ'] = data.career_memo || '';
      rowData['いいところ'] = data.good || '';
      rowData['指導方針'] = data.policy || '';
      rowData['特記事項'] = data.note || '';
      rowData['報告文'] = data.report || '';
    } else if (sheet_name === '保護者面談') {
      rowData['学年'] = data.grade || '';
      rowData['続柄'] = data.relation || '';
      rowData['生活リズム'] = data.rhythm || '';
      rowData['チェック項目'] = data.checks || '';
      rowData['家庭メモ'] = data.home_memo || '';
      rowData['相談・要望メモ'] = data.request_memo || '';
      rowData['塾の提案'] = data.proposal_memo || '';
      rowData['保護者印象'] = data.impression || '';
      rowData['次回アクション'] = data.action || '';
      rowData['まとめ文'] = data.memo || '';
    } else if (sheet_name === '成績') {
      rowData['学年'] = data.grade || '';
      rowData['テスト名'] = data.test || '';
      rowData['北辰実施回'] = data.test_round || '';
      rowData['国語'] = data['国語'] !== undefined ? data['国語'] : '';
      rowData['数学'] = data['数学'] !== undefined ? data['数学'] : '';
      rowData['英語'] = data['英語'] !== undefined ? data['英語'] : '';
      rowData['理科'] = data['理科'] !== undefined ? data['理科'] : '';
      rowData['社会'] = data['社会'] !== undefined ? data['社会'] : '';
      rowData['合計'] = data.total !== undefined ? data.total : '';
      rowData['クラス順位'] = data.class_rank || '';
      rowData['学年順位'] = data.grade_rank || '';
      rowData['国語偏差値'] = data['国語偏差値'] || '';
      rowData['数学偏差値'] = data['数学偏差値'] || '';
      rowData['英語偏差値'] = data['英語偏差値'] || '';
      rowData['理科偏差値'] = data['理科偏差値'] || '';
      rowData['社会偏差値'] = data['社会偏差値'] || '';
      rowData['3科偏差値'] = data['3科偏差値'] || '';
      rowData['5科偏差値'] = data['5科偏差値'] || '';
      rowData['コメント'] = data.comment || '';
    } else if (sheet_name === 'カルテ') {
      rowData['カルテ文'] = data.karte || '';
    } else if (sheet_name === '音声記録') {
      rowData['種類'] = data.type || '';
      rowData['まとめ文'] = data.summary || '';
    } else if (sheet_name === '志望校') {
      rowData['学年'] = data.grade || '';
      rowData['第一志望'] = data.school1 || '';
      rowData['第二志望'] = data.school2 || '';
      rowData['第三志望'] = data.school3 || '';
      rowData['第四志望'] = data.school4 || '';
    } else if (sheet_name === '通知表') {
      rowData['学年'] = data.grade || '';
      ['中1','中2','中3'].forEach(g => {
        ['国語','数学','英語','理科','社会','音楽','美術','保健体育','技術家庭'].forEach(s => {
          ['1学期','2学期','3学期','年'].forEach(t => {
            const key = g + '_' + s + '_' + t;
            rowData[key] = data[key] || '';
          });
        });
      });
    }

    sheet.appendRow(buildRow(HEADERS[sheet_name], rowData));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getStudent') {
    return getStudentData(e);
  }
  if (action === 'listStudents') {
    return getStudentsBySchool(e);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function getStudentsBySchool(e) {
  const school = e.parameter.school || '';
  const grade  = e.parameter.grade  || '';
  const ss = getSpreadsheet();
  const names = new Set();
  ['生徒面談','保護者面談','成績','カルテ','音声記録','志望校','通知表'].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const nameIdx  = headers.indexOf('生徒名');
    const schoolIdx = headers.indexOf('校舎名');
    const gradeIdx  = headers.indexOf('学年');
    if (nameIdx === -1) return;
    // 学年フィルタ指定時、学年列のないシートはスキップ
    if (grade && gradeIdx === -1) return;
    for (let i = 1; i < rows.length; i++) {
      const rowName   = String(rows[i][nameIdx] || '').trim();
      const rowSchool = canonicalSchool(schoolIdx >= 0 ? String(rows[i][schoolIdx] || '') : '');
      const rowGrade  = gradeIdx >= 0 ? String(rows[i][gradeIdx] || '').trim() : '';
      if (!rowName) continue;
      if (school && rowSchool !== school) continue;
      if (grade && rowGrade !== grade) continue;
      names.add(rowName);
    }
  });
  const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ja'));
  return ContentService.createTextOutput(JSON.stringify({ students: sorted })).setMimeType(ContentService.MimeType.JSON);
}

function getStudentData(e) {
  const name = e.parameter.name;
  const school = e.parameter.school || '';
  if (!name) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'name is required' })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = getSpreadsheet();
  const result = { name: name, school: school, grade: [], student: [], parent: [], audio: [], karte: [], notice: [], target: [] };

  // 成績
  const gradeSheet = ss.getSheetByName('成績');
  if (gradeSheet) {
    const rows = gradeSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        // 英語キーエイリアス
        entry.date  = entry['日付'];
        entry.test  = entry['テスト名'];
        entry.total = entry['合計'];
        entry.comment = entry['コメント'];
        result.grade.push(entry);
      }
    }
  }

  // 生徒面談
  const sSheet = ss.getSheetByName('生徒面談');
  if (sSheet) {
    const rows = sSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date          = entry['日付'];
        entry.attitude      = entry['授業態度'];
        entry.strong        = entry['得意科目'];
        entry.weak          = entry['苦手科目'];
        entry.result        = entry['成績推移'];
        entry.checks        = entry['チェック項目'];
        entry.life_memo     = entry['生活メモ'];
        entry.study_memo    = entry['勉強メモ'];
        entry.career_memo   = entry['進路メモ'];
        entry.report        = entry['報告文'];
        result.student.push(entry);
      }
    }
  }

  // 保護者面談
  const pSheet = ss.getSheetByName('保護者面談');
  if (pSheet) {
    const rows = pSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date         = entry['日付'];
        entry.relation     = entry['続柄'];
        entry.rhythm       = entry['生活リズム'];
        entry.home_memo    = entry['家庭メモ'];
        entry.request_memo = entry['相談・要望メモ'];
        entry.memo         = entry['まとめ文'];
        result.parent.push(entry);
      }
    }
  }

  // 音声・テキストまとめ
  const aSheet = ss.getSheetByName('音声記録');
  if (aSheet) {
    const rows = aSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date    = entry['日付'];
        entry.type    = entry['種類'];
        entry.summary = entry['まとめ文'];
        result.audio.push(entry);
      }
    }
  }

  // 通知表
  const nSheet = ss.getSheetByName('通知表');
  if (nSheet) {
    const rows = nSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date = entry['日付'];
        result.notice.push(entry);
      }
    }
  }

  // 志望校
  const tSheet = ss.getSheetByName('志望校');
  if (tSheet) {
    const rows = tSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date = entry['日付'];
        result.target.push(entry);
      }
    }
  }

  // カルテ
  const kSheet = ss.getSheetByName('カルテ');
  if (kSheet) {
    const rows = kSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = canonicalSchool(String(row[headers.indexOf('校舎名')] || ''));
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date  = entry['日付'];
        entry.karte = entry['カルテ文'];
        result.karte.push(entry);
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('成績管理')
    .addItem('成績を一括転記', 'bulkImportGrades')
    .addItem('入力シートを初期化', 'setupGradeInputSheet')
    .addItem('テスト種別プルダウンを更新', 'updateTestTypeValidation')
    .addSeparator()
    .addSubMenu(ui.createMenu('【みずほ台①】成績取り込み')
      .addItem('中1-1学期中間', 'importSS1_1Nen1ChukanChuukan')
      .addItem('中1-1学期期末', 'importSS1_1Nen1ChukanKimatsu')
      .addItem('中1-2学期中間', 'importSS1_1Nen2ChukanChuukan')
      .addItem('中1-2学期期末', 'importSS1_1Nen2ChukanKimatsu')
      .addItem('中1-学年末',    'importSS1_1NenGakumatsu')
      .addItem('中2-1学期中間', 'importSS1_2Nen1ChukanChuukan')
      .addItem('中2-1学期期末', 'importSS1_2Nen1ChukanKimatsu')
      .addItem('中2-2学期中間', 'importSS1_2Nen2ChukanChuukan')
      .addItem('中2-2学期期末', 'importSS1_2Nen2ChukanKimatsu')
      .addItem('中2-学年末',    'importSS1_2NenGakumatsu')
      .addItem('中3-1学期中間', 'importSS1_3Nen1ChukanChuukan')
      .addItem('中3-1学期期末', 'importSS1_3Nen1ChukanKimatsu')
      .addItem('中3-2学期中間', 'importSS1_3Nen2ChukanChuukan')
      .addItem('中3-2学期期末', 'importSS1_3Nen2ChukanKimatsu')
      .addItem('中3-学年末',    'importSS1_3NenGakumatsu'))
    .addSubMenu(ui.createMenu('【みずほ台②】成績取り込み')
      .addItem('中1-1学期中間', 'importSS2_1Nen1ChukanChuukan')
      .addItem('中1-1学期期末', 'importSS2_1Nen1ChukanKimatsu')
      .addItem('中1-2学期中間', 'importSS2_1Nen2ChukanChuukan')
      .addItem('中1-2学期期末', 'importSS2_1Nen2ChukanKimatsu')
      .addItem('中1-学年末',    'importSS2_1NenGakumatsu')
      .addItem('中2-1学期中間', 'importSS2_2Nen1ChukanChuukan')
      .addItem('中2-1学期期末', 'importSS2_2Nen1ChukanKimatsu')
      .addItem('中2-2学期中間', 'importSS2_2Nen2ChukanChuukan')
      .addItem('中2-2学期期末', 'importSS2_2Nen2ChukanKimatsu')
      .addItem('中2-学年末',    'importSS2_2NenGakumatsu')
      .addItem('中3-1学期中間', 'importSS2_3Nen1ChukanChuukan')
      .addItem('中3-1学期期末', 'importSS2_3Nen1ChukanKimatsu')
      .addItem('中3-2学期中間', 'importSS2_3Nen2ChukanChuukan')
      .addItem('中3-2学期期末', 'importSS2_3Nen2ChukanKimatsu')
      .addItem('中3-学年末',    'importSS2_3NenGakumatsu'))
    .addSeparator()
    .addItem('成績シートのヘッダーを修正（北辰実施回 列を追加）', 'fixGradeSheetHeader')
    .addSeparator()
    .addItem('通知表シートをリセット（旧データ削除）', 'resetNoticeSheet')
    .addItem('スプレッドシート名を「生徒カルテ」に変更', 'renameToKarte')
    .addItem('外部SSのシート名を確認', 'checkExternalSheetNames')
    .addSeparator()
    .addItem('【みずほ台】2026年 中3 第1回 北辰テストを取り込む', 'importHokushin2026_3nen_1kai')
    .addToUi();
}

function resetNoticeSheet() {
  const ss = getSpreadsheet();
  const existing = ss.getSheetByName('通知表');
  if (existing) ss.deleteSheet(existing);
  const sheet = ss.insertSheet('通知表');
  const headers = HEADERS['通知表'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  SpreadsheetApp.getUi().alert('通知表シートをリセットしました。フォームからデータを再入力してください。');
}

function updateNoticeTableHeaders() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('通知表');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('「通知表」シートが見つかりません。一度保存してからお試しください。');
    return;
  }
  const headers = HEADERS['通知表'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  SpreadsheetApp.getUi().alert('通知表のヘッダーを更新しました（' + headers.length + '列）。');
}

function renameToKarte() {
  getSpreadsheet().rename('生徒カルテ');
  SpreadsheetApp.getUi().alert('スプレッドシート名を「生徒カルテ」に変更しました。');
}

function checkExternalSheetNames() {
  const ids = [
    '1iOvDWc4od1d4YigHsYQIjo_19cpqZHpifOwEE9VuQkM',
    '1_FL59HjPJ_sT8bG7jQ3lZinMngxl-7vCuz3bY2Az4ec'
  ];
  let msg = '';
  ids.forEach((id, i) => {
    try {
      const ss = SpreadsheetApp.openById(id);
      const names = ss.getSheets().map(s => s.getName()).join('\n  ');
      msg += '【スプレッドシート' + (i + 1) + '】\n  ' + names + '\n\n';
    } catch(e) {
      msg += '【スプレッドシート' + (i + 1) + '】アクセス失敗: ' + e.message + '\n\n';
    }
  });
  SpreadsheetApp.getUi().alert(msg);
}

function setupGradeInputSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('成績入力');
  if (!sheet) {
    sheet = ss.insertSheet('成績入力');
  }
  sheet.clearContents();
  sheet.clearFormats();

  const headers = ['日付','生徒名','校舎名','学年','テスト種別','北辰回数',
    '国語','数学','英語','理科','社会','合計',
    'クラス順位','学年順位',
    '国語偏差値','数学偏差値','英語偏差値','理科偏差値','社会偏差値',
    '3科偏差値','5科偏差値','コメント','転記済み'];
  sheet.appendRow(headers);

  // セクションごとに色分け
  // 基本情報 (A-F)
  sheet.getRange(1, 1, 1, 6).setBackground('#185FA5').setFontColor('#ffffff').setFontWeight('bold');
  // 定期テスト点数 (G-N)
  sheet.getRange(1, 7, 1, 8).setBackground('#0F6E56').setFontColor('#ffffff').setFontWeight('bold');
  // 北辰偏差値 (O-U)
  sheet.getRange(1, 15, 1, 7).setBackground('#7B4F9E').setFontColor('#ffffff').setFontWeight('bold');
  // コメント・転記済み (V-W)
  sheet.getRange(1, 22, 1, 2).setBackground('#555555').setFontColor('#ffffff').setFontWeight('bold');

  // セクション説明行
  sheet.insertRowBefore(1);
  sheet.getRange(1, 1, 1, 6).merge().setValue('● 基本情報')
    .setBackground('#D6E4F7').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 7, 1, 8).merge().setValue('● 定期テスト（点数）')
    .setBackground('#D4EDDA').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 15, 1, 7).merge().setValue('● 北辰テスト（偏差値）')
    .setBackground('#E8D5F5').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 22, 1, 2).merge().setValue('● 管理')
    .setBackground('#E8E8E8').setFontWeight('bold').setHorizontalAlignment('center');

  // 列幅調整
  sheet.setColumnWidth(1, 105);  // 日付
  sheet.setColumnWidth(2, 100);  // 生徒名
  sheet.setColumnWidth(3, 100);  // 校舎名
  sheet.setColumnWidth(4, 70);   // 学年
  sheet.setColumnWidth(5, 150);  // テスト種別
  sheet.setColumnWidth(6, 90);   // 北辰回数
  for (let c = 7; c <= 14; c++) sheet.setColumnWidth(c, 65);
  for (let c = 15; c <= 21; c++) sheet.setColumnWidth(c, 75);
  sheet.setColumnWidth(22, 120); // コメント
  sheet.setColumnWidth(23, 70);  // 転記済み

  // 転記済み列の背景
  sheet.getRange(3, 23, 200, 1).setBackground('#f5f5f5');

  // プルダウン：テスト種別
  const testTypes = [
    '中1-1学期中間','中1-1学期期末','中1-2学期中間','中1-2学期期末','中1-学年末',
    '中2-1学期中間','中2-1学期期末','中2-2学期中間','中2-2学期期末','中2-学年末',
    '中3-1学期中間','中3-1学期期末','中3-2学期中間','中3-2学期期末','中3-学年末',
    '1学期中間','1学期期末','2学期中間','2学期期末','学年末','塾内テスト','北辰テスト'
  ];
  const testRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(testTypes, true).setAllowInvalid(false).build();
  sheet.getRange(3, 5, 200, 1).setDataValidation(testRule);

  // プルダウン：北辰回数
  const rounds = ['第1回','第2回','第3回','第4回','第5回','第6回','第7回','第8回'];
  const roundRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(rounds, true).setAllowInvalid(false).build();
  sheet.getRange(3, 6, 200, 1).setDataValidation(roundRule);

  // プルダウン：学年
  const grades = ['小1','小2','小3','小4','小5','小6','中1','中2','中3','高1','高2','高3','既卒'];
  const gradeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(grades, true).setAllowInvalid(false).build();
  sheet.getRange(3, 4, 200, 1).setDataValidation(gradeRule);

  // プルダウン：校舎名
  const schools = [
    'エイメイ学院 みずほ台校舎','エイメイ学院 鶴瀬校舎','エイメイ学院 ふじみ野校舎',
    'エイメイ学院 トナリエふじみ野校舎','エイメイ学院 富士見羽沢校舎','エイメイ学院 水谷校舎',
    '明成個別 鶴瀬東校舎','明成個別 鶴瀬西校舎','明成個別 三芳藤久保校舎','明成個別 ふじみ野大井校舎',
    '明成個別 トナリエふじみ野校舎','明成個別 ふじみ野西口校舎','明成個別 ふじみ野上福岡校舎',
    '明成個別 新河岸校舎','明成個別 南古谷校舎','明成個別 川越南大塚校舎','明成個別 志木校舎','明成個別 朝霞台校舎',
    'Elena個別女子 水谷校舎','Elena個別女子 ふじみ野西口校舎',
    'EIMEI予備校 鶴瀬校舎','EIMEI予備校 ふじみ野駅前校舎',
    'Luce個別指導 みずほ台校舎','Luce個別指導 鶴瀬校舎'
  ];
  const schoolRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(schools, true).setAllowInvalid(false).build();
  sheet.getRange(3, 3, 200, 1).setDataValidation(schoolRule);

  Logger.log('「成績入力」シートを作成しました。');
}

// 既存の「成績入力」シートのテスト種別プルダウンだけ更新する（データは消えない）
function updateTestTypeValidation() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('成績入力');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('「成績入力」シートが見つかりません。');
    return;
  }
  const testTypes = [
    '中1-1学期中間','中1-1学期期末','中1-2学期中間','中1-2学期期末','中1-学年末',
    '中2-1学期中間','中2-1学期期末','中2-2学期中間','中2-2学期期末','中2-学年末',
    '中3-1学期中間','中3-1学期期末','中3-2学期中間','中3-2学期期末','中3-学年末',
    '1学期中間','1学期期末','2学期中間','2学期期末','学年末','塾内テスト','北辰テスト'
  ];
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(testTypes, true).setAllowInvalid(true).build();
  sheet.getRange(3, 5, 200, 1).setDataValidation(rule);
  SpreadsheetApp.getUi().alert('テスト種別のプルダウンを更新しました。\n既存データはそのまま残っています。');
}

// シート名を正規化して検索（半角・全角数字、前後スペース等を無視）
function findSheet_(ss, sheetName) {
  const normalize = s => s
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角→半角数字
    .replace(/\s/g, ''); // 空白除去
  const target = normalize(sheetName);
  return ss.getSheets().find(s => normalize(s.getName()) === target) || null;
}

// 外部スプレッドシートから左側生徒データ（今回の点数のみ）を成績シートに取り込む共通処理
function importFromExternal_(sheetName, testName, grade, ssId) {
  const EXTERNAL_SS_ID = ssId || '1iOvDWc4od1d4YigHsYQIjo_19cpqZHpifOwEE9VuQkM';
  const SCHOOL = 'みずほ台校舎';
  const GRADE = grade || '中1';

  const extSS = SpreadsheetApp.openById(EXTERNAL_SS_ID);
  const extSheet = findSheet_(extSS, sheetName);
  if (!extSheet) {
    SpreadsheetApp.getUi().alert('シート「' + sheetName + '」が見つかりません。');
    return;
  }

  const rows = extSheet.getDataRange().getValues();
  const gradeSheet = ensureSheet(getSpreadsheet(), '成績');

  // 列インデックス（0始まり）
  // 5:順位, 6:氏名, 8:今回英語, 9:数学, 10:国語, 11:理科, 12:社会, 13:5科計
  const toNum = v => (v !== '' && v !== '-' && !isNaN(Number(v))) ? Number(v) : '';

  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[6] || '').trim();
    if (!name) continue;

    const eng  = toNum(row[8]);
    const math = toNum(row[9]);
    const jpn  = toNum(row[10]);
    const sci  = toNum(row[11]);
    const soc  = toNum(row[12]);

    if ([eng, math, jpn, sci, soc].every(s => s === '')) continue;

    let total = toNum(row[13]);
    if (total === '') {
      const nums = [eng, math, jpn, sci, soc].filter(s => s !== '');
      total = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : '';
    }

    gradeSheet.appendRow(buildRow(HEADERS['成績'], {
      '日付': '', '生徒名': name, '校舎名': SCHOOL, '学年': GRADE, 'テスト名': testName,
      '北辰実施回': '', '国語': jpn, '数学': math, '英語': eng, '理科': sci, '社会': soc,
      '合計': total, 'クラス順位': '', '学年順位': toNum(row[5]),
      '国語偏差値': '', '数学偏差値': '', '英語偏差値': '', '理科偏差値': '', '社会偏差値': '',
      '3科偏差値': '', '5科偏差値': '', 'コメント': ''
    }));
    count++;
  }

  SpreadsheetApp.getUi().alert(count + '件を成績シートに取り込みました。\n校舎：' + SCHOOL + '\nテスト：' + testName);
}

const SS2_ID = '1_FL59HjPJ_sT8bG7jQ3lZinMngxl-7vCuz3bY2Az4ec';

// みずほ台① （１年：全角、2年・3年：半角）
function importSS1_1Nen1ChukanChuukan()  { importFromExternal_('１年１学期中間', '中1-1学期中間', '中1'); }
function importSS1_1Nen1ChukanKimatsu()  { importFromExternal_('１年１学期期末', '中1-1学期期末', '中1'); }
function importSS1_1Nen2ChukanChuukan()  { importFromExternal_('１年２学期中間', '中1-2学期中間', '中1'); }
function importSS1_1Nen2ChukanKimatsu()  { importFromExternal_('１年２学期期末', '中1-2学期期末', '中1'); }
function importSS1_1NenGakumatsu()       { importFromExternal_('１年学年末',     '中1-学年末',   '中1'); }
function importSS1_2Nen1ChukanChuukan()  { importFromExternal_('2年1学期中間',   '中2-1学期中間', '中2'); }
function importSS1_2Nen1ChukanKimatsu()  { importFromExternal_('2年1学期期末',   '中2-1学期期末', '中2'); }
function importSS1_2Nen2ChukanChuukan()  { importFromExternal_('2年2学期中間',   '中2-2学期中間', '中2'); }
function importSS1_2Nen2ChukanKimatsu()  { importFromExternal_('2年2学期期末',   '中2-2学期期末', '中2'); }
function importSS1_2NenGakumatsu()       { importFromExternal_('2年学年末',      '中2-学年末',   '中2'); }
function importSS1_3Nen1ChukanChuukan()  { importFromExternal_('3年1学期中間',   '中3-1学期中間', '中3'); }
function importSS1_3Nen1ChukanKimatsu()  { importFromExternal_('3年1学期期末',   '中3-1学期期末', '中3'); }
function importSS1_3Nen2ChukanChuukan()  { importFromExternal_('3年2学期中間',   '中3-2学期中間', '中3'); }
function importSS1_3Nen2ChukanKimatsu()  { importFromExternal_('3年2学期期末',   '中3-2学期期末', '中3'); }
function importSS1_3NenGakumatsu()       { importFromExternal_('3年学年末',      '中3-学年末',   '中3'); }

// みずほ台② （１年：全角、1学期期末のみ混在「1年１学期期末」、2年・3年：半角）
function importSS2_1Nen1ChukanChuukan()  { importFromExternal_('１年１学期中間', '中1-1学期中間', '中1', SS2_ID); }
function importSS2_1Nen1ChukanKimatsu()  { importFromExternal_('1年１学期期末', '中1-1学期期末', '中1', SS2_ID); }
function importSS2_1Nen2ChukanChuukan()  { importFromExternal_('１年２学期中間', '中1-2学期中間', '中1', SS2_ID); }
function importSS2_1Nen2ChukanKimatsu()  { importFromExternal_('１年２学期期末', '中1-2学期期末', '中1', SS2_ID); }
function importSS2_1NenGakumatsu()       { importFromExternal_('１年学年末',     '中1-学年末',   '中1', SS2_ID); }
function importSS2_2Nen1ChukanChuukan()  { importFromExternal_('2年1学期中間',   '中2-1学期中間', '中2', SS2_ID); }
function importSS2_2Nen1ChukanKimatsu()  { importFromExternal_('2年1学期期末',   '中2-1学期期末', '中2', SS2_ID); }
function importSS2_2Nen2ChukanChuukan()  { importFromExternal_('2年2学期中間',   '中2-2学期中間', '中2', SS2_ID); }
function importSS2_2Nen2ChukanKimatsu()  { importFromExternal_('2年2学期期末',   '中2-2学期期末', '中2', SS2_ID); }
function importSS2_2NenGakumatsu()       { importFromExternal_('2年学年末',      '中2-学年末',   '中2', SS2_ID); }
function importSS2_3Nen1ChukanChuukan()  { importFromExternal_('3年1学期中間',   '中3-1学期中間', '中3', SS2_ID); }
function importSS2_3Nen1ChukanKimatsu()  { importFromExternal_('3年1学期期末',   '中3-1学期期末', '中3', SS2_ID); }
function importSS2_3Nen2ChukanChuukan()  { importFromExternal_('3年2学期中間',   '中3-2学期中間', '中3', SS2_ID); }
function importSS2_3Nen2ChukanKimatsu()  { importFromExternal_('3年2学期期末',   '中3-2学期期末', '中3', SS2_ID); }
function importSS2_3NenGakumatsu()       { importFromExternal_('3年学年末',      '中3-学年末',   '中3', SS2_ID); }

function bulkImportGrades() {
  const ss = getSpreadsheet();
  const inputSheet = ss.getSheetByName('成績入力');
  if (!inputSheet) {
    Logger.log('「成績入力」シートが見つかりません。');
    return;
  }

  const gradeSheet = ensureSheet(ss, '成績');
  const data = inputSheet.getDataRange().getValues();
  // 2行目がヘッダー（1行目はセクション説明行）
  const headerRowIdx = data.findIndex(r => r[0] === '日付');
  if (headerRowIdx === -1) { Logger.log('ヘッダー行が見つかりません'); return; }
  const headers = data[headerRowIdx];
  const doneCol = headers.indexOf('転記済み');

  let count = 0;
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    if (row[doneCol] === '済') continue;

    const entry = {};
    headers.forEach((h, idx) => { entry[h] = row[idx]; });
    // 入力シートの列名を成績シートの列名にマッピング
    // 既に「中1-1学期中間」形式ならそのまま、旧形式「1学期中間」＋中学生なら付与
    const grade_ = String(entry['学年'] || '');
    const testBase_ = String(entry['テスト種別'] || '');
    const alreadyPrefixed = /^中[1-3]-/.test(testBase_);
    entry['テスト名'] = !alreadyPrefixed && ['中1','中2','中3'].includes(grade_) && testBase_ ? `${grade_}-${testBase_}` : testBase_;
    entry['北辰実施回'] = entry['北辰回数'] || '';
    // 校舎名を正規化（「エイメイ学院 みずほ台校舎」→「みずほ台校舎」）
    entry['校舎名'] = canonicalSchool(entry['校舎名'] || '');

    gradeSheet.appendRow(buildRow(HEADERS['成績'], entry));
    inputSheet.getRange(i + 1, doneCol + 1).setValue('済').setBackground('#d9ead3');
    count++;
  }

  Logger.log(count + '件を成績シートに転記しました。');
}

// 成績シートに「北辰実施回」列がなければ テスト名列の直後に挿入する
function fixGradeSheetHeader() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('成績');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('成績シートが見つかりません。');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headerRow.indexOf('北辰実施回') !== -1) {
    SpreadsheetApp.getUi().alert('成績シートのヘッダーは正常です。\n「北辰実施回」列はすでに存在しています。');
    return;
  }

  const testNameCol1 = headerRow.indexOf('テスト名') + 1; // 1-based
  if (testNameCol1 === 0) {
    SpreadsheetApp.getUi().alert('「テスト名」列が見つかりません。手動で確認してください。');
    return;
  }

  // テスト名列の直後に列を挿入して「北辰実施回」ヘッダーをセット
  sheet.insertColumnAfter(testNameCol1);
  sheet.getRange(1, testNameCol1 + 1).setValue('北辰実施回').setFontWeight('bold');

  SpreadsheetApp.getUi().alert(
    '「北辰実施回」列を追加しました（' + testNameCol1 + '列目の直後）。\n' +
    '既存データはそのまま保持されています。\n' +
    '次回から北辰テストの取り込みで回数が正しく入ります。'
  );
}

// 2026年度 中3 第1回 北辰テスト（みずほ台）— PDFより手動データ転記
function importHokushin2026_3nen_1kai() {
  const gradeSheet = ensureSheet(getSpreadsheet(), '成績');

  const DATE   = '2026/05/12';
  const SCHOOL = 'みずほ台校舎';
  const GRADE  = '中3';
  const TEST   = '北辰テスト';
  const ROUND  = '第1回';

  // [名前, 国語点, 数学点, 社会点, 理科点, 英語点, 5科計,
  //  国語偏, 数学偏, 社会偏, 理科偏, 英語偏, 3科偏, 5科偏]
  const students = [
    ['大嶋　結希',  30,  '',  '',  '',  '',  '',  33,  '',  '',  '',  '',  '',    ''],
    ['川崎　璃琥',  69,  73,  64,  50,  73, 329,  55,  67,  58,  53,  63, 62.0, 60.1],
    ['鈴木　颯人',  77,  55,  56,  53,  40, 281,  60,  55,  55,  54,  50, 54.2, 54.7],
    ['田中　蒼太',  68,  40,  71,  63,  28, 270,  55,  45,  62,  60,  45, 48.3, 53.5],
    ['越智　湊',    63,  50,  56,  44,  44, 257,  52,  51,  55,  50,  52, 51.7, 52.2],
    ['沢　一歩',    58,  43,  69,  60,  22, 252,  49,  47,  61,  58,  43, 46.3, 51.7],
    ['加藤　碧希',  63,  59,  34,  43,  43, 242,  52,  57,  44,  49,  51, 53.0, 50.6],
    ['細田　彩花',  71,  49,  40,  47,  26, 233,  57,  51,  47,  51,  44, 49.8, 49.7],
    ['伊藤　悠弥',  56,  41,  58,  43,  28, 226,  47,  45,  56,  49,  45, 46.6, 49.0],
    ['徳山　遙人',  70,  24,  41,  27,  41, 203,  56,  34,  48,  41,  50, 48.1, 46.6],
    ['武藤　楓',    65,  36,  46,  34,  20, 201,  53,  42,  50,  44,  42, 45.9, 46.4],
    ['武井　直優',  64,  27,  29,  41,  35, 196,  52,  36,  42,  48,  48, 46.7, 45.9],
    ['上原　佑理',  61,  25,  38,  34,  29, 187,  50,  35,  46,  44,  46, 45.0, 45.0],
    ['大高　要',    57,  33,  34,  39,  16, 179,  48,  40,  44,  47,  40, 43.5, 44.1],
    ['柴田　結衣',  18,  20,  21,  15,  18,  92,  28,  32,  38,  34,  41, 35.5, 34.8],
  ];

  students.forEach(([name, jpn, math, soc, sci, eng, total, jpnH, mathH, socH, sciH, engH, h3, h5]) => {
    gradeSheet.appendRow(buildRow(HEADERS['成績'], {
      '日付': DATE, '生徒名': name, '校舎名': SCHOOL, '学年': GRADE,
      'テスト名': TEST, '北辰実施回': ROUND,
      '国語': jpn, '数学': math, '英語': eng, '理科': sci, '社会': soc,
      '合計': total, 'クラス順位': '', '学年順位': '',
      '国語偏差値': jpnH, '数学偏差値': mathH, '英語偏差値': engH,
      '理科偏差値': sciH, '社会偏差値': socH,
      '3科偏差値': h3, '5科偏差値': h5, 'コメント': ''
    }));
  });

  SpreadsheetApp.getUi().alert(
    students.length + '件を成績シートに取り込みました。\n' +
    '2026年度 中3 第1回 北辰テスト（みずほ台）'
  );
}
