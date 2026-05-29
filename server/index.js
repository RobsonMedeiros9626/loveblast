require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 8080;

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.post(
  '/criar-sessao',
  upload.fields([
    { name: 'photos', maxCount: 12 },
    { name: 'music', maxCount: 1 },
    { name: 'whatsappFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          erro: 'STRIPE_SECRET_KEY não configurada no Railway.'
        });
      }

      if (!process.env.APP_URL) {
        return res.status(500).json({
          erro: 'APP_URL não configurada no Railway.'
        });
      }

      const {
        nome1,
        nome2,
        email,
        mensagem = '',
        categoria = 'casal'
      } = req.body || {};

      if (!nome1 || !nome2 || !email) {
        return res.status(400).json({
          erro: 'Preencha nome, nome da pessoa e e-mail.'
        });
      }

      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailValido.test(email)) {
        return res.status(400).json({
          erro: 'Digite um e-mail válido.'
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        payment_method_types: ['card'],

        line_items: [
          {
            price_data: {
              currency: 'brl',
              unit_amount: Number(process.env.PRICE_CENTS) || 1990,
              product_data: {
                name: 'LoveBlast — Retrospectiva Premium',
                description: `Retrospectiva ${categoria} para ${nome1} & ${nome2}`
              }
            },
            quantity: 1
          }
        ],

        success_url: `${process.env.APP_URL}/?session_id={CHECKOUT_SESSION_ID}&pago=1#retrospectiva`,
        cancel_url: `${process.env.APP_URL}/?cancelado=1`,

        metadata: {
          nome1,
          nome2,
          categoria,
          mensagem: mensagem.slice(0, 450)
        }
      });

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
  }
);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`LoveBlast rodando na porta ${PORT}`);
});
