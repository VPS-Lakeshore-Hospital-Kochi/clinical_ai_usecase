import { test } from "node:test";
import assert from "node:assert/strict";
import { news2, news2Response, checkOrder, apixabanCriteria, toMin, toHHMM, fmtDur, medicineCheck, colonStage, adjuvantGuide, anionGap, kdigoStage, dkaInsulinRate, preauthEstimate, adrenalRule, locateQuotes, hba1cIfccToNgsp, glucoseMmolToMg, creatinineUmolToMg, egfrCkdEpi2021, holdCheck, basalNightBefore, addDays, daysInclusive, idealBodyWeight, adjustedBodyWeight, cockcroftGault, qtRisk, thresholdAlerts, trendAlerts, stoolTrend, STANDARD_THRESHOLDS, EPISODE_THRESHOLDS, cgmCheck, gmiGap, hypoRegimenRule, gestation, dateAtGestation, bpClass, preEclampsiaCheck, gdmControl, antiDStatus, screenRequest, findDuplicates, slotCheck } from "../public/js/clinical.js";
import { QUEUE, ROSTER } from "../public/js/routing-data.js";
import fs from "node:fs";

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

test("unit conversions and eGFR match the records digest", () => {
  assert.equal(hba1cIfccToNgsp(70), 8.6);
  assert.equal(glucoseMmolToMg(9.3), 168);
  assert.equal(creatinineUmolToMg(97), 1.1);
  assert.equal(egfrCkdEpi2021(1.1, 58, "male"), 78);
  assert.equal(egfrCkdEpi2021(1.23, 58, "male"), 68);
});

test("peri-operative holds and discharge dates", () => {
  assert.deepEqual([holdCheck("sglt2", "14 Aug 08:00", "19 Aug 08:00").hours, holdCheck("sglt2", "14 Aug 08:00", "19 Aug 08:00").ok], [120, true]);
  assert.equal(holdCheck("sglt2", "17 Aug 08:00", "19 Aug 08:00").ok, false);
  assert.equal(holdCheck("arb", "18 Aug 07:00", "19 Aug 08:00").hours, 25);
  assert.equal(basalNightBefore(12), 10);
  assert.equal(addDays("19 Aug", 28), "16 Sep");
  assert.equal(addDays("24 Aug", 14), "7 Sep");
  assert.equal(daysInclusive("24 Aug", "16 Sep"), 24);
});

test("pharmacy calculations for the ICU-to-ward transfer", () => {
  const ibw = idealBodyWeight(168, "male");
  const abw = adjustedBodyWeight(84, ibw);
  assert.equal(abw, 72.1);
  assert.equal(cockcroftGault({ age: 58, weightKg: abw, creatinine: 1.6 }), 51);
  const qt = qtRisk(478, "male", ["Ondansetron", "Domperidone", "Enoxaparin"]);
  assert.equal(qt.flag, true);
  assert.equal(qt.drugs.length, 2);
  assert.equal(qtRisk(430, "male", ["Ondansetron"]).flag, false);
});

test("remote monitoring: trend rules fire where single thresholds do not", () => {
  const hm = JSON.parse(fs.readFileSync(new URL("../data/patient.json", import.meta.url))).homeMonitoring;
  const single = hm.readings.flatMap((r) => thresholdAlerts(r, STANDARD_THRESHOLDS));
  assert.equal(single.length, 0);
  const trend = hm.readings.flatMap((_, i) => trendAlerts(hm.readings, i));
  assert.ok(trend.some((t) => /Weight down 1.0 kg/.test(t)));
  assert.ok(trend.some((t) => /HR up 18/.test(t)));
  assert.equal(stoolTrend(hm.stoolsPerDay).rising, true);
  assert.ok(hm.readings.flatMap((r) => thresholdAlerts(r, EPISODE_THRESHOLDS)).length > 0);
});

