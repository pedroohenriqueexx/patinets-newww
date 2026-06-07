import { sendXtracky } from './_xtracky.js';

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
    const approved = data.status === 'approved';
    const status = approved ? 'COMPLETED' : 'PENDING';

    if (approved) {
      // Dispara paid (fallback via polling). customer_data é a cópia do JSON
      // enviado na criação, então o LeadId está em customer_data.tracking.
      const tracking = data.customer_data?.tracking || {};
      await sendXtracky({
        orderId: transactionId,
        amount: data.amount,
        status: 'paid',
        utm_source: tracking.utm_source || tracking.sck,
      });
    }

    return res.status(200).json({ status });
  } catch (err) {
    console.error('[check-pix]', err);
    return res.status(200).json({ status: 'PENDING' });
  }
}
