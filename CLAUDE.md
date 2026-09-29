# エイメイ学院 生徒カルテ — CLAUDE.md

## スタック
- **フロントエンド**: `index.html`（単一ファイル、2925行、フレームワークなし） / `student.html`（成績単体入力フォーム、313行）
- **バックエンド**: Google Apps Script（スプレッドシートDB、`clasp` で `gas/` を push）
  - `gas/code.gs`（1233行）— 既存機能（面談・成績・カルテ・通知表・志望校、取り込み処理）
  - `gas/shido.gs`（443行）— 指導記録・マスタ・進度・カルテ用データ（新機能は action で振り分け）
- **API中継（Vercel）**: `api/*.js`
  - `_auth.js` 共通認証 / `_gas.js` GAS_URL取得（**未設定ならエラー。本番URLへのフォールバックはしない**）
  - `save.js`（既存シートへの追記）/ `karte.js`（生徒一覧・カルテ取得）/ `shido.js`（指導系。許可した action のみ中継）
  - `save-public.js`（認証なし。成績・志望校・通知表のみ。`action` は除去して転送）/ `claude.js`（AI生成）/ `login.js`
- **デプロイ**: GitHub → Vercel自動デプロイ / GASは`npx clasp push` + `npx clasp deploy --deploymentId AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw`

## 環境変数（Vercel）
- `GAS_URL`（必須。Production=本番GAS、Preview=テスト用GAS）/ `AUTH_TOKEN` / `APP_PASSWORD` / `ANTHROPIC_API_KEY`
- `SHIDO_KEY`（指導系の合言葉。`api/shido.js` だけがGASへ付与する。未設定なら `api/shido.js` はエラー）
- `AUTH_TOKEN` / `SHIDO_KEY` はGAS側スクリプトプロパティの同名の値と一致させる（テスト環境は本番と別の値にする）
- GAS側は `SHIDO_KEY` 未設定または不一致なら指導系の処理をすべて `unauthorized` で拒否する（旧 save-public 等の経路からは届かない）

## GAS重要事項
- `clasp push`はHEADのみ更新。変更を反映するには必ず`clasp deploy --deploymentId ...`も実行する
- `.clasp.json` は本番スクリプトを指す。テスト用GASへ push するときは別の設定を使い、本番に push しない
- スプレッドシート名: **生徒カルテ**（`renameToKarte()`で変更済み）
- シート一覧: `生徒面談` / `保護者面談` / `成績` / `カルテ` / `音声記録` / `志望校` / `通知表` / `指導記録` / `タグマスタ` / `講師マスタ` / `進度`
- 指導系シートはメニュー「成績管理 → 指導系シートを作成」（`setupShidoSheets`）で作成。タグマスタは初期タグ入りで作られる

## スプレッドシートのヘッダー
- 既存: `gas/code.gs` HEADERS定数（L53〜）
  - **成績**: 日付/生徒名/校舎名/学年/テスト名/北辰実施回/国語〜社会/合計/クラス順位/学年順位/各偏差値/コメント
  - **志望校**: 日付/生徒名/校舎名/学年/調査月/第一志望〜第四志望
  - **通知表**: 日付/生徒名/校舎名/学年 + `中1_国語_1学期`形式で108列（中1〜中3 × 9科目 × 3学期+年）
- 指導系: `gas/shido.gs` SHIDO_HEADERS
  - **指導記録**（1行=1生徒×1コマ×1教科）: 記録ID/入力日時/指導日/校舎/講師/教科/生徒/学年/状態/来室回数/つまずきタグ/対応/一言メモ/対応済みフラグ
  - **タグマスタ**: 教科/タグ名/表示順/有効フラグ（教科「共通」は全教科に表示）
  - **講師マスタ**: 講師名/所属校舎（「、」区切りで複数可・空欄は全校舎）/有効フラグ
  - **進度**（1行=1生徒×1教科）: 生徒/校舎/学年/教科/教科書/現在の単元/次の定期テスト日/テスト範囲/更新日
- 有効フラグ: 空欄・TRUE は有効、FALSE/0/×/無効 は無効

## 指導系の仕様・ルール
- 日付は `YYYY-MM-DD`、入力日時は `YYYY-MM-DD HH:mm:ss`（文字列列として保存。既存シートの日付形式は変更しない）
- 複数値（つまずきタグ・対応）は「、」区切り。タグ名中の「、」は「・」に置換
- 生徒名は一覧から選んだ文字列をそのまま保存。照合・集計は空白（全角/半角）を除いた正規化キー（`normName_` / `skNorm`）で行う
- 保存は記録ID（ブラウザ側で生成、行ごとに固定）で重複排除 → 通信失敗後の再送でも二重登録しない。1件でも不正なら全件保存しない
- 「順調」の記録はタグ・対応・メモを保存しない
- 先頭が `= + - @` の文字列は `safeCell_` で数式化を防ぐ
- **生徒の同一判定は「空白を除いた生徒名＋校舎グループ」**（`studentKey_` / `studentKeyOf`）。学年は表示用で、判定・集計に使わない（進級しても記録は分断されない）
- 校舎グループ：みずほ台校舎 と みずほ台校舎（Luce）は同じ校舎として扱う（`SCHOOL_GROUPS` / `SK_SCHOOL_GROUPS`）
- 指導記録に保存する学年は、絞り込みの学年ではなく記録上の最新の学年
- 「気になる」連続回数・「順調」連続回数は **生徒×教科** 単位で、最新の記録からさかのぼって数える。最終記録から14日以上空いた教科はカルテで⚠表示
- 進度は1生徒×1教科で1行。同じ生徒（同一判定キー）×教科なら上書きし、生徒名の元の表記は残す
- **innerHTML に入れる値はすべてエスケープする**：単体は `esc()`、シートのデータをまとめて表示するときは `escDeep()` でコピーを作る（元データはAIプロンプト用にそのまま残す）。AI生成文・エラーメッセージも対象
- インラインの `onclick` 等に生徒名などの値を埋め込まない（エスケープしても属性値として復号され、JSとして実行されるため）。カルテのボタンは `karteCurrentName` を参照する
- 指導系のPOSTは `shidoAction` で振り分ける（既存の保護者面談が「次回アクション」を `action` キーで送るため、`action` で判定しない）

