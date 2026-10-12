/* ============================================================================
   BRASA BURGER — PAINEL ADMINISTRATIVO (admin.js)
   ----------------------------------------------------------------------------
   · Login local (sessão em sessionStorage) + 6 seções por hash (#painel, …)
   · CRUD de produtos, categorias, grupos de opções e configuração da loja
   · Gestão de pedidos registrados pelo site
   · Exportar/importar JSON para tornar as alterações permanentes
   · Sem fetch e sem módulos ES: funciona abrindo o site com duplo clique
   ============================================================================ */
(function (global) {
  'use strict';

  var S = global.Store;
  var P = global.Pedidos;
  var U = global.UI;
  var esc = U.esc;
  var no = U.no;

  var SESSAO = 'brasa_admin_sessao';
  var SECOES = ['painel', 'produtos', 'opcoes', 'loja', 'pedidos', 'dados'];

  var IMAGENS = [
    'assets/img/burger-bacon.jpg', 'assets/img/burger-brasa.jpg', 'assets/img/burger-cheddar.jpg',
    'assets/img/burger-costela.jpg', 'assets/img/burger-duplo.jpg', 'assets/img/burger-frango.jpg',
    'assets/img/burger-salada.jpg', 'assets/img/burger-smash.jpg', 'assets/img/burger-supreme.jpg',
    'assets/img/burger-xtudo.jpg', 'assets/img/combo-banner.jpg', 'assets/img/combo-casal.jpg',
    'assets/img/combo-duplo.jpg', 'assets/img/combo-familia.jpg', 'assets/img/combo-individual.jpg',
    'assets/img/combo-trio.jpg', 'assets/img/drink-limonada.jpg', 'assets/img/drink-milkshake.jpg',
    'assets/img/drink-shake-choco.jpg', 'assets/img/drink-suco.jpg', 'assets/img/hero.jpg',
    'assets/img/side-cheddar.jpg', 'assets/img/side-crocante.jpg', 'assets/img/side-rustica.jpg',
    'assets/img/side-temporizada.jpg', 'assets/img/store-ambiente.jpg', 'assets/img/store-interno.jpg',
    'assets/img/story-bacon.jpg', 'assets/img/story-brasa.jpg', 'assets/img/story-carne.jpg',
    'assets/img/story-churrasco.jpg'
  ];

  /* ---------------------------- utilidades ---------------------------- */
  function $(id) { return document.getElementById(id); }
  function $$(sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  }
  function texto(centavos) { return centavos ? S.deCentavosParaTexto(centavos) : ''; }

  function emLinhas(txt) {
    return String(txt || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function idUnico(base, exceto) {
    var id = S.slug(base), n = 2;
    var existe = function (x) { return x.id === id && x.id !== exceto; };
    while (S.db.produtos.some(existe) || S.db.categorias.some(existe) || S.db.grupos.some(existe)) {
      id = S.slug(base) + '-' + n++;
    }
    return id;
  }

  function dataHora(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /* Máscara simples de dinheiro: 3490 → "34,90" ao sair do campo. */
  document.addEventListener('blur', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[data-moeda]') && String(t.value).trim() !== '') {
      t.value = S.deCentavosParaTexto(S.paraCentavos(t.value));
    }
  }, true);

  /* =========================== AUTENTICAÇÃO =========================== */
  function logado() { return !!sessionStorage.getItem(SESSAO); }

  function mostrarTela() {
    var entrou = logado();
    $('tela-login').hidden = entrou;
    $('tela-painel').hidden = !entrou;
    $('btn-sair').hidden = !entrou;
    if (entrou) rotear();
  }

  function montarDicaLogin() {
    var a = S.db.admin || {};
    var padrao = a.usuario === 'admin' && a.senha === 'brasa123';
    var dica = $('login-dica');
    if (padrao) {
      dica.hidden = false;
      dica.innerHTML = '<strong>Credenciais padrão:</strong> admin / brasa123. ' +
        'Troque em <a href="#loja">Loja → Acesso ao painel</a> antes de publicar.';
    } else {
      dica.hidden = true;
    }
  }

  function entrar(e) {
    e.preventDefault();
    var u = $('login-usuario').value.trim();
    var s = $('login-senha').value;
    var a = S.db.admin || {};
    var erro = $('login-erro');
    if (u === a.usuario && s === a.senha) {
      sessionStorage.setItem(SESSAO, u);
      erro.hidden = true;
      $('form-login').reset();
      mostrarTela();
      U.toast('Bem-vindo ao painel.');
    } else {
      erro.hidden = false;
      erro.textContent = 'Usuário ou senha incorretos.';
      $('login-senha').value = '';
      $('login-senha').focus();
    }
  }

  function sair() {
    sessionStorage.removeItem(SESSAO);
    location.hash = '';
    mostrarTela();
    montarDicaLogin();
  }

  /* ============================== ROTEAMENTO ========================== */
  function secaoAtual() {
    var n = (location.hash || '').replace('#', '');
    return SECOES.indexOf(n) >= 0 ? n : 'painel';
  }

  function rotear() {
    if (!logado()) return;
    var nome = secaoAtual();
    $$('.conteudo-painel > section').forEach(function (s) {
      s.classList.toggle('ativa', s.id === 'sec-' + nome);
    });
    $$('.menu-lateral a[data-sec]').forEach(function (a) {
      var on = a.getAttribute('data-sec') === nome;
      a.classList.toggle('ativo', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    renderizar(nome);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderizar(nome) {
    if (nome === 'painel') renderPainel();
    else if (nome === 'produtos') renderProdutos();
    else if (nome === 'opcoes') renderGrupos();
    else if (nome === 'loja') preencherLoja();
    else if (nome === 'pedidos') renderPedidos();
  }

  /* ========================== MODAL GENÉRICO ========================== */
  /* Constrói um .form-modal. aoSalvar(form) retorna false para não fechar. */
  function abrirFormModal(op) {
    var host = $('form-modal-host');
    host.innerHTML = '';
    var el = no(
      '<div class="form-modal" role="dialog" aria-modal="true" aria-labelledby="fm-titulo">' +
        '<div class="form-modal__topo">' +
          '<h3 id="fm-titulo">' + esc(op.titulo) + '</h3>' +
          '<button class="icon-btn" type="button" data-fm-fechar aria-label="Fechar">' + U.icone('fechar') + '</button>' +
        '</div>' +
        '<form class="form-modal__corpo" novalidate>' + op.corpo + '</form>' +
        '<div class="form-modal__pe">' +
          '<button class="btn btn--fantasma btn--peq" type="button" data-fm-cancelar>Cancelar</button>' +
          '<button class="btn btn--ouro btn--peq" type="button" data-fm-salvar>' + esc(op.rotuloSalvar || 'Salvar') + '</button>' +
        '</div>' +
      '</div>'
    );
    host.appendChild(el);
    document.body.classList.add('travado');

    function fechar() {
      host.innerHTML = '';
      document.body.classList.remove('travado');
      document.removeEventListener('keydown', aoTeclar, true);
    }
    function aoTeclar(e) { if (e.key === 'Escape') { e.preventDefault(); fechar(); } }

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-fm-fechar]') || e.target.closest('[data-fm-cancelar]')) { fechar(); return; }
      if (e.target.closest('[data-fm-salvar]')) {
        var ok = op.aoSalvar ? op.aoSalvar(el) : true;
        if (ok !== false) fechar();
      }
    });
    document.addEventListener('keydown', aoTeclar, true);

    var pri = el.querySelector('input, textarea, select');
    if (pri) pri.focus();
    return { el: el, fechar: fechar };
  }

  function valorCampo(el, id) {
    var n = el.querySelector('#' + id);
    return n ? String(n.value).trim() : '';
  }

  /* ============================= VISÃO GERAL ========================= */
  function renderPainel() {
    var prods = S.produtos();
    var visiveis = prods.filter(function (p) { return p.visivel !== false; });
    var pedidos = P.listar();
    var hoje = new Date().toDateString();
    var deHoje = pedidos.filter(function (p) { return new Date(p.criadoEm).toDateString() === hoje; });
    var soma = pedidos.reduce(function (t, p) { return t + (p.total || 0); }, 0);
    var sit = S.situacaoLoja();

    $('stats').innerHTML =
      stat('Produtos no cardápio', String(visiveis.length),
        prods.length - visiveis.length > 0 ? (prods.length - visiveis.length) + ' oculto(s)' : 'todos visíveis') +
      stat('Categorias', String(S.categorias().length), 'seções do cardápio') +
      stat('Pedidos registrados', String(pedidos.length),
        deHoje.length + (deHoje.length === 1 ? ' pedido hoje' : ' pedidos hoje')) +
      stat('Soma dos pedidos', S.brl(soma), 'valores gravados neste navegador') +
      stat('Loja agora', sit.texto, sit.detalhe || 'situação pelo horário configurado');

    var pend = S.pendencias();
    if (!(S.db.admin || {}).senha || (S.db.admin || {}).senha === 'brasa123') {
      pend = pend.concat([{ campo: 'Senha padrão do painel', onde: '#loja' }]);
    }
    var ul = $('pendencias');
    if (!pend.length) {
      ul.innerHTML = '<li class="ok"><span class="bolinha"></span><span>Tudo configurado — nada pendente.</span></li>';
    } else {
      ul.innerHTML = pend.map(function (p) {
        var alvo = (p.onde || '#loja').replace('admin.html', '');
        return '<li><span class="bolinha"></span><span>' + esc(p.campo) + '</span>' +
          '<a href="' + esc(alvo) + '">Configurar</a></li>';
      }).join('');
    }

    var box = $('ultimos-pedidos');
    if (!pedidos.length) {
      box.innerHTML = '<div class="vazio-painel"><strong>Nenhum pedido ainda</strong>' +
        '<p>Quando um cliente concluir o checkout, o pedido aparece aqui e em <a href="#pedidos">Pedidos</a>.</p></div>';
    } else {
      box.innerHTML = pedidos.slice(0, 4).map(linhaPedidoResumo).join('');
    }
  }

  function stat(rotulo, valor, detalhe) {
    return '<div class="stat"><p class="stat__rotulo">' + esc(rotulo) + '</p>' +
      '<p class="stat__valor">' + esc(valor) + '</p>' +
      '<p class="stat__detalhe">' + esc(detalhe || '') + '</p></div>';
  }

  function linhaPedidoResumo(p) {
    var st = P.STATUS[p.status] || P.STATUS.aguardando;
    return '<div class="pedido" style="margin-bottom:10px">' +
      '<div class="pedido__topo">' +
        '<div><span class="pedido__num">' + esc(p.numero) + '</span>' +
          '<span class="pedido__meta"> · ' + esc(dataHora(p.criadoEm)) + '</span>' +
          '<p class="pedido__cliente">' + esc((p.cliente || {}).nome || '—') + ' · ' +
            (p.modo === 'retirada' ? 'Retirada' : 'Entrega') + '</p></div>' +
        '<span class="status-selo status--' + st.cor + '">' + esc(st.rotulo) + '</span>' +
      '</div>' +
      '<div class="pedido__rodape"><span class="pedido__meta">' +
        (p.itens || []).length + ' tipo(s) de item</span>' +
        '<span class="pedido__total">' + S.brl(p.total || 0) + '</span></div>' +
    '</div>';
  }

  /* =============================== PRODUTOS =========================== */
  function renderProdutos() {
    renderCategorias();

    var tbody = $('tabela-produtos').querySelector('tbody');
    var lista = S.produtos();
    $('contagem-produtos').textContent = lista.length + ' cadastrado(s)';

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="vazio-painel"><strong>Sem produtos</strong>' +
        '<p>Clique em “+ Novo produto” para começar o cardápio.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(function (p) {
      var cat = S.categoria(p.categoria);
      var oculto = p.visivel === false;
      var esgotado = p.disponivel === false;
      var selos =
        (oculto ? '<span class="selo selo--inativo">Oculto</span> ' : '') +
        (esgotado ? '<span class="selo selo--inativo">Esgotado</span> ' : '') +
        (p.destaque ? '<span class="selo selo--destaque">Destaque</span> ' : '') +
        (p.promocao ? '<span class="selo selo--promo">Promo</span>' : '') +
        (!oculto && !esgotado && !p.destaque && !p.promocao ? '<span class="selo selo--ativo">Ativo</span>' : '');

      return '<tr data-produto="' + esc(p.id) + '">' +
        '<td><div class="tabela__produto">' +
          '<img src="' + esc(p.imagem) + '" alt="" width="46" height="46" loading="lazy">' +
          '<div><strong>' + esc(p.nome) + '</strong><span>' + esc((p.descricao || '').slice(0, 54)) +
          ((p.descricao || '').length > 54 ? '…' : '') + '</span></div></div></td>' +
        '<td>' + esc(cat ? cat.nome : p.categoria) + '</td>' +
        '<td class="num">' + (p.id === 'combo-montado' ? '<em class="mudo">calculado</em>' : S.brl(p.preco)) + '</td>' +
        '<td>' + selos + '</td>' +
        '<td class="num"><div class="acoes-linha">' +
          '<button class="btn-mini" type="button" data-acao="editar">Editar</button>' +
          '<button class="btn-mini" type="button" data-acao="disponivel">' + (esgotado ? 'Disponibilizar' : 'Esgotar') + '</button>' +
          '<button class="btn-mini" type="button" data-acao="visivel">' + (oculto ? 'Mostrar' : 'Ocultar') + '</button>' +
          '<button class="btn-mini btn-mini--perigo" type="button" data-acao="excluir">Excluir</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function renderCategorias() {
    var tbody = $('tabela-categorias').querySelector('tbody');
    var cats = S.categorias();
    if (!cats.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="vazio-painel"><strong>Sem categorias</strong></div></td></tr>';
      return;
    }
    tbody.innerHTML = cats.map(function (c) {
      var usados = S.produtos().filter(function (p) { return p.categoria === c.id; }).length;
      return '<tr data-categoria="' + esc(c.id) + '">' +
        '<td><input class="campo" type="text" value="' + esc(c.nome) + '" data-campo="nome" aria-label="Nome da categoria" style="min-height:38px"></td>' +
        '<td><code>' + esc(c.id) + '</code><br><span class="pedido__meta">' + usados + ' produto(s)</span></td>' +
        '<td class="num"><input class="campo" type="number" min="0" value="' + (c.ordem || 0) + '" data-campo="ordem" aria-label="Ordem" style="min-height:38px;width:80px;text-align:right"></td>' +
        '<td><label class="checkbox-linha" style="padding:8px 10px"><input type="checkbox" data-campo="visivel"' +
          (c.visivel !== false ? ' checked' : '') + ' aria-label="Visível"></label></td>' +
        '<td class="num"><div class="acoes-linha">' +
          '<button class="btn-mini btn-mini--perigo" type="button" data-acao-cat="excluir">Excluir</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function acaoProduto(e) {
    var btn = e.target.closest('[data-acao]');
    if (btn) {
      var linha = btn.closest('[data-produto]');
      var id = linha.getAttribute('data-produto');
      var p = S.produto(id);
      if (!p) return;
      var acao = btn.getAttribute('data-acao');

      if (acao === 'editar') { abrirProdutoForm(id); return; }

      if (acao === 'disponivel') {
        p.disponivel = p.disponivel === false;
        S.persistir(); renderProdutos();
        U.toast(p.disponivel ? '“' + p.nome + '” disponível.' : '“' + p.nome + '” marcado como esgotado.');
        return;
      }

      if (acao === 'visivel') {
        p.visivel = p.visivel === false;
        S.persistir(); renderProdutos();
        U.toast(p.visivel ? '“' + p.nome + '” visível no cardápio.' : '“' + p.nome + '” oculto do cardápio.');
        return;
      }

      if (acao === 'excluir') {
        var emUso = [];
        S.produtos().forEach(function (o) {
          (o.componentes || []).forEach(function (c) {
            if (c.produtoId === id) emUso.push(o.nome);
          });
        });
        if (emUso.length) {
          U.toast('Em uso por: ' + emUso.join(', ') + '. Remova antes de excluir.', 'erro');
          return;
        }
        U.confirmar('Excluir produto?', '“' + p.nome + '” será removido do cardápio. Esta ação não pode ser desfeita.', 'Excluir')
          .then(function (ok) {
            if (!ok) return;
            S.db.produtos = S.db.produtos.filter(function (x) { return x.id !== id; });
            S.persistir(); renderProdutos();
            U.toast('Produto excluído.');
          });
      }
      return;
    }

    var catBtn = e.target.closest('[data-acao-cat]');
    if (catBtn) {
      var tr = catBtn.closest('[data-categoria]');
      var catId = tr.getAttribute('data-categoria');
      var usando = S.produtos().filter(function (p) { return p.categoria === catId; });
      if (usando.length) {
        U.toast('Há ' + usando.length + ' produto(s) nesta categoria. Mova-os antes de excluir.', 'erro');
        return;
      }
      U.confirmar('Excluir categoria?', 'A categoria “' + catId + '” será removida.', 'Excluir')
        .then(function (ok) {
          if (!ok) return;
          S.db.categorias = S.db.categorias.filter(function (c) { return c.id !== catId; });
          S.persistir(); renderProdutos();
          U.toast('Categoria excluída.');
        });
    }
  }

  function mudouCategoria(e) {
    var campo = e.target.closest('[data-campo]');
    if (!campo) return;
    var tr = campo.closest('[data-categoria]');
    if (!tr) return;
    var c = S.categoria(tr.getAttribute('data-categoria'));
    if (!c) return;
    var nome = campo.getAttribute('data-campo');
    if (nome === 'visivel') c.visivel = campo.checked;
    else if (nome === 'ordem') c.ordem = parseInt(campo.value, 10) || 0;
    else c.nome = campo.value.trim() || c.nome;
    S.persistir();
    U.toast('Categoria atualizada.');
  }

  function novaCategoria() {
    abrirFormModal({
      titulo: 'Nova categoria',
      rotuloSalvar: 'Criar categoria',
      corpo:
        '<div class="campo-grupo"><label class="campo-rotulo" for="cat-nome">Nome</label>' +
        '<input class="campo" type="text" id="cat-nome" placeholder="Ex.: Porções"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="cat-ordem">Ordem de exibição</label>' +
        '<input class="campo" type="number" id="cat-ordem" min="0" value="' + (S.categorias().length) + '">' +
        '<p class="campo-ajuda">Menor número aparece primeiro no cardápio.</p></div>',
      aoSalvar: function (el) {
        var nome = valorCampo(el, 'cat-nome');
        if (!nome) { U.toast('Informe o nome da categoria.', 'erro'); return false; }
        var id = idUnico(nome);
        S.db.categorias.push({
          id: id, nome: nome,
          ordem: parseInt(valorCampo(el, 'cat-ordem'), 10) || 0,
          visivel: true
        });
        S.persistir(); renderProdutos();
        U.toast('Categoria “' + nome + '” criada.');
        return true;
      }
    });
  }

  /* ---------------------- formulário de produto ----------------------- */
  function abrirProdutoForm(id) {
    var p = id ? S.produto(id) : null;
    var cats = S.categorias().filter(function (c) { return c.id !== 'todos'; });
    var novo = !p;
    p = p || {
      id: '', nome: '', descricao: '', ingredientes: [], preco: 0, precoAntigo: null,
      categoria: (cats[0] || {}).id || '', imagem: IMAGENS[0], disponivel: true, visivel: true,
      destaque: false, etiqueta: '', promocao: false, condicaoPromocao: '', grupos: [], componentes: null
    };

    var optsCat = cats.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === p.categoria ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
    }).join('');

    var optsGrupos = S.grupos().map(function (g) {
      var on = (p.grupos || []).indexOf(g.id) >= 0;
      return '<label class="checkbox-linha"><input type="checkbox" name="pf-grupo" value="' + esc(g.id) + '"' +
        (on ? ' checked' : '') + '><span>' + esc(g.nome) + '<small>' + esc(g.tipo === 'remocao' ? 'Remoções gratuitas' :
        'Até ' + g.max + ' escolha(s)') + '</small></span></label>';
    }).join('');

    var corpo =
      '<div class="form-grade">' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-nome">Nome *</label>' +
          '<input class="campo" type="text" id="pf-nome" value="' + esc(p.nome) + '" required></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-categoria">Categoria *</label>' +
          '<select class="campo" id="pf-categoria">' + optsCat + '</select></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-preco">Preço (R$) *</label>' +
          '<input class="campo" type="text" id="pf-preco" data-moeda inputmode="decimal" value="' + texto(p.preco) + '" placeholder="0,00"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-preco-antigo">Preço anterior (R$)</label>' +
          '<input class="campo" type="text" id="pf-preco-antigo" data-moeda inputmode="decimal" value="' + texto(p.precoAntigo) + '" placeholder="vazio = sem referência"></div>' +
      '</div>' +
      '<div class="campo-grupo"><label class="campo-rotulo" for="pf-imagem">Imagem</label>' +
        '<input class="campo" type="text" id="pf-imagem" list="pf-lista-imagens" value="' + esc(p.imagem) + '">' +
        '<datalist id="pf-lista-imagens">' + IMAGENS.map(function (i) { return '<option value="' + i + '">'; }).join('') + '</datalist>' +
        '<p class="campo-ajuda">Caminho relativo da pasta <code>assets/img/</code>. Pré-visualização: ' +
        '<img src="' + esc(p.imagem) + '" alt="" width="40" height="40" style="vertical-align:middle;border-radius:6px;object-fit:cover"></p></div>' +
      '<div class="campo-grupo"><label class="campo-rotulo" for="pf-descricao">Descrição curta</label>' +
        '<textarea class="campo" id="pf-descricao" rows="2">' + esc(p.descricao) + '</textarea></div>' +
      '<div class="campo-grupo"><label class="campo-rotulo" for="pf-ingredientes">Ingredientes (um por linha)</label>' +
        '<textarea class="campo" id="pf-ingredientes" rows="4">' + esc((p.ingredientes || []).join('\n')) + '</textarea></div>' +
      '<div class="form-grade">' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-etiqueta">Etiqueta</label>' +
          '<input class="campo" type="text" id="pf-etiqueta" value="' + esc(p.etiqueta || '') + '" placeholder="Ex.: Mais pedido"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="pf-condicao">Condição da promoção</label>' +
          '<input class="campo" type="text" id="pf-condicao" value="' + esc(p.condicaoPromocao || '') + '"></div>' +
      '</div>' +
      '<div class="grade-checks" style="margin-bottom:16px">' +
        '<label class="checkbox-linha"><input type="checkbox" id="pf-visivel"' + (p.visivel !== false ? ' checked' : '') +
          '><span>Visível no cardápio</span></label>' +
        '<label class="checkbox-linha"><input type="checkbox" id="pf-disponivel"' + (p.disponivel !== false ? ' checked' : '') +
          '><span>Disponível à venda</span></label>' +
        '<label class="checkbox-linha"><input type="checkbox" id="pf-destaque"' + (p.destaque ? ' checked' : '') +
          '><span>Destaque / mais pedido</span></label>' +
        '<label class="checkbox-linha"><input type="checkbox" id="pf-promocao"' + (p.promocao ? ' checked' : '') +
          '><span>Em promoção</span></label>' +
      '</div>' +
      '<h4 class="caixa__titulo" style="font-size:1.05rem">Grupos de opções</h4>' +
      '<div class="grade-checks" style="margin-bottom:16px">' + (optsGrupos || '<p class="campo-ajuda">Nenhum grupo cadastrado.</p>') + '</div>' +
      '<h4 class="caixa__titulo" style="font-size:1.05rem">Componentes (combos)</h4>' +
      '<p class="caixa__sub">Para combos fixos: informe o que vem incluído. O preço avulso é calculado a partir dos produtos escolhidos.</p>' +
      '<div class="mini-lista" id="pf-componentes">' + linhasComponentes(p.componentes) + '</div>' +
      '<button class="btn-mini" type="button" id="pf-add-comp" style="margin-top:10px">+ Adicionar componente</button>';

    var modal = abrirFormModal({
      titulo: novo ? 'Novo produto' : 'Editar produto',
      rotuloSalvar: novo ? 'Criar produto' : 'Salvar alterações',
      corpo: corpo,
      aoSalvar: function (el) { return salvarProduto(el, p); }
    });

    modal.el.querySelector('#pf-add-comp').addEventListener('click', function () {
      var box = modal.el.querySelector('#pf-componentes');
      box.insertAdjacentHTML('beforeend', linhaComponente(null, box.children.length));
    });
  }

  function linhasComponentes(comps) {
    if (!comps || !comps.length) return '';
    return comps.map(function (c, i) { return linhaComponente(c, i); }).join('');
  }

  function linhaComponente(c, i) {
    var opts = S.produtos().map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (c && c.produtoId === p.id ? ' selected' : '') + '>' +
        esc(p.nome) + '</option>';
    }).join('');
    return '<div class="mini-lista__linha" data-comp>' +
      '<select class="campo" data-comp-prod aria-label="Produto componente" style="min-height:40px">' +
        '<option value="">— escolher —</option>' + opts + '</select>' +
      '<input class="campo" type="number" min="1" value="' + (c ? (c.qtd || 1) : 1) + '" data-comp-qtd aria-label="Quantidade" style="min-height:40px">' +
      '<button class="btn-mini btn-mini--perigo" type="button" data-comp-remover aria-label="Remover componente">×</button>' +
    '</div>';
  }

  function salvarProduto(el, original) {
    var nome = valorCampo(el, 'pf-nome');
    var preco = S.paraCentavos(valorCampo(el, 'pf-preco'));
    if (!nome) { U.toast('Informe o nome do produto.', 'erro'); return false; }
    if (preco <= 0 && valorCampo(el, 'pf-preco') !== '' && original.id !== 'combo-montado') {
      U.toast('Informe um preço válido (ex.: 34,90).', 'erro');
      return false;
    }

    var grupos = $$('input[name="pf-grupo"]:checked', el).map(function (i) { return i.value; });
    var componentes = $$('[data-comp]', el).map(function (linha) {
      return {
        produtoId: linha.querySelector('[data-comp-prod]').value,
        qtd: Math.max(1, parseInt(linha.querySelector('[data-comp-qtd]').value, 10) || 1)
      };
    }).filter(function (c) { return c.produtoId; });

    var alvo = original.id ? S.produto(original.id) : null;
    var novoId = !alvo;
    if (novoId) alvo = { id: idUnico(nome) };

    alvo.nome = nome;
    alvo.descricao = valorCampo(el, 'pf-descricao');
    alvo.ingredientes = emLinhas(valorCampo(el, 'pf-ingredientes'));
    alvo.categoria = valorCampo(el, 'pf-categoria');
    alvo.imagem = valorCampo(el, 'pf-imagem') || IMAGENS[0];
    alvo.preco = preco;
    var antigo = valorCampo(el, 'pf-preco-antigo');
    alvo.precoAntigo = antigo ? S.paraCentavos(antigo) : null;
    alvo.etiqueta = valorCampo(el, 'pf-etiqueta');
    alvo.condicaoPromocao = valorCampo(el, 'pf-condicao');
    alvo.visivel = el.querySelector('#pf-visivel').checked;
    alvo.disponivel = el.querySelector('#pf-disponivel').checked;
    alvo.destaque = el.querySelector('#pf-destaque').checked;
    alvo.promocao = el.querySelector('#pf-promocao').checked;
    alvo.grupos = grupos;
    if (componentes.length || original.componentes) alvo.componentes = componentes;

    if (novoId) S.db.produtos.push(alvo);
    S.persistir();
    renderProdutos();
    U.toast(novoId ? 'Produto criado.' : 'Produto atualizado.');
    return true;
  }

  /* ======================== GRUPOS DE OPÇÕES ========================== */
  function renderGrupos() {
    var alvo = $('lista-grupos');
    var grupos = S.grupos();
    if (!grupos.length) {
      alvo.innerHTML = '<div class="caixa"><div class="vazio-painel"><strong>Nenhum grupo</strong>' +
        '<p>Use “+ Novo grupo” para criar adicionais, remoções ou acompanhamentos opcionais.</p></div></div>';
      return;
    }
    alvo.innerHTML = grupos.map(caixaGrupo).join('');
  }

  function caixaGrupo(g) {
    var itens = (g.itens || []).map(function (it, i) { return linhaGrupoItem(it, i); }).join('');
    return '<div class="caixa" data-grupo="' + esc(g.id) + '">' +
      '<h3 class="caixa__titulo">' + esc(g.nome || g.id) +
        '<span class="acoes-linha">' +
          '<button class="btn-mini" type="button" data-acao-grupo="add-item">+ Opção</button>' +
          '<button class="btn-mini btn-mini--perigo" type="button" data-acao-grupo="excluir">Excluir grupo</button>' +
        '</span></h3>' +
      '<div class="form-grade">' +
        '<div class="campo-grupo"><label class="campo-rotulo">Nome do grupo</label>' +
          '<input class="campo" type="text" data-g="nome" value="' + esc(g.nome) + '"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo">Tipo</label>' +
          '<select class="campo" data-g="tipo">' +
            '<option value="multi"' + (g.tipo !== 'remocao' ? ' selected' : '') + '>Adicional (pago)</option>' +
            '<option value="remocao"' + (g.tipo === 'remocao' ? ' selected' : '') + '>Remoção (grátis)</option>' +
          '</select></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo">Mínimo</label>' +
          '<input class="campo" type="number" min="0" data-g="min" value="' + (g.min || 0) + '"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo">Máximo</label>' +
          '<input class="campo" type="number" min="1" data-g="max" value="' + (g.max || 1) + '"></div>' +
      '</div>' +
      '<label class="checkbox-linha" style="margin-bottom:14px"><input type="checkbox" data-g="obrigatorio"' +
        (g.obrigatorio ? ' checked' : '') + '><span>Grupo obrigatório<small>O cliente precisa escolher ao menos uma opção</small></span></label>' +
      '<div class="mini-lista" data-itens>' + (itens || '<p class="campo-ajuda">Nenhuma opção cadastrada.</p>') + '</div>' +
    '</div>';
  }

  function linhaGrupoItem(it, i) {
    return '<div class="mini-lista__linha" data-item="' + i + '">' +
      '<input class="campo" type="text" data-i="nome" value="' + esc(it.nome) + '" aria-label="Nome da opção" style="min-height:40px">' +
      '<input class="campo" type="text" data-i="preco" data-moeda inputmode="decimal" value="' + texto(it.preco) + '" aria-label="Preço" placeholder="0,00" style="min-height:40px">' +
      '<button class="btn-mini btn-mini--perigo" type="button" data-acao-grupo="rem-item">×</button>' +
    '</div>';
  }

  function salvarGrupo(el) {
    var g = S.grupo(el.getAttribute('data-grupo'));
    if (!g) return;
    var val = function (nome) { var n = el.querySelector('[data-g="' + nome + '"]'); return n; };

    var n = val('nome');
    if (n) g.nome = n.value.trim() || g.nome;
    var t = val('tipo'); if (t) g.tipo = t.value;
    var mi = val('min'); if (mi) g.min = Math.max(0, parseInt(mi.value, 10) || 0);
    var ma = val('max'); if (ma) g.max = Math.max(1, parseInt(ma.value, 10) || 1);
    var ob = val('obrigatorio'); if (ob) g.obrigatorio = ob.checked;

    g.itens = $$('[data-item]', el).map(function (linha, i) {
      return {
        id: S.slug(linha.querySelector('[data-i="nome"]').value || 'opcao') + '-' + i,
        nome: linha.querySelector('[data-i="nome"]').value.trim(),
        preco: S.paraCentavos(linha.querySelector('[data-i="preco"]').value)
      };
    }).filter(function (x) { return x.nome; });

    S.persistir();
  }

  function novoGrupo() {
    abrirFormModal({
      titulo: 'Novo grupo de opções',
      rotuloSalvar: 'Criar grupo',
      corpo:
        '<div class="campo-grupo"><label class="campo-rotulo" for="gr-nome">Nome</label>' +
        '<input class="campo" type="text" id="gr-nome" placeholder="Ex.: Escolha o ponto da carne"></div>' +
        '<div class="campo-grupo"><label class="campo-rotulo" for="gr-tipo">Tipo</label>' +
        '<select class="campo" id="gr-tipo"><option value="multi">Adicional (pago)</option>' +
        '<option value="remocao">Remoção (grátis)</option></select></div>',
      aoSalvar: function (el) {
        var nome = valorCampo(el, 'gr-nome');
        if (!nome) { U.toast('Informe o nome do grupo.', 'erro'); return false; }
        var tipo = valorCampo(el, 'gr-tipo');
        S.db.grupos.push({
          id: idUnico(nome), nome: nome, tipo: tipo,
          min: 0, max: tipo === 'remocao' ? 10 : 6, obrigatorio: false, itens: []
        });
        S.persistir(); renderGrupos();
        U.toast('Grupo criado.');
        return true;
      }
    });
  }

  function acaoGrupo(e) {
    var btn = e.target.closest('[data-acao-grupo]');
    if (!btn) return;
    var caixa = btn.closest('[data-grupo]');
    var acao = btn.getAttribute('data-acao-grupo');

    if (acao === 'add-item') {
      var lista = caixa.querySelector('[data-itens]');
      var vazio = lista.querySelector('.campo-ajuda');
      if (vazio) vazio.remove();
      lista.insertAdjacentHTML('beforeend', linhaGrupoItem({ nome: '', preco: 0 }, lista.children.length));
      var novo = lista.lastElementChild.querySelector('input');
      if (novo) novo.focus();
      return;
    }

    if (acao === 'rem-item') {
      btn.closest('[data-item]').remove();
      salvarGrupo(caixa);
      renderGrupos();
      U.toast('Opção removida.');
      return;
    }

    if (acao === 'excluir') {
      var g = S.grupo(caixa.getAttribute('data-grupo'));
      U.confirmar('Excluir grupo?', '“' + (g ? g.nome : '') + '” deixará de aparecer na personalização dos produtos.', 'Excluir')
        .then(function (ok) {
          if (!ok) return;
          S.db.grupos = S.db.grupos.filter(function (x) { return x.id !== caixa.getAttribute('data-grupo'); });
          S.db.produtos.forEach(function (p) {
            p.grupos = (p.grupos || []).filter(function (gid) { return gid !== caixa.getAttribute('data-grupo'); });
          });
          S.persistir(); renderGrupos();
          U.toast('Grupo excluído.');
        });
    }
  }

  /* ================================ LOJA ============================== */
  function preencherLoja() {
    var l = S.loja();
    var e = l.endereco || {};
    var set = function (id, v) { var n = $(id); if (n) n.value = v == null ? '' : v; };

    set('loja-nome', l.nome);
    set('loja-slogan', l.slogan);
    set('loja-whatsapp', l.whatsapp);
    set('loja-telefone', l.telefone);
    set('loja-email', l.email);
    set('loja-mapa', l.linkMapa);
    set('end-logradouro', e.logradouro);
    set('end-complemento', e.complemento);
    set('end-bairro', e.bairro);
    set('end-cidade', e.cidade);
    set('end-uf', e.uf);
    set('end-cep', e.cep);

    set('loja-taxa', texto(l.taxaEntrega));
    set('loja-minimo', texto(l.pedidoMinimo));
    set('loja-tempo', l.tempoEntrega);
    set('loja-pagamentos', (l.pagamentos || []).join('\n'));
    set('loja-bairros', (l.bairrosAtendidos || []).join('\n'));
    set('loja-aviso', l.avisoLoja);

    $('loja-aceita-entrega').checked = !!l.aceitaEntrega;
    $('loja-aceita-retirada').checked = !!l.aceitaRetirada;
    $('loja-fora-horario').checked = !!l.pedidosForaDoHorario;
    $('loja-ilustrativos').checked = !!l.precosIlustrativos;
    ['lbl-entrega', 'lbl-retirada', 'lbl-fora-horario', 'lbl-ilustrativos'].forEach(function (id) {
      var lbl = $(id); if (!lbl) return;
      var cb = lbl.querySelector('input');
      lbl.classList.toggle('checkbox-linha--on', cb.checked);
    });

    var a = S.db.admin || {};
    set('admin-usuario', a.usuario);
    set('admin-senha', a.senha);

    renderHorarios();
  }

  function renderHorarios() {
    var tbody = $('tabela-horarios').querySelector('tbody');
    var hs = S.loja().horarios || [];
    tbody.innerHTML = S.DIAS.map(function (dia, i) {
      var h = hs[i] || { ini: '', fim: '', fechado: false };
      var fechado = !!h.fechado;
      return '<tr data-dia="' + i + '">' +
        '<td><strong>' + esc(dia) + '</strong></td>' +
        '<td><input class="campo" type="time" data-h="ini" value="' + esc(h.ini || '') + '" aria-label="Abre ' + esc(dia) + '" style="min-height:40px"' + (fechado ? ' disabled' : '') + '></td>' +
        '<td><input class="campo" type="time" data-h="fim" value="' + esc(h.fim || '') + '" aria-label="Fecha ' + esc(dia) + '" style="min-height:40px"' + (fechado ? ' disabled' : '') + '></td>' +
        '<td><label class="checkbox-linha" style="padding:8px 10px"><input type="checkbox" data-h="fechado"' +
          (fechado ? ' checked' : '') + ' aria-label="Fechado em ' + esc(dia) + '"></label></td>' +
      '</tr>';
    }).join('');
  }

  function montarHorarios() {
    var hs = [];
    var algum = false;
    $$('#tabela-horarios tbody tr').forEach(function (tr) {
      var ini = tr.querySelector('[data-h="ini"]').value;
      var fim = tr.querySelector('[data-h="fim"]').value;
      var fechado = tr.querySelector('[data-h="fechado"]').checked;
      if (fechado || (!ini && !fim)) { hs.push({ ini: '', fim: '', fechado: true }); return; }
      algum = true;
      hs.push({ ini: ini, fim: fim, fechado: false });
    });
    return algum ? hs : [];
  }

  function salvarLoja(e) {
    e.preventDefault();
    var l = S.loja();
    var get = function (id) { var n = $(id); return n ? String(n.value).trim() : ''; };
    var linhas = function (id) { return emLinhas(get(id)); };

    l.nome = get('loja-nome') || 'Brasa Burger';
    l.slogan = get('loja-slogan');
    l.whatsapp = get('loja-whatsapp').replace(/\D/g, '');
    l.telefone = get('loja-telefone').replace(/\D/g, '');
    l.email = get('loja-email');
    l.linkMapa = get('loja-mapa');

    l.endereco = {
      logradouro: get('end-logradouro'), complemento: get('end-complemento'),
      bairro: get('end-bairro'), cidade: get('end-cidade'),
      uf: get('end-uf').toUpperCase().slice(0, 2), cep: get('end-cep')
    };

    l.horarios = montarHorarios();
    l.aceitaEntrega = $('loja-aceita-entrega').checked;
    l.aceitaRetirada = $('loja-aceita-retirada').checked;
    l.pedidosForaDoHorario = $('loja-fora-horario').checked;
    l.precosIlustrativos = $('loja-ilustrativos').checked;

    l.taxaEntrega = S.paraCentavos(get('loja-taxa'));
    l.pedidoMinimo = S.paraCentavos(get('loja-minimo'));
    l.tempoEntrega = get('loja-tempo');
    l.pagamentos = linhas('loja-pagamentos');
    l.bairrosAtendidos = linhas('loja-bairros');
    l.avisoLoja = get('loja-aviso');

    var usuario = get('admin-usuario') || 'admin';
    var senha = get('admin-senha');
    if (!senha) { U.toast('A senha do painel não pode ficar vazia.', 'erro'); return; }
    var trocou = senha !== (S.db.admin || {}).senha;
    S.db.admin = { usuario: usuario, senha: senha };

    S.persistir();
    preencherLoja();
    montarDicaLogin();
    U.toast('Configurações salvas.' + (trocou ? ' Use as novas credenciais na próxima entrada.' : ''));
  }

  /* =============================== PEDIDOS ============================ */
  function renderPedidos() {
    var alvo = $('lista-pedidos');
    var filtro = $('filtro-status') ? $('filtro-status').value : '';
    var lista = P.listar().filter(function (p) { return !filtro || p.status === filtro; });

    if (!lista.length) {
      alvo.innerHTML = '<div class="caixa"><div class="vazio-painel"><strong>Nenhum pedido nesta lista</strong>' +
        '<p>' + (filtro ? 'Troque o filtro acima.' : 'Os pedidos feitos no site aparecem aqui automaticamente.') + '</p></div></div>';
      return;
    }

    alvo.innerHTML = lista.map(function (p) {
      var st = P.STATUS[p.status] || P.STATUS.aguardando;
      var itens = (p.itens || []).map(function (i) {
        var extra = [];
        if (i.adicionais && i.adicionais.length) extra.push('+ ' + i.adicionais.join(', '));
        if (i.remocoes && i.remocoes.length) extra.push('− ' + i.remocoes.join(', '));
        if (i.obs) extra.push('obs: “' + i.obs + '”');
        return '<li>' + i.qtd + '× ' + esc(i.nome) + ' — ' + S.brl(i.precoUnit * i.qtd) +
          (extra.length ? ' <span class="pedido__meta">(' + esc(extra.join(' · ')) + ')</span>' : '') + '</li>';
      }).join('');

      var endereco = p.modo === 'entrega' && p.endereco
        ? esc([p.endereco.rua, p.endereco.numero, p.endereco.complemento, p.endereco.bairro].filter(Boolean).join(', ')) +
          (p.endereco.referencia ? '<br><span class="pedido__meta">Referência: ' + esc(p.endereco.referencia) + '</span>' : '')
        : 'Retirada no local';

      var opcoes = Object.keys(P.STATUS).map(function (k) {
        return '<option value="' + k + '"' + (k === p.status ? ' selected' : '') + '>' + esc(P.STATUS[k].rotulo) + '</option>';
      }).join('');

      return '<article class="pedido" data-numero="' + esc(p.numero) + '">' +
        '<div class="pedido__topo">' +
          '<div>' +
            '<span class="pedido__num">#' + esc(p.numero) + '</span>' +
            '<span class="pedido__meta"> · ' + esc(dataHora(p.criadoEm)) + '</span>' +
            '<p class="pedido__cliente">' + esc((p.cliente || {}).nome || '—') + ' · ' + esc((p.cliente || {}).telefone || '') + '</p>' +
          '</div>' +
          '<span class="status-selo status--' + st.cor + '">' + esc(st.rotulo) + '</span>' +
        '</div>' +
        '<ul class="pedido__itens">' + itens + '</ul>' +
        '<p class="pedido__itens"><strong>Entrega:</strong> ' + endereco + '<br>' +
          '<strong>Pagamento:</strong> ' + esc(p.pagamento || '—') +
          (p.troco ? ' (troco para ' + esc(p.troco) + ')' : '') +
          (p.observacoes ? '<br><strong>Obs.:</strong> ' + esc(p.observacoes) : '') + '</p>' +
        '<div class="pedido__rodape">' +
          '<div><span class="pedido__meta">Subtotal ' + S.brl(p.subtotal || 0) +
            ' · entrega ' + S.brl(p.taxaEntrega || 0) + '</span>' +
            '<p class="pedido__total">' + S.brl(p.total || 0) + '</p></div>' +
          '<div class="pedido__controles">' +
            '<select class="campo" data-status aria-label="Status do pedido">' + opcoes + '</select>' +
            '<button class="btn-mini btn-mini--perigo" type="button" data-excluir-pedido>Excluir</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function mudouPedido(e) {
    var sel = e.target.closest('[data-status]');
    if (sel) {
      var card = sel.closest('[data-numero]');
      P.atualizarStatus(card.getAttribute('data-numero'), sel.value);
      renderPedidos();
      U.toast('Status atualizado para “' + P.STATUS[sel.value].rotulo + '”.');
      return;
    }
    var excluir = e.target.closest('[data-excluir-pedido]');
    if (excluir) {
      var c = excluir.closest('[data-numero]');
      var numero = c.getAttribute('data-numero');
      U.confirmar('Excluir pedido?', 'O pedido #' + numero + ' será apagado definitivamente deste navegador.', 'Excluir')
        .then(function (ok) {
          if (!ok) return;
          P.remover(numero);
          renderPedidos();
          U.toast('Pedido excluído.');
        });
    }
  }

  /* ================================ DADOS ============================= */
  function baixarJSON() {
    var texto = S.exportarJSON();
    try {
      var blob = new Blob([texto], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'brasa-burger-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      U.toast('Arquivo gerado.');
    } catch (e) {
      copiar(texto);
    }
  }

  function copiar(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () { U.toast('JSON copiado!'); },
        function () { copiarFallback(t); }
      );
    } else copiarFallback(t);
  }

  function copiarFallback(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    U.toast(ok ? 'JSON copiado!' : 'Não foi possível copiar automaticamente.', ok ? 'ok' : 'erro');
  }

  function importar() {
    var caixa = $('json-entrada');
    var t = caixa.value.trim();
    if (!t) { U.toast('Cole um JSON primeiro.', 'erro'); return; }
    try {
      S.importarJSON(t);
      caixa.value = '';
      renderizar(secaoAtual());
      U.toast('Configuração importada.');
    } catch (e) {
      U.toast('JSON inválido: ' + e.message, 'erro');
    }
  }

  /* ================================ INÍCIO ============================ */
  function iniciar() {
    $('form-login').addEventListener('submit', entrar);
    $('btn-sair').addEventListener('click', sair);

    window.addEventListener('hashchange', function () {
      if (logado()) rotear();
    });

    /* atalhos de navegação do painel */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sec-btn]');
      if (b) { location.hash = '#' + b.getAttribute('data-sec-btn'); }
    });

    /* produtos */
    $('btn-novo-produto').addEventListener('click', function () { abrirProdutoForm(null); });
    $('btn-nova-categoria').addEventListener('click', novaCategoria);
    $('tabela-produtos').addEventListener('click', acaoProduto);
    $('tabela-categorias').addEventListener('click', acaoProduto);
    $('tabela-categorias').addEventListener('change', mudouCategoria);

    /* grupos de opções */
    $('btn-novo-grupo').addEventListener('click', novoGrupo);
    $('lista-grupos').addEventListener('click', acaoGrupo);
    $('lista-grupos').addEventListener('change', function (e) {
      var caixa = e.target.closest('[data-grupo]');
      if (caixa) salvarGrupo(caixa);
    });

    /* loja */
    $('form-loja').addEventListener('submit', salvarLoja);
    $('btn-descartar-loja').addEventListener('click', function () {
      preencherLoja();
      U.toast('Alterações descartadas.');
    });
    $('tabela-horarios').addEventListener('change', function (ev) {
      var cb = ev.target.closest('[data-h="fechado"]');
      if (cb) {
        var tr = cb.closest('tr');
        $$('[data-h="ini"],[data-h="fim"]', tr).forEach(function (i) { i.disabled = cb.checked; });
      }
    });
    ['loja-aceita-entrega', 'loja-aceita-retirada', 'loja-fora-horario', 'loja-ilustrativos'].forEach(function (id) {
      var cb = $(id);
      if (!cb) return;
      cb.addEventListener('change', function () {
        cb.closest('.checkbox-linha').classList.toggle('checkbox-linha--on', cb.checked);
      });
    });

    /* pedidos */
    $('filtro-status').addEventListener('change', renderPedidos);
    $('lista-pedidos').addEventListener('change', mudouPedido);
    $('lista-pedidos').addEventListener('click', mudouPedido);

    /* dados */
    $('btn-exportar').addEventListener('click', baixarJSON);
    $('btn-copiar-json').addEventListener('click', function () { copiar(S.exportarJSON()); });
    $('btn-importar').addEventListener('click', importar);
    $('btn-colar').addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(
          function (t) { $('json-entrada').value = t; },
          function () { U.toast('O navegador não permitiu ler a área de transferência.', 'erro'); }
        );
      } else U.toast('Este navegador não oferece leitura automática. Use Ctrl+V.', 'erro');
    });
    $('btn-resetar-loja').addEventListener('click', function () {
      U.confirmar('Apagar alterações?', 'Produtos, categorias, opções e configuração da loja voltarão ao conteúdo padrão do arquivo. Os pedidos não são afetados.', 'Apagar')
        .then(function (ok) {
          if (!ok) return;
          S.resetar();
          renderizar(secaoAtual());
          montarDicaLogin();
          U.toast('Conteúdo padrão restaurado.');
        });
    });
    $('btn-resetar-pedidos').addEventListener('click', function () {
      U.confirmar('Apagar todos os pedidos?', 'Todos os registros de pedido serão removidos deste navegador. Esta ação não pode ser desfeita.', 'Apagar')
        .then(function (ok) {
          if (!ok) return;
          P.limpar();
          renderPedidos();
          U.toast('Pedidos apagados.');
        });
    });

    /* redesenho automático quando os dados mudam */
    S.on('mudou', function () {
      if (!logado()) return;
      var atual = secaoAtual();
      if (atual === 'loja') return;   // evita apagar o que o usuário está digitando
      renderizar(atual);
    });

    montarDicaLogin();
    mostrarTela();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : this);
