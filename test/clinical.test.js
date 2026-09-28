import { test } from "node:test";
import assert from "node:assert/strict";
import { news2, news2Response, checkOrder, apixabanCriteria, toMin, toHHMM, fmtDur, medicineCheck, colonStage, adjuvantGuide, anionGap, kdigoStage, dkaInsulinRate, preauthEstimate, adrenalRule, locateQuotes } from "../public/js/clinical.js";

test("NEWS2 scores the night-shift observations as charted", () => {
  const night = [
    [{ rr: 16, spo2: 97, sbp: 128, hr: 84, temp: 37.2, avpu: "A" }, 0],
    [{ rr: 18, spo2: 96, sbp: 122, hr: 92, temp: 37.4, avpu: "A" }, 1],
    [{ rr: 21, spo2: 95, sbp: 112, hr: 102, temp: 37.6, avpu: "A" }, 4],
    [{ rr: 22, spo2: 93, sbp: 106, hr: 108, temp: 37.8, avpu: "A" }, 6],
  ];
  for (const [o, total] of night) assert.equal(news2(o).total, total);
  assert.equal(news2({ rr: 24, spo2: 92, sbp: 98, hr: 114, temp: 38.2, avpu: "A" }).total, 9);
});

test("NEWS2 band edges and response thresholds", () => {
  const base = { rr: 16, spo2: 97, oxygen: false, sbp: 128, hr: 70, temp: 37, avpu: "A" };
  const p = (o) => news2({ ...base, ...o }).parts;
  assert.equal(p({ rr: 8 }).rr, 3); assert.equal(p({ rr: 11 }).rr, 1); assert.equal(p({ rr: 20 }).rr, 0); assert.equal(p({ rr: 24 }).rr, 2); assert.equal(p({ rr: 25 }).rr, 3);
  assert.equal(p({ spo2: 91 }).spo2, 3); assert.equal(p({ spo2: 93 }).spo2, 2); assert.equal(p({ spo2: 95 }).spo2, 1);
  assert.equal(p({ sbp: 90 }).sbp, 3); assert.equal(p({ sbp: 100 }).sbp, 2); assert.equal(p({ sbp: 110 }).sbp, 1); assert.equal(p({ sbp: 220 }).sbp, 3);
  assert.equal(p({ hr: 40 }).hr, 3); assert.equal(p({ hr: 50 }).hr, 1); assert.equal(p({ hr: 110 }).hr, 1); assert.equal(p({ hr: 130 }).hr, 2); assert.equal(p({ hr: 131 }).hr, 3);
  assert.equal(p({ temp: 35.0 }).temp, 3); assert.equal(p({ temp: 36.0 }).temp, 1); assert.equal(p({ temp: 38.1 }).temp, 1); assert.equal(p({ temp: 39.1 }).temp, 2);
  assert.equal(p({ oxygen: true }).oxygen, 2); assert.equal(p({ avpu: "V" }).avpu, 3);
  assert.equal(news2Response(0, false).level, "none");
  assert.equal(news2Response(3, true).level, "urgent-ward");
  assert.equal(news2Response(5, false).level, "urgent");
  assert.equal(news2Response(7, false).level, "emergency");
});

const ctx = { weightKg: 16, ageYears: 4, dehydrated: true };
const liquid = (drug, strengthMg, volumeMl, frequency, extra = {}) => ({ drug, form: "liquid", strengthMg, strengthMl: 5, volumeMl, frequency, ...extra });

test("paediatric check catches the written errors for a 16 kg child", () => {
  const para = checkOrder(liquid("paracetamol", 250, 15, "every 6 hours"), ctx);
  assert.equal(para.verdict, "error");
  assert.equal(para.mgDose, 750);
  assert.equal(para.mgKgDay, 187.5);
  assert.equal(para.fix.volumeMl, 4.8);

  const ibu = checkOrder(liquid("ibuprofen", 100, 8, "every 8 hours"), ctx);
  assert.equal(ibu.verdict, "warn");
  assert.equal(ibu.mgKgDose, 10);
  assert.equal(checkOrder(liquid("ibuprofen", 100, 8, "every 8 hours"), { ...ctx, dehydrated: false }).verdict, "ok");

  const amox = checkOrder(liquid("amoxicillin", 250, 10, "three times daily", { durationDays: 10 }), ctx);
  assert.equal(amox.verdict, "warn");
  assert.equal(amox.fix.volumeMl, 14.4);
  assert.equal(amox.fix.durationDays, 7);
  assert.equal(checkOrder(liquid("amoxicillin", 250, 14.4, "twice daily", { durationDays: 7 }), ctx).verdict, "ok");

  assert.equal(checkOrder({ drug: "ondansetron", form: "tablet", doseMg: 8, frequency: "once" }, ctx).verdict, "error");
  assert.equal(checkOrder({ drug: "ondansetron", form: "tablet", doseMg: 4, frequency: "once" }, ctx).verdict, "ok");
  assert.equal(checkOrder({ drug: "ondansetron", form: "tablet", doseMg: 4, frequency: "once" }, { ...ctx, weightKg: 12 }).verdict, "error");
  assert.equal(checkOrder(liquid("codeine", null, 5, "at night"), ctx).verdict, "error");
  assert.equal(checkOrder(liquid("codeine", null, 5, "at night"), { ...ctx, ageYears: 13 }).verdict, "ok");
  assert.equal(checkOrder({ drug: "ors", form: "ors", totalMl: null, frequency: "once" }, ctx).fix.totalMl, 800);
});

