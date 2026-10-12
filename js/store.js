/* ============================================================================
   BRASA BURGER — CAMADA DE DADOS (store.js)
   ----------------------------------------------------------------------------
   · Lê a configuração padrão de js/data.js
   · Aplica as alterações feitas no painel administrativo (localStorage)
   · Centraliza formatação de dinheiro, horários e situação da loja
   · NÃO usa fetch nem módulos ES: funciona abrindo o site com duplo clique
   ============================================================================ */
(function (global) {
  'use strict';

  var CHAVE = 'brasa_db_v1';
  var db = null;
  var ouvintes = {};

  /* ------------------------------ eventos ---------------------------- */
  function on(evt, cb) {
    (ouvintes[evt] = ouvintes[evt] || []).push(cb);
  }
  function emit(evt, payload) {
    (ouvintes[evt] || []).forEach(function (cb) { try { cb(payload); } catch (e) { console.error(e); } });
  }

  /* ------------------------------ carga ------------------------------ */
  function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

  function carregar() {
    var base = clonar(global.BRASA_PADRAO);
    var salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { salvo = null; }
    db = salvo && typeof salvo === 'object' ? salvo : base;
    if (!db.produtos) db = base;
    return db;
  }

  function persistir() {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { console.error('Não foi possível salvar', e); }
    emit('mudou', db);
  }

  function resetar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { }
    db = clonar(global.BRASA_PADRAO);
    emit('mudou', db);
  }

  function exportarJSON() { return JSON.stringify(db, null, 2); }

  function importarJSON(texto) {
    var obj = JSON.parse(texto);           // lança erro se inválido
    if (!obj || !Array.isArray(obj.produtos)) throw new Error('JSON inválido: falta a lista de produtos.');
    db = obj;
    persistir();
    return true;
  }

  /* ------------------------------ leitura ---------------------------- */
  function loja() { return db.loja; }
  function produtos() { return db.produtos || []; }
  function produto(id) {
    for (var i = 0; i < produtos().length; i++) if (produtos()[i].id === id) return produtos()[i];
    return null;
  }
  function categorias() {
    return (db.categorias || []).slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }
  function categoria(id) {
    for (var i = 0; i < categorias().length; i++) if (categorias()[i].id === id) return categorias()[i];
    return null;
  }
  function grupos() { return db.grupos || []; }
  function grupo(id) {
    for (var i = 0; i < grupos().length; i++) if (grupos()[i].id === id) return grupos()[i];
    return null;
  }
  function marca() { return db.marca || {}; }

  /* --------------------------- dinheiro ------------------------------ */
  /* Armazenamos centavos. Exibição sempre via brl(). */
  function brl(centavos) {
    var v = (Number(centavos) || 0) / 100;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* Aceita "34,90", "34.90", "34" → 3490 centavos */
  function paraCentavos(valor) {
    if (typeof valor === 'number') return Math.round(valor * 100);
    var s = String(valor == null ? '' : valor).trim().replace(/[^\d,.-]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 100);
  }

  function deCentavosParaTexto(centavos) {
    var v = (Number(centavos) || 0) / 100;
    return v.toFixed(2).replace('.', ',');
  }

  function slug(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function uid(prefixo) {
    return (prefixo || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------ valor avulso do combo --------------------- */
  /* Calcula o preço dos componentes somando os produtos individuais.
     É uma soma real dos preços configurados, não um número inventado. */
  function somaComponentes(prod) {
    if (!prod || !prod.componentes) return 0;
    var total = 0;
    prod.componentes.forEach(function (c) {
      var p = produto(c.produtoId);
      if (p) total += p.preco * (c.qtd || 1);
    });
    return total;
  }

  /* ----------------------------- horários ----------------------------- */
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function minutos(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    var h = parseInt(m[1], 10), min = parseInt(m[2], 10);
    if (h > 24 || min > 59) return null;
    return h * 60 + min;
  }

  function horarioDoDia(indice) {
    var h = (db.loja.horarios || [])[indice];
    if (!h) return null;
    return h;
  }

  function horariosConfigurados() {
    var hs = db.loja.horarios || [];
    return hs.length === 7 && hs.some(function (h) { return h && !h.fechado && h.ini && h.fim; });
  }

  /* Retorna { configurado, aberto, texto, detalhe } */
  function situacaoLoja(agora) {
    var d = agora || new Date();
    var res = { configurado: false, aberto: null, texto: '', detalhe: '' };
    if (!horariosConfigurados()) {
      res.texto = 'Horário não configurado';
      res.detalhe = 'Defina no painel → Loja → Horários.';
      return res;
    }
    res.configurado = true;
    var dia = d.getDay();
    var agoraMin = d.getHours() * 60 + d.getMinutes();
    var hoje = horarioDoDia(dia);

    function estadoDe(h) {
      if (!h || h.fechado || !h.ini || !h.fim) return false;
      var i = minutos(h.ini), f = minutos(h.fim);
      if (i === null || f === null) return false;
      if (f <= i) return agoraMin >= i || agoraMin < f;   // cruzando a meia-noite
      return agoraMin >= i && agoraMin < f;
    }

    if (estadoDe(hoje)) {
      res.aberto = true;
      res.texto = 'Aberto agora';
      res.detalhe = 'Fecha às ' + hoje.fim;
      return res;
    }

    res.aberto = false;
    res.texto = 'Fechado agora';
    // procura o próximo dia com expediente
    for (var i = 0; i < 8; i++) {
      var idx = (dia + i) % 7;
      var h = horarioDoDia(idx);
      if (!h || h.fechado || !h.ini || !h.fim) continue;
      var ini = minutos(h.ini);
      if (ini === null) continue;
      if (i === 0 && agoraMin < ini) { res.detalhe = 'Abre hoje às ' + h.ini; return res; }
      if (i > 0) { res.detalhe = 'Abre ' + (i === 1 ? 'amanhã' : DIAS[idx].toLowerCase()) + ' às ' + h.ini; return res; }
    }
    return res;
  }

  /* ------------------------ pendências de setup ----------------------- */
  /* Lista do que falta configurar antes de publicar. */
  function pendencias() {
    var l = db.loja, p = [];
    if (!l.whatsapp) p.push({ campo: 'WhatsApp', onde: 'admin.html#loja' });
    if (l.precosIlustrativos) p.push({ campo: 'Preços de demonstração', onde: 'admin.html#produtos' });
    if (!l.endereco || !l.endereco.logradouro) p.push({ campo: 'Endereço da loja', onde: 'admin.html#loja' });
    if (!horariosConfigurados()) p.push({ campo: 'Horários de funcionamento', onde: 'admin.html#loja' });
    if (!l.pagamentos || !l.pagamentos.length) p.push({ campo: 'Formas de pagamento', onde: 'admin.html#loja' });
    if (l.aceitaEntrega && (!l.bairrosAtendidos || !l.bairrosAtendidos.length)) p.push({ campo: 'Bairros atendidos', onde: 'admin.html#loja' });
    if (l.aceitaEntrega && !l.taxaEntrega) p.push({ campo: 'Taxa de entrega', onde: 'admin.html#loja' });
    return p;
  }

  function modoDemonstracao() {
    var l = db.loja;
    return !!(l.precosIlustrativos || pendencias().length);
  }

  /* ------------------------------ saída ------------------------------- */
  global.Store = {
    on: on, emit: emit,
    carregar: carregar, persistir: persistir, resetar: resetar,
    exportarJSON: exportarJSON, importarJSON: importarJSON,
    get db() { return db; },
    loja: loja, produtos: produtos, produto: produto,
    categorias: categorias, categoria: categoria,
    grupos: grupos, grupo: grupo, marca: marca,
    brl: brl, paraCentavos: paraCentavos, deCentavosParaTexto: deCentavosParaTexto,
    slug: slug, uid: uid, somaComponentes: somaComponentes,
    situacaoLoja: situacaoLoja, horariosConfigurados: horariosConfigurados,
    DIAS: DIAS, DIAS_CURTO: DIAS_CURTO,
    minutos: minutos,
    pendencias: pendencias, modoDemonstracao: modoDemonstracao,
    CHAVE: CHAVE
  };

  carregar();
})(typeof window !== 'undefined' ? window : this);
