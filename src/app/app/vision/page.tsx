import { VisionScreen } from "@/components/vision/VisionScreen";

export const metadata = { title: "خريطة الرؤية" };

export default function VisionPage() {
  return (
    <div className="space-y-6 animate-rise-in">
      <header>
        <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink">خريطة الرؤية</h1>
        <p className="text-ink-2 mt-1 max-w-xl">
          من قيمك إلى أولوية اليوم في صفحة واحدة. ترى كل خيط، وترى أين ينقطع.
        </p>
      </header>
      <VisionScreen />
    </div>
  );
}
