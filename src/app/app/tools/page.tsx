import { ToolsGrid } from "@/components/journey/ToolsGrid";

export const metadata = { title: "الأدوات" };

export default function ToolsPage() {
  return (
    <div className="space-y-10 animate-rise-in">
      <header>
        <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink">الأدوات</h1>
        <p className="text-ink-2 mt-1 max-w-xl">
          أدوات منهجية لكل لحظة في يومك. استخدم ما تحتاجه فقط، حين تحتاجه.
        </p>
      </header>

      <ToolsGrid />
    </div>
  );
}
