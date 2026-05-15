# エイメイ学院 生徒カルテ — CLAUDE.md

## スタック
- **フロントエンド**: `index.html`（単一ファイル、1684行） / `student.html`（成績単体入力フォーム、304行）
- **バックエンド**: `gas/code.gs`（Google Apps Script、478行）— スプレッドシートDB
- **API中継**: `api/karte.js`（Vercel Next.js APIルート、GASへのプロキシのみ）
- **デプロイ**: GitHub → Vercel自動デプロイ / GASは`npx clasp push` + `npx clasp deploy --deploymentId AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw`

## GAS重要事項
- `clasp push`はHEADのみ更新。変更を反映するには必ず`clasp deploy --deploymentId ...`も実行する
- スプレッドシート名: **生徒カルテ**（`renameToKarte()`で変更済み）
- シート一覧: `生徒面談` / `保護者面談` / `成績` / `カルテ` / `音声記録` / `志望校` / `通知表`

## スプレッドシートのヘッダー（`gas/code.gs` HEADERS定数 L8〜）
- **成績**: 日付/生徒名/校舎名/学年/テスト名/北辰実施回/国語〜社会/合計/クラス順位/学年順位/偏差値5科/コメント
- **志望校**: 日付/生徒名/校舎名/学年/第一志望〜第四志望
- **通知表**: 日付/生徒名/校舎名/学年 + `中1_国語_1学期`形式で112列（中1〜中3 × 9科目 × 3学期+年）

## index.html 主要関数と行番号
| 関数 | 行 | 役割 |
|---|---|---|
| `renderKarte` | 1132 | カルテ画面HTML生成（成績/通知表/志望校/タイムライン） |
| `generateKarte` | 1258 | AIカルテ文生成（Claude API呼び出し） |
| `showA4Preview` | 1514 | A4印刷プレビュー生成 |
| `saveGrade` | 1083 | テスト成績をGASに保存 |
| `saveReportCard` | 1371 | 通知表をGASに保存 |
| `saveTargetSchools` | 1345 | 志望校をGASに保存 |
| `toggleCard` | 1126 | カルテ各セクションの折りたたみ制御 |
| `generateReport` | 947 | 生徒面談の報告文生成 |
| `generateParentMemo` | 1010 | 保護者面談まとめ文生成 |
| `generateAudioSummary` | 1420 | 音声テキストまとめ生成 |

## 主要な仕様・ルール
- **テスト名フォーマット**: 中学生は`中1-1学期中間`形式（学年プレフィックス付き）、それ以外はそのまま
- **成績ソート優先順**: テスト種別（1学期中間<1学期期末<2学期中間<2学期期末<3学期/学年末）× 学年（中1<中2<中3）で降順。日付ではない
- **点数差分表示**: 最新行のみ、前回比を青（+）/ 赤（-）で表示
- **カルテ折りたたみ**: デフォルト折りたたみ（`card-body hidden` + `card-title collapsed`）、クリックでトグル
- **学年順位のみ表示**（クラス順位は非表示）

## gas/code.gs 主要関数
| 関数 | 行 | 役割 |
|---|---|---|
| `doPost` | 56 | 各シートへの書き込み振り分け |
| `getStudentData` | 157 | 生徒名で全シートを横断検索してJSON返却 |
| `resetNoticeSheet` | 328 | 通知表シートを正しいヘッダーで再作成 |
| `bulkImportGrades` | 444 | 成績入力シートから成績シートへ一括転記 |

## CSS主要クラス（index.html L30〜）
- `.card` / `.card-title` / `.card-body` / `.card-toggle` — カルテカード折りたたみUI
- `.grade-table` — 成績テーブル
- `.tl-item` / `.tl-badge` — 面談タイムライン
- `.nc-grade-btn` — 通知表タブボタン
