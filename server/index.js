require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');
const Stripe  = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app    = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '20mb' }));

// Banco em memória — substitua por DB real em produção
const orders = new Map();

function generateDownloadToken(sessionId) {
  const payload = `${sessionId}:${Date.now()}:${process.env.TOKEN_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── POST /criar-sessao ───────────────────────────────────────────────────────
const session = await stripe.checkout.sessions.create({
  mode: 'payment',

  customer_email: email || undefined,

  line_items: [{
    price_data: {
      currency: 'brl',
      unit_amount: Number(process.env.PRICE_CENTS) || 1990,
      product_data: {
        name: 'LoveBlast — Retrospectiva do Dia dos Namorados',
        description: `Retrospectiva personalizada de ${nome1} & ${nome2}`,
      },
    },
    quantity: 1,
  }],

  payment_method_types: ['card'],

  success_url: `${process.env.APP_URL}/?session_id={CHECKOUT_SESSION_ID}&pago=1`,

  cancel_url: `${process.env.APP_URL}/?cancelado=1`,

  metadata: { nome1, nome2 }
});

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'brl',
          unit_amount: Number(process.env.PRICE_CENTS) || 1990,
          product_data: {
            name: 'LoveBlast — Retrospectiva do Dia dos Namorados',
            description: `Retrospectiva personalizada de ${nome1} & ${nome2}`,
          },
        },
        quantity: 1,
      }],
      payment_method_types: ['card'],
      success_url: `${process.env.APP_URL}/?session_id={CHECKOUT_SESSION_ID}&pago=1`,
      cancel_url:  `${process.env.APP_URL}/?cancelado=1`,
      metadata: { nome1, nome2 },
    });

    orders.set(session.id, { status: 'pending', downloadToken: null, createdAt: new Date(), nome1, nome2 });
    res.json({ sessionId: session.id, checkoutUrl: session.url });

  } catch (err) {
    console.error('Erro Stripe:', err.message);
    res.status(500).json({ erro: 'Erro ao criar sessão de pagamento.' });
  }
});

// ── POST /webhook ────────────────────────────────────────────────────────────
app.post('/webhook', (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('Webhook inválido:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const token = generateDownloadToken(session.id);
      orders.set(session.id, { ...(orders.get(session.id) || {}), status: 'paid', downloadToken: token });
      console.log(`✅ ${session.id} pago.`);
    }
  }
  res.sendStatus(200);
});

// ── GET /status/:sessionId ───────────────────────────────────────────────────
app.get('/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      let order = orders.get(sessionId);
      if (!order || order.status !== 'paid') {
        const token = generateDownloadToken(sessionId);
        orders.set(sessionId, { ...(order || {}), status: 'paid', downloadToken: token });
        return res.json({ status: 'paid', token });
      }
      return res.json({ status: 'paid', token: order.downloadToken });
    }
    res.json({ status: session.payment_status });
  } catch {
    const order = orders.get(sessionId);
    if (!order) return res.status(404).json({ erro: 'Sessão não encontrada.' });
    res.json({ status: order.status });
  }
});

// ── POST /download ───────────────────────────────────────────────────────────
app.post('/download', async (req, res) => {
  const { token, sessionId, dados } = req.body;
  if (!token || !sessionId) return res.status(400).json({ erro: 'Token ou sessão ausente.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(403).json({ erro: 'Pagamento não confirmado.' });
  } catch {
    const order = orders.get(sessionId);
    if (!order || order.status !== 'paid' || order.downloadToken !== token)
      return res.status(403).json({ erro: 'Token inválido.' });
  }

  const { nome1='Você', nome2='Amor', data, mensagem, musica, fotos=[], tema='fire' } = dados || {};
  const temas = {
    fire:   { bg:'linear-gradient(135deg,#1A0008,#4D0019,#FF2D78)', accent:'#FF2D78', mc:'#FF6B9D' },
    cosmos: { bg:'linear-gradient(135deg,#050010,#1A0060,#8B3DFF)',  accent:'#8B3DFF', mc:'#B07AFF' },
    gold:   { bg:'linear-gradient(135deg,#0D0900,#3D2200,#FFD60A)',  accent:'#FFD60A', mc:'#FFD60A' },
  };
  const t = temas[tema] || temas.fire;

  const slots = [0,1,2,3].map(i => fotos[i]
    ? `<div style="aspect-ratio:1;border-radius:12px;overflow:hidden"><img src="${fotos[i]}" style="width:100%;height:100%;object-fit:cover"></div>`
    : `<div style="aspect-ratio:1;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:2rem">📷</div>`
  ).join('');

  let dateStr = '';
  if (data) { const d = new Date(data+'T00:00:00'); dateStr = `Juntos desde ${d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}`; }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${nome1} & ${nome2} ♥</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@300;400&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${t.bg};font-family:'Space Grotesk',sans-serif;padding:2rem}.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(20px);border-radius:20px;max-width:400px;width:100%;padding:2.5rem 2rem;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.6)}.heart{font-size:2.5rem;animation:pulse 1.5s ease-in-out infinite;display:block;margin-bottom:.6rem}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}.names{font-family:'Instrument Serif',serif;font-style:italic;font-size:2rem;color:${t.accent}}.date{font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.3rem}.photos{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.5rem 0}.msg{font-family:'Instrument Serif',serif;font-style:italic;font-size:1rem;color:rgba(255,255,255,.75);line-height:1.7;margin:.8rem 0}.music{display:inline-flex;align-items:center;gap:.4rem;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:100px;padding:.35rem .9rem;font-size:.78rem;color:${t.mc};margin-top:.5rem}</style></head>
<body><div class="card"><span class="heart">🔥</span><div class="names">${nome1} & ${nome2}</div>${dateStr?`<div class="date">${dateStr}</div>`:''}<div class="photos">${slots}</div>${mensagem?`<div class="msg">"${mensagem}"</div>`:''}${musica?`<div><span class="music">♫ ${musica}</span></div>`:''}</div></body></html>`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="loveblast-${nome1}-${nome2}.html"`);
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 http://localhost:${PORT}`);
  console.log(`   stripe listen --forward-to localhost:${PORT}/webhook\n`);
});
