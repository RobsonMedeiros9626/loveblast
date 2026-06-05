require('dotenv').config();
const express=require('express'),cors=require('cors'),path=require('path'),fs=require('fs'),multer=require('multer'),Stripe=require('stripe');
const app=express(),PORT=process.env.PORT||8080,DATA_DIR=path.join(__dirname,'../data'),UPLOAD_DIR=path.join(__dirname,'../public/uploads');
const stripe=process.env.STRIPE_SECRET_KEY?Stripe(process.env.STRIPE_SECRET_KEY):null;
const upload=multer({storage:multer.diskStorage({destination:(req,file,cb)=>{fs.mkdirSync(UPLOAD_DIR,{recursive:true});cb(null,UPLOAD_DIR);},filename:(req,file,cb)=>{const ext=path.extname(file.originalname||'').toLowerCase()||'.bin';cb(null,`tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);}}),limits:{fileSize:20*1024*1024,fields:20}});
fs.mkdirSync(DATA_DIR,{recursive:true});fs.mkdirSync(UPLOAD_DIR,{recursive:true});
app.set('trust proxy',1);app.use(cors());app.use(express.json({limit:'5mb'}));app.use(express.urlencoded({extended:true,limit:'5mb'}));

// Analytics
const STATS=path.join(DATA_DIR,'_analytics.json');
function rStats(){try{return JSON.parse(fs.readFileSync(STATS,'utf8'));}catch{return{events:[],counts:{},daily:{}};}}
function wStats(s){try{fs.writeFileSync(STATS,JSON.stringify(s,null,2));}catch{}}
function track(event,meta={}){const s=rStats(),today=new Date().toISOString().split('T')[0];if(!s.events)s.events=[];s.events.push({event,ts:Date.now(),date:today,...meta});if(s.events.length>10000)s.events=s.events.slice(-10000);if(!s.counts)s.counts={};s.counts[event]=(s.counts[event]||0)+1;if(!s.daily)s.daily={};if(!s.daily[today])s.daily[today]={};s.daily[today][event]=(s.daily[today][event]||0)+1;wStats(s);}
app.post('/api/track',(req,res)=>{try{const{event,...meta}=req.body||{};if(!event)return res.json({ok:false});const ua=req.headers['user-agent']||'';const device=/Mobile|Android|iPhone|iPad/i.test(ua)?'mobile':'desktop';const browser=/Chrome/i.test(ua)?'Chrome':/Firefox/i.test(ua)?'Firefox':/Safari/i.test(ua)?'Safari':'Other';track(event,{...meta,device,browser,ip:req.ip});res.json({ok:true});}catch{res.json({ok:false});}});

// Admin
require('./admin')(app);

// OG Image
app.get('/og-image.png',(req,res)=>{const svg=`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#030306"/><stop offset="50%" style="stop-color:#0e0118"/><stop offset="100%" style="stop-color:#1a0414"/></linearGradient><radialGradient id="g1" cx="30%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff2d78;stop-opacity:.4"/><stop offset="100%" style="stop-color:#ff2d78;stop-opacity:0"/></radialGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#g1)"/><text x="600" y="200" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900" fill="#ff2d78">♡ LOVEBLAST</text><text x="600" y="310" text-anchor="middle" font-family="Arial" font-size="110" fill="#ff2d78">♡</text><text x="600" y="410" text-anchor="middle" font-family="Arial" font-size="52" font-weight="900" fill="white">Uma retrospectiva</text><text x="600" y="470" text-anchor="middle" font-family="Arial" font-size="52" font-weight="900" fill="#ff2d78">especial foi criada</text><text x="600" y="530" text-anchor="middle" font-family="Arial" font-size="22" fill="rgba(255,255,255,.6)">Clica para ver ❤️</text></svg>`;res.setHeader('Content-Type','image/svg+xml');res.setHeader('Cache-Control','public,max-age=86400');res.send(svg);});

// Dynamic meta for view.html
app.get('/view.html',(req,res,next)=>{const id=req.query.id;if(!id)return next();try{const data=readRetro(id);if(!data)return next();const n1=(data.nome1||'Você').replace(/[<>"]/g,''),n2=(data.nome2||'Pessoa').replace(/[<>"]/g,'');let html=fs.readFileSync(path.join(__dirname,'../public/view.html'),'utf8');html=html.replace(/♡ Minha retrospectiva no LoveBlast/g,`♡ ${n1} & ${n2} — LoveBlast`).replace(/Criei uma retrospectiva especial\. Clica para ver a nossa história ❤️/g,`A retrospectiva de ${n1} & ${n2} está pronta!`).replace(/Clica para ver a nossa retrospectiva ❤️ — criado no LoveBlast/g,`A retrospectiva de ${n1} & ${n2}. LoveBlast ❤️`);res.send(html);}catch{next();}});

app.use(express.static(path.join(__dirname,'../public')));

// Helpers
function createId(){return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
function baseUrl(req){return(process.env.APP_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');}
function pubUrl(req,f){return`${baseUrl(req)}/uploads/${f}`;}
function readRetro(id){if(!/^[a-z0-9-]+$/i.test(id||''))return null;const fp=path.join(DATA_DIR,`${id}.json`);if(!fs.existsSync(fp))return null;try{return JSON.parse(fs.readFileSync(fp,'utf8'));}catch{return null;}}
function writeRetro(data){fs.writeFileSync(path.join(DATA_DIR,`${data.id}.json`),JSON.stringify(data,null,2));}
function markPaid(id){const data=readRetro(id);if(!data)return null;if(data.pago)return data;data.pago=true;data.pagoEm=new Date().toISOString();try{writeRetro(data);}catch{}track('purchase_approved',{retroId:id,nome1:data.nome1,nome2:data.nome2});return data;}

// Background file processor
async function processFiles(req,body,id){
  const files=req.files||{},photos=[];
  for(const[i,file]of(files.photos||[]).slice(0,10).entries()){
    const ok=(file.mimetype||'').startsWith('image/')||/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname||'');
    if(!ok){try{fs.unlinkSync(file.path);}catch{}continue;}
    const ext=path.extname(file.originalname||'').toLowerCase()||'.jpg';
    const dest=path.join(UPLOAD_DIR,`${id}-photo-${i}${ext}`);
    try{fs.renameSync(file.path,dest);photos.push(pubUrl(req,`${id}-photo-${i}${ext}`));}catch{}
  }
  let musicSrc='',musicLink=(body.musicLink||'').trim(),musicName=body.musicName||'Trilha sonora';
  if(musicLink){try{const u=new URL(musicLink);if(u.hostname.includes('youtube.com')||u.hostname.includes('youtu.be')){const v=u.searchParams.get('v');if(v)musicLink=`https://www.youtube.com/watch?v=${v}`;}else if(u.hostname.includes('spotify.com')){musicLink=`${u.origin}${u.pathname}`;}else if(u.hostname.includes('music.apple.com')||u.hostname.includes('itunes.apple.com')){musicLink='';// iTunes link — use musicPreview instead, no embed needed
}}catch{musicLink='';}}
  const mf=(files.music||[])[0];
  if(mf){const ok=(mf.mimetype||'').startsWith('audio/')||/\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(mf.originalname||'');if(ok){const ext=path.extname(mf.originalname||'').toLowerCase()||'.mp3';const dest=path.join(UPLOAD_DIR,`${id}-music${ext}`);try{fs.renameSync(mf.path,dest);musicSrc=pubUrl(req,`${id}-music${ext}`);}catch{}musicName=(mf.originalname||musicName).replace(/\.[^/.]+$/,'');}else{try{fs.unlinkSync(mf.path);}catch{}}}
  let insights=null;if(body.insights){try{insights=JSON.parse(body.insights);}catch{}}
  if(!insights){const wpp=(files.whatsappFile||[])[0];if(wpp){try{if((wpp.originalname||'').toLowerCase().endsWith('.txt')){const txt=fs.readFileSync(wpp.path,'utf8');const lines=txt.split(/\r?\n/).filter(Boolean);const love=(txt.match(/eu te amo|te amo|amo você|amo vc/gi)||[]).length;const sad=(txt.match(/saudade|sdds/gi)||[]).length;insights={totalMessages:lines.length||18432,loveCount:love||82,saudadeCount:sad||103,topWord:'amor',emotionalLevel:love+sad>40?'Muito alto':'Alto',favoriteTime:'23:47',topEmoji:'😂'};}try{fs.unlinkSync(wpp.path);}catch{};}catch{}}}
  const ex=readRetro(id);if(ex){ex.photos=photos;ex.musicSrc=musicSrc;ex.musicLink=musicLink;ex.musicName=musicName;ex.insights=insights||ex.insights;writeRetro(ex);}
}

// API routes
app.get('/api/retrospectiva/:id',(req,res)=>{const data=req.query.pago==='1'?markPaid(req.params.id):readRetro(req.params.id);if(!data)return res.status(404).json({erro:'Nao encontrada.'});res.json(data);});
app.get('/api/retrospectiva-por-sessao/:sid',async(req,res)=>{try{if(!stripe)return res.status(500).json({erro:'Stripe nao configurado.'});const s=await stripe.checkout.sessions.retrieve(req.params.sid);const id=s?.metadata?.retrospectiveId;if(!id)return res.status(404).json({erro:'Sessao sem retrospectiva.'});const data=req.query.pago==='1'?markPaid(id):readRetro(id);if(!data)return res.status(404).json({erro:'Nao encontrada.'});res.json(data);}catch(e){res.status(500).json({erro:'Erro ao carregar.'});}});

// Create session — FAST: save minimal → Stripe → return → process files bg
app.post('/criar-sessao',upload.fields([{name:'photos',maxCount:12},{name:'music',maxCount:1},{name:'whatsappFile',maxCount:1}]),async(req,res)=>{
  try{
    if(!stripe)return res.status(500).json({erro:'STRIPE_SECRET_KEY nao configurada.'});
    if(!process.env.APP_URL)return res.status(500).json({erro:'APP_URL nao configurada.'});
    const{nome1,nome2,email,mensagem='',categoria='casal'}=req.body||{};
    if(!nome1||!nome2||!email)return res.status(400).json({erro:'Preencha nome, pessoa e email.'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({erro:'Email invalido.'});
    const appUrl=(process.env.APP_URL||'').trim().replace(/\/+$/,'');
    const id=createId();
    writeRetro({id,nome1,nome2,email,mensagem:(mensagem||'').slice(0,500),categoria,dataInicio:req.body.dataInicio||'',musicLink:(req.body.musicLink||'').trim(),musicName:req.body.musicName||'Trilha sonora',musicArtwork:req.body.musicArtwork||'',musicPreview:req.body.musicPreview||'',musicTitle:req.body.musicTitle||'',musicArtist:req.body.musicArtist||'',insights:(()=>{try{return JSON.parse(req.body.insights||'null');}catch{return null;}})(),photos:[],musicSrc:'',pago:false,criadoEm:new Date().toISOString()});
    track('checkout_initiated',{id,nome1,nome2,categoria,email});
    const session=await stripe.checkout.sessions.create({mode:'payment',customer_email:email,payment_method_types:['card'],line_items:[{price_data:{currency:'brl',unit_amount:Number(process.env.PRICE_CENTS)||990,product_data:{name:'LoveBlast - Retrospectiva',description:`Retrospectiva ${categoria} para ${nome1} & ${nome2}`}},quantity:1}],success_url:`${appUrl}/view.html?id=${id}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${appUrl}/?cancelado=1`,metadata:{retrospectiveId:id,nome1,nome2,categoria,mensagem:mensagem.slice(0,450)}});
    res.json({checkoutUrl:session.url,sessionId:session.id,retrospectiveId:id});
    setImmediate(()=>processFiles(req,req.body||{},id).catch(e=>console.error('BG error:',e.message)));
  }catch(err){console.error('Stripe:',err.message);res.status(err.statusCode||500).json({erro:err.statusCode?err.message:'Erro ao criar sessao.'});}
});

// Webhook
app.post('/webhook',express.raw({type:'application/json'}),(req,res)=>{
  let event;try{event=process.env.STRIPE_WEBHOOK_SECRET?stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET):JSON.parse(req.body);}catch(e){return res.status(400).send(`Webhook Error: ${e.message}`);}
  if(event.type==='checkout.session.completed'){const id=event.data.object?.metadata?.retrospectiveId;if(id)markPaid(id);}
  if(event.type==='checkout.session.async_payment_failed'){const id=event.data.object?.metadata?.retrospectiveId;if(id)track('purchase_failed',{retroId:id});}
  res.json({received:true});
});

// Music search — iTunes Search API (free, no key)
app.get('/api/music/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ results: [] });
  try {
    const https = require('https');
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=8&country=BR`;
    https.get(url, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = (json.results || []).map(t => ({
            id:       t.trackId,
            title:    t.trackName,
            artist:   t.artistName,
            album:    t.collectionName,
            duration: Math.round(t.trackTimeMillis / 1000),
            artwork:  (t.artworkUrl100 || '').replace('100x100', '300x300'),
            preview:  t.previewUrl || '',
            itunesUrl:t.trackViewUrl || ''
          }));
          res.json({ results });
        } catch { res.json({ results: [] }); }
      });
    }).on('error', () => res.json({ results: [] }));
  } catch { res.json({ results: [] }); }
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
app.listen(PORT,()=>console.log(`LoveBlast porta ${PORT}`));
