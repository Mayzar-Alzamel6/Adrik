import { YearMatrix52 } from "@/components/audit/YearMatrix52";
import { ValueWeekPanel } from "@/components/review/ValueWeekPanel";
import { CompletionPanel } from "@/components/review/CompletionPanel";
import { CoachReviewPanel } from "@/components/review/CoachReviewPanel";

export const metadata = { title: "المراجعة الأسبوعية" };

export default function ReviewPage() {
  return (
    <div className="space-y-6 animate-rise-in">
      <header>
        <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink">المراجعة الأسبوعية</h1>
        <p className="text-ink-2 mt-1 max-w-xl">
          كل جمعة: نسبة إنجاز صادقة، ووقت التشتت، ومستوى فعلك. أسبوعاً بعد أسبوع، ترى عامك كما هو.
        </p>
      </header>
      <CompletionPanel />
      <CoachReviewPanel />
      <YearMatrix52 />
      <ValueWeekPanel />
    </div>
  );
}
