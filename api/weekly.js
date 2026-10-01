// 週次報告（塾長専用）。塾長トークンを確認してからGASへ中継し、報告文の生成もここで行う。
// プロンプトはサーバー側で組み立てる（クライアントから文面の材料を受け取らない）。
// 講師メモ・講師名はGAS（getWeeklySource_）の時点で除かれ、ここでも許可した項目しか使わない。
import { checkAdmin } from './_auth.js';
import { getGasUrl } from './_gas.js';

// 1リクエスト = 1名分。まとめて作成は画面側から1名ずつ呼ぶので、人数が増えても1回の実行時間は増えない
export const config = { maxDuration: 60 };
// AIの呼び出し（再試行を含む）はリクエスト開始からこの時間までに打ち切り、
// 残り時間でGASへの保存と応答を必ず終える（Vercelの実行時間切れで結果が不明になるのを防ぐ）
const AI_DEADLINE_MS = 35000;
// GASが混み合っているとき（同時実行の上限・保存の順番待ち）の再試行は、リクエスト開始からこの時間まで
const GAS_RETRY_UNTIL_MS = 50000;
const GAS_PARSE_ERROR = 'GASの応答を解析できませんでした';
// 一時的な失敗（混雑・時間切れ）は retryable を付けて返し、まとめて作成では画面側が自動で再試行する
const retryableError = message => Object.assign(new Error(message), { retryable: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MODEL = 'claude-sonnet-5-5';
// 保護者に伝えてよい「対応」だけをAIに渡す（「保護者に連絡が必要」「責任教師に共有」などの塾内向けは渡さない）
const PARENT_ACTIONS = ['動画を案内した', '宿題を追加した', '次回もう一度確認'];
const POST_OPS = { saveDraft: 'draft', confirm: 'confirm', markSent: 'sent' };

const SYSTEM_PROMPT = `あなたは学習塾「エイメイ学院」の塾長として、保護者へLINEで送る1週間の学習報告を書きます。

守ること：
- 「今週の記録」に書かれた事実だけを使う。記録にない出来事・点数・発言・様子は書かない。
- 生徒のことは「{{生徒}}さん」と書き、名前は全体で1〜2回までにする（2回目以降は省くか「お子さま」）。講師の名前は書かない。
- 「順調」の記録は「順調に進みました」程度にとどめ、「集中していた」「落ち着いていた」など記録にない様子を付け足さない。
- 構成：あいさつ1文 → 今週の来室と取り組んだ教科 → 教科ごとの様子 → 定期テストが近ければひとこと → 締めの1文。
- 順調だった点はしっかり伝える。つまずきは、塾で行った対応とあわせて「〜を重点的に練習しています」のように前向きに伝え、不安をあおらない。
- 「気になる」「つまずき」という語や記録の項目名をそのまま並べず、保護者に自然に伝わる言葉に言い換える。
- ご家庭へのお願いは書かない（必要なら塾長が追記する）。
- 全体で250〜400字程度。LINEにそのまま貼るので、#、**、- などの記号や絵文字は使わない。教科ごとに改行し、見出しは【数学】のように書く。
- 出力は報告文の本文だけ。前置きや説明は書かない。`;

function md(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? `${Number(m[2])}月${Number(m[3])}日` : '';
}

// 使う項目を明示して組み立てる（レコードをそのまま展開しない）
function buildPrompt(src) {
  const lines = (src.records || []).map(r => {
    const parts = [`${md(r.date)} ${r.subject}：${r.status === '気になる' ? '課題あり' : '順調'}`];
    const tags = Array.isArray(r.tags) ? r.tags : [];
    if (tags.length) parts.push('つまずいた点：' + tags.join('、'));
    const acts = (Array.isArray(r.actions) ? r.actions : []).filter(a => PARENT_ACTIONS.includes(a));
    if (acts.length) parts.push('塾での対応：' + acts.join('、'));
    return '・' + parts.join(' / ');
  });
  const prog = (src.progress || []).filter(p => p.unit || p.testDate).map(p => {
    const parts = [];
    if (p.unit) parts.push('学習中の単元：' + p.unit);
    if (p.testDate && p.testDate >= src.from) parts.push('次の定期テスト：' + md(p.testDate));
    return parts.length ? `・${p.subject}　${parts.join(' / ')}` : '';
  }).filter(Boolean);

  return [
    `校舎：${src.school}`,
    `学年：${src.grade || '不明'}`,
    `期間：${md(src.from)}〜${md(src.to)}`,
    `来室：${src.days}日`,
    '',
    '今週の記録（指導日・教科ごと）：',
    ...lines,
    ...(prog.length ? ['', '教科の進度：', ...prog] : []),
    '',
    'この記録をもとに、保護者向けの今週の報告文を書いてください。'
  ].join('\n');
}

function finishText(text, name) {
  return String(text || '')
    .replace(/\{\{生徒\}\}/g, String(name || '').trim())
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();
}

async function callClaude(prompt, apiKey, deadline) {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: 'low' },
    // 安全分類器で断られた場合はAnthropic側で推奨モデルに切り替えて再実行する
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });
  const tooSlow = () => retryableError('AIの応答に時間がかかったため中断しました（保存はしていません）');
  // 再試行の待ち時間を入れても締め切りに間に合うときだけ再試行する
  const canRetry = wait => deadline - Date.now() - wait > 8000;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 5000) throw tooSlow();
    let response, data;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'server-side-fallback-2026-07-01'
        },
        body,
        signal: AbortSignal.timeout(remaining)
      });
      data = await response.json();
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') throw tooSlow();
      if (attempt === 3 || !canRetry(attempt * 2000)) throw retryableError('AIに接続できませんでした：' + e.message);
      await sleep(attempt * 2000);
      continue;
    }
    if (data.error) {
      // 429（利用上限）・混雑・5xx は一時的。retry-after があればそれに従う
      const temporary = data.error.type === 'overloaded_error' || data.error.type === 'rate_limit_error' || response.status === 429 || response.status >= 500;
      const after = Number(response.headers.get('retry-after'));
      const wait = after > 0 ? after * 1000 : attempt * 2000 + Math.floor(Math.random() * 1000);
      if (temporary && attempt < 3 && canRetry(wait)) { await sleep(wait); continue; }
      const err = new Error(`AI生成に失敗しました（HTTP${response.status} ${data.error.type}: ${data.error.message}）`);
      if (temporary) err.retryable = true;
      throw err;
    }
    if (data.stop_reason === 'refusal') throw new Error('AIが生成を断りました。手動で作成してください');
    if (data.stop_reason === 'max_tokens') throw new Error('AIの出力が途中で切れました。もう一度作成してください');
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    if (!text) throw new Error('AIの出力が空でした。もう一度作成してください');
    return text;
  }
}

