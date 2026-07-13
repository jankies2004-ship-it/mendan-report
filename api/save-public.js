// student.html(成績入力フォーム)専用の認証不要な書き込みエンドポイント。
// 生徒面談・保護者面談・カルテ等の閲覧側は/api/save + ログイン必須のまま。
// 書き込めるシートを成績関連の3種類だけに制限し、悪用時の被害範囲を抑える。
const ALLOWED_SHEETS = ['成績', '志望校', '通知表'];

const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw/exec';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const sheet = req.body && req.body.sheet;
  if (!ALLOWED_SHEETS.includes(sheet)) {
    res.status(400).json({ error: 'このシートへの書き込みは許可されていません' });
    return;
  }

  try {
    const payload = { ...req.body, token: process.env.AUTH_TOKEN };
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
