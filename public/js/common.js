import { marked } from "/vendor/marked/marked.esm.js";
import DOMPurify from "/vendor/dompurify/purify.es.mjs";

export const MAIN_PATIENT_ID = "syn-000158";
export const TRANSPLANT_PATIENT_ID = "syn-000271";
export const HF_PATIENT_ID = "syn-000342";
export const MOTHER_PATIENT_ID = "syn-000415";
export const CHILD_PATIENT_ID = "syn-000416";
export const STROKE_PATIENT_ID = "syn-000527";

// Order of the live prototypes along Thomas's journey (journey story lives on the dashboard).
export const JOURNEY_STEPS = [
  { id: "triage", label: "Triage", href: "module.html?id=triage" },
  { id: "referral", label: "Records digest", href: "module.html?id=referral" },
  { id: "scribe", label: "OPD visit", href: "module.html?id=scribe" },
  { id: "diabetes", label: "Diabetes", href: "module.html?id=diabetes" },
  { id: "ortho", label: "Ortho plan", href: "module.html?id=ortho" },
  { id: "radiology", label: "CT report", href: "module.html?id=radiology" },
  { id: "oncology", label: "Tumour board", href: "module.html?id=oncology" },
  { id: "cardiology", label: "Cardiac", href: "module.html?id=cardiology" },
  { id: "preauth", label: "Pre-auth", href: "module.html?id=preauth" },
  { id: "preop", label: "Pre-op", href: "module.html?id=preop" },
  { id: "nursing", label: "Nursing", href: "module.html?id=nursing" },
  { id: "discharge", label: "Discharge", href: "module.html?id=discharge" },
  { id: "coding", label: "Coding", href: "module.html?id=coding" },
  { id: "labs", label: "Lab explainer", href: "module.html?id=labs" },
  { id: "nephrology", label: "Kidney", href: "module.html?id=nephrology" },
  { id: "icu", label: "ICU", href: "module.html?id=icu" },
  { id: "medrec", label: "Med rec", href: "module.html?id=medrec" },
  { id: "rehab", label: "Rehab", href: "module.html?id=rehab" },
  { id: "monitoring", label: "Home monitor", href: "module.html?id=monitoring" },
  { id: "journey", label: "Story", href: "dashboard.html" },
];

// Anitha Joseph's liver transplant journey.
const TRANSPLANT_STEPS = [
  { id: "transplant", label: "Transplant work-up", href: "module.html?id=transplant" },
  { id: "timeline", label: "Patient timeline", href: `dashboard.html?patient=${TRANSPLANT_PATIENT_ID}` },
];

// Rajan Pillai's heart-failure journey.
const HF_STEPS = [
  { id: "decision", label: "ED decision support", href: "module.html?id=decision" },
  { id: "heartfailure", label: "Heart-failure clinic", href: "module.html?id=heartfailure" },
  { id: "timeline", label: "Patient timeline", href: `dashboard.html?patient=${HF_PATIENT_ID}` },
];

// Fathima and Ayaan Rasheed: mother-and-child journey shared by both records.
const FAMILY_STEPS = [
  { id: "antenatal", label: "Antenatal review", href: "module.html?id=antenatal" },
  { id: "paeds", label: "Ayaan: ED prescription", href: "module.html?id=paeds" },
  { id: "timeline", label: "Fathima's timeline", href: `dashboard.html?patient=${MOTHER_PATIENT_ID}` },
  { id: "timeline-child", label: "Ayaan's timeline", href: `dashboard.html?patient=${CHILD_PATIENT_ID}` },
];

// Leela Menon's stroke journey.
const STROKE_STEPS = [
  { id: "stroke", label: "Stroke code", href: "module.html?id=stroke" },
  { id: "timeline", label: "Patient timeline", href: `dashboard.html?patient=${STROKE_PATIENT_ID}` },
];

const STEPS_BY_PATIENT = {
  [STROKE_PATIENT_ID]: STROKE_STEPS,
  [TRANSPLANT_PATIENT_ID]: TRANSPLANT_STEPS,
  [HF_PATIENT_ID]: HF_STEPS,
  [MOTHER_PATIENT_ID]: FAMILY_STEPS,
  [CHILD_PATIENT_ID]: FAMILY_STEPS,
};

