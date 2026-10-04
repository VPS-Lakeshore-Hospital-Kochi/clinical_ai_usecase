import { test } from "node:test";
import assert from "node:assert/strict";
import { news2, news2Response, checkOrder, apixabanCriteria, toMin, toHHMM, fmtDur, medicineCheck, colonStage, adjuvantGuide, anionGap, kdigoStage, dkaInsulinRate, preauthEstimate, adrenalRule, locateQuotes, hba1cIfccToNgsp, glucoseMmolToMg, creatinineUmolToMg, egfrCkdEpi2021, holdCheck, basalNightBefore, addDays, daysInclusive, idealBodyWeight, adjustedBodyWeight, cockcroftGault, qtRisk, thresholdAlerts, trendAlerts, stoolTrend, STANDARD_THRESHOLDS, EPISODE_THRESHOLDS, cgmCheck, gmiGap, hypoRegimenRule, gestation, dateAtGestation, bpClass, preEclampsiaCheck, gdmControl, antiDStatus, screenRequest, findDuplicates, slotCheck, oxfordKneeBand, tkaReadiness, rcri, periopPathway, minsCheck, kdigoRisk, ckdConfirmDate, capecitabineBand, oxaliplatinBand, metforminBand, contrastBand, inr, billChecks, claimReconcile, evidenceFound, labTrend, readability, jargonCheck, survivalCheck, rehabTrafficLight, meld3, childPugh, milanCriteria, donorChecks, gdmtGaps, titrationCheck, hfHoldRule, arniEarliest, washoutOk, hfIronDeficient, fcmTotalDose, crtEligibility, weightAlarm, journeyIntervals } from "../public/js/clinical.js";
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

test("TKA readiness gate and Oxford Knee Score bands", () => {
  assert.equal(oxfordKneeBand(17), "severe");
  assert.equal(oxfordKneeBand(34), "mild to moderate");
  const base = { hba1c: 9.1, hb: 10.2, bmi: 31.2, nsaidStopped: true, giResult: "pending", dental: false, skin: false, mrsa: false };
  assert.equal(tkaReadiness(base).verdict, "Defer pending workup");
  assert.equal(tkaReadiness({ ...base, giResult: "cancer" }).verdict, "Defer pending workup");
  assert.equal(tkaReadiness({ ...base, giResult: "clear" }).verdict, "Proceed after optimisation");
  assert.equal(tkaReadiness({ ...base, giResult: "clear", hba1c: 7.6, hb: 13.2, dental: true, skin: true, mrsa: true }).verdict, "Proceed");
  assert.equal(tkaReadiness({ ...base, giResult: "clear", hba1c: 8.0, hb: 13.2, dental: true, skin: true, mrsa: true }).open, 1);
});

test("RCRI, peri-operative pathway and MINS check", () => {
  const f = { highRiskSurgery: true, insulin: true };
  assert.deepEqual(rcri(f), { points: 2, lee: 6.6, duceppe: 10.1, elevated: true });
  assert.equal(rcri({ ...f, ihd: true }).lee, 11);
  assert.equal(rcri({}).points, 0);
  assert.equal(periopPathway({ symptomatic: true, rcriPoints: 2, mets: "<4", ntprobnp: 180 }).testing, true);
  assert.equal(periopPathway({ symptomatic: false, rcriPoints: 2, mets: "≥4" }).testing, false);
  assert.match(periopPathway({ symptomatic: false, rcriPoints: 2, mets: "<4", ntprobnp: 180 }).text, /NT-proBNP <300/);
  assert.equal(periopPathway({ symptomatic: false, rcriPoints: 2, mets: "<4", ntprobnp: 450 }).testing, true);
  assert.deepEqual(minsCheck(6, 14), { rise: 8, injury: true });
  assert.equal(minsCheck(6, 9).injury, false);
});

test("KDIGO grid, CKD confirmation date and renal dose bands", () => {
  assert.deepEqual(kdigoRisk(85, 38), { g: "G2", a: "A2", risk: "moderate" });
  assert.deepEqual(kdigoRisk(40, 350), { g: "G3b", a: "A3", risk: "very high" });
  assert.equal(kdigoRisk(95, 12).risk, "low");
  assert.equal(ckdConfirmDate("2026-07-06"), "2026-10-06");
  assert.equal(capecitabineBand(81).pct, 100);
  assert.equal(capecitabineBand(50).pct, 75);
  assert.equal(capecitabineBand(29).dose, "Contraindicated");
  assert.equal(oxaliplatinBand(29), "Reduce dose");
  assert.equal(metforminBand(40), "Maximum 1000 mg a day");
  assert.match(contrastBand(85), /No prophylactic/);
  assert.match(contrastBand(25), /High risk/);
});

