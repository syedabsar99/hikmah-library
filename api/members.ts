import { put, list } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { blobs } = await list();
    const memberBlob = blobs.find((b) => b.pathname === 'members.json');
    const deletedBlob = blobs.find((b) => b.pathname === 'deleted_ids.json');

    let currentMembers: any[] = [];
    let deletedIds: string[] = [];

    if (memberBlob) {
      try {
        const response = await fetch(`${memberBlob.url}?t=${Date.now()}`);
        if (response.ok) {
          currentMembers = await response.json();
        }
      } catch (err) {
        console.warn('Error reading member blob:', err);
      }
    }

    if (deletedBlob) {
      try {
        const response = await fetch(`${deletedBlob.url}?t=${Date.now()}`);
        if (response.ok) {
          deletedIds = await response.json();
        }
      } catch (err) {
        console.warn('Error reading deleted blob:', err);
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        members: currentMembers,
        deletedIds: deletedIds,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = body?.action || 'save_all';

      if (action === 'delete') {
        const idToDelete = (body?.id || '').trim();
        const emailToDelete = (body?.email || '').toLowerCase().trim();

        if (!idToDelete && !emailToDelete) {
          return res.status(400).json({ error: 'Missing id or email to delete' });
        }

        // Filter out from currentMembers
        currentMembers = currentMembers.filter((m: any) => {
          const mId = (m.id || '').trim();
          const mEmail = (m.email || '').toLowerCase().trim();
          if (idToDelete && mId === idToDelete) return false;
          if (emailToDelete && mEmail === emailToDelete) return false;
          return true;
        });

        // Add to deletedIds (both id and email so neither can ever revive)
        const newDeletedSet = new Set<string>(deletedIds);
        if (idToDelete) newDeletedSet.add(idToDelete);
        if (emailToDelete) newDeletedSet.add(emailToDelete);
        deletedIds = Array.from(newDeletedSet);

        // Commit both files to Blob
        await Promise.all([
          put('members.json', JSON.stringify(currentMembers, null, 2), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
          }),
          put('deleted_ids.json', JSON.stringify(deletedIds, null, 2), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
          }),
        ]);

        return res.status(200).json({
          success: true,
          action: 'deleted',
          id: idToDelete,
          email: emailToDelete,
          members: currentMembers,
          deletedIds,
        });
      }

      if (action === 'save_all' || Array.isArray(body?.members)) {
        const incomingMembers = Array.isArray(body?.members) ? body.members : currentMembers;
        if (Array.isArray(body?.deletedIds)) {
          deletedIds = Array.from(new Set([...deletedIds, ...body.deletedIds]));
        }

        // Exclude any deleted members from incomingMembers
        const delSet = new Set(deletedIds.map((s) => s.toLowerCase().trim()));
        const cleanMembers = incomingMembers.filter((m: any) => {
          const mId = (m.id || '').toLowerCase().trim();
          const mEmail = (m.email || '').toLowerCase().trim();
          return !delSet.has(mId) && !delSet.has(mEmail);
        });

        await Promise.all([
          put('members.json', JSON.stringify(cleanMembers, null, 2), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
          }),
          put('deleted_ids.json', JSON.stringify(deletedIds, null, 2), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
          }),
        ]);

        return res.status(200).json({
          success: true,
          count: cleanMembers.length,
          members: cleanMembers,
          deletedIds,
        });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API members error:', err);
    return res.status(500).json({ error: err.message });
  }
}
