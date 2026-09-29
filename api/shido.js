// 指導記録・進度・指導集計用のGAS中継。許可した action だけを通す。
// GAS側は AUTH_TOKEN に加えて合言葉 SHIDO_KEY を要求する（この中継だけが付与する）。
import { checkAuth } from './_auth.js';
import { getGasUrl } from './_gas.js';

const GET_ACTIONS = ['getShidoMasters', 'listStudentsDetailed', 'getStudentShido'];
const POST_ACTIONS = ['saveShidoRecords', 'saveProgress'];

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;
  const shidoKey = process.env.SHIDO_KEY;
  if (!shidoKey) { res.status(500).json({ error: 'サーバー設定エラー：SHIDO_KEY が設定されていません' }); return; }

  try {
    if (req.method === 'GET') {
      const { action, token, shidoKey: _ignored, ...rest } = req.query;
      if (!GET_ACTIONS.includes(action)) { res.status(400).json({ error: 'unknown action' }); return; }
      const params = new URLSearchParams({ ...rest, action, token: process.env.AUTH_TOKEN, shidoKey });
      const gasRes = await fetch(`${GAS_URL}?${params}`, { redirect: 'follow' });
      res.status(200).json(await gasRes.json());
      return;
    }
    if (req.method === 'POST') {
      const { action, shidoAction: _a, shidoKey: _k, token: _t, ...rest } = req.body || {};
      if (!POST_ACTIONS.includes(action)) { res.status(400).json({ error: 'unknown action' }); return; }
      // GAS側では既存の保存（保護者面談の action=次回アクション）と区別するため shidoAction で送る
      const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, shidoAction: action, token: process.env.AUTH_TOKEN, shidoKey })
      });
      const text = await gasRes.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: 'GASの応答を解析できませんでした' }; }
      res.status(200).json(data);
      return;
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
