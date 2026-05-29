// LoveBlast Frontend
// Este arquivo roda no navegador. Não coloque este código em server/index.js.

const categoryCards = document.querySelectorAll('.card');
const payButtons = document.querySelectorAll('.btn');

let selectedCategory = 'casal';

categoryCards.forEach(card => {
  card.addEventListener('click', () => {
    categoryCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const title = card.querySelector('h3');
    selectedCategory = title ? title.textContent.trim().toLowerCase() : 'casal';
  });
});

const insights = {
  totalMessages: 18432,
  topWord: 'amor',
  loveCount: 82,
  saudadeCount: 103,
  favoriteTime: '23:47',
  emotionalLevel: 'Alto'
};

console.log('Insights LoveBlast:', insights);

function getCheckoutPayload() {
  // Quando você ligar com o formulário real, troque estes valores pelos inputs atuais.
  return {
    nome1: 'Robson',
    nome2: 'Raa',
    email: '',
    categoria: selectedCategory,
    insights
  };
}

async function criarSessaoPagamento() {
  const clickedButton = document.activeElement;

  try {
    if (clickedButton && clickedButton.tagName === 'BUTTON') {
      clickedButton.disabled = true;
      clickedButton.dataset.originalText = clickedButton.textContent;
      clickedButton.textContent = 'CRIANDO SESSÃO...';
    }

    const response = await fetch('/criar-sessao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(getCheckoutPayload())
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Erro ao criar sessão.');
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    alert('Não foi possível iniciar o pagamento.');

  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao iniciar pagamento.');

    if (clickedButton && clickedButton.tagName === 'BUTTON') {
      clickedButton.disabled = false;
      clickedButton.textContent = clickedButton.dataset.originalText || 'CRIAR RETROSPECTIVA';
    }
  }
}

payButtons.forEach(btn => {
  const text = btn.textContent.toUpperCase();

  if (
    text.includes('DESBLOQUEAR') ||
    text.includes('CRIAR') ||
    text.includes('RETROSPECTIVA')
  ) {
    btn.addEventListener('click', criarSessaoPagamento);
  }
});
