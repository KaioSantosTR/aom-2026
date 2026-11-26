window.startApp = function (D) {
  var STATUS = { C: "Concluído", E: "Em andamento", N: "Não iniciado", V: "A verificar", D: "Decisão pendente" };
  var PRIO = { A: "Alta", M: "Média", B: "Baixa" };
  var ORDER = ["C", "E", "N", "V", "D"];
  var COLOR = { C: "var(--c-C)", E: "var(--c-E)", N: "var(--c-N)", V: "var(--c-V)", D: "var(--c-D)" };

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.textContent = html;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  var tasks = D.tarefas.map(function (t) {
    var conf = D.responsaveis.confirmado[t[0]];
    var sug = D.responsaveis.sugerido[t[0]];
    return {
      id: t[0], area: t[1], titulo: t[2], desc: t[3], prio: t[4], status: t[5], obs: t[6],
      resp: conf || sug || [], sugerido: !conf && !!sug,
      origem: t[0].indexOf("REU") === 0 ? "reuniao" : t[0].indexOf("CRO") === 0 ? "cronograma" : "plano"
    };
  });
  var byId = {};
  tasks.forEach(function (t) { byId[t.id] = t; });

  function countdown() {
    var alvo = new Date(D.evento.inicio).getTime();
    var diff = alvo - Date.now();
    var c = $("countdown");
    if (diff <= 0) {
      var fim = new Date("2026-12-04T00:00:00-03:00").getTime();
      c.innerHTML = Date.now() < fim ? "<strong>Evento em andamento</strong>" : "<strong>Evento encerrado</strong>";
      return;
    }
    var d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5);
    c.innerHTML = "<strong>" + d + (d === 1 ? " dia" : " dias") + " e " + h + "h</strong>para a abertura (02/12, 8h30)";
  }

  function kpis() {
    var total = tasks.length;
    var done = tasks.filter(function (t) { return t.status === "C"; }).length;
    var semResp = tasks.filter(function (t) { return !t.resp.length && t.status !== "C"; }).length;
    var altaSem = tasks.filter(function (t) { return !t.resp.length && t.prio === "A" && t.status !== "C"; }).length;
    var andamento = tasks.filter(function (t) { return t.status === "E"; }).length;
    var verificar = tasks.filter(function (t) { return t.status === "V"; }).length;
    var dec = tasks.filter(function (t) { return t.status === "D"; }).length;
    var items = [
      [total, "tarefas no total", ""],
      [done, "concluídas", ""],
      [andamento, "em andamento", ""],
      [verificar, "a verificar (planilha)", verificar ? "warn" : ""],
      [dec, "decisões pendentes", dec ? "warn" : ""],
      [semResp, "sem responsável", semResp ? "warn" : ""],
      [altaSem, "alta prioridade sem responsável", altaSem ? "warn" : ""]
    ];
    items.forEach(function (i) {
      var k = el("div", { "class": "kpi " + i[2] });
      k.appendChild(el("b", null, String(i[0])));
      k.appendChild(el("span", null, i[1]));
      $("kpis").appendChild(k);
    });
  }

  function linkTask(t) {
    var li = el("li");
    var a = el("a", { href: "#plano" });
    a.appendChild(el("span", { "class": "id" }, t.id));
    a.appendChild(document.createTextNode(t.titulo));
    a.addEventListener("click", function () { focusTask(t.id); });
    li.appendChild(a);
    return li;
  }

  function lists() {
    var dec = tasks.filter(function (t) { return t.status === "D"; });
    var ul = $("decisoes");
    if (!dec.length) ul.appendChild(el("li", { "class": "empty" }, "Nenhuma decisão pendente."));
    dec.forEach(function (t) { ul.appendChild(linkTask(t)); });

    var sem = tasks.filter(function (t) { return !t.resp.length && t.prio === "A" && t.status !== "C"; });
    var ul2 = $("semdono");
    sem.slice(0, 12).forEach(function (t) { ul2.appendChild(linkTask(t)); });
    if (sem.length > 12) {
      var li = el("li");
      var a = el("a", { href: "#plano" }, "Ver todas as " + sem.length + " no plano de ação");
      a.addEventListener("click", function () { $("f-resp").value = "__none"; $("f-prio").value = "A"; render(); });
      li.appendChild(a);
      ul2.appendChild(li);
    }
    if (!sem.length) ul2.appendChild(el("li", { "class": "empty" }, "Todas as tarefas de alta prioridade têm responsável."));
  }

  function areas() {
    var box = $("areas");
    Object.keys(D.areas).forEach(function (k) {
      var ts = tasks.filter(function (t) { return t.area === k; });
      var row = el("div", { "class": "arow" });
      row.appendChild(el("div", null, D.areas[k]));
      var bar = el("div", { "class": "bar" });
      ORDER.forEach(function (s) {
        var n = ts.filter(function (t) { return t.status === s; }).length;
        if (n) { var i = el("i"); i.style.width = (n / ts.length * 100) + "%"; i.style.background = COLOR[s]; i.title = STATUS[s] + ": " + n; bar.appendChild(i); }
      });
      row.appendChild(bar);
      var done = ts.filter(function (t) { return t.status === "C"; }).length;
      row.appendChild(el("div", { "class": "anum" }, done + " de " + ts.length));
      box.appendChild(row);
    });
    ORDER.forEach(function (s) {
      var sp = el("span");
      var i = el("i"); i.style.background = COLOR[s];
      sp.appendChild(i); sp.appendChild(document.createTextNode(STATUS[s]));
      $("legend").appendChild(sp);
    });
  }

  function dias() {
    D.dias.forEach(function (d) {
      var c = el("div", { "class": "day" + (/02\/12|03\/12/.test(d.data) ? " evt" : "") });
      c.appendChild(el("small", null, d.data));
      c.appendChild(el("h3", null, d.titulo));
      var ul = el("ul");
      d.itens.forEach(function (i) { ul.appendChild(el("li", null, i)); });
      c.appendChild(ul);
      $("dias").appendChild(c);
    });
  }

  function pessoas() {
    D.equipe.forEach(function (p) {
      var c = el("div", { "class": "person" });
      c.appendChild(el("h3", null, p.nome));
      c.appendChild(el("div", { "class": "papel" }, p.papel));
      var ul = el("ul");
      p.resp.forEach(function (r) { ul.appendChild(el("li", null, r)); });
      c.appendChild(ul);
      var ct = el("div", { "class": "contact" });
      ct.appendChild(el("div", { "class": "full" }, p.completo));
      if (p.email) ct.appendChild(el("a", { href: "mailto:" + p.email }, p.email));
      if (p.tel) {
        var tl = el("a", { href: "tel:+55" + p.tel.replace(/\D/g, "") }, p.tel);
        ct.appendChild(tl);
        if (p.telConferir) ct.appendChild(el("span", { "class": "tag sug" }, "conferir telefone"));
      }
      c.appendChild(ct);
      var mine = tasks.filter(function (t) { return t.resp.indexOf(p.nome) >= 0 || t.resp.indexOf("Todos") >= 0; });
      var box = el("div", { "class": "tasks" });
      if (mine.length) {
        box.appendChild(el("b", null, mine.length + (mine.length === 1 ? " tarefa" : " tarefas")));
        mine.forEach(function (t) {
          var a = el("a", { href: "#plano" });
          a.appendChild(el("span", { "class": "id" }, t.id));
          a.appendChild(document.createTextNode(t.titulo + " "));
          if (t.sugerido) a.appendChild(el("span", { "class": "tag sug" }, "sugerido"));
          a.addEventListener("click", function () { focusTask(t.id); });
          box.appendChild(a);
        });
      } else {
        box.appendChild(el("span", { "class": "empty" }, "Nenhuma tarefa atribuída ainda."));
      }
      c.appendChild(box);
      $("pessoas").appendChild(c);
    });
    var sem = tasks.filter(function (t) { return !t.resp.length && t.status !== "C"; });
    var c = el("div", { "class": "person nobody" });
    c.appendChild(el("h3", null, "Sem responsável"));
    c.appendChild(el("div", { "class": "papel" }, sem.length + " tarefas aguardando um dono"));
    var a = el("a", { href: "#plano" }, "Ver todas no plano de ação");
    a.style.color = "var(--accent)";
    a.addEventListener("click", function () { $("f-resp").value = "__none"; render(); });
    c.appendChild(a);
    $("pessoas").appendChild(c);
  }

  function fillSelect(id, label, opts) {
    var s = $(id);
    s.appendChild(new Option(label, ""));
    opts.forEach(function (o) { s.appendChild(new Option(o[1], o[0])); });
    s.addEventListener("change", render);
  }

  function filters() {
    fillSelect("f-area", "Todas as áreas", Object.keys(D.areas).map(function (k) { return [k, D.areas[k]]; }));
    var nomes = D.equipe.map(function (p) { return [p.nome, p.nome]; });
    nomes.push(["__none", "Sem responsável"]);
    fillSelect("f-resp", "Todos os responsáveis", nomes);
    fillSelect("f-prio", "Qualquer prioridade", Object.keys(PRIO).map(function (k) { return [k, PRIO[k]]; }));
    fillSelect("f-status", "Qualquer status", ORDER.map(function (k) { return [k, STATUS[k]]; }));
    fillSelect("f-origem", "Todas as origens", [["plano", "Plano de ação (AOM)"], ["cronograma", "Cronograma (CRO)"], ["reuniao", "Reunião (REU)"]]);
    $("f-busca").addEventListener("input", render);
  }

  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function render() {
    var q = norm($("f-busca").value.trim());
    var fa = $("f-area").value, fr = $("f-resp").value, fp = $("f-prio").value, fs = $("f-status").value, fo = $("f-origem").value;
    var rows = tasks.filter(function (t) {
      if (fa && t.area !== fa) return false;
      if (fp && t.prio !== fp) return false;
      if (fs && t.status !== fs) return false;
      if (fo && t.origem !== fo) return false;
      if (fr === "__none" && t.resp.length) return false;
      if (fr && fr !== "__none" && t.resp.indexOf(fr) < 0 && t.resp.indexOf("Todos") < 0) return false;
      if (q && norm(t.id + " " + t.titulo + " " + t.desc + " " + t.obs + " " + t.resp.join(" ")).indexOf(q) < 0) return false;
      return true;
    });
    $("contagem").textContent = rows.length + " de " + tasks.length + " tarefas";
    var tb = document.querySelector("#tabela tbody");
    tb.textContent = "";
    rows.forEach(function (t) {
      var tr = el("tr"); tr.id = "t-" + t.id;
      tr.appendChild(el("td", { "class": "c-id" }, t.id));
      var td = el("td", { "class": "c-title" });
      td.appendChild(el("div", { "class": "t-title" }, t.titulo));
      td.appendChild(el("div", { "class": "t-desc" }, t.desc));
      if (t.obs && t.obs !== "Reunião") td.appendChild(el("div", { "class": "t-obs" }, "Obs.: " + t.obs));
      tr.appendChild(td);
      tr.appendChild(el("td", { "data-l": "Área" }, D.areas[t.area]));
      var r = el("td", { "data-l": "Responsável" });
      if (t.resp.length) {
        r.appendChild(document.createTextNode(t.resp.join(", ") + " "));
        if (t.sugerido) r.appendChild(el("span", { "class": "tag sug" }, "sugerido"));
      } else r.appendChild(el("span", { "class": "sem" }, "A definir"));
      tr.appendChild(r);
      var p = el("td", { "data-l": "Prioridade" }); p.appendChild(el("span", { "class": "pr pr-" + t.prio }, PRIO[t.prio])); tr.appendChild(p);
      var s = el("td", { "data-l": "Status" }); s.appendChild(el("span", { "class": "st st-" + t.status }, STATUS[t.status])); tr.appendChild(s);
      tb.appendChild(tr);
    });
  }

  function focusTask(id) {
    ["f-busca", "f-area", "f-resp", "f-prio", "f-status", "f-origem"].forEach(function (f) { $(f).value = ""; });
    render();
    setTimeout(function () {
      var tr = $("t-" + id);
      if (tr) { tr.scrollIntoView({ block: "center" }); tr.classList.add("flash"); setTimeout(function () { tr.classList.remove("flash"); }, 2500); }
    }, 50);
  }

  function roteiro() {
    $("roteiro-nota").textContent = D.roteiro.nota;
    D.roteiro.fases.forEach(function (f) {
      var det = el("details", { "class": "fase" });
      det.appendChild(el("summary", null, f.nome + " (" + f.itens.length + " itens)"));
      var ul = el("ul", { "class": "hora" });
      f.itens.forEach(function (i) {
        var li = el("li");
        li.appendChild(el("span", { "class": "h" }, i[0]));
        var b = el("div");
        b.appendChild(el("b", null, i[1]));
        if (i[2]) b.appendChild(el("div", { "class": "t-desc" }, i[2]));
        li.appendChild(b);
        ul.appendChild(li);
      });
      det.appendChild(ul);
      $("roteiro").appendChild(det);
    });
  }

  function regras() {
    D.regras.forEach(function (r) { $("regras-lista").appendChild(el("li", null, r)); });
    D.links.forEach(function (l) {
      var li = el("li");
      var a = el("a", { href: l.url, target: "_blank", rel: "noopener" }, l.nome);
      li.appendChild(a);
      $("links-lista").appendChild(li);
    });
  }

  function nav() {
    var links = document.querySelectorAll("#tabs a");
    var secs = Array.prototype.map.call(links, function (a) { return $(a.getAttribute("href").slice(1)); });
    function on() {
      var y = window.scrollY + 140, cur = 0;
      secs.forEach(function (s, i) { if (s.offsetTop <= y) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
    }
    window.addEventListener("scroll", on, { passive: true });
    on();
  }

  countdown(); setInterval(countdown, 60000);
  kpis(); lists(); areas(); dias(); roteiro(); pessoas(); filters(); render(); regras(); nav();
  $("atualizado").textContent = "Atualizado em " + D.evento.atualizado;
};
