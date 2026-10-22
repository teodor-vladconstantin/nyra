# Data Processing Agreement (DPA, Art. 28 GDPR)

> **Version:** 0.1 (draft) | **Effective from:** [TO BE COMPLETED at launch] | **Last updated:** 22 October 2026
> **Processor (Nyra):** TETA ABC SRL, CUI 22404824, Trade Register no. J2007001135104, Str. Centrală no. 169, Mărăcineni village, Buzău county, postal code 127325, Romania | **Contact:** hello@joben.eu | **Data protection:** privacy@joben.eu
> **Controller (the Customer):** the organisation that accepts this agreement when creating the account. Its details are those in the account. [TO BE COMPLETED: Customer identification fields in the application.]
>
> Courtesy translation. The Romanian version prevails.

This agreement is part of the Nyra Terms of Use. It is accepted by the User who creates the organisation (the Administrator), who declares that they have authority to bind the Customer. Acceptance is recorded with the user, date, time and version. [TO BE COMPLETED: technical mechanism; TO BE VERIFIED BY LAWYER: validity of electronic acceptance by a person whose mandate is not verified.]

## 1. Subject matter and roles

1.1. The Customer is the controller of the personal data of candidates it uploads or who apply through the Customer's public pages. Nyra processes it as processor, on the Customer's behalf, to provide the Service.

1.3. If the Customer is an independent recruiter who processes candidates' data on behalf of a company that mandated them, the Customer is that company's processor and Nyra is the Customer's **sub-processor**, with the same obligations. The Customer is responsible for having the company's authorisation and for passing on its instructions. [TO BE VERIFIED BY LAWYER.]

1.2. For User account data and website form data, Nyra is the controller, as per the Privacy Policy. This agreement does not cover them.

## 2. Description of processing (Annex 1)

| Item | Description |
|---|---|
| Purpose | Providing the Service: storing CVs, automatic data extraction, search, matching with jobs, status tracking, notes, export, deletion. |
| Nature of processing | Collection (upload, CSV import, public form), storage, structuring, extraction of text and data, similarity calculation, display, export, deletion. |
| Categories of data subjects | Candidates, referees mentioned in CVs (incidentally), the Customer's Users (in the notes and evaluations they create). |
| Categories of data | Name, email, phone, location, CV (original file and PDF preview), extracted text, skills, experience, education, years of experience, seniority level, similarity vector (computed), the Customer's notes and scorecards, status, application source, consent timestamp (for the public form). Special category data may appear in CV content (see 5.3). |
| Duration | While the Customer has an account, within the retention period set by the Customer. Default [TO BE COMPLETED: 12 months from last activity, to be implemented]. |

## 3. Nyra's obligations

3.1. **Instructions.** We process data only on the Customer's documented instructions: this agreement, the Terms and the Customer's actions in the application. If an instruction infringes the law, we inform you.

3.2. **No own purposes.** We do not use candidates' data for our own purposes, do not sell it, do not combine it between organisations and do not use it to train our own or third-party models. For extraction subprocessors, see Annex 3 and 3.9.

