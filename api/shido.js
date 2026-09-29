// 指導記録・進度・指導集計用のGAS中継。許可した action だけを通す。
import { checkAuth } from './_auth.js';
import { getGasUrl } from './_gas.js';

const GET_ACTIONS = ['getShidoMasters', 'listStudentsDetailed'];
const POST_ACTIONS = ['saveShidoRecords'];

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;

  try {
    if (req.method === 'GET') {
      const { action, token, ...rest } = req.query;
      if (!GET_ACTIONS.includes(action)) { res.status(400).json({ error: 'unknown action' }); return; }
      const params = new URLSearchParams({ ...rest, action, token: process.env.AUTH_TOKEN });
      const gasRes = await fetch(`${GAS_URL}?${params}`, { redirect: 'follow' });
      res.status(200).json(await gasRes.json());
      return;
    }
    if (req.method === 'POST') {
      const action = req.body && req.body.action;
      if (!POST_ACTIONS.includes(action)) { res.status(400).json({ error: 'unknown action' }); return; }
      const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req.body, token: process.env.AUTH_TOKEN })
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
