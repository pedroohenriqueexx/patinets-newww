// Envio de conversão para a xTracky (server-side), replicando a integração
// que funciona: payload { orderId, amount (centavos), status, utm_source },
// SEM o campo platform. Endpoint público, sem API key.
export async function sendXtracky({ orderId, amount, status, utm_source }) {
  if (!orderId || !status || !utm_source) {
    console.log(`[xTracky] skip ${status} (sem orderId/utm_source)`);
    return;
  }
  try {
    const payload = { orderId: String(orderId), amount, status, utm_source };
    const res = await fetch('https://api.xtracky.com/api/integrations/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => '');
    console.log(`[xTracky] ${status} (${orderId}) -> ${res.status}: ${text}`);
  } catch (err) {
    console.error('[xTracky] erro:', err?.message || err);
  }
}
