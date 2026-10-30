"use client";

import { useState } from "react";
import { FileBarChart, Send } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/primitives";
import {
  REPORT_CONTACT_URL,
  buildUsageReport,
  shareUsageReport,
  summarizeUsageReport,
  usageReportFileName,
  type UsageReport,
} from "@/lib/usageReport";

export function UsageReportPanel() {
  const [note, setNote] = useState("");
  const [report, setReport] = useState<UsageReport | null>(null);
  const [result, setResult] = useState<"shared" | "downloaded" | null>(null);

  const prepare = () => {
    setReport(buildUsageReport(note));
    setResult(null);
  };

  const send = async () => {
    if (!report) return;
    const outcome = await shareUsageReport(report);
    if (outcome !== "cancelled") setResult(outcome);
  };

  return (
    <div>
      <div className="rounded-xl bg-surface-2 p-4 text-ui text-ink-2 leading-relaxed">
        التقرير أرقام فقط: أيام نشاطك، وعدد جلساتك ومدتها، ونسبة إنجاز أولوياتك، والأدوات التي استخدمتها.
        <span className="block mt-1 text-ink font-medium">
          لا يحتوي أي نص كتبته: لا مهامك، ولا أفكارك، ولا مشاعرك، ولا اسمك.
        </span>
      </div>

      <div className="mt-4">
        <Label htmlFor="usage-note" hint="اختياري. هذه الملاحظة وحدها تُرسل كما كتبتها.">
          ملاحظة للمؤسس
        </Label>
        <Textarea
          id="usage-note"
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setReport(null);
          }}
          placeholder="ما الذي أعجبك؟ وما الذي أزعجك أو لم تفهمه؟"
        />
      </div>

      {!report ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={prepare}>
          <FileBarChart className="w-4 h-4" />
          جهّز التقرير
        </Button>
      ) : (
        <div className="mt-4 rounded-xl border border-line p-4">
          <p className="text-ui font-medium text-ink">هذا ما سيُرسل:</p>
          <ul className="mt-2 space-y-1 text-ui text-ink-2 list-disc pr-5">
            {summarizeUsageReport(report).map((line) => (
              <li key={line}>{line}</li>
            ))}
            {report.note && <li>ملاحظتك كما كتبتها</li>}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-small text-brand font-medium">عرض الملف كاملاً</summary>
            <pre dir="ltr" className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 text-caption text-ink">
              {JSON.stringify(report, null, 2)}
            </pre>
          </details>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={send}>
              <Send className="w-4 h-4" />
              أرسل التقرير
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReport(null)}>
              إلغاء
            </Button>
          </div>

          {result === "shared" && <p className="mt-3 text-ui text-brand">شكراً لك! وصل التقرير إلى التطبيق الذي اخترته.</p>}
          {result === "downloaded" && (
            <div className="mt-3 text-ui text-ink-2 leading-relaxed">
              نُزّل الملف <span dir="ltr" className="text-ink">{usageReportFileName(report)}</span>. أرسله للمؤسس عبر
              واتساب أو البريد، وشكراً لك!
              {REPORT_CONTACT_URL && (
                <a
                  href={REPORT_CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("secondary", "sm", "mt-3 flex w-fit")}
                >
                  افتح محادثة المؤسس
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