test("CGM consensus targets and the hypoglycaemia regimen rule", () => {
  const c = cgmCheck({ ranges: { veryLow: 2, low: 5, inRange: 41, high: 34, veryHigh: 18 }, cv: 38 });
  assert.equal(c.met, 0);
  assert.equal(c.hypoFirst, true);
  assert.deepEqual(c.rows.map((r) => r.value), [41, 7, 2, 52, 18, 38]);
  assert.equal(cgmCheck({ ranges: { veryLow: 0, low: 2, inRange: 75, high: 18, veryHigh: 5 }, cv: 30 }).met, 5);
  assert.deepEqual(gmiGap(8.0, 9.1), { gap: 1.1, discordant: true });
  assert.equal(gmiGap(7.2, 7.5).discordant, false);
  assert.deepEqual(hypoRegimenRule({ below70: 7, below54: 2, onSulfonylurea: true, basalUnits: 16 }), { triggered: true, stopSulfonylurea: true, basalRange: [13, 14] });
  assert.equal(hypoRegimenRule({ below70: 2, below54: 0, onSulfonylurea: true, basalUnits: 16 }).triggered, false);
});

test("gestational age, BP classes, pre-eclampsia screen, GDM targets and anti-D", () => {
  assert.equal(gestation("2026-12-01", "2026-09-24").label, "30+2");
  assert.equal(dateAtGestation("2026-12-01", 28), "2026-09-08");
  assert.equal(dateAtGestation("2026-12-01", 7, 6), "2026-04-20");
  assert.equal(bpClass(144, 94), "hypertension");
  assert.equal(bpClass(158, 112), "severe");
  assert.equal(bpClass(132, 84), "normal");
  const base = { sbp: 144, dbp: 94, pcr: 0.28, platelets: 182, alt: 28, creatinine: 0.6 };
  assert.equal(preEclampsiaCheck(base).category, "Gestational hypertension");
  assert.equal(preEclampsiaCheck({ ...base, pcr: 0.34 }).category, "Pre-eclampsia");
  assert.equal(preEclampsiaCheck({ ...base, sbp: 162 }).category, "Pre-eclampsia with severe features");
  assert.equal(preEclampsiaCheck({ ...base, platelets: 92 }).category, "Pre-eclampsia with severe features");
  assert.equal(preEclampsiaCheck({ ...base, sbp: 128, dbp: 80 }).category, "Normal blood pressure");
  assert.match(preEclampsiaCheck({ ...base, ratio: 24 }).ratioNote, /unlikely/);
  assert.deepEqual(gdmControl({ fasting: [98, 105], oneHour: [150, 165] }), { fastingOk: false, postOk: false });
  assert.equal(antiDStatus({ rhNegative: true, partner: "unknown", given: false, gaWeeks: 30 }).status, "Overdue");
  assert.equal(antiDStatus({ rhNegative: true, partner: "negative", given: false, gaWeeks: 30 }).needed, false);
});

test("routing red-flag screen, duplicates and slot checks", () => {
  const flags = Object.fromEntries(QUEUE.map((r) => [r.id, screenRequest(`${r.from}: ${r.text}`).map((f) => f.id)]));
  assert.deepEqual(flags, { R1: ["rectal-bleeding"], R2: ["thunderclap"], R3: [], R4: ["new-diabetes"], R5: ["breast-lump"], R6: ["chest"], R7: [], R8: [], R9: ["pre-eclampsia"] });
  assert.deepEqual(findDuplicates(QUEUE.filter((r) => r.phone)), [["R3", "R8"]]);
  const slot = (id) => ROSTER.find((s) => s.id === id);
  assert.equal(slotCheck(slot("GI1"), "≤1 week").ok, false);
  assert.equal(slotCheck(slot("NEURO-AM"), "Emergency").ok, false);
  assert.equal(slotCheck(slot("ED"), "Emergency").ok, true);
  assert.equal(slotCheck(slot("BREAST-THU"), "≤1 week").ok, false);
  assert.equal(slotCheck(slot("GI2-TODAY"), "≤1 week", 1).ok, false);
  assert.equal(slotCheck(undefined, "Routine").ok, false);
});
