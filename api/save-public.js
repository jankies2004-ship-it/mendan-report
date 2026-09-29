// student.html(成績入力フォーム)専用の認証不要な書き込みエンドポイント。
// 生徒面談・保護者面談・カルテ等の閲覧側は/api/save + ログイン必須のまま。
// 書き込めるシートを成績関連の3種類だけに制限し、悪用時の被害範囲を抑える。
import { getGasUrl } from './_gas.js';

const ALLOWED_SHEETS = ['成績', '志望校', '通知表'];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const sheet = req.body && req.body.sheet;
  if (!ALLOWED_SHEETS.includes(sheet)) {
    res.status(400).json({ error: 'このシートへの書き込みは許可されていません' });
    return;
  }
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;

  try {
    // action を付けるとGAS側で指導記録などの処理に振り分けられるため、ここでは必ず除去する
    const { action, ...body } = req.body;
    const payload = { ...body, token: process.env.AUTH_TOKEN };
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await gasRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
