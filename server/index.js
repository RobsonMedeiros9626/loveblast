require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const crypto   = require('crypto');
const path     = require('path');
const Stripe   = require('stripe');
const multer   = require('multer');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app    = express();

// ── Multer: MP3 em memória (max 15 MB) ──────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/mp4','audio/x-m4a'].includes(file.mimetype)
               || file.originalname.match(/\.(mp3|wav|ogg|m4a)$/i);
    cb(null, !!ok);
  }
});

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/webhook', express.raw({ type: 'application/json' }));
// JSON para rotas normais (fotos em base64 são grandes — mantém 20mb)
app.use((req, res, next) => {
  if (req.path === '/webhook') return next();
  express.json({ limit: '25mb' })(req, res, next);
});

// ── Banco em memória ─────────────────────────────────────────────────────────
// orders: { sessionId -> { status, downloadToken, retroId, nome1, nome2 } }
const orders = new Map();
// retros: { retroId -> { html, dados, audioBuffer, audioMime, createdAt } }
const retros = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateToken(seed) {
  return crypto.createHash('sha256')
    .update(`${seed}:${Date.now()}:${process.env.TOKEN_SECRET || 'secret'}`)
    .digest('hex');
}

function generateRetroId() {
  return crypto.randomBytes(8).toString('hex'); // ex: a8f3d92c1b0e4f71
}

