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
    fileSize: 25 * 1024 * 1024,
    fieldSize: 30 * 1024 * 1024,
    fields: 40
  }
});

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(express.static(path.join(__dirname, '../public')));

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeExt(file, fallback) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ext && ext.length <= 8 ? ext : fallback;
}

function baseUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function publicUrl(req, fileName) {
  return `${baseUrl(req)}/uploads/${fileName}`;
}

function saveDataUrl(req, id, dataUrl, label, index) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return '';

  const mime = match[1];
  const extByMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/webm': '.webm'
  };
  const ext = extByMime[mime] || (mime.startsWith('image/') ? '.jpg' : mime.startsWith('audio/') ? '.mp3' : '');
  if (!ext) return '';

  const suffix = typeof index === 'number' ? `-${index}` : '';
  const fileName = `${id}-${label}${suffix}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(match[2], 'base64'));
  return publicUrl(req, fileName);
}

function readRetrospective(id) {
  if (!/^[a-z0-9-]+$/i.test(id || '')) return null;
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeRetrospective(data) {
  fs.writeFileSync(path.join(DATA_DIR, `${data.id}.json`), JSON.stringify(data, null, 2));
}

function markPaid(id) {
  const data = readRetrospective(id);
  if (!data) return null;
  data.pago = true;
  data.pagoEm = new Date().toISOString();
  writeRetrospective(data);
  return data;
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

  if (!photos.length && body.photosData) {
    try {
      const parsedPhotos = JSON.parse(body.photosData);
      if (Array.isArray(parsedPhotos)) {
        parsedPhotos.slice(0, 8).forEach((dataUrl, index) => {
          const saved = saveDataUrl(req, id, dataUrl, 'photo', index);
          if (saved) photos.push(saved);
        });
      }
    } catch {}
  }

  let musicSrc = '';
  let musicName = body.musicName || 'Trilha sonora da historia';
  const music = (files.music || [])[0];
  if (music) {
    const audioOk = music.mimetype.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(music.originalname || '');
    if (!audioOk) {
      const error = new Error('Envie uma musica em MP3, M4A, AAC, OGG, WAV ou WEBM.');
      error.statusCode = 400;
      throw error;
    }
    const fileName = `${id}-music${safeExt(music, '.mp3')}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), music.buffer);
    musicSrc = publicUrl(req, fileName);
    musicName = (music.originalname || musicName).replace(/\.[^/.]+$/, '');
  }

  if (!musicSrc && body.musicData) {
    musicSrc = saveDataUrl(req, id, body.musicData, 'music');
    musicName = body.musicName || musicName;
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

  writeRetrospective(data);
  return data;
}

app.get('/api/retrospectiva/:id', (req, res) => {
  const data = req.query.pago === '1' ? markPaid(req.params.id) : readRetrospective(req.params.id);
  if (!data) return res.status(404).json({ erro: 'Retrospectiva nao encontrada.' });
  return res.json(data);
});

app.get('/api/retrospectiva-por-sessao/:sessionId', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ erro: 'STRIPE_SECRET_KEY nao configurada.' });
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const id = session && session.metadata ? session.metadata.retrospectiveId : '';
    if (!id) return res.status(404).json({ erro: 'Sessao sem retrospectiva vinculada.' });

    const data = req.query.pago === '1' ? markPaid(id) : readRetrospective(id);
    if (!data) return res.status(404).json({ erro: 'Retrospectiva nao encontrada.' });
    return res.json(data);
  } catch (err) {
    console.error('Erro ao recuperar sessao Stripe:', err.message);
    return res.status(500).json({ erro: 'Nao foi possivel carregar a retrospectiva pelo pagamento.' });
  }
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
        return res.status(500).json({ erro: 'STRIPE_SECRET_KEY nao configurada no Railway.' });
      }

      if (!process.env.APP_URL) {
        return res.status(500).json({ erro: 'APP_URL nao configurada no Railway.' });
      }

      const {
        nome1,
        nome2,
        email,
        mensagem = '',
        categoria = 'casal'
      } = req.body || {};

      if (!nome1 || !nome2 || !email) {
        return res.status(400).json({ erro: 'Preencha nome, nome da pessoa e e-mail.' });
      }

      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailValido.test(email)) {
        return res.status(400).json({ erro: 'Digite um e-mail valido.' });
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
                name: 'LoveBlast - Retrospectiva Premium',
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
      return res.status(err.statusCode || 500).json({
        erro: err.statusCode ? err.message : 'Erro ao criar sessao de pagamento.'
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
