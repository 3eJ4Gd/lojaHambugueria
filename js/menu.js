/* ============================================================================
   BRASA BURGER — CARDÁPIO (menu.js)
   ----------------------------------------------------------------------------
   Categorias, busca sem acento, ordenação, disponibilidade e resultado.
   ============================================================================ */
(function (global) {
  'use strict';

  var S = global.Store;
  var U = global.UI;

  var estado = { categoria: 'todos', busca: '', ordem: 'relevancia' };

  function normalizar(t) {
    return String(t || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function produtosVisiveis() {
    return S.produtos().filter(function (p) { return p.visivel !== false; });
  }

  function combina(p, busca) {
    if (!busca) return true;
    var alvo = normalizar([p.nome, p.descricao, (p.ingredientes || []).join(' ')].join(' '));
    return normalizar(busca).split(' ').every(function (palavra) { return alvo.indexOf(palavra) >= 0; });
  }

  function filtrar() {
    var lista = produtosVisiveis().filter(function (p) {
      var catOk = estado.categoria === 'todos' || p.categoria === estado.categoria;
      return catOk && combina(p, estado.busca);
    });

    if (estado.ordem === 'menor') lista.sort(function (a, b) { return a.preco - b.preco; });
    else if (estado.ordem === 'maior') lista.sort(function (a, b) { return b.preco - a.preco; });
    else if (estado.ordem === 'nome') lista.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    else lista.sort(function (a, b) { return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0); });

    return lista;
  }

  function renderChips() {
    var alvo = document.getElementById('chips');
    if (!alvo) return;
    var cats = S.categorias().filter(function (c) { return c.visivel !== false; });
    if (!cats.length) cats = [{ id: 'todos', nome: 'Todos' }];

    alvo.innerHTML = cats.map(function (c) {
      var n = produtosVisiveis().filter(function (p) {
        return c.id === 'todos' ? true : p.categoria === c.id;
      }).length;
      var on = estado.categoria === c.id;
      return '<button class="chip" type="button" data-categoria="' + U.esc(c.id) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
        U.esc(c.nome) + '<span class="chip__conta">' + n + '</span></button>';
    }).join('');
  }

  function renderGrid() {
    var grade = document.getElementById('grade-cardapio');
    var vazio = document.getElementById('sem-resultado');
    var txt = document.getElementById('resultado-texto');
    if (!grade) return;

    var lista = filtrar();
    var total = produtosVisiveis().length;

    grade.innerHTML = lista.map(function (p) { return U.cardProduto(p); }).join('');
    grade.hidden = lista.length === 0;
    if (vazio) vazio.hidden = lista.length !== 0;

    if (txt) {
      var cat = S.categoria(estado.categoria);
      var onde = estado.categoria === 'todos' ? 'no cardápio' : 'em ' + (cat ? cat.nome : estado.categoria);
      var termo = estado.busca ? ' para “' + estado.busca + '”' : '';
      txt.innerHTML = lista.length
        ? '<strong>' + lista.length + '</strong> ' + (lista.length === 1 ? 'produto' : 'produtos') + ' ' + U.esc(onde) + U.esc(termo)
        : 'Nenhum produto encontrado' + U.esc(termo);
    }

    var indisponiveis = total - produtosVisiveis().filter(function (p) { return p.disponivel !== false; }).length;
    var aviso = document.getElementById('aviso-indisponivel');
    if (aviso) aviso.hidden = indisponiveis === 0;
  }

  function render() { renderChips(); renderGrid(); }

  function iniciar() {
    // categoria inicial a partir da âncora (ex.: cardapio.html#combos)
    var hash = (location.hash || '').replace('#', '');
    if (hash && S.categoria(hash)) estado.categoria = hash;

    render();

    var chips = document.getElementById('chips');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var c = e.target.closest('[data-categoria]');
        if (!c) return;
        estado.categoria = c.getAttribute('data-categoria');
        render();
      });
    }

    var busca = document.getElementById('busca');
    var limpar = document.getElementById('busca-limpar');
    if (busca) {
      busca.addEventListener('input', function () {
        estado.busca = busca.value.trim();
        if (limpar) limpar.hidden = !busca.value;
        renderGrid();
      });
      busca.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && busca.value) {
          busca.value = ''; estado.busca = '';
          if (limpar) limpar.hidden = true;
          renderGrid();
        }
      });
    }
    if (limpar) {
      limpar.addEventListener('click', function () {
        busca.value = ''; estado.busca = ''; limpar.hidden = true;
        busca.focus(); renderGrid();
      });
    }

    var ordem = document.getElementById('ordenar');
    if (ordem) {
      ordem.addEventListener('change', function () { estado.ordem = ordem.value; renderGrid(); });
    }

    var limparTudo = document.getElementById('limpar-filtros');
    if (limparTudo) {
      limparTudo.addEventListener('click', function () {
        estado.categoria = 'todos'; estado.busca = ''; estado.ordem = 'relevancia';
        if (busca) busca.value = '';
        if (limpar) limpar.hidden = true;
        if (ordem) ordem.value = 'relevancia';
        render();
      });
    }

    S.on('mudou', function () {
      if (estado.categoria !== 'todos' && !S.categoria(estado.categoria)) estado.categoria = 'todos';
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : this);
