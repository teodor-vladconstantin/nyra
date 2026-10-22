# Registrul activităților de prelucrare, TETA ABC SRL (art. 30 GDPR), pentru Nyra

> **Versiune:** 0.1 (șablon intern) | **Ultima actualizare:** 22 octombrie 2026 | **Responsabil:** [DE COMPLETAT]
> Document intern, nepublic. Se actualizează la fiecare schimbare.

## A. Ca operator (art. 30(1))

| Prelucrare | Persoane | Date | Scop și temei | Destinatari | Transferuri | Termen | Securitate |
|---|---|---|---|---|---|---|---|
| Conturi utilizatori | Recrutori | Email, autentificare, identificator, rol, organizație | Furnizarea contului; art. 6(1)(b) | Clerk, Supabase, Vercel | SUA (DPF/SCC) | Cont activ + 30 zile | Vezi DPA, Anexa 2 |
| Activitate în aplicație | Recrutori | Autor note/scorecard, filtre, stare tur | Funcționare; art. 6(1)(b) | Supabase | UE | Cont activ + 30 zile | idem |
| Jurnal de activitate | Recrutori | Identificator utilizator, acțiune, moment | Securitate; art. 6(1)(f) | Supabase | UE | 24 de luni (automat) | idem |
| Formulare site (contact, listă de așteptare) | Vizitatori | Nume, email, mesaj | Răspuns; art. 6(1)(f) și 6(1)(a) | Supabase | UE | 12 luni de la trimitere (automat) | idem |
| Loguri tehnice | Utilizatori și vizitatori | IP, cerere | Securitate și funcționare; art. 6(1)(f) | Vercel, Oracle | SUA / UE | [DE COMPLETAT] | idem |
| Statistici (planificat) | Vizitatori | Identificatori de browser | Îmbunătățire produs; art. 6(1)(a) | PostHog | UE/SUA | 12 luni | Doar cu acord |

## B. Ca împuternicit (art. 30(2))

| Element | Conținut |
|---|---|
| Operatori (Clienți) | Lista organizațiilor din aplicație, cu datele de identificare introduse de ele. [DE COMPLETAT: câmpuri de identificare] |
| Categorii de prelucrări | Stocare și extragere de date din CV-uri, căutare, potrivire, export, ștergere (DPA, Anexa 1) |
| Transferuri | LlamaIndex (SUA acum), Vercel, Clerk, Cloudflare (SUA). Supabase și Oracle (UE). Mecanisme: DPF/SCC |
| Măsuri de securitate | DPA, Anexa 2 |

## C. Evidențe asociate

- Acceptarea Termenilor și a DPA: tabelul `legal_acceptances` (utilizator, moment, versiune).
- Consimțământ cookie: în browserul vizitatorului (`nyra_consent`: alegere, moment, versiune).
- Subprocesatori și DPA semnate: [DE COMPLETAT: stare pe furnizor]
- Incidente de securitate: [DE COMPLETAT: registru]
- Cereri ale persoanelor vizate: candidații, în `candidate_requests` (vizibile în Setări); utilizatorii Nyra, prin privacy@joben.eu [DE COMPLETAT: registru intern]
