# CareLoop Platform Scope, Assumptions, and Known Limitations

## 1. Prototype Demonstration Boundaries

CareLoop was engineered specifically as an innovation submission for the **Future Health Digital Innovation Challenge (Abu Dhabi)**. While designed according to enterprise healthcare interoperability standards (FHIR R4, SNOMED CT, LOINC) and Department of Health clinical guidelines, the current release has clear operational boundaries:

1. **Synthetic Data Exclusivity**:
   - Every patient identifier, medical history, screening date, and contact detail within this repository is **100% SYNTHETIC**, generated programmatically with fixed pseudorandom seeds.
   - Zero real patient health information (PHI) was accessed, processed, or stored.
2. **Regulatory Notice**:
   - CareLoop is a proof-of-concept software prototype and **has not been submitted, reviewed, or cleared** by the UAE Ministry of Health and Prevention (MOHAP), the Department of Health (DoH) Abu Dhabi, the US FDA, or the European Medicines Agency (EMA) as a certified Medical Device (Software as a Medical Device - SaMD).
   - It is not licensed for direct patient diagnosis, automated prescription, or unassisted clinical triage.
3. **Electronic Health Exchange (HIE) Boundaries**:
   - Integration with centralized health information exchanges (such as Malaffi in Abu Dhabi or Nabidh in Dubai) is modeled via simulated RESTful FHIR R4 endpoints (`/api/fhir/r4/ServiceRequest`, `Task`, `Appointment`, `Communication`). Direct production HL7 FHIR connections with Malaffi production gateways require bilateral trust agreements, certificate exchange, and enterprise VPN tunnels not present in this standalone repository.
4. **Telecommunication Gateways**:
   - The multi-channel outreach engine models SMS, WhatsApp Business API, and telephony voice routing via mock local queues and simulated delivery events. Production deployment requires credentialing with accredited telecom aggregators (e.g., Twilio, Infobip, or UAE-licensed telecom providers).
5. **AI Inference Implementation**:
   - In accordance with Challenge security and offline reproducibility guidelines, generative AI capabilities utilize the local deterministic `MockAiProvider`. Production enablement of fine-tuned clinical LLMs (e.g. Med-PaLM 2 / Gemini Health) requires enterprise Vertex AI private VPC peering and data sovereignty compliance with UAE Federal Decree-Law No. 45/2021 on Personal Data Protection.