test("bill checks, claim reconciliation and evidence matching", () => {
  assert.equal(inr(390200), "₹3,90,200");
  const lines = [{ id: "a", item: "Stress echocardiogram", amount: 6500, date: "2026-08-11" }, { id: "b", item: "Stress echocardiogram", amount: 6500, date: "2026-08-11" }, { id: "c", item: "Room", amount: 47500, date: "2026-08-18" }];
  assert.deepEqual(billChecks(lines, "2026-08-18"), { duplicates: ["b"], preAdmission: ["a", "b"], total: 60500 });
  const findings = [{ kind: "remove", amount: 6500 }, { kind: "move", amount: 6500 }, { kind: "move", amount: 9800 }, { kind: "add", amount: 4500 }, { kind: "add", amount: 3600 }, { kind: "add", amount: 2400 }];
  const all = claimReconcile({ draftTotal: 402500, findings: findings.map((f) => ({ ...f, accepted: true })), patientPayable: 9000, approval: 385000 });
  assert.deepEqual(all, { corrected: 390200, insurer: 381200, preHospitalisation: 16300, headroom: 3800, enhancement: 0 });
  const noDup = claimReconcile({ draftTotal: 402500, findings: findings.map((f, i) => ({ ...f, accepted: i !== 0 })), patientPayable: 9000, approval: 385000 });
  assert.equal(noDup.enhancement, 2700);
  assert.equal(evidenceFound("Allergy: sulfonamides.", "allergy: sulfonamides"), true);
  assert.equal(evidenceFound("Allergy: sulfonamides.", "sepsis"), false);
});

test("lab trends, readability, jargon and survival checks", () => {
  assert.deepEqual(labTrend(2.1, 6.8, { high: 5 }), { flag: "", delta: -4.7, direction: "down" });
  assert.equal(labTrend(11.2, 10.9, { low: 13, high: 17 }).flag, "L");
  assert.equal(labTrend(11.2, 10.9, { low: 13, high: 17 }).direction, "up");
  assert.equal(labTrend(1.0, 1.0, { high: 1.3 }).direction, "stable");
  assert.ok(readability("Keep taking your medicines. Bring this sheet to the appointment.").grade < 6);
  assert.ok(readability("Histopathological examination demonstrated moderately differentiated adenocarcinoma infiltrating pericolorectal adipose tissue with nodal involvement.").grade > 14);
  assert.deepEqual(jargonCheck("The adenocarcinoma was R0.").map((j) => j.term), ["adenocarcinoma", "R0"]);
  assert.deepEqual(jargonCheck("Your cancer was removed."), []);
  assert.equal(survivalCheck("5-year survival is 70% of patients").length, 2);
  assert.equal(survivalCheck("Your doctors will check it regularly.").length, 0);
});

test("rehab traffic light", () => {
  const day1 = { temp: 36.8, anc: 1.9, platelets: 142, glucose: 212, looseStools: 1, chest: "none", kneePain: 6, dizzy: "none" };
  assert.equal(rehabTrafficLight(day1).overall, "green");
  assert.equal(rehabTrafficLight({ ...day1, temp: 38.2 }).overall, "red");
  assert.equal(rehabTrafficLight({ ...day1, looseStools: 3 }).overall, "amber");
  assert.equal(rehabTrafficLight({ ...day1, glucose: 320 }).overall, "red");
  assert.equal(rehabTrafficLight({ ...day1, glucose: 270 }).overall, "amber");
  assert.equal(rehabTrafficLight({ ...day1, platelets: 90 }).overall, "amber");
  assert.equal(rehabTrafficLight({ ...day1, kneePain: 7 }).overall, "amber");
  assert.equal(rehabTrafficLight({ ...day1, dizzy: "fall" }).session, "Skip today's session and call the care team");
});

