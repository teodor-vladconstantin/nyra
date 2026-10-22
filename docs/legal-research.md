# Nyra: cercetare juridică (Faza 2)

Data cercetării: 22 octombrie 2026. Operator: TETA ABC SRL (date preluate de pe joben.eu, de reverificat în footer înainte de publicare).

## Cum să citești acest document

**Limită importantă.** Instrumentul meu de web nu a putut încărca paginile EUR-Lex și legislatie.just.ro (răspunsuri goale sau pagină greșită). Concluziile de mai jos vin din surse secundare (firme de avocatură, autorități, site-uri de documentare) și din cunoștințe generale. Fiecare punct are una din etichetele:

- **[SECUNDAR, VERIFICAT ÎN MAI MULTE SURSE]**: mai multe surse concordă, dar nu am citit textul oficial.
- **[SURSĂ PRIMARĂ CITITĂ]**: am văzut textul sau pagina oficială.
- **[CUNOȘTINȚE GENERALE, NEVERIFICAT AZI]**: nu am găsit confirmare în această sesiune; trebuie verificat pe sursa primară.

Nicio afirmare de aici nu trebuie copiată într-un document public fără verificarea sursei primare indicate. Linkurile primare de verificat sunt la fiecare punct.

---

## 1. GDPR (Reg. 2016/679)

**Roluri (art. 4, 24, 26, 28).** [CUNOȘTINȚE GENERALE]
- Date de cont ale recrutorilor (Clerk, `profiles`, `memberships`, note, audit): **Nyra e operator**. Temei: contract (art. 6(1)(b)), plus interes legitim (art. 6(1)(f)) pentru securitate și audit.
- Date ale candidaților încărcate de recrutor (upload, import CSV): **Nyra e împuternicit**, recrutorul e operator. Nyra prelucrează doar la instrucțiunile lui, deci e nevoie de DPA (art. 28).
- Formularul public `/aplica/[id]`: candidatul trimite datele direct în sistem, dar în numele recrutorului (operatorul), deci tot împuternicit. Formularul afișează însă textul "Sunt de acord ca {companie} să îmi prelucreze datele", deci consimțământul e luat pentru recrutor. Nyra nu trebuie să devină operator de fapt (de exemplu prin reutilizarea datelor candidaților pentru scopuri proprii, inclusiv antrenarea de modele). **Codul nu face asta**; documentele trebuie să o interzică explicit.
- `leads` (contact și listă de așteptare): Nyra e operator.

**Temeiuri (art. 6).** [CUNOȘTINȚE GENERALE]
- Pentru candidați, temeiul îl alege recrutorul. Cel mai des: măsuri precontractuale (6(1)(b)) pentru procesul curent și interes legitim (6(1)(f)) sau consimțământ pentru păstrarea în baza de talente. Consimțământul în recrutare e fragil (dezechilibru, retragere), iar formularul actual îl folosește ca temei principal. **Merge la avocat.**
- Date speciale (art. 9): CV-urile pot conține fotografie, sănătate, apartenență. Aplicația nu le filtrează și le trimite integral la LlamaCloud. DPA-ul trebuie să interzică încărcarea deliberată de date speciale și să ceară recrutorului temei pentru cele conținute implicit.

**Informare (art. 13/14).** [CUNOȘTINȚE GENERALE]
- Art. 13: când datele vin direct de la persoană (formularul public, conturile recrutorilor).
- Art. 14: când CV-ul e încărcat de recrutor. Informarea trebuie dată în cel mult o lună sau la primul contact. Aplicația **nu trimite emailuri**, deci informarea cade în sarcina recrutorului. Nyra pune la dispoziție un șablon (Faza 3).

**Art. 22 (decizii automate).** [CUNOȘTINȚE GENERALE, DE VERIFICAT]
- În cod, nicio decizie nu e luată automat (statusul se schimbă doar manual, vezi Faza 1). Totuși, un ranking pe care recrutorul îl urmează fără analiză reală poate fi calificat ca decizie automată. CJEU, C-634/21 SCHUFA (decembrie 2023), a tratat un scor de credit determinant ca decizie automată; **de citit hotărârea și de aplicat prin analogie**. Aplicația trebuie să facă oversight-ul real, nu formal (vezi punctul 4).

