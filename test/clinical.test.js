import { test } from "node:test";
import assert from "node:assert/strict";
import { news2, news2Response, checkOrder, apixabanCriteria, toMin, toHHMM, fmtDur } from "../public/js/clinical.js";

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