function buildRetroHtml(dados, audioDataUrl) {
  const { nome1='Você', nome2='Amor', data, mensagem, musica, fotos=[], tema='fire' } = dados;

  const temas = {
    fire:   { bg:'linear-gradient(135deg,#1A0008 0%,#4D0019 40%,#FF2D78 100%)', accent:'#FF2D78', mc:'#FF6B9D', particle:'rgba(255,45,120,' },
    cosmos: { bg:'linear-gradient(135deg,#050010 0%,#1A0060 40%,#8B3DFF 100%)', accent:'#8B3DFF', mc:'#B07AFF', particle:'rgba(139,61,255,' },
    gold:   { bg:'linear-gradient(135deg,#0D0900 0%,#3D2200 40%,#FFD60A 100%)', accent:'#FFD60A', mc:'#FFD60A', particle:'rgba(255,214,10,'  },
  };
  const t = temas[tema] || temas.fire;

  let dateStr = '';
  if (data) {
    const d = new Date(data + 'T00:00:00');
    dateStr = `Juntos desde ${d.toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' })}`;
  }

  const photoSlots = [0,1,2,3].map(i =>
    fotos[i]
      ? `<div class="photo-item"><img src="${fotos[i]}" alt="Foto ${i+1}" loading="lazy"></div>`
      : `<div class="photo-item empty">📷</div>`
  ).join('');

  // Player de áudio real (embutido como base64 ou URL)
  const audioSection = audioDataUrl ? `
  <div class="music-player">
    <div class="player-track">♫ ${musica || 'Nossa música'}</div>
    <audio id="audio" src="${audioDataUrl}" preload="metadata" playsinline></audio>
    <div class="player-bar" id="player-bar">
      <div class="player-progress" id="player-progress"></div>
    </div>
    <div class="player-controls">
      <button onclick="seek(-10)">⏮</button>
      <button id="play-btn" onclick="togglePlay()">▶</button>
      <button onclick="seek(10)">⏭</button>
    </div>
  </div>` : musica ? `<div class="music-badge">♫ ${musica}</div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0A0708">
<title>${nome1} & ${nome2} ♥ — LoveBlast</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@300;400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-snap-type:y mandatory}
body{font-family:'Space Grotesk',sans-serif;background:#0A0708;color:#FAF5F0;overflow-x:hidden;overscroll-behavior:none}
body::-webkit-scrollbar{display:none}

/* Slides */
.slide{min-height:100dvh;scroll-snap-align:start;scroll-snap-stop:always;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:2rem 1.5rem;text-align:center}

/* Partículas */
.particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.particle{position:absolute;border-radius:50%;animation:floatUp linear infinite}
@keyframes floatUp{0%{transform:translateY(100vh);opacity:0}10%{opacity:.5}90%{opacity:.2}100%{transform:translateY(-20px);opacity:0}}

/* S1: Intro */
.s-intro{background:${t.bg}}
.intro-eyebrow{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${t.mc};margin-bottom:1.5rem;opacity:0;animation:fadeUp .8s .3s ease forwards}
.intro-names{font-family:'Instrument Serif',serif;font-style:italic;font-size:clamp(2.5rem,10vw,5rem);line-height:1;color:#FAF5F0;opacity:0;animation:fadeUp .9s .5s ease forwards;text-shadow:0 0 40px ${t.particle}.3)}
.intro-names .amp{color:${t.accent};animation:glowPulse 3s 1.5s ease-in-out infinite}
.intro-date{font-size:.78rem;color:rgba(250,245,240,.45);margin-top:1.2rem;letter-spacing:.1em;text-transform:uppercase;opacity:0;animation:fadeUp .8s .9s ease forwards}
.scroll-hint{position:absolute;bottom:1.8rem;display:flex;flex-direction:column;align-items:center;gap:.4rem;opacity:0;animation:fadeUp .8s 1.6s ease forwards}
.scroll-hint span{font-size:.62rem;color:rgba(250,245,240,.35);letter-spacing:.1em;text-transform:uppercase}
.scroll-arrow{width:18px;height:18px;border-right:2px solid ${t.accent};border-bottom:2px solid ${t.accent};transform:rotate(45deg);animation:bounce 1.5s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:rotate(45deg) translate(0,0);opacity:.4}50%{transform:rotate(45deg) translate(4px,4px);opacity:1}}

/* S2: Fotos */
.s-photos{background:#0D0008}
.photos-label{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${t.accent};margin-bottom:1.4rem}
.photos-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:320px;width:100%}
.photo-item{aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.photo-item img{width:100%;height:100%;object-fit:cover;animation:slowZoom 12s ease-in-out infinite alternate}
.photo-item.empty{display:flex;align-items:center;justify-content:center;font-size:2rem;color:rgba(255,255,255,.15)}
@keyframes slowZoom{from{transform:scale(1)}to{transform:scale(1.06)}}

/* S3: Timeline */
.s-timeline{background:linear-gradient(180deg,#0D0008,#050010)}
.tl-title{font-family:'Syne',sans-serif;font-size:clamp(1.5rem,5vw,2.4rem);font-weight:800;letter-spacing:-.03em;margin-bottom:2rem}
.tl-list{display:flex;flex-direction:column;gap:1.2rem;max-width:300px;width:100%;position:relative}
.tl-list::before{content:'';position:absolute;left:13px;top:0;bottom:0;width:1px;background:linear-gradient(180deg,${t.accent},transparent)}
.tl-item{display:flex;align-items:flex-start;gap:.9rem;opacity:0;transform:translateX(-20px);transition:opacity .6s ease,transform .6s ease}
.tl-item.show{opacity:1;transform:translateX(0)}
.tl-dot{width:26px;height:26px;border-radius:50%;background:${t.accent};display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;box-shadow:0 0 14px ${t.particle}.4)}
.tl-year{font-family:'Syne',sans-serif;font-size:.65rem;font-weight:700;color:${t.accent};letter-spacing:.1em;text-transform:uppercase}
.tl-text{font-family:'Instrument Serif',serif;font-style:italic;font-size:1rem;color:#FAF5F0;margin-top:.1rem;line-height:1.4}

/* S4: Mensagem */
.s-message{background:radial-gradient(ellipse at 30% 50%,${t.particle}.1),transparent 60%),#0A0708}
.msg-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:clamp(1.05rem,3.5vw,1.5rem);line-height:1.75;max-width:340px;color:#FAF5F0;position:relative}
.msg-quote::before{content:'\u201C';position:absolute;top:-.4rem;left:-.2rem;font-size:3.5rem;color:${t.particle}.15);font-family:'Instrument Serif',serif;line-height:1}
.msg-word{display:inline-block;opacity:0;transform:translateY(6px);transition:opacity .35s ease,transform .35s ease}
.msg-word.show{opacity:1;transform:translateY(0)}
.msg-from{margin-top:1.4rem;font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${t.accent};opacity:0;transition:opacity .6s .8s ease}
.msg-from.show{opacity:1}

/* S5: Música */
.s-music{background:linear-gradient(180deg,#050010,#0A0708)}
.music-label{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8B3DFF;margin-bottom:1.4rem}
.music-player{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.5rem;max-width:290px;width:100%;backdrop-filter:blur(20px)}
.player-track{font-family:'Syne',sans-serif;font-size:.88rem;font-weight:700;color:#FAF5F0;margin-bottom:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-bar{height:3px;background:rgba(255,255,255,.08);border-radius:100px;margin:1rem 0;cursor:pointer;overflow:hidden}
.player-progress{height:100%;background:linear-gradient(90deg,#8B3DFF,${t.accent});border-radius:100px;width:0%;transition:width .1s linear}
.player-controls{display:flex;align-items:center;justify-content:center;gap:1.2rem}
.player-controls button{background:none;border:none;color:#FAF5F0;font-size:1.2rem;opacity:.6;cursor:pointer;transition:opacity .2s,transform .15s;padding:.3rem}
.player-controls button:hover{opacity:1;transform:scale(1.1)}
#play-btn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8B3DFF,${t.accent});opacity:1;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 0 20px rgba(139,61,255,.4)}
.music-badge{display:inline-flex;align-items:center;gap:.4rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:100px;padding:.4rem 1rem;font-size:.8rem;color:${t.mc}}

/* S6: Final */
.s-final{background:${t.bg}}
.final-text{font-family:'Syne',sans-serif;font-size:clamp(1.1rem,4vw,1.9rem);font-weight:800;letter-spacing:-.02em;line-height:1.3;max-width:340px;opacity:0;animation:fadeUp .9s .3s ease forwards}
.final-text em{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;color:${t.accent};display:block;font-size:1.25em;margin-top:.3rem;animation:glowPulse 3s 1.2s ease-in-out infinite}
.final-names{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.3rem;color:#FAF5F0;margin-top:1.4rem;opacity:0;animation:fadeUp .8s .6s ease forwards}
.final-actions{display:flex;flex-direction:column;gap:.8rem;width:100%;max-width:280px;margin-top:2rem;opacity:0;animation:fadeUp .8s .9s ease forwards}
.btn-dl{padding:.9rem;border-radius:8px;font-family:'Syne',sans-serif;font-size:.82rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border:none;cursor:pointer;transition:transform .15s,box-shadow .2s;display:flex;align-items:center;justify-content:center;gap:.4rem}
.btn-dl.primary{background:linear-gradient(90deg,${t.accent},${t.mc});color:#0A0708}
.btn-dl.primary:hover{transform:translateY(-2px);box-shadow:0 12px 28px ${t.particle}.4)}
.btn-dl.secondary{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);color:#FAF5F0}
.btn-dl.secondary:hover{background:rgba(255,255,255,.1)}

/* Side nav dots */
.sidenav{position:fixed;right:1rem;top:50%;transform:translateY(-50%);z-index:100;display:flex;flex-direction:column;gap:.5rem}
.sidenav-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.2);cursor:pointer;transition:all .3s}
.sidenav-dot.active{background:${t.accent};height:18px;border-radius:3px}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{text-shadow:0 0 20px ${t.particle}.3)}50%{text-shadow:0 0 50px ${t.particle}.8),0 0 80px ${t.particle}.3)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
</style>
</head>
<body>

<!-- Side nav -->
<nav class="sidenav" id="sidenav">
  <div class="sidenav-dot active" data-target="0"></div>
  <div class="sidenav-dot" data-target="1"></div>
  <div class="sidenav-dot" data-target="2"></div>
  <div class="sidenav-dot" data-target="3"></div>
  <div class="sidenav-dot" data-target="4"></div>
  <div class="sidenav-dot" data-target="5"></div>
</nav>

<!-- S1: Intro -->
<div class="slide s-intro" id="s0">
  <div class="particles" id="p0"></div>
  <div class="intro-eyebrow">✦ Uma história de amor</div>
  <div class="intro-names">
    ${nome1} <span class="amp">& ${nome2}</span>
  </div>
  ${dateStr ? `<div class="intro-date">${dateStr}</div>` : ''}
  <div class="scroll-hint">
    <span>Deslize para baixo</span>
    <div class="scroll-arrow"></div>
  </div>
</div>

<!-- S2: Fotos -->
<div class="slide s-photos" id="s1">
  <div class="photos-label">📸 Momentos que ficam</div>
  <div class="photos-grid">${photoSlots}</div>
</div>

<!-- S3: Timeline -->
<div class="slide s-timeline" id="s2">
  <div class="tl-title">Nossa história ❤️</div>
  <div class="tl-list" id="tl-list"></div>
</div>

<!-- S4: Mensagem -->
<div class="slide s-message" id="s3">
  <div class="msg-quote" id="msg-quote"></div>
  <div class="msg-from" id="msg-from">— ${nome1}</div>
</div>

<!-- S5: Música -->
<div class="slide s-music" id="s4">
  <div class="music-label">♫ Nossa música</div>
  ${audioSection}
</div>

<!-- S6: Final -->
<div class="slide s-final" id="s5">
  <div class="particles" id="p5"></div>
  <div class="final-text">
    Algumas histórias merecem<br>ser eternizadas.
    <em>${nome1} & ${nome2}</em>
  </div>
  <div class="final-actions">
    <button class="btn-dl primary" onclick="window.print()">⬇ Salvar retrospectiva</button>
    <button class="btn-dl secondary" onclick="copyLink()">🔗 Copiar link</button>
  </div>
</div>

<script>
// ── Timeline ────────────────────────────────────────────────────────────────
const tlData = ${JSON.stringify(buildTimelineData(data, nome1, nome2))};
const tlList = document.getElementById('tl-list');
tlData.forEach(item => {
  const div = document.createElement('div');
  div.className = 'tl-item';
  div.innerHTML = '<div class="tl-dot">' + item.icon + '</div><div><div class="tl-year">' + item.year + '</div><div class="tl-text">' + item.text + '</div></div>';
  tlList.appendChild(div);
});

// ── Mensagem palavra por palavra ─────────────────────────────────────────────
const msgText = ${JSON.stringify(mensagem ? '"' + mensagem + '"' : 'Algumas histórias não precisam de palavras.')};
const msgEl = document.getElementById('msg-quote');
msgText.split(' ').forEach((w, i) => {
  const span = document.createElement('span');
  span.className = 'msg-word';
  span.style.transitionDelay = (i * 0.06) + 's';
  span.textContent = w + ' ';
  msgEl.appendChild(span);
});

// ── Partículas ───────────────────────────────────────────────────────────────
function spawnParticles(id, color, n) {
  const c = document.getElementById(id); if (!c) return; c.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const s = 2 + Math.random() * 5;
    p.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (Math.random()*100) + '%;background:' + color + (0.3 + Math.random()*.4) + ');animation-duration:' + (6+Math.random()*10) + 's;animation-delay:' + (Math.random()*6) + 's';
    c.appendChild(p);
  }
}
spawnParticles('p0', '${t.particle}', 20);
spawnParticles('p5', '${t.particle}', 20);

// ── Side nav + Scroll Observer ───────────────────────────────────────────────
const dots = document.querySelectorAll('.sidenav-dot');
dots.forEach(d => d.addEventListener('click', () => {
  document.getElementById('s' + d.dataset.target).scrollIntoView({ behavior: 'smooth' });
}));

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const idx = parseInt(e.target.id.replace('s', ''));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));

    // Anima elementos do slide
    e.target.querySelectorAll('.tl-item').forEach(el => el.classList.add('show'));
    e.target.querySelectorAll('.msg-word').forEach(el => el.classList.add('show'));
    e.target.querySelectorAll('.msg-from').forEach(el => el.classList.add('show'));
    e.target.querySelectorAll('.music-player').forEach(el => {
      el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    });
  });
}, { threshold: 0.45 });
document.querySelectorAll('.slide').forEach(s => io.observe(s));

// ── Audio Player ─────────────────────────────────────────────────────────────
const audio = document.getElementById('audio');
if (audio) {
  const btn = document.getElementById('play-btn');
  const bar = document.getElementById('player-bar');
  const prog = document.getElementById('player-progress');

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    prog.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
  });
  audio.addEventListener('ended', () => { btn.textContent = '▶'; });

  window.togglePlay = function() {
    if (audio.paused) { audio.play(); btn.textContent = '⏸'; }
    else              { audio.pause(); btn.textContent = '▶'; }
  };
  window.seek = function(s) { audio.currentTime = Math.max(0, audio.currentTime + s); };
  bar.addEventListener('click', e => {
    const r = bar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });

  // Autoplay suave ao chegar no slide de música
  const musicSlide = document.getElementById('s4');
  const autoIO = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && audio.paused) {
      audio.volume = 0;
      audio.play().then(() => {
        let v = 0;
        const fade = setInterval(() => { v = Math.min(v + .05, 1); audio.volume = v; if (v >= 1) clearInterval(fade); }, 100);
        btn.textContent = '⏸';
      }).catch(() => {});
    }
  }, { threshold: 0.6 });
  autoIO.observe(musicSlide);
}

// ── Copiar link ───────────────────────────────────────────────────────────────
window.copyLink = function() {
  const url = window.location.href;
  if (navigator.share) { navigator.share({ title: '${nome1} & ${nome2} ♥', url }); }
  else { navigator.clipboard.writeText(url).then(() => alert('Link copiado! ✓')).catch(() => prompt('Copie o link:', url)); }
};
</script>
</body>
</html>`;
}

