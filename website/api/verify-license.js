const GUMROAD_API = 'https://api.gumroad.com/v2/licenses/verify';
const PRODUCT_PERMALINK = 'zswdkyv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { license_key } = req.body || {};
  if (!license_key) {
    return res.status(400).json({ success: false, message: 'Missing license key' });
  }

  try {
    const gumroadRes = await fetch(GUMROAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_permalink: PRODUCT_PERMALINK,
        license_key,
      }),
    });

    const data = await gumroadRes.json();

    if (data.success) {
      return res.status(200).json({
        success: true,
        purchase: {
          email: data.purchase?.email,
          variants: data.purchase?.variants,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || 'License key is not valid',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Could not verify license. Please try again.',
    });
  }
}
