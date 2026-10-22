# Nyra Subprocessors

> **Version:** 0.1 (draft) | **Effective from:** [TO BE COMPLETED at launch] | **Last updated:** 22 October 2026
> **Operator:** TETA ABC SRL, CUI 22404824, Trade Register no. J2007001135104, Str. Centrală no. 169, Mărăcineni village, Buzău county, postal code 127325, Romania | **Contact:** hello@joben.eu | **Data protection:** privacy@joben.eu
>
> Courtesy translation. The Romanian version prevails.

This page is part of the Data Processing Agreement (DPA). The list covers suppliers that process personal data on our behalf. It does not cover suppliers that do not receive personal data.

## Active now

| Supplier | Purpose | Data | Country / region | Transfer mechanism |
|---|---|---|---|---|
| **Supabase** (Supabase Inc.) | Database and file storage (CVs, previews) | All data in the application | EU, Ireland (eu-west-1) | Data in the EU. The group is from the USA, so access from outside the EU is possible: DPF/SCC [TO BE VERIFIED: signed DPA and certification] |
| **Vercel** (Vercel Inc.) | Hosting the web application and executing requests | HTTP requests, technical logs, request content (including CVs during upload) in transit | USA / global [TO BE VERIFIED: function region, the default may be the USA] | DPF or SCC [TO BE VERIFIED: certification] |
| **Clerk** (Clerk, Inc.) | Authenticating Users | Email, authentication data, sessions, anti-abuse signals | USA | DPF or SCC [TO BE VERIFIED: certification, DPA] |
| **Cloudflare** (Cloudflare, Inc.) | Anti-bot check (Turnstile) at registration | Technical browser signals | Global / USA [TO BE VERIFIED] | DPF or SCC [TO BE VERIFIED] |
| **LlamaIndex** (LlamaIndex, Inc.) | Extracting text and data from CVs (LlamaParse, LlamaExtract) | The full content of CVs sent for processing, with a random file name | EU, Frankfurt (eu-central-1), according to their documentation [TO BE VERIFIED: that calls to LlamaIndex's model providers also stay in the EU; their subprocessor list is not public] | Data in the EU. The group is from the USA, so access from outside the EU is possible: DPF/SCC, DPA [TO BE VERIFIED: on request, support@runllama.ai]. Files are cached for 48 hours, then deleted, according to their documentation. |
| **Oracle Cloud Infrastructure** (Oracle) | Hosting the extraction and matching service (compute and temporary memory) | CVs in transit, extracted text, locally computed matching vectors | EU, Amsterdam [TO BE VERIFIED: VM region] | Data in the EU. The group is from the USA: DPF/SCC [TO BE VERIFIED] |

Semantic matching is computed locally on our service (fastembed model), without sending the text to a third party.

## Planned, not yet active

| Supplier | Purpose | Country | Condition |
|---|---|---|---|
| **PostHog** (EU instance) | Product statistics | EU, with a US group | Only after the user's consent in the banner |
| **Sentry** (EU instance) | Error monitoring | EU, with a US group | Without session recording, with personal data removed; session recording only with consent |

We will move them to the table above and notify Customers before activation, under the DPA (section 3.5).

## How we announce changes

Any addition or replacement is published here with its effective date and announced in the application at least [TO BE COMPLETED: 30] days beforehand. The Customer may object on reasonable grounds. See DPA, section 3.5.

## About transfers outside the EEA

The EU-US Data Privacy Framework (adequacy decision of 10 July 2023) is in force at this date. Its challenge is pending before the Court of Justice of the EU (case C-703/25 P). As a fallback we use standard contractual clauses (Decision (EU) 2021/914). [TO BE VERIFIED BY LAWYER.]