// Helper: gera dados da timeline
function buildTimelineData(data, n1, n2) {
  const items = [];
  if (data) {
    const yr = new Date(data + 'T00:00:00').getFullYear();
    const now = new Date().getFullYear();
    items.push({ year: String(yr), icon: '❤️', text: `${n1} & ${n2} se encontraram` });
    if (yr + 1 <= now) items.push({ year: String(yr + 1), icon: '✨', text: 'Primeira aventura juntos' });
    if (yr + 2 <= now) items.push({ year: String(yr + 2), icon: '💫', text: 'Viraram inseparáveis' });
  } else {
    items.push({ year: 'O início',   icon: '❤️', text: `${n1} & ${n2} se encontraram` });
    items.push({ year: 'A jornada',  icon: '✨', text: 'Construíram algo único' });
    items.push({ year: 'O presente', icon: '💫', text: 'Cada dia melhor que o anterior' });
  }
  items.push({ year: 'Hoje 🔥', icon: '🎯', text: 'Ainda parece o primeiro dia' });
  return items.slice(0, 4);
}

// ── POST /criar-sessao ───────────────────────────────────────────────────────
// Agora aceita multipart/form-data (com MP3) OU JSON (sem MP3)
app.post('/criar-sessao',
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      upload.single('audio')(req, res, next);
    } else {
      next();
    }
  },
  async (req, res) => {
    try {
      // Suporta tanto JSON quanto form-data
      const body = req.body;
      const nome1 = body.nome1;
      const nome2 = body.nome2;

      if (!nome1 || !nome2) {
        return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
      }

      // Salva audio temporariamente se enviado
      let audioTempId = null;
      if (req.file) {
        audioTempId = crypto.randomBytes(8).toString('hex');
        retros.set('audio_tmp_' + audioTempId, {
          buffer: req.file.buffer,
          mime: req.file.mimetype,
          createdAt: new Date(),
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
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
        metadata: { nome1, nome2, audioTempId: audioTempId || '' },
      });

      orders.set(session.id, {
        status: 'pending',
        downloadToken: null,
        retroId: null,
        createdAt: new Date(),
        nome1, nome2,
        audioTempId,
      });

      res.json({ sessionId: session.id, checkoutUrl: session.url });

    } catch (err) {
      console.error('Erro Stripe:', err.message);
      res.status(500).json({ erro: 'Erro ao criar sessão de pagamento.' });
    }
  }
);

