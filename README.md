[README.md](https://github.com/user-attachments/files/28395318/README.md)
# LoveBlast 🔥 — Backend com Stripe

Retrospectiva do Dia dos Namorados com pagamento real via Stripe.

---

## Estrutura

```
loveblast/
├── server/
│   └── index.js        ← Servidor Node.js (Express + Stripe)
├── public/
│   └── index.html      ← Frontend completo
├── .env.example        ← Variáveis de ambiente (copie para .env)
└── package.json
```

---

## 1. Pré-requisitos

- Node.js 18+
- Conta no [Stripe](https://dashboard.stripe.com) (modo teste para dev)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) para testar webhooks localmente

---

## 2. Instalação

```bash
# Clone / baixe o projeto, então:
cd loveblast
npm install

# Copie o exemplo de .env
cp .env.example .env
```

---

## 3. Configure o .env

Abra `.env` e preencha:

```env
# Stripe — dashboard.stripe.com → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_...      # sk_test_ em dev, sk_live_ em produção
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...    # veja passo 4 abaixo

APP_URL=http://localhost:3000      # URL pública em produção
PORT=3000
PRICE_CENTS=1990                   # R$19,90

# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_SECRET=string_aleatoria_longa_aqui
```

---

## 4. Configure o Webhook

### Em desenvolvimento (Stripe CLI):

```bash
# Terminal 1 — inicia o servidor
npm run dev

# Terminal 2 — faz o Stripe encaminhar eventos para seu servidor local
stripe listen --forward-to localhost:3000/webhook
```

O comando `stripe listen` vai exibir o `STRIPE_WEBHOOK_SECRET` — copie para o `.env`.

### Em produção:

1. Acesse: **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL: `https://seudominio.com/webhook`
3. Evento: `checkout.session.completed`
4. Copie o **Signing secret** para `STRIPE_WEBHOOK_SECRET` no `.env`

---

## 5. Rode o servidor

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

Acesse: http://localhost:3000

---

## 6. Fluxo completo

```
Usuário preenche formulário (tema, fotos, nomes, mensagem)
        ↓
Clica "Pagar R$19,90"
        ↓
POST /criar-sessao → Stripe Checkout Session criada
        ↓
Usuário é redirecionado para checkout.stripe.com
        ↓
Paga com cartão (ou PIX se ativo na conta)
        ↓
Stripe envia POST /webhook com evento checkout.session.completed
        ↓
Servidor valida assinatura HMAC → marca pedido como pago
        ↓
Usuário é redirecionado de volta para /?pago=1&session_id=...
        ↓
Frontend faz polling em GET /status/:sessionId
        ↓
Recebe token de download → botão "Baixar" aparece
        ↓
POST /download com token → servidor valida + gera HTML personalizado
        ↓
HTML baixado no dispositivo do usuário ✅
```

---

## 7. Testar pagamento

No modo teste do Stripe, use o cartão:
- **Número:** `4242 4242 4242 4242`
- **Validade:** qualquer data futura
- **CVC:** qualquer 3 dígitos

---

## 8. Deploy em produção

Recomendações:
- **Servidor:** [Railway](https://railway.app), [Render](https://render.com), ou VPS com Nginx
- **Banco de dados:** Substitua o `Map` em memória por PostgreSQL ou Redis
- **HTTPS:** Obrigatório para o Stripe (use Let's Encrypt ou o próprio Railway/Render)
- Mude `APP_URL` no `.env` para sua URL real
- Use `STRIPE_SECRET_KEY=sk_live_...` (chave de produção)

---

## Suporte a PIX

Para habilitar PIX no Stripe (disponível para contas BR aprovadas):

```js
// Em server/index.js, na criação da sessão:
payment_method_types: ['card', 'boleto'], // PIX via boleto no Stripe BR
```

Consulte a [documentação do Stripe Brasil](https://stripe.com/docs/payments/boleto) para mais detalhes.
