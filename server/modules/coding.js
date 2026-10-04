export default {
  id: "coding",
  order: 9.5,
  title: "Coding & Billing Audit",
  specialty: "Medical Records / Revenue Cycle",
  stage: "inpatient",
  date: "2026-08-25",
  summary:
    "Before the final claim is sent, compares the discharge summary and clinical record with the coded diagnoses, the itemised bill and the insurance approval. It finds under-coding, overbilling, charges in the wrong claim, and services given but never billed.",
  claudeRole: "Cross-checks documentation, codes and bill line by line and drafts the corrections. The clinical coder and billing team decide; nothing is coded that the record does not support.",
  inputLabel: "Coded record, bill & pre-auth",
  inputHint: "The coder's draft, the itemised inpatient bill and the cashless approval. Claude reads them against the full clinical record, including notes from other departments.",
  outputLabel: "Draft audit report",
  system: `Task: pre-submission clinical coding and billing audit for an insured inpatient stay in India (WHO ICD-10 as used by insurers and TPAs).

Integrity rules: recommend a code only when the clinical record documents it, and quote the supporting evidence. Never suggest upcoding or adding services that were not delivered. Report overbilling with the same priority as missed charges. Show all arithmetic in Indian number format. Produce in order:
1. "## Audit summary": 3–5 lines covering the headline findings and the net effect on the claim.
2. "## Diagnosis coding": a table of code | description | status (✅ correct / ➕ add / ✏️ amend / ❓ coder query) | supporting documentation.
3. "## Procedure description": whether the procedure wording matches the operative note and the pre-authorisation (including approach).
4. "## Billing findings": a table of line item | finding (duplicate / wrong claim / unbilled / correct) | amount (₹) | evidence | action.
5. "## Claim reconciliation": inpatient bill before and after corrections, patient-payable items, insurer-payable amount against the approved amount, and items moving to the pre- or post-hospitalisation claims.
6. "## Documentation feedback": short, specific notes for clinicians whose documentation affected coding.`,
  buildPrompt: (input) => `Audit pack:\n\n${input}`,
  defaultInput: `Inpatient stay: 18–24 Aug 2026, laparoscopic anterior resection (19 Aug). Cashless claim with Kerala Shield Health Insurance (synthetic) via TPA.
Pre-authorisation: approved 14 Aug for ₹3,85,000 (standard single room; non-medical consumables excluded).

Coder's draft (WHO ICD-10):
- C18.7 Malignant neoplasm of sigmoid colon (principal)
- E11.9 Type 2 diabetes mellitus without complications
- I10 Essential hypertension
Procedure: "Anterior resection of rectum"

Itemised inpatient bill (draft):
- Room, standard single, 5 days × ₹9,500 = ₹47,500
- HDU, 1 day = ₹18,000
- Surgeon, anaesthetist and OT charges = ₹1,65,000
- Laparoscopic stapler and energy device = ₹72,000
- Investigations = ₹31,200 (includes "stress echocardiogram ₹6,500" twice)
- Pharmacy and IV fluids = ₹44,800 (includes "ferric carboxymaltose 1 g ₹9,800")
- Non-medical consumables = ₹9,000
- Nursing and other charges = ₹15,000
- Total = ₹4,02,500

Excerpts from the record:
- Stress echo performed once, on 11 Aug (outpatient, before admission). IV ferric carboxymaltose given 6 Aug in day care (before admission).
- Anaesthesia record 19 Aug: GA + bilateral ultrasound-guided TAP blocks.
- Post-op hs-troponin sent at 24 h and 48 h (8 and 7 ng/L). Tariff ₹1,800 each. Not on the bill.
- Physiotherapy notes: 4 sessions (20–23 Aug). Tariff ₹600 each. Not on the bill.
- TAP block tariff ₹4,500. Not on the bill.
- Discharge summary diagnoses: sigmoid adenocarcinoma pT3 pN1b (2/18 nodes) M0, stage IIIB; T2DM with post-operative hyperglycaemia; iron-deficiency anaemia (chronic GI blood loss), treated; diabetic peripheral neuropathy; hypertension; right knee OA; mild post-operative ileus POD 2, resolved conservatively. Allergy: sulfonamides.
- Operative note: "Laparoscopic anterior resection with high ligation of IMA, stapled colorectal anastomosis." Pre-authorisation states "laparoscopic (not robotic)".`,
  demoOutput: `## Audit summary
- **Under-coded:** the nodal metastases (pN1b) are not coded, so the stage III disease is invisible in the claim. Documented neuropathy and iron-deficiency anaemia are also missing.
- **Overbilling found:** the stress echo is billed twice, although it was performed once, as an outpatient before admission.
- **Wrong claim:** the stress echo and IV iron were given before admission and belong in the **pre-hospitalisation claim**, not the inpatient bill.
- **Unbilled services:** TAP blocks, two post-op troponins and four physiotherapy sessions (₹10,500).
- **Net effect:** the corrected inpatient bill is **₹3,90,200**; insurer-payable is **₹3,81,200**, within the ₹3,85,000 approval. **No enhancement is needed.**

## Diagnosis coding
| Code | Description | Status | Supporting documentation |
|---|---|---|---|
| C18.7 | Malignant neoplasm of sigmoid colon | ✅ Correct (principal) | Histopathology 31 Jul and 22 Aug |
| **C77.2** | Secondary malignant neoplasm of intra-abdominal lymph nodes | ➕ **Add** | "pN1b (2/18 nodes)", resection pathology 22 Aug |
| E11.9 | T2DM without complications | ✏️ **Amend** | Neuropathy documented, so "without complications" is inaccurate |
| **E11.4** (+ G63.2) | T2DM with neurological complications (diabetic polyneuropathy) | ➕ **Replace E11.9** | "Diabetic peripheral neuropathy", discharge summary; monofilament findings 6 Jul |
| **D50.0** | Iron-deficiency anaemia secondary to blood loss (chronic) | ➕ **Add** | "Iron-deficiency anaemia (chronic GI blood loss), treated" |
| I10 | Essential hypertension | ✅ Correct | Discharge summary |
| **Z88.2** | Personal history of allergy to sulfonamides | ➕ Add | Allergy documented throughout |
| M17.1 | Unilateral primary gonarthrosis | ❓ Optional | Documented comorbidity; code only per unit policy if it affected care (mobility, physiotherapy) |
| Post-operative ileus | Post-procedural digestive disorder | ❓ **Coder query** | "Mild post-operative ileus, resolved conservatively." **Do not code as a complication unless the surgeon confirms it was more than the expected course** |

## Procedure description
- The coder's draft reads "Anterior resection of rectum", which **omits the laparoscopic approach**.
- Amend to **"Laparoscopic anterior resection (sigmoid/rectosigmoid) with high IMA ligation and stapled anastomosis"**, matching the operative note and the pre-authorisation ("laparoscopic, not robotic"). A mismatch invites a TPA query or a mistaken sub-limit review.

## Billing findings
| Line item | Finding | Amount (₹) | Evidence | Action |
|---|---|---|---|---|
| Stress echocardiogram (2nd entry) | **Duplicate** | 6,500 | Performed once, 11 Aug | **Remove** |
| Stress echocardiogram (1st entry) | **Wrong claim** (pre-admission) | 6,500 | Outpatient, 11 Aug | Move to pre-hospitalisation claim |
| Ferric carboxymaltose 1 g | **Wrong claim** (pre-admission) | 9,800 | Day care, 6 Aug | Move to pre-hospitalisation claim |
| TAP blocks (bilateral) | **Unbilled** | 4,500 | Anaesthesia record 19 Aug | Add |
| hs-Troponin × 2 (24 h, 48 h) | **Unbilled** | 3,600 | Lab results 20–21 Aug | Add |
| Physiotherapy × 4 | **Unbilled** | 2,400 | Physio notes 20–23 Aug | Add |
| Non-medical consumables | Correct; **patient-payable** | 9,000 | Policy exclusion | Collect from patient; explained at pre-auth |
| Room, HDU, OT, staplers, nursing | Correct | — | Match pre-auth and notes | None |

## Claim reconciliation
| Step | Amount (₹) |
|---|---|
| Draft inpatient bill | 4,02,500 |
| − Duplicate stress echo | − 6,500 |
| − Stress echo moved to pre-hospitalisation | − 6,500 |
| − IV iron moved to pre-hospitalisation | − 9,800 |
| + Unbilled services (4,500 + 3,600 + 2,400) | + 10,500 |
| **Corrected inpatient bill** | **3,90,200** |
| − Non-medical consumables (patient pays) | − 9,000 |
| **Insurer-payable (inpatient)** | **3,81,200** |
| Cashless approval | 3,85,000 |
| Headroom | 3,800 (no enhancement needed) |

- **Pre-hospitalisation claim** (submit with bills and reports): stress echo ₹6,500 + IV iron ₹9,800 = **₹16,300**, plus the colonoscopy, biopsy, CT and cardiology consultation bills (19 Jul – 17 Aug window).
- **Post-hospitalisation claim:** discharge medicines including the 28-day enoxaparin course, and follow-up visits within 60 days.

## Documentation feedback
- **Surgical team:** state the approach ("laparoscopic") in the procedure field of the discharge summary, not only in the operative note.
- **Surgical team:** document whether the post-operative ileus was within the expected course or a complication.
- **Endocrinology / ward doctors:** "T2DM" alone leads to E11.9. Name documented complications (neuropathy, hyperglycaemia) in the final diagnosis list.
- **Billing:** pre-admission day-care and outpatient items for the same condition should be tagged "pre-hospitalisation" at the point of charge.
`,
};
