import { renderHeader, esc } from "./common.js";
import { STAGES } from "./usecases.js";

renderHeader("home");

const liveCount = STAGES.flatMap((s) => s.items).filter((i) => i.href).length;
const total = STAGES.flatMap((s) => s.items).length;

document.getElementById("stages").innerHTML =
  `<p class="muted" style="margin:0 0 16px">${liveCount} live prototypes · ${total - liveCount} more on the roadmap</p>` +
  STAGES.map(
    (stage, i) => `
    <section class="stage">
      <div class="stage__head">
        <span class="stage__num">${String(i + 1).padStart(2, "0")}</span>
        <h2>${esc(stage.title)}</h2>
        <p>${esc(stage.blurb)}</p>
      </div>
      <div class="usecase-grid">
        ${stage.items.map(renderUsecase).join("")}
      </div>
    </section>`,
  ).join("");

function renderUsecase(u) {
  const body = `
    <h3>${esc(u.title)}</h3>
    <p>${esc(u.text)}</p>
    <div class="usecase__foot">
      <span class="chip chip--muted">${esc(u.specialty)}</span>
      ${u.href ? '<span class="chip chip--good">● Live prototype</span>' : '<span class="chip chip--muted">Roadmap</span>'}
    </div>`;
  return u.href
    ? `<a class="card usecase usecase--live" href="${u.href}">${body}</a>`
    : `<div class="card usecase usecase--roadmap">${body}</div>`;
}
