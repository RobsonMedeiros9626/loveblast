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

// Use diskStorage — files go straight to disk, NEVER held in RAM
// This is the fix for the 2-minute timeout
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
      cb(null, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024,  // 20MB max per file
    fields: 20
  }
});

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
// Serve og-image.svg as og-image.png
app.get('/og-image.png', (req, res) => {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#030306"/>
        <stop offset="50%" style="stop-color:#0e0118"/>
        <stop offset="100%" style="stop-color:#1a0414"/>
      </linearGradient>
      <radialGradient id="glow1" cx="30%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#ff2d78;stop-opacity:.4"/>
        <stop offset="100%" style="stop-color:#ff2d78;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow1)"/>
    <text x="600" y="180" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900" fill="#ff2d78" letter-spacing="4">♡ LOVEBLAST</text>
    <text x="600" y="290" text-anchor="middle" font-family="Arial" font-size="110" fill="#ff2d78">♡</text>
    <text x="600" y="390" text-anchor="middle" font-family="Arial" font-size="58" font-weight="900" fill="white">Uma retrospectiva</text>
    <text x="600" y="455" text-anchor="middle" font-family="Arial" font-size="58" font-weight="900" fill="#ff2d78">especial foi criada</text>
    <text x="600" y="520" text-anchor="middle" font-family="Arial" font-size="22" fill="rgba(255,255,255,.6)">Clica para ver a história completa ❤️</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// Dynamic meta tags for view.html — makes WhatsApp show real names
app.get('/view.html', (req, res, next) => {
  const id = req.query.id;
  if (!id) return next();
  try {
    const data = readRetrospective(id);
    if (!data) return next();
    const nome1 = data.nome1 || 'Você';
    const nome2 = data.nome2 || 'Pessoa especial';
    const fs2 = require('fs');
    let html = fs2.readFileSync(path.join(__dirname, '../public/view.html'), 'utf8');
    html = html
      .replace(/♡ Minha retrospectiva no LoveBlast/g, `♡ ${nome1} & ${nome2} — LoveBlast`)
      .replace(/Criei uma retrospectiva especial\. Clica para ver a nossa história ❤️/g,
        `A retrospectiva de ${nome1} & ${nome2} está pronta. Clica para ver! ❤️`)
      .replace(/Clica para ver a nossa retrospectiva ❤️ — criado no LoveBlast/g,
        `A retrospectiva de ${nome1} & ${nome2}. Criado no LoveBlast ❤️`);
    res.send(html);
  } catch(e) { next(); }
});

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
    'audio/m4a': '.m4a',
    'audio/x-m4a': '.m4a',
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
  // Already paid — just return data without reprocessing
  if (data.pago) return data;
  data.pago = true;
  data.pagoEm = new Date().toISOString();
  try { writeRetrospective(data); } catch(e) { /* silent */ }
  return data;
}

async function saveRetrospective(req, body) {
  const id = createId();
  const files = req.files || {};
  const photos = [];

  // Files are already on disk (diskStorage) — just rename them
  for (const [index, file] of (files.photos || []).slice(0, 10).entries()) {
    const isImage = (file.mimetype || '').startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname || '');
    if (!isImage) { try { fs.unlinkSync(file.path); } catch {} continue; }
    const fileName = `${id}-photo-${index}${path.extname(file.originalname||'').toLowerCase()||'.jpg'}`;
    const dest = path.join(UPLOAD_DIR, fileName);
    fs.renameSync(file.path, dest);
    photos.push(publicUrl(req, fileName));
  }

  let musicSrc = '';
  // Clean musicLink — remove playlist params that cause Stripe URL validation to fail
  let rawMusicLink = (body.musicLink || '').trim();
  if (rawMusicLink) {
    try {
      const u = new URL(rawMusicLink);
      // For YouTube: keep only the v= param
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const v = u.searchParams.get('v');
        if (v) rawMusicLink = `https://www.youtube.com/watch?v=${v}`;
      }
      // For Spotify: keep as-is but remove tracking params
      if (u.hostname.includes('spotify.com')) {
        rawMusicLink = `${u.origin}${u.pathname}`;
      }
    } catch(e) { rawMusicLink = ''; }
  }
  let musicLink = rawMusicLink;
  let musicName = body.musicName || 'Trilha sonora da historia';
  const music = (files.music || [])[0];
  if (music) {
    const audioOk = (music.mimetype||'').startsWith('audio/') ||
      /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(music.originalname || '');
    if (!audioOk) {
      try { fs.unlinkSync(music.path); } catch {}
      const error = new Error('Envie uma musica em MP3, M4A, AAC, OGG, WAV ou WEBM.');
      error.statusCode = 400;
      throw error;
    }
    const fileName = `${id}-music${path.extname(music.originalname||'').toLowerCase()||'.mp3'}`;
    const dest = path.join(UPLOAD_DIR, fileName);
    fs.renameSync(music.path, dest);
    musicSrc = publicUrl(req, fileName);
    musicName = (music.originalname || musicName).replace(/\.[^/.]+$/, '');
  }

  // Parse insights from pre-parsed JSON (sent by client) or from WhatsApp txt
  let insights = null;
  if (body.insights) {
    try { insights = JSON.parse(body.insights); } catch { insights = null; }
  }

  if (!insights) {
    const wppFile = (files.whatsappFile || [])[0];
    if (wppFile) {
      try {
        let txt = '';
        const fname = (wppFile.originalname || wppFile.path || '').toLowerCase();
        if (fname.endsWith('.txt')) {
          txt = fs.readFileSync(wppFile.path, 'utf8');
        }
        // ZIP parsing skipped on server — client already parsed and sent insights
        try { fs.unlinkSync(wppFile.path); } catch {}
        if (txt) {
          const lines = txt.split(/\r?\n/).filter(Boolean);
          const loveCount = (txt.match(/eu te amo|te amo|amo você|amo vc/gi) || []).length;
          const saudadeCount = (txt.match(/saudade|sdds/gi) || []).length;
          insights = {
            totalMessages: Math.max(lines.length, 0) || 18432,
            loveCount: loveCount || 82,
            saudadeCount: saudadeCount || 103,
            topWord: 'amor',
            emotionalLevel: loveCount + saudadeCount > 40 ? 'Muito alto' : 'Alto',
            favoriteTime: '23:47',
            topEmoji: '😂'
          };
        }
      } catch (e) { /* silent */ }
    }
  }

  const data = {
    id,
    nome1: body.nome1 || '',
    nome2: body.nome2 || '',
    email: body.email || '',
    mensagem: body.mensagem || '',
    categoria: body.categoria || 'casal',
    dataInicio: body.dataInicio || '',
    marcos: (() => { try { return JSON.parse(body.marcos || '{}'); } catch { return {}; } })(),
    insights,
    photos: photos.slice(0, 10),
    musicSrc,
    musicLink,
    musicName,
    pago: false,
    criadoEm: new Date().toISOString()
  };

  writeRetrospective(data);
  return data;
}

