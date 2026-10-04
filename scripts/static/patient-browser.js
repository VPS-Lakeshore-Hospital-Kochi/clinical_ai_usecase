// Browser stand-in for server/patient.js, used when bundling the clinician views for the
// static build: the same records, read from JSON imports instead of the file system.
import patientData from "../../data/patient.json";

export const patient = patientData;
export const DEFAULT_PATIENT_ID = patient.patient.id;
