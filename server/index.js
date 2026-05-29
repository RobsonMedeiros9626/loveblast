require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
const app = express();
const PUBLIC_DIR = path.join(__dirname, '../public');

// Banco em memória — para produção forte, trocar por DB depois.
const orders = new Map();

function generateDownloadToken(sessionId) {
  const payload = `${sessionId}:${Date.now()}:${process.env.TOKEN_SECRET || 'loveblast'}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function validEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function safeText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAppUrl(req) {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (envUrl) return envUrl;
  return `${req.protocol}://${req.get('host')}`;
}

// Webhook precisa vir ANTES do express.json
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET não configurado.');
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('Webhook inválido:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const oldOrder = orders.get(session.id) || {};
      const token = oldOrder.downloadToken || generateDownloadToken(session.id);

      orders.set(session.id, {
        ...oldOrder,
        status: 'paid',
        downloadToken: token,
        paidAt: new Date(),
      });

      console.log(`✅ Pagamento confirmado: ${session.id}`);
    }
  }

  res.sendStatus(200);
});

app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));
app.use(express.static(PUBLIC_DIR));

// ── POST /criar-sessao ─────────────────────────────────────────────────────
app.post('/criar-sessao', async (req, res) => {
  try {
    const { nome1, nome2, email, dados = {} } = req.body;

    if (!nome1 || !nome2) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
    }

    const appUrl = getAppUrl(req);

    const checkoutPayload = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          unit_amount: Number(process.env.PRICE_CENTS) || 1990,
          product_data: {
            name: 'LoveBlast — Retrospectiva Premium',
            description: `Retrospectiva personalizada de ${nome1} & ${nome2}`,
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/view/{CHECKOUT_SESSION_ID}?pago=1`,
      cancel_url: `${appUrl}/?cancelado=1`,
      metadata: { nome1, nome2 },
    };

    if (validEmail(email)) checkoutPayload.customer_email = String(email).trim();

    const session = await stripe.checkout.sessions.create(checkoutPayload);

    const finalData = {
      nome1,
      nome2,
      email: validEmail(email) ? String(email).trim() : '',
      data: dados.data || '',
      mensagem: dados.mensagem || '',
      musica: dados.musica || '',
      musicaSrc: dados.musicaSrc || '',
      musicPreset: dados.musicPreset || '',
      fotos: Array.isArray(dados.fotos) ? dados.fotos : [],
      tema: dados.tema || 'fire',
      insights: dados.insights || null,
      createdAt: new Date().toISOString(),
    };

    orders.set(session.id, {
      status: 'pending',
      downloadToken: null,
      createdAt: new Date(),
      dados: finalData,
      nome1,
      nome2,
    });

    res.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (err) {
    console.error('Erro Stripe:', err.message);
    res.status(500).json({ erro: 'Erro ao criar sessão de pagamento.' });
  }
});

// ── GET /status/:sessionId ─────────────────────────────────────────────────
app.get('/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const order = orders.get(sessionId) || {};
      const token = order.downloadToken || generateDownloadToken(sessionId);

      orders.set(sessionId, {
        ...order,
        status: 'paid',
        downloadToken: token,
      });

      return res.json({ status: 'paid', token, viewUrl: `/view/${sessionId}` });
    }

    return res.json({ status: session.payment_status || 'pending' });
  } catch (err) {
    const order = orders.get(sessionId);
    if (!order) return res.status(404).json({ erro: 'Sessão não encontrada.' });
    return res.json({ status: order.status, token: order.downloadToken || null, viewUrl: `/view/${sessionId}` });
  }
});

// ── GET /retrospectiva/:sessionId ──────────────────────────────────────────
app.get('/retrospectiva/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  let order = orders.get(sessionId);

  if (!order) return res.status(404).json({ erro: 'Retrospectiva não encontrada.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' && order.status !== 'paid') {
      order = { ...order, status: 'paid', downloadToken: order.downloadToken || generateDownloadToken(sessionId) };
      orders.set(sessionId, order);
    }
  } catch {}

  if (order.status !== 'paid') {
    return res.status(403).json({ erro: 'Pagamento ainda não confirmado.' });
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    status: 'paid',
    token: order.downloadToken,
    dados: order.dados || {},
  });
});

// Rota pública que mostra a mesma aplicação, mas já abre a retrospectiva
app.get('/view/:sessionId', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

function buildDownloadHtml(dados = {}) {
  const {
    nome1 = 'Você', nome2 = 'Amor', data = '', mensagem = '', musica = '', musicaSrc = '', fotos = [], tema = 'fire', insights = {},
  } = dados;

  const temas = {
    fire: { bg: 'linear-gradient(135deg,#1A0008,#4D0019,#FF2D78)', accent: '#FF2D78', mc: '#FF6B9D' },
    cosmos: { bg: 'linear-gradient(135deg,#050010,#1A0060,#8B3DFF)', accent: '#8B3DFF', mc: '#B07AFF' },
    gold: { bg: 'linear-gradient(135deg,#0D0900,#3D2200,#FFD60A)', accent: '#FFD60A', mc: '#FFD60A' },
  };
  const t = temas[tema] || temas.fire;

  const cleanNome1 = safeText(nome1);
  const cleanNome2 = safeText(nome2);
  const cleanMsg = safeText(mensagem);
  const cleanMusic = safeText(musica || insights.musicLabel || 'Nossa música especial');
  const safePhotos = Array.isArray(fotos) ? fotos.slice(0, 8) : [];
  const topWords = Array.isArray(insights.topWords) ? insights.topWords.slice(0, 3) : [];

  let dateStr = 'Uma história para guardar';
  if (data) {
    const d = new Date(`${data}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      dateStr = `Juntos desde ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
  }

  const photoSlides = safePhotos.map((src, i) => `
    <section class="slide photo"><img src="${src}" alt="Foto ${i + 1}"><div class="caption">Momento ${i + 1}</div></section>
  `).join('');

  const wordsHtml = topWords.length
    ? topWords.map(w => `<div class="chip">${safeText(w.word)} <b>${w.count}</b></div>`).join('')
    : `<div class="chip">amor <b>∞</b></div><div class="chip">saudade <b>❤</b></div>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${cleanNome1} & ${cleanNome2} ♥</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@300;400;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}html{scroll-snap-type:y mandatory}body{background:#050507;color:#fff;font-family:'Space Grotesk',sans-serif;overflow-x:hidden}.slide{min-height:100vh;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:28px;text-align:center;position:relative;background:${t.bg}}.title{font-family:'Syne';font-size:clamp(42px,12vw,120px);line-height:.9;background:linear-gradient(90deg,${t.accent},#FF6B1A,#FFD60A);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.serif{font-family:'Instrument Serif';font-size:clamp(28px,7vw,70px);color:${t.accent}}.sub{color:rgba(255,255,255,.7);margin-top:18px}.photo img{width:min(92vw,480px);max-height:72vh;object-fit:cover;border-radius:28px;box-shadow:0 32px 90px rgba(0,0,0,.55);animation:zoom 7s ease-in-out infinite alternate}.caption{margin-top:18px;color:rgba(255,255,255,.7)}.card{width:min(92vw,620px);padding:30px;border-radius:26px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(18px)}.num{font-family:'Syne';font-size:clamp(50px,18vw,140px);color:${t.accent}}.chips{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px}.chip{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);border-radius:999px;padding:12px 18px}.msg{font-family:'Instrument Serif';font-size:clamp(28px,7vw,68px);line-height:1.12;max-width:850px}.audio{margin-top:22px;width:min(92vw,440px)}@keyframes zoom{from{transform:scale(1)}to{transform:scale(1.06)}}@media(max-width:600px){.slide{padding:20px}.card{padding:22px}}</style></head><body>
<section class="slide"><div class="title">${cleanNome1}<br><span class="serif">& ${cleanNome2}</span></div><p class="sub">${safeText(dateStr)}</p></section>
<section class="slide"><div class="card"><div class="num">${safeText(insights.totalMessages || safePhotos.length || '❤')}</div><p>${insights.totalMessages ? 'mensagens analisadas da conversa' : 'memórias escolhidas para essa história'}</p></div></section>
<section class="slide"><div class="card"><h2 class="serif">Palavras que marcaram vocês</h2><div class="chips">${wordsHtml}</div></div></section>
${photoSlides}
<section class="slide"><div class="msg">${cleanMsg || safeText(insights.generatedPhrase || 'Algumas histórias merecem ser eternizadas.')}</div></section>
<section class="slide"><div class="card"><h2 class="serif">♫ ${cleanMusic}</h2>${musicaSrc ? `<audio class="audio" src="${musicaSrc}" controls></audio>` : ''}<p class="sub">A trilha sonora de vocês</p></div></section>
<section class="slide"><div class="title">Para sempre</div><p class="sub">${cleanNome1} & ${cleanNome2}</p></section>
</body></html>`;
}

// ── POST /download ─────────────────────────────────────────────────────────
app.post('/download', async (req, res) => {
  const { token, sessionId, dados } = req.body;
  if (!token || !sessionId) return res.status(400).json({ erro: 'Token ou sessão ausente.' });

  let order = orders.get(sessionId);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(403).json({ erro: 'Pagamento não confirmado.' });
  } catch {
    if (!order || order.status !== 'paid' || order.downloadToken !== token) {
      return res.status(403).json({ erro: 'Token inválido.' });
    }
  }

  order = orders.get(sessionId) || order;
  if (order && order.downloadToken && order.downloadToken !== token) {
    return res.status(403).json({ erro: 'Token inválido.' });
  }

  const finalDados = (order && order.dados) || dados || {};
  const nome1 = safeText(finalDados.nome1 || 'retrospectiva').replace(/\s+/g, '-').toLowerCase();
  const nome2 = safeText(finalDados.nome2 || 'loveblast').replace(/\s+/g, '-').toLowerCase();

  const html = buildDownloadHtml(finalDados);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="loveblast-${nome1}-${nome2}-${Date.now()}.html"`);
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 LoveBlast online em http://localhost:${PORT}`);
});