test("MELD 3.0, Child-Pugh, Milan and living-donor checks", () => {
  const anitha = { female: true, bilirubin: 3.4, sodium: 131, inr: 1.9, creatinine: 1.3, albumin: 2.6 };
  const m = meld3(anitha);
  assert.equal(m.score, 26);
  assert.ok(Math.abs(m.raw - 26.06) < 0.05);
  assert.equal(meld3({ ...anitha, sodium: 120 }).score, meld3({ ...anitha, sodium: 125 }).score);
  assert.deepEqual(childPugh({ bilirubin: 3.4, albumin: 2.6, inr: 1.9, ascites: "moderate", encephalopathy: "1-2" }), { score: 13, cls: "C", parts: [["Bilirubin", 3], ["Albumin", 3], ["INR", 2], ["Ascites", 3], ["Encephalopathy", 2]] });
  assert.equal(childPugh({ bilirubin: 1.2, albumin: 3.8, inr: 1.1, ascites: "none", encephalopathy: "none" }).cls, "A");
  assert.equal(milanCriteria({ lesions: [2.4], vascularInvasion: false, extrahepatic: false }).within, true);
  assert.equal(milanCriteria({ lesions: [2.4, 3.5], vascularInvasion: false, extrahepatic: false }).within, false);
  const d = donorChecks({ graftMl: 830, totalMl: 1580, recipientKg: 58, donorAbo: "O", recipientAbo: "B", fatPct: 4 });
  assert.equal(d.grwr, 1.43);
  assert.equal(d.remnant, 47.5);
  assert.equal(d.ok, true);
  assert.equal(donorChecks({ graftMl: 830, totalMl: 1580, recipientKg: 64, donorAbo: "O", recipientAbo: "B", fatPct: 4 }).grwr, 1.3);
  assert.equal(donorChecks({ graftMl: 1150, totalMl: 1580, recipientKg: 58, donorAbo: "O", recipientAbo: "B", fatPct: 4 }).ok, false);
  assert.equal(donorChecks({ graftMl: 830, totalMl: 1580, recipientKg: 58, donorAbo: "A", recipientAbo: "B", fatPct: 4 }).ok, false);
});

test("heart failure GDMT gaps, safety checks, washout, iron and CRT", () => {
  const gaps = gdmtGaps([{ name: "Ramipril", mgPerDay: 2.5 }, { name: "Metoprolol succinate", mgPerDay: 25 }]);
  assert.deepEqual(gaps.map((g) => [g.pct, g.gap]), [[25, "Large"], [13, "Large"], [0, "Missing"], [0, "Missing"]]);
  const v = { sbp: 108, hr: 92, k: 4.8, egfr: 55, creatRisePct: 0, congested: true };
  assert.equal(titrationCheck("sglt2", v).ok, true);
  assert.equal(titrationCheck("arni", v).ok, true);
  assert.equal(titrationCheck("mra", v).ok, true);
  assert.equal(titrationCheck("mra", { ...v, k: 5.6 }).ok, false);
  assert.equal(titrationCheck("bb", v).ok, false);
  assert.equal(titrationCheck("bb", { ...v, congested: false }).ok, true);
  assert.equal(titrationCheck("arni", { ...v, sbp: 96 }).ok, false);
  assert.equal(hfHoldRule(5.6, 10), true);
  assert.equal(arniEarliest("26 Sep 08:00"), "27 Sep 20:00");
  assert.equal(washoutOk("26 Sep 08:00", "28 Sep 08:00"), true);
  assert.equal(washoutOk("26 Sep 08:00", "27 Sep 08:00"), false);
  assert.equal(hfIronDeficient(62, 14), true);
  assert.equal(hfIronDeficient(150, 25), false);
  assert.equal(hfIronDeficient(150, 18), true);
  assert.equal(fcmTotalDose(11.8, 69.5), 1000);
  assert.equal(crtEligibility({ lvef: 30, qrs: 156, lbbb: true }).cls, "I");
  assert.equal(crtEligibility({ lvef: 40, qrs: 156, lbbb: true }).eligible, false);
  const w = [68.0, 68.3, 68.9, 69.3, 69.5].map((kg) => ({ kg }));
  assert.deepEqual(weightAlarm(w, 68.0), { overDry: 1.5, gain2: 0.2, weekGain: 1.5, alarm: false });
});

test("journey intervals from Thomas's timeline", () => {
  const { timeline } = JSON.parse(fs.readFileSync(new URL("../data/patient.json", import.meta.url)));
  const rows = journeyIntervals(timeline);
  assert.deepEqual(rows.map((r) => r.days), [27, 21, 22, 10, 47]);
  assert.deepEqual(rows.map((r) => r.ok), [null, true, true, null, false]);
});
