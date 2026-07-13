import { checkAuth } from './_auth.js';

const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwtLtrArQ1ECX0cNLh85rMJ6MaV3t-A3qDNxuPpbgg-LjTU8mMDOfdDEN2jZqzs5LP5zw/exec';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (!checkAuth(req, res)) return;

  const { name, school = '', grade = '', action } = req.query;
  const token = encodeURIComponent(process.env.AUTH_TOKEN);

  if (action === 'listStudents') {
    try {
      const url = `${GAS_URL}?action=listStudents&token=${token}${school ? '&school=' + encodeURIComponent(school) : ''}${grade ? '&grade=' + encodeURIComponent(grade) : ''}`;
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
    const url = `${GAS_URL}?action=getStudent&token=${token}&name=${encodeURIComponent(name)}${school ? '&school=' + encodeURIComponent(school) : ''}`;
    const gasRes = await fetch(url, { redirect: 'follow' });
    const data = await gasRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
