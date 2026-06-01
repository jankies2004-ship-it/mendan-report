const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { name, school = '', action } = req.query;

  if (action === 'listStudents') {
    try {
      const url = `${GAS_URL}?action=listStudents${school ? '&school=' + encodeURIComponent(school) : ''}`;
      const gasRes = await fetch(url, { redirect: 'follow' });
      const data = await gasRes.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    const url = `${GAS_URL}?action=getStudent&name=${encodeURIComponent(name)}${school ? '&school=' + encodeURIComponent(school) : ''}`;
    const gasRes = await fetch(url, { redirect: 'follow' });
    const data = await gasRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
