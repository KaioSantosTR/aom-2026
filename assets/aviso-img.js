window.AomAviso = (function () {
  var S = 1080;
  var COR = { gold: "#f0b23c", orange: "#e0471a" };
  var FONTE = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
  var cache = {};
  var cfg = { inicio: "" };
  var FIGS = ["Que isso?!", "Boa!", "Merecido!", "Enfim, a hipocrisia", "Não é possível!", "Mandou bem!", "Meta batida!", "Save the date", "Cadê dezembro?", "Está chegando!",
    "Eu não vejo a hora!", "Já pode ser dia 02?", "É hoje!", "Tudo normal!", "Sei não, hein...", "Como assim?!", "Stonks!", "Eu não tenho estrutura!", "Eu avisei!", "Expectativa x realidade",
    "Calma lá!", "Deu bom, time!", "Segue o plano.", "Cadê?", "Eu quero é prêmio!", "Olha isso...", "Tá tudo sob controle!", "Ah, pronto!", "Me explica isso!", "Não acredito!",
    "É sobre isso!", "Pode isso, produção?", "Socorro!", "Hum... interessante.", "Vou ficar quieto.", "Por favor...", "Sei não...", "Deu ruim...", "Meme do incêndio", "Meme do incêndio 2"];
  function figSrc(n) { return "assets/fig/" + n + ".webp"; }
  function figura(a) {
    var n = parseInt(a && a.fig, 10);
    if (!(n >= 1 && n <= FIGS.length)) return Promise.resolve(null);
    return img(figSrc(n)).catch(function () { return null; });
  }
  function colar(ctx, im, a, y, z) {
    var x = a.figPos === "centro" ? (S - z) / 2 : a.figPos === "esq" ? 78 : 1002 - z;
    ctx.save();
    ctx.translate(x + z / 2, y + z / 2); ctx.rotate(a.figPos === "esq" ? 0.06 : -0.06);
    ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, -z / 2, -z / 2, z, z);
    ctx.restore();
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

  function alturaGuia(a) {
    var m = document.createElement("canvas").getContext("2d");
    m.font = "800 62px " + FONTE;
    var y = 244;
    String(a.titulo).split("\n").forEach(function (par) { y += quebrar(m, par, 920).length * 72; });
    m.font = "500 25px " + FONTE;
    var altP = 0;
    a.grupos.forEach(function (gr) {
      var h = 142;
      gr.itens.forEach(function (it) { h += 24 + quebrar(m, it[1], 398).length * 31 + 30; });
      altP = Math.max(altP, h);
    });
    return y + 22 + altP + 22 + 126;
  }

  function desenharGuia(canvas, a) {
    return Promise.all([img("assets/img/aom-logo.png"), img("assets/img/tr-logo.png"), img("assets/img/mandala.png"), figura(a)]).then(function (im) {
      var H = S;
      if (im[3]) { var fimP = alturaGuia(a); if (S - 84 - fimP < 260) H = fimP + 300 + 40 + 84; }
      canvas.width = S; canvas.height = H;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#04172b"; ctx.fillRect(0, 0, S, H);
      var g = ctx.createRadialGradient(920, 120, 0, 920, 120, 760);
      g.addColorStop(0, "rgba(240,178,60,0.14)"); g.addColorStop(1, "rgba(240,178,60,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, H);
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
      String(a.titulo).split("\n").forEach(function (par) {
        quebrar(ctx, par, 920).forEach(function (l) { ctx.fillText(l, 78, y); y += 72; });
      });
      ctx.fillStyle = "#f0b23c"; ctx.font = "600 27px " + FONTE;
      ctx.fillText(a.sub, 78, y - 20);

      var topo = y + 22, larg = 450, gap = 24, faixa = 108, lh2 = 31, esp = 30;
      ctx.font = "500 25px " + FONTE;
      var altP = 0;
      a.grupos.forEach(function (gr) {
        var h = faixa + 34;
        gr.itens.forEach(function (it) { h += 24 + quebrar(ctx, it[1], larg - 52).length * lh2 + esp; });
        altP = Math.max(altP, h);
      });
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

      var ry = topo + altP + 22, rh = 126;
      retangulo(ctx, 78, ry, 924, rh, 18); ctx.fillStyle = "rgba(224,71,26,0.18)"; ctx.fill();
      ctx.fillStyle = "#e0471a"; ctx.fillRect(78, ry + 14, 8, rh - 28);
      ctx.fillStyle = "#f0b23c"; ctx.font = "800 27px " + FONTE; ctx.fillText(a.regra[0], 110, ry + 40);
      ctx.fillStyle = "#ffffff"; ctx.font = "600 27px " + FONTE;
      var ly = ry + 40;
      quebrar(ctx, a.regra[1], 868).forEach(function (l) { ly += 34; ctx.fillText(l, 110, ly); });
      canvas.dataset.fim = String(ry + rh);
      if (im[3]) {
        var livre = H - 84 - (ry + rh), fz = Math.min(300, livre - 20);
        if (fz >= 130) colar(ctx, im[3], a, ry + rh + (livre - fz) / 2 + 4, fz);
      }

      ctx.fillStyle = "#9db0c7"; ctx.font = "500 22px " + FONTE; ctx.fillText("AOM 2026  |  Campinas/SP", 78, H - 34);
      var tw = im[1].width * 36 / im[1].height; ctx.drawImage(im[1], 1002 - tw, H - 60, tw, 36);
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

      m.font = "500 " + FS + "px " + FONTE;
      var ops = [];
      String(a.texto || "").split("\n").forEach(function (raw) {
        var l = raw.replace(/\s+$/, "");
        if (!l.trim()) { if (ops.length && ops[ops.length - 1].t !== "gap") ops.push({ t: "gap" }); return; }
        if (SO_LINK.test(l)) return;
        var b = /^\s*[-\u2022]\s+(.*)$/.exec(l);
        if (b) ops.push({ t: "b", linhas: quebrar(m, b[1], W - 2 * PAD - 38) });
        else ops.push({ t: "p", linhas: quebrar(m, l.trim(), W - 2 * PAD) });
      });
      while (ops.length && ops[ops.length - 1].t === "gap") ops.pop();
      var corpoH = 0;
      ops.forEach(function (o) { corpoH += o.t === "gap" ? 20 : o.linhas.length * LH + 8; });
      var cardH = ops.length ? corpoH + 2 * PAD : 0;
      var fim = ops.length ? topo + cardH : topo;

      var dl = [], rh = 0, ry = 0;
      if (a.dt) {
        m.font = "600 27px " + FONTE;
        dl = quebrar(m, a.dt, 868);
        rh = 28 + (a.dr ? 40 : 0) + dl.length * 34 + 22;
        ry = fim + (ops.length ? 26 : 0);
        fim = ry + rh;
      }
      var H = Math.max(S, fim + 130), fz = 0, fy = 0;
      if (im[3]) {
        fz = 300;
        if (H - 84 - fim < fz + 40) H = fim + fz + 40 + 84;
        fy = fim + (H - 84 - fim - fz) / 2 + 4;
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

      if (ops.length) {
        retangulo(ctx, X, topo, W, cardH, 22); ctx.fillStyle = "#0a2440"; ctx.fill();
        ctx.strokeStyle = "#1b3b5f"; ctx.lineWidth = 2; ctx.stroke();
        var cy = topo + PAD;
        ctx.font = "500 " + FS + "px " + FONTE;
        ops.forEach(function (o) {
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

      if (a.dt) {
        retangulo(ctx, X, ry, W, rh, 18); ctx.fillStyle = "rgba(224,71,26,0.18)"; ctx.fill();
        ctx.fillStyle = "#e0471a"; ctx.fillRect(X, ry + 14, 8, rh - 28);
        var dy = ry + 22;
        if (a.dr) { ctx.fillStyle = "#f0b23c"; ctx.font = "800 27px " + FONTE; dy += 22; ctx.fillText(a.dr, 110, dy); dy += 18; }
        ctx.fillStyle = "#ffffff"; ctx.font = "600 27px " + FONTE;
        dl.forEach(function (l) { dy += 34; ctx.fillText(l, 110, dy - (a.dr ? 0 : 6)); });
      }

      if (im[3]) colar(ctx, im[3], a, fy, fz);
      ctx.fillStyle = "#9db0c7"; ctx.font = "500 22px " + FONTE; ctx.fillText("AOM 2026  |  Campinas/SP", 78, H - 34);
      var tw = im[1].width * 36 / im[1].height; ctx.drawImage(im[1], 1002 - tw, H - 60, tw, 36);
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
      if (a.dt) u += "\n\n" + (a.dr ? "*" + a.dr + "* " : "") + a.dt;
      return u;
    }
    var t = "*" + String(a.titulo).replace(/\n/g, " ") + "*\n" + a.sub + "\n";
    a.grupos.forEach(function (gr) {
      t += "\n*" + gr.nome.toUpperCase() + "* (" + gr.legenda.toLowerCase() + ")\n";
      gr.itens.forEach(function (it) { t += "- " + it[0] + ": " + it[1] + "\n"; });
    });
    return t + "\n*" + a.regra[0] + "* " + a.regra[1];
  }

  return { desenhar: desenhar, texto: texto, preencher: preencher, tamanho: S, figuras: FIGS, figSrc: figSrc, config: function (o) { Object.keys(o).forEach(function (k) { cfg[k] = o[k]; }); } };
})();
