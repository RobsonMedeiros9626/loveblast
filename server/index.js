const categoryCards = document.querySelectorAll('.card');
const payButtons = document.querySelectorAll('.btn');

categoryCards.forEach(card => {
  card.addEventListener('click', () => {
    categoryCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
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

async function criarSessaoPagamento() {
  try {
    const response = await fetch('/criar-sessao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome1: 'Robson',
        nome2: 'Raa',
        email: 'cliente@email.com',
        categoria: 'casal',
        insights
      })
    });

    const data = await response.json();

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Não foi possível iniciar o pagamento.');
    }

  } catch (error) {
    console.error(error);
    alert('Erro ao iniciar pagamento.');
  }
}

payButtons.forEach(btn => {
  if (
    btn.textContent.includes('DESBLOQUEAR') ||
    btn.textContent.includes('CRIAR')
  ) {
    btn.addEventListener('click', criarSessaoPagamento);
  }
});
