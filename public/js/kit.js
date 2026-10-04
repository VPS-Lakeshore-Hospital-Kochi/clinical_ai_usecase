// Shared building blocks for the clinician views.
import { esc } from "./common.js";

export { esc };

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const nowHHMM = () => new Date().toTimeString().slice(0, 5);

/* ---------- Clinician action log ---------- */
// Records every accept / edit / reject / escalation so the demo shows who decided what.
export class AuditLog {
  constructor(container, { clock = nowHHMM } = {}) {
    this.entries = [];
    this.clock = clock;
    this.el = el(`<section class="audit" aria-live="polite">
      <div class="audit__head"><span class="label">Clinician actions</span><span class="audit__count">0</span></div>
      <ol class="audit__list"><li class="audit__empty">Nothing yet. Every accept, edit and reject is recorded here.</li></ol>
    </section>`);
    container.append(this.el);
  }
  add(text, kind = "info") {
    const entry = { time: this.clock(), text, kind };
    this.entries.push(entry);
    const list = this.el.querySelector(".audit__list");
    list.querySelector(".audit__empty")?.remove();
    list.prepend(el(`<li data-kind="${kind}"><span class="audit__time">${esc(entry.time)}</span>${esc(text)}</li>`));
    this.el.querySelector(".audit__count").textContent = this.entries.length;
  }
  markdown() {
    return this.entries.map((e) => `- ${e.time} ${e.text}`).join("\n");
  }
}

/* ---------- Review cards: accept / edit / reject ---------- */
// items: [{ key, label, html, text, meta }]. text is the editable value.
export function reviewList(container, items, { audit, noun = "item", editable = true, onChange } = {}) {
  const state = new Map(items.map((it) => [it.key, { status: "pending", text: it.text }]));
  container.innerHTML = "";
  const list = el(`<div class="review"></div>`);
  container.append(list);

  const render = (it) => {
    const s = state.get(it.key);
    const card = el(`<article class="review-card" data-status="${s.status}">
      <div class="review-card__body">
        ${it.label ? `<div class="review-card__label">${esc(it.label)}</div>` : ""}
        <div class="review-card__content">${s.status === "edited" ? esc(s.text) : it.html ?? esc(it.text)}</div>
        ${it.meta ? `<div class="review-card__meta">${it.meta}</div>` : ""}
      </div>
      <div class="review-card__actions">
        <button class="rbtn rbtn--accept" data-act="accept" aria-pressed="${s.status === "accepted"}" title="Accept">✓ Accept</button>
        ${editable ? `<button class="rbtn" data-act="edit" title="Edit">Edit</button>` : ""}
        <button class="rbtn rbtn--reject" data-act="reject" aria-pressed="${s.status === "rejected"}" title="Reject">✕ Reject</button>
      </div>
    </article>`);
    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "edit") return startEdit(it, card);
      const next = act === "accept" ? "accepted" : "rejected";
      s.status = s.status === next ? "pending" : next;
      audit?.add(`${s.status === "pending" ? "Undid decision on" : next === "accepted" ? "Accepted" : "Rejected"} ${noun}: ${short(it.text)}`, next === "rejected" ? "reject" : "accept");
      card.replaceWith(render(it));
      onChange?.();
    });
    return card;
  };

  const startEdit = (it, card) => {
    const s = state.get(it.key);
    const box = el(`<div class="review-edit"><textarea rows="3">${esc(s.text)}</textarea>
      <div class="review-edit__actions"><button class="rbtn rbtn--accept" data-save>Save</button><button class="rbtn" data-cancel>Cancel</button></div></div>`);
    card.querySelector(".review-card__content").replaceWith(box);
    card.querySelector(".review-card__actions").hidden = true;
    const ta = box.querySelector("textarea");
    ta.focus();
    box.querySelector("[data-cancel]").onclick = () => card.replaceWith(render(it));
    box.querySelector("[data-save]").onclick = () => {
      const v = ta.value.trim();
      if (v && v !== it.text) {
        s.text = v;
        s.status = "edited";
        audit?.add(`Edited ${noun}: ${short(v)}`, "edit");
      }
      card.replaceWith(render(it));
      onChange?.();
    };
  };

  for (const it of items) list.append(render(it));

  return {
    states: () => items.map((it) => ({ ...it, ...state.get(it.key) })),
    accepted: () => items.map((it) => ({ ...it, ...state.get(it.key) })).filter((x) => x.status === "accepted" || x.status === "edited"),
    pending: () => [...state.values()].filter((s) => s.status === "pending").length,
    acceptAll() {
      let n = 0;
      for (const it of items) {
        const s = state.get(it.key);
        if (s.status === "pending") { s.status = "accepted"; n++; }
      }
      if (n) audit?.add(`Accepted the remaining ${n} ${noun}${n === 1 ? "" : "s"}`, "accept");
      list.innerHTML = "";
      for (const it of items) list.append(render(it));
      onChange?.();
    },
  };
}

const short = (t) => (t.length > 90 ? `${t.slice(0, 87)}…` : t);

/* ---------- Claude call state ---------- */
export function sourceNote(result) {
  return result.mode === "live" ? `Generated by ${esc(result.model)}` : "Sample output · offline demo";
}

// Renders a "Claude is working" placeholder and resolves the call; offers the sample on failure.
export async function withClaude(container, ask, { label = "Claude is working…", onError } = {}) {
  container.innerHTML = `<div class="thinking"><span class="spinner" aria-hidden="true"></span> ${esc(label)}</div>`;
  try {
    return await ask();
  } catch (err) {
    container.innerHTML = "";
    const box = el(`<div class="error-box">${esc(err.message)} <button class="btn btn--ghost" style="margin-left:8px;padding:4px 10px">Use sample output</button></div>`);
    container.append(box);
    return new Promise((resolve) => {
      box.querySelector("button").onclick = async () => resolve(await ask({ demo: true }));
      onError?.(err);
    });
  }
}

export function md(text) {
  // Minimal inline formatting for Claude's short fields: **bold** and line breaks.
  return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}
