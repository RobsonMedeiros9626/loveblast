// ============================================================
// LoveBlast — Admin Panel completo
// ============================================================
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const PRICE    = Number(process.env.PRICE_CENTS||990) / 100;

function getAllRetros() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR,f),'utf8')); } catch { return null; } })
    .filter(Boolean)
    .sort((a,b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function getAnalytics() {
  const af = path.join(DATA_DIR,'_analytics.json');
  try { return JSON.parse(fs.readFileSync(af,'utf8')); } catch { return {events:[],counts:{},daily:{}}; }
}

function dayRange(days) {
  const d = new Date(); d.setDate(d.getDate()-days);
  return d.toISOString().split('T')[0];
}

function sumEvent(daily, event, fromDate) {
  return Object.entries(daily||{})
    .filter(([d]) => d >= fromDate)
    .reduce((acc,[,counts]) => acc + (counts[event]||0), 0);
}

function adminHTML(retros, analytics) {
  const today     = new Date().toISOString().split('T')[0];
  const week      = dayRange(7);
  const month     = dayRange(30);
  const daily     = analytics.daily||{};
  const events    = analytics.events||[];
  const counts    = analytics.counts||{};

  // ── Visitors ──
  const visToday  = Object.values(daily[today]||{}).reduce((a,b)=>a+b,0);
  const visWeek   = Object.entries(daily).filter(([d])=>d>=week).reduce((a,[,c])=>a+Object.values(c).reduce((x,y)=>x+y,0),0);
  const visMonth  = Object.entries(daily).filter(([d])=>d>=month).reduce((a,[,c])=>a+Object.values(c).reduce((x,y)=>x+y,0),0);
  const visTotal  = events.length;
  const visUnique = new Set(events.map(e=>e.ip||'')).size;

  // Device breakdown
  const devMap = {}; events.forEach(e=>{ if(e.device) devMap[e.device]=(devMap[e.device]||0)+1; });
  const browserMap = {}; events.forEach(e=>{ if(e.browser) browserMap[e.browser]=(browserMap[e.browser]||0)+1; });

  // ── Funnel ──
  const fHome      = counts['page_home']||0;
  const fCreate    = counts['modal_open']||0;
  const fPreview   = counts['preview_click']||0;
  const fPayClick  = counts['pay_click']||0;
  const fCheckout  = counts['checkout_initiated']||0;
  const fApproved  = counts['purchase_approved']||0;
  const fFailed    = counts['purchase_failed']||0;
  const convRate   = fHome>0 ? ((fApproved/fHome)*100).toFixed(1) : '0';

  // ── Retros ──
  const total      = retros.length;
  const pagos      = retros.filter(r=>r.pago).length;
  const abandoned  = total - pagos;

  // ── Revenue ──
  const recTotal   = (pagos * PRICE).toFixed(2);
  const recHoje    = retros.filter(r=>r.pago&&r.pagoEm&&r.pagoEm.startsWith(today)).length * PRICE;
  const recSemana  = retros.filter(r=>r.pago&&r.pagoEm&&r.pagoEm.split('T')[0]>=week).length * PRICE;
  const recMes     = retros.filter(r=>r.pago&&r.pagoEm&&r.pagoEm.split('T')[0]>=month).length * PRICE;
  const ticket     = pagos>0?(pagos*PRICE/pagos).toFixed(2):'0.00';

  // ── Chart data (last 14 days) ──
  const last14 = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-13+i); return d.toISOString().split('T')[0]; });
  const salesChart = last14.map(d => retros.filter(r=>r.pago&&r.pagoEm&&r.pagoEm.startsWith(d)).length);
  const visChart   = last14.map(d => Object.values(daily[d]||{}).reduce((a,b)=>a+b,0));
  const labels     = last14.map(d => d.slice(5));

  // ── Leads (started but didn't pay) ──
  const leads = retros.filter(r=>!r.pago&&r.email).slice(0,50);

  // ── Payments table ──
  const payments = retros.slice(0,100).map(r => {
    const status = r.pago
      ? `<span class="badge paid">✓ Pago</span>`
      : `<span class="badge unpaid">✗ Pendente</span>`;
    const date = r.pagoEm
      ? new Date(r.pagoEm).toLocaleString('pt-BR')
      : new Date(r.criadoEm).toLocaleString('pt-BR');
    return `<tr>
      <td>${new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
      <td><strong>${r.nome1||'—'} &amp; ${r.nome2||'—'}</strong></td>
      <td>${r.email||'—'}</td>
      <td><span class="cat">${r.categoria||'casal'}</span></td>
      <td>${status}</td>
      <td>${r.pago?`R$ ${PRICE.toFixed(2)}`:'—'}</td>
      <td><a href="/view.html?id=${r.id}" target="_blank" class="link">Ver →</a></td>
    </tr>`;
  }).join('');

  const leadsRows = leads.map(r => `<tr>
    <td>${r.nome1||'—'} &amp; ${r.nome2||'—'}</td>
    <td>${r.email||'—'}</td>
    <td>${r.categoria||'casal'}</td>
    <td>${new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
  </tr>`).join('');

  const devRows = Object.entries(devMap).map(([d,n])=>`<tr><td>${d}</td><td class="num">${n}</td><td class="num">${((n/visTotal)*100).toFixed(1)}%</td></tr>`).join('');
  const brwRows = Object.entries(browserMap).map(([b,n])=>`<tr><td>${b}</td><td class="num">${n}</td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LoveBlast — Admin</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,Arial,sans-serif;background:#0a0a0f;color:#fff;padding:20px;min-height:100vh}
h1{font-size:22px;font-weight:900;background:linear-gradient(90deg,#ff2d78,#ff8a00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}
.subtitle{font-size:13px;color:rgba(255,255,255,.4);margin-bottom:24px}
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.refresh{padding:7px 16px;background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.4);color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}
.refresh:hover{background:rgba(255,45,120,.3)}

/* SECTIONS */
.section{margin-bottom:28px}
.section-title{font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.07)}

/* STAT GRID */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 14px}
.stat .val{font-size:28px;font-weight:900;line-height:1;color:#ff2d78;text-shadow:0 0 14px rgba(255,45,120,.4)}
.stat .val.green{color:#00c864;text-shadow:0 0 14px rgba(0,200,100,.3)}
.stat .val.orange{color:#ff8a00;text-shadow:0 0 14px rgba(255,138,0,.3)}
.stat .val.blue{color:#7b9fff;text-shadow:0 0 14px rgba(123,159,255,.3)}
.stat .val.gold{color:#ffd700;text-shadow:0 0 14px rgba(255,215,0,.3)}
.stat .lbl{font-size:11px;color:rgba(255,255,255,.35);margin-top:5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}

/* FUNNEL */
.funnel{display:flex;flex-direction:column;gap:6px}
.funnel-step{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border-radius:10px;border-left:3px solid rgba(255,45,120,.4)}
.funnel-step .f-label{flex:1;font-size:13px;color:rgba(255,255,255,.7)}
.funnel-step .f-num{font-size:18px;font-weight:900;color:#ff2d78;min-width:50px;text-align:right}
.funnel-step .f-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);flex:2;position:relative;overflow:hidden}
.funnel-step .f-fill{height:100%;background:linear-gradient(90deg,#ff2d78,#ff8a00);border-radius:99px;transition:.5s}

/* CHARTS */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.chart-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px}
.chart-box h3{font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:14px}

/* TABLES */
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 12px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.07)}
td{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}
tr:hover td{background:rgba(255,255,255,.02)}
.badge{padding:3px 9px;border-radius:99px;font-size:11px;font-weight:900}
.paid{background:rgba(0,200,100,.12);color:#00c864;border:1px solid rgba(0,200,100,.25)}
.unpaid{background:rgba(255,100,100,.08);color:#ff7070;border:1px solid rgba(255,100,100,.2)}
.cat{padding:2px 8px;background:rgba(255,45,120,.12);color:#ff7aa9;border-radius:6px;font-size:11px;font-weight:700}
.link{color:#ff2d78;text-decoration:none;font-weight:900;font-size:12px}
.link:hover{text-decoration:underline}
.num{text-align:right;color:#ff2d78;font-weight:700}

/* BREAKDOWN */
.breakdown-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bk-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px}
.bk-box h3{font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:10px}

/* RESPONSIVE */
@media(max-width:768px){
  .chart-grid,.breakdown-grid{grid-template-columns:1fr}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>

<div class="topbar">
  <div>
    <h1>♡ LoveBlast — Admin</h1>
    <div class="subtitle">Atualizado em ${new Date().toLocaleString('pt-BR')}</div>
  </div>
  <button class="refresh" onclick="location.reload()">↻ Atualizar</button>
</div>

<!-- VISITORS -->
<div class="section">
  <div class="section-title">👥 Visitantes</div>
  <div class="stat-grid">
    <div class="stat"><div class="val blue">${visTotal.toLocaleString('pt-BR')}</div><div class="lbl">Total eventos</div></div>
    <div class="stat"><div class="val blue">${visUnique.toLocaleString('pt-BR')}</div><div class="lbl">IPs únicos</div></div>
    <div class="stat"><div class="val blue">${visToday}</div><div class="lbl">Hoje</div></div>
    <div class="stat"><div class="val blue">${visWeek}</div><div class="lbl">Esta semana</div></div>
    <div class="stat"><div class="val blue">${visMonth}</div><div class="lbl">Este mês</div></div>
    <div class="stat"><div class="val gold">${convRate}%</div><div class="lbl">Conversão</div></div>
  </div>
</div>

<!-- FUNNEL -->
<div class="section">
  <div class="section-title">🔄 Funil de Conversão</div>
  <div class="funnel">
    ${[
      ['🏠 Acessaram a Home',        fHome,     fHome],
      ['📝 Abriram o formulário',    fCreate,   fHome],
      ['👁 Viram a prévia',          fPreview,  fHome],
      ['💳 Clicaram em pagar',       fPayClick, fHome],
      ['🛒 Checkout Stripe iniciado',fCheckout, fHome],
      ['✅ Pagamentos aprovados',    fApproved, fHome],
      ['❌ Pagamentos falharam',     fFailed,   fHome],
    ].map(([label,n,base])=>{
      const pct = base>0 ? Math.round((n/base)*100) : 0;
      return `<div class="funnel-step">
        <span class="f-label">${label}</span>
        <div class="f-bar"><div class="f-fill" style="width:${pct}%"></div></div>
        <span class="f-num">${n} <span style="font-size:11px;color:rgba(255,255,255,.3)">(${pct}%)</span></span>
      </div>`;
    }).join('')}
  </div>
</div>

<!-- REVENUE -->
<div class="section">
  <div class="section-title">💰 Faturamento</div>
  <div class="stat-grid">
    <div class="stat"><div class="val green">R$&nbsp;${recTotal}</div><div class="lbl">Receita total</div></div>
    <div class="stat"><div class="val green">R$&nbsp;${recHoje.toFixed(2)}</div><div class="lbl">Hoje</div></div>
    <div class="stat"><div class="val green">R$&nbsp;${recSemana.toFixed(2)}</div><div class="lbl">Semana</div></div>
    <div class="stat"><div class="val green">R$&nbsp;${recMes.toFixed(2)}</div><div class="lbl">Mês</div></div>
    <div class="stat"><div class="val">${total}</div><div class="lbl">Total criadas</div></div>
    <div class="stat"><div class="val green">${pagos}</div><div class="lbl">Pagas</div></div>
    <div class="stat"><div class="val orange">${abandoned}</div><div class="lbl">Abandonadas</div></div>
    <div class="stat"><div class="val gold">R$&nbsp;${ticket}</div><div class="lbl">Ticket médio</div></div>
  </div>
</div>

<!-- CHARTS -->
<div class="section">
  <div class="section-title">📊 Gráficos — últimos 14 dias</div>
  <div class="chart-grid">
    <div class="chart-box">
      <h3>Vendas por dia</h3>
      <canvas id="chartSales" height="180"></canvas>
    </div>
    <div class="chart-box">
      <h3>Tráfego por dia</h3>
      <canvas id="chartVisits" height="180"></canvas>
    </div>
  </div>
</div>

<!-- DEVICE BREAKDOWN -->
<div class="section">
  <div class="section-title">📱 Dispositivos & Navegadores</div>
  <div class="breakdown-grid">
    <div class="bk-box">
      <h3>Dispositivos</h3>
      <div class="tbl-wrap">
        <table><thead><tr><th>Tipo</th><th>Visitas</th><th>%</th></tr></thead>
        <tbody>${devRows||'<tr><td colspan="3" style="color:rgba(255,255,255,.3)">Sem dados</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="bk-box">
      <h3>Navegadores</h3>
      <div class="tbl-wrap">
        <table><thead><tr><th>Navegador</th><th>Visitas</th></tr></thead>
        <tbody>${brwRows||'<tr><td colspan="2" style="color:rgba(255,255,255,.3)">Sem dados</td></tr>'}</tbody></table>
      </div>
    </div>
  </div>
</div>

<!-- PAYMENTS -->
<div class="section">
  <div class="section-title">💳 Pagamentos (últimos 100)</div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Data criação</th><th>Casal / Pessoa</th><th>Email</th><th>Categoria</th><th>Status</th><th>Valor</th><th></th></tr></thead>
      <tbody>${payments||'<tr><td colspan="7" style="color:rgba(255,255,255,.3);padding:20px">Nenhuma retrospectiva ainda.</td></tr>'}</tbody>
    </table>
  </div>
</div>

<!-- LEADS -->
<div class="section">
  <div class="section-title">🎯 Leads (criaram mas não pagaram)</div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Nome</th><th>Email</th><th>Categoria</th><th>Data</th></tr></thead>
      <tbody>${leadsRows||'<tr><td colspan="4" style="color:rgba(255,255,255,.3);padding:20px">Nenhum lead ainda.</td></tr>'}</tbody>
    </table>
  </div>
</div>

<script>
const chartOpts = (label, color) => ({
  type: 'bar',
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' } },
      y: { ticks: { color: 'rgba(255,255,255,.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  }
});

const labels = ${JSON.stringify(labels)};

new Chart(document.getElementById('chartSales'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{ label: 'Vendas', data: ${JSON.stringify(salesChart)},
      backgroundColor: 'rgba(255,45,120,.6)', borderColor: '#ff2d78', borderWidth: 1, borderRadius: 4 }]
  },
  options: chartOpts('Vendas','#ff2d78').options
});

new Chart(document.getElementById('chartVisits'), {
  type: 'line',
  data: {
    labels,
    datasets: [{ label: 'Eventos', data: ${JSON.stringify(visChart)},
      borderColor: '#7b9fff', backgroundColor: 'rgba(123,159,255,.12)',
      borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 }]
  },
  options: { responsive: true, plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,.4)', font:{size:10} }, grid: { color: 'rgba(255,255,255,.06)' } },
      y: { ticks: { color: 'rgba(255,255,255,.4)', font:{size:10} }, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  }
});
</script>
</body>
</html>`;
}