// ── POST /webhook ────────────────────────────────────────────────────────────
app.post('/webhook', (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('Webhook inválido:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const token = generateToken(session.id);
      const retroId = generateRetroId();
      orders.set(session.id, {
        ...(orders.get(session.id) || {}),
        status: 'paid',
        downloadToken: token,
        retroId,
      });
      console.log('✅ Pago. retroId:', retroId);
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
        const token   = generateToken(sessionId);
        const retroId = generateRetroId();
        orders.set(sessionId, { ...(order || {}), status: 'paid', downloadToken: token, retroId });
        return res.json({ status: 'paid', token, retroId });
      }
      return res.json({ status: 'paid', token: order.downloadToken, retroId: order.retroId });
    }
    res.json({ status: session.payment_status });
  } catch {
    const order = orders.get(sessionId);
    if (!order) return res.status(404).json({ erro: 'Sessão não encontrada.' });
    res.json({ status: order.status, retroId: order.retroId });
  }
});

// ── POST /gerar-retro ────────────────────────────────────────────────────────
// Frontend envia dados após confirmar pagamento.
// Gera e persiste a retrospectiva.
app.post('/gerar-retro', async (req, res) => {
  const { token, sessionId, dados } = req.body;
  if (!token || !sessionId) return res.status(400).json({ erro: 'Token ou sessão ausente.' });

  // Valida pagamento
  let order = orders.get(sessionId);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(403).json({ erro: 'Pagamento não confirmado.' });
  } catch {
    if (!order || order.status !== 'paid') return res.status(403).json({ erro: 'Token inválido.' });
  }

  if (!order) order = orders.get(sessionId) || {};
  if (order.downloadToken && order.downloadToken !== token) return res.status(403).json({ erro: 'Token inválido.' });

  // Já foi gerada?
  const existingRetro = order.retroId ? retros.get(order.retroId) : null;
  if (existingRetro && existingRetro.html) {
    return res.json({ retroId: order.retroId, url: '/view/' + order.retroId });
  }

  // Recupera áudio (se houver)
  let audioDataUrl = null;
  const audioTempId = order.audioTempId || (dados && dados.audioTempId);
  if (audioTempId) {
    const audioObj = retros.get('audio_tmp_' + audioTempId);
    if (audioObj) {
      const b64 = audioObj.buffer.toString('base64');
      audioDataUrl = `data:${audioObj.mime};base64,${b64}`;
      retros.delete('audio_tmp_' + audioTempId); // limpa temp
    }
  }
  // Se áudio veio inline no dados (base64)
  if (!audioDataUrl && dados && dados.audioBase64) {
    audioDataUrl = dados.audioBase64;
  }

  // Gera HTML
  const retroId = order.retroId || generateRetroId();
  const html = buildRetroHtml(dados || {}, audioDataUrl);

  // Persiste
  retros.set(retroId, { html, dados, createdAt: new Date() });
  orders.set(sessionId, { ...order, retroId });

  console.log('🎬 Retro gerada:', retroId);
  res.json({ retroId, url: '/view/' + retroId });
});

