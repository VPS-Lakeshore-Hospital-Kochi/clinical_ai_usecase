export default {
  id: "preauth",
  order: 8,
  title: "Pre-auth & TPA Packet Builder",
  specialty: "Insurance desk",
  stage: "inpatient",
  date: "2026-08-12",
  summary:
    "Checks a planned admission against the patient's policy clauses, flags deductions before they happen, and drafts the medical-necessity letter, document checklist and answers to likely TPA queries.",
  claudeRole: "Reads the policy and the chart, finds coverage risks and drafts the submission. The insurance desk and treating doctor verify before submitting.",
  inputLabel: "Admission, policy clauses & estimate",
  inputHint: "Policy wording is pasted from the insurer's document. Claude works only from what is given and flags anything it cannot confirm.",
  outputLabel: "Draft pre-authorisation packet",
  system: `Task: prepare a cashless pre-authorisation packet for a private health insurer / TPA in India.

Be strictly factual. Never overstate severity, upcode or omit relevant history: accuracy protects the patient and the hospital. Use Indian number formatting (₹1,00,000). Show your arithmetic for any deduction. Produce in order:
1. "## Readiness verdict": Ready to submit / Submit after fixes, and the top 2–3 risks to approval or to the patient's out-of-pocket cost.
2. "## Policy coverage check": a table of clause | what it says | this case | risk (✅ / ⚠️ / ❌).
3. "## Estimate & expected deductions": a table of head | estimate (₹) | expected payable (₹) | note, then the estimated patient share, and what would reduce it.
4. "## Medical necessity letter": to the TPA medical officer. Diagnosis with ICD-10, how it was established (dates), MDT decision, planned procedure, expected stay, and why inpatient care is necessary. Formal, factual, one page.
5. "## Document checklist": "- [ ]" items.
6. "## Anticipated TPA queries & prepared responses": the likely queries, each with the answer and supporting evidence.
7. "## Explaining it to the family": plain English, expected out-of-pocket amount and choices, under 120 words.`,
  buildPrompt: (input) => `Pre-authorisation request details:\n\n${input}`,
  defaultInput: `Pre-authorisation request, 12 Aug 2026. Planned admission 18 Aug 2026, surgery 19 Aug 2026.
Insurer: Kerala Shield Health Insurance (synthetic), via TPA. Individual policy, sum insured ₹10,00,000, cumulative bonus ₹2,00,000. Continuous cover since March 2020. Declared at inception: diabetes, hypertension.

Policy clauses (excerpts, synthetic):
- 3.4 Pre-hospitalisation medical expenses up to 30 days before admission, and post-hospitalisation up to 60 days after discharge, for the same condition.
- 4.2 Pre-existing diseases: covered after 36 months of continuous coverage.
- 4.3 Specific 24-month waiting period: joint replacement, cataract, hernia, benign prostatic hypertrophy (list abridged).
- 5.1 Room rent: up to 1% of sum insured per day (normal room), 2% per day for ICU/HDU. If a higher room category is occupied, associated medical expenses are payable in the same proportion, except pharmacy, consumables, implants and medical devices.
- 5.6 Modern treatments (including robotic surgery): sub-limit 50% of sum insured.
- 7.1 Non-medical consumables listed in Annexure II are excluded (consumables add-on not opted).

Clinical: Sigmoid adenocarcinoma, cT3 N1 M0 (colonoscopy 29 Jul, biopsy 31 Jul, CT 1 Aug), MDT 5 Aug: laparoscopic anterior resection then adjuvant chemotherapy. Cardiology 8 Aug; dobutamine stress echo 11 Aug negative for ischaemia, cleared. IV ferric carboxymaltose 6 Aug. ICD-10 C18.7.

Hospital estimate (Surgical Gastroenterology, laparoscopic anterior resection, 6 days including 1 day HDU):
- Room: Deluxe single ₹12,000/day × 5 days (family preference); HDU ₹18,000 × 1 day
- Surgeon, anaesthetist and OT charges: ₹1,65,000
- Laparoscopic staplers and energy device: ₹72,000
- Investigations: ₹28,000
- Pharmacy and IV fluids: ₹38,000
- Non-medical consumables (Annexure II items): ₹9,000
- Nursing and other hospital charges: ₹15,000
Total: ₹4,05,000`,
  demoOutput: `## Readiness verdict
**Submit after fixes.** The clinical case is strong and clearly covered. The main issues are the patient's costs and attachments:
1. ⚠️ **Room category**: the deluxe room at ₹12,000/day exceeds the ₹10,000/day cap, which triggers a **proportionate deduction of about ₹44,700** on top of the room difference. The family should decide on the room before submission.
2. ⚠️ **Stapler/energy device (₹72,000)**: confirm the TPA classes these as devices (payable) and not as excluded consumables. Attach the invoice with product details.
3. Attach the MDT note and cardiology clearance to pre-empt queries.

## Policy coverage check
| Clause | What it says | This case | Risk |
|---|---|---|---|
| 4.2 Pre-existing disease | Covered after 36 months | Cover since Mar 2020 (~77 months). Diabetes/HTN declared. Cancer is a new diagnosis (Jul 2026) | ✅ |
| 4.3 Specific waiting period | 24 months for listed procedures | Colectomy not listed; waiting period long served anyway | ✅ |
| 5.6 Modern treatment sub-limit | Robotic etc. capped at 50% SI | **Laparoscopic, not robotic.** Sub-limit should not apply; state this explicitly | ✅ (state in request) |
| 5.1 Room rent | 1% SI/day normal, 2% ICU/HDU | Deluxe ₹12,000 > ₹10,000 cap. HDU ₹18,000 < ₹20,000 cap | ⚠️ |
| 7.1 Non-medical consumables | Annexure II items excluded | ₹9,000 listed | ❌ Patient pays |
| 3.4 Pre-hospitalisation (30 days) | Same-condition expenses from 19 Jul | Colonoscopy/biopsy (29–31 Jul), CT (1 Aug), IV iron (6 Aug), cardiology (8–11 Aug) fall inside | ✅ Claim separately with bills |
| 3.4 Post-hospitalisation (60 days) | After discharge | Follow-up visits and medicines. **Chemotherapy is usually a separate day-care claim**: plan a separate pre-auth | ✅ |

*Room cap basis:* calculated on base sum insured (₹10,00,000). Some policies include the cumulative bonus. **Confirm with the TPA**, because if the bonus counts, the cap would be ₹12,000 and no deduction applies.

## Estimate & expected deductions
Proportion applied to associated expenses = ₹10,000 ÷ ₹12,000 = **83.3%**

| Head | Estimate (₹) | Expected payable (₹) | Note |
|---|---|---|---|
| Room (deluxe) 5 days | 60,000 | 50,000 | Capped at ₹10,000/day |
| HDU 1 day | 18,000 | 18,000 | Within ₹20,000 cap |
| Surgeon, anaesthesia, OT | 1,65,000 | 1,37,500 | × 83.3% (proportionate) |
| Staplers / energy device | 72,000 | 72,000 | Exempt from proportion; **confirm classification** |
| Investigations | 28,000 | 23,333 | × 83.3% |
| Pharmacy & IV fluids | 38,000 | 38,000 | Exempt from proportion |
| Non-medical consumables | 9,000 | 0 | Excluded (7.1) |
| Nursing & other charges | 15,000 | 12,500 | × 83.3% |
| **Total** | **4,05,000** | **3,51,333** | |

- **Estimated patient share with the deluxe room: ₹53,667** (room difference ₹10,000 + proportionate deduction ₹34,667 + consumables ₹9,000).
- **With a room at or below ₹10,000/day, the patient share falls to about ₹9,000** (consumables only).

## Medical necessity letter
To: The Medical Officer, TPA, on behalf of Kerala Shield Health Insurance
Re: Cashless pre-authorisation, Mr. Thomas Varghese, 58 M, Policy no. [__], MRN LH-SYN-000158

Mr. Varghese presented with iron-deficiency anaemia (Hb 10.2 g/dL, ferritin 11 ng/mL) and unintentional weight loss. Colonoscopy on 29 July 2026 showed an ulcerated sigmoid mass. Histopathology on 31 July 2026 confirmed invasive adenocarcinoma (mismatch-repair proficient). Contrast CT of the thorax, abdomen and pelvis on 1 August 2026 staged the disease as cT3 N1 M0 with no distant metastases. **Diagnosis: malignant neoplasm of the sigmoid colon (ICD-10 C18.7), clinical stage III.**

The GI Multidisciplinary Tumour Board on 5 August 2026 recommended curative laparoscopic anterior resection with regional lymphadenectomy, followed by adjuvant chemotherapy, in line with NCCN guidance. Pre-operative cardiology assessment, including a dobutamine stress echocardiogram on 11 August 2026, showed no inducible ischaemia. Anaemia was treated with IV iron on 6 August 2026.

We request authorisation for admission on 18 August 2026 and **laparoscopic (not robotic) anterior resection on 19 August 2026**, with an expected stay of 6 days including 1 day of high-dependency care. Inpatient care is necessary for major abdominal cancer surgery under general anaesthesia, post-operative monitoring of the anastomosis, and management of insulin-treated diabetes during the peri-operative period.

Treating consultant: [name, registration no.] · Date: 12 Aug 2026

## Document checklist
- [ ] Pre-authorisation form (signed by treating doctor and patient)
- [ ] Policy card, KYC and photo ID
- [ ] Colonoscopy report (29 Jul) and histopathology report (31 Jul)
- [ ] CT thorax/abdomen/pelvis report (1 Aug)
- [ ] MDT tumour board decision note (5 Aug)
- [ ] Cardiology note and stress echo report (8 and 11 Aug)
- [ ] Itemised estimate on hospital letterhead
- [ ] Stapler/energy device product quotation with codes
- [ ] Past records showing diabetes/HTN declared at inception (if requested)
- [ ] Room category consent signed by the patient's family

## Anticipated TPA queries & prepared responses
1. **"Is this robotic surgery (clause 5.6)?"** No. Laparoscopic anterior resection; state this on the form and in the operative plan.
2. **"Is the cancer a pre-existing disease?"** Diagnosed in July 2026 (biopsy 31 Jul); cover has been continuous since March 2020, beyond the 36-month PED waiting period in any case.
3. **"Justify 1 day of HDU."** Major abdominal surgery in a patient with insulin-treated diabetes and RCRI 2; post-op troponin and glucose monitoring per the cardiology plan.
4. **"Why the staplers?"** Stapled colorectal anastomosis is standard for anterior resection; attach product details.
5. **"Room category?"** Attach the signed consent acknowledging the proportionate deduction, or revise to an eligible room.

## Explaining it to the family
Your policy covers this operation. Most of the ₹4,05,000 estimate will be paid by the insurer. If you choose the deluxe room, the insurer pays a smaller share of several bills, so you would pay about ₹53,700. If you choose a room that costs ₹10,000 a day or less, you would pay only about ₹9,000, for items the policy never covers (such as gowns and toiletries). Please tell the insurance desk which room you prefer before we send the request. Chemotherapy later will need a separate approval, and we will help with that.
`,
};
