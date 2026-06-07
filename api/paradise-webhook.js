import { sendXtrackyWebhook } from './_xtracky.js';

// Recebe os postbacks (webhooks) da Paradise e repassa para a xTracky.
// A Paradise envia um POST a cada mudança de status da transação.
// Mapeamos os status da Paradise para os dois status que a xTracky entende.
const STATUS_MAP = {
  approved: 'paid',
  pending: 'waiting_payment',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Proteção opcional: se PARADISE_WEBHOOK_SECRET estiver definido, exigimos o
  // mesmo token na query (?token=...) — o mesmo que o create-pix anexa à
  // postback_url. Sem o secret configurado, o endpoint aceita normalmente.
  const secret = process.env.PARADISE_WEBHOOK_SECRET;
  if (secret && req.query?.token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = req.body || {};
    const xtrackyStatus = STATUS_MAP[data.status];

    if (xtrackyStatus) {
      // amount já vem em centavos no payload da Paradise (ex.: 690 = R$ 6,90).
      await sendXtrackyWebhook({
        orderId: data.transaction_id,
        amount: typeof data.amount === 'number' ? data.amount : undefined,
        status: xtrackyStatus,
        utm_source: data.tracking?.utm_source,
        leadName: data.customer?.name,
        leadEmail: data.customer?.email,
        leadPhone: data.customer?.phone,
        leadDocument: data.customer?.document,
      });
    }

    // Sempre responde 200 para a Paradise não reenfileirar o webhook.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[paradise-webhook]', err);
    return res.status(200).json({ received: true });
  }
}
