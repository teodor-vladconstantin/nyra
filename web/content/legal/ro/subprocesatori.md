# Subprocesatori Nyra

> **Versiune:** 0.1 (ciornă) | **În vigoare de la:** [DE COMPLETAT la lansare] | **Ultima actualizare:** 22 octombrie 2026
> **Operator:** TETA ABC SRL, CUI 22404824, Reg. Com. J2007001135104, Str. Centrală nr. 169, sat Mărăcineni, jud. Buzău, cod poștal 127325, România | **Contact:** hello@joben.eu | **Protecția datelor:** privacy@joben.eu

Această pagină face parte din Acordul de prelucrare a datelor (DPA). Lista cuprinde furnizorii care prelucrează date personale în numele nostru. Nu cuprinde furnizori care nu primesc date personale.

## Activi acum

| Furnizor | Scop | Date | Țară / regiune | Mecanism de transfer |
|---|---|---|---|---|
| **Supabase** (Supabase Inc.) | Baza de date și stocarea fișierelor (CV-uri, previzualizări) | Toate datele din aplicație | UE, Irlanda (eu-west-1) | Date în UE. Grupul e din SUA, deci posibil acces din afara UE: DPF/SCC [DE VERIFICAT: DPA semnat și certificarea] |
| **Vercel** (Vercel Inc.) | Găzduirea aplicației web și execuția cererilor | Cereri HTTP, loguri tehnice, conținutul cererilor (inclusiv CV-urile la încărcare) în tranzit | Funcțiile rulează în UE, Dublin (dub1) [DE VERIFICAT: după deploy, în setările proiectului]; rețeaua de livrare este globală | Grupul e din SUA: DPF/SCC [DE VERIFICAT: certificare] |
| **Clerk** (Clerk, Inc.) | Autentificarea Utilizatorilor | Email, date de autentificare, sesiuni, semnale anti-abuz | SUA | DPF sau SCC [DE VERIFICAT: certificare, DPA] |
| **Cloudflare** (Cloudflare, Inc.) | Verificare anti-bot (Turnstile) la înregistrare | Semnale tehnice ale browserului | Global / SUA [DE VERIFICAT] | DPF sau SCC [DE VERIFICAT] |
| **LlamaIndex** (LlamaIndex, Inc.) | Extragerea textului și a datelor din CV-uri (LlamaParse, LlamaExtract) | Conținutul integral al CV-urilor trimise la procesare, cu nume de fișier aleatoriu | UE, Frankfurt (eu-central-1), conform documentației lor [DE VERIFICAT: că și apelurile către furnizorii de modele ai LlamaIndex rămân în UE; lista lor de subprocesatori nu e publică] | Date în UE. Grupul e din SUA, deci acces din afara UE posibil: DPF/SCC, DPA [DE VERIFICAT: la cerere, support@runllama.ai]. După procesare, jobul și fișierul sunt șterse prin API (best effort); fișierele rămase expiră la 48 de ore, conform documentației lor. |
| **Oracle Cloud Infrastructure** (Oracle) | Găzduirea serviciului de extragere și potrivire (calcul și memorie temporară) | CV-uri în tranzit, text extras, vectori de potrivire calculați local | UE, Amsterdam [DE VERIFICAT: regiunea VM-ului] | Date în UE. Grupul e din SUA: DPF/SCC [DE VERIFICAT] |

Potrivirea semantică se calculează local pe serviciul nostru (model fastembed), fără să trimitem textul unui terț.

## Planificați, nu sunt activi încă

| Furnizor | Scop | Țară | Condiție |
|---|---|---|---|
| **PostHog** (instanța UE) | Statistici de produs | UE, cu grup din SUA | Doar după acordul utilizatorului din banner |
| **Sentry** (instanța UE) | Monitorizarea erorilor | UE, cu grup din SUA | Fără înregistrare de sesiune, cu eliminarea datelor personale; înregistrarea de sesiune doar cu acord |

Îi vom muta în tabelul de sus și vom anunța Clienții înainte de activare, conform DPA (secțiunea 3.5).

## Cum anunțăm schimbările

Orice adăugare sau înlocuire se publică aici cu data intrării în vigoare și se anunță în aplicație cu cel puțin [DE COMPLETAT: 30] de zile înainte. Clientul poate obiecta motivat. Vezi DPA, secțiunea 3.5.

## Despre transferurile în afara SEE

Cadrul de confidențialitate UE-SUA (Decizia de adecvare din 10 iulie 2023) este în vigoare la această dată. Contestarea lui este pendinte la Curtea de Justiție a UE (cauza C-703/25 P). Ca plan de rezervă folosim clauze contractuale standard (Decizia (UE) 2021/914). [DE VERIFICAT DE AVOCAT.]
