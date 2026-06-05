require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Stripe   = require('stripe');

const app      = express();
const PORT     = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, '../data');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// diskStorage — never holds files in RAM
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(UPLOAD_DIR,{recursive:true}); cb(null,UPLOAD_DIR); },
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname||'').toLowerCase()||'.bin';
      cb(null, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 20*1024*1024, fields: 20 }
});

fs.mkdirSync(DATA_DIR,   { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ─────────────────────────────────────────
   ANALYTICS — lightweight JSON store
───────────────────────────────────────── */
const STATS_FILE = path.join(DATA_DIR, '_analytics.json');

function readStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE,'utf8')); } catch { return {}; }
}
function writeStats(s) {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(s,null,2)); } catch {}
}
function trackEvent(event, meta={}) {
  const s = readStats();
  const today = new Date().toISOString().split('T')[0];
  if (!s.events) s.events = [];
  s.events.push({ event, ts: Date.now(), date: today, ...meta });
  // Keep last 10000 events
  if (s.events.length > 10000) s.events = s.events.slice(-10000);
  // Counters
  if (!s.counts) s.counts = {};
  s.counts[event] = (s.counts[event]||0)+1;
  if (!s.daily) s.daily = {};
  if (!s.daily[today]) s.daily[today] = {};
  s.daily[today][event] = (s.daily[today][event]||0)+1;
  writeStats(s);
}

app.post('/api/track', (req, res) => {
  try {
    const { event, ...meta } = req.body || {};
    if (!event) return res.json({ok:false});
    // Enrich with device/browser info from UA
    const ua = req.headers['user-agent']||'';
    const device   = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
    const browser  = /Chrome/i.test(ua)?'Chrome':/Firefox/i.test(ua)?'Firefox':/Safari/i.test(ua)?'Safari':/Edge/i.test(ua)?'Edge':'Other';
    trackEvent(event, { ...meta, device, browser, ip: req.ip });
    res.json({ok:true});
  } catch(e) { res.json({ok:false}); }
});

/* ─────────────────────────────────────────
   ADMIN PANEL
───────────────────────────────────────── */
require('./admin')(app);

