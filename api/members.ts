import { put, list } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { blobs } = await list();
      const memberBlob = blobs.find((b) => b.pathname === 'members.json');
      if (memberBlob) {
        const response = await fetch(`${memberBlob.url}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json({ success: true, members: data });
        }
      }
      return res.status(200).json({ success: true, members: [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const members = body?.members;
      if (!Array.isArray(members)) {
        return res.status(400).json({ error: 'Expected members array in body' });
      }

      const blob = await put('members.json', JSON.stringify(members, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({ success: true, url: blob.url, count: members.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API members error:', err);
    return res.status(500).json({ error: err.message });
  }
}
