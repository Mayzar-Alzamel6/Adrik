/**
 * Local crisis detector for the thought-reframing tool.
 *
 * Runs before any text leaves the device and before any reframing is shown, in both AI and local mode.
 * It matches whole phrases (Modern Standard Arabic, Gulf, Egyptian, Levantine and English) about
 * suicide, self-harm and severe hopelessness, after removing everyday idioms such as «أموت من الضحك».
 * When in doubt it errs on the side of safety: a false alarm costs one gentle screen, a miss costs more.
 *
 * Part of the portable safety kit (see README.md): copy verbatim; no imports, no TypeScript-only syntax.
 */

export type CrisisKind = "suicide" | "self-harm" | "hopelessness";

export interface CrisisResult {
  risk: boolean;
  kind?: CrisisKind;
}

/** Fold spelling variants so «أبغى أموت» and «ابغي اموت» match the same pattern. */
export function normalizeForSafety(text: string): string {
  return ` ${text} `
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel, superscript alef, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation, hyphens, emoji → spaces
    .replace(/(\p{L})\1{2,}/gu, "$1") // stretched letters: «تعبببت», «sooo»
    .replace(/\s+/g, " ");
}

/* Everyday idioms that mention death without meaning it. Removed before matching. */
const BENIGN: RegExp[] = [
  // «أموت من الضحك»، «هموت م الجوع»، «بموت ضحك»، «رح موت من البرد»
  / (?:ا|ب|ه|ح|رح |راح |ح )?(?:موت|اموت|نموت|يموت|تموت) (?:من |م )?(?:ال)?(?:ضحك|جوع|عطش|برد|حر|ملل|فرح|فرحه|شوق|خوف|زهق|غيظ|حماس|نوم|كسل)/g,
  // «أموت فيك» (love), «أموت عليها»
  / (?:ا|ب|ه)?موت (?:فيك|فيكي|فيه|فيها|فيهم|عليك|عليكي|عليه|عليها|عليهم)/g,
  // «ميت جوع»، «ميتة من الضحك»، «مت من الضحك»
  / (?:ميت|ميته|مت|متت|موتني|قتلني|قتلتني) (?:من |م )?(?:ال)?(?:ضحك|جوع|عطش|تعب|نوم|برد|حر|ملل)/g,
  / dying (?:of|from) (?:laughter|laughing|hunger|boredom|the heat|the cold)/g,
  / (?:dying|dead|die) to (?:see|try|know|meet|hear|go|get)/g,
  / (?:i m |im |i am )?(?:dying|dead) (?:lol|haha|lmao)/g,
  / kill(?:ing)? (?:it|time) /g,
  / killing me (?:lol|haha|lmao)/g,
];

// Building blocks (all normalized: no hamza, ى→ي, ة→ه).
const WANT = "(?:ابي|ابغي|ابغا|ودي|بدي|بغيت|عايز|عاوز|عايزه|عاوزه|اريد|نفسي|حابب|حابه|اتمني|اتمنا|بتمني|كان ودي)";
const NOT_WANT = "(?:ما ابي|ما ابغي|مابي|مابغي|ما بدي|مابدي|مش عايز|مش عاوز|مش عايزه|مش عاوزه|مو عايز|لا اريد|لم اعد اريد|ما عاد ابي|ما عاد بدي|ما عدت ابي|ماعاد ابي|مش حابب|ما ودي|ماودي|مابغيت|ما بغيت)";
const LIVE = "(?:اعيش|عيش|احيا|اكمل حياتي|اكمل|العيش|الحياه|ان اعيش|ان احيا|ابقي عايش|اعيش بعد|اصحي بكره|اصحي)";
// «تعبت من نفسي» is ordinary self-criticism in this tool, so «نفسي» is deliberately not here.
const LIFE = "(?:الحياه|حياتي|العيشه|عيشتي|الدنيا|هالدنيا|هالحياه|هالعيشه|الوجود)";
const FUTURE = "(?:ا|ب|ه|ح|رح |راح |حا|بال)?";