async function readGas(gasRes) {
  const text = await gasRes.text();
  try { return JSON.parse(text); } catch { return { error: GAS_PARSE_ERROR }; }
}

// GASの一時的な失敗：同時実行の上限でエラーページが返る／保存の順番待ちで混み合った
function isGasBusy(r) {
  return !!(r && r.error && (r.error === GAS_PARSE_ERROR || r.error.indexOf('混み合って') !== -1 || /too many|simultaneous/i.test(r.error)));
}

export default async function handler(req, res) {
  const started = Date.now();
  if (!checkAdmin(req, res)) return;
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;
  const shidoKey = process.env.SHIDO_KEY;
  if (!shidoKey) { res.status(500).json({ error: 'サーバー設定エラー：SHIDO_KEY が設定されていません' }); return; }

  // 混み合っているときは少し待って再送する。保存は「同じ生徒×期間の行を上書き」なので再送しても二重にならない
  const withGasRetry = async call => {
    for (let i = 0; ; i++) {
      const r = await call();
      if (!isGasBusy(r) || i >= 4 || Date.now() - started > GAS_RETRY_UNTIL_MS) return r;
      await sleep(700 * (i + 1) + Math.floor(Math.random() * 700));
    }
  };
  const gasGet = params => withGasRetry(async () => {
    const q = new URLSearchParams({ ...params, token: process.env.AUTH_TOKEN, shidoKey });
    return readGas(await fetch(`${GAS_URL}?${q}`, { redirect: 'follow' }));
  });
  const gasSave = report => withGasRetry(async () => readGas(await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shidoAction: 'saveWeeklyReport', report, token: process.env.AUTH_TOKEN, shidoKey })
  })));
  const gasError = r => ({ error: r.error, ...(isGasBusy(r) ? { retryable: true } : {}) });

  try {
    if (req.method === 'GET') {
      const { action, school = '', from = '', to = '' } = req.query;
      if (action === 'backupStatus') { res.status(200).json(await gasGet({ action: 'getBackupStatus' })); return; }
      if (action !== 'listWeekly') { res.status(400).json({ error: 'unknown action' }); return; }
      res.status(200).json(await gasGet({ action, school, from, to }));
      return;
    }
    if (req.method !== 'POST') { res.status(405).end(); return; }

    const b = req.body || {};
    const base = { student: b.student, school: b.school, grade: b.grade, from: b.from, to: b.to };

    if (b.action === 'generate') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY が設定されていません' }); return; }
      const src = await gasGet({ action: 'getWeeklySource', name: b.student || '', school: b.school || '', from: b.from || '', to: b.to || '' });
      if (src.error) { res.status(200).json(gasError(src)); return; }
      const st = src.report && src.report.status;
      if ((st === '確定' || st === '送信済み') && b.force !== true) {
        res.status(200).json({ error: `この報告はすでに${st}です。作り直す場合は確認のうえ再作成してください` });
        return;
      }
      const text = finishText(await callClaude(buildPrompt(src), apiKey, started + AI_DEADLINE_MS), src.name);
      const saved = await gasSave({ ...base, op: 'generated', text, force: b.force === true, count: src.count, days: src.days });
      // 保存に失敗しても生成文は返す（1名ずつ作成したときは画面に残して手動で保存できるようにする）
      if (saved.error) { res.status(200).json({ ...gasError(saved), error: '報告文を保存できませんでした：' + saved.error, text }); return; }
      res.status(200).json(saved);
      return;
    }

    const op = POST_OPS[b.action];
    if (!op) { res.status(400).json({ error: 'unknown action' }); return; }
    const saved = await gasSave({ ...base, op, text: b.text });
    res.status(200).json(saved.error ? gasError(saved) : saved);
  } catch (e) {
    res.status(e.retryable ? 503 : 500).json({ error: e.message, ...(e.retryable ? { retryable: true } : {}) });
  }
}

