# Comparație cu alte ATS-uri și procesatoare de CV-uri (22 octombrie 2026)

**Limită.** Am citit pagini de ajutor și de produs (rezumate de căutare), nu termenii și condițiile complete ale acestor furnizori; nu le-am putut încărca. Concluziile privesc **funcțiile de conformitate** și ce declară public, nu formulările contractuale. Pentru formulări, cere de la fiecare DPA-ul lor.

## Ce fac ceilalți

| Furnizor | Ce am găsit | Sursă |
|---|---|---|
| **Teamtailor** | Ștergere automată pe reguli (acord lipsă sau expirat, aplicații respinse, inactivitate), cu **o săptămână de grație** după marcare; perioade stabilite de client, fără valoare implicită; reînnoirea acordului candidatului (opt-in sau opt-out); reguli per țară; fără undo după ștergere. Recomandă consultarea juridică. | https://www.teamtailor.com/en/productnews/automatic-candidate-deletion/ |
| **Workable** | Pachet GDPR activabil dintr-o setare: ștergere la cerere, constructor de notă de confidențialitate, acordul candidatului la notă, automatizarea retenției. Candidatul poate **retrage și șterge datele din emailul de confirmare**. Profilurile "sourced" se șterg automat dacă nu primesc linkul de consimțământ în 30 de zile. | https://help.workable.com/hc/en-us/articles/360041472254 |
| **Greenhouse** | Reguli de retenție configurabile per birou (perioadă, ce date, notificări); ștergere în masă la expirare; proces "right to be forgotten" configurabil; candidații care nu răspund la emailul de prelungire sunt puși la ștergere. | https://support.greenhouse.io/hc/en-us/articles/360061849112-GDPR-features-overview |
| **Recruitee** | Cereri automate de consimțământ pentru prelungirea retenției; ștergere automată a candidaților fără consimțământ sau care au cerut ștergerea. | https://support.recruitee.com/articles/4728999 |
| **RChilli** (parser) | Declară că nu stochează persistent CV-urile trimise la parser (procesare tranzacțională); datele din funcția de căutare se indexează temporar într-un mediu regional și se pot șterge prin API; DPA la cerere; certificări ISO 27001 și SOC 2 Type 2 declarate. | https://help.rchilli.com/hc/en-us/articles/60147441063577 |
| **Affinda, Textkernel/Sovren** | Nu am găsit informații publice utilizabile despre retenție sau DPA în căutările făcute. | (negăsit) |

## Ce am adoptat în Nyra (implementat)

1. **Retenție automată, implicită** (12 luni), nu "la alegere" fără valoare: ștergere zilnică, plafon 24 de luni.
2. **Notă de confidențialitate generată per organizație**, hostată de Nyra pe pagina de aplicare, înlocuibilă cu propriul link (ca "privacy notice builder" Workable).
3. **Cereri ale candidaților** (acces, ștergere, rectificare, retragerea acordului) printr-un formular pe pagina de informare, vizibile recrutorului în Setări (Workable oferă retragerea din emailul de confirmare; Nyra nu trimite emailuri).
4. **Ștergere definitivă la cerere**, cu fișierele (există din Faza 1), plus **ștergerea contului**.
5. **Minimizare la furnizorul de extragere**: după procesare ștergem jobul și fișierul de la LlamaCloud, nu așteptăm cele 48 de ore (similar abordării RChilli de procesare tranzacțională, dar prin ștergere explicită).
6. **Informare despre ce urmează să se șteargă**: Setări arată câți candidați expiră în 30 de zile (Teamtailor folosește o săptămână de grație).

## Ce nu am adoptat și de ce

- **Reînnoirea acordului prin email** (Teamtailor, Greenhouse, Recruitee): Nyra nu trimite emailuri candidaților. Se poate adăuga odată cu Resend.
- **Grație de o săptămână înainte de ștergere**: nu am implementat. Ștergerea e zilnică, iar Setări arată cele ce expiră în 30 de zile. Recrutorul poate prelungi retenția înainte.
- **Reguli per țară / per birou**: Nyra e single-tenant per recrutor deocamdată.
- **Certificări (ISO 27001, SOC 2)**: nu le avem și nu le declarăm. Documentele spun explicit asta (DPA, Anexa 2).
- **Constructor de notă cu text complet editabil**: nota Nyra e un model fix cu câmpuri; compania poate trimite propriul link.
