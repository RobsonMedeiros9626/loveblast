require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 8080;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Aviso: STRIPE_SECRET_KEY não configurada.');
}

if (!process.env.APP_URL) {
  console.warn('Aviso: APP_URL não configurada.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.post('/criar-sessao', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        erro: 'STRIPE_SECRET_KEY não configurada no Railway.'
      });
    }

    const {
      nome1 = 'Cliente',
      nome2 = 'Pessoa especial',
      email,
      categoria = 'casal',
      insights = {}
    } = req.body || {};

    if (!process.env.APP_URL) {
      return res.status(500).json({
        erro: 'APP_URL não configurada no Railway.'
      });
    }

    const sessionConfig = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: Number(process.env.PRICE_CENTS) || 1990,
            product_data: {
              name: 'LoveBlast — Retrospectiva Premium',
              description: `Retrospectiva ${categoria} de ${nome1} & ${nome2}`
            }
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.APP_URL}/?session_id={CHECKOUT_SESSION_ID}&pago=1`,
      cancel_url: `${process.env.APP_URL}/?cancelado=1`,
      metadata: {
        nome1,
        nome2,
        categoria,
        totalMessages: String(insights.totalMessages || ''),
        topWord: String(insights.topWord || '')
      }
    };

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.json({
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error('Erro Stripe:', err.message);
    return res.status(500).json({
      erro: 'Erro ao criar sessão de pagamento.'
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`LoveBlast rodando na porta ${PORT}`);
});