test("doses rescale with weight", () => {
  const para = checkOrder(liquid("paracetamol", 250, 5, "every 6 hours"), { ...ctx, weightKg: 10 });
  assert.equal(para.verdict, "error");
  assert.equal(para.fix.volumeMl, 3);
});

test("apixaban dose criteria and clock helpers", () => {
  assert.deepEqual(apixabanCriteria({ ageYears: 71, weightKg: 62, creatinine: 0.9 }).met, []);
  assert.equal(apixabanCriteria({ ageYears: 82, weightKg: 58, creatinine: 1.0 }).correctDose, "2.5 mg twice daily");
  assert.equal(toHHMM(toMin("10:35") + 90), "12:05");
  assert.equal(fmtDur(85), "1 h 25 min");
});

test("rule-based medicine check flags the triple whammy and metformin in acute illness", () => {
  const meds = [{ name: "Ramipril", cls: ["acei"] }, { name: "Furosemide", cls: ["loop"] }, { name: "Diclofenac", cls: ["nsaid"] }, { name: "Aspirin", cls: ["antiplatelet"] }, { name: "Metformin", cls: ["metformin"] }];
  const f = medicineCheck(meds, { k: 5.1, creatinine: 1.5, creatinineBaseline: 1.3, spo2: 89, heartFailure: true });
  assert.ok(f.some((x) => /triple whammy/.test(x.detail) && x.severity === "High"));
  assert.ok(f.some((x) => /Metformin/.test(x.title) && /creatinine 1.3 → 1.5/.test(x.detail)));
  assert.equal(medicineCheck([{ name: "Atorvastatin", cls: [] }], {}).length, 0);
});

test("AJCC 8 colon stage groups and adjuvant guide", () => {
  assert.equal(colonStage("T3", "N1b", "M0"), "IIIB");
  assert.equal(colonStage("T2", "N0", "M0"), "I");
  assert.equal(colonStage("T4b", "N0", "M0"), "IIC");
  assert.equal(colonStage("T1", "N2a", "M0"), "IIIA");
  assert.equal(colonStage("T4a", "N2a", "M0"), "IIIC");
  assert.equal(colonStage("T3", "N2b", "M0"), "IIIC");
  assert.equal(colonStage("T3", "N1b", "M1b"), "IVB");
  assert.match(adjuvantGuide("T3", "N1b", "M0"), /3 months/);
  assert.match(adjuvantGuide("T4a", "N1b", "M0"), /6 months/);
});

test("ICU calculations", () => {
  assert.equal(anionGap({ na: 134, cl: 104, hco3: 9 }), 21);
  assert.deepEqual(kdigoStage(2.4, 1.02), { ratio: 2.35, stage: 2 });
  assert.equal(kdigoStage(1.4, 1.0).stage, 1);
  assert.equal(kdigoStage(4.1, 2.5).stage, 3);
  assert.equal(dkaInsulinRate(84), 8.4);
});

test("pre-auth room-rent deduction matches the hand-checked estimate", () => {
  const heads = [{ key: "room", label: "Room", rule: "room" }, { key: "hdu", label: "HDU", amount: 18000, days: 1, rule: "icu" }, { key: "ot", label: "OT", amount: 165000, rule: "proportional" }, { key: "dev", label: "Devices", amount: 72000, rule: "exempt" }, { key: "inv", label: "Investigations", amount: 28000, rule: "proportional" }, { key: "ph", label: "Pharmacy", amount: 38000, rule: "exempt" }, { key: "nm", label: "Consumables", amount: 9000, rule: "excluded" }, { key: "nu", label: "Nursing", amount: 15000, rule: "proportional" }];
  const deluxe = preauthEstimate({ heads, roomRate: 12000, roomDays: 5, sumInsured: 1000000, bonus: 200000 });
  assert.equal(deluxe.total, 405000);
  assert.equal(deluxe.payable, 351333);
  assert.equal(deluxe.patientShare, 53667);
  assert.equal(preauthEstimate({ heads, roomRate: 9500, roomDays: 5, sumInsured: 1000000 }).patientShare, 9000);
  assert.equal(preauthEstimate({ heads, roomRate: 12000, roomDays: 5, sumInsured: 1000000, bonus: 200000, includeBonus: true }).patientShare, 9000);
});

test("imaging helpers", () => {
  assert.match(adrenalRule(8).label, /Lipid-rich/);
  assert.match(adrenalRule(25).label, /Indeterminate/);
  assert.deepEqual(locateQuotes("abc left kidney xyz Right", [["left kidney"], ["Right", "missing"]]), [[4, 15, 0], [20, 25, 1]]);
});
