(() => {
  'use strict';

  const STORAGE_KEYS = ['loveblastData', 'loveblast_dados_retro'];
  const DB_NAME = 'loveblast-media';
  const DB_STORE = 'retrospectives';
  const MAX_PHOTOS = 8;
  const MAX_PHOTO_SIDE = 1400;
  const MAX_MUSIC_BYTES = 12 * 1024 * 1024;

  const THEMES = {
    casal: {
      label: 'CASAL', accent: '#ff2d78', accent2: '#ff6b1a', symbol: '♡',
      card: 'Celebre seu amor',
      modal: 'Celebre o amor de vocês com fotos, música, conversa do WhatsApp e insights emocionais.',
      headline: 'A história de vocês como nunca antes.',
      intro: 'Algumas histórias não cabem em palavras.',
      start: 'E desde então, cada detalhe faz sentido.',
      timeline: [['♡','2023','Vocês se encontraram'],['💬','2023','Primeiras conversas'],['✈','2024','Momentos que viraram memória'],['🔥','2025','E ainda parece o começo']],
      phrases: ['O carinho de vocês aparece mais nos detalhes do que nas declarações.', 'Mesmo quando o assunto era simples, vocês encontravam um jeito de permanecer juntos.', 'A saudade foi uma das emoções mais presentes da história de vocês.'],
      final: 'Algumas histórias merecem ser eternizadas.',
      message: 'Cada mensagem, cada risada, cada momento virou parte da nossa história.',
      music: 'Nossa música'
    },
    mae: {
      label: 'MÃE', accent: '#ff5f9f', accent2: '#ffb15f', symbol: '✦',
      card: 'Homenageie quem sempre esteve lá',
      modal: 'Crie uma homenagem emocionante para quem sempre cuidou, protegeu e esteve presente.',
      headline: 'Uma homenagem para quem sempre foi lar.',
      intro: 'Amor de mãe não cabe em palavras.',
      start: 'Tudo começou com cuidado, colo e presença.',
      timeline: [['✦','Sempre','Ela esteve presente'],['♡','Cuidado','Cada gesto virou memória'],['⌂','Lar','O abraço que acalma tudo'],['✨','Hoje','Uma homenagem para eternizar']],
      phrases: ['Algumas pessoas não apenas cuidam. Elas viram abrigo.', 'O amor dela aparece nos detalhes que quase ninguém vê.', 'Mãe é a primeira forma de amor que a vida ensina.'],
      final: 'Alguns amores merecem ser homenageados para sempre.',
      message: 'Obrigado por transformar cuidado em amor todos os dias.',
      music: 'Música dela'
    },
    pai: {
      label: 'PAI', accent: '#ff477d', accent2: '#ff8a2a', symbol: '◇',
      card: 'Celebre seu herói',
      modal: 'Monte uma retrospectiva para celebrar histórias, conselhos, força e presença.',
      headline: 'Uma história feita de exemplo e presença.',
      intro: 'Alguns heróis não usam capa.',
      start: 'Tudo começou com exemplo, proteção e presença.',
      timeline: [['◇','Proteção','Sempre esteve por perto'],['✦','Exemplo','Ensinou mais por atitudes'],['💬','Conselhos','Palavras que ficaram'],['🔥','Hoje','Uma homenagem para guardar']],
      phrases: ['Pai é presença que guia, mesmo em silêncio.', 'Alguns ensinamentos ficam para sempre.', 'O amor também mora no cuidado silencioso.'],
      final: 'Heróis de verdade merecem ser lembrados.',
      message: 'Sua presença virou parte forte da minha história.',
      music: 'Trilha do herói'
    },
    familia: {
      label: 'FAMÍLIA', accent: '#ff3b8d', accent2: '#ff9f1a', symbol: '✧',
      card: 'Histórias que unem gerações',
      modal: 'Crie uma retrospectiva familiar com momentos, gerações, fotos e mensagens especiais.',
      headline: 'A história de uma família inteira.',
      intro: 'Tudo que importa começa em casa.',
      start: 'Cada encontro virou parte de uma memória maior.',
      timeline: [['⌂','Raízes','Onde tudo começou'],['📸','Memórias','Momentos que uniram todos'],['✧','Presença','Cada pessoa faz parte'],['✨','Hoje','Uma história de gerações']],
      phrases: ['Família é onde a vida ganha significado.', 'Cada foto guarda um pedaço de todos vocês.', 'Algumas memórias atravessam gerações.'],
      final: 'Histórias de família merecem durar para sempre.',
      message: 'Nossa família é feita de histórias que seguem vivas.',
      music: 'Trilha da família'
    },
    amigos: {
      label: 'AMIGOS', accent: '#ff2d78', accent2: '#ff7f3f', symbol: '✶',
      card: 'Parceiros de todas as horas',
      modal: 'Transforme amizade, risadas e conversas em um recap estilo LoveBlast.',
      headline: 'A amizade de vocês como nunca antes.',
      intro: 'Algumas amizades viram família.',
      start: 'Tudo começou com risadas e virou parceria.',
      timeline: [['✶','Risadas','Momentos impossíveis de esquecer'],['💬','Conversas','Assuntos que só vocês entendem'],['♡','Parceria','Um pelo outro sempre'],['🔥','Hoje','Mais histórias para viver']],
      phrases: ['Vocês transformaram dias comuns em histórias boas.', 'A amizade aparece nas piadas, nos conselhos e na presença.', 'Algumas pessoas chegam e ficam para sempre.'],
      final: 'Amizades verdadeiras merecem ser eternizadas.',
      message: 'Obrigado por deixar a vida mais leve e absurda do jeito certo.',
      music: 'Som da amizade'
    },
    formatura: {
      label: 'FORMATURA', accent: '#ff3b7d', accent2: '#ffb000', symbol: '◇',
      card: 'Seu esforço, sua conquista',
      modal: 'Crie uma retrospectiva de conquista, esforço, superação e orgulho.',
      headline: 'Uma conquista que merece ser lembrada.',
      intro: 'Todo esforço conta uma história.',
      start: 'Tudo começou com um sonho e muita coragem.',
      timeline: [['📚','Começo','O primeiro passo foi dado'],['☕','Rotina','Dias difíceis também fizeram parte'],['◇','Conquista','O sonho virou realidade'],['✨','Hoje','Uma nova fase começa']],
      phrases: ['A conquista de hoje carrega todo esforço de ontem.', 'Cada etapa difícil também fez parte da vitória.', 'O diploma é só o começo de uma história maior.'],
      final: 'Conquistas grandes merecem ser eternizadas.',
      message: 'Essa vitória carrega esforço, coragem e orgulho.',
      music: 'Trilha da conquista'
    },
    bebe: {
      label: 'BEBÊ', accent: '#ff6fae', accent2: '#ff9d4d', symbol: '☻',
      card: 'Cada fase, cada descoberta',
      modal: 'Registre as primeiras fases, descobertas, sorrisos e momentos mais fofos.',
      headline: 'Pequenos momentos, memórias gigantes.',
      intro: 'Cada descoberta virou amor.',
      start: 'Tudo começou com amor, cuidado e encanto.',
      timeline: [['☻','Começo','Tudo era novidade'],['♡','Sorrisos','Cada risada mudou o dia'],['✦','Fases','Cada descoberta uma emoção'],['✨','Hoje','Um amor que só cresce']],
      phrases: ['Alguns pequenos momentos viram memórias enormes.', 'Cada sorriso conta uma nova descoberta.', 'O amor cresceu junto com cada fase.'],
      final: 'Infâncias merecem ser guardadas com carinho.',
      message: 'Cada fase passou rápido, mas ficou para sempre no coração.',
      music: 'Canção do bebê'
    },
    pet: {
      label: 'PET', accent: '#ff4f8e', accent2: '#ff8a1a', symbol: '♨',
      card: 'Amor que tem quatro patas',
      modal: 'Crie uma homenagem fofa para seu melhor amigo de quatro patas.',
      headline: 'Uma história de amor em quatro patas.',
      intro: 'Alguns amores deixam pegadas.',
      start: 'Tudo começou com bagunça, carinho e companhia.',
      timeline: [['♨','Chegada','A casa nunca mais foi igual'],['✶','Brincadeiras','Cada travessura virou memória'],['♡','Companhia','Sempre perto, sempre amor'],['✨','Hoje','Um melhor amigo para sempre']],
      phrases: ['Alguns companheiros chegam e viram parte da família.', 'O amor mais sincero às vezes vem com patas.', 'Cada olhar parecia dizer: estou aqui.'],
      final: 'Amores de quatro patas também merecem eternidade.',
      message: 'Seu carinho deixou marcas felizes em todos os dias.',
      music: 'Trilha do pet'
    }
  };

  let selectedTheme = 'casal';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function theme() { return THEMES[selectedTheme] || THEMES.casal; }
  function setText(selector, value, root = document) { const el = $(selector, root); if (el) el.textContent = value; }
  function cleanName(fileName) { return (fileName || '').replace(/\.[^/.]+$/, '').trim(); }
  function showToast(text) {
    $('.download-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'download-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function lightData(data) {
    return { ...data, photos: [], musicSrc: data.musicSrc ? '__indexeddb__' : '' };
  }

  function saveData(data) {
    STORAGE_KEYS.forEach(key => {
      try { localStorage.setItem(key, JSON.stringify(data)); }
      catch {
        try { localStorage.setItem(key, JSON.stringify(lightData(data))); } catch {}
      }
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(data) {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(data, 'latest');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function idbGet() {
    const db = await openDb();
    if (!db) return null;
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get('latest');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  }

  function getData() {
    for (const key of STORAGE_KEYS) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data && typeof data === 'object') return normalizeData(data);
      } catch {}
    }
    return normalizeData({});
  }

  function normalizeData(data) {
    return {
      nome1: data.nome1 || 'Robson',
      nome2: data.nome2 || 'Paloma',
      email: data.email || '',
      mensagem: data.mensagem || theme().message,
      categoria: data.categoria || selectedTheme || 'casal',
      photos: data.photos || data.fotos || [],
      musicSrc: data.musicSrc || data.musicaSrc || '',
      musicName: data.musicName || data.musicaNome || theme().music,
      insights: data.insights || defaultInsights()
    };
  }

  function defaultInsights() {
    return {
      totalMessages: 18432,
      topWord: selectedTheme === 'formatura' ? 'conquista' : selectedTheme === 'amigos' ? 'kkkk' : 'amor',
      loveCount: 82,
      saudadeCount: 103,
      favoriteTime: '23:47',
      topEmoji: theme().symbol,
      emotionalLevel: 'Alto',
      generatedPhrases: theme().phrases
    };
  }

  function formatNumber(n) { return Number(n || 0).toLocaleString('pt-BR'); }

  function analyzeWhatsApp(text) {
    const lower = (text || '').toLowerCase();
    const lines = lower.split(/\r?\n/).filter(line => line.trim());
    const loveCount = (lower.match(/\b(eu te amo|te amo|amo voce|amo você)\b/g) || []).length;
    const saudadeCount = (lower.match(/\b(saudade|saudades|sdds)\b/g) || []).length;
    const laughCount = (lower.match(/k{3,}|haha|rsrs/g) || []).length;
    const hours = {};
    (text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g) || []).forEach(value => {
      const hour = value.split(':')[0].padStart(2, '0') + ':00';
      hours[hour] = (hours[hour] || 0) + 1;
    });
    const ignore = new Set('para com uma umas uns que nao não voce você meu minha seu sua dela dele esse essa aqui hoje agora bom boa amor sim tem muito mais como quando'.split(' '));
    const words = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\b[a-z0-9]{4,}\b/g) || [];
    const counts = {};
    words.forEach(word => { if (!ignore.has(word)) counts[word] = (counts[word] || 0) + 1; });
    const topWord = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || defaultInsights().topWord;
    const favoriteTime = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0] || '23:47';
    return {
      totalMessages: lines.length || 18432,
      topWord,
      loveCount: loveCount || 82,
      saudadeCount: saudadeCount || 103,
      favoriteTime,
      topEmoji: laughCount > loveCount ? '😂' : theme().symbol,
      emotionalLevel: loveCount + saudadeCount + laughCount > 35 ? 'Muito alto' : 'Alto',
      generatedPhrases: [
        `A palavra que mais marcou essa história foi: ${topWord}.`,
        saudadeCount ? `A saudade apareceu ${saudadeCount} vezes e virou presença mesmo à distância.` : theme().phrases[1],
        laughCount ? `O humor também fez parte: foram muitas risadas no caminho.` : theme().phrases[2]
      ]
    };
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error(`${file.name} não parece ser uma imagem válida.`));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', .84));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`${file.name} não pôde ser carregada.`));
      };
      img.src = url;
    });
  }

  async function collectData() {
    const old = getData();
    selectedTheme = $('#categoriaInput')?.value || selectedTheme || old.categoria || 'casal';
    const t = theme();
    const photoFiles = $$('#photos')[0] ? Array.from($('#photos').files).slice(0, MAX_PHOTOS) : [];
    const photos = [];
    for (const file of photoFiles) photos.push(await resizeImage(file));

    const musicFile = $('#music')?.files?.[0];
    let musicSrc = old.musicSrc || '';
    let musicName = old.musicName || t.music;
    if (musicFile) {
      if (!musicFile.type.startsWith('audio/') && !/\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(musicFile.name)) {
        throw new Error('Esse arquivo de música não é compatível. Envie MP3, M4A, AAC, OGG, WAV ou WEBM.');
      }
      if (musicFile.size > MAX_MUSIC_BYTES) {
        throw new Error('A música é grande demais para a prévia local. Envie um MP3 de até 12 MB.');
      }
      musicSrc = await fileToDataURL(musicFile);
      musicName = cleanName(musicFile.name) || t.music;
    }

    const whatsFile = $('#whatsappFile')?.files?.[0];
    const insights = whatsFile ? analyzeWhatsApp(await whatsFile.text()) : old.insights || defaultInsights();
    const data = normalizeData({
      nome1: $('#nome1')?.value?.trim() || old.nome1,
      nome2: $('#nome2')?.value?.trim() || old.nome2,
      email: $('#email')?.value?.trim() || old.email,
      mensagem: $('#mensagem')?.value?.trim() || old.mensagem || t.message,
      categoria: selectedTheme,
      photos: photos.length ? photos : old.photos,
      musicSrc,
      musicName,
      insights
    });
    saveData(data);
    await idbSet(data).catch(() => showToast('Prévia salva. Se o áudio for muito grande, use um MP3 menor para manter na tela final.'));
    return data;
  }

  function applyTheme(cat) {
    selectedTheme = THEMES[cat] ? cat : 'casal';
    const t = theme();
    document.documentElement.style.setProperty('--theme-accent', t.accent);
    document.documentElement.style.setProperty('--theme-accent-2', t.accent2);
    $$('.card').forEach(card => {
      const active = card.dataset.category === selectedTheme;
      card.classList.toggle('active', active);
      card.classList.toggle('selected', active);
      card.setAttribute('aria-pressed', String(active));
      const icon = $('.icon', card);
      if (icon) icon.textContent = THEMES[card.dataset.category]?.symbol || '♡';
      const desc = $('p', card);
      if (desc && THEMES[card.dataset.category]) desc.textContent = THEMES[card.dataset.category].card;
    });
    if ($('#categoriaInput')) $('#categoriaInput').value = selectedTheme;
    setText('#categoriaDescricao', t.modal);
    setText('#temaExemplo', t.label);
    const firstPhone = $('.phones .phone:first-child h2');
    if (firstPhone) firstPhone.innerHTML = `${t.headline.split(' ').slice(0, -3).join(' ')}<br><span class="neon">${t.headline.split(' ').slice(-3).join(' ')}</span>`;
    const musicPhone = $('.phones .phone:nth-child(6) h2');
    if (musicPhone) musicPhone.innerHTML = `${t.music.split(' ')[0] || 'Nossa'} <span class="neon">${t.music.split(' ').slice(1).join(' ') || 'música'}</span>`;
    $$('.phrase').slice(0, 4).forEach((el, i) => { el.textContent = (t.phrases[i] || t.final) + (i === 0 ? ' ♡' : ''); });
  }

  function hydrateFinal(data, options = {}) {
    data = normalizeData(data || getData());
    selectedTheme = data.categoria || selectedTheme;
    const t = theme();
    setText('#finalNome1', data.nome1);
    setText('#finalNome2', data.nome2);
    setText('#cartaNome', data.nome2);
    setText('#mensagemFinal', data.mensagem || t.message);
    setText('#fraseAbertura', t.intro);
    setText('#textoCategoria', t.start);
    setText('#fraseFinal', t.final);
    const timelineNodes = $$('.timeline-final .time-item');
    t.timeline.forEach((item, i) => {
      if (!timelineNodes[i]) return;
      timelineNodes[i].innerHTML = `<span class="emoji">${item[0]}</span><strong>${item[1]}</strong><p>${item[2]}</p>`;
    });
    const insights = data.insights || defaultInsights();
    setText('#totalMensagens', formatNumber(insights.totalMessages));
    setText('#palavraMaisUsada', insights.topWord || defaultInsights().topWord);
    setText('#saudadeCount', `saudade ${insights.saudadeCount || 103} vezes`);
    $$('.frases-final .quote').forEach((el, i) => { el.textContent = `“${(insights.generatedPhrases || t.phrases)[i] || t.phrases[i] || t.final}”`; });
    const fallback = [
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1000',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1000',
      'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=1000'
    ];
    const photos = Array.isArray(data.photos) && data.photos.length ? data.photos : fallback;
    const gallery = $('#galeriaFinal');
    if (gallery) {
      gallery.innerHTML = '';
      photos.slice(0, 3).forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Foto da retrospectiva';
        gallery.appendChild(img);
      });
    }
    if ($('#fotoPrincipal')) $('#fotoPrincipal').src = photos[0];
    setText('#nomeMusicaFinal', data.musicName || t.music);
    if ($('#audioFinal')) {
      $('#audioFinal').src = data.musicSrc || '';
      $('#audioFinal').style.display = data.musicSrc ? 'block' : 'none';
    }
    const finalExperience = $('.final-experience');
    finalExperience?.classList.toggle('is-preview', options.preview === true);
  }

  function renderPreview(data) {
    setText('#previewText', `${data.nome1} & ${data.nome2} — ${theme().label}. ${data.mensagem || theme().message}`);
    const row = $('#previewImages');
    if (row) {
      row.innerHTML = '';
      (data.photos || []).slice(0, 4).forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Prévia da foto enviada';
        row.appendChild(img);
      });
      if (!row.children.length) row.innerHTML = '<div class="upload-hint">Envie fotos para ver a prévia aqui.</div>';
    }
    const audio = $('#previewAudio');
    if (audio) {
      audio.src = data.musicSrc || '';
      audio.style.display = data.musicSrc ? 'block' : 'none';
    }
    $('.preview-audio-name')?.remove();
    if (data.musicSrc && audio) {
      const name = document.createElement('div');
      name.className = 'preview-audio-name';
      name.textContent = `Música anexada: ${data.musicName}`;
      audio.insertAdjacentElement('afterend', name);
    }
    $('#previewResult')?.classList.add('active');
    hydrateFinal(data, { preview: true });
    $('#arteFinal')?.classList.remove('hidden');
  }

  function escapeXml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  }

  async function baixarArte() {
    const data = getData();
    selectedTheme = data.categoria || selectedTheme;
    const t = theme();
    const photo = (data.photos || [])[0] || '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
      <defs>
        <linearGradient id="g" x1="0" x2="1"><stop stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent2}"/></linearGradient>
        <radialGradient id="r" cx=".25" cy=".15" r=".8"><stop stop-color="${t.accent}" stop-opacity=".34"/><stop offset=".45" stop-color="#13040b"/><stop offset="1" stop-color="#030306"/></radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1200" height="1600" fill="url(#r)"/>
      <rect x="55" y="55" width="1090" height="1490" rx="42" fill="rgba(255,255,255,.035)" stroke="${t.accent}" stroke-opacity=".55" stroke-width="2"/>
      <text x="95" y="130" fill="url(#g)" font-family="Arial" font-size="38" font-weight="900">${t.symbol} LoveBlast</text>
      <text x="95" y="255" fill="#fff" font-family="Georgia,serif" font-size="88">${escapeXml(data.nome1)}</text>
      <text x="95" y="345" fill="${t.accent}" filter="url(#glow)" font-family="Arial" font-size="84" font-weight="900">&amp;</text>
      <text x="210" y="345" fill="#fff" font-family="Georgia,serif" font-size="88">${escapeXml(data.nome2)}</text>
      <text x="95" y="430" fill="#f5dce7" font-family="Arial" font-size="30">${escapeXml(t.intro)}</text>
      ${photo ? `<image href="${photo}" x="730" y="170" width="310" height="310" preserveAspectRatio="xMidYMid slice"/><rect x="710" y="150" width="350" height="350" fill="none" stroke="#fff" stroke-width="18" transform="rotate(-5 885 325)"/>` : ''}
      <rect x="95" y="560" width="1010" height="240" rx="28" fill="rgba(255,45,120,.08)" stroke="${t.accent}" stroke-opacity=".45"/>
      <text x="140" y="635" fill="#fff" font-family="Arial" font-size="34" font-weight="900">Retrospectiva ${escapeXml(t.label)}</text>
      <text x="140" y="705" fill="${t.accent}" filter="url(#glow)" font-family="Arial" font-size="70" font-weight="900">${formatNumber(data.insights.totalMessages)}</text>
      <text x="140" y="755" fill="#fff" font-family="Arial" font-size="30">mensagens e memórias transformadas em história</text>
      <text x="95" y="910" fill="#fff" font-family="Arial" font-size="42" font-weight="900">"${escapeXml(data.insights.topWord || 'amor')}" marcou essa história.</text>
      <foreignObject x="95" y="980" width="1010" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff;font-family:Arial;font-size:34px;line-height:1.35">${escapeXml(data.mensagem || t.message)}</div></foreignObject>
      <text x="95" y="1340" fill="${t.accent}" filter="url(#glow)" font-family="Arial" font-size="58" font-weight="900">${escapeXml(t.final)}</text>
      <text x="95" y="1450" fill="#fff" font-family="Arial" font-size="26">Música: ${escapeXml(data.musicName || t.music)}</text>
      <text x="95" y="1505" fill="#ffc4d9" font-family="Arial" font-size="24">Criado com LoveBlast</text>
    </svg>`;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1600;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    link.download = `LoveBlast-${data.nome1}-${data.nome2}.png`.replace(/[^\w.-]+/g, '-');
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG premium gerado com sucesso.');
  }

  function compartilharArte() {
    if (navigator.share) {
      navigator.share({ title: 'Minha retrospectiva LoveBlast', text: 'Olha essa retrospectiva que eu criei no LoveBlast.', url: location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(() => showToast('Link copiado.'));
    }
  }

  function removeOldListeners(selector) {
    $$(selector).forEach(el => {
      const clone = el.cloneNode(true);
      el.replaceWith(clone);
    });
  }

  function bind() {
    window.baixarArte = baixarArte;
    window.compartilharArte = compartilharArte;
    removeOldListeners('.card');
    removeOldListeners('#previewBtn');
    removeOldListeners('#payBtn');
    removeOldListeners('.js-open-modal');
    removeOldListeners('#closeModal');

    $$('.card').forEach(card => {
      card.tabIndex = 0;
      card.addEventListener('click', () => {
        applyTheme(card.dataset.category || 'casal');
        $('#createModal')?.classList.add('active');
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
      });
    });
    $$('.js-open-modal').forEach(btn => btn.addEventListener('click', () => $('#createModal')?.classList.add('active')));
    $('#closeModal')?.addEventListener('click', () => $('#createModal')?.classList.remove('active'));
    $('#createModal')?.addEventListener('click', event => { if (event.target.id === 'createModal') $('#createModal')?.classList.remove('active'); });
    $('#previewBtn')?.addEventListener('click', async () => {
      try { renderPreview(await collectData()); }
      catch (error) { showToast(error.message || 'Não foi possível gerar a prévia.'); }
    });
    $('#payBtn')?.addEventListener('click', async () => {
      const btn = $('#payBtn');
      try {
        const data = await collectData();
        if (!data.nome1 || !data.nome2 || !data.email) throw new Error('Preencha os nomes e o e-mail antes de finalizar.');
        btn.disabled = true; btn.textContent = 'CRIANDO SESSÃO...';
        const formData = new FormData();
        ['nome1','nome2','email','mensagem','categoria'].forEach(key => formData.append(key, key === 'categoria' ? selectedTheme : data[key] || ''));
        Array.from($('#photos')?.files || []).forEach(file => formData.append('photos', file));
        if ($('#music')?.files?.[0]) formData.append('music', $('#music').files[0]);
        if ($('#whatsappFile')?.files?.[0]) formData.append('whatsappFile', $('#whatsappFile').files[0]);
        const response = await fetch('/criar-sessao', { method: 'POST', body: formData });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.erro || 'Erro ao iniciar pagamento.');
        if (json.checkoutUrl) location.href = json.checkoutUrl;
      } catch (error) {
        showToast(error.message || 'Erro ao iniciar pagamento.');
        btn.disabled = false; btn.textContent = 'Finalizar pagamento';
      }
    });
    $('#photos')?.insertAdjacentHTML('afterend', '<div class="file-feedback" id="photoFeedback">Envie até 8 fotos. Imagens grandes serão otimizadas automaticamente.</div>');
    $('#music')?.insertAdjacentHTML('afterend', '<div class="file-feedback" id="musicFeedback">MP3, M4A, AAC, OGG, WAV ou WEBM até 12 MB.</div>');
    $('#photos')?.addEventListener('change', () => setText('#photoFeedback', `${Math.min($('#photos').files.length, MAX_PHOTOS)} foto(s) selecionada(s).`));
    $('#music')?.addEventListener('change', () => {
      const file = $('#music').files[0];
      if (!file) return setText('#musicFeedback', 'MP3, M4A, AAC, OGG, WAV ou WEBM até 12 MB.');
      const ok = (file.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(file.name)) && file.size <= MAX_MUSIC_BYTES;
      const fb = $('#musicFeedback');
      if (fb) fb.className = `file-feedback ${ok ? 'ok' : 'error'}`;
      setText('#musicFeedback', ok ? `Música anexada: ${file.name}` : 'Arquivo incompatível. Envie MP3, M4A, AAC, OGG, WAV ou WEBM até 12 MB.');
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const storedData = normalizeData((await idbGet().catch(() => null)) || getData());
    saveData(storedData);
    selectedTheme = storedData.categoria || 'casal';
    bind();
    applyTheme(selectedTheme);
    hydrateFinal(storedData, { preview: new URLSearchParams(location.search).get('pago') !== '1' });
  });
})();
