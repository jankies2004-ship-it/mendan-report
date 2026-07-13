import { checkAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!checkAuth(req, res)) return;

  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY が設定されていません' }); return; }

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body
      });
      const data = await response.json();
      if (data.error) {
        if (data.error.type === 'overloaded_error' && attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
        res.status(400).json({ error: `HTTP${response.status} ${data.error.type}: ${data.error.message}` }); return;
      }
      if (!response.ok) {
        res.status(400).json({ error: `HTTP${response.status}: ${JSON.stringify(data)}` }); return;
      }
      res.status(200).json({ text: data.content?.[0]?.text || '' }); return;
    } catch (e) {
      if (attempt === 3) { res.status(500).json({ error: e.message }); return; }
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}
