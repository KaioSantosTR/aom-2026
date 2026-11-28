window.startApp = function (D) {
  "use strict";
  var STATUS = ["A fazer", "Em andamento", "Feito", "Decidir"];
  var NEXT = { "A fazer": "Em andamento", "Em andamento": "Feito", "Feito": "A fazer", "Decidir": "Feito" };
  var CLS = { "A fazer": "fazer", "Em andamento": "and", "Feito": "feito", "Decidir": "dec" };
  var LS = (function () {
    var mem = {};
    try {
      var s = window.localStorage; s.setItem("aom-t", "1"); s.removeItem("aom-t");
      return s;
    } catch (e) {
      return { getItem: function (k) { return mem[k] === undefined ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
    }
  })();
  var SS = (function () {
    var mem = {};
    try {
      var s = window.sessionStorage; s.setItem("aom-t", "1"); s.removeItem("aom-t");
      return s;
    } catch (e) {
      return { getItem: function (k) { return mem[k] === undefined ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
    }
  })();
  var ICON = {
    inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    tarefas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/></svg>',
    equipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.2c2.3.3 4 2.1 4 4.8"/></svg>',
    cron: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    avisos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M18.5 9a4 4 0 0 1 0 6"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  var state = {
    view: "inicio", filtro: "pend", abertos: {},
    me: LS.getItem("aom-me") || "",
    tasks: [], momentos: D.momentos.slice(),
    modo: D.sync && D.sync.url ? "sync" : "local",
    ultimaSync: null, erroSync: false,
    salvos: {}, pend: {}, flashSalvo: 0
  };

  var byNome = {}, byRotulo = {};
  state.cont = {};
  function equipeAtual() {
    var ov = state.cont.equipe;
    if (!ov) return D.equipe;
    var bn = {}; D.equipe.forEach(function (p) { bn[p.nome] = p; });
    return ov.map(function (p) {
      var b = bn[p.nome] || {};
      return { nome: p.nome, rotulo: p.rotulo, completo: b.completo || p.rotulo, papel: p.papel || "", email: b.email || "", tel: b.tel || "", resp: p.resp || [] };
    });
  }
  function reindexar() {
    byNome = {}; byRotulo = {};
    equipeAtual().forEach(function (p) { byNome[p.nome] = p; byRotulo[p.rotulo] = p; });
  }
  function C(sec) {
    if (state.cont[sec] !== undefined) return state.cont[sec];
    return sec === "avisosFixos" ? (D.avisos || []) : D[sec];
  }
  function setCont(obj) {
    var ok = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (k === "roteiro") { if (v && Array.isArray(v.fases)) ok[k] = v; }
      else if (k === "equipe" || k === "dias" || k === "regras" || k === "links" || k === "avisosFixos") { if (Array.isArray(v)) ok[k] = v; }
    });
    state.cont = ok; reindexar();
  }
  if (state.modo === "local") { try { setCont(JSON.parse(LS.getItem("aom-cont") || "{}")); } catch (e) {} }
  reindexar();
  state.pin = LS.getItem("aom-pin") || "";

  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function icon(name) { var s = h("span", { "class": "ic" }); s.innerHTML = ICON[name]; return s; }

  function toLabels(arr) { return arr.map(function (n) { return n === "Todos" ? "Todos" : (byNome[n] ? byNome[n].rotulo : n); }).join("; "); }
  function fromLabels(s) {
    return String(s || "").split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean)
      .map(function (l) { return l === "Todos" ? "Todos" : (byRotulo[l] ? byRotulo[l].nome : l); });
  }
  function eu() { return state.me && state.me !== "_" && byNome[state.me] ? byNome[state.me] : null; }
  function nomeAdmin() { var e = eu(); return !!e && (D.admins || []).indexOf(e.nome) >= 0; }
  function admin() { return nomeAdmin() && (state.modo === "local" || !!state.pin); }
  function agoraTxt() {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function momentoPorRotulo(txt) {
    var t = String(txt || "").trim().toLowerCase();
    for (var i = 0; i < state.momentos.length; i++) {
      var m = state.momentos[i];
      if (m.rotulo.toLowerCase() === t || m.id === t) return m.id;
    }
    if (!t) return "antes";
    var novo = { id: "x" + state.momentos.length, rotulo: String(txt).trim(), curto: String(txt).trim() };
    state.momentos.splice(state.momentos.length - 1, 0, novo);
    return novo.id;
  }
  function rotuloMomento(id) {
    for (var i = 0; i < state.momentos.length; i++) if (state.momentos[i].id === id) return state.momentos[i].rotulo;
    return id;
  }

  function carregarBase() {
    state.avisos = [];
    if (state.modo === "local") { try { state.avisos = JSON.parse(LS.getItem("aom-avisos") || "[]"); } catch (e) {} }
    var over = {}, novas = [];
    var apagadas = [];
    try { var st = JSON.parse(LS.getItem("aom-local") || "{}"); over = st.over || {}; novas = st.novas || []; apagadas = st.apagadas || []; } catch (e) {}
    state.tasks = D.tarefas.filter(function (t) { return apagadas.indexOf(t.id) < 0; }).map(function (t) {
      var o = over[t.id] || {};
      return { id: t.id, quando: o.quando || t.quando, titulo: o.titulo || t.titulo, desc: o.desc !== undefined ? o.desc : t.desc, status: o.status || t.status,
        resp: o.resp || t.resp.slice(), sug: t.sug.slice(), res: o.res || [], adm: false, obs: o.obs || "", por: o.por || "", em: o.em || "" };
    }).concat(novas);
  }
  function salvarLocal(t) {
    var st = {};
    try { st = JSON.parse(LS.getItem("aom-local") || "{}"); } catch (e) {}
    st.over = st.over || {}; st.novas = st.novas || [];
    var idx = -1;
    st.novas.forEach(function (n, i) { if (n.id === t.id) idx = i; });
    if (idx >= 0) st.novas[idx] = t;
    else st.over[t.id] = { status: t.status, resp: t.resp, obs: t.obs, por: t.por, em: t.em, titulo: t.titulo, desc: t.desc, quando: t.quando };
    LS.setItem("aom-local", JSON.stringify(st));
  }

  function apagar(t) {
    if (state.modo === "local") {
      var st = {};
      try { st = JSON.parse(LS.getItem("aom-local") || "{}"); } catch (e) {}
      st.apagadas = (st.apagadas || []).concat([t.id]);
      st.novas = (st.novas || []).filter(function (n) { return n.id !== t.id; });
      LS.setItem("aom-local", JSON.stringify(st));
      state.tasks = state.tasks.filter(function (x) { return x !== t; });
      render(); toast("Tarefa apagada neste aparelho"); return;
    }
    enviar({ id: t.id, apagar: true, por: eu() ? eu().rotulo : "" }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.erro || "falha");
      state.tasks = state.tasks.filter(function (x) { return x !== t; });
      render(); toast("Tarefa apagada");
    }).catch(function () { toast("Não consegui apagar. Tente de novo.", true); });
  }
  function usaPin() { return nomeAdmin() && !!state.pin; }
  function api(metodo, corpo) {
    var url = D.sync.url;
    if (metodo === "GET" && !usaPin()) return fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "k=" + encodeURIComponent(D.sync.key)).then(function (r) { return r.json(); });
    corpo = corpo || {};
    if (metodo === "GET") corpo.ler = true;
    corpo.k = D.sync.key;
    if (usaPin()) corpo.pin = state.pin;
    return fetch(url, { method: "POST", body: JSON.stringify(corpo) }).then(function (r) { return r.json(); });
  }
  function status_(s) { return STATUS.indexOf(s) >= 0 ? s : "A fazer"; }
  function deLinhas(linhas) {
    return linhas.filter(function (r) { return r.titulo; }).map(function (r) {
      return { id: r.id, quando: momentoPorRotulo(r.quando), titulo: r.titulo, desc: r.desc || "", status: status_(r.status),
        resp: fromLabels(r.resp), sug: fromLabels(r.sug), res: fromLabels(r.res), adm: !!r.adm, obs: r.obs || "", por: r.por || "", em: r.em || "" };
    });
  }
  var sincronizando = false;
  state.salvando = 0; state.mudancas = 0; state.versaoScript = null;
  var VERSAO_SCRIPT = 7;
  function enviar(corpo) {
    state.salvando++; state.mudancas++; renderConn();
    var fim = function (ok) { state.salvando--; if (ok) marcarSalvo(); renderConn(); if (!state.salvando) setTimeout(sincronizar, 400); };
    return api("POST", corpo).then(function (r) { fim(r && r.ok); return r; }, function (e) { fim(false); throw e; });
  }
  function marcarSalvo() {
    state.flashSalvo = Date.now();
    setTimeout(renderConn, 4100);
  }
  function chaveTarefa(t) { return [t.status, t.resp.join(";"), t.res.join(";"), t.obs, t.titulo, t.desc, t.quando].join("|"); }
  function chaveCache() { return usaPin() ? "aom-cache-adm" : "aom-cache"; }
  function aplicarDados(r) {
    setCont(r.conteudo || {});
    state.tasks = deLinhas(r.linhas || []);
    state.avisos = (r.avisos || []).map(function (x) { x.custom = true; return x; });
  }
  function carregarCache() {
    try { var c = JSON.parse(SS.getItem(chaveCache()) || "null"); if (c && c.linhas) { aplicarDados(c); return true; } } catch (e) {}
    return false;
  }
  function tarefaPorId(id) { for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i]; return null; }
  function sincronizar() {
    if (state.modo !== "sync" || sincronizando) return Promise.resolve();
    sincronizando = true;
    var marca = state.mudancas;
    return api("GET").then(function (r) {
      if (r && r.erro === "pin") { state.pin = ""; LS.removeItem("aom-pin"); SS.removeItem("aom-cache-adm"); sincronizando = false; return sincronizar(); }
      if (!r || !r.ok) throw new Error("falha");
      state.versaoScript = r.versao || 0;
      if (state.salvando || marca !== state.mudancas) return;
      var antes = null, chave = chaveCache();
      if (state.dadosPlanilha && state.chaveDados === chave) {
        antes = {}; state.tasks.forEach(function (t) { antes[t.id] = chaveTarefa(t); });
      }
      aplicarDados(r);
      if (antes) state.tasks.forEach(function (t) {
        if (antes[t.id] !== chaveTarefa(t) && !state.pend[t.id]) state.salvos[t.id] = { em: Date.now(), por: t.por, meu: !!eu() && t.por === eu().rotulo };
      });
      state.dadosPlanilha = true; state.chaveDados = chave;
      try { SS.setItem(chaveCache(), JSON.stringify({ linhas: r.linhas, avisos: r.avisos || [], conteudo: r.conteudo || {} })); } catch (e) {}
      state.ultimaSync = new Date(); state.erroSync = false;
      if (!sheetAberto()) render(); else renderBanner();
    }).catch(function () { state.erroSync = true; renderBanner(); renderConn(); })
      .then(function () { sincronizando = false; });
  }

  var toastT;
  function toast(msg, erro) {
    var t = $("toast"); t.textContent = msg; t.className = "toast" + (erro ? " erro" : ""); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function salvar(t, patch) {
    var antes = JSON.parse(JSON.stringify(t));
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    var quem = eu() ? eu().rotulo : "";
    t.por = quem; t.em = agoraTxt();
    render();
    if (state.modo === "local") { salvarLocal(t); toast("Salvo neste aparelho"); return; }
    var corpo = { id: t.id, por: quem };
    if (patch.status !== undefined) corpo.status = patch.status;
    if (patch.resp !== undefined) corpo.resp = toLabels(patch.resp);
    if (patch.res !== undefined) corpo.res = toLabels(patch.res);
    if (patch.obs !== undefined) corpo.obs = patch.obs;
    if (patch.titulo !== undefined) corpo.titulo = patch.titulo;
    if (patch.desc !== undefined) corpo.desc = patch.desc;
    if (patch.quando !== undefined) corpo.quando = rotuloMomento(patch.quando);
    toast("Salvando...");
    state.pend[t.id] = true; delete state.salvos[t.id];
    enviar(corpo).then(function (r) {
      if (!r || !r.ok) { var er = new Error(r && r.erro || "falha"); er.r = r; throw er; }
      delete state.pend[t.id];
      state.salvos[t.id] = { em: Date.now(), por: quem, meu: true };
      if (r.linha) {
        var novo = deLinhas([r.linha])[0], alvo = tarefaPorId(t.id) || t;
        if (novo) Object.keys(novo).forEach(function (k) { alvo[k] = novo[k]; });
      }
      if (!sheetAberto()) render();
      toast("Salvo na planilha");
    }).catch(function (err) {
      delete state.pend[t.id];
      var alvo = tarefaPorId(t.id) || t;
      Object.keys(antes).forEach(function (k) { alvo[k] = antes[k]; });
      render();
      var m = err && err.message, r = err && err.r;
      if (m === "pin") { state.pin = ""; LS.removeItem("aom-pin"); render(); toast("O PIN de administrador não foi aceito. Entre de novo.", true); }
      else if (m === "permissao") toast("Só quem é responsável pela tarefa ou administrador pode fazer isso.", true);
      else if (m === "nao_gravou") toast("A planilha não gravou: " + ((r && r.campos) || []).join(", ") + ". Avise o Kaio.", true);
      else if (m === "excecao") toast("Erro na planilha: " + (r && r.detalhe || "desconhecido"), true);
      else toast("Não consegui salvar. Confira a internet e tente de novo.", true);
    });
  }

  function exigirNome(depois) {
    if (eu()) { depois(); return; }
    abrirNome(depois);
  }
  function ciclo(t) {
    exigirNome(function () {
      if (admin() || (meu(t) && !protegida(t) && t.status !== "Decidir")) salvar(t, { status: NEXT[t.status] });
      else { toast(protegida(t) ? "Tarefa de administrador." : t.status === "Decidir" ? "Esse ponto ainda precisa de decisão." : "Assuma a tarefa para atualizar o status."); abrirTarefa(t); }
    });
  }

  /* ---------- sheet (janela inferior) ---------- */
  function sheetAberto() { return !$("sheet").hidden; }
  function fecharSheet() { var s = $("sheet"); s.hidden = true; s.textContent = ""; document.body.classList.remove("noscroll"); }
  function abrirSheet(titulo, sub, corpo) {
    var s = $("sheet"); s.textContent = "";
    var box = h("div", { "class": "sheet-box", role: "dialog", "aria-modal": "true", "aria-label": titulo }, [
      h("div", { "class": "sheet-head" }, [
        h("div", null, [h("h2", { text: titulo }), sub ? h("p", { "class": "sheet-sub", text: sub }) : null]),
        h("button", { "class": "x", type: "button", "aria-label": "Fechar", text: "\u00d7", onclick: fecharSheet })
      ]),
      corpo
    ]);
    s.appendChild(box); s.hidden = false; document.body.classList.add("noscroll");
    s.onclick = function (e) { if (e.target === s) fecharSheet(); };
    box.scrollTop = 0;
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheetAberto()) fecharSheet(); });

  function abrirNome(depois) {
    var lista = h("div", { "class": "pick" });
    equipeAtual().forEach(function (p) {
      lista.appendChild(h("button", { type: "button", "class": "pick-item", onclick: function () {
        state.me = p.nome; LS.setItem("aom-me", p.nome); fecharSheet(); render();
        if (nomeAdmin() && state.modo === "sync" && !state.pin) { abrirPin(depois); return; }
        if (depois) depois(); else toast("Olá, " + p.nome + ".");
      } }, [h("b", { text: p.nome }), h("span", { text: p.papel })]));
    });
    lista.appendChild(h("button", { type: "button", "class": "pick-item ghost", onclick: function () {
      state.me = "_"; LS.setItem("aom-me", "_"); fecharSheet(); render(); toast("Modo só leitura. Escolha seu nome para editar.");
    } }, [h("b", { text: "Só quero ver" }), h("span", { text: "Sem editar nada" })]));
    abrirSheet("Quem é você?", "Assim a equipe sabe quem atualizou cada tarefa.", lista);
  }

  function abrirPin(depois, soAdmin) {
    var corpo = h("form", { "class": "form", autocomplete: "off" });
    corpo.appendChild(h("p", { "class": "muted", text: "Administradores criam e editam tarefas. Os demais só assumem tarefas e atualizam as suas." }));
    var pin = h("input", { type: "password", id: "f-pin", inputmode: "numeric", autocomplete: "off", placeholder: "PIN de administrador", "aria-label": "PIN de administrador" });
    var msg = h("p", { "class": "meta", role: "alert" });
    corpo.appendChild(pin); corpo.appendChild(msg);
    corpo.appendChild(h("div", { "class": "btns" }, [
      h("button", { type: "button", "class": "btn ghost", text: "Agora não", onclick: function () { fecharSheet(); if (depois && !soAdmin) depois(); } }),
      h("button", { type: "submit", "class": "btn", text: "Entrar" })
    ]));
    corpo.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = pin.value.trim();
      if (!v) return;
      msg.textContent = "Verificando...";
      var antes = state.pin; state.pin = v;
      api("POST", { por: eu() ? eu().rotulo : "", ping: true }).then(function (r) {
        if (!r || !r.ok) throw new Error("pin");
        LS.setItem("aom-pin", v); fecharSheet(); render(); toast("Acesso de administrador liberado");
        if (depois) depois();
      }).catch(function () { state.pin = antes; msg.textContent = "PIN incorreto ou sem conexão. Tente de novo."; });
    });
    abrirSheet("Acesso de administrador", eu() ? eu().nome : null, corpo);
    setTimeout(function () { pin.focus(); }, 50);
  }

  function chipsResp(sel, semTodos) {
    var wrap = h("div", { "class": "chips" });
    function desenhar() {
      wrap.textContent = "";
      var nomes = equipeAtual().map(function (p) { return p.nome; });
      sel.forEach(function (n) { if (nomes.indexOf(n) < 0 && n !== "Todos") nomes.push(n); });
      if (!semTodos) nomes.push("Todos");
      nomes.forEach(function (n) {
        var on = sel.indexOf(n) >= 0;
        wrap.appendChild(h("button", { type: "button", "class": "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", text: n, onclick: function () {
          var i = sel.indexOf(n); if (i >= 0) sel.splice(i, 1); else sel.push(n); desenhar();
        } }));
      });
    }
    desenhar();
    return wrap;
  }

  function abrirTarefa(t) {
    var adm = admin(), e = eu(), minha = meu(t);
    var prot = protegida(t);
    var pode = adm || (minha && !prot && t.status !== "Decidir");
    var draft = { status: t.status, resp: t.resp.slice(), res: t.res.slice() };
    var corpo = h("div", { "class": "form" });
    var tit, desc, quando;
    if (adm) {
      corpo.appendChild(h("label", { "class": "lbl", "for": "f-tit", text: "Tarefa" }));
      tit = h("input", { id: "f-tit", type: "text", maxlength: "120" }); tit.value = t.titulo; corpo.appendChild(tit);
      corpo.appendChild(h("label", { "class": "lbl", "for": "f-desc", text: "Descrição" }));
      desc = h("textarea", { id: "f-desc", rows: "3", maxlength: "300" }); desc.value = t.desc || ""; corpo.appendChild(desc);
      corpo.appendChild(h("label", { "class": "lbl", "for": "f-q", text: "Quando" }));
      quando = h("select", { id: "f-q" });
      state.momentos.forEach(function (m) { quando.appendChild(h("option", { value: m.id, text: m.rotulo })); });
      quando.value = t.quando; corpo.appendChild(quando);
    } else if (t.desc) corpo.appendChild(h("p", { "class": "desc", text: t.desc }));

    corpo.appendChild(h("label", { "class": "lbl", text: "Status" }));
    var seg = h("div", { "class": "seg" });
    function desenharSeg() {
      seg.textContent = "";
      STATUS.forEach(function (s) {
        if (!adm && s === "Decidir") return;
        seg.appendChild(h("button", { type: "button", "class": "seg-b s-" + CLS[s] + (draft.status === s ? " on" : ""), "aria-pressed": draft.status === s ? "true" : "false", text: s, onclick: function () { draft.status = s; desenharSeg(); } }));
      });
    }
    if (pode) { desenharSeg(); corpo.appendChild(seg); }
    else corpo.appendChild(h("p", { "class": "desc", text: t.status + (prot ? ". Tarefa dos administradores (Kaio e Vini)." : t.status === "Decidir" ? ". Esse ponto ainda precisa de uma decisão." : ". Para atualizar, assuma a tarefa.") }));

    corpo.appendChild(h("label", { "class": "lbl", text: "Responsável" }));
    var acoes = h("div", { "class": "mini" });
    if (adm) {
      var chips = chipsResp(draft.resp);
      corpo.appendChild(chips);
      if (!t.resp.length && t.sug.length) acoes.appendChild(h("button", { type: "button", "class": "link", text: "Usar a sugestão: " + t.sug.join(", "), onclick: function () {
        draft.resp.length = 0; t.sug.forEach(function (n) { draft.resp.push(n); });
        var novo = chipsResp(draft.resp); chips.replaceWith(novo); chips = novo;
      } }));
    } else {
      corpo.appendChild(h("p", { "class": "desc", text: t.resp.length ? t.resp.join(", ") : "Ninguém assumiu ainda." }));
      if (prot) acoes.appendChild(h("p", { "class": "meta", text: "Só os administradores alteram ou delegam esta tarefa." }));
      else if (!e) acoes.appendChild(h("button", { type: "button", "class": "btn", text: "Escolher meu nome para assumir", onclick: function () { abrirNome(function () { abrirTarefa(t); }); } }));
      else if (t.resp.indexOf("Todos") >= 0) { /* tarefa de todos */ }
      else if (t.resp.indexOf(e.nome) >= 0) acoes.appendChild(h("button", { type: "button", "class": "link", text: "Largar esta tarefa", onclick: function () {
        fecharSheet(); salvar(t, { resp: t.resp.filter(function (n) { return n !== e.nome; }) });
      } }));
      else if (!t.resp.length) acoes.appendChild(h("button", { type: "button", "class": "btn", text: "Assumir esta tarefa", onclick: function () {
        fecharSheet(); salvar(t, { resp: [e.nome] });
      } }));
      else {
        acoes.appendChild(h("button", { type: "button", "class": "btn", text: "Assumir junto com " + t.resp.join(", "), onclick: function () {
          fecharSheet(); salvar(t, { resp: t.resp.concat([e.nome]), res: t.res.filter(function (n) { return n !== e.nome; }) });
        } }));
        acoes.appendChild(h("button", { type: "button", "class": "link", text: "Assumir no lugar de " + t.resp.join(", "), onclick: function () {
          var res = t.resp.concat(t.res.filter(function (n) { return t.resp.indexOf(n) < 0; })).filter(function (n) { return n !== e.nome; });
          fecharSheet(); salvar(t, { resp: [e.nome], res: res });
        } }));
      }
    }
    corpo.appendChild(acoes);
    if (adm) {
      corpo.appendChild(h("label", { "class": "lbl", text: "Reserva (assume se o responsável não puder)" }));
      corpo.appendChild(chipsResp(draft.res, true));
    } else if (t.res.length) {
      corpo.appendChild(h("label", { "class": "lbl", text: "Reserva" }));
      corpo.appendChild(h("p", { "class": "desc", text: t.res.join(", ") + (e && t.res.indexOf(e.nome) >= 0 ? ". Você é a reserva: se o responsável não puder, assuma o posto." : "") }));
    }

    var obs;
    if (pode) {
      corpo.appendChild(h("label", { "class": "lbl", "for": "f-obs", text: "Observação" }));
      obs = h("textarea", { id: "f-obs", rows: "2", maxlength: "200", placeholder: "Opcional" }); obs.value = t.obs || "";
      corpo.appendChild(obs);
    } else if (t.obs) {
      corpo.appendChild(h("label", { "class": "lbl", text: "Observação" }));
      corpo.appendChild(h("p", { "class": "desc", text: t.obs }));
    }

    if (t.por) corpo.appendChild(h("p", { "class": "meta", text: "Última alteração: " + t.por + (t.em ? ", " + t.em : "") }));
    var botoes = [h("button", { type: "button", "class": "btn ghost", text: pode ? "Cancelar" : "Fechar", onclick: fecharSheet })];
    if (pode) botoes.push(h("button", { type: "button", "class": "btn", text: "Salvar", onclick: function () { salvarForm(false); } }));
    function salvarForm(seguir) {
      exigirNome(function () {
        var patch = {};
        if (draft.status !== t.status) patch.status = draft.status;
        if (adm) {
          if (draft.resp.join("|") !== t.resp.join("|")) patch.resp = draft.resp.slice();
          if (draft.res.join("|") !== t.res.join("|")) patch.res = draft.res.slice();
          var nt = tit.value.trim();
          if (!nt) { tit.focus(); toast("A tarefa precisa de um título.", true); return; }
          if (nt !== t.titulo) patch.titulo = nt;
          if (desc.value.trim() !== (t.desc || "")) patch.desc = desc.value.trim();
          if (quando.value !== t.quando) patch.quando = quando.value;
        }
        if (obs.value.trim() !== (t.obs || "")) patch.obs = obs.value.trim();
        fecharSheet();
        if (Object.keys(patch).length) salvar(t, patch);
        if (seguir) {
          var prox = proximaSemDono(t);
          if (prox) abrirTarefa(prox); else toast("Todas as tarefas pendentes já têm responsável.");
        }
      });
    }
    corpo.appendChild(h("div", { "class": "btns" }, botoes));
    if (adm && proximaSemDono(t)) corpo.appendChild(h("button", { type: "button", "class": "link big", text: "Salvar e abrir a próxima sem responsável", onclick: function () { salvarForm(true); } }));
    if (adm) {
      var zona = h("div", { "class": "apagar" });
      var desenharApagar = function (confirmando) {
        zona.textContent = "";
        if (!confirmando) zona.appendChild(h("button", { type: "button", "class": "link danger", text: "Apagar esta tarefa", onclick: function () { desenharApagar(true); } }));
        else {
          zona.appendChild(h("p", { "class": "meta", text: "Apagar \"" + t.titulo + "\" para todos? Isso não dá para desfazer." }));
          zona.appendChild(h("div", { "class": "btns" }, [
            h("button", { type: "button", "class": "btn ghost", text: "Não apagar", onclick: function () { desenharApagar(false); } }),
            h("button", { type: "button", "class": "btn danger", text: "Sim, apagar", onclick: function () { fecharSheet(); apagar(t); } })
          ]));
        }
      };
      desenharApagar(false);
      corpo.appendChild(zona);
    }
    abrirSheet(adm ? "Editar tarefa" : t.titulo, rotuloMomento(t.quando), corpo);
  }

  function abrirNova() {
    if (!eu()) { exigirNome(abrirNova); return; }
    var adm = admin();
    var draft = { resp: adm ? [] : [eu().nome] };
    var corpo = h("div", { "class": "form" });
    corpo.appendChild(h("label", { "class": "lbl", "for": "n-t", text: "Título da tarefa" }));
    var tit = h("input", { id: "n-t", type: "text", maxlength: "120", placeholder: "Ex.: Levar extensões para a sala" });
    corpo.appendChild(tit);
    corpo.appendChild(h("label", { "class": "lbl", "for": "n-d", text: "Descrição" }));
    var desc = h("textarea", { id: "n-d", rows: "3", maxlength: "300", placeholder: "O que precisa ser feito, onde e qualquer detalhe importante" });
    corpo.appendChild(desc);
    corpo.appendChild(h("label", { "class": "lbl", "for": "n-q", text: "Quando" }));
    var q = h("select", { id: "n-q" });
    state.momentos.forEach(function (m) { if (m.id !== "prep" || adm) q.appendChild(h("option", { value: m.id, text: m.rotulo })); });
    q.value = momentoAtual();
    corpo.appendChild(q);
    corpo.appendChild(h("label", { "class": "lbl", text: "Responsável" }));
    var privada = null;
    if (adm) {
      corpo.appendChild(chipsResp(draft.resp));
      privada = h("input", { type: "checkbox", id: "n-priv" });
      corpo.appendChild(h("label", { "class": "chk", "for": "n-priv" }, [privada, h("span", { text: "Só Kaio e Vini enxergam esta tarefa" })]));
    } else {
      corpo.appendChild(h("p", { "class": "desc", text: "Você (" + eu().nome + ")" }));
      corpo.appendChild(h("p", { "class": "meta", text: "A tarefa fica no seu nome. Para dar uma tarefa a outra pessoa, fale com o Kaio ou o Vini." }));
    }
    corpo.appendChild(h("div", { "class": "btns" }, [
      h("button", { type: "button", "class": "btn ghost", text: "Cancelar", onclick: fecharSheet }),
      h("button", { type: "button", "class": "btn", text: "Criar tarefa", onclick: function () {
        var titulo = tit.value.trim(), descricao = desc.value.trim();
        if (!titulo) { tit.focus(); toast("Escreva o título da tarefa.", true); return; }
        if (!descricao) { desc.focus(); toast("Escreva uma descrição para a tarefa.", true); return; }
        var quem = eu().rotulo, quando = q.value;
        fecharSheet();
        if (state.modo === "local") {
          var t = { id: "N-" + Date.now().toString(36), quando: quando, titulo: titulo, desc: descricao, status: "A fazer", resp: draft.resp.slice(), sug: [], res: [], obs: "", por: quem, em: agoraTxt() };
          state.tasks.push(t); salvarLocal(t); render(); toast("Tarefa criada neste aparelho");
          return;
        }
        toast("Salvando...");
        enviar({ por: quem, novo: { titulo: titulo, desc: descricao, quando: rotuloMomento(quando), resp: toLabels(draft.resp), restrita: !!(privada && privada.checked) } })
          .then(function (r) {
            if (!r || !r.ok) throw new Error(r && r.erro || "falha");
            if (r.id) state.salvos[r.id] = { em: Date.now(), por: quem, meu: true };
            toast("Tarefa criada e salva na planilha"); return sincronizar();
          })
          .catch(function (e) {
            var m = e && e.message;
            if (m === "permissao") toast("Atualize o script da planilha para liberar a criação de tarefas para a equipe.", true);
            else if (m === "desc") toast("A tarefa precisa de uma descrição.", true);
            else toast("Não consegui criar a tarefa. Confira a internet e tente de novo.", true);
          });
      } })
    ]));
    abrirSheet("Nova tarefa", adm ? null : "Crie uma tarefa para você mesmo.", corpo);
  }

  /* ---------- consultas ---------- */
  function momentoAtual() {
    var d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    if (d <= "2026-11-29") return "antes";
    if (d === "2026-11-30") return "seg";
    if (d === "2026-12-01") return "ter";
    return "evento";
  }
  function feito(t) { return t.status === "Feito"; }
  function meu(t) { var e = eu(); return !!e && (t.resp.indexOf(e.nome) >= 0 || t.resp.indexOf("Todos") >= 0); }
  function protegida(t) { return !!t.adm || t.resp.some(function (n) { return (D.admins || []).indexOf(n) >= 0; }); }
  var FILTROS = [
    ["pend", "Pendentes", function (t) { return !feito(t); }],
    ["minhas", "Minhas", function (t) { return !feito(t) && meu(t); }],
    ["sem", "Sem dono", function (t) { return !feito(t) && !t.resp.length; }],
    ["dec", "Decidir", function (t) { return t.status === "Decidir"; }],
    ["feitas", "Feitas", feito],
    ["todas", "Todas", function () { return true; }]
  ];
  function filtroFn(id) { for (var i = 0; i < FILTROS.length; i++) if (FILTROS[i][0] === id) return FILTROS[i][2]; return FILTROS[0][2]; }
  function operacionais() { return state.tasks.filter(function (t) { return t.quando !== "prep"; }); }
  function proximaSemDono(atual) {
    var ordem = state.momentos.map(function (m) { return m.id; });
    var lista = operacionais().filter(function (t) { return t.id !== atual.id && !feito(t) && !t.resp.length; });
    lista.sort(function (a, b) { return ordem.indexOf(a.quando) - ordem.indexOf(b.quando); });
    return lista[0] || null;
  }

  function irPara(view, filtro, abrir) {
    state.view = view; if (filtro) state.filtro = filtro;
    if (abrir) state.abertos["m-" + abrir] = true;
    render(); window.scrollTo(0, 0);
  }

  /* ---------- componentes ---------- */
  var SALVO_MS = 5 * 60000;
  function marcaSalvo(t) {
    if (state.pend[t.id]) return h("span", { "class": "tag salvando", text: "Salvando..." });
    var s = state.salvos[t.id];
    if (!s || Date.now() - s.em > SALVO_MS) return null;
    var quem = s.meu ? "" : (byRotulo[s.por] ? byRotulo[s.por].nome : s.por);
    return h("span", { "class": "tag salvo", title: "Gravado na planilha" }, [icon("ok"), quem ? "Atualizado por " + quem : "Salvo"]);
  }
  function linha(t) {
    var meta = h("span", { "class": "row-meta" });
    var ms = marcaSalvo(t);
    if (ms) meta.appendChild(ms);
    if (t.status === "Decidir") meta.appendChild(h("span", { "class": "tag dec", text: "Decidir" }));
    if (protegida(t)) meta.appendChild(h("span", { "class": "tag adm", text: t.adm ? "Só admins" : "Admins" }));
    if (t.resp.length) meta.appendChild(h("span", { "class": "who-txt", text: t.resp.join(", ") }));
    else if (t.sug.length) meta.appendChild(h("span", { "class": "who-txt sug", text: "Sem dono. Sugestão: " + t.sug.join(", ") }));
    else meta.appendChild(h("span", { "class": "who-txt sem", text: "Sem responsável" }));
    var corpo = h("button", { type: "button", "class": "row-body", onclick: function () { abrirTarefa(t); } }, [
      h("span", { "class": "row-title", text: t.titulo }), meta,
      t.obs ? h("span", { "class": "row-obs", text: t.obs }) : null
    ]);
    var st = h("button", { type: "button", "class": "st-btn s-" + CLS[t.status], "aria-label": t.status + ". Toque para mudar o status.", onclick: function (e) { e.stopPropagation(); ciclo(t); } });
    return h("div", { "class": "row" }, [st, corpo]);
  }
  function cartao(titulo, sub, kids, extra) {
    return h("section", { "class": "card" + (extra ? " " + extra : "") }, [h("h2", { text: titulo }), sub ? h("p", { "class": "muted", text: sub }) : null].concat(kids));
  }
  function botaoLink(txt, fn) { return h("button", { type: "button", "class": "link big", text: txt, onclick: fn }); }
  function progresso(feitas, total) {
    var p = h("div", { "class": "prog", role: "img", "aria-label": feitas + " de " + total + " feitas" }, [h("i")]);
    p.firstChild.style.width = (total ? Math.round(feitas / total * 100) : 0) + "%";
    return p;
  }

  /* ---------- telas ---------- */
  function telaInicio() {
    var w = h("div", { "class": "home" }), main = h("div", { "class": "home-main" }), side = h("div", { "class": "home-side" });
    var ops = operacionais(), pend = ops.filter(function (t) { return !feito(t); });
    var e = eu();
    if (!state.me) {
      side.appendChild(h("section", { "class": "card hello o1" }, [
        h("h2", { text: "Quem é você?" }),
        h("p", { "class": "muted", text: "Escolha seu nome para marcar tarefas e ver as suas." }),
        h("button", { type: "button", "class": "btn", text: "Escolher meu nome", onclick: function () { abrirNome(); } })
      ]));
    } else if (e) {
      var minhas = pend.filter(meu);
      side.appendChild(h("section", { "class": "card hello o1" }, [
        h("h2", { text: "Olá, " + e.nome + "." }),
        h("p", { "class": "muted", text: minhas.length ? "Você tem " + minhas.length + (minhas.length === 1 ? " tarefa pendente." : " tarefas pendentes.") : "Nenhuma tarefa pendente com o seu nome." }),
        minhas.length ? botaoLink("Ver as minhas tarefas", function () { irPara("tarefas", "minhas"); }) : null,
        nomeAdmin() && !admin() ? botaoLink("Entrar como administrador", function () { abrirPin(); }) : null
      ]));
    }

    var mid = momentoAtual();
    var doMom = ops.filter(function (t) { return t.quando === mid; });
    var pendMom = doMom.filter(function (t) { return !feito(t); });
    var feitasMom = doMom.length - pendMom.length;
    var kids = [progresso(feitasMom, doMom.length), h("p", { "class": "muted", text: feitasMom + " de " + doMom.length + " feitas" })];
    pendMom.slice(0, 5).forEach(function (t) { kids.push(linha(t)); });
    if (!pendMom.length) kids.push(h("p", { "class": "empty", text: "Tudo certo por aqui." }));
    else if (pendMom.length > 5) kids.push(botaoLink("Ver as outras " + (pendMom.length - 5), function () { irPara("tarefas", "pend", mid); }));
    main.appendChild(cartao("Agora: " + rotuloMomento(mid), null, kids, "focus o2"));

    var dec = state.tasks.filter(function (t) { return t.status === "Decidir"; });
    var dk = [];
    dec.slice(0, 4).forEach(function (t) { dk.push(linha(t)); });
    if (!dec.length) dk.push(h("p", { "class": "empty", text: "Nenhuma decisão em aberto." }));
    if (dec.length > 4) dk.push(botaoLink("Ver as " + dec.length + " decisões", function () { irPara("tarefas", "dec"); }));
    side.appendChild(cartao("Falta decidir (" + dec.length + ")", "Pontos da reunião que ainda precisam de uma resposta.", dk, "o3"));

    var sem = pend.filter(function (t) { return !t.resp.length; });
    side.appendChild(cartao("Sem responsável", null, [
      h("p", { "class": "big-n", text: String(sem.length) }),
      h("p", { "class": "muted", text: sem.length === 1 ? "tarefa ainda sem dono" : "tarefas ainda sem dono" }),
      sem.length ? botaoLink("Ver quais são", function () { irPara("tarefas", "sem"); }) : null
    ], "o4"));

    var chips = h("div", { "class": "mom-strip" });
    state.momentos.forEach(function (m) {
      if (m.id === "prep") return;
      var ts = ops.filter(function (t) { return t.quando === m.id; });
      var f = ts.filter(feito).length;
      chips.appendChild(h("button", { type: "button", "class": "mom" + (m.id === mid ? " on" : ""), onclick: function () { irPara("tarefas", "pend", m.id); } }, [
        h("b", { text: m.curto }), h("span", { text: f + "/" + ts.length })
      ]));
    });
    main.appendChild(cartao("Por momento", null, [chips], "o5"));
    w.appendChild(main); w.appendChild(side);
    return w;
  }

  function telaTarefas() {
    var w = h("div", { "class": "stack" });
    var barra = h("div", { "class": "filters", role: "tablist" });
    FILTROS.forEach(function (f) {
      var n = state.tasks.filter(f[2]).length;
      barra.appendChild(h("button", { type: "button", "class": "fchip" + (state.filtro === f[0] ? " on" : ""), role: "tab", "aria-selected": state.filtro === f[0] ? "true" : "false", onclick: function () { state.filtro = f[0]; render(); } }, [f[1], h("span", { text: String(n) })]));
    });
    w.appendChild(barra);
    w.appendChild(h("p", { "class": "legenda" }, [
      "Toque no círculo para avançar: ",
      h("span", { "class": "lg s-fazer", text: "A fazer" }), h("span", { "class": "lg s-and", text: "Em andamento" }),
      h("span", { "class": "lg s-feito", text: "Feito" }), h("span", { "class": "lg s-dec", text: "Decidir" })
    ]));
    var fn = filtroFn(state.filtro), mid = momentoAtual(), algum = false;
    state.momentos.forEach(function (m) {
      var todas = state.tasks.filter(function (t) { return t.quando === m.id; });
      var itens = todas.filter(fn);
      if (!itens.length) return;
      algum = true;
      var chave = "m-" + m.id;
      var aberto = state.abertos[chave] !== undefined ? state.abertos[chave] : (state.filtro !== "pend" || m.id === mid) && m.id !== "prep";
      if (m.id === "prep" && state.abertos[chave] === undefined) aberto = false;
      var f = todas.filter(feito).length;
      var cab = h("button", { type: "button", "class": "grp-head", "aria-expanded": aberto ? "true" : "false", onclick: function () { state.abertos[chave] = !aberto; render(); } }, [
        h("span", { "class": "grp-t", text: m.rotulo }),
        h("span", { "class": "grp-n", text: f + "/" + todas.length }),
        h("span", { "class": "chev" + (aberto ? " up" : ""), "aria-hidden": "true" })
      ]);
      var g = h("section", { "class": "grp" }, [cab]);
      if (aberto) { var lista = h("div", { "class": "rows" }); itens.forEach(function (t) { lista.appendChild(linha(t)); }); g.appendChild(lista); }
      w.appendChild(g);
    });
    if (!algum) w.appendChild(h("p", { "class": "empty pad", text: state.filtro === "dec" ? "Nenhuma decisão em aberto." : "Nada por aqui. Bom sinal." }));
    return w;
  }

  function contato(p) {
    var d = p.tel ? p.tel.replace(/\D/g, "") : "";
    var bs = h("div", { "class": "contact" });
    if (d) {
      bs.appendChild(h("a", { "class": "cbtn", href: "tel:+55" + d, text: "Ligar" }));
      bs.appendChild(h("a", { "class": "cbtn", href: "https://wa.me/55" + d, target: "_blank", rel: "noopener", text: "WhatsApp" }));
    }
    if (p.email) bs.appendChild(h("a", { "class": "cbtn", href: "mailto:" + p.email, text: "E-mail" }));
    return bs;
  }

  function telaEquipe() {
    var w = h("div", { "class": "stack" });
    var ul = h("ul", { "class": "bul" }); C("regras").forEach(function (r) { ul.appendChild(h("li", { text: r })); });
    var z = h("div", { "class": "contact" });
    C("links").filter(function (l) { return /^https:\/\//i.test(l.url || ""); }).forEach(function (l) { z.appendChild(h("a", { "class": "cbtn", href: l.url, target: "_blank", rel: "noopener", text: l.nome })); });
    w.appendChild(cartao("Regras da equipe", null, [ul, h("h3", { text: "Zello" }), h("p", { "class": "muted", text: "Instale antes do evento. Uso de fones é essencial." }), z, nomeAdmin() ? botaoLink("Editar regras e links", function () { comAdmin(abrirRegras); }) : null], "full"));

    var lista = h("div", { "class": "people" });
    equipeAtual().forEach(function (p) {
      var minhas = state.tasks.filter(function (t) { return !feito(t) && (t.resp.indexOf(p.nome) >= 0 || t.resp.indexOf("Todos") >= 0); });
      var chave = "p-" + p.nome, aberto = !!state.abertos[chave];
      var ini = p.rotulo.split(" ").map(function (x) { return x.charAt(0); }).join("");
      var cab = h("button", { type: "button", "class": "grp-head person-head", "aria-expanded": aberto ? "true" : "false", onclick: function () { state.abertos[chave] = !aberto; render(); } }, [
        h("span", { "class": "avatar", text: ini }),
        h("span", { "class": "p-t" }, [h("b", { text: p.nome }), h("small", { text: p.papel })]),
        minhas.length ? h("span", { "class": "grp-n", text: String(minhas.length) }) : null,
        h("span", { "class": "chev" + (aberto ? " up" : ""), "aria-hidden": "true" })
      ]);
      var card = h("section", { "class": "grp person" }, [cab]);
      if (aberto) {
        var b = h("div", { "class": "p-body" });
        var u = h("ul", { "class": "bul" }); p.resp.forEach(function (r) { u.appendChild(h("li", { text: r })); });
        b.appendChild(u);
        b.appendChild(h("p", { "class": "meta", text: p.completo }));
        b.appendChild(contato(p));
        if (nomeAdmin()) b.appendChild(botaoLink("Editar ou remover " + p.nome, function () { comAdmin(function () { abrirPessoa(p); }); }));
        if (minhas.length) { var rows = h("div", { "class": "rows" }); minhas.forEach(function (t) { rows.appendChild(linha(t)); }); b.appendChild(h("h3", { text: "Pendências" })); b.appendChild(rows); }
        card.appendChild(b);
      }
      lista.appendChild(card);
    });
    w.appendChild(h("h2", { "class": "sec", text: "Quem é quem" }));
    if (nomeAdmin()) w.appendChild(h("button", { type: "button", "class": "btn novo-aviso", text: "Adicionar pessoa", onclick: function () { comAdmin(function () { abrirPessoa(null); }); } }));
    w.appendChild(lista);
    if (admin()) { var rs = botaoRestaurar(["equipe", "regras", "links"], "equipe, regras e links"); if (rs) w.appendChild(rs); }
    return w;
  }

  function acordeao(chave, titulo, kids, sub) {
    var det = h("details", { "class": "acc", open: state.abertos[chave] ? true : null }, [h("summary", null, [h("span", { text: titulo }), sub ? h("small", { text: sub }) : null])].concat(kids));
    det.addEventListener("toggle", function () { state.abertos[chave] = det.open; });
    return det;
  }
  function telaCron() {
    var w = h("div", { "class": "stack" });
    w.appendChild(h("p", { "class": "muted", text: "Tudo recolhido para não pesar. Toque para abrir." }));
    var dias = C("dias").map(function (d, i) {
      var ul = h("ul", { "class": "bul" }); (d.itens || []).forEach(function (x) { ul.appendChild(h("li", { text: x })); });
      return acordeao("d" + i, d.data + " · " + d.titulo, [ul, nomeAdmin() ? botaoLink("Editar ou remover este dia", function () { comAdmin(function () { abrirDia(i); }); }) : null]);
    });
    w.appendChild(h("h2", { "class": "sec", text: "Dia a dia" }));
    dias.forEach(function (x) { w.appendChild(x); });
    if (nomeAdmin()) w.appendChild(botaoLink("Adicionar dia", function () { comAdmin(function () { abrirDia(null); }); }));
    w.appendChild(h("h2", { "class": "sec", text: "Roteiro hora a hora" }));
    var rot = C("roteiro");
    w.appendChild(h("p", { "class": "muted", text: rot.nota || "" }));
    if (nomeAdmin()) w.appendChild(botaoLink("Editar o texto acima", function () { comAdmin(abrirNotaRoteiro); }));
    rot.fases.forEach(function (f, i) {
      var ul = h("ul", { "class": "hora" });
      (f.itens || []).forEach(function (it) {
        ul.appendChild(h("li", null, [h("span", { "class": "h", text: it[0] }), h("div", null, [h("b", { text: it[1] }), it[2] ? h("div", { "class": "t-desc", text: it[2] }) : null])]));
      });
      w.appendChild(acordeao("r" + i, f.nome, [ul, nomeAdmin() ? botaoLink("Editar ou remover esta fase", function () { comAdmin(function () { abrirFase(i); }); }) : null], (f.itens || []).length + " itens"));
    });
    if (nomeAdmin()) w.appendChild(botaoLink("Adicionar fase ao roteiro", function () { comAdmin(function () { abrirFase(null); }); }));
    if (admin()) { var rs = botaoRestaurar(["dias", "roteiro"], "cronograma"); if (rs) w.appendChild(rs); }
    return w;
  }

  function telaAvisos() {
    var w = h("div", { "class": "stack avisos" });
    if (nomeAdmin()) w.appendChild(h("button", { type: "button", "class": "btn novo-aviso", text: "Novo aviso", onclick: function () { comAdmin(function () { abrirAviso(null); }); } }));
    var lista = C("avisosFixos").concat(state.avisos || []);
    lista.forEach(function (a) {
      var cv = h("canvas", { "class": "aviso-cv", role: "img", "aria-label": a.titulo + ". Imagem pronta para o WhatsApp." });
      var msg = h("p", { "class": "meta", role: "status" });
      var pronto = window.AomAviso.desenhar(cv, a).catch(function () { msg.textContent = "Não consegui montar a imagem. Recarregue a página."; });
      function arquivo(fn) {
        var hd = document.createElement("canvas");
        window.AomAviso.desenhar(hd, a, 2).then(function () {
          hd.toBlob(function (b) {
            if (!b) { msg.textContent = "Não consegui gerar a imagem."; return; }
            fn(new File([b], "aom-2026-" + a.id + ".png", { type: "image/png" }));
          }, "image/png");
        }).catch(function () { msg.textContent = "Não consegui gerar a imagem."; });
      }
      function baixar(f) {
        var u = URL.createObjectURL(f), l = h("a", { href: u, download: f.name });
        document.body.appendChild(l); l.click(); l.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        toast("Imagem baixada");
      }
      var enviar = h("button", { type: "button", "class": "btn", text: "Compartilhar imagem", onclick: function () {
        arquivo(function (f) {
          if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
          else baixar(f);
        });
      } });
      var baixa = h("button", { type: "button", "class": "btn ghost", text: "Baixar imagem", onclick: function () { arquivo(baixar); } });
      var copia = h("button", { type: "button", "class": "btn ghost", text: "Copiar texto", onclick: function () {
        var t = window.AomAviso.texto(a);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("Texto copiado"); }, function () { toast("Não consegui copiar.", true); });
        else toast("Seu navegador não permite copiar daqui.", true);
      } });
      var zap = h("button", { type: "button", "class": "btn ghost", text: "Abrir no WhatsApp", onclick: function () {
        window.open("https://wa.me/?text=" + encodeURIComponent(window.AomAviso.texto(a)), "_blank", "noopener");
      } });
      var botoes = [enviar, baixa, copia, zap];
      if (nomeAdmin()) botoes.push(h("button", { type: "button", "class": "btn ghost", text: "Editar", onclick: function () {
        comAdmin(function () { if (a.grupos) abrirGuia(a); else abrirAviso(a); });
      } }));
      w.appendChild(cartao(window.AomAviso.preencher({ t: a.titulo }).t.replace(/\n/g, " "), a.custom ? (a.por ? "Editado por " + a.por + (a.em ? ", " + a.em : "") : "Imagem pronta para o WhatsApp.") : a.tipo === "contagem" ? "O relógio se atualiza sozinho toda vez que a imagem é gerada." : "Imagem 1080 x 1080 pronta para o WhatsApp.", [cv, h("div", { "class": "acoes" }, botoes), msg]));
    });
    if (!lista.length) w.appendChild(h("p", { "class": "empty pad", text: "Nenhum aviso por enquanto." }));
    else {
      var ul = h("ul", { "class": "bul" });
      ["No celular: toque em Compartilhar imagem e escolha o WhatsApp.", "No computador: baixe a imagem e arraste para a conversa.", "Copiar texto leva a mesma mensagem, para colar junto com a imagem."].forEach(function (x) { ul.appendChild(h("li", { text: x })); });
      w.appendChild(cartao("Como enviar", null, [ul]));
    }
    if (admin()) { var rs = botaoRestaurar(["avisosFixos"], "guia de camisas e contagem regressiva"); if (rs) w.appendChild(rs); }
    return w;
  }

  function abrirAviso(a) {
    var novo = !a, fixo = !!(a && a.tipo === "contagem");
    var corpo = h("div", { "class": "form" });
    function campo(rot, id, valor, ph, area, linhas, max) {
      corpo.appendChild(h("label", { "class": "lbl", "for": id, text: rot }));
      var el = area ? h("textarea", { id: id, rows: String(linhas || 7), maxlength: String(max || 1800), placeholder: ph || "" }) : h("input", { id: id, type: "text", maxlength: "120", placeholder: ph || "" });
      el.value = valor || ""; corpo.appendChild(el);
      return el;
    }
    var et = campo("Etiqueta (canto da imagem)", "a-et", novo ? "Aviso à equipe" : a.etiqueta, "Ex.: Aviso aos participantes");
    var ti = campo("Título", "a-ti", novo ? "" : a.titulo, "Ex.: Mudança de horário");
    var su = campo("Subtítulo (opcional)", "a-su", novo ? "AOM 2026 · 2 e 3 de dezembro · Campinas/SP" : a.sub, "");
    var lg = fixo ? campo("Texto abaixo do relógio", "a-lg", a.legenda, "Ex.: para a abertura, quarta (02/12), às 8h30") : null;
    var tx = campo("Mensagem", "a-tx", novo ? "" : a.texto, "Uma ideia por linha. Comece a linha com - para virar tópico. Linha em branco separa os blocos. *Entre asteriscos* fica em negrito.", true);
    corpo.appendChild(h("div", { "class": "aviso-ajuda" }, [
      h("button", { type: "button", "class": "chip", text: "+ Contagem regressiva", onclick: function () {
        var s = tx.selectionStart || tx.value.length, e = tx.selectionEnd || s;
        tx.value = tx.value.slice(0, s) + "{contagem}" + tx.value.slice(e);
        tx.focus(); tx.selectionStart = tx.selectionEnd = s + 10; previa();
      } }),
      h("p", { "class": "meta", text: "{contagem} vira “" + window.AomAviso.preencher({ t: "{contagem}" }).t + "” e se atualiza sozinho (use {Contagem} no começo da frase). Escreva *assim* para negrito, na imagem e no WhatsApp. Emojis funcionam. Uma linha só com um link vai apenas no texto do WhatsApp, não na imagem." })
    ]));
    var dr = campo("Destaque: título (opcional)", "a-dr", novo ? "" : a.dr, "Ex.: Importante:");
    var dt = campo("Destaque: texto (opcional)", "a-dt", novo ? "" : a.dt, "Aparece na caixa laranja no fim da imagem. Pode quebrar linha e usar *negrito*.", true, 6, 800);
    corpo.appendChild(h("label", { "class": "lbl", text: "Prévia da imagem" }));
    var cv = h("canvas", { "class": "aviso-cv", role: "img", "aria-label": "Prévia do aviso" });
    var sf = seletorFig(novo ? {} : a, function () { previa(); });
    corpo.appendChild(sf.el);
    corpo.appendChild(cv);
    function atual() {
      var f = sf.valor(), v = { id: novo ? "" : a.id, etiqueta: et.value.trim(), titulo: ti.value.trim(), sub: su.value.trim(), texto: tx.value, dr: dr.value.trim(), dt: dt.value.trim(), fig: f.fig, figPos: f.figPos };
      if (fixo) { v.tipo = "contagem"; v.legenda = lg.value.trim(); }
      return v;
    }
    var tmr;
    function previa() { clearTimeout(tmr); tmr = setTimeout(function () { var v = atual(); if (!v.titulo) v.titulo = "Título do aviso"; window.AomAviso.desenhar(cv, v).catch(function () {}); }, 250); }
    [et, ti, su, tx, dr, dt, lg].forEach(function (el) { if (el) el.addEventListener("input", previa); });
    previa();
    var botoes = [
      h("button", { type: "button", "class": "btn ghost", text: "Cancelar", onclick: fecharSheet }),
      h("button", { type: "button", "class": "btn", text: "Salvar aviso", onclick: function () {
        var v = atual();
        if (!v.titulo) { ti.focus(); toast("O aviso precisa de um título.", true); return; }
        exigirNome(function () {
          fecharSheet();
          if (fixo) salvarCont("avisosFixos", C("avisosFixos").map(function (x) { return x.id === a.id ? v : x; }), "Aviso atualizado");
          else salvarAviso(v);
        });
      } })
    ];
    corpo.appendChild(h("div", { "class": "btns" }, botoes));
    if (!novo) {
      var zona = h("div", { "class": "apagar" });
      var desenharApagar = function (conf) {
        zona.textContent = "";
        if (!conf) zona.appendChild(h("button", { type: "button", "class": "link danger", text: "Apagar este aviso", onclick: function () { desenharApagar(true); } }));
        else {
          zona.appendChild(h("p", { "class": "meta", text: "Apagar este aviso para todos? Isso não dá para desfazer." }));
          zona.appendChild(h("div", { "class": "btns" }, [
            h("button", { type: "button", "class": "btn ghost", text: "Não apagar", onclick: function () { desenharApagar(false); } }),
            h("button", { type: "button", "class": "btn danger", text: "Sim, apagar", onclick: function () {
              fecharSheet();
              if (fixo) exigirNome(function () { salvarCont("avisosFixos", C("avisosFixos").filter(function (x) { return x.id !== a.id; }), "Aviso apagado"); });
              else apagarAviso(a);
            } })
          ]));
        }
      };
      desenharApagar(false);
      corpo.appendChild(zona);
    }
    abrirSheet(novo ? "Novo aviso" : fixo ? "Editar contagem regressiva" : "Editar aviso", fixo ? "O relógio se atualiza sozinho com o tempo que falta para a abertura." : "Prévia no padrão AOM, pronta para o WhatsApp.", corpo);
  }
  function salvarAviso(v) {
    var quem = eu() ? eu().rotulo : "";
    if (state.modo === "local") {
      v.custom = true; v.por = quem; v.em = agoraTxt();
      if (!v.id) { v.id = "V-" + Date.now().toString(36); state.avisos.push(v); }
      else state.avisos = state.avisos.map(function (x) { return x.id === v.id ? v : x; });
      LS.setItem("aom-avisos", JSON.stringify(state.avisos));
      render(); toast("Aviso salvo neste aparelho"); return;
    }
    toast("Salvando...");
    enviar({ por: quem, aviso: v }).then(function (r) {
      if (!r || !r.ok) throw new Error("falha");
      toast("Aviso salvo"); return sincronizar();
    }).catch(function () { toast("Não consegui salvar o aviso. Confira se o script da planilha foi atualizado.", true); });
  }
  function apagarAviso(a) {
    if (state.modo === "local") {
      state.avisos = state.avisos.filter(function (x) { return x.id !== a.id; });
      LS.setItem("aom-avisos", JSON.stringify(state.avisos));
      render(); toast("Aviso apagado neste aparelho"); return;
    }
    enviar({ por: eu() ? eu().rotulo : "", avisoApagar: a.id }).then(function (r) {
      if (!r || !r.ok) throw new Error("falha");
      state.avisos = state.avisos.filter(function (x) { return x.id !== a.id; });
      render(); toast("Aviso apagado");
    }).catch(function () { toast("Não consegui apagar o aviso.", true); });
  }

  /* ---------- edição de conteúdo ---------- */
  function comAdmin(fn) { if (admin()) fn(); else abrirPin(fn, true); }
  function listaLinhas(s) { return String(s || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  function partes(l) { return String(l).split("|").map(function (x) { return x.trim(); }); }

  function salvarCont(secao, valor, msg) {
    var antes = state.cont[secao];
    if (valor === null) delete state.cont[secao]; else state.cont[secao] = valor;
    reindexar(); render();
    if (state.modo === "local") { LS.setItem("aom-cont", JSON.stringify(state.cont)); toast(msg || "Salvo neste aparelho"); return Promise.resolve(); }
    toast("Salvando...");
    return enviar({ por: eu() ? eu().rotulo : "", conteudo: { secao: secao, valor: valor } }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.erro || "falha");
      toast(msg || "Salvo");
    }).catch(function () {
      if (antes === undefined) delete state.cont[secao]; else state.cont[secao] = antes;
      reindexar(); render();
      toast("Não consegui salvar. Confira se o script da planilha foi atualizado.", true);
    });
  }

  function confirmar(titulo, msg, rot, fn) {
    var corpo = h("div", { "class": "form" }, [
      h("p", { "class": "desc", text: msg }),
      h("div", { "class": "btns" }, [
        h("button", { type: "button", "class": "btn ghost", text: "Cancelar", onclick: fecharSheet }),
        h("button", { type: "button", "class": "btn danger", text: rot, onclick: function () { exigirNome(function () { fecharSheet(); fn(); }); } })
      ])
    ]);
    abrirSheet(titulo, null, corpo);
  }
  function botaoRestaurar(secoes, rotulo) {
    if (!secoes.some(function (s) { return state.cont[s] !== undefined; })) return null;
    return h("div", { "class": "apagar" }, [h("button", { type: "button", "class": "link", text: "Restaurar " + rotulo + " ao padrão original", onclick: function () {
      confirmar("Restaurar o padrão?", "As alterações feitas pelo painel em " + rotulo + " serão descartadas para todos.", "Sim, restaurar", function () {
        secoes.reduce(function (p, s) { return p.then(function () { return state.cont[s] !== undefined ? salvarCont(s, null, "Padrão restaurado") : null; }); }, Promise.resolve());
      });
    } })]);
  }

  var THOM = [["1", "Espiando", "assets/img/mascote.webp"], ["2", "Sorrindo", "assets/img/thom-2.webp"], ["3", "Animado", "assets/img/thom-3.webp"], ["4", "Sapeca", "assets/img/thom-4.webp"], ["5", "Curioso", "assets/img/thom-5.webp"], ["6", "Com a camisa", "assets/img/thom-6.webp"]];
  function seletorFig(ini, aoMudar) {
    var box = h("div", { "class": "figsel" });
    var chk = h("input", { type: "checkbox", id: "fig-on" });
    chk.checked = !!ini.fig;
    var sel = THOM.some(function (t) { return t[0] === ini.fig; }) ? ini.fig : "1";
    var grade = h("div", { "class": "thom-grid", role: "radiogroup", "aria-label": "Escolha o Thom" });
    var bts = THOM.map(function (t) {
      var b = h("button", { type: "button", "class": "thom-op", role: "radio", onclick: function () { sel = t[0]; marcar(); aoMudar(); } },
        [h("img", { src: t[2], alt: "", loading: "lazy" }), h("span", { text: t[1] })]);
      grade.appendChild(b); return b;
    });
    var dica = h("p", { "class": "meta", text: "Escolha o Thom. Ele aparece no canto de baixo, à direita." });
    function marcar() {
      grade.hidden = dica.hidden = !chk.checked;
      bts.forEach(function (b, i) { b.setAttribute("aria-checked", String(THOM[i][0] === sel)); });
    }
    chk.addEventListener("change", function () { marcar(); aoMudar(); });
    box.appendChild(h("label", { "class": "chk", "for": "fig-on" }, [chk, h("span", { text: "Inserir o Thom no anúncio" })]));
    box.appendChild(dica);
    box.appendChild(grade);
    marcar();
    return { el: box, valor: function () { return chk.checked ? { fig: sel, figPos: "dir" } : { fig: "", figPos: "" }; } };
  }

  function abrirEditor(o) {
    var corpo = h("div", { "class": "form" }), els = {};
    o.campos.forEach(function (c, i) {
      var id = "ed-" + i;
      corpo.appendChild(h("label", { "class": "lbl", "for": id, text: c.rot }));
      var el = c.ta ? h("textarea", { id: id, rows: String(c.rows || 4), maxlength: String(c.max || 1500), placeholder: c.ph || "" })
        : h("input", { id: id, type: "text", maxlength: String(c.max || 120), placeholder: c.ph || "" });
      el.value = c.valor || "";
      if (c.ro) { el.readOnly = true; el.className = "ro"; }
      corpo.appendChild(el); els[c.k] = el;
      if (c.dica) corpo.appendChild(h("p", { "class": "meta", text: c.dica }));
    });
    if (o.extra) corpo.appendChild(o.extra);
    corpo.appendChild(h("div", { "class": "btns" }, [
      h("button", { type: "button", "class": "btn ghost", text: "Cancelar", onclick: fecharSheet }),
      h("button", { type: "button", "class": "btn", text: "Salvar", onclick: function () {
        var v = {}; Object.keys(els).forEach(function (k) { v[k] = els[k].value; });
        var erro = o.valida ? o.valida(v) : "";
        if (erro) { toast(erro, true); return; }
        exigirNome(function () { fecharSheet(); o.aplicar(v); });
      } })
    ]));
    if (o.apagar) {
      var zona = h("div", { "class": "apagar" });
      var desenhar = function (conf) {
        zona.textContent = "";
        if (!conf) zona.appendChild(h("button", { type: "button", "class": "link danger", text: o.rotApagar || "Apagar", onclick: function () { desenhar(true); } }));
        else {
          zona.appendChild(h("p", { "class": "meta", text: o.msgApagar || "Apagar para todos? Isso não dá para desfazer." }));
          zona.appendChild(h("div", { "class": "btns" }, [
            h("button", { type: "button", "class": "btn ghost", text: "Não apagar", onclick: function () { desenhar(false); } }),
            h("button", { type: "button", "class": "btn danger", text: "Sim, apagar", onclick: function () { exigirNome(function () { fecharSheet(); o.apagar(); }); } })
          ]));
        }
      };
      desenhar(false); corpo.appendChild(zona);
    }
    abrirSheet(o.titulo, o.sub || null, corpo);
  }

  function pessoaMin(p) { return { nome: p.nome, rotulo: p.rotulo, papel: p.papel || "", resp: (p.resp || []).slice() }; }
  function abrirPessoa(p) {
    var novo = !p, admins = D.admins || [];
    abrirEditor({
      titulo: novo ? "Adicionar pessoa" : p.nome, sub: novo ? "Só o primeiro nome e a inicial do sobrenome, como na planilha." : p.rotulo,
      campos: [
        { k: "nome", rot: "Primeiro nome", valor: novo ? "" : p.nome, ro: !novo, max: 24 },
        { k: "ini", rot: "Inicial do sobrenome", valor: novo ? "" : p.rotulo.replace(/\.$/, "").split(" ").pop(), ro: !novo, max: 1, ph: "Ex.: S" },
        { k: "papel", rot: "Função no evento", valor: novo ? "" : p.papel, max: 80, ph: "Ex.: Recepção" },
        { k: "resp", rot: "Responsabilidades", ta: true, rows: 5, valor: novo ? "" : p.resp.join("\n"), dica: "Uma por linha." }
      ],
      valida: function (v) {
        if (!novo) return "";
        var n = v.nome.trim();
        if (!/^[A-Za-z\u00c0-\u00ff'-]+$/.test(n)) return "Escreva só o primeiro nome, sem espaços.";
        if (!/^[A-Za-z\u00c0-\u00ff]$/.test(v.ini.trim())) return "Escreva uma letra para a inicial do sobrenome.";
        if (byNome[n]) return "Já existe alguém com esse nome na equipe.";
        return "";
      },
      aplicar: function (v) {
        var lista = equipeAtual().map(pessoaMin);
        var nova = { nome: novo ? v.nome.trim() : p.nome, rotulo: novo ? v.nome.trim() + " " + v.ini.trim().toUpperCase() + "." : p.rotulo, papel: v.papel.trim(), resp: listaLinhas(v.resp) };
        if (novo) lista.push(nova); else lista = lista.map(function (x) { return x.nome === p.nome ? nova : x; });
        salvarCont("equipe", lista, novo ? nova.nome + " entrou na equipe" : "Equipe atualizada");
      },
      apagar: !novo && admins.indexOf(p.nome) < 0 ? function () {
        salvarCont("equipe", equipeAtual().map(pessoaMin).filter(function (x) { return x.nome !== p.nome; }), p.nome + " saiu da equipe");
      } : null,
      rotApagar: "Remover " + (p ? p.nome : "") + " da equipe",
      msgApagar: "Remover da equipe? As tarefas dessa pessoa continuam na lista, mas sem vínculo com um nome."
    });
  }

  function abrirRegras() {
    abrirEditor({
      titulo: "Regras e links", sub: "Aparecem na aba Equipe.",
      campos: [
        { k: "regras", rot: "Regras da equipe", ta: true, rows: 8, valor: C("regras").join("\n"), dica: "Uma regra por linha." },
        { k: "links", rot: "Links (Zello e outros)", ta: true, rows: 4, valor: C("links").map(function (l) { return l.nome + " | " + l.url; }).join("\n"), dica: "Um por linha, assim: Nome | https://endereço" }
      ],
      valida: function (v) {
        var ruim = listaLinhas(v.links).some(function (l) { var p = partes(l); return !p[0] || !/^https:\/\//i.test(p[1] || ""); });
        return ruim ? "Cada link precisa de um nome e de um endereço que comece com https://" : "";
      },
      aplicar: function (v) {
        var links = listaLinhas(v.links).map(function (l) { var p = partes(l); return { nome: p[0], url: p.slice(1).join("|").trim() }; });
        salvarCont("regras", listaLinhas(v.regras), "Regras salvas").then(function () { return salvarCont("links", links, "Regras e links salvos"); });
      }
    });
  }

  function abrirDia(i) {
    var novo = i === null, d = novo ? { data: "", titulo: "", itens: [] } : C("dias")[i];
    abrirEditor({
      titulo: novo ? "Adicionar dia" : "Editar dia", sub: novo ? null : d.data + " · " + d.titulo,
      campos: [
        { k: "data", rot: "Data", valor: d.data, ph: "Ex.: Seg 30/11", max: 30 },
        { k: "titulo", rot: "Título", valor: d.titulo, max: 90 },
        { k: "itens", rot: "O que acontece", ta: true, rows: 8, valor: (d.itens || []).join("\n"), dica: "Um item por linha." }
      ],
      valida: function (v) { return v.titulo.trim() ? "" : "O dia precisa de um título."; },
      aplicar: function (v) {
        var lista = C("dias").slice(), nd = { data: v.data.trim(), titulo: v.titulo.trim(), itens: listaLinhas(v.itens) };
        if (novo) lista.push(nd); else lista[i] = nd;
        salvarCont("dias", lista, "Cronograma atualizado");
      },
      apagar: novo ? null : function () { var lista = C("dias").slice(); lista.splice(i, 1); salvarCont("dias", lista, "Dia removido"); },
      rotApagar: "Remover este dia", msgApagar: "Remover este dia do cronograma? Isso não dá para desfazer."
    });
  }
  function salvarRoteiro(r, msg) { return salvarCont("roteiro", r, msg || "Roteiro atualizado"); }
  function abrirNotaRoteiro() {
    var r = C("roteiro");
    abrirEditor({
      titulo: "Texto do roteiro", campos: [{ k: "nota", rot: "Texto de apresentação", ta: true, rows: 3, valor: r.nota || "", max: 400 }],
      aplicar: function (v) { salvarRoteiro({ nota: v.nota.trim(), fases: r.fases }); }
    });
  }
  function abrirFase(i) {
    var novo = i === null, r = C("roteiro"), f = novo ? { nome: "", itens: [] } : r.fases[i];
    abrirEditor({
      titulo: novo ? "Adicionar fase" : "Editar fase", sub: novo ? null : f.nome,
      campos: [
        { k: "nome", rot: "Nome da fase", valor: f.nome, ph: "Ex.: Evento, dia 1 (02/12)", max: 90 },
        { k: "itens", rot: "Horários", ta: true, rows: 10, max: 4000, valor: (f.itens || []).map(function (it) { return it[2] ? it.join(" | ") : it[0] + " | " + it[1]; }).join("\n"), dica: "Uma linha por item: horário | o que fazer | detalhe (opcional)" }
      ],
      valida: function (v) { return v.nome.trim() ? "" : "A fase precisa de um nome."; },
      aplicar: function (v) {
        var itens = listaLinhas(v.itens).map(function (l) { var p = partes(l); return p.length === 1 ? ["", p[0], ""] : [p[0], p[1], p.slice(2).join(" | ")]; });
        var fases = r.fases.slice(), nf = { nome: v.nome.trim(), itens: itens };
        if (novo) fases.push(nf); else fases[i] = nf;
        salvarRoteiro({ nota: r.nota, fases: fases });
      },
      apagar: novo ? null : function () { var fases = r.fases.slice(); fases.splice(i, 1); salvarRoteiro({ nota: r.nota, fases: fases }, "Fase removida"); },
      rotApagar: "Remover esta fase", msgApagar: "Remover esta fase e todos os horários dela? Isso não dá para desfazer."
    });
  }

  function abrirGuia(a) {
    var campos = [
      { k: "etiqueta", rot: "Etiqueta (canto da imagem)", valor: a.etiqueta, max: 60 },
      { k: "titulo", rot: "Título", ta: true, rows: 2, valor: a.titulo, max: 120, dica: "Uma quebra de linha separa o título em duas linhas." },
      { k: "sub", rot: "Subtítulo", valor: a.sub, max: 120 }
    ];
    a.grupos.forEach(function (g, i) {
      campos.push({ k: "gn" + i, rot: "Bloco " + (i + 1) + ": nome", valor: g.nome, max: 30 });
      campos.push({ k: "gl" + i, rot: "Bloco " + (i + 1) + ": legenda", valor: g.legenda, max: 60 });
      campos.push({ k: "gi" + i, rot: "Bloco " + (i + 1) + ": itens", ta: true, rows: 4, valor: g.itens.map(function (it) { return it[0] + " | " + it[1]; }).join("\n"), dica: "Uma linha por item: quando | o que usar" });
    });
    campos.push({ k: "r0", rot: "Caixa laranja: título", valor: a.regra[0], max: 60 });
    campos.push({ k: "r1", rot: "Caixa laranja: texto", ta: true, rows: 8, valor: a.regra[1], max: 1200, dica: "Pode quebrar linha, deixar linha em branco entre os itens e usar *negrito*." });
    var cvG = h("canvas", { "class": "aviso-cv", role: "img", "aria-label": "Prévia do anúncio" });
    var sfG = seletorFig(a, function () { var f = sfG.valor(), p = JSON.parse(JSON.stringify(a)); p.fig = f.fig; p.figPos = f.figPos; window.AomAviso.desenhar(cvG, p).catch(function () {}); });
    var extra = h("div", null, [sfG.el, cvG]);
    window.AomAviso.desenhar(cvG, a).catch(function () {});
    abrirEditor({
      extra: extra,
      titulo: "Editar aviso", sub: "Guia pronto para o WhatsApp.", campos: campos,
      valida: function (v) { return v.titulo.trim() ? "" : "O aviso precisa de um título."; },
      aplicar: function (v) {
        var n = JSON.parse(JSON.stringify(a));
        var fg = sfG.valor(); n.fig = fg.fig; n.figPos = fg.figPos;
        n.etiqueta = v.etiqueta.trim(); n.titulo = v.titulo.trim(); n.sub = v.sub.trim();
        n.grupos.forEach(function (g, i) {
          g.nome = v["gn" + i].trim(); g.legenda = v["gl" + i].trim();
          g.itens = listaLinhas(v["gi" + i]).map(function (l) { var p = partes(l); return [p[0], p.slice(1).join(" | ")]; });
        });
        n.regra = [v.r0.trim(), v.r1.trim()];
        salvarCont("avisosFixos", C("avisosFixos").map(function (x) { return x.id === a.id ? n : x; }), "Aviso atualizado");
      },
      apagar: function () { salvarCont("avisosFixos", C("avisosFixos").filter(function (x) { return x.id !== a.id; }), "Aviso apagado"); },
      rotApagar: "Apagar este aviso", msgApagar: "Apagar este aviso para todos?"
    });
  }

  var TELAS = { inicio: telaInicio, tarefas: telaTarefas, equipe: telaEquipe, avisos: telaAvisos, cron: telaCron };
  window.AomAviso.config({ inicio: D.evento.inicio });
  var NAV = [["inicio", "Início"], ["tarefas", "Tarefas"], ["equipe", "Equipe"], ["avisos", "Avisos"], ["cron", "Cronograma"]];

  function renderNav() {
    var nav = $("nav"); nav.textContent = "";
    var pend = operacionais().filter(function (t) { return !feito(t); }).length;
    NAV.forEach(function (n) {
      var b = h("button", { type: "button", "class": "nav-b" + (state.view === n[0] ? " on" : ""), "aria-current": state.view === n[0] ? "page" : null, onclick: function () { irPara(n[0]); } },
        [icon(n[0]), h("span", { text: n[1] }), n[0] === "tarefas" && pend ? h("em", { text: String(pend) }) : null]);
      nav.appendChild(b);
    });
  }
  function renderQuem() {
    var b = $("who"); b.textContent = "";
    var e = eu();
    if (e) { b.appendChild(h("span", { "class": "avatar sm" + (admin() ? " adm" : ""), title: admin() ? "Administrador" : null, text: e.rotulo.split(" ").map(function (x) { return x.charAt(0); }).join("") })); b.appendChild(h("span", { "class": "who-n", text: e.nome })); }
    else b.appendChild(h("span", { "class": "who-n", text: state.me === "_" ? "Só leitura" : "Quem é você?" }));
    b.onclick = function () { abrirNome(); };
  }
  function renderConn() {
    var b = $("conn");
    if (state.modo !== "sync") { b.hidden = true; return; }
    var est, txt, info;
    var hora = state.ultimaSync ? state.ultimaSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
    if (state.salvando > 0) { est = "salvando"; txt = "Salvando"; info = "Salvando na planilha..."; }
    else if (state.erroSync) { est = "erro"; txt = "Sem conexão"; info = "Sem conexão com a planilha. Toque para tentar de novo."; }
    else if (!state.ultimaSync) { est = "conectando"; txt = "Conectando"; info = "Conectando à planilha..."; }
    else if (Date.now() - state.flashSalvo < 4000) { est = "salvo"; txt = "Salvo"; info = "Salvo na planilha."; }
    else { est = "ok"; txt = "Conectado"; info = "Planilha conectada. Atualizado às " + hora + "."; }
    b.hidden = false; b.className = "conn " + est; b.title = info; b.setAttribute("aria-label", info);
    b.textContent = "";
    b.appendChild(est === "ok" || est === "salvo" ? icon("ok") : h("i", { "class": "dot" }));
    b.appendChild(h("span", { "class": "conn-t", text: txt }));
    b.onclick = function () { toast(info, est === "erro"); sincronizar(); };
  }
  function renderBanner() {
    renderConn();
    var b = $("banner"), msg = "";
    if (state.erroSync) msg = "Sem conexão com a planilha. Você está vendo a última versão carregada.";
    else if (state.modo === "sync" && state.versaoScript !== null && state.versaoScript < VERSAO_SCRIPT && nomeAdmin()) msg = "O script da planilha está desatualizado. Cole o script novo e atualize: Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar.";
    else if (state.modo === "local") msg = "Modo de teste: o que você marcar fica só neste aparelho.";
    b.hidden = !msg; b.textContent = msg; b.className = "banner" + (state.erroSync || msg.indexOf("desatualizado") >= 0 ? " erro" : "");
  }
  function renderRodape() {
    var t = state.modo === "sync" ? (state.ultimaSync ? "Atualizado às " + state.ultimaSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Carregando...") : "Dados de " + D.evento.atualizado;
    $("rodape").textContent = t;
  }
  function render() {
    var y = window.scrollY;
    renderNav(); renderQuem(); renderBanner(); renderRodape();
    var v = $("view"); v.textContent = "";
    try {
      if (state.modo === "sync" && !state.ultimaSync && !state.temCache && !state.erroSync) {
        v.appendChild(h("section", { "class": "card" }, [h("p", { "class": "muted", text: "Carregando os dados da planilha..." })]));
        $("fab").hidden = true; return;
      }
      var tela = TELAS[state.view]();
      if ((state.view === "equipe" || state.view === "cron" || state.view === "avisos") && !admin()) {
        if (nomeAdmin()) tela.insertBefore(h("section", { "class": "card" }, [
          h("p", { "class": "muted", text: "Para editar, criar ou apagar nesta página, entre como administrador." }),
          h("button", { type: "button", "class": "btn", text: "Entrar como administrador", onclick: function () { abrirPin(null, true); } })
        ]), tela.firstChild);
        else tela.appendChild(h("p", { "class": "muted pad", text: state.me ? "Esta página é editada pelos administradores. Para entrar como administrador, toque no seu nome no topo e escolha Kaio ou Vini." : "Para editar, toque em “Quem é você?” no topo e escolha o seu nome. Esta página é editada pelos administradores." }));
      }
      v.appendChild(tela);
    }
    catch (e) {
      v.appendChild(h("div", { "class": "card" }, [
        h("h2", { text: "Algo deu errado nesta tela" }),
        h("p", { "class": "muted", text: String(e && e.message || e) }),
        h("button", { type: "button", "class": "btn", text: "Limpar dados deste aparelho e recarregar", onclick: function () {
          try { LS.removeItem("aom-local"); LS.removeItem("aom-me"); SS.removeItem("aom-cache"); SS.removeItem("aom-cache-adm"); } catch (x) {}
          location.reload();
        } })
      ]));
    }
    $("fab").hidden = state.view !== "tarefas";
    window.scrollTo(0, y);
  }

  function contagem() {
    var c = $("countdown");
    var diff = new Date(D.evento.inicio).getTime() - Date.now();
    if (diff <= 0) { c.innerHTML = ""; c.appendChild(h("strong", { text: Date.now() < new Date("2026-12-04T00:00:00-03:00").getTime() ? "Evento em andamento" : "Evento encerrado" })); return; }
    var d = Math.floor(diff / 864e5), hh = Math.floor(diff % 864e5 / 36e5);
    c.textContent = ""; c.appendChild(h("strong", { text: d + "d " + hh + "h" })); c.appendChild(h("span", { text: "para a abertura" }));
  }

  $("fab").onclick = abrirNova;
  try { carregarBase(); }
  catch (e) { try { LS.removeItem("aom-local"); } catch (x) {} carregarBase(); }
  if (state.modo === "sync") { state.temCache = carregarCache(); if (state.temCache) { state.dadosPlanilha = true; state.chaveDados = chaveCache(); } }
  contagem(); setInterval(contagem, 60000);
  render();
  if (state.modo === "sync") {
    sincronizar();
    setInterval(sincronizar, 45000);
    setInterval(function () {
      var mudou = false, agora = Date.now();
      Object.keys(state.salvos).forEach(function (id) { if (agora - state.salvos[id].em > SALVO_MS) { delete state.salvos[id]; mudou = true; } });
      if (mudou && !sheetAberto()) render();
    }, 20000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) sincronizar(); });
  }
  var hash = (location.hash || "").slice(1);
  if (TELAS[hash]) irPara(hash);
};
