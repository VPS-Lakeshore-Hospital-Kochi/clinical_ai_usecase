import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: insurance desk. The app calculates room-rent deductions live; Claude checks
// policy clauses and drafts the medical-necessity letter, checklist and query responses.
export default {
  instructions: `Prepare the cashless pre-authorisation packet as JSON for the insurance desk. The app calculates the room-rent proportionate deduction and patient share for the room the family chooses (listed); do not recalculate it. Be strictly factual: never overstate severity, upcode or omit history.
- verdict: ready or needs fixes, with the top risks to approval or out-of-pocket cost.
- coverage: each relevant policy clause, what it says, how it applies here, and the risk.
- letter: a one-page medical-necessity letter to the TPA medical officer (diagnosis with ICD-10 and how it was established with dates, MDT decision, planned procedure, stay, why inpatient care is needed).
- documents: the attachments needed. queries: likely TPA queries with prepared responses.
- family: plain English, under 120 words, using the app's patient-share figure.`,
  schema: obj({
    verdict: obj({ status: oneOf(["Ready to submit", "Submit after fixes"]), risks: list(str()) }),
    coverage: list(obj({ clause: str(), says: str(), thisCase: str(), risk: oneOf(["ok", "check", "fail"]) })),
    letter: str(),
    documents: list(str()),
    queries: list(obj({ query: str(), response: str() })),
    family: str(),
  }),
  toText(payload) {
    return `${payload.request || ""}\n\nFamily's room choice: ${payload.room}. App estimate: total ₹${payload.total}, expected payable ₹${payload.payable}, patient share ₹${payload.patientShare} (room cap based on ${payload.capBasis}).`;
  },
  demo: {
    verdict: {
      status: "Submit after fixes",
      risks: [
        "Room category: a room above the ₹10,000/day cap triggers a proportionate deduction across associated charges. The family should decide before submission.",
        "Staplers and energy device (₹72,000): confirm the TPA classes them as devices (payable), not excluded consumables. Attach the invoice with product details.",
        "Attach the MDT note and cardiology clearance to pre-empt queries.",
      ],
    },
    coverage: [
      { clause: "4.2 Pre-existing disease", says: "Covered after 36 months", thisCase: "Cover since March 2020 (about 77 months); diabetes and hypertension declared; cancer is a new diagnosis (July 2026)", risk: "ok" },
      { clause: "4.3 Specific waiting period", says: "24 months for listed procedures", thisCase: "Colectomy not listed; waiting period long served", risk: "ok" },
      { clause: "5.6 Modern treatment sub-limit", says: "Robotic surgery capped at 50% of sum insured", thisCase: "Laparoscopic, not robotic: the sub-limit should not apply. State this explicitly", risk: "ok" },
      { clause: "5.1 Room rent", says: "1% of sum insured per day (normal), 2% (ICU/HDU); proportionate deduction above the cap", thisCase: "Depends on the room chosen; HDU ₹18,000 is within the ₹20,000 cap. Confirm whether the cumulative bonus counts toward the cap", risk: "check" },
      { clause: "7.1 Non-medical consumables", says: "Annexure II items excluded", thisCase: "₹9,000 listed", risk: "fail" },
      { clause: "3.4 Pre-hospitalisation (30 days)", says: "Same-condition expenses from 19 Jul", thisCase: "Colonoscopy and biopsy (29–31 Jul), CT (1 Aug), IV iron (6 Aug), cardiology (8–11 Aug): claim separately with bills", risk: "ok" },
      { clause: "3.4 Post-hospitalisation (60 days)", says: "After discharge", thisCase: "Follow-up visits and medicines. Chemotherapy is usually a separate day-care claim: plan a separate pre-auth", risk: "ok" },
    ],
    letter: "To: The Medical Officer, TPA, on behalf of Kerala Shield Health Insurance\nRe: Cashless pre-authorisation, Mr Thomas Varghese, 58, Policy no. [__], MRN LH-SYN-000158\n\nMr Varghese presented with iron-deficiency anaemia (Hb 10.2 g/dL, ferritin 11 ng/mL) and unintentional weight loss. Colonoscopy on 29 July 2026 showed an ulcerated sigmoid mass. Histopathology on 31 July 2026 confirmed invasive adenocarcinoma (mismatch-repair proficient). Contrast CT of the thorax, abdomen and pelvis on 1 August 2026 staged the disease as cT3 N1 M0 with no distant metastases. Diagnosis: malignant neoplasm of the sigmoid colon (ICD-10 C18.7), clinical stage III.\n\nThe GI Multidisciplinary Tumour Board on 5 August 2026 recommended curative laparoscopic anterior resection with regional lymphadenectomy, followed by adjuvant chemotherapy, in line with NCCN guidance. Pre-operative cardiology assessment, including a dobutamine stress echocardiogram on 11 August 2026, showed no inducible ischaemia. Anaemia was treated with IV iron on 6 August 2026.\n\nWe request authorisation for admission on 18 August 2026 and laparoscopic (not robotic) anterior resection on 19 August 2026, with an expected stay of 6 days including 1 day of high-dependency care. Inpatient care is necessary for major abdominal cancer surgery under general anaesthesia, post-operative monitoring of the anastomosis, and management of insulin-treated diabetes around surgery.\n\nTreating consultant: [name, registration no.] · Date: 12 Aug 2026",
    documents: [
      "Pre-authorisation form signed by the treating doctor and patient",
      "Policy card, KYC and photo ID",
      "Colonoscopy report (29 Jul) and histopathology report (31 Jul)",
      "CT thorax, abdomen and pelvis report (1 Aug)",
      "MDT tumour board decision note (5 Aug)",
      "Cardiology note and stress echo report (8 and 11 Aug)",
      "Itemised estimate on hospital letterhead",
      "Stapler and energy device quotation with product codes",
      "Records showing diabetes and hypertension declared at inception (if requested)",
      "Room category consent signed by the family",
    ],
    queries: [
      { query: "Is this robotic surgery (clause 5.6)?", response: "No. Laparoscopic anterior resection; stated on the form and in the operative plan." },
      { query: "Is the cancer a pre-existing disease?", response: "Diagnosed in July 2026 (biopsy 31 Jul); cover has been continuous since March 2020, beyond the 36-month waiting period in any case." },
      { query: "Justify 1 day of HDU.", response: "Major abdominal surgery in a patient with insulin-treated diabetes and RCRI 2; post-operative troponin and glucose monitoring per the cardiology plan." },
      { query: "Why the staplers?", response: "A stapled colorectal anastomosis is standard for anterior resection; product details attached." },
      { query: "Room category?", response: "Signed consent acknowledging any proportionate deduction attached, or an eligible room chosen." },
    ],
    family: "Your policy covers this operation, and most of the estimate will be paid by the insurer. The room you choose matters: in a room above ₹10,000 a day, the insurer pays a smaller share of several bills, not just the room. In a room at or below ₹10,000 a day, you would pay only about ₹9,000, for items the policy never covers (such as gowns and toiletries). Please tell the insurance desk which room you prefer before we send the request. Chemotherapy later will need a separate approval, and we will help with that.",
  },
};