module.exports = function(app) {
  const TOKEN = process.env.TOKEN_SECRET || 'loveblast_super_secreto_123456789';

  function auth(req, res, next) {
    const t = req.query.token || req.headers['x-admin-token'];
    if (t === TOKEN) return next();
    res.status(401).send(`<!DOCTYPE html><html><body style="background:#0a0a0f;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px">
      <div style="font-size:48px">🔒</div>
      <div style="font-size:20px;font-weight:700">Acesso restrito</div>
      <form method="GET" style="display:flex;gap:8px">
        <input name="token" type="password" placeholder="Token de acesso" autofocus style="padding:10px 14px;border-radius:8px;border:1px solid #ff2d78;background:#1a0414;color:#fff;font-size:15px;outline:none;width:260px">
        <button type="submit" style="padding:10px 20px;background:linear-gradient(90deg,#ff2d78,#ff6b1a);border:none;border-radius:8px;color:#fff;font-weight:900;cursor:pointer;font-size:15px">Entrar</button>
      </form>
    </body></html>`);
  }

  app.get('/admin', auth, (req, res) => {
    const retros    = getAllRetros();
    const analytics = getAnalytics();
    res.send(adminHTML(retros, analytics));
  });

  app.get('/admin/api/stats', auth, (req, res) => {
    const retros = getAllRetros();
    const pagos  = retros.filter(r=>r.pago).length;
    res.json({
      total: retros.length, pagos,
      receita: (pagos * PRICE).toFixed(2),
      hoje: retros.filter(r=>r.pago&&r.pagoEm&&r.pagoEm.startsWith(new Date().toISOString().split('T')[0])).length
    });
  });
};
