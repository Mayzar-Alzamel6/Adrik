"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Languages, Layers } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { Card, IconTile, SectionHeader, SegmentedControl } from "@/components/ui/primitives";

const MINUTES = ["15", "30", "60", "90"] as const;
const DAYS = ["5", "6", "7"] as const;
/** The window the "real pace" is measured over. */
const PACE_DAYS = 14;
const ETA_FORMAT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" });

/** "A little, consistently": projects what a steady daily block adds up to over a year. */
export const QalilDaimWidget: React.FC = () => {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const skills = useAppStore((s) => s.skills);
  const valueData = useValueData();
  const recent = useMemo(() => projectMinutesSince(PACE_DAYS, valueData), [valueData]);
  const since = Date.now() - PACE_DAYS * 86400000;
  const recentFocus = timeEntries
    .filter((t) => t.category !== "ESCAPE" && Date.parse(t.startTime) >= since)
    .reduce((a, t) => a + t.durationMinutes, 0);
  const dailyPace = Math.round(recentFocus / PACE_DAYS);
  const paceYearHours = Math.round((dailyPace * 365) / 60);
  const openSkills = skills.filter((s) => s.loggedHours < s.targetHours);
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>("60");
  const [days, setDays] = useState<(typeof DAYS)[number]>("6");

  const yearlyHours = Math.round((Number(minutes) * Number(days) * 52) / 60);
  const loggedHours = Math.round((timeEntries.filter((t) => t.category !== "ESCAPE").reduce((a, t) => a + t.durationMinutes, 0) / 60) * 10) / 10;

  const outcomes = [
    { icon: BookOpen, value: Math.floor(yearlyHours / 8), unit: "كتاباً", text: "بمعدل 8 ساعات قراءة للكتاب" },
    { icon: GraduationCap, value: Math.floor(yearlyHours / 40), unit: "دورة مهنية", text: "بمعدل 40 ساعة للدورة الكاملة" },
    {
      icon: Languages,
      value: Math.min(100, Math.round((yearlyHours / 400) * 100)),
      unit: "%",
      text: "من الطريق إلى مستوى متوسط في لغة جديدة (نحو 400 ساعة)",
    },
  ];

  return (
    <div className="space-y-6">
      <Card as="section" className="p-5 sm:p-8">
        <SectionHeader title="احسب أثر عادتك" description="«قليلٌ دائم خيرٌ من كثيرٍ منقطع» — بالأرقام." />
        <div className="mt-6 grid sm:grid-cols-2 gap-5">
          <div>
            <p className="text-ui font-medium text-ink mb-2">دقائق يومياً</p>
            <SegmentedControl value={minutes} onChange={setMinutes} options={MINUTES.map((m) => ({ value: m, label: `${m} د` }))} />
          </div>
          <div>
            <p className="text-ui font-medium text-ink mb-2">أيام في الأسبوع</p>
            <SegmentedControl value={days} onChange={setDays} options={DAYS.map((d) => ({ value: d, label: d }))} />
          </div>
        </div>

        <div className="mt-8 rounded-xl2 bg-brand-soft/70 p-6 text-center">
          <p className="text-ui text-ink-2">خلال سنة واحدة</p>
          <p className="font-display text-hero font-semibold text-brand tabular leading-tight">{yearlyHours}</p>
          <p className="text-body text-ink">ساعة عمل مركّز</p>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          {outcomes.map((o) => (
            <div key={o.text} className="rounded-xl2 border border-line p-4">
              <IconTile icon={o.icon} tone="neutral" size="sm" />
              <p className="font-display text-title-lg font-medium text-ink mt-3 tabular">
                {o.value} <span className="text-body text-ink-2 font-normal">{o.unit}</span>
              </p>
              <p className="text-small text-ink-2 mt-1 leading-relaxed">{o.text}</p>
            </div>
          ))}
        </div>
        <p className="text-caption text-ink-3 mt-4">أرقام تقريبية للتوضيح.</p>
      </Card>

      <Card as="section" className="p-5 sm:p-8">
        <SectionHeader
          title="بإيقاعك الحقيقي"
          description={`محسوب من جلسات تركيزك في آخر ${PACE_DAYS} يوماً، لا من الأمنيات.`}
        />
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl2 border border-line p-4">
            <p className="text-small text-ink-3">متوسطك اليومي</p>
            <p className="font-display text-title-lg font-medium text-ink tabular mt-1">{formatMinutes(dailyPace)}</p>
            <p className="text-small text-ink-2 mt-1">
              {dailyPace > 0 ? `≈ ${paceYearHours} ساعة في السنة إن استمررت هكذا.` : "ابدأ بجلسة واحدة يومياً، وسيظهر أثرها هنا."}
            </p>
          </div>
          <div className="rounded-xl2 border border-line p-4">
            <p className="text-small text-ink-3">كل ما سجّلته من تركيز</p>
            <p className="font-display text-title-lg font-medium text-ink tabular mt-1">{loggedHours} س</p>
          </div>
        </div>

        {openSkills.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {openSkills.map((s) => {
              const perDay = (recent.bySkill.get(s.id) ?? 0) / PACE_DAYS;
              const leftMinutes = (s.targetHours - s.loggedHours) * 60;
              const eta = perDay > 0 ? new Date(Date.now() + Math.ceil(leftMinutes / perDay) * 86400000) : null;
              return (
                <li key={s.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Layers className="w-4 h-4 text-brand shrink-0" />
                  <Link href={`/app/tools/meta?skill=${s.id}`} className="text-body font-medium text-ink hover:text-brand">
                    {s.title}
                  </Link>
                  <span className="text-small text-ink-3 tabular">
                    {s.loggedHours} من {s.targetHours} س
                  </span>
                  <span className="text-small text-ink-2 sm:mr-auto">
                    {eta
                      ? `بإيقاعك الحالي تُتم أول ${s.targetHours} ساعة في ${ETA_FORMAT.format(eta)}`
                      : "لم تتدرّب عليها في آخر أسبوعين — اربط بها أولوية الغد"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
