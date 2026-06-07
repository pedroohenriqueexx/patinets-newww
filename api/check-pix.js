import { sendXtrackyWebhook } from './_xtracky.js';

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

    // TEMPORÁRIO (diagnóstico xTracky): mostra a resposta completa da Paradise
    // para descobrirmos em quais campos vêm amount e utm_source. Remover depois.
    console.log('[check-pix] resposta Paradise:', JSON.stringify(data));

    const approved = data.status === 'approved';
    const status = approved ? 'COMPLETED' : 'PENDING';

    if (approved) {
      // Pagamento aprovado: notifica a xTracky. orderId casa com o evento
      // 'waiting_payment' enviado na criação. amount/utm_source são lidos da
      // resposta da Paradise quando disponíveis (assumindo amount em centavos).
      const utmSource = data?.tracking?.utm_source || data?.utm_source || undefined;
      const amount = typeof data?.amount === 'number' ? data.amount : undefined;
      await sendXtrackyWebhook({
        orderId: transactionId,
        amount,
        status: 'paid',
        utm_source: utmSource,
      });
    }

    return res.status(200).json({ status });
  } catch (err) {
    console.error('[check-pix]', err);
    return res.status(200).json({ status: 'PENDING' });
  }
}
