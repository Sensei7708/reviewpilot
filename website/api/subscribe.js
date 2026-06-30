export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const WEBHOOK_URL = process.env.SUBSCRIBE_WEBHOOK_URL;

  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'reviewpilot-website',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // webhook failure is non-critical
    }
  }

  res.status(200).json({
    ok: true,
    message: 'Subscribed successfully',
  });
}
