"use client";

import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { applyBackup, downloadBackup, parseBackup, summarize, type BackupFile } from "@/lib/backup";
import { Button } from "@/components/ui/Button";

const LEGACY_EXPORT_SNIPPET =
  "const d={};Object.keys(localStorage).filter(k=>k.startsWith('adrik-omrak')).forEach(k=>d[k]=localStorage.getItem(k));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download='zero-step-backup.json';a.click();";

export function BackupPanel({ allowExport = true, legacyOpen = false }: { allowExport?: boolean; legacyOpen?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: BackupFile["data"]; summary: ReturnType<typeof summarize> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setPending(null);
    try {
      const data = parseBackup(await file.text());
      setPending({ data, summary: summarize(data) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر قراءة الملف.");
    }
  };

  const copySnippet = async () => {
    await navigator.clipboard.writeText(LEGACY_EXPORT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const s = pending?.summary;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allowExport && (
          <Button variant="secondary" size="sm" onClick={downloadBackup}>
            <Download className="w-4 h-4" />
            تنزيل نسخة احتياطية
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" />
          استيراد نسخة
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickFile} aria-label="ملف النسخة الاحتياطية" />
      </div>

      {error && <p className="mt-3 text-ui text-danger">{error}</p>}

      {s && pending && (
        <div className="mt-4 rounded-xl bg-surface-2 p-4">
          <p className="text-ui text-ink font-medium">جاهزة للاستيراد:</p>
          <p className="text-ui text-ink-2 mt-1 leading-relaxed">
            القيم: {s.values} · العادات: {s.habits} · الأهداف: {s.goals} · أصوات الهوية: {s.votes} · أسابيع مُراجَعة: {s.weeks} ·
            مواعيد: {s.events} · مسارات تعلّم: {s.skills} · مهام: {s.tasks} · مشاريع: {s.projects}
          </p>
          <p className="text-small text-danger mt-2">ستحلّ محل بياناتك الحالية في هذا التطبيق.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => applyBackup(pending.data)}>
              استيراد الآن
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      <details className="mt-5" open={legacyOpen}>
        <summary className="cursor-pointer text-ui text-brand font-medium">نقل بياناتك من النسخة القديمة (المنفذ 3333)</summary>
        <ol className="mt-3 space-y-2 text-ui text-ink-2 list-decimal pr-5 leading-relaxed">
          <li>
            افتح النسخة القديمة كالمعتاد، أو افتح في Edge العنوان <span dir="ltr" className="text-ink">localhost:3333</span>.
          </li>
          <li>اضغط F12 ثم افتح تبويب Console.</li>
          <li>
            الصق هذا السطر واضغط Enter. إن رفض Edge اللصق، اكتب <span dir="ltr" className="text-ink">allow pasting</span> واضغط Enter ثم الصق من جديد.
          </li>
        </ol>
        <div className="mt-2 flex items-start gap-2">
          <code dir="ltr" className="flex-1 block text-caption text-ink bg-surface-2 rounded-lg p-3 break-all select-all">
            {LEGACY_EXPORT_SNIPPET}
          </code>
          <Button variant="ghost" size="sm" onClick={copySnippet} className="shrink-0">
            {copied ? "نُسخ" : "نسخ"}
          </Button>
        </div>
        <p className="mt-2 text-ui text-ink-2">
          سيُنزَّل ملف <span dir="ltr" className="text-ink">zero-step-backup.json</span>. اختره من زر «استيراد نسخة».
        </p>
      </details>
    </div>
  );
}
