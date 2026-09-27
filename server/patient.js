import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");

function load(file) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
}

// Thomas Varghese: the main journey. Kept as a named export for the modules
// that read his CGM trace and reports directly.
export const patient = load("patient.json");
export const transplantPatient = load("patient-transplant.json");
export const heartFailurePatient = load("patient-hf.json");

export const DEFAULT_PATIENT_ID = patient.patient.id;

const patients = new Map([patient, transplantPatient, heartFailurePatient].map((p) => [p.patient.id, p]));

export function getPatient(id = DEFAULT_PATIENT_ID) {
  return patients.get(id);
}

// Plain-text chart summary used as stable context in every prompt. It is built
// once at startup so the prompt prefix stays byte-identical and cacheable.
function renderSummary(p) {
  const pt = p.patient;
  const allergies = pt.allergies.length
    ? pt.allergies.map((a) => `${a.substance} (${a.reaction})`).join("; ")
    : "No known drug allergies";
  const lines = [
    "SYNTHETIC PATIENT RECORD (demo data, not a real person)",
    `Name: ${pt.name} | MRN: ${pt.mrn} | ${pt.age}-year-old ${pt.gender} | DOB ${pt.birthDate}${pt.bloodGroup ? ` | Blood group ${pt.bloodGroup}` : ""}`,
    `Address: ${pt.address} | Languages: ${pt.languages.join(", ")} | Occupation: ${pt.occupation}`,
    `Payer: ${pt.payer}`,
    `Lifestyle: ${pt.lifestyle}`,
    `Family history: ${pt.familyHistory}`,
    `Allergies: ${allergies}`,
    "",
    "Problem list:",
    ...p.conditions.map((c) => `- ${c.display} [${c.code}]${c.onset ? `, since ${c.onset}` : ""}`),
    "",
    `Medications (${p.medicationsNote || "current"}):`,
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

const summaries = new Map([...patients].map(([id, p]) => [id, renderSummary(p)]));

export function patientSummaryFor(id = DEFAULT_PATIENT_ID) {
  return summaries.get(id);
}
