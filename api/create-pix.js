// Procura o código EMV "copia e cola" do PIX (sempre começa com "000201")
// em qualquer campo da resposta do gateway, independente do nome do campo.
function findPixEmv(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return null;
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.replace(/\s/g, '').startsWith('000201')) {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const nested = findPixEmv(value, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

function generateCPF() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let sum = n.reduce((acc, v, i) => acc + v * (10 - i), 0);
  let d1 = (sum * 10) % 11;
  if (d1 >= 10) d1 = 0;
  sum = [...n, d1].reduce((acc, v, i) => acc + v * (11 - i), 0);
  let d2 = (sum * 10) % 11;
  if (d2 >= 10) d2 = 0;
  return [...n, d1, d2].join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { amount, customer, items, utm } = req.body;

    const reference = `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const description = items?.[0]?.title || 'Pedido Imperio dos Atacados';

    const body = {
      amount,
      description,
      reference,
      source: 'api_externa',
      customer: {
        name: customer.name,
        email: customer.email,
        phone: String(customer.phone).replace(/\D/g, ''),
        document: generateCPF(),
      },
    };

    if (utm) {
      const params = new URLSearchParams(utm);
      const tracking = {};
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck']) {
        const val = params.get(key);
        if (val) tracking[key] = val;
      }
      if (Object.keys(tracking).length > 0) body.tracking = tracking;
    }

    // Integração nativa: a Paradise envia o postback direto para a xTracky,
    // que parseia o formato da Paradise e atribui a venda pelo tracking.utm_source (LeadId).
    body.postback_url = 'https://api.xtracky.com/api/integrations/paradise';

    const paradiseRes = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PARADISE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await paradiseRes.json();

    if (!paradiseRes.ok || data.status !== 'success') {
      return res.status(400).json({ error: data.message || 'Erro ao gerar PIX' });
    }

    // O front-end gera o QR Code a partir deste texto, então ele PRECISA ser o
    // "copia e cola" do PIX (EMV que começa com "000201"), não uma imagem/URL.
    const pixCode = findPixEmv(data) || data.qr_code;

    if (!pixCode) {
      console.error('[create-pix] PIX EMV não encontrado na resposta:', JSON.stringify(data));
      return res.status(400).json({ error: 'Resposta inválida do gateway' });
    }

    return res.status(200).json({
      pixCode,
      transactionId: String(data.transaction_id),
    });
  } catch (err) {
    console.error('[create-pix]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
