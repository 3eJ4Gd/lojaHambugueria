/* ============================================================================
   BRASA BURGER — CHECKOUT (checkout.js)
   ----------------------------------------------------------------------------
   Fluxo em 4 etapas: identificação → recebimento → pagamento → confirmação.
   O pedido é registrado localmente e a mensagem é enviada pelo WhatsApp.
   Registrar/abrir o WhatsApp NÃO confirma o pedido.
   ============================================================================ */
(function (global) {
  'use strict';

  var S = global.Store;
  var C = global.Cart;
  var U = global.UI;
  var P = global.Pedidos;

  var etapa = 1;
  var dados = {
    nome: '', telefone: '', email: '',
    modo: '', rua: '', numero: '', complemento: '', bairro: '', referencia: '',
    pagamento: '', troco: '', obsGeral: ''
  };
  var jaEnviado = false;

  function $(id) { return document.getElementById(id); }
  function texto(id) { var n = $(id); return n ? n.value.trim() : ''; }

  /* ============================== RESUMO =============================== */
  function descreverItem(i) {
    var linhas = [];
    (i.componentes || []).forEach(function (c) { linhas.push(c.nome + (c.qtd > 1 ? ' ×' + c.qtd : '')); });
    (i.adicionais || []).forEach(function (a) { linhas.push(a.nome + ' (' + S.brl(a.preco) + ')'); });
    (i.remocoes || []).forEach(function (r) { linhas.push(r.nome); });
    return linhas;
  }

  function renderResumo() {
    var alvoItens = $('resumo-itens');
    var alvoTotais = $('resumo-totais');
    if (!alvoItens || !alvoTotais) return;

    var itens = C.itens();
    if (!itens.length) { alvoItens.innerHTML = '<p class="resumo-vazio">Nenhum item no pedido.</p>'; alvoTotais.innerHTML = ''; return; }

    alvoItens.innerHTML = itens.map(function (i) {
      var d = descreverItem(i);
      return '<article class="res-item" data-uid="' + U.esc(i.uid) + '">' +
        '<p class="res-item__nome"><span class="res-item__qtd">' + i.qtd + '×</span> ' + U.esc(i.nome) + '</p>' +
        '<p class="res-item__preco">' + S.brl(C.linha(i) * i.qtd) + '</p>' +
        (d.length ? '<ul class="res-item__det">' + d.map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (i.obs ? '<p class="res-item__obs">Obs: ' + U.esc(i.obs) + '</p>' : '') +
        '<div class="res-item__controles">' +
          '<div class="stepper" role="group" aria-label="Quantidade de ' + U.esc(i.nome) + '">' +
            '<button type="button" class="stepper__btn" data-menos aria-label="Diminuir">' + U.icone('menos') + '</button>' +
            '<span class="stepper__valor">' + i.qtd + '</span>' +
            '<button type="button" class="stepper__btn" data-mais aria-label="Aumentar">' + U.icone('mais') + '</button>' +
          '</div>' +
          '<button type="button" class="linha-item__remover" data-remover>' + U.icone('lixeira') + '<span>Remover</span></button>' +
        '</div>' +
      '</article>';
    }).join('');

    var e = C.entrega(dados.modo || 'entrega');
    var mostraEntrega = dados.modo === 'retirada' ? 'Retirada (R$ 0,00)' : (e.disponivel ? e.texto : '—');

    alvoTotais.innerHTML =
      '<p class="resumo-linha"><span>Subtotal</span><strong>' + S.brl(C.subtotal()) + '</strong></p>' +
      '<p class="resumo-linha"><span>Entrega</span><strong id="resumo-entrega">' + U.esc(mostraEntrega) + '</strong></p>' +
      (S.loja().pedidoMinimo && dados.modo === 'entrega'
        ? '<p class="resumo-linha"><span>Pedido mínimo</span><strong>' + S.brl(S.loja().pedidoMinimo) + '</strong></p>' : '') +
      '<p class="resumo-linha resumo-linha--total"><span>Total estimado</span><strong id="resumo-total">' + S.brl(C.total(dados.modo || 'entrega')) + '</strong></p>';
  }

  function aoClicarResumo(e) {
    var item = e.target.closest('.res-item');
    if (!item) return;
    var uid = item.getAttribute('data-uid');
    var it = C.itens().filter(function (x) { return x.uid === uid; })[0];
    if (!it) return;
    if (e.target.closest('[data-mais]')) C.atualizar(uid, { qtd: it.qtd + 1 });
    else if (e.target.closest('[data-menos]')) { it.qtd <= 1 ? C.remover(uid) : C.atualizar(uid, { qtd: it.qtd - 1 }); }
    else if (e.target.closest('[data-remover]')) C.remover(uid);
    else return;
    renderResumo();
    atualizarAvisos();
  }

  /* ============================ ETAPAS ================================= */
  function mostrarEtapa(n) {
    etapa = n;
    Array.prototype.forEach.call(document.querySelectorAll('.etapa'), function (s) {
      s.hidden = parseInt(s.getAttribute('data-etapa'), 10) !== n;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.progresso__passo'), function (li) {
      var p = parseInt(li.getAttribute('data-passo'), 10);
      li.classList.toggle('progresso__passo--ativo', p === n);
      li.classList.toggle('progresso__passo--feito', p < n);
    });
    var topo = document.querySelector('.topo-checkout');
    if (topo) topo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var foco = document.querySelector('.etapa:not([hidden]) input, .etapa:not([hidden]) button');
    if (foco) setTimeout(function () { try { foco.focus({ preventScroll: true }); } catch (e) { } }, 260);
  }

  function limparErros(n) {
    var caixa = $('erro-etapa-' + n);
    if (caixa) { caixa.hidden = true; caixa.innerHTML = ''; }
    Array.prototype.forEach.call(document.querySelectorAll('.campo-erro'), function (p) { p.hidden = true; p.textContent = ''; });
    Array.prototype.forEach.call(document.querySelectorAll('.campo-erro-campo'), function (c) { c.classList.remove('campo-erro-campo'); });
  }

  function marcarErro(campo, msg) {
    var inp = campo ? $(campo) : null;
    var p = campo ? $('erro-' + campo) : null;
    if (inp) inp.classList.add('campo-erro-campo');
    if (p) { p.textContent = msg; p.hidden = false; }
  }

  function mostrarErros(n, lista) {
    var caixa = $('erro-etapa-' + n);
    if (!caixa) return;
    if (!lista.length) { caixa.hidden = true; caixa.innerHTML = ''; return; }
    caixa.hidden = false;
    caixa.innerHTML = '<strong>Revise os campos destacados:</strong><ul>' +
      lista.map(function (m) { return '<li>' + U.esc(m) + '</li>'; }).join('') + '</ul>';
  }

  function coletar() {
    dados.nome = texto('nome');
    dados.telefone = texto('telefone');
    dados.email = texto('email');
    dados.rua = texto('rua');
    dados.numero = texto('numero');
    dados.complemento = texto('complemento');
    dados.referencia = texto('referencia');
    dados.troco = texto('troco');
    dados.obsGeral = texto('obs-geral');

    var b = $('bairro');
    if (b) {
      if (b.tagName === 'SELECT' && b.value === '__outro') {
        dados.bairro = (($('bairro-outro') || {}).value || '').trim();
      } else {
        dados.bairro = b.value.trim();
      }
    }
  }

  function validar(n) {
    coletar();
    limparErros(n);
    var erros = [];

    if (n === 1) {
      if (dados.nome.length < 3) { erros.push('Informe seu nome completo.'); marcarErro('nome', 'Informe seu nome completo (mínimo 3 letras).'); }
      var digitos = dados.telefone.replace(/\D/g, '');
      if (digitos.length < 10 || digitos.length > 11) { erros.push('Informe um telefone válido com DDD.'); marcarErro('telefone', 'Digite o número com DDD, ex.: (11) 99999-9999.'); }
      if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) { erros.push('E-mail inválido.'); marcarErro('email', 'E-mail com formato inválido.'); }
    }

    if (n === 2) {
      if (dados.modo !== 'entrega' && dados.modo !== 'retirada') { erros.push('Escolha entre entrega ou retirada.'); }
      if (dados.modo === 'entrega') {
        if (!dados.rua) { erros.push('Informe o endereço.'); marcarErro('rua', 'Rua ou avenida é obrigatório.'); }
        if (!dados.numero) { erros.push('Informe o número.'); marcarErro('numero', 'Número é obrigatório.'); }
        if (!dados.bairro) { erros.push('Informe o bairro.'); marcarErro('bairro', 'Selecione ou informe o bairro.'); }
        var l = S.loja();
        if (l.aceitaEntrega && l.bairrosAtendidos && l.bairrosAtendidos.length && dados.bairro && !l.bairrosAtendidos.includes(dados.bairro)) {
          erros.push('Bairro fora da área atendida.');
          marcarErro('bairro', 'Este bairro não está na área atendida. Escolha um dos bairros listados.');
        }
      }
    }

    if (n === 3) {
      if (!dados.pagamento) { erros.push('Escolha a forma de pagamento.'); var ep = $('erro-pagamento'); if (ep) { ep.textContent = 'Escolha uma forma de pagamento.'; ep.hidden = false; } }
    }

    mostrarErros(n, erros);
    return erros.length === 0;
  }

  /* ========================= MODALIDADE E PAGAMENTO ==================== */
  function renderModos() {
    var l = S.loja();
    var alvo = $('escolhas-modo');
    if (!alvo) return;

    var html = '';
    if (l.aceitaEntrega) {
      var taxa = l.taxaEntrega ? S.brl(l.taxaEntrega) : 'taxa não configurada';
      var tempo = l.tempoEntrega ? ' · ' + l.tempoEntrega : '';
      html += escolhaHtml('entrega', 'Entrega no endereço', taxa + tempo, dados.modo === 'entrega');
    }
    if (l.aceitaRetirada) {
      html += escolhaHtml('retirada', 'Retirada no local', (l.endereco && l.endereco.logradouro) ? l.endereco.logradouro : 'Endereço não configurado', dados.modo === 'retirada');
    }
    if (!html) html = '<p class="mudo">Nenhuma modalidade habilitada. Configure em painel → Loja.</p>';
    alvo.innerHTML = html;

    if (dados.modo === 'retirada' || (!l.aceitaEntrega && l.aceitaRetirada)) {
      if (!dados.modo) dados.modo = 'retirada';
    }
    if (!l.aceitaEntrega) dados.modo = 'retirada';

    $('bloco-entrega').hidden = dados.modo !== 'entrega';
    $('bloco-retirada').hidden = dados.modo !== 'retirada';
    renderBairro();
  }

  function escolhaHtml(valor, titulo, sub, on) {
    return '<label class="escolha' + (on ? ' escolha--on' : '') + '">' +
      '<input type="radio" name="modo" value="' + valor + '"' + (on ? ' checked' : '') + '>' +
      '<span class="escolha__marca" aria-hidden="true"></span>' +
      '<span class="escolha__txt"><strong>' + U.esc(titulo) + '</strong><span>' + U.esc(sub) + '</span></span>' +
    '</label>';
  }

  function renderBairro() {
    var l = S.loja();
    var holder = $('grupo-bairro');
    if (!holder) return;
    var atual = dados.bairro;
    var bairros = (l.bairrosAtendidos || []);

    if (bairros.length) {
      holder.innerHTML =
        '<label class="campo-rotulo" for="bairro">Bairro *</label>' +
        '<select class="campo" id="bairro" required>' +
          '<option value="">Selecione o bairro</option>' +
          bairros.map(function (b) { return '<option value="' + U.esc(b) + '"' + (atual === b ? ' selected' : '') + '>' + U.esc(b) + '</option>'; }).join('') +
          '<option value="__outro"' + (atual && bairros.indexOf(atual) < 0 ? ' selected' : '') + '>Outro bairro</option>' +
        '</select>' +
        '<p class="campo-erro" id="erro-bairro" hidden></p>' +
        '<div id="bairro-outro-holder" class="campo-grupo mt-1"' + (atual && bairros.indexOf(atual) < 0 && atual !== '__outro' ? '' : ' hidden') + '>' +
          '<input class="campo" type="text" id="bairro-outro" placeholder="Digite o nome do bairro" value="' +
            U.esc(atual && bairros.indexOf(atual) < 0 && atual !== '__outro' ? atual : '') + '">' +
        '</div>';
    } else {
      holder.innerHTML =
        '<label class="campo-rotulo" for="bairro">Bairro *</label>' +
        '<input class="campo" type="text" id="bairro" placeholder="Informe seu bairro" value="' + U.esc(atual) + '">' +
        '<p class="campo-erro" id="erro-bairro" hidden></p>' +
        '<p class="campo-ajuda">Nenhum bairro cadastrado. Configure em painel → Loja → Bairros atendidos.</p>';
    }
  }

  function aoTrocarBairro() {
    var sel = $('bairro');
    if (!sel) return;
    if (sel.tagName === 'SELECT') {
      var holder = $('bairro-outro-holder');
      if (sel.value === '__outro') {
        holder.hidden = false;
        dados.bairro = ($('bairro-outro') || {}).value || '';
        setTimeout(function () { var o = $('bairro-outro'); if (o) o.focus(); }, 40);
      } else {
        if (holder) holder.hidden = true;
        dados.bairro = sel.value;
      }
    } else {
      dados.bairro = sel.value;
    }
  }

  function precisaTroco() {
    return /dinheiro|esp[eé]cie|especie|nota/i.test(dados.pagamento || '');
  }

  function renderPagamentos() {
    var l = S.loja();
    var alvo = $('escolhas-pagamento');
    if (!alvo) return;
    var lista = l.pagamentos && l.pagamentos.length ? l.pagamentos.slice() : ['A combinar com a loja'];

    alvo.innerHTML = lista.map(function (p) {
      var on = dados.pagamento === p;
      return '<label class="escolha' + (on ? ' escolha--on' : '') + '">' +
        '<input type="radio" name="pagamento" value="' + U.esc(p) + '"' + (on ? ' checked' : '') + '>' +
        '<span class="escolha__marca" aria-hidden="true"></span>' +
        '<span class="escolha__txt"><strong>' + U.esc(p) + '</strong></span>' +
      '</label>';
    }).join('');

    var aviso = $('erro-pagamento');
    if (aviso && !(l.pagamentos && l.pagamentos.length)) {
      aviso.hidden = false;
      aviso.className = 'campo-ajuda';
      aviso.textContent = 'Nenhuma forma de pagamento configurada. Cadastre em painel → Loja → Pagamentos.';
    } else if (aviso) { aviso.hidden = true; aviso.className = 'campo-erro'; }

    $('grupo-troco').hidden = !precisaTroco();
  }

  /* ============================== AVISOS =============================== */
  function lojaFechadaBloqueia() {
    var l = S.loja();
    if (!S.horariosConfigurados()) return false;
    if (l.pedidosForaDoHorario) return false;
    var s = S.situacaoLoja();
    return s.aberto === false;
  }

  function atualizarAvisos() {
    var l = S.loja();

    var aw = $('aviso-whatsapp');
    if (aw) aw.hidden = !!l.whatsapp;

    var af = $('aviso-fechado');
    if (af) {
      var bloqueia = lojaFechadaBloqueia();
      af.hidden = !bloqueia;
      if (bloqueia) {
        var s = S.situacaoLoja();
        $('aviso-fechado-texto').textContent = ' ' + (s.detalhe || '') + '. Pedidos fora do horário estão desativados no painel.';
      }
    }

    var am = $('aviso-minimo');
    if (am) {
      var minimo = l.pedidoMinimo && dados.modo === 'entrega' && C.subtotal() < l.pedidoMinimo;
      am.hidden = !minimo;
      if (minimo) $('aviso-minimo-texto').textContent = ' O pedido mínimo para entrega é ' + S.brl(l.pedidoMinimo) + ' (faltam ' + S.brl(l.pedidoMinimo - C.subtotal()) + ').';
    }

    var btn = $('btn-enviar');
    if (btn) {
      var faltaMinimo = !!(l.pedidoMinimo && dados.modo === 'entrega' && C.subtotal() < l.pedidoMinimo);
      var bloqueado = lojaFechadaBloqueia() || faltaMinimo;
      var pode = !!l.whatsapp && !bloqueado;
      btn.disabled = !pode || jaEnviado;
      btn.innerHTML = l.whatsapp
        ? U.icone('whatsapp') + ' Enviar pedido pelo WhatsApp'
        : 'Registrar pedido e copiar mensagem';
      if (!l.whatsapp) { btn.disabled = jaEnviado; }

      /* Assim que o motivo do bloqueio desaparece (carrinho acima do mínimo,
         loja aberta de novo), a mensagem de erro da última etapa some. */
      var caixaErro = $('erro-etapa-4');
      if (caixaErro && !bloqueado) {
        caixaErro.hidden = true;
        caixaErro.innerHTML = '';
      }
    }
  }

  /* ============================ MENSAGEM =============================== */
  function montarMensagem(numero) {
    var l = S.loja();
    var linhas = [];
    linhas.push('*' + String(l.nome).toUpperCase() + ' — NOVO PEDIDO*');
    linhas.push('Pedido: *#' + numero + '*');
    linhas.push('');
    linhas.push('*CLIENTE*');
    linhas.push('Nome: ' + dados.nome);
    linhas.push('Telefone: ' + dados.telefone);
    if (dados.email) linhas.push('E-mail: ' + dados.email);
    linhas.push('');

    linhas.push('*ITENS*');
    C.itens().forEach(function (i) {
      linhas.push(i.qtd + 'x ' + i.nome + ' — ' + S.brl(C.linha(i) * i.qtd));
      (i.componentes || []).forEach(function (c) { linhas.push('   • ' + c.nome + (c.qtd > 1 ? ' ×' + c.qtd : '')); });
      (i.adicionais || []).forEach(function (a) { linhas.push('   + ' + a.nome + ' (' + S.brl(a.preco) + ')'); });
      (i.remocoes || []).forEach(function (r) { linhas.push('   − ' + r.nome); });
      if (i.obs) linhas.push('   Obs: ' + i.obs);
    });
    linhas.push('');

    linhas.push('*RECEBIMENTO*');
    if (dados.modo === 'entrega') {
      linhas.push('Modalidade: Entrega');
      linhas.push('Endereço: ' + dados.rua + ', ' + dados.numero + (dados.complemento ? ' — ' + dados.complemento : ''));
      linhas.push('Bairro: ' + dados.bairro);
      if (dados.referencia) linhas.push('Referência: ' + dados.referencia);
    } else {
      linhas.push('Modalidade: Retirada no local');
    }
    linhas.push('');

    linhas.push('*PAGAMENTO*');
    linhas.push(dados.pagamento || 'A combinar');
    if (dados.troco) linhas.push('Troco para: ' + dados.troco);
    linhas.push('');

    linhas.push('*VALORES*');
    linhas.push('Subtotal: ' + S.brl(C.subtotal()));
    var e = C.entrega(dados.modo);
    linhas.push('Entrega: ' + (dados.modo === 'retirada' ? 'R$ 0,00 (retirada)' : (e.disponivel ? e.texto : '—')));
    linhas.push('*TOTAL: ' + S.brl(C.total(dados.modo)) + '*');
    if (dados.obsGeral) { linhas.push(''); linhas.push('*OBSERVAÇÕES*'); linhas.push(dados.obsGeral); }

    linhas.push('');
    linhas.push('_Pedido enviado pelo site. Aguardando confirmação da loja._');
    if (l.precosIlustrativos) linhas.push('_Preços de demonstração — configurar no painel._');

    return linhas.join('\n');
  }

  function atualizarPrevia() {
    var alvo = $('texto-whatsapp');
    if (!alvo) return;
    alvo.textContent = montarMensagem(P.proximoNumero());
  }

  /* ============================= REVISÃO =============================== */
  function renderRevisao() {
    var alvo = $('bloco-revisao');
    if (!alvo) return;
    var l = S.loja();
    var linhas = [
      ['Cliente', dados.nome],
      ['Contato', dados.telefone],
      dados.email ? ['E-mail', dados.email] : null,
      ['Recebimento', dados.modo === 'entrega'
        ? 'Entrega — ' + dados.rua + ', ' + dados.numero + ' · ' + dados.bairro
        : 'Retirada no local'],
      dados.modo === 'entrega' && dados.referencia ? ['Referência', dados.referencia] : null,
      ['Pagamento', dados.pagamento + (dados.troco ? ' (troco para ' + dados.troco + ')' : '')],
      ['Itens', C.qtdTotal() + (C.qtdTotal() === 1 ? ' item' : ' itens')],
      ['Subtotal', S.brl(C.subtotal())],
      ['Entrega', dados.modo === 'retirada' ? 'Retirada (R$ 0,00)' : C.entrega('entrega').texto],
      ['Total estimado', S.brl(C.total(dados.modo))],
      dados.obsGeral ? ['Observações', dados.obsGeral] : null
    ].filter(Boolean);

    alvo.innerHTML = '<div class="painel" style="background:var(--preto-4);margin-bottom:18px">' +
      linhas.map(function (l2) {
        return '<p class="resumo-linha"><span>' + U.esc(l2[0]) + '</span><strong style="text-align:right;max-width:60%">' + U.esc(l2[1]) + '</strong></p>';
      }).join('') + '</div>' +
      (l.precosIlustrativos
        ? '<p class="campo-ajuda">Preços de demonstração: confirme os valores com a loja antes de pagar.</p>'
        : '');
  }

  /* ============================= ENVIO ================================= */
  function enviar() {
    if (jaEnviado) return;
    if (!validar(1) ) { mostrarEtapa(1); return; }
    if (!validar(2)) { mostrarEtapa(2); return; }
    if (!validar(3)) { mostrarEtapa(3); return; }
    atualizarAvisos();

    var l = S.loja();
    if (lojaFechadaBloqueia()) { mostrarErros(4, ['A loja está fechada neste horário.']); return; }
    if (l.pedidoMinimo && dados.modo === 'entrega' && C.subtotal() < l.pedidoMinimo) {
      mostrarErros(4, ['Pedido mínimo de ' + S.brl(l.pedidoMinimo) + ' não atingido.']); return;
    }

    var numero = P.proximoNumero();
    var textoMsg = montarMensagem(numero);

    var registro = P.registrar({
      cliente: { nome: dados.nome, telefone: dados.telefone, email: dados.email },
      modo: dados.modo,
      endereco: dados.modo === 'entrega'
        ? { rua: dados.rua, numero: dados.numero, complemento: dados.complemento, bairro: dados.bairro, referencia: dados.referencia }
        : null,
      pagamento: dados.pagamento,
      troco: dados.troco,
      observacoes: dados.obsGeral,
      itens: C.itens().map(function (i) {
        return {
          nome: i.nome, qtd: i.qtd, precoUnit: C.linha(i),
          adicionais: (i.adicionais || []).map(function (a) { return a.nome; }),
          remocoes: (i.remocoes || []).map(function (r) { return r.nome; }),
          componentes: i.componentes || [],
          obs: i.obs || ''
        };
      }),
      subtotal: C.subtotal(),
      taxaEntrega: dados.modo === 'retirada' ? 0 : C.entrega('entrega').centavos,
      total: C.total(dados.modo),
      fonte: 'site'
    });

    var abriu = false;
    if (l.whatsapp) {
      var url = 'https://wa.me/' + l.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(textoMsg);
      var w = window.open(url, '_blank', 'noopener');
      abriu = !!w;
      if (!w) {
        U.toast('O navegador bloqueou a janela. Libere pop-ups ou use “Copiar mensagem”.', 'erro');
        P.atualizarStatus(registro.numero, 'aguardando');
      }
    } else {
      copiar(textoMsg);
    }

    jaEnviado = true;
    C.limpar();
    mostrarConfirmacao(registro, !!l.whatsapp && abriu);
  }

  function copiar(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () { U.toast('Mensagem copiada!'); },
        function () { fallbackCopiar(t); }
      );
    } else fallbackCopiar(t);
  }

  function fallbackCopiar(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    U.toast(ok ? 'Mensagem copiada!' : 'Não foi possível copiar automaticamente.', ok ? 'ok' : 'erro');
  }

  function mostrarConfirmacao(registro, abriu) {
    $('checkout-grade').hidden = true;
    var topo = document.querySelector('.topo-checkout');
    if (topo) topo.hidden = true;
    $('checkout-confirmado').hidden = false;
    $('confirmado-numero').textContent = '#' + registro.numero;
    $('confirmado-detalhes').textContent =
      registro.itens.length + ' tipo(s) de item · total ' + S.brl(registro.total) + ' · ' +
      (registro.modo === 'entrega' ? 'entrega' : 'retirada no local') +
      (abriu ? '' : ' · mensagem copiada para envio manual');
    U.atualizarBadge();
    $('checkout-confirmado').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ============================== INÍCIO =============================== */
  function iniciar() {
    var vazio = $('checkout-vazio');
    var grade = $('checkout-grade');
    if (!C.itens().length) {
      if (vazio) vazio.hidden = false;
      if (grade) grade.hidden = true;
      return;
    }

    grade.hidden = false;
    renderResumo();
    renderModos();
    renderPagamentos();
    atualizarAvisos();
    mostrarEtapa(1);

    $('form-checkout').addEventListener('submit', function (e) { e.preventDefault(); });

    document.addEventListener('click', function (e) {
      var prox = e.target.closest('[data-proximo]');
      if (prox) {
        var n = parseInt(prox.getAttribute('data-proximo'), 10);
        if (validar(n)) {
          if (n === 2) renderResumo();
          if (n === 3) { renderRevisao(); atualizarPrevia(); }
          mostrarEtapa(n + 1);
          atualizarAvisos();
        }
        return;
      }
      var volt = e.target.closest('[data-voltar]');
      if (volt) { mostrarEtapa(parseInt(volt.getAttribute('data-voltar'), 10) - 1); return; }
      if (e.target.closest('#btn-enviar')) { enviar(); return; }
      if (e.target.closest('#btn-copiar')) { copiar($('texto-whatsapp').textContent); return; }
    });

    $('resumo-itens').addEventListener('click', aoClicarResumo);

    document.addEventListener('change', function (e) {
      if (e.target.name === 'modo') {
        dados.modo = e.target.value;
        renderModos(); renderResumo(); atualizarAvisos();
        Array.prototype.forEach.call($('escolhas-modo').querySelectorAll('.escolha'), function (lab) {
          lab.classList.toggle('escolha--on', lab.querySelector('input').checked);
        });
      }
      if (e.target.name === 'pagamento') {
        dados.pagamento = e.target.value;
        Array.prototype.forEach.call($('escolhas-pagamento').querySelectorAll('.escolha'), function (lab) {
          lab.classList.toggle('escolha--on', lab.querySelector('input').checked);
        });
        $('grupo-troco').hidden = !precisaTroco();
        var ep = $('erro-pagamento'); if (ep && ep.classList.contains('campo-erro')) ep.hidden = true;
      }
      aoTrocarBairro();
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'telefone') {
        e.target.value = mascaraTelefone(e.target.value);
      }
      if (e.target.id === 'bairro-outro') dados.bairro = e.target.value;
      if (e.target.id === 'troco') dados.troco = e.target.value;
      if (e.target.id === 'obs-geral') dados.obsGeral = e.target.value;
    });

    C.on('mudou', function () {
      if (!C.itens().length && !jaEnviado) { location.reload(); return; }
      renderResumo(); atualizarAvisos();
      if (etapa === 4) { renderRevisao(); atualizarPrevia(); }
    });

    /* Se a configuração da loja mudar (ex.: painel aberto em outra aba),
       os avisos de horário, mínimo e WhatsApp são recalculados na hora. */
    S.on('mudou', function () {
      atualizarAvisos();
      renderPagamentos();
      if (etapa === 4) { renderRevisao(); atualizarPrevia(); }
    });
  }

  function mascaraTelefone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : this);
