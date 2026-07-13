// 共有パスワードを検証し、以降のAPI呼び出しに使うトークンを返す。
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { password } = req.body || {};

  // ブルートフォース対策の簡易ウェイト
  await new Promise(r => setTimeout(r, 400));

  if (!process.env.APP_PASSWORD || !process.env.AUTH_TOKEN) {
    res.status(500).json({ error: 'サーバー側の認証設定が未完了です' });
    return;
  }
  if (password !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'パスワードが違います' });
    return;
  }
  res.status(200).json({ token: process.env.AUTH_TOKEN });
}
