(() => {
  'use strict';

  const MAX_PHOTOS = 8;
  const MAX_IMAGE_SIDE = 1400;
  const MAX_MUSIC_DATA_BYTES = 12 * 1024 * 1024;
  const STORAGE_KEY = 'loveblastData';

  const THEMES = {
    casal: {
      label: 'CASAL',
      intro: 'Algumas historias nao cabem em palavras.',
      start: 'E desde entao, cada detalhe faz sentido.',
      mensagensLabel: 'mensagens',
      word: 'amor',
      second: i => `saudade ${i.saudadeCount || 103} vezes`,
      timeline: [['♡','Inicio','O primeiro marco dessa historia'],['💬','Conversas','Mensagens que aproximaram voces'],['✦','Memorias','Momentos que ficaram guardados'],['🔥','Hoje','E ainda parece so o comeco']],
      quotes: ['O carinho aparece mais nos detalhes do que nas grandes declaracoes.', 'Mesmo quando o assunto era simples, voces encontravam jeito de permanecer juntos.', 'A saudade foi uma das emocoes mais presentes nessa historia.'],
      final: 'Algumas historias merecem ser eternizadas.',
      music: 'Nossa musica'
    },
    mae: {
      label: 'MAE',
      intro: 'O amor mais constante da vida.',
      start: 'Tudo comecou com cuidado, colo e presenca.',
      mensagensLabel: 'momentos especiais',
      word: 'cuidado',
      second: () => 'cuidado em cada detalhe',
      timeline: [['✦','Presenca','Ela esteve presente'],['♡','Cuidado','Cada gesto virou memoria'],['⌂','Lar','O abraco que acalma tudo'],['✨','Hoje','Uma homenagem para eternizar']],
      quotes: ['Algumas pessoas nao apenas cuidam. Elas viram abrigo.', 'O amor dela aparece nos detalhes que quase ninguem ve.', 'Mae e a primeira forma de amor que a vida ensina.'],
      final: 'Alguns amores merecem ser homenageados para sempre.',
      music: 'A musica dela'
    },
    pai: {
      label: 'PAI',
      intro: 'Alguns herois nao usam capa.',
      start: 'Tudo comecou com exemplo, protecao e presenca.',
      mensagensLabel: 'momentos especiais',
      word: 'exemplo',
      second: () => 'presenca que virou exemplo',
      timeline: [['◇','Protecao','Sempre esteve por perto'],['✦','Exemplo','Ensinou mais por atitudes'],['💬','Conselhos','Palavras que ficaram'],['🔥','Hoje','Uma homenagem para guardar']],
      quotes: ['Pai e presenca que guia, mesmo em silencio.', 'O exemplo dele virou parte de quem voce e.', 'Alguns gestos simples carregam amor gigante.'],
      final: 'Herois de verdade merecem ser lembrados.',
      music: 'A trilha dele'
    },
    familia: {
      label: 'FAMILIA',
      intro: 'Familia e onde a historia comeca.',
      start: 'Cada encontro virou parte de uma memoria maior.',
      mensagensLabel: 'memorias compartilhadas',
      word: 'familia',
      second: () => 'memorias que unem todos',
      timeline: [['⌂','Raizes','Onde tudo comecou'],['📸','Memorias','Momentos que uniram todos'],['✧','Presenca','Cada pessoa faz parte'],['✨','Hoje','Uma historia de geracoes']],
      quotes: ['Familia e feita de risadas, apoio e lembrancas que ficam.', 'O lar nao e so um lugar, e quem caminha com voce.', 'Cada foto guarda uma parte da historia de voces.'],
      final: 'Historias de familia atravessam geracoes.',
      music: 'A trilha da familia'
    },
    amigos: {
      label: 'AMIGOS',
      intro: 'Algumas amizades viram familia.',
      start: 'Tudo comecou com risadas e virou parceria.',
      mensagensLabel: 'mensagens e memorias',
      word: 'risadas',
      second: () => 'risadas que viraram historia',
      timeline: [['✶','Risadas','Momentos impossiveis de esquecer'],['💬','Conversas','Assuntos que so voces entendem'],['♡','Parceria','Um pelo outro sempre'],['🔥','Hoje','Mais historias para viver']],
      quotes: ['Voces transformaram dias comuns em historias boas.', 'A amizade aparece nas piadas, nos conselhos e na presenca.', 'Algumas pessoas chegam e ficam para sempre.'],
      final: 'Amizades verdadeiras merecem ser eternizadas.',
      music: 'A trilha dos amigos'
    },
    formatura: {
      label: 'FORMATURA',
      intro: 'Todo esforco merece ser lembrado.',
      start: 'Tudo comecou com um sonho e muita coragem.',
      mensagensLabel: 'dias de dedicacao',
      word: 'conquista',
      second: () => 'esforco que virou conquista',
      timeline: [['📚','Comeco','O primeiro passo foi dado'],['☕','Rotina','Dias dificeis tambem fizeram parte'],['◇','Conquista','O sonho virou realidade'],['✨','Agora','Uma nova fase comeca']],
      quotes: ['A conquista de hoje carrega todo esforco de ontem.', 'Cada etapa dificil tambem fez parte da vitoria.', 'O diploma e so o comeco de uma historia maior.'],
      final: 'Conquistas grandes merecem ser eternizadas.',
      music: 'A trilha da conquista'
    },
    bebe: {
      label: 'BEBE',
      intro: 'Cada descoberta virou amor.',
      start: 'Tudo comecou com amor, cuidado e encanto.',
      mensagensLabel: 'momentos registrados',
      word: 'sorrisos',
      second: () => 'descobertas guardadas com carinho',
      timeline: [['☻','Comeco','Tudo era novidade'],['♡','Sorrisos','Cada risada mudou o dia'],['✦','Fases','Cada descoberta uma emocao'],['✨','Agora','Um amor que so cresce']],
      quotes: ['Cada sorriso pequeno virou uma memoria gigante.', 'O tempo passa rapido, mas esses momentos ficam.', 'Essa historia e feita de amor em sua forma mais pura.'],
      final: 'Infancias merecem ser guardadas com carinho.',
      music: 'Cancao do bebe'
    },
    pet: {
      label: 'PET',
      intro: 'Amor tambem tem quatro patas.',
      start: 'Tudo comecou com bagunca, carinho e companhia.',
      mensagensLabel: 'memorias com o pet',
      word: 'companhia',
      second: () => 'companhia em todos os momentos',
      timeline: [['♨','Chegada','A casa nunca mais foi igual'],['✶','Brincadeiras','Cada travessura virou memoria'],['♡','Companhia','Sempre perto, sempre amor'],['✨','Hoje','Um melhor amigo para sempre']],
      quotes: ['Alguns animais chegam e viram parte da familia.', 'O amor mais sincero as vezes vem com patas.', 'Cada brincadeira virou uma memoria feliz.'],
      final: 'Alguns companheiros deixam marcas eternas.',
      music: 'A trilha do pet'
    }
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  let selectedCategory = $('.card.active')?.dataset.category || $('#categoriaInput')?.value || 'casal';

  function toast(message) {
    $('.loveblast-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'loveblast-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function theme(cat = selectedCategory) {
    return THEMES[cat] || THEMES.casal;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function defaultInsights(cat = selectedCategory) {
    return {
      totalMessages: 18432,
      topWord: theme(cat).word,
      saudadeCount: 103,
      loveCount: 82,
      favoriteTime: '23:47',
      emotionalLevel: 'Alto',
      generatedPhrases: theme(cat).quotes
    };
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error(`${file.name} nao parece ser uma imagem.`));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`${file.name} nao pode ser carregada.`));
      };
      img.src = url;
    });
  }

  function analyzeWhatsApp(text) {
    const lower = (text || '').toLowerCase();
    const lines = lower.split(/\r?\n/).filter(line => line.trim());
    const loveCount = (lower.match(/\b(eu te amo|te amo|amo voce|amo você)\b/g) || []).length;
    const saudadeCount = (lower.match(/\b(saudade|saudades|sdds)\b/g) || []).length;
    const words = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\b[a-z0-9]{4,}\b/g) || [];
    const ignore = new Set('para com uma umas uns que nao voce meu minha seu sua dela dele esse essa aqui hoje agora bom boa amor sim tem muito mais como quando'.split(' '));
    const counts = {};
    words.forEach(word => { if (!ignore.has(word)) counts[word] = (counts[word] || 0) + 1; });
    return {
      ...defaultInsights(),
      totalMessages: lines.length || 18432,
      topWord: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || theme().word,
      loveCount: loveCount || 82,
      saudadeCount: saudadeCount || 103
    };
  }

  function getLocalData() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  }

  function saveLocalData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, photos: [], musicSrc: '' }));
      } catch {}
    }
  }

  async function collectFormData() {
    selectedCategory = $('#categoriaInput')?.value || selectedCategory || 'casal';
    if (!THEMES[selectedCategory]) selectedCategory = 'casal';

    const photosInput = $('#photos');
    const musicInput = $('#music');
    const whatsappFile = $('#whatsappFile')?.files?.[0];
    const photoFiles = Array.from(photosInput?.files || []).slice(0, MAX_PHOTOS);
    const photosData = [];

    for (const file of photoFiles) {
      photosData.push(await resizeImage(file));
    }

    const musicFile = musicInput?.files?.[0];
    let musicData = '';
    let musicName = theme().music;
    if (musicFile) {
      const audioOk = musicFile.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(musicFile.name);
      if (!audioOk) throw new Error('Formato de musica nao suportado. Use MP3, M4A, AAC, OGG, WAV ou WEBM.');
      musicName = musicFile.name.replace(/\.[^/.]+$/, '');
      if (musicFile.size <= MAX_MUSIC_DATA_BYTES) {
        musicData = await readDataUrl(musicFile);
      }
    }

    const insights = whatsappFile ? analyzeWhatsApp(await whatsappFile.text()) : defaultInsights(selectedCategory);
    const data = {
      nome1: $('#nome1')?.value?.trim() || 'Robson',
      nome2: $('#nome2')?.value?.trim() || 'Pessoa especial',
      email: $('#email')?.value?.trim() || '',
      mensagem: $('#mensagem')?.value?.trim() || theme().final,
      categoria: selectedCategory,
      photos: photosData,
      musicSrc: musicData,
      musicName,
      insights
    };
    saveLocalData(data);
    return { data, photoFiles, musicFile };
  }

  function setupIndex() {
    $$('.card').forEach(card => {
      card.addEventListener('click', () => {
        selectedCategory = card.dataset.category || 'casal';
        if ($('#categoriaInput')) $('#categoriaInput').value = selectedCategory;
      }, true);
    });

    const payBtn = $('#payBtn');
    if (!payBtn) return;
    const cleanBtn = payBtn.cloneNode(true);
    payBtn.replaceWith(cleanBtn);

    cleanBtn.addEventListener('click', async () => {
      const nome1 = $('#nome1')?.value.trim();
      const nome2 = $('#nome2')?.value.trim();
      const email = $('#email')?.value.trim();
      if (!nome1 || !nome2 || !email) {
        alert('Preencha nome, nome da pessoa e e-mail.');
        return;
      }

      cleanBtn.disabled = true;
      cleanBtn.textContent = 'CRIANDO SESSAO...';

      try {
        const { data, photoFiles, musicFile } = await collectFormData();
        const formData = new FormData();
        formData.set('nome1', data.nome1);
        formData.set('nome2', data.nome2);
        formData.set('email', data.email);
        formData.set('mensagem', data.mensagem);
        formData.set('categoria', data.categoria);
        formData.set('musicName', data.musicName);
        formData.set('insights', JSON.stringify(data.insights || defaultInsights(data.categoria)));
        formData.set('photosData', JSON.stringify(data.photos || []));
        if (data.musicSrc) formData.set('musicData', data.musicSrc);
        photoFiles.forEach(file => formData.append('photos', file));
        if (musicFile) formData.append('music', musicFile);
        const whatsFile = $('#whatsappFile')?.files?.[0];
        if (whatsFile) formData.append('whatsappFile', whatsFile);

        const response = await fetch('/criar-sessao', { method: 'POST', body: formData });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.erro || 'Erro ao iniciar pagamento.');

        if (json.retrospectiveId) {
          saveLocalData({ ...data, id: json.retrospectiveId });
        }
        if (json.checkoutUrl) {
          window.location.href = json.checkoutUrl;
          return;
        }
        throw new Error('Nao foi possivel iniciar o pagamento.');
      } catch (error) {
        alert(error.message || 'Erro ao iniciar pagamento.');
        cleanBtn.disabled = false;
        cleanBtn.textContent = '💳 Finalizar e pagar';
      }
    });
  }

  async function loadSharedData() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const sessionId = params.get('session_id');
    const paid = params.get('pago') === '1' ? '?pago=1' : '';
    const endpoint = id
      ? `/api/retrospectiva/${encodeURIComponent(id)}${paid}`
      : sessionId
        ? `/api/retrospectiva-por-sessao/${encodeURIComponent(sessionId)}${paid}`
        : '';
    if (!endpoint) return null;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Nao foi possivel carregar a retrospectiva.');
    const data = await response.json();
    saveLocalData(data);
    return data;
  }

  function normalizedData(data) {
    const cat = THEMES[data?.categoria] ? data.categoria : 'casal';
    return {
      id: data?.id || '',
      nome1: data?.nome1 || 'Robson',
      nome2: data?.nome2 || 'Pessoa especial',
      mensagem: data?.mensagem || theme(cat).final,
      categoria: cat,
      photos: Array.isArray(data?.photos) ? data.photos.filter(Boolean) : [],
      musicSrc: data?.musicSrc || '',
      musicName: data?.musicName || theme(cat).music,
      insights: data?.insights || defaultInsights(cat)
    };
  }

  function hydrateFinal(data) {
    data = normalizedData(data);
    selectedCategory = data.categoria;
    const cfg = theme(data.categoria);
    const insights = { ...defaultInsights(data.categoria), ...(data.insights || {}) };

    setText('finalNome1', data.nome1);
    setText('finalNome2', data.nome2);
    setText('cartaNome', data.nome2);
    setText('mensagemFinal', data.mensagem);
    setText('fraseAbertura', cfg.intro);
    setText('textoCategoria', cfg.start);
    setText('mensagensLabel', cfg.mensagensLabel);
    setText('quote1', `"${(insights.generatedPhrases || cfg.quotes)[0] || cfg.quotes[0]}"`);
    setText('quote2', `"${(insights.generatedPhrases || cfg.quotes)[1] || cfg.quotes[1]}"`);
    setText('quote3', `"${(insights.generatedPhrases || cfg.quotes)[2] || cfg.quotes[2]}"`);
    setText('fraseFinal', cfg.final);
    setText('totalMensagens', Number(insights.totalMessages || 18432).toLocaleString('pt-BR'));
    setText('palavraMaisUsada', insights.topWord || cfg.word);
    setText('saudadeCount', cfg.second(insights));
    setText('nivelCarinho', insights.emotionalLevel || 'Alto');
    setText('humor', data.categoria === 'amigos' ? 'Muito presente' : 'Presente');
    setText('comunicacao', insights.totalMessages > 10000 ? 'Muito frequente' : 'Frequente');
    setText('intensidade', insights.emotionalLevel || 'Alta');
    setText('conexao', 'Forte');

    const timeline = $('#timelineItems');
    if (timeline) {
      timeline.innerHTML = '';
      cfg.timeline.forEach(([emoji, label, text]) => {
        timeline.insertAdjacentHTML('beforeend', `<div class="time-item"><span class="emoji">${emoji}</span><strong>${label}</strong><p>${text}</p></div>`);
      });
    }

    const photoList = data.photos;
    const mainPhoto = $('#fotoPrincipal');
    const gallery = $('#galeriaFinal');
    if (mainPhoto) {
      if (photoList[0]) {
        mainPhoto.src = photoList[0];
        mainPhoto.closest('.polaroid')?.style.removeProperty('display');
      } else {
        mainPhoto.removeAttribute('src');
        mainPhoto.closest('.polaroid')?.style.setProperty('display', 'none');
      }
    }
    if (gallery) {
      gallery.innerHTML = '';
      if (photoList.length) {
        photoList.slice(0, 3).forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.alt = 'Memoria';
          gallery.appendChild(img);
        });
      } else {
        gallery.innerHTML = '<div class="loveblast-empty-media">Nenhuma foto foi carregada para esta retrospectiva.</div>';
      }
    }

    const musicTitle = $('.musica-final h2');
    if (musicTitle) musicTitle.innerHTML = `${cfg.music} <span>♡</span>`;
    setText('nomeMusicaFinal', data.musicName || cfg.music);
    const audio = $('#audioFinal');
    const emptyMsg = $('#semMusicaMsg');
    if (audio) {
      if (data.musicSrc && data.musicSrc !== '__indexeddb__') {
        audio.src = data.musicSrc;
        audio.style.display = 'block';
        if (emptyMsg) emptyMsg.style.display = 'none';
      } else {
        audio.removeAttribute('src');
        audio.style.display = 'none';
        if (emptyMsg) {
          emptyMsg.textContent = 'Nenhuma musica foi adicionada.';
          emptyMsg.style.display = 'block';
        }
      }
    }
  }

  function setupView() {
    window.compartilharArte = function compartilharArte() {
      const data = normalizedData(getLocalData() || {});
      const url = data.id ? `${location.origin}/view.html?id=${encodeURIComponent(data.id)}&pago=1` : location.href;
      if (navigator.share) {
        navigator.share({ title: 'Minha retrospectiva LoveBlast', text: 'Olha essa retrospectiva que eu criei no LoveBlast.', url }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => toast('Link copiado.'));
      }
    };

    loadSharedData()
      .then(data => hydrateFinal(data || getLocalData() || {}))
      .catch(error => {
        const local = getLocalData();
        if (local) hydrateFinal(local);
        toast(error.message || 'Nao foi possivel carregar o link compartilhado.');
      });
  }

  function init() {
    if ($('#payBtn')) setupIndex();
    if ($('#arteFinal')) setupView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
