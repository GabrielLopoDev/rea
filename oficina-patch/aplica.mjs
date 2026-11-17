import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const [velho, patch, novo] = process.argv.slice(2), sha = (t) => createHash("sha256").update(t).digest("hex");
const p = JSON.parse(readFileSync(patch, "utf8")), a = readFileSync(velho, "utf8");
if (sha(a) !== p.de) { console.error("ARQUIVO DE ORIGEM DIFERENTE", sha(a)); process.exit(1); }
const L = a.split("\n"), out = []; let i = 0;
for (const o of p.ops) { while (i < o.at) out.push(L[i++]); i += o.del; out.push(...o.add); }
while (i < L.length) out.push(L[i++]);
const r = out.join("\n"); if (sha(r) !== p.para) { console.error("RESULTADO NAO CONFERE", sha(r)); process.exit(2); }
writeFileSync(novo, r); console.log("OK", r.length);
