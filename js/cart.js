/* ============================================================================
   BRASA BURGER — CARRINHO (cart.js)
   ----------------------------------------------------------------------------
   · Persistência automática durante a navegação (localStorage)
   · Cálculos sempre em centavos, sem ponto flutuante
   · Emite eventos para a interface se atualizar
   ============================================================================ */
(function (global) {
  'use strict';

  var CHAVE = 'brasa_cart_v1';
  var itens = [];
  var ouvintes = { mudou: [] };

  function on(evt, cb) { (ouvintes[evt] = ouvintes[evt] || []).push(cb); }
  function emit(evt, p) { (ouvintes[evt] || []).forEach(function (cb) { try { cb(p); } catch (e) { console.error(e); } }); }

  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      itens = (s && Array.isArray(s.itens)) ? s.itens : [];
    } catch (e) { itens = []; }
    // descarta itens de produtos que não existem mais
    itens = itens.filter(function (i) { return i && i.produtoId && global.Store.produto(i.produtoId); });
    return itens;
  }

  function persistir() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ itens: itens })); } catch (e) { }
    emit('mudou', itens);
  }

  /* --------------------------- cálculos ------------------------------- */
  function linha(item) {
    var extras = (item.adicionais || []).reduce(function (s, a) { return s + (a.preco || 0); }, 0);
    return (item.base || 0) + extras;
  }

  function subtotal() {
    return itens.reduce(function (s, i) { return s + linha(i) * (i.qtd || 1); }, 0);
  }

  function qtdTotal() {
    return itens.reduce(function (s, i) { return s + (i.qtd || 1); }, 0);
  }

  /* modalidade: 'entrega' | 'retirada' */
  function entrega(modalidade) {
    var l = global.Store.loja();
    if (modalidade === 'retirada') return { disponivel: true, centavos: 0, texto: 'Retirada no local' };
    if (!l.aceitaEntrega) return { disponivel: false, centavos: 0, texto: 'Entrega não disponível' };
    var taxa = l.taxaEntrega || 0;
    return {
      disponivel: true,
      centavos: taxa,
      texto: taxa > 0 ? global.Store.brl(taxa) : 'Taxa não configurada'
    };
  }

  function total(modalidade) {
    var e = entrega(modalidade);
    return subtotal() + (e.disponivel ? e.centavos : 0);
  }

  function minimoAtingido(modalidade) {
    var l = global.Store.loja();
    if (!l.pedidoMinimo || modalidade === 'retirada') return true;
    return subtotal() >= l.pedidoMinimo;
  }

  /* --------------------------- operações ------------------------------ */
  function assinatura(dados) {
    return JSON.stringify({
      p: dados.produtoId,
      a: (dados.adicionais || []).map(function (x) { return x.id; }).sort(),
      r: (dados.remocoes || []).map(function (x) { return x.id; }).sort(),
      o: (dados.obs || '').trim().toLowerCase(),
      c: (dados.componentes || []).map(function (x) { return x.nome + 'x' + x.qtd; }).sort()
    });
  }

  function adicionar(dados) {
    var prod = global.Store.produto(dados.produtoId);
    if (!prod) throw new Error('Produto não encontrado.');
    if (prod.disponivel === false) throw new Error(prod.nome + ' está indisponível no momento.');

    var novo = {
      uid: global.Store.uid('it'),
      produtoId: prod.id,
      /* combos montados informam nome e preço próprios */
      nome: dados.nomeItem || prod.nome,
      imagem: prod.imagem || '',
      base: (dados.precoBase != null) ? dados.precoBase : prod.preco,
      qtd: Math.max(1, parseInt(dados.qtd, 10) || 1),
      adicionais: dados.adicionais || [],
      remocoes: dados.remocoes || [],
      componentes: dados.componentes || null,
      obs: (dados.obs || '').trim()
    };

    var sig = assinatura(novo);
    var existente = itens.filter(function (i) { return assinatura(i) === sig; })[0];
    if (existente) {
      existente.qtd += novo.qtd;
    } else {
      itens.push(novo);
    }
    persistir();
    return novo;
  }

  function atualizar(uid, patch) {
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].uid === uid) {
        if (patch.qtd != null) itens[i].qtd = Math.max(1, Math.min(99, parseInt(patch.qtd, 10) || 1));
        if (patch.obs != null) itens[i].obs = String(patch.obs).slice(0, 240);
        if (patch.adicionais != null) itens[i].adicionais = patch.adicionais;
        if (patch.remocoes != null) itens[i].remocoes = patch.remocoes;
        persistir();
        return itens[i];
      }
    }
    return null;
  }

  function remover(uid) {
    itens = itens.filter(function (i) { return i.uid !== uid; });
    persistir();
  }

  function limpar() { itens = []; persistir(); }

  function existe(uid) {
    return itens.some(function (i) { return i.uid === uid; });
  }

  global.Cart = {
    CHAVE: CHAVE,
    on: on,
    carregar: carregar,
    itens: function () { return itens; },
    adicionar: adicionar,
    atualizar: atualizar,
    remover: remover,
    limpar: limpar,
    existe: existe,
    linha: linha,
    subtotal: subtotal,
    qtdTotal: qtdTotal,
    entrega: entrega,
    total: total,
    minimoAtingido: minimoAtingido
  };

  carregar();
})(typeof window !== 'undefined' ? window : this);
