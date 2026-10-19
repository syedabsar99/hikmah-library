import { put, list, del } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { blobs } = await list();
    // Sort descending by uploadedAt so the most recent blob is always prioritized
    const memberBlobs = blobs
      .filter((b) => b.pathname === 'members.json')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const deletedBlobs = blobs
      .filter((b) => b.pathname === 'deleted_ids.json')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    const memberBlob = memberBlobs[0];
    const deletedBlob = deletedBlobs[0];

    let currentMembers: any[] = [];
    let deletedIds: string[] = [];

    if (memberBlob) {
      try {
        const targetUrl = memberBlob.downloadUrl || memberBlob.url;
        const separator = targetUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${targetUrl}${separator}t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (response.ok) {
          currentMembers = await response.json();
        }
      } catch (err) {
        console.warn('Error reading member blob:', err);
      }
    }

    if (deletedBlob) {
      try {
        const targetUrl = deletedBlob.downloadUrl || deletedBlob.url;
        const separator = targetUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${targetUrl}${separator}t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
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
        debug: {
          memberBlobs: memberBlobs.map((b) => ({
            url: b.url,
            downloadUrl: b.downloadUrl,
            uploadedAt: b.uploadedAt,
            size: b.size,
          })),
        },
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
        const [savedMembersBlob, savedDeletedBlob] = await Promise.all([
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

        // Clean up older blobs with identical pathname if multiple exist
        try {
          const staleUrls: string[] = [];
          memberBlobs.forEach((b) => {
            if (b.url !== savedMembersBlob.url) staleUrls.push(b.url);
          });
          deletedBlobs.forEach((b) => {
            if (b.url !== savedDeletedBlob.url) staleUrls.push(b.url);
          });
          if (staleUrls.length > 0) {
            await del(staleUrls);
          }
        } catch {}

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
        
        // Members in incomingMembers are explicitly active!
        const activeIds = new Set(incomingMembers.map((m: any) => (m.id || '').toLowerCase().trim()));
        const activeEmails = new Set(incomingMembers.map((m: any) => (m.email || '').toLowerCase().trim()));

        // Clean out any active member IDs or emails from deletedIds so they are never blocked
        let allDeleted = Array.isArray(body?.deletedIds) ? body.deletedIds : deletedIds;
        allDeleted = Array.from(new Set([...deletedIds, ...allDeleted]));
        deletedIds = allDeleted.filter((idOrEmail: string) => {
          const clean = (idOrEmail || '').toLowerCase().trim();
          return clean && !activeIds.has(clean) && !activeEmails.has(clean);
        });

        // Authoritative active members list
        const cleanMembers = incomingMembers;

        const [savedMembersBlob, savedDeletedBlob] = await Promise.all([
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

        // Clean up older blobs with identical pathname if multiple exist
        try {
          const staleUrls: string[] = [];
          memberBlobs.forEach((b) => {
            if (b.url !== savedMembersBlob.url) staleUrls.push(b.url);
          });
          deletedBlobs.forEach((b) => {
            if (b.url !== savedDeletedBlob.url) staleUrls.push(b.url);
          });
          if (staleUrls.length > 0) {
            await del(staleUrls);
          }
        } catch {}

        return res.status(200).json({
          success: true,
          count: cleanMembers.length,
          members: cleanMembers,
          deletedIds,
          savedMembersBlob,
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
