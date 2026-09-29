# エイメイ学院 生徒カルテ — CLAUDE.md

## スタック
- **フロントエンド**: `index.html`（単一ファイル、2502行、フレームワークなし） / `student.html`（成績単体入力フォーム、313行）
- **バックエンド**: Google Apps Script（スプレッドシートDB、`clasp` で `gas/` を push）
  - `gas/code.gs`（1233行）— 既存機能（面談・成績・カルテ・通知表・志望校、取り込み処理）
  - `gas/shido.gs`（287行）— 指導記録・マスタ・進度（新機能は action で振り分け）
- **API中継（Vercel）**: `api/*.js`
  - `_auth.js` 共通認証 / `_gas.js` GAS_URL取得（**未設定ならエラー。本番URLへのフォールバックはしない**）
  - `save.js`（既存シートへの追記）/ `karte.js`（生徒一覧・カルテ取得）/ `shido.js`（指導系。許可した action のみ中継）
  - `save-public.js`（認証なし。成績・志望校・通知表のみ。`action` は除去して転送）/ `claude.js`（AI生成）/ `login.js`
- **デプロイ**: GitHub → Vercel自動デプロイ / GASは`npx clasp push` + `npx clasp deploy --deploymentId AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw`

## 環境変数（Vercel）
- `GAS_URL`（必須。Production=本番GAS、Preview=テスト用GAS）/ `AUTH_TOKEN` / `APP_PASSWORD` / `ANTHROPIC_API_KEY`
- `AUTH_TOKEN` はGAS側スクリプトプロパティ `AUTH_TOKEN` と一致させる（テスト環境は本番と別の値にする）

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
- 「気になる」連続回数・「順調」連続回数は **生徒×教科** 単位で数える（Phase 2以降）
- 新規画面の表示は必ず `esc()` でエスケープする

## index.html 主要関数と行番号
| 関数 | 行 | 役割 |
|---|---|---|
| `initCal` | 1064 | カレンダー初期化（存在する要素のみ描画） |
| `switchTab` / `switchGroup` | 1148 / 1143 | タブ切替。指導系/面談系の2グループ、カルテは両方に配置。最終タブを localStorage に保存 |
| `generateReport` | 1242 | 生徒面談の報告文生成 |
| `generateParentMemo` | 1306 | 保護者面談まとめ文生成 |
| `saveGrade` | 1376 | テスト成績をGASに保存 |
| `toggleCard` | 1457 | カルテ各セクションの折りたたみ制御 |
| `renderKarte` | 1463 | カルテ画面HTML生成（成績/通知表/志望校/タイムライン） |
| `generateKarte` | 1650 | AIカルテ文生成（Claude API呼び出し） |
| `saveTargetSchools` | 1746 | 志望校をGASに保存 |
| `saveReportCard` | 1772 | 通知表をGASに保存 |
| `generateAudioSummary` | 1821 | テキストまとめ生成 |
| `skEnsureLoaded` | 1985 | 指導記録タブの初期化（下書き復元・マスタ/生徒一覧取得） |
| `skLoadDraft` | 1953 | 下書き（localStorage `shidoDraft_v1`）の復元 |
| `skRenderList` / `skRowHtml` | 2101 / 2118 | 生徒一覧・各行（出席/状態/来室回数/気になる詳細） |
| `skOnListClick` | 2155 | 一覧の操作（イベント委譲、`data-act`） |
| `skConfirmSave` / `skDoSave` | 2241 / 2260 | 確認モーダル → まとめて保存 |
| `showA4Preview` | 2298 | A4印刷プレビュー生成 |

## gas 主要関数
| 関数 | ファイル:行 | 役割 |
|---|---|---|
| `doPost` | code.gs:119 | `action` があれば `handleShidoPost_`、なければ既存の各シート追記 |
| `doGet` | code.gs:218 | getStudent / listStudents / 指導系GET（`SHIDO_GET_ACTIONS`） |
| `getStudentData` | code.gs:265 | 生徒名で全シートを横断検索してJSON返却 |
| `resetNoticeSheet` | code.gs:487 | 通知表シートを正しいヘッダーで再作成 |
| `bulkImportGrades` | code.gs:869 | 成績入力シートから成績シートへ一括転記 |
| `setupShidoSheets` | shido.gs:95 | 指導系4シートを作成（既存シートは変更しない） |
| `getShidoMasters_` | shido.gs:131 | タグ（教科別・表示順）と講師の一覧 |
| `listStudentsDetailed_` | shido.gs:164 | 校舎の生徒一覧（表記ゆれ統合・学年一覧・最新学年） |
| `saveShidoRecords_` | shido.gs:242 | 指導記録のまとめ保存（検証・ロック・記録ID重複排除） |

## CSS主要クラス（index.html L30〜）
- `.card` / `.card-title` / `.card-body` / `.card-toggle` — カルテカード折りたたみUI
- `.grade-table` — 成績テーブル
- `.tl-item` / `.tl-badge` — 面談タイムライン
- `.nc-grade-btn` — 通知表タブボタン
- `.group-nav` / `.group-btn` — 指導系/面談系の切替（L280〜）
- `.sk-*` — 指導記録画面（L285〜）。タップ領域は最小40〜44px
