# Procedură internă: incidente de securitate cu date personale

> Document intern, nepublic. **Versiune:** 0.1 | **Ultima actualizare:** 22 octombrie 2026 | **Responsabil:** [DE COMPLETAT]
> Legătură: DPA 3.7 (anunțăm Clientul fără întârzieri nejustificate, în măsura posibilului în 48 de ore) și art. 33 GDPR (notificare ANSPDCP în 72 de ore, ca operator).

## 1. Ce e un incident
Orice eveniment care duce la distrugerea, pierderea, modificarea, dezvăluirea sau accesul neautorizat la date personale: cont compromis, acces între organizații, CV-uri expuse prin link semnat, scurgere de chei (Supabase service role, `PARSER_TOKEN`, `CRON_SECRET`, cheia LlamaCloud, Clerk), mesaj trimis greșit, ștergere accidentală.

## 2. Pași
1. **Oprește.** Rotește cheia sau secretul afectat; dezactivează contul; scoate pagina publică din uz (`public_apply` pe job). Notează ora la care ai aflat.
2. **Evaluează.** Ce date, câte persoane, care organizații, interval de timp, dacă datele erau citibile. Jurnalul de activitate (`audit_log`) arată acțiunile utilizatorilor, fără conținut personal; loguri Vercel și ale parserului.
3. **Anunță Clientul (operatorul)** în cel mult 48 de ore de la aflare, cu: natura incidentului, categorii de date și de persoane, număr aproximativ, consecințe probabile, măsuri luate, contact.
4. **Notificări obligatorii ale operatorului.** Clientul decide notificarea ANSPDCP (72 de ore) și a persoanelor, dacă riscul e ridicat. Pentru datele în care Nyra e operator (conturi, formulare), decide și notifică Nyra.
5. **Remediază și documentează** în registru (mai jos). Revizuiește ce a permis incidentul.

## 3. Registru de incidente
| Data aflării | Descriere | Date și persoane afectate | Organizații | Măsuri | Notificări (cine, când) | Închis |
|---|---|---|---|---|---|---|
| [DE COMPLETAT] | | | | | | |

## 4. Contacte
ANSPDCP: dataprotection.ro [DE VERIFICAT: formularul și adresa curentă de notificare]. Furnizori: Supabase, Vercel, Clerk, LlamaIndex (support@runllama.ai), Oracle.
