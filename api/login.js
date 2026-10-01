// パスワードを検証し、以降のAPI呼び出しに使うトークンを返す。
// ADMIN_PASSWORD（塾長）なら塾長トークン、APP_PASSWORD（共有）なら共有トークン。
// role は画面の出し分け用。権限の判定はサーバー側（api/_auth.js）でトークンにより行う
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { password } = req.body || {};

  // ブルートフォース対策の簡易ウェイト
  await new Promise(r => setTimeout(r, 400));

  if (!process.env.APP_PASSWORD || !process.env.AUTH_TOKEN) {
    res.status(500).json({ error: 'サーバー側の認証設定が未完了です' });
    return;
  }
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminToken = process.env.ADMIN_TOKEN;
  const adminReady = adminPassword && adminToken
    && adminPassword !== process.env.APP_PASSWORD && adminToken !== process.env.AUTH_TOKEN;
  if (adminReady && typeof password === 'string' && password === adminPassword) {
    res.status(200).json({ token: adminToken, role: 'admin' });
    return;
  }
  if (password !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'パスワードが違います' });
    return;
  }
  res.status(200).json({ token: process.env.AUTH_TOKEN, role: 'staff' });
}