/* ─────────────────────────────────────────
   OG IMAGE
───────────────────────────────────────── */
app.get('/og-image.png', (req, res) => {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#030306"/><stop offset="50%" style="stop-color:#0e0118"/>
        <stop offset="100%" style="stop-color:#1a0414"/>
      </linearGradient>
      <radialGradient id="g1" cx="30%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#ff2d78;stop-opacity:.4"/>
        <stop offset="100%" style="stop-color:#ff2d78;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#g1)"/>
    <text x="600" y="200" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900" fill="#ff2d78" letter-spacing="4">♡ LOVEBLAST</text>
    <text x="600" y="310" text-anchor="middle" font-family="Arial" font-size="110" fill="#ff2d78">♡</text>
    <text x="600" y="410" text-anchor="middle" font-family="Arial" font-size="52" font-weight="900" fill="white">Uma retrospectiva</text>
    <text x="600" y="470" text-anchor="middle" font-family="Arial" font-size="52" font-weight="900" fill="#ff2d78">especial foi criada</text>
    <text x="600" y="530" text-anchor="middle" font-family="Arial" font-size="22" fill="rgba(255,255,255,.6)">Clica para ver a história completa ❤️</text>
  </svg>`;
  res.setHeader('Content-Type','image/svg+xml');
  res.setHeader('Cache-Control','public,max-age=86400');
  res.send(svg);
});

/* ─────────────────────────────────────────
   DYNAMIC META TAGS for view.html
───────────────────────────────────────── */
app.get('/view.html', (req, res, next) => {
  const id = req.query.id;
  if (!id) return next();
  try {
    const data = readRetrospective(id);
    if (!data) return next();
    const n1 = (data.nome1||'Você').replace(/[<>"]/g,'');
    const n2 = (data.nome2||'Pessoa especial').replace(/[<>"]/g,'');
    let html = fs.readFileSync(path.join(__dirname,'../public/view.html'),'utf8');
    html = html
      .replace(/♡ Minha retrospectiva no LoveBlast/g, `♡ ${n1} &amp; ${n2} — LoveBlast`)
      .replace(/Criei uma retrospectiva especial\. Clica para ver a nossa história ❤️/g,
        `A retrospectiva de ${n1} &amp; ${n2} está pronta. Clica para ver! ❤️`)
      .replace(/Clica para ver a nossa retrospectiva ❤️ — criado no LoveBlast/g,
        `A retrospectiva de ${n1} &amp; ${n2}. Criado no LoveBlast ❤️`);
    res.send(html);
  } catch(e) { next(); }
});

app.use(express.static(path.join(__dirname,'../public')));

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
function baseUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
}
function publicUrl(req, fileName) {
  return `${baseUrl(req)}/uploads/${fileName}`;
}
function readRetrospective(id) {
  if (!/^[a-z0-9-]+$/i.test(id||'')) return null;
  const fp = path.join(DATA_DIR,`${id}.json`);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch { return null; }
}
function writeRetrospective(data) {
  fs.writeFileSync(path.join(DATA_DIR,`${data.id}.json`),JSON.stringify(data,null,2));
}
function markPaid(id) {
  const data = readRetrospective(id);
  if (!data) return null;
  if (data.pago) return data;
  data.pago    = true;
  data.pagoEm  = new Date().toISOString();
  try { writeRetrospective(data); } catch {}
  trackEvent('purchase_approved', { retroId: id, nome1: data.nome1, nome2: data.nome2, categoria: data.categoria });
  return data;
}

/* ─────────────────────────────────────────
   SAVE RETROSPECTIVE (background)
───────────────────────────────────────── */
async function saveRetrospectiveFiles(req, body, id) {
  const files  = req.files || {};
  const photos = [];

  for (const [i, file] of (files.photos||[]).slice(0,10).entries()) {
    const isImg = (file.mimetype||'').startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname||'');
    if (!isImg) { try { fs.unlinkSync(file.path); } catch {} continue; }
    const ext  = path.extname(file.originalname||'').toLowerCase()||'.jpg';
    const dest = path.join(UPLOAD_DIR,`${id}-photo-${i}${ext}`);
    try { fs.renameSync(file.path,dest); photos.push(publicUrl(req,`${id}-photo-${i}${ext}`)); }
    catch {}
  }

  let musicSrc = '', musicLink = '', musicName = body.musicName||'Trilha sonora';

  // Clean YouTube/Spotify link
  let rawLink = (body.musicLink||'').trim();
  if (rawLink) {
    try {
      const u = new URL(rawLink);
      if (u.hostname.includes('youtube.com')||u.hostname.includes('youtu.be')) {
        const v = u.searchParams.get('v'); if (v) rawLink=`https://www.youtube.com/watch?v=${v}`;
      } else if (u.hostname.includes('spotify.com')) {
        rawLink = `${u.origin}${u.pathname}`;
      }
    } catch { rawLink=''; }
  }
  musicLink = rawLink;

  const musicFile = (files.music||[])[0];
  if (musicFile) {
    const ok = (musicFile.mimetype||'').startsWith('audio/')||/\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(musicFile.originalname||'');
    if (ok) {
      const ext  = path.extname(musicFile.originalname||'').toLowerCase()||'.mp3';
      const dest = path.join(UPLOAD_DIR,`${id}-music${ext}`);
      try { fs.renameSync(musicFile.path,dest); musicSrc=publicUrl(req,`${id}-music${ext}`); } catch {}
      musicName = (musicFile.originalname||musicName).replace(/\.[^/.]+$/,'');
    } else { try { fs.unlinkSync(musicFile.path); } catch {} }
  }

  let insights = null;
  if (body.insights) { try { insights=JSON.parse(body.insights); } catch {} }
  if (!insights) {
    const wpp = (files.whatsappFile||[])[0];
    if (wpp) {
      try {
        if ((wpp.originalname||'').toLowerCase().endsWith('.txt')) {
          const txt = fs.readFileSync(wpp.path,'utf8');
          const lines = txt.split(/\r?\n/).filter(Boolean);
          const love = (txt.match(/eu te amo|te amo|amo você|amo vc/gi)||[]).length;
          const sad  = (txt.match(/saudade|sdds/gi)||[]).length;
          insights = { totalMessages:lines.length||18432, loveCount:love||82, saudadeCount:sad||103, topWord:'amor', emotionalLevel:love+sad>40?'Muito alto':'Alto', favoriteTime:'23:47', topEmoji:'😂' };
        }
        try { fs.unlinkSync(wpp.path); } catch {}
      } catch {}
    }
  }

  // Update the existing quick record with full data
  const existing = readRetrospective(id);
  if (existing) {
    existing.photos   = photos;
    existing.musicSrc = musicSrc;
    existing.musicLink= musicLink;
    existing.musicName= musicName;
    existing.insights = insights || existing.insights;
    writeRetrospective(existing);
  }
}