3.3. **Confidentiality.** Persons authorised at Nyra are bound by confidentiality. [TO BE COMPLETED: clauses in collaborators' contracts.]

3.4. **Security.** We apply the measures in Annex 2.

3.5. **Sub-processors.** The Customer gives general authorisation for the subprocessors in Annex 3. We publish any addition or replacement on the Subprocessors page and announce it in the application at least [TO BE COMPLETED: 30] days beforehand. The Customer may object on reasonable grounds within that period; if we cannot find a solution, it may terminate the contract and ask for deletion of the data. We impose equivalent obligations on subprocessors and remain liable to the Customer for them. [TO BE COMPLETED: notification mechanism; TO BE VERIFIED: existence of a DPA with each subprocessor.]

3.6. **Data subject rights.** If a person asks us directly to exercise rights regarding candidates' data, we redirect them to the Customer within at most 5 working days. We assist the Customer through features in the application: export of a candidate's data, deletion, rectification of extracted data. [TO BE COMPLETED: restriction and portability, if dedicated features exist.]

3.7. **Security breaches.** We notify you without undue delay, where possible within at most 48 hours of becoming aware, and give you the information needed to notify ANSPDCP and the individuals. [TO BE COMPLETED: internal confirmation that the deadline is feasible.]

3.8. **Assistance.** We help the Customer, to a reasonable extent, with the impact assessment (DPIA), consultations with the authority and requirements for AI recruitment systems. On request we provide information about how matching works (keywords and semantic similarity) and the data the Customer needs to inform candidates. [TO BE VERIFIED BY LAWYER: Art. 26 AI Act obligations, applicable from 2 December 2027.]

3.9. **Supplier guarantees.** LlamaIndex states that it has "zero data retention" and no-training agreements with its model providers, according to its public documentation. We have not independently verified these statements. [TO BE VERIFIED: with LlamaIndex, through the DPA.]

3.10. **Deletion and return.** On termination or at the Customer's request, we export the data in a structured format and delete it within at most 30 days. Backup copies expire automatically at suppliers. [TO BE COMPLETED: backup duration.]

3.11. **Audit.** We make available the information needed to demonstrate compliance and allow reasonable verifications, announced [TO BE COMPLETED: 30] days in advance, during working hours, without affecting other customers' data, at the Customer's expense.

3.12. **Records.** We keep a record of processing as a processor, under Art. 30(2) GDPR.

## 4. International transfers

4.1. Data is stored in the EU (Supabase, Ireland). Processing assisted by the parser runs in the EU (Oracle Cloud Infrastructure, Amsterdam, [TO BE VERIFIED: confirmation of the VM's region]).

4.2. Some subprocessors are in the USA (Annex 3). Transfers rely on the EU-US Data Privacy Framework (adequacy decision of 10 July 2023), where the supplier is certified, and, as a fallback and where it is not certified, on standard contractual clauses (Decision (EU) 2021/914, module 3 between Nyra and the subprocessor). If the adequacy decision is invalidated or suspended, we will use standard contractual clauses and supplementary measures, or stop the transfer. Case C-703/25 P is pending. [TO BE VERIFIED BY LAWYER.]

4.3. CV data sent to LlamaCloud currently goes to the US endpoint. [TO BE COMPLETED: replace with "EU (Frankfurt)" after migrating to the EU endpoint.]

## 5. Customer's obligations

5.1. The Customer has a legal basis for processing and informs candidates under Articles 13 and 14 GDPR. We provide a template notice.

5.2. The Customer observes the storage limitation principle and sets a retention period in the application.

5.3. The Customer does not deliberately upload special category data (Art. 9) or criminal data. CVs may contain such data incidentally; the Service does not identify it separately. The Customer decides the basis and measures for it.

5.4. The Customer keeps real human oversight of matching results and takes no solely automated decisions with legal or similarly significant effects. The Customer does not use the Service for decisions about people already employed.

5.5. The Customer is responsible for its Users and Administrators.

## 6. Liability

Each party's liability is subject to the limitations in the Terms, with the exceptions provided by law. [TO BE VERIFIED BY LAWYER: link with Art. 82 GDPR and recourse between controller and processor.]

## 7. Duration and termination

The agreement remains in force as long as Nyra processes the Customer's data. Confidentiality and deletion obligations survive termination.

## 8. Governing law

Romanian law, with the application of the GDPR. Court: as per the Terms.

---

## Annex 2. Technical and organisational measures

We describe only measures that exist in the product. We do not claim certifications.

- **Logical isolation by organisation:** row-level security (RLS) rules in the database, on every table; queries are explicitly filtered by organisation.
- **Roles:** Administrator (write, delete, export) and Viewer (read).
- **Authentication:** through Clerk, with email verification; sessions with a signed token. [TO BE COMPLETED: MFA, if enabled in Clerk.]
- **Files:** private bucket; access through signed links valid for 15 minutes; files in separate folders per organisation.
- **Transport:** HTTPS with HSTS; security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- **Extraction service:** access protected by a shared secret token; neutral file names sent to LlamaCloud (random identifiers, not the original name).
- **Activity log:** changes are recorded without candidates' personal content (personal fields appear only as "redacted"); the log cannot be modified from the application.
- **Deletion:** permanent deletion of the candidate, their files and derived data; automatic deletion when the set period expires. [TO BE COMPLETED: automation, being implemented.]
- **Abuse protection:** honeypot field and a cap on applications on the public form.
- **Automated tests** of access rules and of deletion and export flows, during development.
- **We do not claim:** tested backups, redundancy, certifications (ISO 27001, SOC 2) or penetration tests, as long as they are not in place. [TO BE COMPLETED after commercial launch.]

## Annex 3. Subprocessors

See the **Subprocessors** page (nyra.joben.eu/subprocessors), an integral part of this agreement, in the version in force on the date of acceptance.