## index.html 主要関数と行番号
| 関数 | 行 | 役割 |
|---|---|---|
| `initCal` | 1125 | カレンダー初期化（存在する要素のみ描画） |
| `switchTab` / `switchGroup` | 1209 / 1204 | タブ切替。指導系/面談系の2グループ、カルテは両方に配置。最終タブを localStorage に保存 |
| `generateReport` | 1318 | 生徒面談の報告文生成 |
| `generateParentMemo` | 1382 | 保護者面談まとめ文生成 |
| `saveGrade` | 1452 | テスト成績をGASに保存 |
| `searchKarte` | 1478 | カルテ取得（既存データ＋指導記録・進度を並行取得。指導側の失敗は既存表示に影響させない） |
| `toggleCard` | 1537 | カルテ各セクションの折りたたみ制御 |
| `renderKarte` | 1543 | カルテ画面HTML生成（指導の状況/成績/成績グラフ/通知表/志望校/タイムライン） |
| `generateKarte` | 1742 | AIカルテ文生成（Claude API呼び出し） |
| `saveTargetSchools` | 1838 | 志望校をGASに保存 |
| `saveReportCard` | 1864 | 通知表をGASに保存 |
| `generateAudioSummary` | 1913 | テキストまとめ生成 |
| `skLoadDraft` | 2044 | 下書き（localStorage `shidoDraft_v1`）の復元 |
| `skEnsureLoaded` | 2076 | 指導記録タブの初期化（下書き復元・マスタ/生徒一覧取得） |
| `skRenderList` / `skRowHtml` | 2192 / 2209 | 生徒一覧・各行（出席/状態/来室回数/気になる詳細） |
| `skOnListClick` | 2246 | 一覧の操作（イベント委譲、`data-act`） |
| `skConfirmSave` / `skDoSave` | 2332 / 2351 | 確認モーダル → まとめて保存 |
| `pgEnsureLoaded` / `pgRender` / `pgSave` | 2406 / 2473 / 2515 | 進度タブ（校舎→生徒→教科→保存） |
| `shidoSubjectStats` | 2544 | 教科ごとの連続回数・最終記録・来室合計 |
| `renderShidoKarte` | 2557 | カルテの「指導の状況」カード群（進度・直近5件・教科ごとの状況・タグ・来室） |
| `karteVisitsHtml` | 2635 | 来室回数の棒グラフ（SVG、タップで詳細） |
| `renderGradeCharts` | 2699 | 成績の推移グラフ（定期テスト合計・北辰5科偏差値を別グラフ） |
| `showA4Preview` | 2718 | A4印刷プレビュー生成（指導記録はまだ含まない） |

## gas 主要関数
| 関数 | ファイル:行 | 役割 |
|---|---|---|
| `doPost` | code.gs:119 | `action` があれば `handleShidoPost_`、なければ既存の各シート追記 |
| `doGet` | code.gs:218 | getStudent / listStudents / 指導系GET（`SHIDO_GET_ACTIONS`） |
| `getStudentData` | code.gs:265 | 生徒名で全シートを横断検索してJSON返却 |
| `resetNoticeSheet` | code.gs:487 | 通知表シートを正しいヘッダーで再作成 |
| `bulkImportGrades` | code.gs:869 | 成績入力シートから成績シートへ一括転記 |
| `studentKey_` | shido.gs:55 | 生徒の同一判定キー（正規化名＋校舎グループ） |
| `setupShidoSheets` | shido.gs:107 | 指導系4シートを作成（既存シートは変更しない） |
| `isShidoKeyValid_` | shido.gs:134 | 合言葉 SHIDO_KEY の照合（未設定なら常に拒否） |
| `getShidoMasters_` | shido.gs:153 | タグ（教科別・表示順）と講師の一覧 |
| `listStudentsDetailed_` | shido.gs:186 | 校舎の生徒一覧（表記ゆれ統合・学年一覧・最新学年） |
| `saveShidoRecords_` | shido.gs:266 | 指導記録のまとめ保存（検証・ロック・記録ID重複排除） |
| `getStudentShido_` | shido.gs:315 | 生徒1人分の指導記録（指導日順）と進度 |
| `saveProgress_` | shido.gs:389 | 進度の保存（同一生徒×教科は上書き） |

## CSS主要クラス（index.html L30〜）
- `.card` / `.card-title` / `.card-body` / `.card-toggle` — カルテカード折りたたみUI
- `.grade-table` — 成績テーブル
- `.tl-item` / `.tl-badge` — 面談タイムライン
- `.nc-grade-btn` — 通知表タブボタン
- `.group-nav` / `.group-btn` — 指導系/面談系の切替（L280〜）
- `.sk-*` — 指導記録画面（L285〜）。タップ領域は最小40〜44px
- `.pg-*` / `.days-chip` — 進度画面（L339〜）
- `.kt-*` / `.chart-*` — カルテの指導の状況・グラフ（L353〜）。グラフは1系列=青 #378ADD（折れ線は #185FA5）、気になる=#D97706、凡例あり
