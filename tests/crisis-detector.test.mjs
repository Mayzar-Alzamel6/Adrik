// Run with: npm test   (node --test, no extra dependencies; Node strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCrisis } from "../src/lib/safety/crisis-detector.ts";

const MUST_FLAG = [
  // الفصحى
  "أفكر في الانتحار منذ أيام",
  "لا أريد أن أعيش بعد اليوم",
  "لم أعد أريد الحياة",
  "أتمنى لو أموت",
  "ليتني لم أولد",
  "أريد أن أؤذي نفسي",
  "الحياة ليس لها معنى",
  "لا أستطيع أن أتحمل الحياة أكثر",
  "الموت أرحم من هذا",
  "لا أحد سيفتقدني",
  "الجميع سيكونون في حال أفضل لو لم أكن هنا",
  // الخليجي
  "ما أبي أعيش",
  "أبي أموت وأرتاح",
  "تعبت من الحياة",
  "أبي أختفي",
  "ودي أموت",
  "أبغى أنهي حياتي",
  "مليت من حياتي وما عاد أبي أكمل",
  "الكل بيرتاح لو مت",
  // المصري
  "نفسي أموت",
  "مش عايز أعيش خلاص",
  "هموت نفسي",
  "زهقت من الدنيا",
  "الدنيا مالهاش لازمة",
  "هخلص على نفسي",
  "ياريتني ما اتولدت",
  // الشامي
  "ما بدي عيش",
  "بدي اقطع إيدي",
  // English
  "I want to die",
  "I'm thinking about suicide",
  "I want to kill myself",
  "I don't want to live anymore",
  "everyone would be better off without me",
  "I keep hurting myself",
  "I can't go on like this",
  "tired of living",
  // «و» / «ف» glued to the phrase
  "مليت وأبي أختفي",
  "تعبت وما أبي أعيش",
  "خلاص فنفسي أموت",
  // Spelling noise
  "تعبببت من الحياااة",
  "أبـــي أمـوت",
];

const MUST_IGNORE = [
  "أموت من الضحك على هذا المقطع",
  "ميت جوع، ما أكلت من الصبح",
  "هموت من الجوع",
  "بموت فيك يا شوكولاتة",
  "ضاع اليوم كله، أنا لا أنجز شيئاً أبداً",
  "أنا فاشل في إدارة وقتي",
  "تعبت من الشغل اليوم",
  "زهقت من نفسي ومن كسلي",
  "مش قادر أركز في المذاكرة",
  "I'm dying to see the new movie",
  "this deadline is killing me lol",
  "I'm so tired of this project",
  "خلصت الملف أخيراً",
  "أبي أخلص المهمة اليوم",
  "المشروع أفضل لو رحت للمكتب بدري",
  "ودي أخلص الشغل بدري وأرتاح",
];

for (const text of MUST_FLAG) {
  test(`flags: ${text}`, () => {
    assert.equal(detectCrisis(text).risk, true);
  });
}

for (const text of MUST_IGNORE) {
  test(`ignores: ${text}`, () => {
    assert.equal(detectCrisis(text).risk, false);
  });
}

test("checks every field, not only the thought", () => {
  assert.equal(detectCrisis("تأخرت عن العمل", "", "حزن", "ما أبي أعيش").risk, true);
});

test("an idiom does not hide a real signal in the same text", () => {
  assert.equal(detectCrisis("أموت من الضحك بس بصراحة أفكر في الانتحار").risk, true);
});
