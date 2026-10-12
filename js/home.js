/* ============================================================================
   BRASA BURGER — PÁGINA INICIAL (home.js)
   ============================================================================ */
(function (global) {
  'use strict';

  var S = global.Store;
  var C = global.Cart;
  var U = global.UI;

  /* ------------------------- aparecer ao rolar ------------------------- */
  function observarAparecer() {
    var alvos = document.querySelectorAll('.aparecer');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(alvos, function (n) { n.classList.add('visivel'); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    Array.prototype.forEach.call(alvos, function (n) { io.observe(n); });
  }

  /* --------------------------- mais pedidos ---------------------------- */
  function renderMaisPedidos() {
    var alvo = document.getElementById('grade-mais-pedidos');
    if (!alvo) return;
    var lista = S.produtos().filter(function (p) { return p.destaque && p.visivel !== false && p.disponivel !== false; });
    if (lista.length < 4) {
      var extras = S.produtos().filter(function (p) {
        return p.disponivel !== false && p.visivel !== false && lista.indexOf(p) < 0;
      });
      lista = lista.concat(extras).slice(0, 4);
    }
    lista = lista.slice(0, 4);

    alvo.innerHTML = lista.map(function (p) { return U.cardProduto(p); }).join('') ||
      '<p class="sem-ofertas">Nenhum produto cadastrado ainda.</p>';
  }

  /* ---------------------------- montador ------------------------------- */
  var escolhas = [];   // produtoId por passo
  var adicionais = [];

  function passos() {
    var m = S.db.montadorCombo || {};
    return (m.passos || []).filter(function (p) { return p.ativo !== false; });
  }

  function montadorAtivo() {
    var m = S.db.montadorCombo;
    return !!(m && m.ativo && (m.passos || []).length);
  }

  function renderMontador() {
    var alvoPassos = document.getElementById('montador-passos');
    var alvoResumo = document.getElementById('montador-resumo');
    if (!alvoPassos || !alvoResumo) return;

    if (!montadorAtivo()) {
      alvoPassos.innerHTML = '<p class="sem-ofertas">Montador de combo desativado. Ative em painel → Dados.</p>';
      alvoResumo.innerHTML = '';
      return;
    }

    var ps = passos();
    alvoPassos.innerHTML = ps.map(function (passo, i) {
      var opcoes = S.produtos().filter(function (p) {
        return p.categoria === passo.categoria && p.disponivel !== false;
      });
      var itens = opcoes.map(function (p) {
        var on = escolhas[i] === p.id;
        return '<button type="button" class="opcao-combo' + (on ? ' opcao-combo--on' : '') + '"' +
          ' data-passo="' + i + '" data-produto="' + U.esc(p.id) + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<img src="' + U.esc(p.imagem) + '" alt="" width="42" height="42" loading="lazy">' +
          '<span class="opcao-combo__txt">' +
            '<span class="opcao-combo__nome">' + U.esc(p.nome) + '</span>' +
            '<span class="opcao-combo__preco">' + S.brl(p.preco) + '</span>' +
          '</span>' +
        '</button>';
      }).join('');

      return '<section class="passo">' +
        '<div class="passo__topo">' +
          '<span class="passo__num" aria-hidden="true">' + (i + 1) + '</span>' +
          '<h3 class="passo__rotulo">' + U.esc(passo.rotulo) + '</h3>' +
        '</div>' +
        '<div class="passo__opcoes">' +
          (itens || '<p class="mudo" style="font-size:.84rem">Nenhum item nesta categoria.</p>') +
        '</div>' +
      '</section>';
    }).join('');

    // adicionais do combo
    var grupos = (S.db.montadorCombo && S.db.montadorCombo.grupos) || [];
    var htmlAdic = grupos.map(function (gid) {
      var g = S.grupo(gid);
      if (!g) return '';
      return '<section class="passo">' +
        '<div class="passo__topo">' +
          '<span class="passo__num" aria-hidden="true">+</span>' +
          '<h3 class="passo__rotulo">Adicionais (opcional)</h3>' +
        '</div>' +
        '<div class="passo__opcoes">' +
          (g.itens || []).map(function (it) {
            var on = adicionais.some(function (a) { return a.id === it.id; });
            return '<button type="button" class="opcao-combo' + (on ? ' opcao-combo--on' : '') + '"' +
              ' data-adicional="' + U.esc(it.id) + '" data-grupo="' + U.esc(g.id) + '"' +
              ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
              '<span class="opcao-combo__txt">' +
                '<span class="opcao-combo__nome">' + U.esc(it.nome) + '</span>' +
                '<span class="opcao-combo__preco">+ ' + S.brl(it.preco) + '</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</section>';
    }).join('');

    alvoPassos.innerHTML += htmlAdic;
    renderResumo();
  }

  function itensSelecionados() {
    return escolhas.map(function (id) { return id ? S.produto(id) : null; });
  }

  function totalCombo() {
    var t = 0;
    itensSelecionados().forEach(function (p) { if (p) t += p.preco; });
    adicionais.forEach(function (a) { t += a.preco; });
    return t;
  }

  function renderResumo() {
    var alvoResumo = document.getElementById('montador-resumo');
    var btn = document.getElementById('montador-adicionar');
    var dica = document.getElementById('montador-dica');
    if (!alvoResumo || !btn) return;

    var ps = passos();
    var sel = itensSelecionados();
    var completo = sel.length === ps.length && sel.every(Boolean);

    alvoResumo.innerHTML = ps.map(function (passo, i) {
      var p = sel[i];
      return '<p class="resumo-item' + (p ? '' : ' resumo-item--vazio') + '">' +
        '<span>' + U.esc(passo.rotulo.replace(/^(Escolha o |Escolha a )/, '')) + '</span>' +
        '<span>' + (p ? U.esc(p.nome) + ' · ' + S.brl(p.preco) : '—') + '</span>' +
      '</p>';
    }).join('') +
    (adicionais.length
      ? adicionais.map(function (a) {
          return '<p class="resumo-item"><span>+ ' + U.esc(a.nome) + '</span><span>' + S.brl(a.preco) + '</span></p>';
        }).join('')
      : '') +
    '<div class="resumo-total"><span>Total do combo</span><strong>' + S.brl(totalCombo()) + '</strong></div>';

    btn.disabled = !completo;
    btn.textContent = completo ? 'Adicionar combo ao pedido' : 'Escolha os ' + ps.length + ' itens';
    if (dica) {
      dica.textContent = completo
        ? 'Valor calculado a partir dos preços do cardápio.'
        : 'Selecione ' + ps.map(function (p) { return p.rotulo.toLowerCase().replace('escolha o ', '').replace('escolha a ', ''); }).join(', ') + '.';
    }
  }

  function aoClicarMontador(e) {
    var opt = e.target.closest('[data-passo]');
    if (opt) {
      var i = parseInt(opt.getAttribute('data-passo'), 10);
      var id = opt.getAttribute('data-produto');
      escolhas[i] = escolhas[i] === id ? null : id;
      renderMontador();
      return;
    }
    var ad = e.target.closest('[data-adicional]');
    if (ad) {
      var aid = ad.getAttribute('data-adicional');
      var g = S.grupo(ad.getAttribute('data-grupo'));
      var item = ((g && g.itens) || []).filter(function (x) { return x.id === aid; })[0];
      if (!item) return;
      var idx = -1;
      adicionais.forEach(function (a, k) { if (a.id === aid) idx = k; });
      if (idx >= 0) adicionais.splice(idx, 1);
      else {
        if (g && g.max && adicionais.length >= g.max) { U.toast('Máximo de ' + g.max + ' adicionais.', 'erro'); return; }
        adicionais.push({ id: item.id, nome: item.nome, preco: item.preco || 0 });
      }
      renderMontador();
      return;
    }
    if (e.target.closest('#montador-adicionar')) {
      if (!escolhas.every(Boolean)) return;
      var componentes = itensSelecionados().map(function (p) { return { nome: p.nome, qtd: 1 }; });
      try {
        C.adicionar({
          produtoId: 'combo-montado',
          nomeItem: 'Combo montado',
          precoBase: totalCombo(),
          qtd: 1,
          adicionais: adicionais.slice(),
          remocoes: [],
          componentes: componentes,
          obs: ''
        });
        U.toast('Combo adicionado ao pedido!');
        U.abrirCarrinho();
      } catch (err) { U.toast(err.message, 'erro'); }
    }
  }

  /* ------------------------------ marca -------------------------------- */
  function renderMarca() {
    var m = S.marca();
    var texto = document.getElementById('marca-texto');
    if (texto) texto.textContent = m.texto || '';

    var mosaico = document.getElementById('marca-mosaico');
    if (mosaico) {
      var padroes = [
        { cls: 'marca-mosaico__grande', legenda: 'Ingredientes selecionados' },
        { cls: 'marca-mosaico__peq', legenda: 'Preparo na chapa' },
        { cls: 'marca-mosaico__peq', legenda: 'Detalhes do preparo' }
      ];
      var imgs = m.imagens || [];
      mosaico.innerHTML = imgs.map(function (it, i) {
        var src = typeof it === 'string' ? it : it.src;
        var legenda = typeof it === 'string' ? (padroes[i] ? padroes[i].legenda : '') : (it.legenda || '');
        var cfg = padroes[i] || padroes[padroes.length - 1];
        return '<figure class="' + cfg.cls + '">' +
          '<img src="' + U.esc(src) + '" alt="' + U.esc(legenda) + '" loading="lazy" decoding="async">' +
          (legenda ? '<figcaption class="marca-mosaico__legenda">' + U.esc(legenda) + '</figcaption>' : '') +
        '</figure>';
      }).join('');
    }

    var passosEl = document.getElementById('marca-passos');
    if (passosEl) {
      passosEl.innerHTML = (m.passos || []).map(function (p, i) {
        return '<article class="passo-card">' +
          '<h4><span class="dourado">0' + (i + 1) + '</span> ' + U.esc(p.titulo) + '</h4>' +
          '<p>' + U.esc(p.texto) + '</p>' +
        '</article>';
      }).join('');
    }

    var dif = document.getElementById('marca-diferenciais');
    if (dif) {
      dif.innerHTML = (m.diferenciais || []).map(function (d, i) {
        return '<article class="diferencial">' +
          '<p class="diferencial__num">' + (i < 9 ? '0' : '') + (i + 1) + '</p>' +
          '<h4>' + U.esc(d.titulo) + '</h4>' +
          '<p>' + U.esc(d.texto) + '</p>' +
        '</article>';
      }).join('');
    }
  }

  /* ----------------------------- ofertas ------------------------------- */
  function renderOfertas() {
    var grade = document.getElementById('grade-ofertas');
    var vazio = document.getElementById('sem-ofertas');
    if (!grade) return;

    var lista = S.produtos().filter(function (p) { return p.promocao === true && p.visivel !== false; });
    grade.innerHTML = lista.map(function (p) {
      var avulso = S.somaComponentes(p);
      return '<article class="card-oferta" data-produto="' + U.esc(p.id) + '">' +
        '<div class="card-oferta__media">' +
          '<img src="' + U.esc(p.imagem) + '" alt="' + U.esc(p.nome) + '" loading="lazy" decoding="async">' +
        '</div>' +
        '<div class="card-oferta__corpo">' +
          (p.etiqueta ? '<p class="kicker">' + U.esc(p.etiqueta) + '</p>' : '<p class="kicker">Oferta</p>') +
          '<h3 class="card-oferta__nome">' + U.esc(p.nome) + '</h3>' +
          '<p class="card-oferta__desc">' + U.esc(p.descricao) + '</p>' +
          (p.condicaoPromocao ? '<p class="card-oferta__condicao">' + U.esc(p.condicaoPromocao) + '</p>' : '') +
          '<div class="card-oferta__acoes">' +
            '<p class="preco">' +
              (p.precoAntigo > p.preco ? '<s>' + S.brl(p.precoAntigo) + '</s>' : '') +
              '<strong>' + S.brl(p.preco) + '</strong>' +
            '</p>' +
            (avulso > p.preco ? '<span class="mudo" style="font-size:.78rem">Avulso ' + S.brl(avulso) + '</span>' : '') +
            '<button class="btn btn--ouro btn--peq" type="button" data-add="' + U.esc(p.id) + '"' +
              (p.disponivel === false ? ' disabled' : '') + '>' +
              (p.disponivel === false ? 'Indisponível' : 'Adicionar') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    if (vazio) vazio.classList.toggle('oculto', lista.length > 0);
    grade.classList.toggle('oculto', lista.length === 0);
  }

  /* ------------------------------- início ------------------------------ */
  function iniciar() {
    renderMaisPedidos();
    renderMontador();
    renderMarca();
    renderOfertas();
    observarAparecer();

    var montador = document.getElementById('montador-passos');
    if (montador) montador.addEventListener('click', aoClicarMontador);
    var btnAdd = document.getElementById('montador-adicionar');
    if (btnAdd) btnAdd.addEventListener('click', aoClicarMontador);

    S.on('mudou', function () {
      escolhas = escolhas.filter(function (id) { return !id || S.produto(id); });
      adicionais = adicionais.filter(function (a) {
        var g = S.grupo('adicionais');
        return g && (g.itens || []).some(function (i) { return i.id === a.id; });
      });
      renderMaisPedidos(); renderMontador(); renderMarca(); renderOfertas();
      observarAparecer();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : this);
