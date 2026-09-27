import { marked } from "/vendor/marked/marked.esm.js";
import DOMPurify from "/vendor/dompurify/purify.es.mjs";

// Order of the live prototypes along the journey (journey story lives on the dashboard).
export const JOURNEY_STEPS = [
  { id: "triage", label: "Triage", href: "module.html?id=triage" },
  { id: "scribe", label: "Consultation", href: "module.html?id=scribe" },
  { id: "diabetes", label: "Diabetes", href: "module.html?id=diabetes" },
  { id: "ortho", label: "Ortho planning", href: "module.html?id=ortho" },
  { id: "oncology", label: "Tumour board", href: "module.html?id=oncology" },
  { id: "cardiology", label: "Cardiac pre-op", href: "module.html?id=cardiology" },
  { id: "preauth", label: "Pre-auth", href: "module.html?id=preauth" },
  { id: "discharge", label: "Discharge", href: "module.html?id=discharge" },
  { id: "journey", label: "Journey story", href: "dashboard.html" },
];

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
        <span class="wordmark__name"><span class="wordmark__vps">vps</span> <span class="wordmark__lakeshore">lakeshore</span></span>
        <span class="wordmark__tag">Global Lifecare</span>
      </a>
      <span class="site-title">Clinical AI Showcase · powered by Claude</span>
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
  const allergies = p.allergies.map((a) => esc(a.substance)).join(", ");
  el.classList.add("card", "patient-strip");
  el.innerHTML = `
    <div class="patient-strip__avatar" aria-hidden="true">${esc(initials)}</div>
    <div>
      <div class="patient-strip__name">${esc(p.name)} <span class="chip chip--maroon">Synthetic</span></div>
      <div class="patient-strip__meta">${p.age} y · ${esc(p.gender)} · MRN ${esc(p.mrn)} · ${esc(p.address)}</div>
    </div>
    <div class="patient-strip__problems">${problems}</div>
    <div class="patient-strip__allergy"><span class="chip chip--maroon">⚠ Allergy: ${allergies}</span></div>`;
}

export function renderStepper(el, activeId) {
  const filed = getFiled();
  el.className = "stepper";
  el.setAttribute("aria-label", "Patient journey steps");
  el.innerHTML = JOURNEY_STEPS.map(
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