export function stepsFor(patientId) {
  return STEPS_BY_PATIENT[patientId] ?? JOURNEY_STEPS;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function renderHeader(active) {
  const nav = [
    ["home", "index.html", "Journey map"],
    ["dashboard", "dashboard.html", "Patient timeline"],
  ]
    .map(([key, href, label]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="site-header__inner">
      <a class="wordmark" href="index.html" aria-label="VPS Lakeshore home">
        <img src="brand/logo-lakeshore-white.png" alt="VPS Lakeshore, Global Lifecare">
      </a>
      <span class="site-title">Clinical AI Showcase · with Claude</span>
      <nav class="site-nav">${nav}</nav>
      <span class="mode-pill" id="mode-pill">…</span>
    </div>
    <div class="safety-banner">Prototype · synthetic patient data only · not a medical device · every output is a draft for clinician review</div>`;
  document.body.prepend(header);

  getJSON("/api/status")
    .then((s) => {
      const pill = document.getElementById("mode-pill");
      pill.dataset.mode = s.mode;
      pill.textContent = s.mode === "live" ? `Live · ${s.model}` : "Demo mode · sample outputs";
      pill.title = s.mode === "live" ? "Responses are generated live by Claude" : "No API key configured: pre-written sample outputs are replayed";
    })
    .catch(() => {});
}

export function renderPatientStrip(el, data) {
  const p = data.patient;
  const initials = p.name.split(" ").map((w) => w[0]).join("");
  const problems = data.conditions.map((c) => `<span class="chip chip--muted">${esc(c.display)}</span>`).join("");
  const allergy = p.allergies.length
    ? `<span class="chip chip--danger">Allergy: ${p.allergies.map((a) => esc(a.substance)).join(", ")}</span>`
    : '<span class="chip chip--muted">No known drug allergies</span>';
  el.classList.add("card", "patient-strip");
  el.innerHTML = `
    <div class="patient-strip__avatar" aria-hidden="true">${esc(initials)}</div>
    <div>
      <div class="patient-strip__name">${esc(p.name)} <span class="chip chip--muted">Synthetic</span></div>
      <div class="patient-strip__meta">${p.age} y · ${esc(p.gender)} · MRN ${esc(p.mrn)} · ${esc(p.address)}</div>
    </div>
    <div class="patient-strip__problems">${problems}</div>
    <div class="patient-strip__allergy">${allergy}</div>`;
}

export function renderStepper(el, activeId, patientId = MAIN_PATIENT_ID) {
  const filed = getFiled();
  el.className = "stepper";
  el.setAttribute("aria-label", "Patient journey steps");
  el.innerHTML = stepsFor(patientId).map(
    (s, i) => `<a href="${s.href}" class="${filed[s.id] ? "is-filed" : ""}"${s.id === activeId ? ' aria-current="step"' : ""}>
      <span class="stepper__n">${i + 1}</span>${esc(s.label)}</a>`,
  ).join("");
}

export function renderMarkdown(el, md) {
  el.innerHTML = DOMPurify.sanitize(marked.parse(md, { gfm: true }));
}

// POSTs to /api/run/:id and reads the server-sent event stream.
export async function runModule(id, input, { demo = false, signal, onMeta, onText } = {}) {
  const res = await fetch(`/api/run/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, demo }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let done = null;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += value;
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!frame.startsWith("data: ")) continue;
      const evt = JSON.parse(frame.slice(6));
      if (evt.type === "meta") onMeta?.(evt);
      else if (evt.type === "text") onText?.(evt.text);
      else if (evt.type === "error") throw new Error(evt.error);
      else if (evt.type === "done") done = evt;
    }
  }
  if (!done) throw new Error("The response ended unexpectedly.");
  return done;
}

// Clinician-approved outputs, kept in this browser only.
const FILED_KEY = "lakeshore.showcase.filed.v1";

export function getFiled() {
  try {
    return JSON.parse(localStorage.getItem(FILED_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function fileOutput(moduleId, entry) {
  const filed = getFiled();
  filed[moduleId] = { ...entry, filedAt: new Date().toISOString() };
  try {
    localStorage.setItem(FILED_KEY, JSON.stringify(filed));
  } catch {
    /* storage unavailable: filing is a demo convenience */
  }
}

export function clearFiled() {
  try {
    localStorage.removeItem(FILED_KEY);
  } catch {
    /* ignore */
  }
}