// ── GET /view/:retroId ────────────────────────────────────────────────────────
// Rota pública — abre a retrospectiva no browser diretamente
app.get('/view/:retroId', (req, res) => {
  const retro = retros.get(req.params.retroId);
  if (!retro) {
    return res.status(404).send(`
      <html><body style="font-family:sans-serif;background:#0A0708;color:#FAF5F0;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
        <div><h2>Retrospectiva não encontrada</h2><p style="opacity:.5;margin-top:.5rem">O link pode ter expirado. Gere novamente.</p><a href="/" style="color:#FF2D78;margin-top:1rem;display:block">← Voltar</a></div>
      </body></html>`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(retro.html);
});

// ── GET /download/:retroId ────────────────────────────────────────────────────
// Download do HTML com nome de arquivo correto, sem cache
app.get('/download/:retroId', (req, res) => {
  const retro = retros.get(req.params.retroId);
  if (!retro) return res.status(404).json({ erro: 'Retrospectiva não encontrada.' });
  const { nome1='retro', nome2='' } = retro.dados || {};
  const filename = `loveblast-${nome1}${nome2 ? '-' + nome2 : ''}-${req.params.retroId.slice(0,6)}.html`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.send(retro.html);
});

// ── POST /download (legado — mantém compatibilidade) ─────────────────────────
app.post('/download', async (req, res) => {
  const { token, sessionId, dados } = req.body;
  if (!token || !sessionId) return res.status(400).json({ erro: 'Token ou sessão ausente.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(403).json({ erro: 'Pagamento não confirmado.' });
  } catch {
    const order = orders.get(sessionId);
    if (!order || order.status !== 'paid') return res.status(403).json({ erro: 'Token inválido.' });
  }
  // Redireciona para o novo fluxo
  const order = orders.get(sessionId);
  if (order && order.retroId && retros.has(order.retroId)) {
    return res.redirect('/download/' + order.retroId);
  }
  // Gera na hora (fallback)
  const html = buildRetroHtml(dados || {}, null);
  const { nome1='retro', nome2='' } = dados || {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="loveblast-${nome1}-${nome2}.html"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 LoveBlast rodando em http://localhost:' + PORT);
  console.log('   stripe listen --forward-to localhost:' + PORT + '/webhook\n');
});
