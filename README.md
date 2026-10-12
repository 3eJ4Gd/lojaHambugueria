# Brasa Burger — Site de Hambúrguer Artesanal

Site completo, pronto para uso, para uma hamburgueria artesanal: página inicial,
cardápio interativo, carrinho, checkout com envio por WhatsApp e painel
administrativo.

**Slogan:** *Sabor que impressiona.*

---

## Sumário

1. [Rodar o site](#1-rodar-o-site)
2. [Estrutura dos arquivos](#2-estrutura-dos-arquivos)
3. [Configurar a loja (obrigatório antes de publicar)](#3-configurar-a-loja-obrigatório-antes-de-publicar)
4. [Painel administrativo](#4-painel-administrativo)
5. [Como funciona por dentro](#5-como-funciona-por-dentro)
6. [Publicar](#6-publicar)
7. [O que funciona e o que precisa de dados reais](#7-o-que-funciona-e-o-que-precisa-de-dados-reais)
8. [Limites e avisos importantes](#8-limites-e-avisos-importantes)

---

## 1. Rodar o site

O site é 100% HTML, CSS e JavaScript puro. **Não usa build, npm, servidor de
aplicações nem dependências externas.** Isso é intencional: funciona em qualquer
hospedagem estática e também abrindo o arquivo direto.

### Opção A — duplo clique (mais simples)

Dê dois cliques em `index.html`. Tudo abre e funciona, inclusive o carrinho e o
painel.

### Opção B — servidor local (recomendado para testar)

Há um servidor estático sem dependências incluído:

```powershell
.\dev-server.ps1 -Port 8080
```

Depois abra <http://localhost:8080/>.

> Por que existe o `dev-server.ps1`? O navegador bloqueia alguns recursos quando
> a página vem de `file://`. O site foi construído para funcionar nos dois
> modos, mas o servidor local reproduz melhor o ambiente de produção.

---

## 2. Estrutura dos arquivos

```
brasa-burger/
├── index.html          Página inicial
├── cardapio.html       Cardápio interativo (busca, filtros, personalização)
├── checkout.html       Checkout em 4 etapas + envio por WhatsApp
├── admin.html          Painel administrativo
├── dev-server.ps1      Servidor estático local (opcional)
│
├── css/
│   ├── base.css        Design system (cores, tipografia, botões, formulários)
│   ├── fonts.css       @font-face das fontes hospedadas localmente
│   ├── home.css        Estilos da página inicial
│   ├── menu.css        Estilos do cardápio
│   ├── checkout.css    Estilos do checkout
│   └── admin.css       Estilos do painel
│
├── js/
│   ├── data.js         ⭐ FONTE DE DADOS — edite para configurar a loja
│   ├── store.js        Leitura/gravação dos dados, dinheiro, horários
│   ├── cart.js         Carrinho persistente
│   ├── ui.js           Componentes compartilhados (modal, drawer, avisos)
│   ├── pedidos.js      Registro e status dos pedidos
│   ├── home.js         Lógica da página inicial
│   ├── menu.js         Lógica do cardápio
│   ├── checkout.js     Lógica do checkout
│   └── admin.js        Lógica do painel
│
└── assets/
    ├── favicon.svg
    ├── fonts/          7 arquivos .woff2 (Bebas Neue + Montserrat)
    └── img/            31 fotos (.jpg)
```

---

## 3. Configurar a loja (obrigatório antes de publicar)

> **Todos os preços, nomes, horários e textos que vêm no pacote são exemplos
> ilustrativos, não dados comerciais reais.** Enquanto a configuração não for
> preenchida, o site exibe uma faixa vermelha de **"Modo demonstração"** no topo
> de todas as páginas. Isso é proposital: evita que um cliente ache que viu um
> preço verdadeiro.

### Pelo painel (mais fácil)

1. Abra `admin.html` e entre com **admin / brasa123**.
2. Vá em **Loja** e preencha WhatsApp, endereço, horários, entrega, pagamentos,
   bairros e taxa.
3. Vá em **Produtos** e ajuste nomes, preços, fotos e disponibilidade.
4. Desmarque **"Preços são de demonstração"** só depois de informar os valores
   reais.
5. Vá em **Dados → Exportar JSON** para salvar uma cópia de tudo o que você
> configurou.

### Direto no arquivo (mais definitivo)

Edite `js/data.js`. Ele é o único arquivo que precisa de alteração manual para a
configuração ficar valendo em **qualquer navegador e qualquer dispositivo**.

Campos que **precisam** ser preenchidos:

| Campo | Onde em `data.js` | Exemplo |
|---|---|---|
| WhatsApp | `loja.whatsapp` | `5585997432771` (só dígitos, com DDI+DDD) — **já preenchido** |
| Endereço | `loja.endereco` | `logradouro`, `bairro`, `cidade`, `uf`, `cep` |
| Horários | `loja.horarios` | array com 7 dias (ver exemplo abaixo) |
| Pagamentos | `loja.pagamentos` | `['Pix', 'Dinheiro', 'Cartão na entrega']` |
| Bairros | `loja.bairrosAtendidos` | `['Centro', 'Jardim Aeroporto']` |
| Taxa de entrega | `loja.taxaEntrega` | `790` = R$ 7,90 |
| Pedido mínimo | `loja.pedidoMinimo` | `2000` = R$ 20,00 |
| Preços reais | `produtos[].preco` | `3490` = R$ 34,90 |
| Senha do painel | `admin` | troque `senha` antes de publicar |
| Senha demonstração | `loja.precosIlustrativos` | `false` quando os preços forem reais |

### Exemplo de horários

Ordem: Domingo → Sábado. `fechado: true` fecha o dia. Horário que cruza a
meia-noite funciona (ex.: `ini: '18:00', fim: '01:00'`).

```js
horarios: [
  { ini: '18:00', fim: '23:00', fechado: false },  // Domingo
  { ini: '',      fim: '',      fechado: true  },  // Segunda
  { ini: '18:00', fim: '23:30', fechado: false },  // Terça
  { ini: '18:00', fim: '23:30', fechado: false },  // Quarta
  { ini: '18:00', fim: '23:30', fechado: false },  // Quinta
  { ini: '18:00', fim: '01:00', fechado: false },  // Sexta
  { ini: '17:00', fim: '01:00', fechado: false }   // Sábado
]
```

Deixe `horarios: []` enquanto não souber os horários: o site mostra
"Horário não configurado" em vez de inventar um.

### Como o dinheiro é calculado

Preços são gravados em **centavos** (`3490` = R$ 34,90) para nunca ter erro de
ponto flutuante. Nunca digite `34.9` — use `3490`.

---

## 4. Painel administrativo

`admin.html` — usuário **admin**, senha **brasa123** (troque antes de publicar).

| Seção | O que faz |
|---|---|
| **Visão geral** | Números do cardápio e dos pedidos, checklist do que falta configurar, últimos pedidos |
| **Produtos** | Criar, editar, excluir produtos; categorias; fotos; preços; promoções; disponibilidade; grupos de opções; componentes de combo |
| **Adicionais** | Grupos de opções: adicionais pagos, remoções gratuitas, mínimo/máximo, obrigatoriedade |
| **Loja** | Contato, endereço, horários dia a dia, entrega/retirada, taxa, mínimo, pagamentos, bairros, aviso do topo e credenciais |
| **Pedidos** | Lista completa, filtro por status, atualização de status (aguardando → recebido → em preparo → saiu → concluído/cancelado), exclusão |
| **Dados** | Exportar JSON, importar JSON, restaurar conteúdo padrão, apagar pedidos |

### Avisos do painel

- **As alterações ficam no navegador onde você fez** (armazenamento local).
  Para valer em todos os aparelhos, use **Dados → Exportar JSON** e cole o
  conteúdo no `js/data.js`.
- **A senha do painel é apenas uma barreira local.** Ela fica gravada no
  navegador e qualquer pessoa que abra o `admin.html` pode ler o código. Em um
  site estático isso é inseguro para dados sensíveis — veja a seção 8.

---

## 5. Como funciona por dentro

- **Sem fetch e sem módulos ES.** Todos os scripts carregam com `<script>`
  simples, por isso o site abre com duplo clique e não quebra em hospedagem
  estática com regras estritas de MIME.
- **Carrinho persistente.** Fica salvo no navegador e sobrevive a recargas e
  navegação entre páginas.
- **Itens iguais são somados.** Dois pedidos idênticos (mesmo produto, mesmos
  adicionais, mesmas remoções e mesma observação) viram uma linha só com
  quantidade maior.
- **Combo montado na home** vira um item interno do carrinho com o preço
  calculado a partir da soma real dos produtos escolhidos.
- **Pedidos.** O checkout registra o pedido localmente com número sequencial
  (`BRASA-0001`) e abre (ou copia) a mensagem para o WhatsApp. O pedido aparece
  no painel.
- **WhatsApp não configurado.** O botão vira "Registrar pedido e copiar
  mensagem": o pedido ainda é registrado e a mensagem vai para a área de
  transferência, para você colar manualmente.

---

## 6. Publicar

Basta enviar os arquivos para qualquer hospedagem estática. Nada de
compilação, Node ou banco de dados.

1. Configure tudo pelo painel.
2. **Dados → Baixar JSON**.
3. Substitua o conteúdo de `js/data.js` pelo JSON exportado (mantendo o formato
   `var BRASA_PADRAO = { … }`), ou simplesmente publique com o `localStorage`
   preenchido no seu navegador — mas isso vale só para você.
4. Envie a pasta inteira por FTP, GitHub Pages, Netlify, Vercel, Cloudflare
   Pages, cPanel ou qualquer hospedagem.
5. Teste o site publicado: cardápio, carrinho, checkout e admin.

### Recomendações de segurança antes de publicar

- Troque a senha do painel em **Loja → Acesso ao painel**.
- Proteja a pasta do `admin.html` com autenticação no servidor (senha da
  hospedagem, `.htpasswd`, regra de IP ou similar). O login do painel **não
  protege nada de verdade** num site estático.
- Ative HTTPS na hospedagem.

---

## 7. O que funciona e o que precisa de dados reais

### ✅ Funciona de imediato (testado)

- Página inicial completa: hero, faixa animada, mais pedidos, montador de
  combo, história da marca, ofertas e bloco de entrega.
- Cardápio com categorias, busca em tempo real, ordenação, indicação de
  itens indisponíveis e paginação por seção.
- Modal de personalização: adicionais pagos, remoções gratuitas, observações,
  quantidade e cálculo de preço ao vivo.
- Carrinho lateral persistente com quantidade, remoção e total.
- Montador de combo da home com preço calculado pela soma real dos itens.
- Checkout em 4 etapas com validação, máscara de telefone, escolha de
  entrega/retirada, pagamento, troco, revisão e mensagem de WhatsApp pronta.
- Respeito ao horário de funcionamento (bloqueia pedido fora do horário quando
  configurado para bloquear) e ao pedido mínimo.
- Registro local de pedidos com numeração sequencial e status.
- Painel administrativo completo: login, produtos, categorias, adicionais,
  loja, horários, pedidos, exportar/importar/restaurar.
- Layout responsivo mobile-first (testado a 390 px): menu hambúrguer, chips
  roláveis, 2 colunas de cards, barra fixa do carrinho e checkout em 1 coluna.
- Indicador de aberto/fechado calculado pelo horário configurado.
- Aviso de modo demonstração e checklist de pendências no painel.

### ⚠️ Precisa dos seus dados reais

| Item | Situação |
|---|---|
| **WhatsApp da loja** | ✅ Já configurado (`5585997432771`) — botões levam ao `wa.me/5585997432771` |
| **Preços dos produtos** | ⚠️ Os valores atuais são exemplos ilustrativos |
| **Fotos dos produtos** | ⚠️ Imagens de banco de fotos (Unsplash/Pexels), não são as reais |
| **Endereço, bairros e taxa** | ⚠️ Nada foi inventado; aparece "Ainda não configurado" |
| **Horários de funcionamento** | ⚠️ Sem eles, o site mostra "Horário não configurado" e não calcula aberto/fechado |
| **Formas de pagamento** | ⚠️ Sem elas, o checkout mostra "A combinar com a loja" |
| **Nome, slogan e textos da marca** | ⚠️ O texto atual é genérico e precisa ser ajustado ao seu negócio |
| **Senha do painel** | ⚠️ A padrão (admin/brasa123) é pública no código — troque antes de publicar |

Para trocar o WhatsApp, edite `loja.whatsapp` em `js/data.js` (formato
`'55' + DDD + número`, só dígitos) ou use o painel → **Loja → WhatsApp**.

### 🔒 Não é possível com site estático (precisa de servidor)

- **Confirmar o pedido automaticamente.** O site registra o pedido no navegador
  do cliente e envia a mensagem ao WhatsApp, mas **não há back-end** para
  notificar a loja, controlar estoque ou impedir que alguém altere o código e
  mande pedido falso.
- **Painel protegido de verdade.** A autenticação é só no navegador.
- **Pedidos vistos entre dispositivos.** Cada navegador guarda os seus. Para
  pedidos no servidor é preciso back-end (Node, PHP, Firebase, Supabase…).
- **Pagamento online.** Só WhatsApp; integrar Pix/cartão exige gateway e
  servidor.
- **LGPD.** O site não coleta dados em servidor, mas a mensagem de WhatsApp
  contém nome, telefone e endereço do cliente. Inclua uma política de
  privacidade e o aviso de tratamento de dados no rodapé antes de operar.

---

## 8. Limites e avisos importantes

1. **Nenhum dado inventado é apresentado como real.** Tudo que não foi
   configurado aparece como "Ainda não configurado" ou "Modo demonstração".
2. **Os preços exibidos são de demonstração** até você trocar a flag
   `loja.precosIlustrativos` para `false` no painel.
3. **A senha do admin é visível no código-fonte.** Use autenticação no servidor
   antes de publicar.
4. **Carrinho e pedidos são locais ao navegador.** Limpar dados do navegador
   apaga tudo (o painel tem exportação JSON para backup).
5. **Fotos e textos são placeholders** e precisam ser substituídos.
6. **Não é um sistema de delivery completo.** É um site de cardápio com envio
   de pedido por WhatsApp. Para rastreio, contas e integração com impressora é
   preciso back-end.

---

*Projeto em HTML/CSS/JS puro, sem dependências externas, sem build e sem
frameworks.*
