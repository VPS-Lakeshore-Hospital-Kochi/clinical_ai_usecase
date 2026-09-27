import {
  renderHeader, renderPatientStrip, renderStepper, getJSON, esc, formatDate,
  getFiled, clearFiled, renderMarkdown,
} from "./common.js";
import { attachRunner } from "./runner.js";

renderHeader("dashboard");
const $ = (sel) => document.getElementById(sel);
const stepper = $("stepper");
renderStepper(stepper, "journey");

const patient = await getJSON("/api/patient");
renderPatientStrip($("patient"), patient);

const MAX_FILED_CHARS = 4000;

function renderTimeline() {
  const filed = getFiled();
  const list = $("timeline");
  list.innerHTML = patient.timeline
    .map((e, i) => {
      const f = e.module ? filed[e.module] : null;
      return `
      <li data-ai="${Boolean(e.module)}" data-filed="${Boolean(f)}">
        <span class="timeline__dot" aria-hidden="true"></span>
        <div class="timeline__date">${formatDate(e.date)} · ${esc(e.specialty)}</div>
        <div class="timeline__title">${esc(e.title)}</div>
        <p class="timeline__detail">${esc(e.detail)}</p>
        ${e.module ? `<div class="timeline__tags">
            <a class="chip" href="module.html?id=${e.module}">Open AI prototype →</a>
            ${f ? '<span class="chip chip--good">✓ Approved &amp; filed</span>' : ""}
          </div>` : ""}
        ${f ? `<details><summary>View filed output</summary><div class="md" data-filed-index="${i}"></div></details>` : ""}
      </li>`;
    })
    .join("");
  list.querySelectorAll("[data-filed-index]").forEach((el) => {
    const e = patient.timeline[Number(el.dataset.filedIndex)];
    renderMarkdown(el, filed[e.module].text);
  });
}

function compileTimeline() {
  const filed = getFiled();
  const p = patient.patient;
  const lines = [`Patient: ${p.name}, ${p.age}-year-old ${p.gender}, ${p.address} (synthetic).`, ""];
  for (const e of patient.timeline) {
    const tag = e.module ? " [AI-assisted step]" : "";
    lines.push(`${e.date} · ${e.specialty} · ${e.title}${tag}: ${e.detail}`);
    const f = e.module ? filed[e.module] : null;
    if (f) {
      const text = f.text.length > MAX_FILED_CHARS ? `${f.text.slice(0, MAX_FILED_CHARS)}\n[…truncated]` : f.text;
      lines.push(`  Clinician-approved AI output:\n${text.replace(/^/gm, "    ")}`);
    }
  }
  return lines.join("\n");
}

renderTimeline();

$("clear").addEventListener("click", () => {
  clearFiled();
  renderTimeline();
  renderStepper(stepper, "journey");
});

attachRunner({
  moduleId: "journey",
  getInput: compileTimeline,
  runBtn: $("run"),
  sampleBtn: $("sample"),
  output: $("output"),
  empty: $("output-empty"),
  status: $("status"),
  wrap: $("output-wrap"),
});
