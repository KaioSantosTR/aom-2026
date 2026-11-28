window.AomAviso = (function () {
  var S = 1080;
  var COR = { gold: "#f0b23c", orange: "#e0471a" };
  var FONTE = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
  var cache = {};
  var cfg = { inicio: "" };
  var FIGS = { "1": { src: "assets/img/mascote.webp", peek: true }, "2": { src: "assets/img/thom-2.webp" }, "3": { src: "assets/img/thom-3.webp" }, "4": { src: "assets/img/thom-4.webp" }, "5": { src: "assets/img/thom-5.webp" }, "6": { src: "assets/img/thom-6.webp" } };
  var FZ = 600, FZ_MIN = 460, ZONA = 10, LN = 684, RODAPE = 110;
  function figura(a) {
    if (!(a && a.fig)) return Promise.resolve(null);
    var f = FIGS[a.fig] || FIGS["1"];
    return img(f.src).then(function (i) { return { im: i, peek: !!f.peek }; }).catch(function () { return null; });
  }
  function sobra(f) { return f.peek ? 46 : -12; }
  function geo(f, fz, H) {
    if (f.peek) return { x: S - fz, y: H - fz, w: fz, h: fz, topo: H - fz + ZONA, ln: LN };
    var k = Math.min(fz * 0.97 / f.im.height, fz * 0.55 / f.im.width), w = f.im.width * k, h = f.im.height * k, x = S - 30 - w;
    return { x: x, y: H - h, w: w, h: h, topo: H - h + ZONA, ln: Math.min(LN, Math.floor(x - 106)) };
  }
  function rodape(ctx, im, H, fz) {
    fz = fz || FZ;
    var tw = im[1].width * 36 / im[1].height;
    ctx.fillStyle = "#9db0c7"; ctx.font = "500 22px " + FONTE;
    if (im[3]) {
      ctx.drawImage(im[1], 78, H - 60, tw, 36);
      ctx.fillText("|  AOM 2026  |  Campinas/SP", 78 + tw + 18, H - 34);
      var g = geo(im[3], fz, H);
      ctx.drawImage(im[3].im, g.x, g.y, g.w, g.h);
    } else {
      ctx.fillText("AOM 2026  |  Campinas/SP", 78, H - 34);
      ctx.drawImage(im[1], 1002 - tw, H - 60, tw, 36);
    }
  }
  var SO_LINK = /^\s*https?:\/\/\S+\s*$/i;

  function contagem() {
    var diff = new Date(cfg.inicio).getTime() - Date.now();
    if (!cfg.inicio || isNaN(diff)) return "";
    if (diff <= 0) return "é hoje";
    var d = Math.floor(diff / 864e5), hh = Math.floor(diff % 864e5 / 36e5);
    var pd = d + (d === 1 ? " dia" : " dias"), ph = hh + (hh === 1 ? " hora" : " horas");
    if (!d) return (hh <= 1 ? "falta " : "faltam ") + (hh ? ph : "menos de 1 hora");
    return (d === 1 ? "falta " : "faltam ") + pd + (hh ? " e " + ph : "");
  }
  function relogio() {
    var diff = new Date(cfg.inicio).getTime() - Date.now();
    if (!cfg.inicio || isNaN(diff)) return null;
    if (diff <= 0) return [];
    var d = Math.floor(diff / 864e5), hh = Math.floor(diff % 864e5 / 36e5), mm = Math.floor(diff % 36e5 / 6e4);
    function dois(n) { return n < 10 ? "0" + n : String(n); }
    if (d) return [[dois(d), d === 1 ? "DIA" : "DIAS"], [dois(hh), hh === 1 ? "HORA" : "HORAS"]];
    return [[dois(hh), hh === 1 ? "HORA" : "HORAS"], [dois(mm), mm === 1 ? "MINUTO" : "MINUTOS"]];
  }
  function preencher(a) {
    var c = contagem(), C = c ? c.charAt(0).toUpperCase() + c.slice(1) : "";
    var o = {};
    Object.keys(a).forEach(function (k) {
      o[k] = typeof a[k] === "string" ? a[k].replace(/\{contagem\}/g, c).replace(/\{Contagem\}/g, C) : a[k];
    });
    return o;
  }

  function img(src) {
    if (cache[src]) return cache[src];
    cache[src] = new Promise(function (ok, erro) {
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { erro(new Error("imagem " + src)); };
      i.src = src;
    });
    return cache[src];
  }

  function quebrar(ctx, texto, largura) {
    var palavras = String(texto).split(" "), linhas = [], atual = "";
    palavras.forEach(function (p) {
      var teste = atual ? atual + " " + p : p;
      if (ctx.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p; }
      else atual = teste;
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function pedacos(t) {
    var out = [], re = /\*([^*\n]+)\*/g, i = 0, r;
    while ((r = re.exec(t))) {
      if (r.index > i) out.push({ s: t.slice(i, r.index), b: false });
      out.push({ s: r[1], b: true }); i = re.lastIndex;
    }
    if (i < t.length) out.push({ s: t.slice(i), b: false });
    return out;
  }
  function quebrarRico(ctx, texto, largura, fn, fb) {
    var palavras = [[]];
    pedacos(String(texto)).forEach(function (p) {
      p.s.split(/( +)/).forEach(function (x) {
        if (!x) return;
        if (/^ +$/.test(x)) { if (palavras[palavras.length - 1].length) palavras.push([]); }
        else palavras[palavras.length - 1].push({ s: x, b: p.b });
      });
    });
    if (!palavras[palavras.length - 1].length) palavras.pop();
    function larg(ps) { var w = 0; ps.forEach(function (p) { ctx.font = p.b ? fb : fn; w += ctx.measureText(p.s).width; }); return w; }
    ctx.font = fn;
    var esp = ctx.measureText(" ").width, linhas = [], atual = [], w = 0;
    palavras.forEach(function (pw) {
      var lw = larg(pw);
      if (atual.length && w + esp + lw > largura) { linhas.push(atual); atual = []; w = 0; }
      if (atual.length) { atual.push({ s: " ", b: false }); w += esp; }
      pw.forEach(function (p) { atual.push(p); }); w += lw;
    });
    if (atual.length) linhas.push(atual);
    return linhas;
  }
  function escreverRico(ctx, linha, x, y, fn, fb) {
    linha.forEach(function (p) { ctx.font = p.b ? fb : fn; ctx.fillText(p.s, x, y); x += ctx.measureText(p.s).width; });
  }
  var CX = { n: "400 30px " + FONTE, b: "700 30px " + FONTE, r: "800 30px " + FONTE, lh: 44, gap: 26 };
  function caixa(m, texto, w) {
    var ls = [], alt = 0;
    String(texto || "").split("\n").forEach(function (par) {
      if (!par.trim()) { if (ls.length && ls[ls.length - 1]) { ls.push(null); alt += CX.gap; } return; }
      quebrarRico(m, par.trim(), w - 64, CX.n, CX.b).forEach(function (l) { ls.push(l); alt += CX.lh; });
    });
    while (ls.length && !ls[ls.length - 1]) { ls.pop(); alt -= CX.gap; }
    return { ls: ls, alt: alt };
  }
  function escreverCaixa(ctx, ls, x, y) {
    ctx.fillStyle = "#ffffff";
    ls.forEach(function (l) { if (!l) { y += CX.gap; return; } y += CX.lh; escreverRico(ctx, l, x, y, CX.n, CX.b); });
  }

  function retangulo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function camisa(ctx, tipo, x, y, tam, cor, fundo) {
    var k = tam / 100;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(30, 8); ctx.lineTo(6, 28); ctx.lineTo(20, 48); ctx.lineTo(30, 40); ctx.lineTo(30, 92);
    ctx.lineTo(70, 92); ctx.lineTo(70, 40); ctx.lineTo(80, 48); ctx.lineTo(94, 28); ctx.lineTo(70, 8);
    ctx.quadraticCurveTo(50, 24, 30, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = fundo; ctx.fillStyle = fundo; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (tipo === "polo") {
      ctx.beginPath(); ctx.moveTo(36, 9); ctx.lineTo(50, 34); ctx.lineTo(64, 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, 34); ctx.lineTo(50, 58); ctx.stroke();
      ctx.beginPath(); ctx.arc(50, 44, 2.6, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(50, 54, 2.6, 0, 6.3); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(38, 10); ctx.quadraticCurveTo(50, 28, 62, 10); ctx.stroke();
    }
    ctx.restore();
  }

  function preparar(canvas, H, K) {
    canvas.width = Math.round(S * K); canvas.height = Math.round(H * K);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    return ctx;
  }

  function desenharGuia(canvas, a, K) {
    return Promise.all([img("assets/img/aom-logo.png"), img("assets/img/tr-logo.png"), img("assets/img/mandala.png"), figura(a)]).then(function (im) {
      var m = document.createElement("canvas").getContext("2d");
      m.font = "800 62px " + FONTE;
      var tit = [];
      String(a.titulo).split("\n").forEach(function (par) { quebrar(m, par, 920).forEach(function (l) { tit.push(l); }); });
      var topo = 244 + tit.length * 72 + 22, larg = 450, gap = 24, faixa = 108, lh2 = 31, esp = 30;
      m.font = "500 25px " + FONTE;
      var altP = 0;
      a.grupos.forEach(function (gr) {
        var h = faixa + 34;
        gr.itens.forEach(function (it) { h += 24 + quebrar(m, it[1], larg - 52).length * lh2 + esp; });
        altP = Math.max(altP, h);
      });
      var colFim = topo + altP, ry = colFim + 22;
      function regra(w) {
        var c = caixa(m, a.regra[1], w);
        return { w: w, ls: c.ls, h: Math.max(126, 50 + c.alt + 28) };
      }
      var H = S, R = regra(924), fz = FZ;
      if (!im[3]) H = Math.max(S, ry + R.h + RODAPE);
      else {
        var so = sobra(im[3]);
        if (H - colFim + so < FZ_MIN) H = colFim + FZ_MIN - so;
        for (var k = 0; k < 4; k++) {
          fz = Math.min(FZ, H - colFim + so);
          var g = geo(im[3], fz, H);
          R = regra(924);
          if (ry + R.h > g.topo) R = regra(g.ln);
          if (ry + R.h + RODAPE <= H) break;
          H = ry + R.h + RODAPE;
        }
      }
      var ctx = preparar(canvas, H, K);
      fundo(ctx, H);
      ctx.globalAlpha = 0.14; ctx.drawImage(im[2], 560, -250, 760, 760); ctx.globalAlpha = 1;
      ctx.fillStyle = "#e0471a"; ctx.fillRect(0, 0, 22, H);
      ctx.fillStyle = "#f0b23c"; ctx.fillRect(0, H - 70, 22, 70);

      var lh = 92, lw = im[0].width * lh / im[0].height;
      ctx.drawImage(im[0], 78, 54, lw, lh);

      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "right"; ctx.fillStyle = "#f0b23c"; ctx.font = "700 24px " + FONTE;
      ctx.fillText(String(a.etiqueta || "").toUpperCase(), 1000, 108);
      ctx.textAlign = "left";

      ctx.fillStyle = "#ffffff"; ctx.font = "800 62px " + FONTE;
      var y = 244;
      tit.forEach(function (l) { ctx.fillText(l, 78, y); y += 72; });
      ctx.fillStyle = "#f0b23c"; ctx.font = "600 27px " + FONTE;
      ctx.fillText(a.sub, 78, y - 20);

      a.grupos.forEach(function (gr, i) {
        var x = 78 + i * (larg + gap), cor = COR[gr.cor] || "#f0b23c", texto = gr.cor === "gold" ? "#04172b" : "#ffffff";
        retangulo(ctx, x, topo, larg, altP, 22); ctx.fillStyle = "#0a2440"; ctx.fill();
        ctx.strokeStyle = "#1b3b5f"; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); retangulo(ctx, x, topo, larg, altP, 22); ctx.clip();
        ctx.fillStyle = cor; ctx.fillRect(x, topo, larg, faixa);
        ctx.restore();
        camisa(ctx, gr.icone, x + 24, topo + 10, 88, texto, cor);
        ctx.fillStyle = texto; ctx.font = "800 44px " + FONTE; ctx.fillText(gr.nome, x + 126, topo + 56);
        ctx.font = "600 20px " + FONTE; ctx.fillText(gr.legenda, x + 126, topo + 86);
        var iy = topo + faixa + 38;
        gr.itens.forEach(function (it) {
          ctx.fillStyle = cor; ctx.font = "800 21px " + FONTE; ctx.fillText(it[0].toUpperCase(), x + 26, iy);
          ctx.fillStyle = "#ffffff"; ctx.font = "500 25px " + FONTE;
          quebrar(ctx, it[1], larg - 52).forEach(function (l) { iy += lh2; ctx.fillText(l, x + 26, iy); });
          iy += esp + 24;
        });
      });

      retangulo(ctx, 78, ry, R.w, R.h, 18); ctx.fillStyle = "rgba(224,71,26,0.18)"; ctx.fill();
      ctx.fillStyle = "#e0471a"; ctx.fillRect(78, ry + 14, 8, R.h - 28);
      ctx.fillStyle = "#f0b23c"; ctx.font = CX.r; ctx.fillText(a.regra[0], 110, ry + 46);
      escreverCaixa(ctx, R.ls, 110, ry + 52);
      rodape(ctx, im, H, fz);
      return canvas;
    });
  }

  function fundo(ctx, H) {
    ctx.fillStyle = "#04172b"; ctx.fillRect(0, 0, S, H);
    var g = ctx.createRadialGradient(920, 120, 0, 920, 120, 760);
    g.addColorStop(0, "rgba(240,178,60,0.14)"); g.addColorStop(1, "rgba(240,178,60,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, H);
  }

  function desenharPadrao(canvas, a, K) {
    return Promise.all([img("assets/img/aom-logo.png"), img("assets/img/tr-logo.png"), img("assets/img/mandala.png"), figura(a)]).then(function (im) {
      var m = document.createElement("canvas").getContext("2d");
      var FS = 34, LH = 48, PAD = 36, X = 78, W = 924;
      m.font = "800 62px " + FONTE;
      var tit = [];
      String(a.titulo || "").split("\n").forEach(function (par) { quebrar(m, par, 920).forEach(function (l) { tit.push(l); }); });
      var y = 244 + tit.length * 72;
      var topo = a.sub ? y + 22 : y - 30;

      var brutas = [];
      String(a.texto || "").split("\n").forEach(function (raw) {
        var l = raw.replace(/\s+$/, "");
        if (!l.trim()) { if (brutas.length && brutas[brutas.length - 1].t !== "gap") brutas.push({ t: "gap" }); return; }
        if (SO_LINK.test(l)) return;
        var b = /^\s*[-\u2022]\s+(.*)$/.exec(l);
        brutas.push(b ? { t: "b", s: b[1] } : { t: "p", s: l.trim() });
      });
      while (brutas.length && brutas[brutas.length - 1].t === "gap") brutas.pop();

      var FN = "500 " + FS + "px " + FONTE, FB = "700 " + FS + "px " + FONTE;
      function cartao(w) {
        var h = 2 * PAD, ops = brutas.map(function (o) {
          if (o.t === "gap") { h += 20; return o; }
          var ls = quebrarRico(m, o.s, w - 2 * PAD - (o.t === "b" ? 38 : 0), FN, FB);
          h += ls.length * LH + 8;
          return { t: o.t, linhas: ls };
        });
        return { w: w, ops: ops, h: h };
      }
      function destaque(w) {
        var c = caixa(m, a.dt, w);
        return { w: w, dl: c.ls, h: (a.dr ? 52 : 16) + c.alt + 28 };
      }
      var pecas = a.tipo === "contagem" ? relogio() : null;
      function bloco(w) {
        m.font = "500 28px " + FONTE;
        var leg = pecas && pecas.length && a.legenda ? quebrar(m, a.legenda, w - 40) : [];
        return { w: w, leg: leg, h: 232 + (leg.length ? 22 + leg.length * 38 : 0) };
      }
      var blocos = [];
      if (pecas) blocos.push({ k: "R", f: bloco, gap: 0 });
      if (brutas.length) blocos.push({ k: "C", f: cartao, gap: pecas ? 30 : 0 });
      if (a.dt) blocos.push({ k: "D", f: destaque, gap: blocos.length ? 26 : 0 });
      function montar(n, ln) {
        var L = { fim: topo, cheio: topo };
        blocos.forEach(function (b, i) {
          var o = b.f(i >= blocos.length - n ? ln : W);
          o.y = L.fim + b.gap; L[b.k] = o; L.fim = o.y + o.h;
          if (i < blocos.length - n) L.cheio = L.fim;
        });
        return L;
      }
      var H, L;
      if (!im[3]) { L = montar(0, W); H = Math.max(S, L.fim + 130); }
      else {
        var g0 = geo(im[3], FZ, S);
        for (var n = 0; n <= blocos.length; n++) {
          var Ln = montar(n, g0.ln), Hn = Math.max(S, Ln.fim + RODAPE, Ln.cheio + g0.h - ZONA);
          if (!L || Hn < H) { H = Hn; L = Ln; }
        }
      }

      var ctx = preparar(canvas, H, K);
      fundo(ctx, H);
      ctx.globalAlpha = 0.14; ctx.drawImage(im[2], 560, -250, 760, 760); ctx.globalAlpha = 1;
      ctx.fillStyle = "#e0471a"; ctx.fillRect(0, 0, 22, H);
      ctx.fillStyle = "#f0b23c"; ctx.fillRect(0, H - 70, 22, 70);

      var lh = 92, lw = im[0].width * lh / im[0].height;
      ctx.drawImage(im[0], 78, 54, lw, lh);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "right"; ctx.fillStyle = "#f0b23c"; ctx.font = "700 24px " + FONTE;
      ctx.fillText(String(a.etiqueta || "").toUpperCase(), 1000, 108);
      ctx.textAlign = "left";

      ctx.fillStyle = "#ffffff"; ctx.font = "800 62px " + FONTE;
      var ty = 244;
      tit.forEach(function (l) { ctx.fillText(l, X, ty); ty += 72; });
      if (a.sub) { ctx.fillStyle = "#f0b23c"; ctx.font = "600 27px " + FONTE; ctx.fillText(a.sub, X, ty - 20); }

      if (L.R) {
        var R = L.R, n = Math.max(1, pecas.length), gp = 22, tw = (R.w - gp * (n - 1)) / n;
        ctx.textAlign = "center";
        for (var i = 0; i < n; i++) {
          var tx = X + i * (tw + gp);
          retangulo(ctx, tx, R.y, tw, 232, 26); ctx.fillStyle = "#0a2440"; ctx.fill();
          ctx.strokeStyle = "rgba(240,178,60,0.55)"; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.save(); retangulo(ctx, tx, R.y, tw, 232, 26); ctx.clip();
          ctx.fillStyle = i ? "#e0471a" : "#f0b23c"; ctx.fillRect(tx, R.y, tw, 10);
          ctx.restore();
          if (pecas.length) {
            ctx.fillStyle = "#ffffff"; ctx.font = "800 150px " + FONTE; ctx.fillText(pecas[i][0], tx + tw / 2, R.y + 164);
            ctx.fillStyle = "#f0b23c"; ctx.font = "800 30px " + FONTE; ctx.fillText(pecas[i][1].split("").join("\u2009"), tx + tw / 2, R.y + 208);
          } else {
            ctx.fillStyle = "#f0b23c"; ctx.font = "800 120px " + FONTE; ctx.fillText("É HOJE!", tx + tw / 2, R.y + 150);
            ctx.fillStyle = "#ffffff"; ctx.font = "700 30px " + FONTE; ctx.fillText("Bem-vindos ao AOM 2026", tx + tw / 2, R.y + 200);
          }
        }
        ctx.fillStyle = "#dbe5f1"; ctx.font = "500 28px " + FONTE;
        R.leg.forEach(function (l, j) { ctx.fillText(l, X + R.w / 2, R.y + 232 + 50 + j * 38); });
        ctx.textAlign = "left";
      }

      if (L.C) {
        var topoC = L.C.y;
        retangulo(ctx, X, topoC, L.C.w, L.C.h, 22); ctx.fillStyle = "#0a2440"; ctx.fill();
        ctx.strokeStyle = "#1b3b5f"; ctx.lineWidth = 2; ctx.stroke();
        var cy = topoC + PAD;
        ctx.font = "500 " + FS + "px " + FONTE;
        L.C.ops.forEach(function (o) {
          if (o.t === "gap") { cy += 20; return; }
          o.linhas.forEach(function (l, i) {
            var base = cy + LH - 14;
            if (o.t === "b") {
              if (i === 0) { ctx.fillStyle = "#f0b23c"; ctx.beginPath(); ctx.arc(X + PAD + 8, base - 11, 7, 0, 6.3); ctx.fill(); }
              ctx.fillStyle = "#ffffff"; escreverRico(ctx, l, X + PAD + 38, base, FN, FB);
            } else { ctx.fillStyle = "#ffffff"; escreverRico(ctx, l, X + PAD, base, FN, FB); }
            cy += LH;
          });
          cy += 8;
        });
      }

      if (L.D) {
        var D = L.D;
        retangulo(ctx, X, D.y, D.w, D.h, 18); ctx.fillStyle = "rgba(224,71,26,0.18)"; ctx.fill();
        ctx.fillStyle = "#e0471a"; ctx.fillRect(X, D.y + 14, 8, D.h - 28);
        if (a.dr) { ctx.fillStyle = "#f0b23c"; ctx.font = CX.r; ctx.fillText(a.dr, 110, D.y + 46); }
        escreverCaixa(ctx, D.dl, 110, D.y + (a.dr ? 52 : 16));
      }

      rodape(ctx, im, H);
      return canvas;
    });
  }

  function desenhar(canvas, a, escala) { a = preencher(a); var K = escala || 1; return a.grupos ? desenharGuia(canvas, a, K) : desenharPadrao(canvas, a, K); }

  function texto(a) {
    a = preencher(a);
    if (!a.grupos) {
      var u = "*" + String(a.titulo).replace(/\n/g, " ") + "*";
      if (a.sub) u += "\n" + a.sub;
      if (a.tipo === "contagem") {
        var c = contagem();
        if (c === "é hoje") u += "\n\n🎉 *É hoje!* Bem-vindos ao AOM 2026!";
        else if (c) u += "\n\n⏳ *" + c.charAt(0).toUpperCase() + c.slice(1) + "*" + (a.legenda ? " " + a.legenda : "") + "!";
      }
      if (a.texto) u += "\n\n" + String(a.texto).replace(/^\s*\u2022\s+/gm, "- ").trim();
      if (a.dt) u += "\n\n" + (a.dr ? "*" + a.dr + "*" + (/\n/.test(a.dt) ? "\n" : " ") : "") + a.dt;
      return u;
    }
    var t = "*" + String(a.titulo).replace(/\n/g, " ") + "*\n" + a.sub + "\n";
    a.grupos.forEach(function (gr) {
      t += "\n*" + gr.nome.toUpperCase() + "* (" + gr.legenda.toLowerCase() + ")\n";
      gr.itens.forEach(function (it) { t += "- " + it[0] + (it[1] ? ": " + it[1] : "") + "\n"; });
    });
    return t + "\n*" + a.regra[0] + "*" + (/\n/.test(a.regra[1]) ? "\n" : " ") + a.regra[1];
  }

  return { desenhar: desenhar, texto: texto, preencher: preencher, tamanho: S, config: function (o) { Object.keys(o).forEach(function (k) { cfg[k] = o[k]; }); } };
})();
