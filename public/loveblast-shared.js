/* ============================================================
   LoveBlast — Shared Logic v3
   Handles: category themes, data save/load, hydration
   ============================================================ */
(() => {
  'use strict';

  /* ─── THEME DEFINITIONS ─── */
  const THEMES = {
    casal: {
      label: 'CASAL', icon: '♡',
      accent: '#ff2d78', accentRgb: '255,45,120',
      glow: 'rgba(255,45,120,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(30,5,15,.97))',
      intro: 'Algumas histórias não cabem em palavras.',
      start: 'E desde então, cada detalhe faz sentido.',
      mensagensLabel: 'mensagens',
      word: 'amor',
      wordEmoji: '❤️',
      saudadeLabel: i => `saudade ${i.saudadeCount||103} vezes`,
      music: 'Nossa música',
      finalPhrase: 'Algumas histórias merecem ser eternizadas.',
      timeline: [
        ['❤️','2023','Vocês se conheceram'],
        ['💬','2023','Primeiras conversas'],
        ['✈️','2024','Primeira viagem juntos'],
        ['🔥','2025','E ainda parece o começo']
      ],
      quotes: [
        'O carinho aparece mais nos detalhes do que nas grandes declarações.',
        'Mesmo quando o assunto era simples, vocês encontravam jeito de permanecer juntos.',
        'A saudade foi uma das emoções mais presentes nessa história.'
      ],
      modal: 'Celebre o amor de vocês com fotos, música e momentos inesquecíveis.',
      extraEmoji: ['💗','😂','💬','🔥','🤝']
    },
    mae: {
      label: 'MÃE', icon: '🌷',
      accent: '#ff6b9d', accentRgb: '255,107,157',
      glow: 'rgba(255,107,157,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(25,5,18,.97))',
      intro: 'O amor mais constante da vida.',
      start: 'Tudo começou com cuidado, colo e presença.',
      mensagensLabel: 'momentos especiais',
      word: 'cuidado',
      wordEmoji: '🌷',
      saudadeLabel: () => 'cuidado em cada detalhe',
      music: 'A música dela',
      finalPhrase: 'Alguns amores merecem ser homenageados para sempre.',
      timeline: [
        ['🌷','Sempre','Ela esteve presente'],
        ['🤍','Cuidado','Cada gesto virou memória'],
        ['🏠','Lar','O abraço que acalma tudo'],
        ['✨','Hoje','Uma homenagem para eternizar']
      ],
      quotes: [
        'Algumas pessoas não apenas cuidam. Elas viram abrigo.',
        'O amor dela aparece nos detalhes que quase ninguém vê.',
        'Mãe é a primeira forma de amor que a vida ensina.'
      ],
      modal: 'Crie uma homenagem emocionante para quem sempre cuidou e esteve presente.',
      extraEmoji: ['💗','🌷','💬','🔥','🤝']
    },
    pai: {
      label: 'PAI', icon: '🛡️',
      accent: '#ff8c42', accentRgb: '255,140,66',
      glow: 'rgba(255,140,66,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(25,10,5,.97))',
      intro: 'Alguns heróis não usam capa.',
      start: 'Tudo começou com exemplo, proteção e presença.',
      mensagensLabel: 'momentos especiais',
      word: 'exemplo',
      wordEmoji: '🛡️',
      saudadeLabel: () => 'presença que virou exemplo',
      music: 'A trilha dele',
      finalPhrase: 'Heróis de verdade merecem ser lembrados.',
      timeline: [
        ['🛡️','Proteção','Sempre esteve por perto'],
        ['🧭','Exemplo','Ensinou mais por atitudes'],
        ['💬','Conselhos','Palavras que ficaram'],
        ['🔥','Hoje','Uma homenagem para guardar']
      ],
      quotes: [
        'Pai é presença que guia, mesmo em silêncio.',
        'O exemplo dele virou parte de quem você é.',
        'Alguns gestos simples carregam amor gigante.'
      ],
      modal: 'Monte uma retrospectiva celebrando histórias, conselhos, força e presença.',
      extraEmoji: ['💗','😌','💬','🔥','🛡️']
    },
    familia: {
      label: 'FAMÍLIA', icon: '🏠',
      accent: '#ffd700', accentRgb: '255,215,0',
      glow: 'rgba(255,215,0,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(20,18,0,.97))',
      intro: 'Família é onde a história começa.',
      start: 'Cada encontro virou parte de uma memória maior.',
      mensagensLabel: 'memórias compartilhadas',
      word: 'família',
      wordEmoji: '🏠',
      saudadeLabel: () => 'memórias que unem todos',
      music: 'A trilha da família',
      finalPhrase: 'Histórias de família atravessam gerações.',
      timeline: [
        ['🏠','Raízes','Onde tudo começou'],
        ['📸','Memórias','Momentos que uniram todos'],
        ['🫶','Presença','Cada pessoa faz parte'],
        ['✨','Hoje','Uma história de gerações']
      ],
      quotes: [
        'Família é feita de risadas, apoio e lembranças que ficam.',
        'O lar não é só um lugar, é quem caminha com você.',
        'Cada foto guarda uma parte da história de vocês.'
      ],
      modal: 'Crie uma retrospectiva familiar com momentos, gerações e mensagens especiais.',
      extraEmoji: ['💗','😂','💬','🔥','🏠']
    },
    amigos: {
      label: 'AMIGOS', icon: '🤝',
      accent: '#00d4ff', accentRgb: '0,212,255',
      glow: 'rgba(0,212,255,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(0,15,22,.97))',
      intro: 'Algumas amizades viram família.',
      start: 'Tudo começou com risadas e virou parceria.',
      mensagensLabel: 'mensagens e memórias',
      word: 'risadas',
      wordEmoji: '😂',
      saudadeLabel: () => 'risadas que viraram história',
      music: 'A trilha dos amigos',
      finalPhrase: 'Amizades verdadeiras merecem ser eternizadas.',
      timeline: [
        ['😂','Risadas','Momentos impossíveis de esquecer'],
        ['💬','Conversas','Assuntos que só vocês entendem'],
        ['🤝','Parceria','Um pelo outro sempre'],
        ['🔥','Hoje','Mais histórias para viver']
      ],
      quotes: [
        'Vocês transformaram dias comuns em histórias boas.',
        'A amizade aparece nas piadas, nos conselhos e na presença.',
        'Algumas pessoas chegam e ficam para sempre.'
      ],
      modal: 'Transforme amizade, risadas e conversas em um recap estilo Spotify Wrapped.',
      extraEmoji: ['💙','😂','💬','🔥','🤝']
    },
    formatura: {
      label: 'FORMATURA', icon: '🎓',
      accent: '#9d4edd', accentRgb: '157,78,221',
      glow: 'rgba(157,78,221,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(15,5,22,.97))',
      intro: 'Todo esforço merece ser lembrado.',
      start: 'Tudo começou com um sonho e muita coragem.',
      mensagensLabel: 'dias de dedicação',
      word: 'conquista',
      wordEmoji: '🎓',
      saudadeLabel: () => 'esforço que virou conquista',
      music: 'A trilha da conquista',
      finalPhrase: 'Conquistas grandes merecem ser eternizadas.',
      timeline: [
        ['📚','Começo','O primeiro passo foi dado'],
        ['☕','Rotina','Dias difíceis também fizeram parte'],
        ['🎓','Conquista','O sonho virou realidade'],
        ['✨','Hoje','Uma nova fase começa']
      ],
      quotes: [
        'A conquista de hoje carrega todo esforço de ontem.',
        'Cada etapa difícil também fez parte da vitória.',
        'O diploma é só o começo de uma história maior.'
      ],
      modal: 'Crie uma retrospectiva de conquista, esforço, superação e orgulho.',
      extraEmoji: ['💜','😤','💬','🔥','🎓']
    },
    bebe: {
      label: 'BEBÊ', icon: '🍼',
      accent: '#ff9eb5', accentRgb: '255,158,181',
      glow: 'rgba(255,158,181,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(22,5,12,.97))',
      intro: 'Cada descoberta virou amor.',
      start: 'Tudo começou com amor, cuidado e encanto.',
      mensagensLabel: 'momentos registrados',
      word: 'sorrisos',
      wordEmoji: '👶',
      saudadeLabel: () => 'descobertas guardadas com carinho',
      music: 'Canção do bebê',
      finalPhrase: 'Infâncias merecem ser guardadas com carinho.',
      timeline: [
        ['🍼','Começo','Tudo era novidade'],
        ['👶','Sorrisos','Cada risada mudou o dia'],
        ['🐾','Passinhos','Cada fase uma emoção'],
        ['✨','Hoje','Um amor que só cresce']
      ],
      quotes: [
        'Cada sorriso pequeno virou uma memória gigante.',
        'O tempo passa rápido, mas esses momentos ficam.',
        'Essa história é feita de amor em sua forma mais pura.'
      ],
      modal: 'Registre as primeiras fases, descobertas, sorrisos e momentos mais fofos.',
      extraEmoji: ['💗','🍼','💬','✨','🤝']
    },
    pet: {
      label: 'PET', icon: '🐾',
      accent: '#ff9f43', accentRgb: '255,159,67',
      glow: 'rgba(255,159,67,.7)',
      cardBg: 'linear-gradient(160deg,rgba(7,7,13,.97),rgba(22,12,0,.97))',
      intro: 'Amor também tem quatro patas.',
      start: 'Tudo começou com bagunça, carinho e companhia.',
      mensagensLabel: 'memórias com o pet',
      word: 'companhia',
      wordEmoji: '🐾',
      saudadeLabel: () => 'companhia em todos os momentos',
      music: 'A trilha do pet',
      finalPhrase: 'Alguns companheiros deixam marcas eternas.',
      timeline: [
        ['🐾','Chegada','A casa nunca mais foi igual'],
        ['🎾','Brincadeiras','Cada travessura virou memória'],
        ['❤️','Companhia','Sempre perto, sempre amor'],
        ['✨','Hoje','Um melhor amigo para sempre']
      ],
      quotes: [
        'Alguns animais chegam e viram parte da família.',
        'O amor mais sincero às vezes vem com patas.',
        'Cada brincadeira virou uma memória feliz.'
      ],
      modal: 'Crie uma homenagem fofa para seu melhor amigo de quatro patas.',
      extraEmoji: ['🐾','😂','💬','🔥','❤️']
    }
  };

  /* ─── HELPERS ─── */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const STORAGE_KEY = 'loveblastData';

  function getTheme(cat) { return THEMES[cat] || THEMES.casal; }

  function getLocalData() {
    try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); return d && typeof d==='object' ? d : null; } catch { return null; }
  }
  function saveLocalData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...data, photos:[], musicSrc:''})); } catch {} }
  }

  /* ─── APPLY THEME CSS VARS TO DOCUMENT ─── */
  function applyThemeVars(cat) {
    const t = getTheme(cat);
    const r = document.documentElement;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--accent-rgb', t.accentRgb);
    r.style.setProperty('--glow', t.glow);
    r.style.setProperty('--card-bg', t.cardBg);
  }

  /* ─── HYDRATE VIEW.HTML ─── */
  function hydrateFinal(raw) {
    const data = raw || {};
    const cat = THEMES[data.categoria] ? data.categoria : 'casal';
    const t = getTheme(cat);
    const ins = { totalMessages:18432, topWord:t.word, saudadeCount:103, loveCount:82, emotionalLevel:'Alto', ...(data.insights||{}) };

    applyThemeVars(cat);

    // Names
    setText('finalNome1', data.nome1||'Robson');
    setText('finalNome2', data.nome2||'Pessoa especial');
    setText('cartaNome',  data.nome2||'Pessoa especial');
    setText('mensagemFinal', data.mensagem||t.finalPhrase);

    // Texts
    setText('fraseAbertura', t.intro);
    setText('textoCategoria', t.start);
    setText('mensagensLabel', t.mensagensLabel);
    setText('fraseFinal', t.finalPhrase);

    // Quotes (use generatedPhrases from WhatsApp if available)
    const phrases = ins.generatedPhrases || t.quotes;
    setText('quote1', `"${phrases[0]||t.quotes[0]}"`);
    setText('quote2', `"${phrases[1]||t.quotes[1]}"`);
    setText('quote3', `"${phrases[2]||t.quotes[2]}"`);

    // Insights
    const msgCount = Number(ins.totalMessages||18432);
    setText('totalMensagens', msgCount.toLocaleString('pt-BR'));
    const equiv = document.getElementById('insEquiv');
    if (equiv) {
      const b = Math.round(msgCount/1500);
      equiv.textContent = b<=0?'muitas conversas':b===1?'1 livro inteiro':`${b} livros inteiros.`;
    }
    setText('palavraMaisUsada', ins.topWord||t.word);
    setText('saudadeCount', t.saudadeLabel(ins));
    setText('nivelCarinho', ins.emotionalLevel||'Alto');
    setText('humor', cat==='amigos'?'Muito presente':'Presente');
    setText('comunicacao', ins.totalMessages>10000?'Muito frequente':'Frequente');
    setText('intensidade', ins.emotionalLevel||'Alta');
    setText('conexao', 'Forte');

    // Music title
    const musicTitle = $('.musica-final h2');
    if (musicTitle) musicTitle.innerHTML = `${t.music} <span>♡</span>`;
    setText('nomeMusicaFinal', data.musicName||t.music);

    // Music player
    const audio = $('#audioFinal');
    const emptyMsg = $('#semMusicaMsg');
    const disc = $('#disc');
    if (audio) {
      if (data.musicSrc) {
        audio.src = data.musicSrc;
        audio.style.display = 'block';
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (disc && !audio._lb) {
          audio.addEventListener('play',  () => disc.classList.add('playing'));
          audio.addEventListener('pause', () => disc.classList.remove('playing'));
          audio.addEventListener('ended', () => disc.classList.remove('playing'));
          audio._lb = 1;
        }
      } else {
        audio.removeAttribute('src');
        audio.style.display = 'none';
        if (emptyMsg) { emptyMsg.textContent = 'Nenhuma música foi adicionada.'; emptyMsg.style.display = 'block'; }
        disc?.classList.remove('playing');
      }
    }

    // Timeline
    const tl = $('#timelineItems');
    if (tl) {
      tl.innerHTML = '';
      t.timeline.forEach(([emoji, label, text]) => {
        tl.insertAdjacentHTML('beforeend',
          `<div class="time-item"><span class="emoji">${emoji}</span><strong>${label}</strong><p>${text}</p></div>`);
      });
    }

    // Photos
    const photos = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
    const mainPhoto = $('#fotoPrincipal');
    if (mainPhoto) {
      if (photos[0]) { mainPhoto.src = photos[0]; mainPhoto.closest('.polaroid')?.style.removeProperty('display'); }
      else { mainPhoto.removeAttribute('src'); mainPhoto.closest('.polaroid')?.style.setProperty('display','none'); }
    }
    const gallery = $('#galeriaFinal');
    if (gallery) {
      gallery.innerHTML = '';
      if (photos.length) {
        photos.slice(0,3).forEach(src => {
          const img = document.createElement('img');
          img.src = src; img.alt = 'Memória'; gallery.appendChild(img);
        });
      } else {
        gallery.innerHTML = '<div class="loveblast-empty-media">Nenhuma foto adicionada.</div>';
      }
    }

    // Extra emoji update
    const extraItems = $$('.extra-item');
    if (extraItems.length && t.extraEmoji) {
      const labels = [
        `${t.extraEmoji[0]} Nível de carinho`,
        `${t.extraEmoji[1]} Humor`,
        `${t.extraEmoji[2]} Comunicação`,
        `${t.extraEmoji[3]} Intensidade emocional`,
        `${t.extraEmoji[4]} Conexão`
      ];
      extraItems.forEach((el, i) => {
        const strong = el.querySelector('strong');
        if (strong) { const sv = strong.textContent; el.childNodes[0].textContent = labels[i]; strong.textContent = sv; }
        else el.firstChild.textContent = labels[i];
      });
    }
  }

  /* ─── SETUP INDEX.HTML ─── */
  function setupIndex() {
    // Category selection
    $$('.card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category || 'casal';
        $$('.card').forEach(c => c.classList.toggle('active', c.dataset.category===cat));
        if ($('#categoriaInput')) $('#categoriaInput').value = cat;
        const t = getTheme(cat);
        if ($('#categoriaDescricao')) $('#categoriaDescricao').textContent = t.modal;
        applyThemeVars(cat);
      }, true); // capture so it fires before modal open
    });

    // Init default theme
    const initCat = $('#categoriaInput')?.value || 'casal';
    applyThemeVars(initCat);
  }

  /* ─── SETUP VIEW.HTML ─── */
  function setupView() {
    window.compartilharArte = function() {
      const url = location.href;
      if (navigator.share) navigator.share({ title:'Minha retrospectiva LoveBlast', text:'Olha essa retrospectiva ❤️', url }).catch(()=>{});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(()=>lbToast('Link copiado ❤️'));
    };

    // Try loading from server first, fallback to localStorage
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const sessionId = params.get('session_id');
    let endpoint = '';
    if (id) endpoint = `/api/retrospectiva/${encodeURIComponent(id)}?pago=1`;
    else if (sessionId) endpoint = `/api/retrospectiva-por-sessao/${encodeURIComponent(sessionId)}?pago=1`;

    if (endpoint) {
      fetch(endpoint)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { saveLocalData(data); hydrateFinal(data); })
        .catch(() => hydrateFinal(getLocalData()||{}));
    } else {
      hydrateFinal(getLocalData()||{});
    }
  }

  /* ─── TOAST ─── */
  function lbToast(msg) {
    const prev = $('.loveblast-toast');
    if (prev) prev.remove();
    const el = document.createElement('div');
    el.className = 'loveblast-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  /* ─── INIT ─── */
  function init() {
    if ($('#payBtn')) setupIndex();
    if ($('#arteFinal')) setupView();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Expose for debugging
  window._lb = { getTheme, getLocalData, saveLocalData, THEMES };
})();
