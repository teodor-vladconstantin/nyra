// Date structurate schema.org/JobPosting pentru pagina publică de aplicare (Google for Jobs).
export type PostingInput = {
  id: string; title: string; description: string; requirements: string; location: string;
  contract_type: string; company: string; posted_at: string;
};

const REMOTE = /remote|la distan[tț][aă]|telemunc/i;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

// Textul liber „Normă întreagă” / „part-time” -> valorile cerute de Google; ce nu se recunoaște se omite.
function employmentType(raw: string) {
  const t = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/part|partiala/.test(t)) return "PART_TIME";
  if (/full|intreaga/.test(t)) return "FULL_TIME";
  return undefined;
}

export function jobPostingJsonLd(j: PostingInput, url: string) {
  const description = [j.description, j.requirements && `Cerințe:\n${j.requirements}`].filter(Boolean).join("\n\n") || j.title;
  const place = j.location.split(/[/,;|]/).map((p) => p.trim()).find((p) => p && !REMOTE.test(p));
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: html(description),
    datePosted: j.posted_at,
    identifier: { "@type": "PropertyValue", name: j.company, value: j.id },
    hiringOrganization: { "@type": "Organization", name: j.company },
    employmentType: employmentType(j.contract_type),
    directApply: true,
    url,
    ...(place && { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: place, addressCountry: "RO" } } }),
    ...(REMOTE.test(j.location) && { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Romania" } }),
  };
}

// În <script type="application/ld+json"> un "</script>" din text ar închide blocul: "<" devine \u003c.
export const toScriptJson = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");