const PATTERNS: { kind: CrisisKind; re: RegExp }[] = [
  // ---- Suicide (any form of the word is treated as a phrase on its own: it is never an idiom) ----
  { kind: "suicide", re: /(?:انتحر|انتحار|نتحر|ينتحر|تنتحر)/ },
  { kind: "suicide", re: new RegExp(` ${FUTURE}(?:قتل|اقتل|قتلت|موت|اموت|خلص علي|خلص على|اخلص علي|خلص من) نفسي`) },
  { kind: "suicide", re: new RegExp(` ${WANT} (?:ا|ان )?(?:موت|اموت|اقتل نفسي|انهي حياتي|اختفي|اختفا|انتهي|اروح من الدنيا|ارحل عن الدنيا|ارتاح من الدنيا|ارتاح من هالدنيا|ارتاح من الحياه|امشي من الدنيا|انام وما اصحي|انام وما اقوم|انام وما اصحاش|انام ومصحاش)`) },
  { kind: "suicide", re: / (?:ا|ب|ه|رح |راح )?(?:انهي|نهي|خلص) (?:حياتي|عمري|علي حياتي)/ },
  { kind: "suicide", re: / (?:ياريتني|يا ريتني|ريتني|ليتني|يا ليتني|ياريت|يا ريت|اتمني لو|اتمني اني|كان نفسي) (?:مت|اموت|ميت|ميته|ما انولدت|ما اتولدت|مااتولدتش|ما خلقت|لم اولد|لم اخلق|ما جيت للدنيا|ما جيت الدنيا)/ },
  { kind: "suicide", re: / (?:الموت|موتي) (?:احسن|افضل|ارحم|اريح|هو الحل|الحل الوحيد)/ },
  { kind: "suicide", re: / (?:احسن|افضل|ارحم) (?:لي |لو |اني )?(?:اموت|مت|ميت)/ },
  { kind: "suicide", re: / (?:افكر|بفكر|عم فكر|افكر جديا|صرت افكر|قاعد افكر|بقيت افكر) (?:في|ب|بال|في ال)?(?:الموت|موتي|اني اموت|ان اموت|اني انهي|ان انهي)/ },

  // ---- Self-harm ----
  { kind: "self-harm", re: new RegExp(` ${FUTURE}(?:اذي|اوذي|ااذي|اذيت|اوذيت|اجرح|جرح|جرحت|اضر|ضريت) نفسي`) },
  { kind: "self-harm", re: / (?:ايذا|ايذاء|اذيه|اذى|اذي|جرح) (?:ال)?نفس/ },
  { kind: "self-harm", re: new RegExp(` ${FUTURE}(?:اقطع|قطع|قطعت|اشطب|شطبت|اجرح|جرحت) (?:يدي|ايدي|ايدى|يدى|ايدا|عروقي|شراييني|معصمي|جسمي|جلدي|رجلي)`) },
  { kind: "self-harm", re: / (?:ابلع|بلعت|اخذ|اخد|باخد|ابي اخذ) (?:كل )?(?:الحبوب|حبوب|الدوا|الدواء|العلبه) (?:كلها|كله|مره وحده|مرة واحدة|كلهم)/ },

  // ---- Severe hopelessness ----
  { kind: "hopelessness", re: new RegExp(` ${NOT_WANT} ${LIVE}`) },
  { kind: "hopelessness", re: new RegExp(` (?:تعبت|زهقت|مليت|سئمت|سيمت|طفشت|قرفت|يئست|يايس|يايسه|كرهت) (?:من )?${LIFE}`) },
  { kind: "hopelessness", re: new RegExp(` ${LIFE} (?:ما لها|مالها|مالهاش|ملهاش|ما الها|مالا|ليس لها|بلا|بدون|ما فيها|مافيها|مفيهاش) (?:اي )?(?:معني|معنا|قيمه|لازمه|طعم|فايده)`) },
  { kind: "hopelessness", re: / (?:ما في|مافي|مفيش|ما فيه|لا يوجد|ليس هناك|لا) (?:اي )?(?:سبب|داعي|فايده|امل|شي) (?:ل|لان |عشان |يخليني )?(?:اعيش|عيش|العيش|الحياه|احيا|اكمل|يستاهل اعيش)/ },
  { kind: "hopelessness", re: / (?:محد|ما حد|مفيش حد|لا احد|ولا حد|ما رح حد|محدش) (?:رح |راح |هي|بي|سوف |سي)?(?:فتقدني|يفتقدني|تفتقدني|يحس بغيابي|يزعل علي|يهتم لو مت|يفرق معاه)/ },
  { kind: "hopelessness", re: / (?:الكل|الناس|اهلي|العالم) (?:رح |راح |سوف )?(?:(?:ي|بي|هي|سي|ح|حي)رتاح(?:وا|ون)?|(?:ي|بي|هي|سي)?كونوا احسن|(?:ي|بي|هي|سي)?كونون احسن|احسن) (?:لو|اذا|من غيري|بدوني|بلاي)/ },
  // «الجميع سيكونون أفضل لو لم أكن هنا»، «أحسن لهم من غيري»
  { kind: "hopelessness", re: / (?:افضل|احسن|ارتح|اريح) (?:لهم |لهن |لاهلي |للكل |للجميع )?(?:لو لم اكن|لو ما كنت|لو مش موجود|لو ما كنتش|لو ما انا موجود|لو اختفيت|من غيري|بدوني|بلاي|بغيابي)/ },
  { kind: "hopelessness", re: / (?:ما عاد|ماعاد|ما عدت|لم اعد|مش قادر|مو قادر|ما بقدر|ما اقدر|مقدرش|لا استطيع) (?:ان )?(?:اتحمل|اكمل|استحمل|استمر) (?:في |ب)?(?:الحياه|حياتي|اكثر|خلاص|العيشه|هالحياه)/ },
  { kind: "hopelessness", re: / (?:ابي|نفسي|بدي|عايز|اريد|ودي) (?:اختفي|اختفا|اختفي من الدنيا|اختفي من الوجود|اختفي للابد|اختفي عن الدنيا)/ },

  // ---- English ----
  { kind: "suicide", re: / (?:suicide|suicidal|kill myself|killing myself|end my life|ending my life|take my own life|taking my own life|end it all|ending it all|better off dead|wish i was dead|wish i were dead|wish i wasnt born|wish i was never born|wish i had never been born) / },
  { kind: "suicide", re: / (?:want|wanna|wanted|going|gonna|plan|planning) (?:to )?(?:die|kill myself|end it|disappear forever)/ },
  { kind: "self-harm", re: / (?:hurt|hurting|harm|harming|cut|cutting|burn|burning) (?:my ?self|myself)/ },
  { kind: "self-harm", re: / self (?:harm|harming|injury)|overdose|od on (?:my )?pills/ },
  { kind: "hopelessness", re: / (?:dont|do not|don t|no longer|dont even) want to (?:live|be alive|exist|wake up)/ },
  { kind: "hopelessness", re: / (?:no|nothing|no point|no reason) (?:to |in )?(?:live|living|go on|keep going)/ },
  { kind: "hopelessness", re: / (?:cant|can t|cannot) (?:go on|do this anymore|take it anymore|keep living)/ },
  { kind: "hopelessness", re: / (?:tired|sick) of (?:living|life|being alive|existing)/ },
  { kind: "hopelessness", re: / (?:everyone|they|my family|people) (?:would be|d be|will be) better (?:off )?without me/ },
  { kind: "hopelessness", re: / (?:life|living) (?:is|isnt|is not) (?:not )?worth (?:it|living)|not worth living/ },
  { kind: "hopelessness", re: / (?:want|wanna) to disappear/ },
];

// Arabic glues «و» and «ف» onto the next word («وأبي أموت», «فنفسي أموت»): every phrase that starts at a word
// boundary also matches right after one of them.
const MATCHERS = PATTERNS.map(({ kind, re }) => ({ kind, re: new RegExp(re.source.replace(/^ /, " [وف]?"), re.flags) }));

/** Checks every field the person wrote. Any match is a crisis: stop the exercise and offer support. */
export function detectCrisis(...texts: (string | undefined | null)[]): CrisisResult {
  let text = normalizeForSafety(texts.filter(Boolean).join(" \n "));
  for (const re of BENIGN) text = text.replace(re, " ");
  text = ` ${text.trim()} `;
  for (const { kind, re } of MATCHERS) {
    if (re.test(text)) return { risk: true, kind };
  }
  return { risk: false };
}
