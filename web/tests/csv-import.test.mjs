// Import CSV: separator ales după antet, ghilimele, variante de antet, rânduri invalide sărite, limita de rânduri.
import assert from "assert";
import { readImport, parseCsv } from "../lib/csv-import.ts";

const ro = "﻿Nume;E-mail;Telefon;Localitate;Competențe\r\nAna Pop;ANA@x.ro;0722 111 222;Cluj;\"React, SQL\"\r\nDan;;;;\r\n;;;;\r\nEva;rau-email;;;\r\nIon;ana@x.ro;;;\r\n";
const r = readImport(ro);
assert.equal(r.error, undefined);
assert.deepEqual(r.rows, [
  { name: "Ana Pop", email: "ana@x.ro", phone: "0722 111 222", location: "Cluj", skills: ["React", "SQL"] },
  { name: "Dan", email: null, phone: null, location: null, skills: [] },
]);
assert.deepEqual(r.skipped, ["rândul 5: email invalid", "rândul 6: email repetat în fișier"]);

// virgulă ca separator, ghilimele cu virgulă și rând nou în celulă
assert.deepEqual(parseCsv('a,b\n"x, ""y""","l1\nl2"\n'), [["a", "b"], ['x, "y"', "l1\nl2"]]);

assert.match(readImport("Telefon\n0722").error, /Nume.*Email/);
assert.match(readImport("").error, /gol/);
assert.match(readImport("email\n" + Array.from({ length: 1001 }, (_, i) => `a${i}@x.ro`).join("\n")).error, /1000/);
console.log("csv-import ok");
