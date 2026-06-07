// Envio de webhook de conversão para a xTracky.
// Endpoint e modelo de corpo esperados pela xTracky:
//   POST https://api.xtracky.com/api/integrations/api
//   { orderId, amount (em centavos), status, utm_source }
// status: 'waiting_payment' (PIX gerado) | 'paid' (pagamento aprovado)
//
// Nunca lança: falha no tracking não pode quebrar o fluxo de pagamento.
export async function sendXtrackyWebhook({ orderId, amount, status, utm_source }) {
  if (!orderId || !status) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const payload = { orderId: String(orderId), status };
    if (amount != null) payload.amount = amount;
    if (utm_source) payload.utm_source = utm_source;

    await fetch('https://api.xtracky.com/api/integrations/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    console.error('[xtracky]', err?.message || err);
  } finally {
    clearTimeout(timeout);
  }
}
