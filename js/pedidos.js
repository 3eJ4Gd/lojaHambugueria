/* ============================================================================
   BRASA BURGER — PEDIDOS (pedidos.js)
   ----------------------------------------------------------------------------
   Guarda os pedidos gerados pelo site para consulta no painel administrativo.
   IMPORTANTE: registrar um pedido localmente NÃO equivale a confirmá-lo.
   A confirmação acontece quando a loja responde ao cliente.
   ============================================================================ */
(function (global) {
  'use strict';

  var CHAVE = 'brasa_pedidos_v1';
  var vazia = { sequencia: 0, pedidos: [] };

  function ler() {
    try {
      var d = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (d && Array.isArray(d.pedidos)) return d;
    } catch (e) { }
    return { sequencia: vazia.sequencia, pedidos: [] };
  }

  function gravar(d) {
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { console.error(e); }
  }

  function listar() {
    return ler().pedidos.slice().sort(function (a, b) {
      return new Date(b.criadoEm) - new Date(a.criadoEm);
    });
  }

  function proximoNumero() {
    var d = ler();
    return 'BRASA-' + String(d.sequencia + 1).padStart(4, '0');
  }

  function registrar(pedido) {
    var d = ler();
    d.sequencia += 1;
    var registro = Object.assign({}, pedido, {
      numero: 'BRASA-' + String(d.sequencia).padStart(4, '0'),
      criadoEm: new Date().toISOString(),
      status: 'aguardando'
    });
    d.pedidos.push(registro);
    gravar(d);
    return registro;
  }

  function atualizarStatus(numero, status) {
    var d = ler();
    var ok = false;
    d.pedidos.forEach(function (p) {
      if (p.numero === numero) { p.status = status; p.atualizadoEm = new Date().toISOString(); ok = true; }
    });
    if (ok) gravar(d);
    return ok;
  }

  function remover(numero) {
    var d = ler();
    d.pedidos = d.pedidos.filter(function (p) { return p.numero !== numero; });
    gravar(d);
  }

  function limpar() { gravar({ sequencia: 0, pedidos: [] }); }

  var STATUS = {
    aguardando: { rotulo: 'Aguardando confirmação', cor: 'amarelo' },
    recebido:   { rotulo: 'Recebido',               cor: 'azul' },
    em_preparo: { rotulo: 'Em preparo',             cor: 'ouro' },
    saiu:       { rotulo: 'Saiu para entrega',      cor: 'laranja' },
    concluido:  { rotulo: 'Concluído',              cor: 'verde' },
    cancelado:  { rotulo: 'Cancelado',              cor: 'vermelho' }
  };

  global.Pedidos = {
    CHAVE: CHAVE,
    listar: listar,
    proximoNumero: proximoNumero,
    registrar: registrar,
    atualizarStatus: atualizarStatus,
    remover: remover,
    limpar: limpar,
    STATUS: STATUS
  };
})(typeof window !== 'undefined' ? window : this);
