// Deprecated / Disabled Public Endpoint
// Security Hardening: Direct public access to member data via Vercel Blob has been permanently disabled.
// All member records are stored and protected strictly within Google Cloud Firestore
// under authenticated, least-privilege security rules.

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(403).json({
    success: false,
    error: 'Access Denied: Direct public API access to member records is disabled for security.',
    documentation: 'Member data is protected under Google Cloud Firestore with strict role-based access rules.',
  });
}
