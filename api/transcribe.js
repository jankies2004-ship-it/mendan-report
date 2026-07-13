import { checkAuth } from './_auth.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (!checkAuth(req, res)) return;

  const apiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: 'OpenAI APIキーが設定されていません' });
    return;
  }

  // Read raw multipart body and forward as-is to Whisper API
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': req.headers['content-type'],
    },
    body,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
