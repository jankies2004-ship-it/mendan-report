import { checkAuth } from './_auth.js';
import { getGasUrl } from './_gas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!checkAuth(req, res)) return;
  const GAS_URL = getGasUrl(res);
  if (!GAS_URL) return;

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
