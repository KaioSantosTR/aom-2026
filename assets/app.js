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
  var ICON = {
    inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    tarefas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/></svg>',
    equipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.2c2.3.3 4 2.1 4 4.8"/></svg>',
    cron: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    avisos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M18.5 9a4 4 0 0 1 0 6"/></svg>'
  };

  var state = {
    view: "inicio", filtro: "pend", abertos: {},
    me: LS.getItem("aom-me") || "",
    tasks: [], momentos: D.momentos.slice(),
    modo: D.sync && D.sync.url ? "sync" : "local",
    ultimaSync: null, erroSync: false
  };

  var byNome = {}, byRotulo = {};
  D.equipe.forEach(function (p) { byNome[p.nome] = p; byRotulo[p.rotulo] = p; });
  if (state.me && state.me !== "_" && !byNome[state.me]) state.me = "";
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
    var over = {}, novas = [];
    try { var st = JSON.parse(LS.getItem("aom-local") || "{}"); over = st.over || {}; novas = st.novas || []; } catch (e) {}
    state.tasks = D.tarefas.map(function (t) {
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
  function sincronizar() {
    if (state.modo !== "sync" || sincronizando) return Promise.resolve();
    sincronizando = true;
    return api("GET").then(function (r) {
      if (r && r.erro === "pin") { state.pin = ""; LS.removeItem("aom-pin"); sincronizando = false; return sincronizar(); }
      if (!r || !r.ok) throw new Error("falha");
      state.tasks = deLinhas(r.linhas);
      state.ultimaSync = new Date(); state.erroSync = false;
      if (!sheetAberto()) render();
    }).catch(function () { state.erroSync = true; renderBanner(); })
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
    api("POST", corpo).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.erro || "falha");
      toast("Salvo na planilha");
    }).catch(function (err) {
      Object.keys(antes).forEach(function (k) { t[k] = antes[k]; });
      render();
      var m = err && err.message;
      if (m === "pin") { state.pin = ""; LS.removeItem("aom-pin"); render(); toast("O PIN de administrador não foi aceito. Entre de novo.", true); }
      else if (m === "permissao") toast("Só quem é responsável pela tarefa ou administrador pode fazer isso.", true);
      else toast("Não consegui salvar. Tente de novo.", true);
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
    D.equipe.forEach(function (p) {
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

  function abrirPin(depois) {
    var corpo = h("form", { "class": "form", autocomplete: "off" });
    corpo.appendChild(h("p", { "class": "muted", text: "Administradores criam e editam tarefas. Os demais só assumem tarefas e atualizam as suas." }));
    var pin = h("input", { type: "password", id: "f-pin", inputmode: "numeric", autocomplete: "off", placeholder: "PIN de administrador", "aria-label": "PIN de administrador" });
    var msg = h("p", { "class": "meta", role: "alert" });
    corpo.appendChild(pin); corpo.appendChild(msg);
    corpo.appendChild(h("div", { "class": "btns" }, [
      h("button", { type: "button", "class": "btn ghost", text: "Agora não", onclick: function () { fecharSheet(); if (depois) depois(); } }),
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
      var nomes = D.equipe.map(function (p) { return p.nome; });
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
    if (pode) botoes.push(h("button", { type: "button", "class": "btn", text: "Salvar", onclick: function () {
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
      });
    } }));
    corpo.appendChild(h("div", { "class": "btns" }, botoes));
    abrirSheet(adm ? "Editar tarefa" : t.titulo, rotuloMomento(t.quando), corpo);
  }

  function abrirNova() {
    if (!admin()) { if (nomeAdmin()) abrirPin(); else toast("Só os administradores criam tarefas.", true); return; }
    var draft = { resp: [] };
    var corpo = h("div", { "class": "form" });
    corpo.appendChild(h("label", { "class": "lbl", "for": "n-t", text: "O que precisa ser feito?" }));
    var tit = h("input", { id: "n-t", type: "text", maxlength: "120", placeholder: "Ex.: Levar extensões para a sala" });
    corpo.appendChild(tit);
    corpo.appendChild(h("label", { "class": "lbl", "for": "n-q", text: "Quando" }));
    var q = h("select", { id: "n-q" });
    state.momentos.forEach(function (m) { q.appendChild(h("option", { value: m.id, text: m.rotulo })); });
    q.value = momentoAtual();
    corpo.appendChild(q);
    corpo.appendChild(h("label", { "class": "lbl", text: "Responsável" }));
    corpo.appendChild(chipsResp(draft.resp));
    var privada = h("input", { type: "checkbox", id: "n-priv" });
    corpo.appendChild(h("label", { "class": "chk", "for": "n-priv" }, [privada, h("span", { text: "Só Kaio e Vini enxergam esta tarefa" })]));
    corpo.appendChild(h("div", { "class": "btns" }, [
      h("button", { type: "button", "class": "btn ghost", text: "Cancelar", onclick: fecharSheet }),
      h("button", { type: "button", "class": "btn", text: "Criar tarefa", onclick: function () {
        var titulo = tit.value.trim();
        if (!titulo) { tit.focus(); toast("Escreva o que precisa ser feito.", true); return; }
        exigirNome(function () {
          var quem = eu().rotulo, quando = q.value;
          fecharSheet();
          if (state.modo === "local") {
            var t = { id: "N-" + Date.now().toString(36), quando: quando, titulo: titulo, desc: "", status: "A fazer", resp: draft.resp.slice(), sug: [], obs: "", por: quem, em: agoraTxt() };
            state.tasks.push(t); salvarLocal(t); render(); toast("Tarefa criada neste aparelho");
          } else {
            api("POST", { por: quem, novo: { titulo: titulo, desc: "", quando: rotuloMomento(quando), resp: toLabels(draft.resp), restrita: privada.checked } })
              .then(function (r) { if (!r || !r.ok) throw new Error("falha"); toast("Tarefa criada"); return sincronizar(); })
              .catch(function () { toast("Não consegui criar a tarefa.", true); });
          }
        });
      } })
    ]));
    abrirSheet("Nova tarefa", null, corpo);
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

  function irPara(view, filtro, abrir) {
    state.view = view; if (filtro) state.filtro = filtro;
    if (abrir) state.abertos["m-" + abrir] = true;
    render(); window.scrollTo(0, 0);
  }

  /* ---------- componentes ---------- */
  function linha(t) {
    var meta = h("span", { "class": "row-meta" });
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
    var ul = h("ul", { "class": "bul" }); D.regras.forEach(function (r) { ul.appendChild(h("li", { text: r })); });
    var z = h("div", { "class": "contact" });
    D.links.forEach(function (l) { z.appendChild(h("a", { "class": "cbtn", href: l.url, target: "_blank", rel: "noopener", text: l.nome })); });
    w.appendChild(cartao("Regras da equipe", null, [ul, h("h3", { text: "Zello" }), h("p", { "class": "muted", text: "Instale antes do evento e leve o seu fone de ouvido." }), z], "full"));

    var lista = h("div", { "class": "people" });
    D.equipe.forEach(function (p) {
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
        if (minhas.length) { var rows = h("div", { "class": "rows" }); minhas.forEach(function (t) { rows.appendChild(linha(t)); }); b.appendChild(h("h3", { text: "Pendências" })); b.appendChild(rows); }
        card.appendChild(b);
      }
      lista.appendChild(card);
    });
    w.appendChild(h("h2", { "class": "sec", text: "Quem é quem" }));
    w.appendChild(lista);
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
    var dias = D.dias.map(function (d, i) {
      var ul = h("ul", { "class": "bul" }); d.itens.forEach(function (x) { ul.appendChild(h("li", { text: x })); });
      return acordeao("d" + i, d.data + " · " + d.titulo, [ul]);
    });
    w.appendChild(h("h2", { "class": "sec", text: "Dia a dia" }));
    dias.forEach(function (x) { w.appendChild(x); });
    w.appendChild(h("h2", { "class": "sec", text: "Roteiro hora a hora" }));
    w.appendChild(h("p", { "class": "muted", text: D.roteiro.nota }));
    D.roteiro.fases.forEach(function (f, i) {
      var ul = h("ul", { "class": "hora" });
      f.itens.forEach(function (it) {
        ul.appendChild(h("li", null, [h("span", { "class": "h", text: it[0] }), h("div", null, [h("b", { text: it[1] }), it[2] ? h("div", { "class": "t-desc", text: it[2] }) : null])]));
      });
      w.appendChild(acordeao("r" + i, f.nome, [ul], f.itens.length + " itens"));
    });
    return w;
  }

  function telaAvisos() {
    var w = h("div", { "class": "stack avisos" });
    (D.avisos || []).forEach(function (a) {
      var cv = h("canvas", { "class": "aviso-cv", role: "img", "aria-label": a.titulo + ". Imagem pronta para o WhatsApp." });
      var msg = h("p", { "class": "meta", role: "status" });
      var pronto = window.AomAviso.desenhar(cv, a).catch(function () { msg.textContent = "Não consegui montar a imagem. Recarregue a página."; });
      function arquivo(fn) {
        pronto.then(function () {
          cv.toBlob(function (b) {
            if (!b) { msg.textContent = "Não consegui gerar a imagem."; return; }
            fn(new File([b], "aom-2026-" + a.id + ".png", { type: "image/png" }));
          }, "image/png");
        });
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
      w.appendChild(cartao(a.titulo, "Imagem 1080 x 1080 pronta para o WhatsApp.", [cv, h("div", { "class": "acoes" }, [enviar, baixa, copia]), msg]));
    });
    if (!(D.avisos || []).length) w.appendChild(h("p", { "class": "empty pad", text: "Nenhum aviso por enquanto." }));
    else {
      var ul = h("ul", { "class": "bul" });
      ["No celular: toque em Compartilhar imagem e escolha o WhatsApp.", "No computador: baixe a imagem e arraste para a conversa.", "Copiar texto leva a mesma mensagem, para colar junto com a imagem."].forEach(function (x) { ul.appendChild(h("li", { text: x })); });
      w.appendChild(cartao("Como enviar", null, [ul]));
    }
    return w;
  }

  var TELAS = { inicio: telaInicio, tarefas: telaTarefas, equipe: telaEquipe, avisos: telaAvisos, cron: telaCron };
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
    if (e) { b.appendChild(h("span", { "class": "avatar sm", text: e.rotulo.split(" ").map(function (x) { return x.charAt(0); }).join("") })); b.appendChild(h("span", { "class": "who-n", text: e.nome })); }
    else b.appendChild(h("span", { "class": "who-n", text: state.me === "_" ? "Só leitura" : "Quem é você?" }));
    b.onclick = function () { abrirNome(); };
  }
  function renderBanner() {
    var b = $("banner"), msg = "";
    if (state.erroSync) msg = "Sem conexão com a planilha. Você está vendo a última versão carregada.";
    else if (state.modo === "local") msg = "Modo de teste: o que você marcar fica só neste aparelho.";
    b.hidden = !msg; b.textContent = msg; b.className = "banner" + (state.erroSync ? " erro" : "");
  }
  function renderRodape() {
    var t = state.modo === "sync" ? (state.ultimaSync ? "Atualizado às " + state.ultimaSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Carregando...") : "Dados de " + D.evento.atualizado;
    $("rodape").textContent = t;
  }
  function render() {
    var y = window.scrollY;
    renderNav(); renderQuem(); renderBanner(); renderRodape();
    var v = $("view"); v.textContent = "";
    try { v.appendChild(TELAS[state.view]()); }
    catch (e) {
      v.appendChild(h("div", { "class": "card" }, [
        h("h2", { text: "Algo deu errado nesta tela" }),
        h("p", { "class": "muted", text: String(e && e.message || e) }),
        h("button", { type: "button", "class": "btn", text: "Limpar dados deste aparelho e recarregar", onclick: function () {
          try { LS.removeItem("aom-local"); LS.removeItem("aom-me"); } catch (x) {}
          location.reload();
        } })
      ]));
    }
    $("fab").hidden = state.view !== "tarefas" || !admin();
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
  contagem(); setInterval(contagem, 60000);
  render();
  if (state.modo === "sync") {
    sincronizar();
    setInterval(sincronizar, 45000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) sincronizar(); });
  }
  var hash = (location.hash || "").slice(1);
  if (TELAS[hash]) irPara(hash);
};
