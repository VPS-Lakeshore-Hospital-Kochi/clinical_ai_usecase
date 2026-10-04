import { obj, str, int, list, oneOf } from "./schema.js";

// Clinician view: pre-submission coding and billing audit. The app finds duplicate and
// pre-admission bill lines, checks each code's evidence is verbatim in the record, and reconciles
// the claim against the approval live as the coder decides; Claude proposes the fixes.
export default {
  instructions: `Audit this inpatient claim before submission, as JSON (WHO ICD-10 as used by Indian insurers and TPAs). The app has found duplicate and pre-admission bill lines (listed); build on them. Recommend a code only when the record documents it, and quote the supporting text verbatim from the record excerpts (the app checks the quote). Never upcode or add services that were not delivered; report overbilling with the same priority as missed charges.
- summary: 3–5 short headline findings.
- codes: code | description | status (correct, add, amend, remove, query) | verbatim evidence quote.
- procedure: the draft wording, the suggested wording and why.
- billing: line item | finding | kind (remove, move to pre-hospitalisation, add, none) | amount in rupees | verbatim evidence | action.
- feedback: short documentation notes for clinicians.`,
  schema: obj({
    summary: list(str()),
    codes: list(obj({ code: str(), description: str(), status: oneOf(["correct", "add", "amend", "remove", "query"]), evidence: str() })),
    procedure: obj({ draft: str(), suggested: str(), why: str() }),
    billing: list(obj({ item: str(), finding: oneOf(["Duplicate", "Wrong claim", "Unbilled", "Correct"]), kind: oneOf(["remove", "move", "add", "none"]), amount: int(), evidence: str(), action: str() })),
    feedback: list(str()),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.record || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    summary: [
      "Under-coded: the nodal metastases (pN1b) are not coded, so the stage III disease is invisible in the claim; documented neuropathy and iron-deficiency anaemia are also missing.",
      "Overbilling: the stress echo is billed twice although it was performed once, as an outpatient before admission.",
      "Wrong claim: the stress echo and IV iron were given before admission and belong in the pre-hospitalisation claim.",
      "Unbilled: TAP blocks, two post-op troponins and four physiotherapy sessions (₹10,500).",
      "Net: insurer-payable ₹3,81,200, within the ₹3,85,000 approval; no enhancement needed.",
    ],
    codes: [
      { code: "C18.7", description: "Malignant neoplasm of sigmoid colon (principal)", status: "correct", evidence: "sigmoid adenocarcinoma pT3 pN1b (2/18 nodes) M0, stage IIIB" },
      { code: "C77.2", description: "Secondary malignant neoplasm of intra-abdominal lymph nodes", status: "add", evidence: "pN1b (2/18 nodes)" },
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", status: "remove", evidence: "diabetic peripheral neuropathy" },
      { code: "E11.4 + G63.2", description: "Type 2 diabetes with neurological complications (diabetic polyneuropathy)", status: "add", evidence: "diabetic peripheral neuropathy" },
      { code: "D50.0", description: "Iron-deficiency anaemia secondary to chronic blood loss", status: "add", evidence: "iron-deficiency anaemia (chronic GI blood loss), treated" },
      { code: "I10", description: "Essential hypertension", status: "correct", evidence: "hypertension" },
      { code: "Z88.2", description: "Personal history of allergy to sulfonamides", status: "add", evidence: "Allergy: sulfonamides" },
      { code: "K91.8", description: "Post-procedural digestive disorder (ileus)", status: "query", evidence: "mild post-operative ileus POD 2, resolved conservatively" },
    ],
    procedure: {
      draft: "Anterior resection of rectum",
      suggested: "Laparoscopic anterior resection (sigmoid/rectosigmoid) with high IMA ligation and stapled anastomosis",
      why: "Matches the operative note and the pre-authorisation (\"laparoscopic (not robotic)\"); a mismatch invites a TPA query or a wrong sub-limit review.",
    },
    billing: [
      { item: "Stress echocardiogram (second entry)", finding: "Duplicate", kind: "remove", amount: 6500, evidence: "Stress echo performed once, on 11 Aug", action: "Remove" },
      { item: "Stress echocardiogram (first entry)", finding: "Wrong claim", kind: "move", amount: 6500, evidence: "outpatient, before admission", action: "Move to the pre-hospitalisation claim" },
      { item: "Ferric carboxymaltose 1 g", finding: "Wrong claim", kind: "move", amount: 9800, evidence: "IV ferric carboxymaltose given 6 Aug in day care (before admission)", action: "Move to the pre-hospitalisation claim" },
      { item: "TAP blocks (bilateral)", finding: "Unbilled", kind: "add", amount: 4500, evidence: "GA + bilateral ultrasound-guided TAP blocks", action: "Add" },
      { item: "hs-Troponin × 2 (24 h, 48 h)", finding: "Unbilled", kind: "add", amount: 3600, evidence: "Post-op hs-troponin sent at 24 h and 48 h", action: "Add" },
      { item: "Physiotherapy × 4", finding: "Unbilled", kind: "add", amount: 2400, evidence: "Physiotherapy notes: 4 sessions (20–23 Aug)", action: "Add" },
      { item: "Non-medical consumables", finding: "Correct", kind: "none", amount: 9000, evidence: "non-medical consumables excluded", action: "Patient-payable; explained at pre-authorisation" },
    ],
    feedback: [
      "Surgical team: state the approach (\"laparoscopic\") in the discharge summary procedure field, not only in the operative note.",
      "Surgical team: document whether the post-operative ileus was within the expected course or a complication.",
      "Endocrinology and ward doctors: \"T2DM\" alone leads to E11.9; name documented complications in the final diagnosis list.",
      "Billing: tag pre-admission day-care and outpatient items for the same condition as pre-hospitalisation at the point of charge.",
    ],
  },
};
