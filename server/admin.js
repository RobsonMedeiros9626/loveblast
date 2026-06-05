// ============================================================
// LoveBlast — Painel Administrativo
// GET /admin  (protegido por TOKEN_SECRET)
// ============================================================
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '../data');

function getStats() {
  const statsFile = path.join(__dirname, '../data/_stats.json');
  try { return JSON.parse(fs.readFileSync(statsFile, 'utf8')); }
  catch { return { visits:{}, pages:{} }; }
}

function getAllRetros() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function adminHTML(retros) {
  const total      = retros.length;
  const pagos      = retros.filter(r => r.pago).length;
  const nao_pagos  = total - pagos;
  const receita    = (pagos * (Number(process.env.PRICE_CENTS || 999) / 100)).toFixed(2);
  const stats = getStats();
  const today = new Date().toISOString().split('T')[0];
  const visitasHoje  = stats.visits?.[today] || 0;
  const visitasTotal = Object.values(stats.visits||{}).reduce((a,b)=>a+b,0);
  const convRate = visitasTotal > 0 ? ((pagos/visitasTotal)*100).toFixed(1) : '—';

  const cats = {};
  retros.forEach(r => { cats[r.categoria||'casal'] = (cats[r.categoria||'casal']||0)+1; });
  const catHtml = Object.entries(cats)
    .sort((a,b)=>b[1]-a[1])
    .map(([c,n])=>`<div class="cat-item"><span>${c}</span><span class="cat-n">${n}</span></div>`).join('');

  const rows = retros.map(r => {
    const date = new Date(r.criadoEm).toLocaleString('pt-BR');
    const pago = r.pago
      ? `<span class="badge paid">✓ Pago</span>`
      : `<span class="badge unpaid">✗ Não pago</span>`;
    const msgs = r.insights?.totalMessages ? Number(r.insights.totalMessages).toLocaleString('pt-BR') : '—';
    return `<tr>
      <td>${date}</td>
      <td><strong>${r.nome1||'—'}</strong> & <strong>${r.nome2||'—'}</strong></td>
      <td>${r.email||'—'}</td>
      <td><span class="cat-badge">${r.categoria||'casal'}</span></td>
      <td>${msgs}</td>
      <td>${pago}</td>
      <td><a href="/view.html?id=${r.id}" target="_blank" class="view-btn">Ver →</a></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LoveBlast — Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#0a0a0f;color:#fff;padding:24px}
h1{font-size:24px;font-weight:900;background:linear-gradient(90deg,#ff2d78,#ff8a00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px}
.stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,45,120,.25);border-radius:16px;padding:20px}
.stat .val{font-size:36px;font-weight:900;color:#ff2d78;text-shadow:0 0 16px rgba(255,45,120,.5)}
.stat .lbl{font-size:12px;color:rgba(255,255,255,.45);margin-top:4px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.section{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:20px}
.section h2{font-size:14px;font-weight:900;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:14px}
.cat-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px}
.cat-n{color:#ff2d78;font-weight:900}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);border-bottom:1px solid rgba(255,255,255,.08)}
td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}
tr:hover td{background:rgba(255,255,255,.03)}
.badge{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:900}
.paid{background:rgba(0,200,100,.15);color:#00c864;border:1px solid rgba(0,200,100,.3)}
.unpaid{background:rgba(255,50,50,.1);color:#ff6060;border:1px solid rgba(255,50,50,.2)}
.cat-badge{padding:3px 8px;background:rgba(255,45,120,.15);color:#ff7aa9;border-radius:6px;font-size:11px;font-weight:700}
.view-btn{color:#ff2d78;text-decoration:none;font-weight:900;font-size:12px}
.view-btn:hover{text-decoration:underline}
.refresh{margin-bottom:20px;padding:8px 18px;background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.4);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700}
.refresh:hover{background:rgba(255,45,120,.25)}
</style>
</head>
<body>
<h1>♡ LoveBlast — Painel Admin</h1>
<button class="refresh" onclick="location.reload()">↻ Atualizar</button>

<div class="stats">
  <div class="stat"><div class="val">${total}</div><div class="lbl">Total criadas</div></div>
  <div class="stat"><div class="val">${pagos}</div><div class="lbl">Pagas ✓</div></div>
  <div class="stat"><div class="val" style="color:#ff8a00">${nao_pagos}</div><div class="lbl">Não pagas</div></div>
  <div class="stat"><div class="val" style="color:#00c864">R$&nbsp;${receita}</div><div class="lbl">Receita estimada</div></div>
  <div class="stat"><div class="val" style="color:#7b9fff">${visitasHoje}</div><div class="lbl">Visitas hoje</div></div>
  <div class="stat"><div class="val" style="color:#7b9fff">${visitasTotal}</div><div class="lbl">Total visitas</div></div>
  <div class="stat"><div class="val" style="color:#ffd700">${convRate}%</div><div class="lbl">Taxa de conversão</div></div>
</div>

<div class="section">
  <h2>POR CATEGORIA</h2>
  ${catHtml || '<p style="color:rgba(255,255,255,.3);font-size:13px">Sem dados ainda</p>'}
</div>

<div class="section">
  <h2>TODAS AS RETROSPECTIVAS</h2>
  ${retros.length ? `
  <table>
    <thead><tr>
      <th>Data</th><th>Casal / Pessoa</th><th>Email</th>
      <th>Categoria</th><th>Mensagens</th><th>Status</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<p style="color:rgba(255,255,255,.3);font-size:13px;padding:10px 0">Nenhuma retrospectiva criada ainda.</p>'}
</div>
</body>
</html>`;
}

module.exports = function adminRouter(app) {
  app.get('/admin', (req, res) => {
    // Protect with TOKEN_SECRET
    const token = req.query.token || req.headers['x-admin-token'];
    const secret = process.env.TOKEN_SECRET || 'loveblast_super_secreto_123456789';
    if (token !== secret) {
      return res.status(401).send(`
        <html><body style="background:#0a0a0f;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px">
          <div style="font-size:40px">🔒</div>
          <div style="font-size:18px;font-weight:700">Acesso restrito</div>
          <form method="GET">
            <input name="token" type="password" placeholder="Token de acesso" style="padding:10px 14px;border-radius:8px;border:1px solid #ff2d78;background:#1a0414;color:#fff;font-size:15px;outline:none">
            <button type="submit" style="margin-left:8px;padding:10px 18px;background:#ff2d78;border:none;border-radius:8px;color:#fff;font-weight:900;cursor:pointer">Entrar</button>
          </form>
        </body></html>`);
    }
    const retros = getAllRetros();
    res.send(adminHTML(retros));
  });

  // API for quick stats
  app.get('/admin/stats', (req, res) => {
    const token = req.query.token || req.headers['x-admin-token'];
    const secret = process.env.TOKEN_SECRET || 'loveblast_super_secreto_123456789';
    if (token !== secret) return res.status(401).json({ erro: 'Unauthorized' });
    const retros = getAllRetros();
    res.json({
      total: retros.length,
      pagos: retros.filter(r=>r.pago).length,
      hoje: retros.filter(r=>{
        const d = new Date(r.criadoEm);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length,
      receita: (retros.filter(r=>r.pago).length * (Number(process.env.PRICE_CENTS||999)/100)).toFixed(2)
    });
  });
};
