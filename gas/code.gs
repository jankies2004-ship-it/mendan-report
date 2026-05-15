function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
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
  return ContentService.createTextOutput(JSON.stringify({ error: 'unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function getStudentData(e) {
  const name = e.parameter.name;
  const school = e.parameter.school || '';
  if (!name) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'name is required' })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = getSpreadsheet();
  const result = { name: name, school: school, grade: [], student: [], parent: [], audio: [], karte: [], notice: [] };

  // 成績
  const gradeSheet = ss.getSheetByName('成績');
  if (gradeSheet) {
    const rows = gradeSheet.getDataRange().getValues();
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowName = String(row[headers.indexOf('生徒名')] || '').trim();
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
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
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
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
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
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
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
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
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
      if (rowName === name.trim() && (!school || rowSchool === school.trim())) {
        const entry = {};
        headers.forEach((h, idx) => { entry[h] = row[idx]; });
        entry.date = entry['日付'];
        result.notice.push(entry);
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
      const rowSchool = String(row[headers.indexOf('校舎名')] || '').trim();
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
  SpreadsheetApp.getUi()
    .createMenu('成績管理')
    .addItem('成績を一括転記', 'bulkImportGrades')
    .addItem('入力シートを初期化', 'setupGradeInputSheet')
    .addSeparator()
    .addItem('通知表シートをリセット（旧データ削除）', 'resetNoticeSheet')
    .addItem('スプレッドシート名を「生徒カルテ」に変更', 'renameToKarte')
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
  const testTypes = ['1学期中間テスト','1学期期末テスト','2学期中間テスト','2学期期末テスト','学年末テスト','北辰テスト'];
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
    entry['テスト名'] = entry['テスト種別'] || '';
    entry['北辰実施回'] = entry['北辰回数'] || '';

    gradeSheet.appendRow(buildRow(HEADERS['成績'], entry));
    inputSheet.getRange(i + 1, doneCol + 1).setValue('済').setBackground('#d9ead3');
    count++;
  }

  Logger.log(count + '件を成績シートに転記しました。');
}