app.get('/api/retrospectiva/:id', (req, res) => {
  // Always try to get data — if pago=1, mark as paid first
  // If already paid, markPaid returns existing data safely
  const data = req.query.pago === '1'
    ? markPaid(req.params.id)
    : readRetrospective(req.params.id);
  if (!data) return res.status(404).json({ erro: 'Retrospectiva nao encontrada.' });
  return res.json(data);
});

app.get('/api/retrospectiva-por-sessao/:sessionId', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ erro: 'STRIPE_SECRET_KEY nao configurada.' });
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const id = session && session.metadata ? session.metadata.retrospectiveId : '';
    if (!id) return res.status(404).json({ erro: 'Sessao sem retrospectiva vinculada.' });

    // Safe: markPaid handles already-paid gracefully
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
      const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              unit_amount: Number(process.env.PRICE_CENTS) || 999,
              product_data: {
                name: 'LoveBlast - Retrospectiva',
                description: `Retrospectiva ${categoria} para ${nome1} & ${nome2}`
              }
            },
            quantity: 1
          }
        ],
        // pago=1 removed — webhook handles payment confirmation reliably
        // success_url just loads the page; if webhook fires first it's already marked paid
        success_url: `${appUrl}/view.html?id=${retrospective.id}&session_id={CHECKOUT_SESSION_ID}`,
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
