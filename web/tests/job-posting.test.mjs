// JobPosting JSON-LD: câmpuri cerute de Google, HTML scăpat, locație/remote/tip contract, "<" scăpat în script.
import assert from "assert";
import { jobPostingJsonLd, toScriptJson } from "../lib/job-posting.ts";

const base = { id: "j1", title: "Dev <React>", description: "Linia 1\nLinia 2 & mai mult", requirements: "SQL", location: "București / Remote",
  contract_type: "Normă întreagă", company: "Acme", posted_at: "2026-10-18T10:00:00Z" };
const ld = jobPostingJsonLd(base, "https://x.ro/aplica/j1");
assert.equal(ld["@type"], "JobPosting");
assert.equal(ld.description, "Linia 1<br>Linia 2 &amp; mai mult<br><br>Cerințe:<br>SQL");
assert.equal(ld.employmentType, "FULL_TIME");
assert.equal(ld.jobLocation.address.addressLocality, "București");
assert.equal(ld.jobLocationType, "TELECOMMUTE");
assert.equal(ld.hiringOrganization.name, "Acme");
assert.ok(!toScriptJson(ld).includes("<"), "niciun < brut în JSON-ul din <script>");

const remote = jobPostingJsonLd({ ...base, location: "Remote", contract_type: "Contract", description: "", requirements: "" }, "u");
assert.equal(remote.jobLocation, undefined);
assert.equal(remote.employmentType, undefined);
assert.equal(remote.description, "Dev &lt;React&gt;", "fără descriere: titlul");
assert.equal(jobPostingJsonLd({ ...base, contract_type: "Part-time", location: "" }, "u").employmentType, "PART_TIME");
console.log("job-posting ok");
