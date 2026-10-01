// 全APIルート共通の認証チェック。/api/login で発行したトークンを
// Authorization: Bearer <token> ヘッダーで受け取り、環境変数と比較する。
// - AUTH_TOKEN  : 講師・塾長の共有トークン（APP_PASSWORD でログイン）
// - ADMIN_TOKEN : 塾長専用トークン（ADMIN_PASSWORD でログイン）。共有トークンでできることはすべてできる
function bearer(req) {
  const header = req.headers['authorization'] || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

// 塾長トークンが正しく設定されているか（未設定・共有トークンと同じ値なら塾長機能は使えない）
function adminTokenOf() {
  const t = process.env.ADMIN_TOKEN;
  return t && t !== process.env.AUTH_TOKEN ? t : '';
}

export function checkAuth(req, res) {
  const token = bearer(req);
  const admin = adminTokenOf();
  const ok = (process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN) || (admin && token === admin);
  if (!ok) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

// 塾長だけに許す操作（週次報告の作成・編集・確定・送信済み更新）
export function checkAdmin(req, res) {
  if (!checkAuth(req, res)) return false;
  const admin = adminTokenOf();
  if (!admin) {
    res.status(500).json({ error: 'サーバー設定エラー：ADMIN_TOKEN が未設定か、AUTH_TOKEN と同じ値です' });
    return false;
  }
  if (bearer(req) !== admin) {
    res.status(403).json({ error: 'この操作は塾長のみ行えます' });
    return false;
  }
  return true;
}