/* ─────────────────────────────────────────
   API ROUTES
───────────────────────────────────────── */
app.get('/api/retrospectiva/:id', (req, res) => {
  const data = req.query.pago==='1' ? markPaid(req.params.id) : readRetrospective(req.params.id);
  if (!data) return res.status(404).json({ erro:'Retrospectiva nao encontrada.' });
  res.json(data);
});

app.get('/api/retrospectiva-por-sessao/:sid', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ erro:'Stripe nao configurado.' });
    const session = await stripe.checkout.sessions.retrieve(req.params.sid);
    const id = session?.metadata?.retrospectiveId;
    if (!id) return res.status(404).json({ erro:'Sessao sem retrospectiva.' });
    const data = req.query.pago==='1' ? markPaid(id) : readRetrospective(id);
    if (!data) return res.status(404).json({ erro:'Retrospectiva nao encontrada.' });
    res.json(data);
  } catch(e) {
    console.error('Stripe session error:',e.message);
    res.status(500).json({ erro:'Nao foi possivel carregar a retrospectiva.' });
  }
});

/* ─────────────────────────────────────────
   CRIAR SESSÃO — FAST PATH
   1. Save minimal JSON (~1ms)
   2. Create Stripe session (~300ms)
   3. Return URL immediately
   4. Process files in background
───────────────────────────────────────── */
app.post('/criar-sessao',
  upload.fields([{name:'photos',maxCount:12},{name:'music',maxCount:1},{name:'whatsappFile',maxCount:1}]),
  async (req, res) => {
    try {
      if (!stripe)           return res.status(500).json({ erro:'STRIPE_SECRET_KEY nao configurada.' });
      if (!process.env.APP_URL) return res.status(500).json({ erro:'APP_URL nao configurada.' });

      const { nome1, nome2, email, mensagem='', categoria='casal' } = req.body||{};
      if (!nome1||!nome2||!email) return res.status(400).json({ erro:'Preencha nome, pessoa e email.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro:'Email invalido.' });

      const appUrl = (process.env.APP_URL||'').trim().replace(/\/+$/,'');

      // ── STEP 1: save minimal record instantly ──
      const id = createId();
      writeRetrospective({
        id, nome1, nome2, email,
        mensagem: (mensagem||'').slice(0,500),
        categoria,
        dataInicio: req.body.dataInicio||'',
        musicLink:  (req.body.musicLink||'').trim(),
        musicName:  req.body.musicName||'Trilha sonora',
        insights:   (() => { try { return JSON.parse(req.body.insights||'null'); } catch { return null; } })(),
        photos: [], musicSrc: '', pago: false,
        criadoEm: new Date().toISOString()
      });

      // Track event
      trackEvent('checkout_initiated', { id, nome1, nome2, categoria, email });

      // ── STEP 2: create Stripe session ──
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'brl',
            unit_amount: Number(process.env.PRICE_CENTS)||990,
            product_data: {
              name: 'LoveBlast - Retrospectiva',
              description: `Retrospectiva ${categoria} para ${nome1} & ${nome2}`
            }
          },
          quantity: 1
        }],
        success_url: `${appUrl}/view.html?id=${id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${appUrl}/?cancelado=1`,
        metadata:    { retrospectiveId: id, nome1, nome2, categoria, mensagem: mensagem.slice(0,450) }
      });

      // ── STEP 3: respond immediately ──
      res.json({ checkoutUrl: session.url, sessionId: session.id, retrospectiveId: id });

      // ── STEP 4: process files in background ──
      setImmediate(() => {
        saveRetrospectiveFiles(req, req.body||{}, id).catch(e =>
          console.error('BG file error:', e.message)
        );
      });

    } catch(err) {
      console.error('Stripe error:', err.message);
      res.status(err.statusCode||500).json({
        erro: err.statusCode ? err.message : 'Erro ao criar sessao de pagamento.'
      });
    }
  }
);

/* ─────────────────────────────────────────
   STRIPE WEBHOOK
───────────────────────────────────────── */
app.post('/webhook', express.raw({type:'application/json'}), (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
  } catch(e) {
    console.error('Webhook error:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const id = event.data.object?.metadata?.retrospectiveId;
    if (id) markPaid(id);
  }
  if (event.type === 'checkout.session.async_payment_failed') {
    const id = event.data.object?.metadata?.retrospectiveId;
    if (id) trackEvent('purchase_failed', { retroId: id });
  }
  res.json({ received: true });
});

/* ─────────────────────────────────────────
   CATCH-ALL
───────────────────────────────────────── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname,'../public/index.html'));
});

app.listen(PORT, () => console.log(`LoveBlast na porta ${PORT}`));
