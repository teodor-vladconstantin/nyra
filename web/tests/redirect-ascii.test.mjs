// redirect() din server actions pune URL-ul în header-ul x-action-redirect: orice caracter non-Latin1 (ș, ț, ă) îl face să
// arunce 500 DUPĂ ce acțiunea s-a executat. Textul din URL (?toast=) trebuie trecut prin encodeURIComponent.
import assert from "assert";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(new URL("../app", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).filter((f) => /\.tsx?$/.test(f));
const bad = [];
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    const m = line.match(/redirect\((["'`])(.*?)\1\)/);
    // literal fără ${...}: ce rămâne după scoaterea expresiilor trebuie să fie ASCII
    if (m && /[^\x00-\x7f]/.test(m[2].replace(/\$\{.*?\}/g, ""))) bad.push(`${f}:${i + 1}`);
  });
}
assert.deepEqual(bad, [], "redirect() cu caractere non-ASCII necodificate: " + bad.join(", "));
console.log("OK: redirect-uri ASCII");
