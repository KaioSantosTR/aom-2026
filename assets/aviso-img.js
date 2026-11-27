window.AomAviso = (function () {
  var S = 1080;
  var COR = { gold: "#f0b23c", orange: "#e0471a" };
  var FONTE = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
  var cache = {};
  var cfg = { inicio: "" };
  var FIG = "assets/img/mascote.webp", FZ = 600, FZ_MIN = 460, ZONA = 10, LN = 684, RODAPE = 110;
  function figura(a) {
    if (!(a && a.fig)) return Promise.resolve(null);
    return img(FIG).catch(function () { return null; });
  }
  function rodape(ctx, im, H, fz) {
    fz = fz || FZ;
    var tw = im[1].width * 36 / im[1].height;
    ctx.fillStyle = "#9db0c7"; ctx.font = "500 22px " + FONTE;
    if (im[3]) {
      ctx.drawImage(im[1], 78, H - 60, tw, 36);
      ctx.fillText("|  AOM 2026  |  Campinas/SP", 78 + tw + 18, H - 34);
      ctx.drawImage(im[3], S - fz, H - fz, fz, fz);
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

  function desenharGuia(canvas, a) {
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
        m.font = "600 27px " + FONTE;
        var ls = quebrar(m, a.regra[1], w - 56);
        return { w: w, ls: ls, h: Math.max(126, 58 + ls.length * 34) };
      }
      var H = S, R = regra(924), fz = FZ;
      if (im[3]) {
        if (H - colFim + 46 < FZ_MIN) H = colFim + FZ_MIN - 46;
        for (var k = 0; k < 4; k++) {
          fz = Math.min(FZ, H - colFim + 46);
          R = regra(924);
          if (ry + R.h > H - fz + ZONA) R = regra(LN);
          if (ry + R.h + RODAPE <= H) break;
          H = ry + R.h + RODAPE;
        }
      }
      canvas.width = S; canvas.height = H;
      var ctx = canvas.getContext("2d");
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
      ctx.fillStyle = "#f0b23c"; ctx.font = "800 27px " + FONTE; ctx.fillText(a.regra[0], 110, ry + 40);
      ctx.fillStyle = "#ffffff"; ctx.font = "600 27px " + FONTE;
      var ly = ry + 40;
      R.ls.forEach(function (l) { ly += 34; ctx.fillText(l, 110, ly); });
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

  function desenharPadrao(canvas, a) {
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

      function cartao(w) {
        m.font = "500 " + FS + "px " + FONTE;
        var h = 2 * PAD, ops = brutas.map(function (o) {
          if (o.t === "gap") { h += 20; return o; }
          var ls = quebrar(m, o.s, w - 2 * PAD - (o.t === "b" ? 38 : 0));
          h += ls.length * LH + 8;
          return { t: o.t, linhas: ls };
        });
        return { w: w, ops: ops, h: h };
      }
      function destaque(w) {
        m.font = "600 27px " + FONTE;
        var dl = [];
        String(a.dt).split("\n").forEach(function (par) { if (par.trim()) quebrar(m, par.trim(), w - 56).forEach(function (l) { dl.push(l); }); });
        return { w: w, dl: dl, h: 28 + (a.dr ? 40 : 0) + dl.length * 34 + 22 };
      }
      function montar(H) {
        var zona = im[3] ? H - FZ + ZONA : Infinity, C = null, D = null, fim = topo;
        if (brutas.length) { C = cartao(W); if (topo + C.h > zona) C = cartao(LN); fim = topo + C.h; }
        if (a.dt) {
          var ry = fim + (C ? 26 : 0);
          D = destaque(W); if (ry + D.h > zona) D = destaque(LN);
          D.y = ry; fim = ry + D.h;
        }
        return { C: C, D: D, fim: fim };
      }
      var H = S, L = montar(H);
      if (!im[3]) H = Math.max(S, L.fim + 130);
      else {
        for (var k = 0; k < 4 && L.fim + RODAPE > H; k++) { H = L.fim + RODAPE; L = montar(H); }
        H = Math.max(H, L.fim + RODAPE);
      }

      canvas.width = S; canvas.height = H;
      var ctx = canvas.getContext("2d");
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

      if (L.C) {
        retangulo(ctx, X, topo, L.C.w, L.C.h, 22); ctx.fillStyle = "#0a2440"; ctx.fill();
        ctx.strokeStyle = "#1b3b5f"; ctx.lineWidth = 2; ctx.stroke();
        var cy = topo + PAD;
        ctx.font = "500 " + FS + "px " + FONTE;
        L.C.ops.forEach(function (o) {
          if (o.t === "gap") { cy += 20; return; }
          o.linhas.forEach(function (l, i) {
            var base = cy + LH - 14;
            if (o.t === "b") {
              if (i === 0) { ctx.fillStyle = "#f0b23c"; ctx.beginPath(); ctx.arc(X + PAD + 8, base - 11, 7, 0, 6.3); ctx.fill(); }
              ctx.fillStyle = "#ffffff"; ctx.fillText(l, X + PAD + 38, base);
            } else { ctx.fillStyle = "#ffffff"; ctx.fillText(l, X + PAD, base); }
            cy += LH;
          });
          cy += 8;
        });
      }

      if (L.D) {
        var D = L.D;
        retangulo(ctx, X, D.y, D.w, D.h, 18); ctx.fillStyle = "rgba(224,71,26,0.18)"; ctx.fill();
        ctx.fillStyle = "#e0471a"; ctx.fillRect(X, D.y + 14, 8, D.h - 28);
        var dy = D.y + 22;
        if (a.dr) { ctx.fillStyle = "#f0b23c"; ctx.font = "800 27px " + FONTE; dy += 22; ctx.fillText(a.dr, 110, dy); dy += 18; }
        ctx.fillStyle = "#ffffff"; ctx.font = "600 27px " + FONTE;
        D.dl.forEach(function (l) { dy += 34; ctx.fillText(l, 110, dy - (a.dr ? 0 : 6)); });
      }

      rodape(ctx, im, H);
      return canvas;
    });
  }

  function desenhar(canvas, a) { a = preencher(a); return a.grupos ? desenharGuia(canvas, a) : desenharPadrao(canvas, a); }

  function texto(a) {
    a = preencher(a);
    if (!a.grupos) {
      var u = "*" + String(a.titulo).replace(/\n/g, " ") + "*";
      if (a.sub) u += "\n" + a.sub;
      if (a.texto) u += "\n\n" + String(a.texto).replace(/^\s*\u2022\s+/gm, "- ").trim();
      if (a.dt) u += "\n\n" + (a.dr ? "*" + a.dr + "*" + (/\n/.test(a.dt) ? "\n" : " ") : "") + a.dt;
      return u;
    }
    var t = "*" + String(a.titulo).replace(/\n/g, " ") + "*\n" + a.sub + "\n";
    a.grupos.forEach(function (gr) {
      t += "\n*" + gr.nome.toUpperCase() + "* (" + gr.legenda.toLowerCase() + ")\n";
      gr.itens.forEach(function (it) { t += "- " + it[0] + ": " + it[1] + "\n"; });
    });
    return t + "\n*" + a.regra[0] + "* " + a.regra[1];
  }

  return { desenhar: desenhar, texto: texto, preencher: preencher, tamanho: S, config: function (o) { Object.keys(o).forEach(function (k) { cfg[k] = o[k]; }); } };
})();
