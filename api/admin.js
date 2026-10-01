// 塾長だけが行う管理操作（講師の追加）。塾長トークンを確認してからGASへ中継する。
import { checkAdmin } from './_auth.js';
import { getGasUrl } from './_gas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!checkAdmin(req, res)) return;
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;
  const shidoKey = process.env.SHIDO_KEY;
  if (!shidoKey) { res.status(500).json({ error: 'サーバー設定エラー：SHIDO_KEY が設定されていません' }); return; }

  const b = req.body || {};
  if (b.action !== 'addTeacher') { res.status(400).json({ error: 'unknown action' }); return; }
  try {
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shidoAction: 'addTeacher',
        teacher: { name: b.name, school: b.school },
        token: process.env.AUTH_TOKEN,
        shidoKey
      })
    });
    const text = await gasRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: 'GASの応答を解析できませんでした' }; }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
