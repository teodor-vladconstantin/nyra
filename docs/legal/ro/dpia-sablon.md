# Șablon DPIA pentru recrutarea asistată de Nyra (art. 35 GDPR)

> **Versiune:** 0.1 (șablon) | **Ultima actualizare:** 22 octombrie 2026 | **Pentru:** operatorul de date (recrutorul) și, ca model, TETA ABC SRL
> Acest șablon este preumplut cu fluxurile reale din Nyra. Câmpurile {{...}} le completează operatorul. Concluziile finale revin operatorului. [DE VERIFICAT DE AVOCAT: dacă DPIA e obligatorie, după lista ANSPDCP din Decizia 174/2018.]

## 1. Descrierea prelucrării

- **Operator:** {{companie}}. **Împuternicit:** TETA ABC SRL (Nyra).
- **Scop:** recrutarea: primirea candidaturilor, extragerea datelor din CV, căutare, potrivire cu postul, evaluare și urmărirea statusului.
- **Categorii de date:** vezi DPA, Anexa 1. Posibil date speciale în CV-uri.
- **Fluxul:** CV încărcat de recrutor sau trimis prin formular public → stocat în Supabase (Irlanda) → procesat de serviciul de extragere (Oracle, Amsterdam) cu LlamaCloud ({{SUA sau UE}}) → date structurate și vector de potrivire → recrutorul caută, filtrează și vede potrivirea cu jobul → recrutorul decide manual statusul → ștergere la expirarea termenului sau la cerere.
- **Prelucrare automată:** extragere de date (AI) și calcul de potrivire (cuvinte-cheie și similaritate semantică). Nu există respingere automată.
- **Termen de păstrare:** {{ex. 12 luni}}.
- **Destinatari și subprocesatori:** vezi pagina Subprocesatori.

## 2. Necesitate și proporționalitate

| Întrebare | Răspuns |
|---|---|
| Temei | {{art. 6(1)(b) / (f) / (a)}} |
| Scop determinat și legitim? | {{da, recrutare}} |
| Date minime? | Instrumentul extrage tot CV-ul; operatorul decide ce cere candidaților. {{măsuri: ex. instrucțiuni "fără fotografie, CNP, stare civilă"}} |
| Informarea candidaților | Notă art. 13/14, cu mențiune despre procesarea automată. |
| Drepturile persoanelor | Acces (export JSON per candidat), ștergere (ștergere definitivă), rectificare (editare manuală), opoziție, intervenție umană. |
| Transferuri | Vezi Subprocesatori. |

## 3. Riscuri pentru persoanele vizate

| Risc | Sursa | Probabilitate | Gravitate | Măsuri existente | Măsuri suplimentare ale operatorului |
|---|---|---|---|---|---|
| Discriminare indirectă prin ordonarea după similaritate (textul CV-ului poate reflecta vârstă, gen, naționalitate) | Calculul de potrivire pe textul integral | {{}} | Mare | Scorul este orientativ; nu respinge; recrutorul decide | Revizuire umană reală; verificare periodică a rezultatelor; nu ordonați doar pe scor |
| Date extrase greșit sau incomplet | AI de extragere | {{}} | Mediu | Marcaj "necesită verificare"; editare manuală protejată la re-parsare | Verificarea CV-urilor marcate |
| Acces neautorizat la CV-uri | Cont compromis, acces în exces | {{}} | Mare | Izolare pe organizații, roluri, linkuri temporare | Parole puternice, retragerea accesului la plecarea unui coleg |
| Păstrare prea lungă | Retenție nelimitată | {{}} | Mediu | Termen configurabil, ștergere | Setați termenul; ștergeți la închiderea procesului |
| Transfer către SUA | Subprocesatori | {{}} | Mediu | DPF/SCC; stocare principală în UE | {{}} |
| Date speciale prelucrate fără temei | Conținut CV | {{}} | Mare | Interdicție contractuală de încărcare deliberată | Instrucțiuni pentru candidați |
| Decizie exclusiv automată de facto | Încrederea oarbă în scor | {{}} | Mare | Interfața precizează că scorul nu respinge | Proces intern cu motivare a respingerii |

## 4. Măsuri

Tehnice (Anexa 2 din DPA) și organizatorice ale operatorului: {{politică de acces, instruire, procedură de răspuns la cereri, termene, registru}}.

## 5. Concluzie

Risc rezidual: {{scăzut / mediu / ridicat}}. Dacă este ridicat, consultare prealabilă cu ANSPDCP (art. 36). Responsabil: {{}}. Data: {{}}. Revizuire la: {{}}.
