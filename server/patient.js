import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PATIENT_FILE = path.join(here, "..", "data", "patient.json");

export const patient = JSON.parse(readFileSync(PATIENT_FILE, "utf8"));

// Plain-text chart summary used as stable context in every prompt. It is built
// once at startup so the prompt prefix stays byte-identical and cacheable.
function renderSummary(p) {
  const pt = p.patient;
  const lines = [
    "SYNTHETIC PATIENT RECORD (demo data, not a real person)",
    `Name: ${pt.name} | MRN: ${pt.mrn} | ${pt.age}-year-old ${pt.gender} | DOB ${pt.birthDate}`,
    `Address: ${pt.address} | Languages: ${pt.languages.join(", ")} | Occupation: ${pt.occupation}`,
    `Payer: ${pt.payer}`,
    `Lifestyle: ${pt.lifestyle}`,
    `Family history: ${pt.familyHistory}`,
    `Allergies: ${pt.allergies.map((a) => `${a.substance} (${a.reaction})`).join("; ")}`,
    "",
    "Problem list:",
    ...p.conditions.map((c) => `- ${c.display} [${c.code}]${c.onset ? `, since ${c.onset}` : ""}`),
    "",
    "Current medications (before July 2026 changes):",
    ...p.medications.map((m) => `- ${m.name} ${m.dose} ${m.frequency}`),
    "",
    "Vitals:",
    ...p.vitals.map((v) => `- ${v.date}: BP ${v.bp}, HR ${v.hr}, weight ${v.weightKg} kg, BMI ${v.bmi}`),
    "",
    "Laboratory results:",
    ...p.labs.map((l) => `- ${l.date} ${l.test}: ${l.value} ${l.unit} (ref ${l.ref})${l.flag ? ` [${l.flag}]` : ""}`),
  ];
  return lines.join("\n");
}

export const patientSummary = renderSummary(patient);
