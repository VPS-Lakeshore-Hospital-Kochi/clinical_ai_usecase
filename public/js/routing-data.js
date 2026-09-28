// Synthetic, anonymised front-office queue and roster for 25 Sep 2026 (routing flagship).
// Phone numbers are fictional placeholders; R3 and R8 share one on purpose.
export const QUEUE = [
  { id: "R1", channel: "WhatsApp", at: "07:12", from: "Son of a 72-year-old man", phone: "+91 90000 00101", text: "My father is 72. Blood in his stool for 2 weeks and he has lost weight. Which doctor?" },
  { id: "R2", channel: "Web form", at: "07:31", from: "Woman, 45", phone: "+91 90000 00102", text: "Sudden terrible headache 1 hour ago, worst ever, I vomited twice. Can I see a neurologist today?" },
  { id: "R3", channel: "WhatsApp", at: "07:40", from: "Man, 55", phone: "+91 90000 00103", text: "Right knee pain for 3 months, want an opinion on knee replacement. Have X-ray." },
  { id: "R4", channel: "Call centre", at: "07:52", from: "Mother of a 6-year-old boy", phone: "+91 90000 00104", text: "Wetting the bed again for 2 weeks, very thirsty, drinking a lot of water, looks thinner. GP appointment is next week." },
  { id: "R5", channel: "GP letter", at: "08:03", from: "GP referral, woman, 58", phone: "", text: "Hard 2 cm lump right breast, noticed 3 weeks ago. Please see urgently." },
  { id: "R6", channel: "WhatsApp", at: "08:09", from: "Man, 60, diabetic", phone: "+91 90000 00106", text: "Chest tightness when climbing stairs for a month, goes away with rest. No pain now." },
  { id: "R7", channel: "Email", at: "08:14", from: "Daughter of a woman with cirrhosis", phone: "+91 90000 00107", text: "Second opinion for liver transplant for my mother, cirrhosis. Have reports." },
  { id: "R8", channel: "Web form", at: "08:21", from: "Man, 55", phone: "+91 90000 00103", text: "Knee replacement consultation please." },
  { id: "R9", channel: "WhatsApp", at: "08:26", from: "Woman, 28, 34 weeks pregnant", phone: "+91 90000 00109", text: "Face and hands swollen since morning and headache. Is this normal?" },
];

// free: number of bookable slots (null = open 24 h). kind: emergency | clinic | callback.
export const ROSTER = [
  { id: "ED", service: "Emergency Department", clinician: "ED team", when: "24 h · ambulance 108", kind: "emergency", free: null },
  { id: "OBS-DAU", service: "Obstetric day-assessment unit", clinician: "Obstetric team", when: "24 h", kind: "emergency", free: null },
  { id: "PAED-ED", service: "Paediatric emergency", clinician: "Paediatric team", when: "24 h", kind: "emergency", free: null },
  { id: "PAED-OPD", service: "Paediatric OPD (same day)", clinician: "Paediatrician on duty", when: "Today 09:00–16:00", kind: "clinic", free: 4 },
  { id: "NEURO-AM", service: "Neurology OPD", clinician: "Consultant Neurologist 1", when: "Today 09:00–13:00", kind: "clinic", free: 2 },
  { id: "GI1", service: "Gastroenterology", clinician: "Consultant Gastroenterologist 1", when: "On leave until 30 Sep", kind: "clinic", free: 0, leave: true },
  { id: "GI2-TODAY", service: "Gastroenterology", clinician: "Consultant Gastroenterologist 2", when: "Today 14:00", kind: "clinic", free: 1 },
  { id: "GI2-MON", service: "Gastroenterology", clinician: "Consultant Gastroenterologist 2", when: "Mon 29 Sep", kind: "clinic", free: 3 },
  { id: "BREAST-THU", service: "Breast one-stop clinic", clinician: "Surgical oncology", when: "Thu 25 Sep (full)", kind: "clinic", free: 0 },
  { id: "BREAST-MON", service: "Breast one-stop clinic (overflow)", clinician: "Surgical oncology", when: "Mon 29 Sep 11:00", kind: "clinic", free: 1 },
  { id: "CARD-RAC", service: "Rapid-access chest-pain clinic", clinician: "Cardiology", when: "Today 14:00–16:00", kind: "clinic", free: 3 },
  { id: "ORTHO-TUE", service: "Arthroplasty clinic", clinician: "Orthopaedics", when: "Tue 30 Sep 10:30", kind: "clinic", free: 1 },
  { id: "TX-COORD", service: "Liver transplant coordinator", clinician: "Transplant coordinator", when: "Call-back within 24 h, then Wednesday clinic", kind: "callback", free: null },
];
