// 全APIルート共通の認証チェック。/api/login で発行したトークンを
// Authorization: Bearer <token> ヘッダーで受け取り、環境変数 AUTH_TOKEN と比較する。
export function checkAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!process.env.AUTH_TOKEN || token !== process.env.AUTH_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}
