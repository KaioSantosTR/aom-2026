const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");
const path = require("path");

const root = path.resolve(__dirname, "..");
const code = process.env.AOM_CODE;
if (!code || code.length < 6) {
  console.error("Defina AOM_CODE (mínimo 6 caracteres) antes de rodar.");
  process.exit(1);
}

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "src", "data.js"), "utf8"), ctx);
const plain = Buffer.from(JSON.stringify(ctx.window.AOM), "utf8");

const iterations = Number(process.env.AOM_ITER) || 310000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(code, salt, iterations, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "aom.enc.js"),
  "window.AOM_ENC=" + JSON.stringify({ v: 1, iter: iterations, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") }) + ";"
);
console.log("data/aom.enc.js gerado (" + ct.length + " bytes)");
