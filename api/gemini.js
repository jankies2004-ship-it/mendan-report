export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません' }); return; }

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await gemRes.json();
    if (data.error) { res.status(400).json({ error: data.error.message }); return; }
    res.status(200).json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
