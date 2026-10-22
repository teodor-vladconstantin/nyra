# Politica de confidențialitate Nyra (pentru utilizatorii Nyra)

> **Versiune:** 0.1 (ciornă) | **În vigoare de la:** [DE COMPLETAT la lansare] | **Ultima actualizare:** 22 octombrie 2026
> **Operator:** TETA ABC SRL, CUI 22404824, Reg. Com. J2007001135104, Str. Centrală nr. 169, sat Mărăcineni, jud. Buzău, cod poștal 127325, România
> **Contact:** hello@joben.eu | **Protecția datelor:** privacy@joben.eu

## 1. Despre ce este acest document

Politica explică ce date personale prelucrează Nyra despre **tine, ca recrutor sau utilizator al aplicației, și despre persoanele care ne scriu de pe site**. Pentru aceste date, TETA ABC SRL este **operator**.

Datele **candidaților** pe care Clienții le încarcă în Nyra sunt prelucrate de noi ca **împuternicit**, în numele Clientului. Despre ele vezi Acordul de prelucrare a datelor (DPA). Un candidat care vrea să-și exercite drepturile trebuie să se adreseze mai întâi companiei la care a aplicat; noi o ajutăm să răspundă.

TETA ABC SRL nu a desemnat un responsabil cu protecția datelor (DPO). Punctul de contact pentru protecția datelor este privacy@joben.eu. [DE VERIFICAT DE AVOCAT: dacă desemnarea unui DPO este obligatorie.]

## 2. Ce date prelucrăm, de ce și pe ce temei

| Categorie | Date | Scop | Temei (GDPR) |
|---|---|---|---|
| Cont | Adresa de email, date de autentificare (parolă sub formă de hash, coduri de verificare), identificator de utilizator | Crearea și securizarea contului, autentificare | Art. 6(1)(b), executarea contractului |
| Organizație și acces | Numele organizației, rolul (Administrator sau Viewer), data creării | Separarea datelor între organizații și drepturile de acces | Art. 6(1)(b) |
| Activitate în aplicație | Identificatorul tău ca autor al notelor și scorecard-urilor, filtre salvate, starea turului de prezentare | Funcționarea aplicației | Art. 6(1)(b) |
| Jurnal de activitate | Identificatorul utilizatorului, acțiunea, tipul obiectului, momentul (fără conținut personal al candidaților) | Securitate, trasabilitate, apărarea drepturilor | Art. 6(1)(f), interes legitim |
| Securitate la înregistrare | Semnale anti-abuz (Cloudflare Turnstile, Clerk Protect) | Prevenirea conturilor false | Art. 6(1)(f) |
| Date tehnice | Adresă IP, tip de browser, moment și rută a cererii, în loguri | Funcționare, securitate, depanare | Art. 6(1)(f) |
| Formulare de pe site | Nume, email, mesaj (formular de contact, listă de așteptare) | Să îți răspundem sau să te anunțăm când planurile sunt gata | Art. 6(1)(f), interes legitim; pentru lista de așteptare, art. 6(1)(a), consimțământ |
| Statistici și erori | Planificat, nu este activ încă (PostHog, Sentry) | Îmbunătățirea produsului, remedierea erorilor | Art. 6(1)(a) pentru statistici (consimțământ); art. 6(1)(f) pentru erori |

Nu luăm decizii automate cu efecte juridice asupra ta ca utilizator.

Nu ai obligația legală de a ne furniza datele de cont, dar fără ele nu putem crea contul.

## 3. De unde vin datele

De la tine, direct (cont, formulare), din aplicație (activitate) și de la Clerk (autentificare). Datele tehnice vin automat din browser.

## 4. Cui le dăm (destinatari)

Dăm datele doar furnizorilor necesari (subprocesatori) și autorităților, când legea ne obligă. Lista actuală, cu țări și mecanisme de transfer, e pe pagina **Subprocesatori**. În prezent: Clerk (autentificare), Supabase (baza de date, regiunea UE), Vercel (găzduirea aplicației), Cloudflare (verificare anti-abuz la înregistrare) și, pentru datele candidaților, LlamaIndex și Oracle Cloud Infrastructure. Nu vindem datele și nu le folosim pentru publicitate.

## 5. Transferuri în afara SEE

Unii furnizori sunt din SUA sau aparțin unor grupuri din SUA (Clerk, Vercel, Cloudflare, LlamaIndex). Transferurile se bazează pe Cadrul de confidențialitate UE-SUA (EU-US Data Privacy Framework), acolo unde furnizorul e certificat, și pe clauze contractuale standard (Decizia (UE) 2021/914), cu măsuri suplimentare unde e cazul. Detalii pe pagina Subprocesatori. [DE VERIFICAT: certificarea fiecărui furnizor pe dataprivacyframework.gov și existența DPA și SCC semnate.] Baza noastră de date este în Irlanda (Supabase, eu-west-1).

## 6. Cât timp păstrăm datele

| Date | Termen |
|---|---|
| Cont și date de organizație | Cât timp contul este activ, plus 30 de zile după ștergere. |
| Notele și scorecard-urile | Cât timp organizația există, sub controlul organizației. |
| Mesaje din formulare (contact, listă de așteptare) | 12 luni de la ultimul contact. [DE COMPLETAT: implementarea ștergerii automate.] |
| Jurnal de activitate | [DE COMPLETAT: termen; jurnalul conține identificatorul utilizatorului și nu poate fi modificat. DE VERIFICAT DE AVOCAT.] |
| Loguri tehnice la furnizori | Conform setărilor lor. [DE COMPLETAT: Vercel și Oracle, după verificare.] |
| Copii de rezervă | Expiră automat la furnizor. [DE COMPLETAT: după verificarea planului Supabase.] |

## 7. Cookie-uri

Folosim cookie-urile și stocarea locală descrise în Politica de cookies. Cele strict necesare funcționează fără acord; cele opționale doar cu acordul tău.

## 8. Drepturile tale

Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție (pentru prelucrările bazate pe interes legitim), plus dreptul de a-ți retrage consimțământul oricând, fără să afecteze legalitatea prelucrării anterioare. Scrie la privacy@joben.eu; răspundem în cel mult o lună. Ștergerea contului se face la cerere, prin email, până la implementarea unui buton în aplicație. [DE COMPLETAT]

Ai dreptul să depui plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP): dataprotection.ro, Bd. G-ral. Gheorghe Magheru nr. 28-30, sector 1, București. [DE VERIFICAT: adresa curentă.]

## 9. Securitate

Aplicăm măsuri tehnice și organizatorice: transmitere criptată (HTTPS cu HSTS), separare a datelor pe organizații la nivel de bază de date, fișiere private cu linkuri temporare, roluri de acces, jurnal de activitate. Nicio măsură nu elimină complet riscul. Un incident care te afectează ți se comunică conform legii.

## 10. Modificări

Dacă modificăm politica, publicăm noua versiune cu data intrării în vigoare și te anunțăm în aplicație la modificările importante.
