// Front-office routing clinician view: the app screens every request for red flags, finds
// duplicates by phone number and checks each proposed slot against the live roster. Claude routes
// the queue; staff make the nurse calls, confirm bookings and send replies. No patient record.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { screenRequest, findDuplicates, slotCheck } from "../clinical.js";
import { QUEUE, ROSTER } from "../routing-data.js";

const URG_DOT = { Emergency: "danger", "Same day": "warn", "≤1 week": "warn", Routine: "ok" };
const slotById = (id) => ROSTER.find((s) => s.id === id);

export default {
  notes: [
    "The app screens every message before Claude sees it: three possible emergencies (R2, R4, R9) and three urgent red flags. R2 asks for a neurologist, but the words 'sudden, worst ever' make it an emergency.",
    "R3 and R8 share a phone number: the app flags the duplicate and Claude merges them into one booking and one reply.",
    "Claude routes only to slots in today's roster. Gastroenterology Consultant 1 is on leave and the Thursday breast clinic is full, so R1 and R5 go to the slots that are free.",
    "Try moving R2 into the neurology clinic, or R1 to Consultant 1: the app blocks the booking and says why.",
    "Every emergency needs a nurse call logged before the request counts as handled. Bookings reduce the roster's free slots live.",
  ],
  guide: [
    "Read the queue: the app has already screened each request for red flags and duplicates.",
    "Ask Claude to route the queue against today's roster.",
    "Make the nurse calls for the escalations first.",
    "Confirm each booking; change the slot if needed and the app re-checks it.",
    "Merge the duplicate, send the replies and approve the plan.",
  ],
  mount(root, ctx) {
    const flags = Object.fromEntries(QUEUE.map((r) => [r.id, screenRequest(`${r.from}: ${r.text}`)]));
    const dupes = findDuplicates(QUEUE.filter((r) => r.phone));
    const emergencies = QUEUE.filter((r) => flags[r.id].some((f) => f.level === "emergency"));
    const urgent = QUEUE.filter((r) => flags[r.id].length && !emergencies.includes(r));
    let d = null, clock = 8 * 60 + 31;
    const choice = {}, booked = {}, called = {}, merged = new Set(), collected = new Set();
    const hhmm = () => `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;

    root.innerHTML = "";
    const view = el(`<div class="rt">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Unrouted requests</span><span class="tile__v" id="left">${QUEUE.length}</span><span class="tile__u">25 Sep, 08:30</span></div>
        <div class="tile"><span class="label">Possible emergencies (app)</span><span class="tile__v">${emergencies.length}</span><span class="tile__u">${emergencies.map((r) => r.id).join(", ")}: nurse call first</span></div>
        <div class="tile"><span class="label">Urgent red flags (app)</span><span class="tile__v">${urgent.length}</span><span class="tile__u">${urgent.map((r) => r.id).join(", ")}</span></div>
        <div class="tile"><span class="label">Duplicates (app)</span><span class="tile__v">${dupes.length}</span><span class="tile__u">${dupes.map((g) => g.join(" + ")).join("; ")} · same phone</span></div>
      </section>
      <div class="rt__top">
        <section><h3 class="section-title">Incoming queue</h3><ol class="rt__queue" id="queue"></ol></section>
        <section><h3 class="section-title">Today's roster</h3><ul class="rt__roster" id="roster"></ul></section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to route the queue</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => hhmm() });
    const log = (text, kind = "accept") => { audit.add(text, kind); clock += 2; };

    const usedBy = (slotId, except) => Object.entries(booked).filter(([rid, sid]) => sid === slotId && rid !== except).length;
    const handled = (id) => merged.has(id) || (booked[id] && (!needsCall(id) || called[id]));
    const needsCall = (id) => Boolean(d?.escalations.some((e) => e.request === id));

    function queue() {
      $("#queue").innerHTML = QUEUE.map((r) => {
        const state = merged.has(r.id) ? `Merged into ${dupes.find((g) => g.includes(r.id))[0]}` : booked[r.id] ? `${called[r.id] ? `Nurse called ${called[r.id]} · ` : ""}${slotById(booked[r.id]).service}` : called[r.id] ? `Nurse called ${called[r.id]}` : "";
        return `<li data-done="${handled(r.id)}"><div class="rt__qhead"><strong>${r.id}</strong><span class="chip chip--muted">${esc(r.channel)}</span><small class="muted">${r.at}</small></div>
          <small class="muted">${esc(r.from)}${r.phone ? ` · ${esc(r.phone)}` : " · no phone"}</small>
          <p>“${esc(r.text)}”</p>
          <div class="rt__chips">${flags[r.id].map((f) => `<span class="rt__flag" data-level="${f.level}"><span class="dot dot--${f.level === "emergency" ? "danger" : "warn"}"></span>${esc(f.label)}</span>`).join("")}${dupes.some((g) => g.includes(r.id)) ? `<span class="rt__flag"><span class="dot"></span>Same phone as ${dupes.find((g) => g.includes(r.id)).filter((x) => x !== r.id).join(", ")}</span>` : ""}</div>
          ${state ? `<small class="rt__state">✓ ${esc(state)}</small>` : ""}</li>`;
      }).join("");
      $("#left").textContent = QUEUE.filter((r) => !handled(r.id)).length;
    }

    function roster() {
      $("#roster").innerHTML = ROSTER.map((s) => {
        const used = usedBy(s.id);
        const free = s.free == null ? null : s.free - used;
        const status = s.leave ? "On leave" : free == null ? (s.kind === "callback" ? "Call-back" : "Open 24 h") : free <= 0 ? "Full" : `${free} free`;
        return `<li data-state="${s.leave ? "leave" : free != null && free <= 0 ? "full" : "open"}"><span><strong>${esc(s.service)}</strong><br><small class="muted">${esc(s.clinician)} · ${esc(s.when)}</small></span><span class="rt__cap">${status}${used ? `<small>${used} booked</small>` : ""}</span></li>`;
      }).join("");
    }

    queue(); roster();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        queue: QUEUE, roster: ROSTER,
        appChecks: [
          ...QUEUE.filter((r) => flags[r.id].length).map((r) => `${r.id}: ${flags[r.id].map((f) => `${f.label} (${f.level})`).join(", ")}`),
          ...dupes.map((g) => `Duplicate by phone number: ${g.join(" + ")}`),
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading every request against the roster…" });
      d = result.data;
      for (const r of d.routes) choice[r.request] = r.slotId;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      log("Routing plan drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="rt__out">
        <section><h3 class="section-title">Escalate now</h3><div class="rt__esc">${d.escalations.map((e) => `<div class="escalate"><div class="rt__qhead"><strong>${esc(e.request)}</strong><span class="chip">Nurse call</span></div><p>${esc(e.why)}</p><p class="rt__script">“${esc(e.script)}”</p><button class="btn btn--primary" data-call="${esc(e.request)}">Nurse call made</button></div>`).join("")}</div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Routing plan</h3><span class="hint" id="progress"></span></div><div class="rt__routes" id="routes"></div></section>
        <div class="handover">
          <section><h3 class="section-title">Duplicates &amp; data issues</h3>
            ${d.duplicates.map((x, i) => `<div class="rt__dupe"><p><strong>${esc(x.requests.join(" + "))}</strong>: ${esc(x.action)}</p><button class="rbtn" data-merge="${i}">Merge ${esc(x.requests.slice(1).join(", "))} into ${esc(x.requests[0])}</button></div>`).join("")}
            <ul class="tasks">${d.dataIssues.map((x, i) => `<li><input type="checkbox" data-issue="${i}" aria-label="Collected"><span class="time">${esc(x.request)}</span><span>${esc(x.issue)}</span></li>`).join("")}</ul>
          </section>
          <section><h3 class="section-title">Capacity notes</h3><ul class="facts">${d.capacity.map((c) => `<li><span class="dot dot--warn"></span><span>${esc(c)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Reply drafts</h3><div class="rt__replies">${d.replies.map((x, i) => `<div class="brief"><span class="label">${esc(x.request)} · WhatsApp</span><textarea data-reply="${i}" rows="4" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(x.text)}</textarea><button class="rbtn" data-send="${i}">Send</button></div>`).join("")}</div></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve routing plan</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);

      g.querySelectorAll("[data-call]").forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.call;
        called[id] = hhmm();
        log(`Nurse call made to ${id}: ${d.escalations.find((e) => e.request === id).why.split(":")[0]}`, "reject");
        b.disabled = true;
        b.textContent = `✓ Called ${called[id]}`;
        routes(); queue();
      }));
      g.querySelectorAll("[data-merge]").forEach((b) => b.addEventListener("click", () => {
        const x = d.duplicates[Number(b.dataset.merge)];
        x.requests.slice(1).forEach((id) => merged.add(id));
        log(`Merged ${x.requests.slice(1).join(", ")} into ${x.requests[0]}`);
        b.disabled = true;
        b.textContent = "✓ Merged";
        routes(); queue();
      }));
      g.querySelectorAll("[data-issue]").forEach((c) => c.addEventListener("change", () => {
        const x = d.dataIssues[Number(c.dataset.issue)];
        c.checked ? collected.add(x) : collected.delete(x);
        c.closest("li").classList.toggle("is-done", c.checked);
        if (c.checked) log(`Collected for ${x.request}: ${x.issue}`, "info");
      }));
      g.querySelectorAll("[data-send]").forEach((b) => b.addEventListener("click", () => {
        const x = d.replies[Number(b.dataset.send)];
        log(`Reply sent to ${x.request}`, "info");
        b.disabled = true;
        b.textContent = "✓ Sent";
      }));
      g.querySelector("#file").onclick = () => {
        const rows = d.routes.map((r) => {
          const s = slotById(booked[r.request] || choice[r.request]);
          return `| ${r.request}${merged.size && d.duplicates.some((x) => x.requests[0] === r.request) ? ` (+ ${d.duplicates.find((x) => x.requests[0] === r.request).requests.slice(1).join(", ")})` : ""} | ${r.urgency} | ${s ? `${s.service}, ${s.clinician}, ${s.when}` : "—"} | ${booked[r.request] ? "Booked" : "Not booked"}${called[r.request] ? `; nurse called ${called[r.request]}` : ""} |`;
        });
        ctx.file([
          `## Escalations`, ...d.escalations.map((e) => `- ${e.request}: ${e.why}. ${called[e.request] ? `Nurse called ${called[e.request]}.` : "**Call not yet logged.**"}`),
          `## Routing plan`, `| Request | Urgency | Destination | Status |\n|---|---|---|---|\n${rows.join("\n")}`,
          `## Duplicates`, ...d.duplicates.map((x) => `- ${x.requests.join(" + ")}: ${merged.has(x.requests[1]) ? "merged" : "not merged"}`),
          `## Staff actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Routing plan approved";
      };
      routes();
    }

    function routes() {
      const box = view.querySelector("#routes");
      box.innerHTML = `<div class="table-wrap"><table class="lk-table rt__table"><thead><tr><th>Request</th><th>Urgency</th><th>Destination</th><th>App check</th><th>Preparation and reason</th><th></th></tr></thead><tbody>${d.routes.map((r) => {
        const sid = choice[r.request];
        const check = slotCheck(slotById(sid), r.urgency, usedBy(sid, r.request));
        const isBooked = booked[r.request] === sid;
        const waitCall = needsCall(r.request) && !called[r.request];
        return `<tr data-ok="${check.ok}"><td><strong>${esc(r.request)}</strong>${d.duplicates.some((x) => x.requests[0] === r.request) ? `<br><small class="muted">+ ${esc(d.duplicates.find((x) => x.requests[0] === r.request).requests.slice(1).join(", "))}</small>` : ""}</td>
          <td><span class="dot dot--${URG_DOT[r.urgency]}"></span> ${esc(r.urgency)}</td>
          <td><select data-slot="${esc(r.request)}" ${isBooked ? "disabled" : ""} aria-label="Destination for ${esc(r.request)}">${ROSTER.map((s) => `<option value="${s.id}" ${s.id === sid ? "selected" : ""}>${esc(s.service)} · ${esc(s.when)}</option>`).join("")}</select><br><small class="muted">${esc(slotById(sid)?.clinician || "")}</small></td>
          <td class="rt__check">${check.ok ? `✓ ${esc(check.reason)}` : `✕ ${esc(check.reason)}`}</td>
          <td><small>${esc(r.prep)}</small><br><small class="muted">${esc(r.reason)}</small></td>
          <td>${isBooked ? `<span class="chip chip--done">${slotById(sid).kind === "emergency" ? "Sent" : "Booked"}</span>` : `<button class="rbtn rbtn--accept" data-book="${esc(r.request)}" ${check.ok && !waitCall ? "" : "disabled"} title="${waitCall ? "Make the nurse call first" : ""}">${waitCall ? "Call first" : slotById(sid)?.kind === "emergency" ? "Confirm" : "Book"}</button>`}</td></tr>`;
      }).join("")}</tbody></table></div>`;
      box.querySelectorAll("[data-slot]").forEach((s) => s.addEventListener("change", () => {
        const id = s.dataset.slot;
        choice[id] = s.value;
        const r = d.routes.find((x) => x.request === id);
        const check = slotCheck(slotById(s.value), r.urgency, usedBy(s.value, id));
        log(`Changed ${id} to ${slotById(s.value).service}${check.ok ? "" : ` (app blocked: ${check.reason})`}`, check.ok ? "edit" : "reject");
        routes();
      }));
      box.querySelectorAll("[data-book]").forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.book;
        booked[id] = choice[id];
        const s = slotById(booked[id]);
        log(`${s.kind === "emergency" ? "Confirmed" : "Booked"} ${id}: ${s.service}, ${s.when}`);
        routes(); queue(); roster();
      }));
      const total = QUEUE.length, done = QUEUE.filter((r) => handled(r.id)).length;
      view.querySelector("#progress").textContent = `${done} of ${total} handled`;
    }

  },
};
