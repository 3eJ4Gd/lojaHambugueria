/* ============================================================================
   BRASA BURGER — INTERFACE COMPARTILHADA (ui.js)
   ----------------------------------------------------------------------------
   Cabeçalho dinâmico, carrinho lateral, modal de personalização, avisos e
   componentes de card reutilizados pela página inicial e pelo cardápio.
   ============================================================================ */
(function (global) {
  'use strict';

  var S = global.Store;
  var C = global.Cart;

  /* ---------------------------- utilidades ---------------------------- */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ICONES = {
    carrinho: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 12.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H5.4"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mais: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    lixeira: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
    busca: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    seta: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 0 1-1.44-5.01c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.67 2.76 9.36 9.36 0 0 1 2.76 6.68c0 5.2-4.24 9.45-9.44 9.45zM19.1 4.9A11.24 11.24 0 0 0 12.04 2C5.8 2 .76 7.03.76 13.26c0 2 .52 3.94 1.52 5.66L.66 24.5l5.73-1.5a11.3 11.3 0 0 0 5.65 1.44h.01c6.23 0 11.27-5.04 11.27-11.27a11.2 11.2 0 0 0-3.22-7.98z"/></svg>'
  };

  function icone(nome) { return ICONES[nome] || ''; }

  function no(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  /* Cria vários elementos de uma vez e devolve um fragmento pronto
     para ser anexado ao documento (drawer, modal e caixa de confirmação). */
  function nos(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    var frag = document.createDocumentFragment();
    while (d.firstChild) frag.appendChild(d.firstChild);
    return frag;
  }

  /* ---------------------------- toasts ------------------------------- */
  function toast(msg, tipo) {
    var box = document.getElementById('toasts');
    if (!box) { box = no('<div id="toasts" class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    var el = no('<div class="toast toast--' + (tipo || 'ok') + '">' + esc(msg) + '</div>');
    box.appendChild(el);
    setTimeout(function () { el.classList.add('sai'); }, 2600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3100);
  }

  /* ------------------------ foco / teclado ---------------------------- */
  function presoFoco(container, aoFechar) {
    function seletor() {
      return Array.prototype.slice.call(container.querySelectorAll(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      )).filter(function (n) { return n.offsetParent !== null; });
    }
    function noKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); aoFechar(); return; }
      if (e.key !== 'Tab') return;
      var f = seletor();
      if (!f.length) return;
      var pri = f[0], ult = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    }
    container.addEventListener('keydown', noKey);
    return function () { container.removeEventListener('keydown', noKey); };
  }

  /* ===================== ÁREA DO CARRINHO (DRAWER) ==================== */
  var drawer, drawerSaiFoco;

  function montarDrawer() {
    if (document.getElementById('drawer-carrinho')) return;
    document.body.appendChild(nos(
      '<div class="drawer-overlay" id="drawer-overlay" hidden></div>' +
      '<aside class="drawer" id="drawer-carrinho" role="dialog" aria-modal="true" aria-labelledby="drawer-titulo" hidden>' +
        '<header class="drawer__topo">' +
          '<div>' +
            '<p class="kicker">Seu pedido</p>' +
            '<h2 id="drawer-titulo" class="drawer__titulo">Carrinho</h2>' +
          '</div>' +
          '<button class="icon-btn" id="drawer-fechar" type="button" aria-label="Fechar carrinho">' + icone('fechar') + '</button>' +
        '</header>' +
        '<div class="drawer__lista" id="drawer-lista"></div>' +
        '<footer class="drawer__pe" id="drawer-pe"></footer>' +
      '</aside>'
    ));
    drawer = document.getElementById('drawer-carrinho');
    document.getElementById('drawer-fechar').addEventListener('click', fecharCarrinho);
    document.getElementById('drawer-overlay').addEventListener('click', fecharCarrinho);
  }

  function abrirCarrinho() {
    montarDrawer();
    renderDrawer();
    drawer.hidden = false;
    document.getElementById('drawer-overlay').hidden = false;
    document.body.classList.add('travado');
    drawerSaiFoco = presoFoco(drawer, fecharCarrinho);
    var b = document.getElementById('drawer-fechar');
    if (b) b.focus();
  }

  function fecharCarrinho() {
    if (!drawer) return;
    drawer.hidden = true;
    document.getElementById('drawer-overlay').hidden = true;
    document.body.classList.remove('travado');
    if (drawerSaiFoco) { drawerSaiFoco(); drawerSaiFoco = null; }
  }

  function linhaItem(i) {
    var extras = (i.adicionais || []).map(function (a) { return esc(a.nome); });
    var obs = i.obs ? '<li class="linha-item__obs">“' + esc(i.obs) + '”</li>' : '';
    var comp = (i.componentes || []).map(function (c) { return esc(c.nome) + (c.qtd > 1 ? ' ×' + c.qtd : ''); });
    return '<article class="linha-item" data-uid="' + esc(i.uid) + '">' +
      '<img class="linha-item__img" src="' + esc(i.imagem) + '" alt="" width="72" height="72" loading="lazy">' +
      '<div class="linha-item__corpo">' +
        '<h3 class="linha-item__nome">' + esc(i.nome) + '</h3>' +
        (comp.length ? '<ul class="linha-item__detalhe">' + comp.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>' : '') +
        (extras.length ? '<ul class="linha-item__detalhe linha-item__detalhe--ouro">' + extras.map(function (e) { return '<li>+ ' + e + '</li>'; }).join('') + '</ul>' : '') +
        obs +
        '<div class="linha-item__controles">' +
          '<div class="stepper" role="group" aria-label="Quantidade de ' + esc(i.nome) + '">' +
            '<button type="button" class="stepper__btn" data-menos aria-label="Diminuir quantidade">' + icone('menos') + '</button>' +
            '<span class="stepper__valor" aria-live="polite">' + i.qtd + '</span>' +
            '<button type="button" class="stepper__btn" data-mais aria-label="Aumentar quantidade">' + icone('mais') + '</button>' +
          '</div>' +
          '<button type="button" class="linha-item__remover" data-remover>' + icone('lixeira') + '<span>Remover</span></button>' +
        '</div>' +
      '</div>' +
      '<p class="linha-item__preco">' + S.brl(C.linha(i) * i.qtd) + '</p>' +
    '</article>';
  }

  function renderDrawer() {
    var lista = document.getElementById('drawer-lista');
    var pe = document.getElementById('drawer-pe');
    if (!lista) return;
    var itens = C.itens();

    if (!itens.length) {
      lista.innerHTML =
        '<div class="vazio">' +
          '<div class="vazio__icone">' + icone('carrinho') + '</div>' +
          '<p class="vazio__titulo">Nenhum item adicionado</p>' +
          '<p class="vazio__texto">Escolha seu próximo favorito no cardápio.</p>' +
          '<a class="btn btn--ouro" href="cardapio.html">Ver cardápio</a>' +
        '</div>';
      pe.innerHTML = '';
      atualizarBadge();
      return;
    }

    lista.innerHTML = itens.map(linhaItem).join('');
    var entregaInfo = C.entrega('entrega');
    pe.innerHTML =
      '<dl class="resumo">' +
        '<div><dt>Subtotal</dt><dd>' + S.brl(C.subtotal()) + '</dd></div>' +
        '<div><dt>Entrega</dt><dd>' + (entregaInfo.disponivel ? esc(entregaInfo.texto) : '—') + '</dd></div>' +
        '<div class="resumo__total"><dt>Total estimado</dt><dd>' + S.brl(C.subtotal()) + '</dd></div>' +
      '</dl>' +
      '<a class="btn btn--ouro btn--bloco" href="checkout.html">Fechar pedido ' + icone('seta') + '</a>' +
      '<a class="btn btn--fantasma btn--bloco" href="cardapio.html">Continuar comprando</a>' +
      '<p class="pe-nota">Entrega e taxa são definidas na próxima etapa — na retirada, R$ 0,00.</p>';

    atualizarBadge();
  }

  function atualizarBadge() {
    var n = C.qtdTotal();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-badge]'), function (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.hidden = n === 0;
      var btn = b.closest('.cart-btn');
      if (btn) {
        btn.setAttribute('aria-label', n ? 'Abrir carrinho, ' + n + ' itens' : 'Abrir carrinho, vazio');
        btn.classList.toggle('cart-btn--cheio', n > 0);
      }
    });
    var fixo = document.getElementById('barra-carrinho');
    if (fixo) {
      fixo.hidden = n === 0;
      if (n > 0) {
        var q = fixo.querySelector('[data-barra-qtd]');
        var t = fixo.querySelector('[data-barra-total]');
        if (q) q.textContent = n + (n === 1 ? ' item' : ' itens');
        if (t) t.textContent = S.brl(C.subtotal());
      }
    }
  }

  /* Delegação de eventos dentro do drawer */
  function aoClicarDrawer(e) {
    var linha = e.target.closest('.linha-item');
    if (!linha) return;
    var uid = linha.getAttribute('data-uid');
    var item = C.itens().filter(function (i) { return i.uid === uid; })[0];
    if (!item) return;

    if (e.target.closest('[data-mais]')) { C.atualizar(uid, { qtd: item.qtd + 1 }); renderDrawer(); }
    else if (e.target.closest('[data-menos]')) {
      if (item.qtd <= 1) { C.remover(uid); } else { C.atualizar(uid, { qtd: item.qtd - 1 }); }
      renderDrawer();
    }
    else if (e.target.closest('[data-remover]')) { C.remover(uid); renderDrawer(); toast('Item removido do pedido.'); }
  }

  /* ==================== MODAL DE PERSONALIZAÇÃO ======================= */
  var modal, modalSaiFoco, estadoModal;

  function abrirProduto(id) {
    var prod = S.produto(id);
    if (!prod) return;

    estadoModal = { produtoId: id, qtd: 1, adicionais: [], remocoes: [], obs: '' };

    if (!document.getElementById('modal-produto')) {
      document.body.appendChild(nos(
        '<div class="modal-overlay" id="modal-overlay" hidden></div>' +
        '<div class="modal" id="modal-produto" role="dialog" aria-modal="true" aria-labelledby="modal-nome" hidden>' +
          '<button class="icon-btn modal__fechar" id="modal-fechar" type="button" aria-label="Fechar">' + icone('fechar') + '</button>' +
          '<div id="modal-corpo"></div>' +
        '</div>'
      ));
      modal = document.getElementById('modal-produto');
      document.getElementById('modal-fechar').addEventListener('click', fecharProduto);
      document.getElementById('modal-overlay').addEventListener('click', fecharProduto);
      modal.addEventListener('click', aoClicarModal);
      modal.addEventListener('input', aoDigitarLayoutModal);
    }
    renderModal();
    modal.hidden = false;
    document.getElementById('modal-overlay').hidden = false;
    document.body.classList.add('travado');
    modalSaiFoco = presoFoco(modal, fecharProduto);
    var f = modal.querySelector('.stepper__btn, button');
    if (f) f.focus();
  }

  function fecharProduto() {
    if (!modal) return;
    modal.hidden = true;
    document.getElementById('modal-overlay').hidden = true;
    if (!drawer || drawer.hidden) document.body.classList.remove('travado');
    if (modalSaiFoco) { modalSaiFoco(); modalSaiFoco = null; }
  }

  function precoModal() {
    var p = S.produto(estadoModal.produtoId);
    var extras = estadoModal.adicionais.reduce(function (s, a) { return s + a.preco; }, 0);
    return (p.preco + extras) * estadoModal.qtd;
  }

  function renderModal() {
    var p = S.produto(estadoModal.produtoId);
    var corpo = document.getElementById('modal-corpo');
    var esgotado = p.disponivel === false;

    var gruposHtml = (p.grupos || []).map(function (gid) {
      var g = S.grupo(gid);
      if (!g) return '';
      var escolhas = g.tipo === 'remocao' ? estadoModal.remocoes : estadoModal.adicionais;
      var itens = (g.itens || []).map(function (it) {
        var marcado = escolhas.some(function (x) { return x.id === it.id; });
        var preco = it.preco > 0 ? '+' + S.brl(it.preco) : 'Grátis';
        return '<label class="opcao' + (marcado ? ' opcao--on' : '') + '">' +
          '<input type="checkbox" data-grupo="' + esc(g.id) + '" data-item="' + esc(it.id) + '"' + (marcado ? ' checked' : '') + (esgotado ? ' disabled' : '') + '>' +
          '<span class="opcao__marca" aria-hidden="true">' + (marcado ? '✓' : '') + '</span>' +
          '<span class="opcao__nome">' + esc(it.nome) + '</span>' +
          '<span class="opcao__preco">' + esc(preco) + '</span>' +
        '</label>';
      }).join('');
      var max = g.tipo === 'remocao' ? '' :
        '<p class="grupo__ajuda">Escolha até ' + g.max + ' · mínimo ' + g.min + '</p>';
      return '<section class="grupo">' +
        '<h4 class="grupo__titulo">' + esc(g.nome) + '</h4>' + itens + max +
      '</section>';
    }).join('');

    var compHtml = '';
    if (p.componentes && p.componentes.length) {
      var avulso = S.somaComponentes(p);
      compHtml =
        '<section class="grupo">' +
          '<h4 class="grupo__titulo">O que vem no combo</h4>' +
          '<ul class="componentes">' +
            p.componentes.map(function (c) {
              var cp = S.produto(c.produtoId);
              return '<li><span>' + esc(cp ? cp.nome : c.produtoId) + (c.qtd > 1 ? ' ×' + c.qtd : '') + '</span>' +
                '<span>' + (cp ? S.brl(cp.preco * c.qtd) : '') + '</span></li>';
            }).join('') +
          '</ul>' +
          (avulso > p.preco ? '<p class="componentes__avulso">Valor avulso: <s>' + S.brl(avulso) + '</s></p>' : '') +
        '</section>';
    }

    corpo.innerHTML =
      '<div class="modal__media">' +
        '<img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '" width="800" height="500">' +
        (p.etiqueta ? '<span class="tag ' + (p.promocao ? 'tag--vermelho' : 'tag--ouro') + '">' + esc(p.etiqueta) + '</span>' : '') +
        (esgotado ? '<span class="tag tag--cinza">Indisponível</span>' : '') +
      '</div>' +
      '<div class="modal__corpo">' +
        '<p class="kicker">' + esc((S.categoria(p.categoria) || {}).nome || '') + '</p>' +
        '<h3 class="modal__nome" id="modal-nome">' + esc(p.nome) + '</h3>' +
        '<p class="modal__desc">' + esc(p.descricao) + '</p>' +
        (p.ingredientes && p.ingredientes.length ?
          '<p class="modal__ingredientes"><span>Ingredientes:</span> ' + esc(p.ingredientes.join(' · ')) + '</p>' : '') +
        (p.promocao && p.condicaoPromocao ? '<p class="condicao">' + esc(p.condicaoPromocao) + '</p>' : '') +
        compHtml +
        gruposHtml +
        '<section class="grupo">' +
          '<h4 class="grupo__titulo"><label for="modal-obs">Observações</label></h4>' +
          '<textarea id="modal-obs" class="campo" maxlength="240" rows="3" placeholder="Ex.: ponto da carne, alergias, embalagem separada…"' + (esgotado ? ' disabled' : '') + '>' + esc(estadoModal.obs) + '</textarea>' +
          '<p class="grupo__ajuda">Opcional · máximo de 240 caracteres</p>' +
        '</section>' +
      '</div>' +
      '<footer class="modal__pe">' +
        '<div class="stepper stepper--lg" role="group" aria-label="Quantidade">' +
          '<button type="button" class="stepper__btn" data-q="-1" aria-label="Diminuir quantidade"' + (esgotado ? ' disabled' : '') + '>' + icone('menos') + '</button>' +
          '<span class="stepper__valor" aria-live="polite">' + estadoModal.qtd + '</span>' +
          '<button type="button" class="stepper__btn" data-q="1" aria-label="Aumentar quantidade"' + (esgotado ? ' disabled' : '') + '>' + icone('mais') + '</button>' +
        '</div>' +
        '<button type="button" class="btn btn--ouro btn--flex" id="modal-adicionar"' + (esgotado ? ' disabled' : '') + '>' +
          (esgotado ? 'Indisponível no momento' : 'Adicionar · ' + S.brl(precoModal())) +
        '</button>' +
      '</footer>';
  }

  function aoDigitarLayoutModal(e) {
    if (e.target.id === 'modal-obs') estadoModal.obs = e.target.value;
  }

  function aoClicarModal(e) {
    var alvo = e.target;

    var cb = alvo.closest('input[type="checkbox"][data-grupo]');
    if (cb) return; // tratado no 'change'

    var q = alvo.closest('[data-q]');
    if (q) {
      var d = parseInt(q.getAttribute('data-q'), 10);
      estadoModal.qtd = Math.max(1, Math.min(20, estadoModal.qtd + d));
      renderModal();
      return;
    }

    if (alvo.closest('#modal-adicionar')) {
      try {
        C.adicionar({
          produtoId: estadoModal.produtoId,
          qtd: estadoModal.qtd,
          adicionais: estadoModal.adicionais,
          remocoes: estadoModal.remocoes,
          obs: estadoModal.obs
        });
        fecharProduto();
        toast('Adicionado ao pedido!');
        abrirCarrinho();
      } catch (err) { toast(err.message, 'erro'); }
    }
  }

  function aoChangeModal(e) {
    var cb = e.target;
    if (!cb.matches || !cb.matches('input[type="checkbox"][data-grupo]')) return;
    var g = S.grupo(cb.getAttribute('data-grupo'));
    if (!g) return;
    var item = (g.itens || []).filter(function (x) { return x.id === cb.getAttribute('data-item'); })[0];
    if (!item) return;
    var lista = g.tipo === 'remocao' ? estadoModal.remocoes : estadoModal.adicionais;
    var idx = -1;
    for (var i = 0; i < lista.length; i++) if (lista[i].id === item.id) idx = i;

    if (cb.checked) {
      if (g.max && lista.length >= g.max) {
        cb.checked = false;
        toast('Máximo de ' + g.max + ' em “' + g.nome + '”.', 'erro');
        return;
      }
      if (idx < 0) lista.push({ id: item.id, nome: item.nome, preco: item.preco || 0 });
    } else if (idx >= 0) {
      lista.splice(idx, 1);
    }
    renderModal();
  }

  /* ===================== CARD DE PRODUTO REUTILIZÁVEL ================= */
  function cardProduto(p, opcoes) {
    opcoes = opcoes || {};
    var esgotado = p.disponivel === false;
    var tags = '';
    if (p.etiqueta && !esgotado) tags += '<span class="tag ' + (p.promocao ? 'tag--vermelho' : 'tag--ouro') + '">' + esc(p.etiqueta) + '</span>';
    if (p.promocao && p.precoAntigo) tags += '<span class="tag tag--desconto">-' + Math.round((1 - p.preco / p.precoAntigo) * 100) + '%</span>';
    if (esgotado) tags += '<span class="tag tag--cinza">Indisponível</span>';

    var precoHtml = '<strong>' + S.brl(p.preco) + '</strong>';
    if (p.precoAntigo && p.precoAntigo > p.preco) precoHtml = '<s>' + S.brl(p.precoAntigo) + '</s>' + precoHtml;

    return '<article class="card-produto' + (esgotado ? ' card-produto--esgotado' : '') + '" data-produto="' + esc(p.id) + '"' +
      (opcoes.categoria ? ' data-categoria="' + esc(p.categoria) + '"' : '') + '>' +
      '<div class="card-produto__media">' +
        '<img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '" width="600" height="440" loading="lazy" decoding="async">' +
        (tags ? '<div class="card-produto__tags">' + tags + '</div>' : '') +
      '</div>' +
      '<div class="card-produto__corpo">' +
        '<h3 class="card-produto__nome">' + esc(p.nome) + '</h3>' +
        '<p class="card-produto__desc">' + esc(p.descricao) + '</p>' +
        '<div class="card-produto__rodape">' +
          '<p class="preco">' + precoHtml + '</p>' +
          '<button type="button" class="btn-add" data-add="' + esc(p.id) + '"' + (esgotado ? ' disabled' : '') +
            ' aria-label="' + (esgotado ? esc(p.nome) + ' indisponível' : 'Adicionar ' + esc(p.nome) + ' ao pedido') + '">' +
            (esgotado ? 'Esgotado' : icone('mais') + '<span>Adicionar</span>') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ============================ BANNER AVISO ========================== */
  function montarAvisos() {
    var l = S.loja();
    var barra = document.getElementById('barra-aviso');
    var pend = S.pendencias();

    if (barra) {
      if (pend.length) {
        barra.hidden = false;
        barra.innerHTML =
          '<span class="barra-aviso__ico" aria-hidden="true">!</span>' +
          '<p><strong>Modo demonstração.</strong> ' +
          esc(pend.map(function (p) { return p.campo; }).join(' · ')) +
          ' ainda não configurado. ' +
          '<a href="admin.html">Abrir painel</a></p>';
      } else {
        barra.hidden = true;
      }
    }

    if (l.avisoLoja) {
      var a = document.getElementById('aviso-loja');
      if (a) { a.hidden = false; a.textContent = l.avisoLoja; }
    }
  }

  /* ======================= SITUAÇÃO DA LOJA =========================== */
  function montarSituacao() {
    var s = S.situacaoLoja();
    Array.prototype.forEach.call(document.querySelectorAll('[data-loja-status]'), function (el) {
      el.innerHTML = '<span class="ponto ' + (s.aberto ? 'ponto--aberto' : s.aberto === false ? 'ponto--fechado' : 'ponto--neutro') + '"></span>' +
        '<span>' + esc(s.texto) + (s.detalhe ? ' <em>' + esc(s.detalhe) + '</em>' : '') + '</span>';
      el.setAttribute('title', s.texto + (s.detalhe ? ' — ' + s.detalhe : ''));
    });
  }

  /* ========================= CONTAGEM DE CONTATO ====================== */
  function montarContato() {
    var l = S.loja();
    Array.prototype.forEach.call(document.querySelectorAll('[data-whatsapp]'), function (el) {
      if (!l.whatsapp) {
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('desabilitado');
        el.href = 'admin.html';
        el.title = 'WhatsApp não configurado — defina no painel administrativo';
      } else {
        el.href = 'https://wa.me/' + l.whatsapp.replace(/\D/g, '');
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });
  }

  /* ============================ NAVEGAÇÃO ============================= */
  function menuMobile() {
    var btn = document.getElementById('menu-btn');
    var nav = document.getElementById('nav-principal');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto');
      btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      btn.classList.toggle('aberto', aberto);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('aberto');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('aberto');
      }
    });
  }

  function marcarNavAtivo() {
    var aqui = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      var alvo = a.getAttribute('href').split('#')[0].toLowerCase();
      if (alvo === aqui) { a.classList.add('ativo'); a.setAttribute('aria-current', 'page'); }
    });
  }

  function rodape() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ano]'), function (el) {
      el.textContent = String(new Date().getFullYear());
    });
    var l = S.loja();
    var alvo = document.getElementById('rodape-loja-nome');
    if (alvo) alvo.textContent = l.nome;
    Array.prototype.forEach.call(document.querySelectorAll('[data-rodape-status]'), function (el) {
      var s = S.situacaoLoja();
      el.textContent = s.texto + (s.detalhe ? ' · ' + s.detalhe : '');
    });
  }

  /* ========================= CONFIRMAÇÃO GENÉRICA ===================== */
  function confirmar(titulo, texto, rotuloSim, rotuloNao) {
    return new Promise(function (resolve) {
      document.body.appendChild(nos(
        '<div class="confirm-overlay" id="confirm-overlay" hidden></div>' +
        '<div class="confirm" id="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-t" hidden>' +
          '<h3 id="confirm-t">' + esc(titulo) + '</h3>' +
          '<p>' + esc(texto) + '</p>' +
          '<div class="confirm__acoes">' +
            '<button type="button" class="btn btn--fantasma" data-nao>' + esc(rotuloNao || 'Cancelar') + '</button>' +
            '<button type="button" class="btn btn--perigo" data-sim>' + esc(rotuloSim || 'Confirmar') + '</button>' +
          '</div>' +
        '</div>'));
      var overlay = document.getElementById('confirm-overlay');
      var box = document.getElementById('confirm-box');
      overlay.hidden = false; box.hidden = false;
      document.body.classList.add('travado');
      var sai = presoFoco(box, fim.bind(null, false));
      box.querySelector('[data-sim]').focus();

      function fim(res) {
        overlay.hidden = true; box.hidden = true;
        if (!drawer || drawer.hidden) document.body.classList.remove('travado');
        sai();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (box.parentNode) box.parentNode.removeChild(box);
        resolve(res);
      }
      overlay.addEventListener('click', function () { fim(false); });
      box.querySelector('[data-sim]').addEventListener('click', function () { fim(true); });
      box.querySelector('[data-nao]').addEventListener('click', function () { fim(false); });
    });
  }

  /* ===================== PREENCHIMENTO DE DADOS DA LOJA ================ */
  /* Qualquer elemento com data-loja="chave" recebe o valor configurado.
     Valores ausentes mostram "não configurado" — nunca informação inventada. */
  function montarCamposLoja() {
    var l = S.loja();
    var NA = '<em class="mudo">Ainda não configurado</em>';
    var valores = {
      nome: l.nome,
      slogan: l.slogan,
      endereco: (l.endereco && l.endereco.logradouro)
        ? [l.endereco.logradouro, l.endereco.complemento, l.endereco.bairro, l.endereco.cidade, l.endereco.uf].filter(Boolean).join(', ')
        : null,
      whatsapp: l.whatsapp ? formatarFone(l.whatsapp) : null,
      telefone: l.telefone ? formatarFone(l.telefone) : null,
      email: l.email || null,
      taxa: l.taxaEntrega ? S.brl(l.taxaEntrega) : null,
      pedidoMinimo: l.pedidoMinimo ? S.brl(l.pedidoMinimo) : null,
      tempo: l.tempoEntrega || null,
      linkMapa: l.linkMapa || null
    };

    Array.prototype.forEach.call(document.querySelectorAll('[data-loja]'), function (el) {
      var chave = el.getAttribute('data-loja');

      if (chave === 'pagamentos' || chave === 'bairros') {
        var lista = l[chave] || [];
        el.innerHTML = lista.length
          ? lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
          : '<li>' + NA + '</li>';
        return;
      }

      if (chave === 'horarios') {
        el.innerHTML = horariosHtml();
        return;
      }

      if (chave === 'mapa') {
        if (l.linkMapa) {
          el.hidden = false;
          el.href = l.linkMapa; el.target = '_blank'; el.rel = 'noopener';
        } else { el.hidden = true; }
        return;
      }

      if (chave === 'horarios-resumo') {
        if (!S.horariosConfigurados()) { el.innerHTML = NA; return; }
        var h = l.horarios[new Date().getDay()];
        el.textContent = (!h || h.fechado || !h.ini || !h.fim)
          ? 'Fechado hoje'
          : 'hoje das ' + h.ini + ' às ' + h.fim;
        return;
      }

      if (chave === 'modos') {
        var m = [];
        if (l.aceitaEntrega) m.push('Entrega');
        if (l.aceitaRetirada) m.push('Retirada no local');
        el.innerHTML = m.length ? m.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') : '<li>' + NA + '</li>';
        return;
      }

      var v = valores[chave];
      if (v == null) el.innerHTML = NA;
      else if (el.tagName === 'A' && chave === 'email') el.href = 'mailto:' + v, el.textContent = v;
      else if (el.tagName === 'A' && chave === 'mapa') el.href = v;
      else el.textContent = v;
    });
  }

  function formatarFone(numeros) {
    var n = String(numeros).replace(/\D/g, '');
    if (n.length <= 2) return n;
    if (n.length <= 6) return '(' + n.slice(0, 2) + ') ' + n.slice(2);
    if (n.length <= 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
    return '(' + n.slice(2, 4) + ') ' + n.slice(4, 9) + '-' + n.slice(9);
  }

  function horariosHtml() {
    var l = S.loja();
    if (!S.horariosConfigurados()) return '<li><em class="mudo">Ainda não configurado</em></li>';
    var hoje = new Date().getDay();
    return l.horarios.map(function (h, i) {
      var txt = (h.fechado || !h.ini || !h.fim) ? '<span class="fechado">Fechado</span>' : esc(h.ini) + ' – ' + esc(h.fim);
      return '<li' + (i === hoje ? ' class="hoje"' : '') + '>' +
        '<span class="dia">' + esc(S.DIAS[i]) + (i === hoje ? ' · hoje' : '') + '</span>' +
        '<span class="hora">' + txt + '</span></li>';
    }).join('');
  }

  /* ============================== INÍCIO ============================== */
  function iniciar() {
    montarDrawer();
    montarAvisos();
    montarCamposLoja();
    montarSituacao();
    montarContato();
    marcarNavAtivo();
    menuMobile();
    rodape();
    atualizarBadge();
    renderDrawer();

    document.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) { abrirProduto(add.getAttribute('data-add')); return; }
      if (e.target.closest('[data-abrir-carrinho]')) { e.preventDefault(); abrirCarrinho(); }
    });

    document.addEventListener('change', aoChangeModal);

    C.on('mudou', function () { atualizarBadge(); if (drawer && !drawer.hidden) renderDrawer(); });
    S.on('mudou', function () {
      montarAvisos(); montarCamposLoja(); montarSituacao(); montarContato(); rodape(); atualizarBadge();
      if (drawer && !drawer.hidden) renderDrawer();
    });

    // barra fixa de carrinho (cardápio)
    var barra = document.getElementById('barra-carrinho');
    if (barra) {
      barra.addEventListener('click', function (e) {
        if (e.target.closest('[data-barra-abrir]')) abrirCarrinho();
      });
    }
  }

  global.UI = {
    iniciar: iniciar,
    esc: esc, icone: icone, no: no,
    toast: toast, confirmar: confirmar,
    cardProduto: cardProduto,
    abrirCarrinho: abrirCarrinho, fecharCarrinho: fecharCarrinho,
    abrirProduto: abrirProduto,
    atualizarBadge: atualizarBadge,
    montarAvisos: montarAvisos,
    montarCamposLoja: montarCamposLoja,
    montarSituacao: montarSituacao
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : this);
