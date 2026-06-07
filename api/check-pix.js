export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { transactionId } = req.body;

    const paradiseRes = await fetch(
      `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${encodeURIComponent(transactionId)}`,
      {
        headers: {
          'X-API-Key': process.env.PARADISE_API_KEY,
        },
      }
    );

    const data = await paradiseRes.json();
    const status = data.status === 'approved' ? 'COMPLETED' : 'PENDING';

    return res.status(200).json({ status });
  } catch (err) {
    console.error('[check-pix]', err);
    return res.status(200).json({ status: 'PENDING' });
  }
}
