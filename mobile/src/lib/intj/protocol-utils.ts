export interface BugDefinition {
  type: "BUG_A" | "BUG_B" | "BUG_C";
  title: string;
  problem: string;
  patch: string;
}

export const BUG_DEFINITIONS: BugDefinition[] = [
  {
    type: "BUG_A",
    title: "متلازمة الأرانب الفكرية (Rabbit Holes)",
    problem: "الاستغراق في تحسينات جانبية أو قراءة مقالات ومصادر غير مجدولة أثناء الكتلة.",
    patch: "تراجع فوراً إلى مخرج المهمة الرئيسي (Deliverable) واحذف أو فرغ الفكرة الجانبية في سلة الأفكار.",
  },
  {
    type: "BUG_B",
    title: "الشلل التحليلي (Analysis Paralysis)",
    problem: "المبالغة في التفكير والتخطيط بدلاً من البدء الفعلي في إنتاج المخرج.",
    patch: "أنتج أصغر مسودة غير مكتملة وبدائية جداً (Ugly Draft) خلال 5 دقائق لتكسر الجمود.",
  },
  {
    type: "BUG_C",
    title: "استنزاف الطاقة والاحتكاك العالي (Friction / Fatigue)",
    problem: "انخفاض مفاجئ في التركيز أو مواجهة تعقيد غير متوقع يسبب التشتت.",
    patch: "خذ استراحة إلزامية لمدة 10 دقائق بعيداً عن الشاشة، ثم خفّض نطاق المخرج إلى النصف.",
  },
];

export function formatTimerSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function calculateBlockProgress(remainingSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  const elapsed = totalSeconds - Math.max(0, remainingSeconds);
  const progress = elapsed / totalSeconds;
  return Math.min(1, Math.max(0, progress));
}

export function validateContract(contract: { deliverable: string; doneWhen: string }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!contract.deliverable || !contract.deliverable.trim()) {
    errors.push("مخرج التسليم (Deliverable) إلزامي.");
  }
  if (!contract.doneWhen || !contract.doneWhen.trim()) {
    errors.push("شرط الإنجاز الثنائي (Done When) إلزامي.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
