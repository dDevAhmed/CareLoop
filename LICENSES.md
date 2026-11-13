# Third-Party Dependencies and Licences

This document enumerates third-party open-source libraries, frameworks, standard terminologies, and clinical coding systems utilised in the **CareLoop** prototype for the Future Health Digital Innovation Challenge (Abu Dhabi).

---

## 1. Software Packages & Frameworks

| Package | Purpose | Licence | Repository / Source |
|---|---|---|---|
| `next` | React application framework (App Router) | MIT Licence | https://github.com/vercel/next.js |
| `react` & `react-dom` | User interface rendering engine | MIT Licence | https://github.com/facebook/react |
| `typescript` | Static type checking and compiler | Apache-2.0 | https://github.com/microsoft/TypeScript |
| `@prisma/client` & `prisma` | Database ORM, migrations & schema management | Apache-2.0 | https://github.com/prisma/prisma |
| `tailwindcss` | Utility-first CSS styling framework | MIT Licence | https://github.com/tailwindlabs/tailwindcss |
| `postcss` & `autoprefixer` | CSS transformations and vendor prefixing | MIT Licence | https://github.com/postcss/postcss |
| `vitest` | Unit testing framework | MIT Licence | https://github.com/vitest-dev/vitest |
| `lucide-react` | Icon library for healthcare dashboards | ISC Licence | https://github.com/lucide-icons/lucide |
| `clsx` & `tailwind-merge` | Conditional CSS class merging utilities | MIT Licence | https://github.com/lukeed/clsx |

---

## 2. Clinical Terminology & Code Systems Notice

### Notice Regarding SNOMED CT®
- **Owner**: SNOMED International (International Health Terminology Standards Development Organisation - IHTSDO).
- **Licence Terms**: SNOMED CT is proprietary terminology. Use within member countries (including the United Arab Emirates under national membership) is governed by the national affiliate licence. Commercial distribution or clinical production deployments outside licensed jurisdictions require explicit licensing from SNOMED International.
- **CareLoop Phase 1 Implementation**: **Illustrative Placeholder Subset Only**. CareLoop stores SNOMED CT codes in placeholder fields (e.g., `snomedCode`, `codingSystem = "http://snomed.info/sct"`). Only standard exemplary concept codes are referenced for demonstration purposes (e.g., `73761001` for Colonoscopy, `24606000` for Screening mammography). Full clinical code sets, hierarchies, and reference sets require official affiliate licensing.

### Notice Regarding LOINC®
- **Owner**: Regenstrief Institute, Inc.
- **Licence Terms**: LOINC (Logical Observation Identifiers Names and Codes) is copyright © Regenstrief Institute, Inc. and is available at no cost under the LOINC Terms of Use (permitting non-exclusive, worldwide, royalty-free use subject to attribution and non-alteration of concept definitions).
- **CareLoop Phase 1 Implementation**: **Illustrative Subset Only**. CareLoop utilises standard reference codes (e.g., `14563-1` for Fecal occult blood by immunoassay [FIT], `24604-5` for Mammography screening). Complete clinical laboratory catalogues require validation against current LOINC releases.

### Notice Regarding HL7® FHIR® R4
- **Owner**: Health Level Seven International (HL7).
- **Licence Terms**: FHIR® is the registered trademark of HL7 and is published under the Creative Commons "No Rights Reserved" (CC0) 1.0 Universal public domain dedication. CareLoop implements FHIR R4-compatible JSON representations for `ServiceRequest`, `Task`, `Appointment`, and `Communication` resources.

---

## 3. Regulatory Disclaimer
CareLoop is a challenge prototype. It has not been reviewed, cleared, or approved by the UAE Ministry of Health and Prevention (MOHAP), the Department of Health – Abu Dhabi (DoH), the US Food and Drug Administration (FDA), or any other medical device regulatory authority. It does not provide medical diagnosis or autonomous clinical decision-making. All AI recommendations are held in a human approval queue prior to clinical action.

