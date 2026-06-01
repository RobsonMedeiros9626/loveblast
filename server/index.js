require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, '../data');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeExt(file, fallback) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ext && ext.length <= 8 ? ext : fallback;
}

function publicUrl(req, fileName) {
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

async function saveRetrospective(req, body) {
  const id = createId();
  const files = req.files || {};
  const photos = [];

  for (const [index, file] of (files.photos || []).slice(0, 12).entries()) {
    if (!file.mimetype.startsWith('image/')) continue;
    const fileName = `${id}-photo-${index}${safeExt(file, '.jpg')}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), file.buffer);
    photos.push(publicUrl(req, fileName));
  }

  let musicSrc = '';
  let musicName = body.musicName || 'Trilha sonora da história';
  const music = (files.music || [])[0];
  if (music) {
    const audioOk = music.mimetype.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(music.originalname || '');
    if (!audioOk) {
      const error = new Error('Envie uma música em MP3, M4A, AAC, OGG, WAV ou WEBM.');
      error.statusCode = 400;
      throw error;
    }
    const fileName = `${id}-music${safeExt(music, '.mp3')}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), music.buffer);
    musicSrc = publicUrl(req, fileName);
    musicName = (music.originalname || musicName).replace(/\.[^/.]+$/, '');
  }

  let insights = null;
  if (body.insights) {
    try { insights = JSON.parse(body.insights); } catch { insights = null; }
  }

  const data = {
    id,
    nome1: body.nome1 || '',
    nome2: body.nome2 || '',
    email: body.email || '',
    mensagem: body.mensagem || '',
    categoria: body.categoria || 'casal',
    insights,
    photos,
    musicSrc,
    musicName,
    pago: false,
    criadoEm: new Date().toISOString()
  };

  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(data, null, 2));
  return data;
}

function readRetrospective(id) {
  if (!/^[a-z0-9-]+$/i.test(id || '')) return null;
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function markPaid(id) {
  const data = readRetrospective(id);
  if (!data) return null;
  data.pago = true;
  data.pagoEm = new Date().toISOString();
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(data, null, 2));
  return data;
}

app.get('/api/retrospectiva/:id', (req, res) => {
  const data = req.query.pago === '1' ? markPaid(req.params.id) : readRetrospective(req.params.id);
  if (!data) return res.status(404).json({ erro: 'Retrospectiva não encontrada.' });
  return res.json(data);
});

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

      const retrospective = await saveRetrospective(req, req.body || {});
      const appUrl = process.env.APP_URL.replace(/\/$/, '');

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

        success_url: `${appUrl}/view.html?id=${retrospective.id}&session_id={CHECKOUT_SESSION_ID}&pago=1`,
        cancel_url: `${appUrl}/?cancelado=1&id=${retrospective.id}`,

        metadata: {
          retrospectiveId: retrospective.id,
          nome1,
          nome2,
          categoria,
          mensagem: mensagem.slice(0, 450)
        }
      });

      return res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        retrospectiveId: retrospective.id
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
