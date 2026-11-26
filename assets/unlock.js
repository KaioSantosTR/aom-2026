(function () {
  var overlay = document.getElementById("lock");
  var form = document.getElementById("lock-form");
  var input = document.getElementById("lock-code");
  var msg = document.getElementById("lock-msg");
  var started = false;

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  function decrypt(blob, code) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: b64(blob.salt), iterations: blob.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(blob.iv) }, key, b64(blob.ct));
    }).then(function (buf) {
      return JSON.parse(new TextDecoder().decode(buf));
    });
  }

  function mostrarErro(err) {
    msg.textContent = "Não consegui abrir o painel. Recarregue a página. Detalhe: " + (err && err.message ? err.message : err);
  }

  var blobPromise = Promise.resolve(window.AOM_ENC);

  function tryCode(code, silent) {
    msg.textContent = silent ? "" : "Verificando...";
    return blobPromise.then(function (blob) { return decrypt(blob, code); }).then(function (data) {
      try { sessionStorage.setItem("aom-code", code); } catch (e) {}
      if (!started) {
        started = true;
        try { window.startApp(data); }
        catch (err) { mostrarErro(err); return true; }
      }
      overlay.hidden = true;
      document.body.classList.remove("locked");
      return true;
    }, function () {
      try { sessionStorage.removeItem("aom-code"); } catch (e) {}
      if (!silent) msg.textContent = "Código incorreto. Tente novamente.";
      return false;
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    tryCode(input.value.trim(), false);
  });

  var saved = null;
  try { saved = sessionStorage.getItem("aom-code"); } catch (e) {}
  if (saved) tryCode(saved, true).then(function (ok) { if (!ok) input.focus(); });
  else input.focus();
})();
