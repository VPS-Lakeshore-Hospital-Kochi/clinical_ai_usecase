import {
  renderHeader, renderPatientStrip, renderStepper, getJSON, esc, formatDate,
  getFiled, clearFiled, renderMarkdown, MAIN_PATIENT_ID, compileJourney,
} from "./common.js";
import { attachRunner } from "./runner.js";

renderHeader("dashboard");
const $ = (sel) => document.getElementById(sel);
const stepper = $("stepper");
const patientId = new URLSearchParams(location.search).get("patient") || MAIN_PATIENT_ID;
// The cross-specialty journey story is built for Thomas's journey only.
const hasStory = patientId === MAIN_PATIENT_ID;
const activeStep = hasStory ? "journey" : patientId === "syn-000416" ? "timeline-child" : "timeline";
renderStepper(stepper, activeStep, patientId);

const patient = await getJSON(`/api/patient?id=${encodeURIComponent(patientId)}`);
renderPatientStrip($("patient"), patient);
if (!hasStory) {
  $("story-panel").hidden = true;
  $("dash").classList.add("dash--single");
}

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
            ${f ? '<span class="chip chip--done">✓ Approved &amp; filed</span>' : ""}
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

const compileTimeline = () => compileJourney(patient, getFiled());

renderTimeline();

$("clear").addEventListener("click", () => {
  clearFiled();
  renderTimeline();
  renderStepper(stepper, activeStep, patientId);
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
