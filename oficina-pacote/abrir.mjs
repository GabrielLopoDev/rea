// Abre o pacote cifrado: node abrir.mjs pacote.bin <chave-hex> <pasta-destino>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { dirname, join, normalize } from "node:path";
const [arq, chave, destino] = process.argv.slice(2);
const b = readFileSync(arq), d = createDecipheriv("aes-256-gcm", Buffer.from(chave, "hex"), b.subarray(0, 12));
d.setAuthTag(b.subarray(12, 28));
const j = JSON.parse(gunzipSync(Buffer.concat([d.update(b.subarray(28)), d.final()])).toString("utf8"));
for (const [p, c] of Object.entries(j)) { const f = join(destino, normalize(p)); if (normalize(p).startsWith("..")) continue; mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, Buffer.from(c, "base64")); console.log("ok", p, Buffer.from(c, "base64").length); }
