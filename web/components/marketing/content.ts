import { FileSearch, Gauge, History, Kanban, Languages, MessagesSquare, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

// Conținutul site-ului: doar ce face aplicația azi. Fără cifre sau clienți inventați.

export type Feature = { icon: LucideIcon; title: string; short: string; long: string; points: string[] };

export const FEATURES: Feature[] = [
  {
    icon: FileSearch,
    title: "Parsare CV în câteva secunde",
    short: "Încarci PDF sau DOCX, primești candidatul structurat.",
    long: "Încarci mai multe CV-uri deodată. Nyra citește fișierul și scoate contactul, experiența, perioadele și competențele, fără să le copiezi de mână.",
    points: ["PDF și DOCX, mai multe fișiere într-o singură încărcare", "Perioade și ani de experiență calculați corect, fără suprapuneri", "Ce nu poate fi citit sigur e marcat „Necesită revizuire”"],
  },
  {
    icon: Languages,
    title: "Gândit pentru CV-uri în română",
    short: "Diacritice, formate de dată locale, texte în română și engleză.",
    long: "Căutarea ignoră diacriticele, datele se înțeleg în formatele uzuale de la noi, iar potrivirea semantică funcționează între limbi.",
    points: ["Căutare full-text în CV, roluri și companii, fără diacritice", "Date în orice format uzual", "Potrivire între un job în română și un CV în engleză"],
  },
  {
    icon: Sparkles,
    title: "Potrivire semantică cu joburile",
    short: "Candidații se ordonează după cât se potrivesc cu postul.",
    long: "Definești jobul, cu cuvinte cheie și cerințe, iar Nyra ordonează candidații după potrivire, atât pe competențe, cât și pe înțeles.",
    points: ["Clasament pe cuvinte cheie și clasament semantic, unul lângă altul", "Atașezi manual candidați la un job", "Fără scoruri stocate: se recalculează la citire"],
  },
  {
    icon: Kanban,
    title: "Pipeline vizual",
    short: "De la „Nou” la „Angajat”, cu drag and drop.",
    long: "Vezi candidații ca tabel filtrabil sau ca board kanban. Statusuri, etichete, note și filtre salvate pentru ce cauți des.",
    points: ["Tabel și kanban, aceleași date", "Etichete, note și filtre salvate", "Export CSV și CV-ul afișat direct în pagină"],
  },
  {
    icon: MessagesSquare,
    title: "Scorecard-uri de interviu",
    short: "Evaluări structurate, aceleași criterii pentru toți.",
    long: "După interviu, fiecare evaluator completează un scorecard. Compari candidații pe aceleași criterii, nu pe impresii.",
    points: ["Evaluări pe criterii, cu comentarii", "Istoric pe fișa candidatului", "Incluse în exportul de date al candidatului"],
  },
  {
    icon: Gauge,
    title: "Tablou de bord",
    short: "Ce intră, ce se mișcă, ce competențe apar cel mai des.",
    long: "Vezi încărcările pe săptămână, distribuția pe statusuri și competențele dominante din baza ta de candidați.",
    points: ["Încărcări pe săptămână", "Competențe frecvente, curățate de titluri și certificări", "Candidați pe statusuri"],
  },
  {
    icon: ShieldCheck,
    title: "GDPR din construcție",
    short: "Retenție, export, ștergere și jurnal, nu doar o bifă.",
    long: "Fiecare organizație își vede doar datele ei, izolat la nivel de bază de date. Retenția e configurabilă, iar exportul și ștergerea unui candidat sunt la un click.",
    points: ["Izolare pe organizație la nivel de bază de date", "Retenție în luni, cu „Șterge acum”", "Export JSON și ștergere pentru un candidat"],
  },
  {
    icon: History,
    title: "Jurnal care nu se poate edita",
    short: "Cine ce a schimbat și când, inclusiv pentru administratori.",
    long: "Fiecare creare, modificare sau ștergere se înregistrează. Datele personale apar doar ca „date personale”, iar jurnalul nu poate fi modificat sau șters de nimeni.",
    points: ["Roluri admin și viewer", "Valorile personale nu ajung în jurnal", "Verificabil la audit"],
  },
];

export const DIFFERENCES = [
  { title: "Făcut pentru piața noastră", text: "Diacritice, formate locale și CV-uri în română sau engleză sunt cazul de bază, nu o excepție." },
  { title: "Fără ATS greoi", text: "Nu configurezi zeci de câmpuri. Încarci CV-uri și ai candidați structurați, gata de filtrat." },
  { title: "GDPR integrat", text: "Retenție, export, ștergere și jurnal sunt în produs de la început, nu un modul separat." },
  { title: "Potrivire care înțelege", text: "Nu doar cuvinte identice: un job în română găsește un CV în engleză cu aceeași experiență." },
];

export const STEPS = [
  { title: "Încarci CV-urile", text: "PDF sau DOCX, câte vrei deodată." },
  { title: "Nyra le citește", text: "Contact, experiență și competențe, structurate și verificate." },
  { title: "Alegi candidații", text: "Cauți, filtrezi, potrivești cu un job și duci mai departe." },
];

export type Faq = { q: string; a: string; group: "Produs" | "Date și GDPR" | "Prețuri" };

export const FAQS: Faq[] = [
  { group: "Produs", q: "Ce este Nyra?", a: "Nyra este un instrument de recrutare care citește CV-uri și le transformă în candidați structurați: contact, experiență, competențe. Pe lângă parsare, ai căutare, potrivire cu joburi, pipeline, scorecard-uri de interviu și un tablou de bord." },
  { group: "Produs", q: "Ce formate de CV acceptă?", a: "PDF și DOCX. Tipul real al fișierului este verificat la încărcare, iar DOCX-urile se convertesc în PDF pentru previzualizare." },
  { group: "Produs", q: "Funcționează cu CV-uri în română?", a: "Da, este cazul principal. Căutarea ignoră diacriticele, datele se înțeleg în formatele uzuale, iar potrivirea semantică funcționează și între română și engleză." },
  { group: "Produs", q: "Ce se întâmplă când parserul nu e sigur?", a: "Candidatul este marcat „Necesită revizuire”, ca să verifici manual datele înainte să te bazezi pe ele." },
  { group: "Produs", q: "Cum funcționează potrivirea cu un job?", a: "Definești jobul cu cuvinte cheie și cerințe. Nyra ordonează candidații în două feluri: după competențele comune și după asemănarea semantică dintre job și CV. Le vezi alături." },
  { group: "Produs", q: "Se integrează cu alte sisteme?", a: "Momentan nu există integrări. Poți exporta lista de candidați în CSV. Dacă ai nevoie de o integrare anume, scrie-ne prin pagina de contact." },
  { group: "Date și GDPR", q: "Cine vede datele candidaților mei?", a: "Doar membrii organizației tale. Izolarea între organizații este impusă la nivel de bază de date, nu doar în aplicație." },
  { group: "Date și GDPR", q: "Pot șterge sau exporta datele unui candidat?", a: "Da. Exportul produce un fișier JSON cu fișa, experiențele, notele și scorecard-urile. Ștergerea unui candidat este disponibilă administratorilor." },
  { group: "Date și GDPR", q: "Cât timp se păstrează datele?", a: "Tu stabilești perioada de retenție, în luni, pentru organizația ta. Candidații expirați pot fi șterși cu „Șterge acum”." },
  { group: "Date și GDPR", q: "Există un istoric al modificărilor?", a: "Da. Jurnalul de activitate înregistrează cine a creat, modificat sau șters ce. Nu poate fi editat sau șters, nici de administratori, iar datele personale apar doar ca „date personale”." },
  { group: "Prețuri", q: "Cât costă Nyra?", a: "În perioada de lansare Nyra este gratuit, cu acces la toate funcțiile. Planurile plătite vor fi anunțate înainte să intre în vigoare." },
  { group: "Prețuri", q: "Voi fi taxat fără să știu?", a: "Nu. Nu cerem card la acest moment, iar orice plan plătit va fi anunțat din timp." },
  { group: "Prețuri", q: "Cum aflu când apar planurile plătite?", a: "Intră pe lista de așteptare din pagina de prețuri și îți scriem când sunt gata." },
];