**Art. 28 (DPA).** Conținut minim: obiect, durată, natura și scopul prelucrării, tipuri de date, categorii de persoane, instrucțiuni documentate, confidențialitate, securitate (art. 32), subîmputerniciți cu autorizare generală plus notificare și drept de opoziție, asistență pentru drepturile persoanelor, ștergere sau returnare la final, audit, notificare încălcări. [CUNOȘTINȚE GENERALE]

**Art. 30 (registru).** Scutirea pentru sub 250 de angajați nu se aplică dacă prelucrarea nu e ocazională sau include date speciale. Nyra prelucrează constant, deci **trebuie să țină registru** (ca operator și ca împuternicit). [CUNOȘTINȚE GENERALE]

**Art. 32 (securitate).** Măsuri existente în cod și care pot fi declarate: RLS pe organizație, bucket privat, URL-uri semnate de 15 minute, HSTS și CSP, rol admin/viewer, audit imuabil. **Nu declar** certificări, backup-uri testate, MFA obligatoriu sau teste de penetrare, pentru că nu le susține codul.

**Art. 35 (DPIA).**
- Decizia ANSPDCP nr. 174/2018 (MO 919/31.10.2018) conține lista Romaniei de operațiuni care cer DPIA. Am confirmat existența, nu textul anexei. [SECUNDAR] **De citit anexa** (https://dataprotection.ro/servlet/ViewDocument?id=1556) și de verificat dacă "evaluare sistematică și profilare" acoperă ranking-ul de CV-uri.
- Concluzie provizorie: prelucrarea de CV-uri cu evaluare/ranking pe scară largă combină două criterii din ghidul WP248 (evaluare, persoane vulnerabile prin dezechilibru în angajare). **Recomand DPIA**, ca operator pentru propriul registru și ca model pentru clienți. Nyra livrează șablonul (Faza 3, punct 7).

**Transferuri (cap. V).**
- **DPF** [SECUNDAR, mai multe surse]: Tribunalul UE a respins acțiunea Latombe la 3 septembrie 2025. Apelul **C-703/25 P e pendinte** la CJUE, fără hotărâre găsită la 22 octombrie 2026. Decizia de adecvare rămâne valabilă azi, dar cu risc. **Pun SCC ca plan de rezervă în DPA** și verific certificarea fiecărui furnizor pe dataprivacyframework.gov.
- **Fără Anthropic.** Codul nu trimite date la Anthropic.
- **LlamaCloud** [SECUNDAR, documentația LlamaIndex]: există endpoint UE (`api.cloud.eu.llamaindex.ai`, AWS eu-central-1). Codul folosește endpoint-ul implicit (`api.cloud.llamaindex.ai`), deci **datele merg acum în SUA**. Fișierele încărcate la Parse/Extract sunt păstrate în cache 48 de ore, apoi șterse; există `do_not_cache=true` și ștergere la cerere prin API. LlamaIndex semnalează acorduri zero-retention cu furnizorii LLM, dar nu publică lista de subprocesatori și nu am găsit confirmare că apelurile LLM rămân în UE. **DPA la cerere: support@runllama.ai.** Verific dacă regiunea UE e disponibilă fără waitlist.
- **Regiuni confirmate de tine:** Supabase eu-west-1 (Irlanda), Oracle eu-amsterdam-1 (Olanda; consola nu a încărcat resursele, deci confirmă că VM-ul parserului chiar e acolo).
- **Clerk, Vercel, Cloudflare Turnstile, PostHog, Sentry:** furnizori americani sau cu mamă americană, chiar când datele stau în UE (instanțe UE pentru PostHog și Sentry). Se declară transfer posibil prin DPF/SCC.

Surse primare de verificat: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng ; https://www.edpb.europa.eu ; https://www.dataprivacyframework.gov

---

## 2. Legea 190/2018 și ANSPDCP

- Legea 190/2018 pune în aplicare GDPR în România. **Nu am găsit** în aceste căutări vreo regulă specială despre termenul de păstrare a CV-urilor. [LIPSĂ, DE VERIFICAT pe legislatie.just.ro]
- **Nu am găsit** ghid sau decizie ANSPDCP despre retenția CV-urilor. Pagina dataprotection.ro listează un "Ghid RGPD" (ViewDocument?id=1425) și "Întrebări frecvente", fără conținut verificat de mine.
- Sancțiune găsită: ANSPDCP a amendat în 2024 un operator cu **2.000 EUR** pentru un email de recrutare trimis greșit (încălcare de securitate), nu pentru retenție. [SECUNDAR, avocatnet]
- Prescripție amenzi: 3 ani. [SECUNDAR]
- **Concluzie:** nu pot cita un termen românesc oficial. Folosesc principiul limitării stocării (art. 5(1)(e)) și practica europeană (punctul 9).

---

## 3. Cookie-uri și stocare locală

- **Temei:** art. 5(3) Directiva ePrivacy, transpus în **Legea 506/2004, art. 4 alin. (5)**: stocarea sau accesul la informații din terminal e permis doar dacă (a) utilizatorul a primit informații clare și complete, inclusiv scopul, și (b) și-a dat acordul. Excepții: stocare tehnică strict necesară transmiterii comunicării sau serviciului cerut explicit. [SECUNDAR, legeaz.net; copia BCR e actualizată doar la 2015, deci de verificat versiunea consolidată curentă pe legislatie.just.ro]
- **Aplicare în România:** ANSPDCP a amendat un operator de site cu **5.000 lei** pentru stocare fără informare și acord prealabil (art. 4(5) lit. a și b). [SECUNDAR]
- **EDPB 2/2023, v2.0, adoptat 7 octombrie 2024:** art. 5(3) se aplică și la identificatori unici, pixeli, fingerprinting, nu doar cookie-uri clasice. [SECUNDAR, pagina EDPB confirmată prin căutare]
- **Consimțământ valid (EDPB 05/2020 și raportul task force-ului pentru bannere, 2023):** refuzul la fel de ușor ca acceptul, fără cookie wall, fără casete pre-bifate, retragere la fel de ușoară ca acordarea, ușor de găsit ulterior. [CUNOȘTINȚE GENERALE, NEVERIFICAT AZI; căutarea nu a returnat textul]
- **Digital Omnibus (COM(2025) 837) pe cookie-uri:** încă în procedură legislativă. La 12 octombrie 2026 nu exista mandat confirmat al Consiliului, iar Coreper nu a adoptat un mandat la 7 octombrie. Nicio schimbare nu e în vigoare. EDPB și EDPS au dat aviz comun la 10 februarie 2026. [SECUNDAR; Council register de verificat, procedura 2025/0360(COD)] **Aplic regulile actuale.**
- **Ce e strict necesar la Nyra** (din Faza 1): cookie-urile de sesiune Clerk (`__session`, `__client_uat`) sunt necesare serviciului cerut. Turnstile și Clerk Protect: probabil necesare pentru securitate la sign-up, **de decis cu avocatul**. `theme` în localStorage: preferință setată de utilizator; zonă gri, de tratat ca "funcționalitate cerută" doar dacă se scrie la acțiunea explicită a utilizatorului.
- **PostHog și Sentry Replay:** consimțământ obligatoriu. Sentry doar pentru erori, fără cookie sau storage, poate rămâne pe interes legitim, cu scrubbing de date personale.

Surse primare: https://eur-lex.europa.eu/eli/dir/2002/58/oj ; https://legislatie.just.ro (Legea 506/2004, versiune consolidată) ; https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en

---

## 4. EU AI Act (Reg. 2024/1689)

**Calendar actual.** [SECUNDAR, mai multe surse concordante; textul din Jurnalul Oficial neconfirmat direct]
- **Digital Omnibus on AI = Regulamentul (UE) 2026/1744.** Parlamentul a aprobat la 16 iunie 2026, Consiliul la 29 iunie 2026. Publicat în JO la 24 iulie 2026, în vigoare la 27 iulie 2026.
- **Sisteme high-risk din Anexa III: amânate de la 2 august 2026 la 2 decembrie 2027.** Anexa I (produse reglementate): 2 august 2028.
- **Art. 50 (transparență)** nu a fost amânat și se aplică din august 2026; o perioadă de grație pentru marcarea conținutului generat rulează până la 2 decembrie 2026.
- Surse care nu sunt de încredere: unele bloguri anterioare publicării vorbesc de "propunere". Ignorate.

**Clasificare.** Anexa III, pct. 4(a): sisteme AI destinate recrutării sau selecției de persoane fizice, inclusiv analiza și filtrarea cererilor de angajare și evaluarea candidaților. [SURSĂ INTERMEDIARĂ: textul anexei citit pe artificialintelligenceact.eu, nu pe EUR-Lex]
- **Ranking-ul Nyra** (similaritate semantică + potrivire pe cuvinte-cheie, ordonare candidați per job) **pare să intre în Anexa III 4(a)**.
- **Derogarea din art. 6(3)** (sarcini procedurale înguste, pregătitoare) **nu se aplică dacă sistemul face profilare** de persoane fizice. Ranking-ul pe baza datelor din CV e probabil profilare. [CUNOȘTINȚE GENERALE, **de verificat cu avocatul**]
- Opțiune de design (decizia ta, nu o implementez): dacă ai elimina scorul și ordonarea și ai lăsa doar căutare/filtrare manuală, expunerea scade; filtrarea de cereri poate rămâne în 4(a).

**Rolurile.**
- **Nyra = furnizor (provider)** al sistemului (îl pune pe piață sub nume propriu). Obligații (art. 16 și cap. III): sistem de management al calității, management al riscului, guvernanță a datelor (art. 10, inclusiv bias), documentație tehnică, loguri (art. 12), instrucțiuni (art. 13), supraveghere umană prin design (art. 14), acuratețe și robustețe (art. 15), evaluare a conformității (control intern), declarație UE, marcaj CE, înregistrare în baza de date UE (art. 49), monitorizare post-piață. [CUNOȘTINȚE GENERALE]
- **Recrutorul = deployer.** Art. 26 [SECUNDAR, text citit pe artificialintelligenceact.eu]: folosește conform instrucțiunilor, desemnează supraveghere umană competentă, verifică datele de intrare dacă le controlează, monitorizează și raportează riscuri, **păstrează logurile minim 6 luni**, informează angajații și reprezentanții înainte de folosire la locul de muncă și, **conform art. 26(11), informează persoanele fizice vizate că sistemul e folosit**. De aici cerința ca nota pentru candidați să menționeze procesarea automată.
- **Art. 27 (FRIA):** se aplică în principal organismelor publice și entităților private care prestează servicii publice; recrutorii privați obișnuiți nu sunt de regulă vizați. [CUNOȘTINȚE GENERALE, de verificat]
- **Art. 86:** dreptul la explicație pentru deciziile bazate pe output-ul unui sistem high-risk. [CUNOȘTINȚE GENERALE] Pagina existentă "Cum e calculat scorul" ajută aici.
- **Art. 50:** Nyra nu interacționează direct cu persoane prin AI și nu generează conținut sintetic, deci probabil **nu se aplică**. [CUNOȘTINȚE GENERALE, de verificat]
- **Tranziție (art. 111):** sistemele puse pe piață înainte de data aplicării sunt acoperite doar dacă suferă modificări semnificative de proiectare. Relevanță: beta-ul actual (o organizație). [CUNOȘTINȚE GENERALE, **de verificat**]
- **Art. 4 (alfabetizare AI):** Omnibus ar fi modificat această obligație; **nu am verificat cum**. [INCERT]
- **Sancțiuni (art. 99):** pentru nerespectarea obligațiilor furnizorilor, amenzi până la 15 milioane EUR sau 3% din cifra de afaceri. [CUNOȘTINȚE GENERALE]

**Ce afirm în documente:** "Nyra este proiectată pentru a asista, nu a înlocui, decizia umană; nicio respingere nu are loc automat." **Nu afirm** conformitate AI Act, pentru că nu există documentație tehnică, sistem de calitate sau evaluare a conformității.

Surse primare: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng ; https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng (încercat, pagină goală).

---

## 5. Comerț electronic, B2C

- **Legea 365/2002, art. 5** [SECUNDAR, legeaz.net și site-uri de documentare]: furnizorul oferă acces facil, direct, permanent și gratuit la: denumire, sediu, contact, nr. de înregistrare, cod fiscal; prețuri cu mențiunea TVA. Norma metodologică cere un canal de reclamații gratuit, cu confirmare în maxim 48 de ore. Comunicările comerciale nesolicitate sunt interzise fără acord. **Se aplică**: pagină sau footer cu datele TETA ABC SRL. Dacă se aplică integral în B2B nu am putut confirma. [**avocat**]
- **Legea 363/2007 și OUG 34/2014:** vizează consumatorii. Nyra e B2B, deci **nu se aplică**, cu condiția ca T&C să impună declarația de calitate profesională și să refuze înregistrarea de persoane fizice în scop personal. [CUNOȘTINȚE GENERALE]

---

## 6. Platforma ODR și ANPC/SAL

- **Platforma ODR a fost închisă la 20 iulie 2025** (Reg. (UE) 2024/3228, JO 30.12.2024, care abrogă Reg. 524/2013). Obligația de a lega platforma a dispărut. Un link rămas poate induce în eroare. [SECUNDAR, mai multe surse; EUR-Lex: https://eur-lex.europa.eu/eli/reg/2024/3228/oj/eng]
- **ANPC SAL** vizează litigii cu consumatori. Joben are un badge SAL (confirmat pe joben.eu). Pentru Nyra B2B **nu e necesar**. [CUNOȘTINȚE GENERALE]
- **Decizie:** niciun link ODR și niciun badge SAL în documentele Nyra.

---

## 7. DSA și Data Act

**Data Act (Reg. 2023/2854), aplicabil din 12 septembrie 2025.** [SECUNDAR, mai multe surse]
- Un SaaS e "serviciu de procesare a datelor". Capitolul VI (schimbarea furnizorului) cere ca **contractele cu clienții business să prevadă**: preaviz de maximum 2 luni, perioadă de tranziție de maximum 30 de zile, export al datelor și activelor digitale, fără taxe de transfer începând cu **12 ianuarie 2027**.
- Excepția pentru servicii personalizate extensiv e îngustă. Nu e clar dacă se aplică la servicii gratuite/beta. [**avocat**]
- **Se aplică Nyra.** T&C trebuie să includă o clauză de "schimbare furnizor/export". Exportul tehnic există parțial (CSV, export JSON per candidat), dar nu o export complet al organizației (vezi lipsuri Faza 1).

**DSA (Reg. 2022/2065).** [CUNOȘTINȚE GENERALE, NEVERIFICAT AZI; căutarea nu a acoperit DSA]
- SaaS-ul intern nu e platformă online. **Dar** paginile publice `/aplica/[id]` publică anunțuri create de recrutori, deci Nyra poate fi **serviciu de găzduire** (art. 6) pentru conținut al utilizatorilor, accesibil publicului. Obligații minime de găzduire: punct de contact (art. 11, 12), mențiuni în T&C (art. 14), mecanism de notificare și acțiune (art. 16). Exceptarea microîntreprinderilor/întreprinderilor mici privește doar obligațiile platformelor online (cap. III secțiunea 3). [**avocat**]
- **Măsură practică:** punct de contact și mecanism simplu de raportare a anunțurilor ilegale.

---

## 8. Clauze B2B uzuale pentru SaaS în România

Toate din cunoștințe generale, **de verificat de avocat**:
- **Libertate contractuală** (Codul civil, Legea 287/2009). Limitarea răspunderii nu poate exclude răspunderea pentru intenție sau culpă gravă (art. 1355 C. civ., de verificat). Joben folosește o structură similară: plafon la sumele plătite în ultimele 12 luni, cu excepțiile legale.
- **Clauze neobișnuite în contracte de adeziune** (art. 1203 C. civ.): limitări de răspundere, încetare, instanță competentă nu produc efecte dacă nu sunt **acceptate expres, în scris**. Cerință tehnică: bifă separată sau accept explicit cu link la aceste clauze.
- **Beta gratuit:** serviciu "ca atare", fără SLA, plafon mic de răspundere, drept de schimbare sau oprire cu preaviz.
- **SLA la lansarea comercială:** disponibilitate țintă, ferestre de mentenanță, credite, excluderi (forță majoră, furnizori terți). Nu declar cifre de disponibilitate neacoperite de infrastructură.
- **Proprietatea datelor:** clientul păstrează datele și drepturile asupra lor; Nyra primește doar licența necesară prestării serviciului. Rezultatele derivate (embedding, cuvinte-cheie) aparțin tot clientului în contract.
- **Încetare:** export și ștergere într-un termen fix (aliniat cu Data Act: 30 de zile).
- **Lege și instanță:** legea română. Instanța: judecătoria/tribunalul de la sediul TETA ABC SRL (Joben folosește Buzău pentru non-consumatori). Arbitrajul rămâne opțional.
- **Legea 72/2013** (termene de plată în tranzacții comerciale) va conta la facturare. [de verificat]

---

## 9. Retenție uzuală pentru CV-uri

[SECUNDAR, surse de practică; fără text oficial românesc]
- Nu există un termen unic UE. Principiu: cât e necesar scopului; pentru un post, scopul se încheie când postul e ocupat.
- **Practica curentă:** 6 până la 12 luni pentru candidații nereușiți (aliniat cu termenele pentru reclamații de discriminare). Exemple de politici companiilor: 12 luni.
- **CNIL (Franța):** până la 2 ani de la ultimul contact în baza de CV-uri, cu informare și posibilitate de opoziție; arhivare intermediară de 5 ani pentru dovezi în litigii de discriminare. [Surse secundare; nevăzut pe cnil.fr]
- **Bază de talente (peste durata procesului):** necesită de regulă consimțământ separat.
- **Propunerea mea pentru Nyra (decizie a ta):** implicit **12 luni** de la ultima activitate pentru candidați, configurabil de recrutor (1 până la 24 de luni, cu avertisment peste 12); `leads`: **12 luni** de la ultimul contact; date de cont: cât timp contul e activ, plus 30 de zile; `audit_log`: de stabilit cu avocatul (conține identificatorul actorului și nu poate fi șters acum).

---

## Ce se schimbă în aplicație (rezultat al cercetării)

1. LlamaCloud: trecere la endpoint UE sau `do_not_cache`, plus DPA semnat; altfel datele candidaților merg în SUA.
2. Retenție automată implicită de 12 luni, nu "nelimitat".
3. Consimțământ de T&C cu log (user, timp, versiune) la sign-up; DPA acceptat explicit la onboarding.
4. Clauzele neobișnuite acceptate separat, expres.
5. Banner de cookies obligatoriu odată cu PostHog.
6. Textul de pe formularul public: informare art. 13 completă, nu doar un link generic; de reevaluat consimțământul ca temei.
7. Mențiune de procesare automată în nota pentru candidați (art. 26(11) AI Act, art. 13/14 GDPR).
8. Punct de contact și raportare pentru anunțuri (DSA găzduire); export complet al organizației (Data Act).
9. Pagina `/termeni` actuală spune "acces pe bază de invitație", ceea ce nu corespunde sign-up-ului deschis; se înlocuiește.

## Ce trebuie verificat de avocat înainte de lansarea comercială

1. Rolul Nyra: furnizor high-risk sub AI Act (ranking), data aplicării și efectul art. 111; dacă derogarea 6(3) poate fi invocată.
2. Dacă ranking-ul poate fi decizie automată (art. 22, SCHUFA) în practica recrutorilor.
3. Temeiul prelucrării pe formularul public (consimțământ vs. interes legitim/precontractual) și locul informării art. 13/14.
4. DPIA: dacă anexa Deciziei ANSPDCP 174/2018 o impune explicit.
5. Transferuri: riscul C-703/25 P, SCC cu Clerk, Vercel, Cloudflare, PostHog, Sentry, LlamaIndex; subprocesatorii LLM ai LlamaIndex.
6. Legea 365/2002 în B2B; DSA ca serviciu de găzduire pentru anunțuri; Data Act pentru servicii beta/gratuite.
7. Clauze B2B: limitarea răspunderii (art. 1355 C. civ.), clauze neobișnuite (art. 1203), instanță, SLA.
8. Cookie-uri: statutul Turnstile, Clerk Protect, `theme`.
9. Retenția `audit_log` care conține identificatori de actori.
10. Verificarea textelor consolidate: Legea 506/2004, Legea 190/2018, Reg. 2026/1744 (surse primare).

## Linkuri surse (verificare)

- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng ; text Anexa III și art. 26 citit pe https://artificialintelligenceact.eu
- Omnibus AI (2026/1744): https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng (neîncărcat)
- ePrivacy: https://eur-lex.europa.eu/eli/dir/2002/58/oj ; EDPB 2/2023: https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en
- Decizia ANSPDCP 174/2018: https://dataprotection.ro/servlet/ViewDocument?id=1556
- ODR: https://eur-lex.europa.eu/eli/reg/2024/3228/oj/eng
- DPF: https://www.dataprivacyframework.gov ; Latombe, C-703/25 P (stare via WilmerHale, 1 decembrie 2025, și presă din iunie 2026)
- LlamaCloud: https://developers.llamaindex.ai/llamaparse/general/data_retention/ și .../regions
- Legea 365/2002: https://legislatie.just.ro/Public/DetaliiDocumentAfis/77218
- Digital Omnibus (cookie-uri): procedura 2025/0360(COD), registrul Consiliului
