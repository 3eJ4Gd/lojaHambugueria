/* ============================================================================
   BRASA BURGER — FONTE DE DADOS CONFIGURÁVEL
   ----------------------------------------------------------------------------
   Este é o único arquivo que precisa ser editado para configurar a loja
   (preços, produtos, horários, WhatsApp, taxas e pagamentos).

   ATENÇÃO
   · Todos os preços, textos e horários abaixo são EXEMPLOS ILUSTRATIVOS.
     Eles NÃO são valores comerciais reais da Brasa Burger.
     Enquanto `loja.precosIlustrativos` for `true`, o site exibe um aviso
     visível de modo demonstração. Troque para `false` após configurar.
   · Preços são gravados em CENTAVOS (3490 = R$ 34,90) para evitar erros
     de arredondamento. Nunca use ponto flutuante em contas de dinheiro.
   · As alterações feitas pelo painel administrativo são salvas no
     navegador (localStorage) e sobrescrevem estes valores padrão.
   · Para tornar as alterações definitivas em todos os navegadores,
     use o painel → "Dados" → "Exportar JSON" e cole o conteúdo aqui.
   ============================================================================ */
(function (global) {
  'use strict';

  var BRASA_PADRAO = {
    versao: 1,

    /* ------------------------------- LOJA ------------------------------- */
    loja: {
      nome: 'Brasa Burger',
      slogan: 'Sabor que impressiona.',

      /* Número do WhatsApp com DDI e DDD, apenas dígitos: 5511999999999.
         Deixe vazio enquanto não houver número oficial. */
      whatsapp: '5585997432771',
      telefone: '',
      email: '',

      endereco: { logradouro: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' },
      linkMapa: '',

      /* Ex.: [{ ini: '18:00', fim: '23:00', fechado: false }, ...] na ordem
         Domingo → Sábado. Array vazio = horários ainda não configurados. */
      horarios: [],

      aceitaEntrega: true,
      aceitaRetirada: true,
      bairrosAtendidos: [],          // ex.: ['Centro', 'Jardim Aeroporto']
      taxaEntrega: 0,                // centavos — 0 = ainda não configurada
      pedidoMinimo: 0,               // centavos — 0 = sem mínimo configurado
      tempoEntrega: '',              // ex.: '35 a 50 min'
      pagamentos: [],                // ex.: ['Pix', 'Dinheiro', 'Cartão na entrega']

      /* true = permite enviar pedido mesmo com a loja fechada. */
      pedidosForaDoHorario: true,

      precosIlustrativos: true,
      avisoLoja: ''                  // aviso exibido no topo do site, se preenchido
    },

    /* ---------------------------- ACESSO ------------------------------- */
    /* Autenticação LOCAL do painel. Troque a senha antes de publicar.
       IMPORTANTE: em site estático esta proteção é apenas uma barreira
       de conveniência — proteja o diretório do painel no servidor. */
    admin: { usuario: 'admin', senha: 'brasa123' },

    /* --------------------------- GRUPOS DE OPÇÕES ---------------------- */
    grupos: [
      {
        id: 'adicionais',
        nome: 'Adicionais',
        tipo: 'multi',            // multi = pode escolher vários
        min: 0,
        max: 6,
        obrigatorio: false,
        itens: [
          { id: 'bacon',    nome: 'Bacon crocante',     preco: 500 },
          { id: 'cheddar',  nome: 'Cheddar extra',      preco: 400 },
          { id: 'carne',    nome: 'Hambúrguer extra',   preco: 900 },
          { id: 'queijo',   nome: 'Queijo mussarela',   preco: 400 },
          { id: 'cebola',   nome: 'Cebola caramelizada', preco: 400 },
          { id: 'ovos',     nome: 'Ovo da roça',        preco: 300 },
          { id: 'molho',    nome: 'Molho da casa',      preco: 300 },
          { id: 'picles',   nome: 'Picles extra',       preco: 200 }
        ]
      },
      {
        id: 'remocoes',
        nome: 'Retirar ingredientes',
        tipo: 'remocao',
        min: 0,
        max: 10,
        obrigatorio: false,
        itens: [
          { id: 'sem-cebola',  nome: 'Sem cebola',   preco: 0 },
          { id: 'sem-picles',  nome: 'Sem picles',   preco: 0 },
          { id: 'sem-alface',  nome: 'Sem alface',   preco: 0 },
          { id: 'sem-tomate',  nome: 'Sem tomate',   preco: 0 },
          { id: 'sem-molho',   nome: 'Sem molho',    preco: 0 },
          { id: 'sem-queijo',  nome: 'Sem queijo',   preco: 0 }
        ]
      }
    ],

    /* --------------------------- CATEGORIAS ---------------------------- */
    categorias: [
      { id: 'todos',            nome: 'Todos',            ordem: 0, visivel: true },
      { id: 'burgers',          nome: 'Burgers',          ordem: 1, visivel: true },
      { id: 'combos',           nome: 'Combos',           ordem: 2, visivel: true },
      { id: 'acompanhamentos',  nome: 'Acompanhamentos',  ordem: 3, visivel: true },
      { id: 'bebidas',          nome: 'Bebidas',          ordem: 4, visivel: true }
    ],

    /* ---------------------------- PRODUTOS ----------------------------- */
    produtos: [
      {
        id: 'brasa-bacon',
        nome: 'Brasa Bacon',
        descricao: 'Pão brioche, hambúrguer artesanal, cheddar cremoso, bacon crocante e molho da casa.',
        ingredientes: ['Pão brioche', 'Hambúrguer artesanal', 'Cheddar', 'Bacon crocante', 'Molho da casa'],
        preco: 3490,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-bacon.jpg',
        disponivel: true,
        destaque: true,
        etiqueta: 'Mais pedido',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'brasa-supreme',
        nome: 'Brasa Supreme',
        descricao: 'Hambúrguer artesanal, queijo derretido, cebola caramelizada e molho especial da casa.',
        ingredientes: ['Pão brioche', 'Hambúrguer artesanal', 'Queijo derretido', 'Cebola caramelizada', 'Molho especial'],
        preco: 3690,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-supreme.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'smash-cheddar',
        nome: 'Smash Cheddar',
        descricao: 'Dois discos de carne prensados na chapa, cheddar duplo e picles no pão de batata.',
        ingredientes: ['Pão de batata', 'Dois discos smash', 'Cheddar duplo', 'Picles', 'Molho da casa'],
        preco: 2890,
        precoAntigo: 3290,
        categoria: 'burgers',
        imagem: 'assets/img/burger-smash.jpg',
        disponivel: true,
        destaque: true,
        etiqueta: 'Mais pedido',
        promocao: true,
        condicaoPromocao: 'Preço promocional já aplicado no cardápio. Disponibilidade sujeita a alteração no painel.',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'duplo-brasa',
        nome: 'Duplo Brasa',
        descricao: 'Duas carnes artesanais, queijo duplo, alface crocante e maionese defumada.',
        ingredientes: ['Pão australiano', 'Duas carnes artesanais', 'Queijo duplo', 'Alface', 'Maionese defumada'],
        preco: 3990,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-duplo.jpg',
        disponivel: true,
        destaque: true,
        etiqueta: 'Mais pedido',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'frango-crocante',
        nome: 'Frango Crocante',
        descricao: 'Filé de frango empanado na hora, queijo, alface e maionese de ervas.',
        ingredientes: ['Pão brioche', 'Filé de frango empanado', 'Queijo', 'Alface', 'Maionese de ervas'],
        preco: 3290,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-frango.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'brasa-salada',
        nome: 'Brasa Salada',
        descricao: 'Hambúrguer artesanal, tomate, alface, cebola roxa e queijo na leiva.',
        ingredientes: ['Pão integral', 'Hambúrguer artesanal', 'Tomate', 'Alface', 'Cebola roxa', 'Queijo na leiva'],
        preco: 3090,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-salada.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'costela-brasa',
        nome: 'Costela Brasa',
        descricao: 'Blend de costela, queijo prato, cebola roxa e barbecue da casa no pão australiano.',
        ingredientes: ['Pão australiano', 'Blend de costela', 'Queijo prato', 'Cebola roxa', 'Barbecue da casa'],
        preco: 4290,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-costela.jpg',
        disponivel: false,
        destaque: false,
        etiqueta: 'Esgotado hoje',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'xtudo-brasa',
        nome: 'X-Tudo Brasa',
        descricao: 'Tudo o que faz um X-Tudo bem feito: carne, presunto, queijo, ovo, bacon e salada.',
        ingredientes: ['Pão de hambúrguer', 'Hambúrguer artesanal', 'Presunto', 'Queijo', 'Ovo', 'Bacon', 'Salada'],
        preco: 3790,
        precoAntigo: null,
        categoria: 'burgers',
        imagem: 'assets/img/burger-xtudo.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },

      /* ---------------------------- COMBOS ----------------------------- */
      {
        id: 'combo-individual',
        nome: 'Combo Individual',
        descricao: 'Um burger à sua escolha, batata rústica e limonada suíça.',
        ingredientes: ['1 burger', 'Batata rústica', 'Limonada suíça 400ml'],
        preco: 4990,
        precoAntigo: null,
        categoria: 'combos',
        imagem: 'assets/img/combo-individual.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: 'Combo',
        promocao: false,
        condicaoPromocao: '',
        componentes: [
          { produtoId: 'smash-cheddar', qtd: 1 },
          { produtoId: 'side-rustica', qtd: 1 },
          { produtoId: 'drink-limonada', qtd: 1 }
        ],
        grupos: ['adicionais']
      },
      {
        id: 'combo-duplo',
        nome: 'Combo Duplo',
        descricao: 'Duplo Brasa, batata temporizada e suco de laranja natural.',
        ingredientes: ['1 Duplo Brasa', 'Batata temporizada', 'Suco de laranja 400ml'],
        preco: 6290,
        precoAntigo: null,
        categoria: 'combos',
        imagem: 'assets/img/combo-duplo.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: 'Combo',
        promocao: false,
        condicaoPromocao: '',
        componentes: [
          { produtoId: 'duplo-brasa', qtd: 1 },
          { produtoId: 'side-temporizada', qtd: 1 },
          { produtoId: 'drink-suco', qtd: 1 }
        ],
        grupos: ['adicionais']
      },
      {
        id: 'combo-casal',
        nome: 'Combo Casal',
        descricao: 'Brasa Bacon, Brasa Supreme, batata com cheddar e bacon e duas limonadas.',
        ingredientes: ['1 Brasa Bacon', '1 Brasa Supreme', 'Batata com cheddar e bacon', '2 Limonadas suíças'],
        preco: 9990,
        precoAntigo: 11450,
        categoria: 'combos',
        imagem: 'assets/img/combo-casal.jpg',
        disponivel: true,
        destaque: true,
        etiqueta: 'Oferta',
        promocao: true,
        condicaoPromocao: 'Preço promocional já aplicado no cardápio. Disponibilidade sujeita a alteração no painel.',
        componentes: [
          { produtoId: 'brasa-bacon', qtd: 1 },
          { produtoId: 'brasa-supreme', qtd: 1 },
          { produtoId: 'side-cheddar', qtd: 1 },
          { produtoId: 'drink-limonada', qtd: 2 }
        ],
        grupos: ['adicionais']
      },
      {
        id: 'combo-familia',
        nome: 'Combo Família',
        descricao: 'Dois Brasa Bacon, dois Frango Crocante, duas batatas com cheddar e quatro limonadas.',
        ingredientes: ['2 Brasa Bacon', '2 Frango Crocante', '2 Batatas com cheddar', '4 Limonadas suíças'],
        preco: 19990,
        precoAntigo: 22100,
        categoria: 'combos',
        imagem: 'assets/img/combo-familia.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: 'Oferta',
        promocao: true,
        condicaoPromocao: 'Preço promocional já aplicado no cardápio. Disponibilidade sujeita a alteração no painel.',
        componentes: [
          { produtoId: 'brasa-bacon', qtd: 2 },
          { produtoId: 'frango-crocante', qtd: 2 },
          { produtoId: 'side-cheddar', qtd: 2 },
          { produtoId: 'drink-limonada', qtd: 4 }
        ],
        grupos: ['adicionais']
      },

      /* ------------------------ ACOMPANHAMENTOS ------------------------ */
      {
        id: 'side-cheddar',
        nome: 'Batata com Cheddar e Bacon',
        descricao: 'Batata crocante coberta com cheddar cremoso e bacon em cubos.',
        ingredientes: ['Batata frita', 'Cheddar cremoso', 'Bacon'],
        preco: 2290,
        precoAntigo: null,
        categoria: 'acompanhamentos',
        imagem: 'assets/img/side-cheddar.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },
      {
        id: 'side-rustica',
        nome: 'Batata Rústica',
        descricao: 'Batatas com casca, tempero da casa e alecrim.',
        ingredientes: ['Batata com casca', 'Tempero da casa', 'Alecrim'],
        preco: 1690,
        precoAntigo: null,
        categoria: 'acompanhamentos',
        imagem: 'assets/img/side-rustica.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['remocoes']
      },
      {
        id: 'side-temporizada',
        nome: 'Batata Temporizada',
        descricao: 'Batata palito frita na hora com sal e ervas finas.',
        ingredientes: ['Batata palito', 'Sal', 'Ervas finas'],
        preco: 1890,
        precoAntigo: null,
        categoria: 'acompanhamentos',
        imagem: 'assets/img/side-temporizada.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['remocoes']
      },
      {
        id: 'side-crocante',
        nome: 'Crocante de Frango',
        descricao: 'Pedaços de frango empanados e temperados, com molho da casa.',
        ingredientes: ['Frango empanado', 'Tempero da casa', 'Molho para acompanhar'],
        preco: 2690,
        precoAntigo: null,
        categoria: 'acompanhamentos',
        imagem: 'assets/img/side-crocante.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: ['adicionais', 'remocoes']
      },

      /* Item interno usado pelo montador de combo da página inicial.
         Não aparece no cardápio (visivel: false), mas dá suporte ao carrinho. */
      {
        id: 'combo-montado',
        nome: 'Combo montado',
        descricao: 'Combinação escolhida por você: burger, acompanhamento e bebida.',
        ingredientes: [],
        preco: 0,
        precoAntigo: null,
        categoria: 'combos',
        imagem: 'assets/img/combo-trio.jpg',
        disponivel: true,
        visivel: false,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        componentes: [],
        grupos: []
      },

      /* ----------------------------- BEBIDAS --------------------------- */
      {
        id: 'drink-milkshake',
        nome: 'Milkshake de Morango',
        descricao: 'Milkshake cremoso de morango servido na taça.',
        ingredientes: ['Sorvete de morango', 'Leite', 'Calda de morango'],
        preco: 1490,
        precoAntigo: null,
        categoria: 'bebidas',
        imagem: 'assets/img/drink-milkshake.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: []
      },
      {
        id: 'drink-shake-choco',
        nome: 'Milkshake de Chocolate',
        descricao: 'Milkshake de chocolate com calda e biscoito.',
        ingredientes: ['Sorvete de chocolate', 'Leite', 'Calda de chocolate'],
        preco: 1490,
        precoAntigo: null,
        categoria: 'bebidas',
        imagem: 'assets/img/drink-shake-choco.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: []
      },
      {
        id: 'drink-suco',
        nome: 'Suco de Laranja',
        descricao: 'Suco natural de laranja, feito na hora.',
        ingredientes: ['Laranja', 'Gelo'],
        preco: 1090,
        precoAntigo: null,
        categoria: 'bebidas',
        imagem: 'assets/img/drink-suco.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: []
      },
      {
        id: 'drink-limonada',
        nome: 'Limonada Suíça',
        descricao: 'Limonada batida com casca, gelada.',
        ingredientes: ['Limão', 'Água', 'Açúcar', 'Gelo'],
        preco: 990,
        precoAntigo: null,
        categoria: 'bebidas',
        imagem: 'assets/img/drink-limonada.jpg',
        disponivel: true,
        destaque: false,
        etiqueta: '',
        promocao: false,
        condicaoPromocao: '',
        grupos: []
      }
    ],

    /* ------------------------- MONTADOR DE COMBO ----------------------- */
    montadorCombo: {
      ativo: true,
      titulo: 'Monte seu combo',
      passos: [
        { rotulo: 'Escolha o burger',      categoria: 'burgers',         min: 1, max: 1 },
        { rotulo: 'Escolha o acompanhamento', categoria: 'acompanhamentos', min: 1, max: 1 },
        { rotulo: 'Escolha a bebida',        categoria: 'bebidas',          min: 1, max: 1 }
      ],
      grupos: ['adicionais']
    },

    /* -------------------------- TEXTOS DA MARCA ------------------------ */
    marca: {
      titulo: 'O sabor da Brasa',
      texto: 'A Brasa Burger nasceu da ideia simples de fazer o hambúrguer que a gente gostaria de encontrar: carne escolhida com cuidado, pão fresco, queijo que derrete de verdade e o ponto de brasa que dá nome à casa.',
      passos: [
        { titulo: 'Seleção',     texto: 'Ingredientes escolhidos e receita própria da casa.' },
        { titulo: 'Preparo',     texto: 'Molho na chapa, na hora do pedido.' },
        { titulo: 'Montagem',    texto: 'Montagem cuidadosa para chegar inteiro e quente.' },
        { titulo: 'Entrega',     texto: 'Embalagem térmica para delivery e retirada rápida.' }
      ],
      diferenciais: [
        { titulo: 'Carne artesanal',   texto: 'Hambúrguer preparado na casa, com ponto e tempero próprios.' },
        { titulo: 'Pão do dia',        texto: 'Pães frescos, selecionados para cada receita.' },
        { titulo: 'Queijo que derrete',texto: 'Queijo aplicado no ponto certo para cobrir a carne.' },
        { titulo: 'Pedido simples',    texto: 'Cardápio interativo e envio direto pelo WhatsApp.' }
      ],
      imagens: ['assets/img/story-carne.jpg', 'assets/img/story-brasa.jpg', 'assets/img/story-bacon.jpg']
    }
  };

  global.BRASA_PADRAO = BRASA_PADRAO;
})(typeof window !== 'undefined' ? window : this);
