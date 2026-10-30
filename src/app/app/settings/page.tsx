"use client";

import React, { useState } from "react";
import { FOCUS_AREAS, useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, SegmentedControl, Switch } from "@/components/ui/primitives";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { UsageReportPanel } from "@/components/settings/UsageReportPanel";
import { SyncPanel } from "@/components/settings/SyncPanel";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { setAiConsent, useAiConsent } from "@/lib/safety/aiConsent";
import { setCoachConsent, useCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import { SAFETY_TEXT } from "@/lib/safety/texts";

export default function SettingsPage() {
  const { profile, updateProfile, settings, setFaithContent, setSound, themeMode, setThemeMode, resetAllData } = useAppStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const journeyMode = useJourneyStore((s) => s.mode);
  const setJourneyMode = useJourneyStore((s) => s.setMode);

  return (
    <div className="space-y-6 animate-rise-in max-w-2xl">
      <header>
        <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink">الإعدادات</h1>
      </header>

      <Card as="section" className="p-5 sm:p-7 space-y-5">
        <h2 className="font-display text-subtitle font-semibold text-ink">الملف الشخصي</h2>
        <div>
          <Label htmlFor="name">الاسم</Label>
          <Input id="name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
        </div>
        <div>
          <Label>مجال التركيز الرئيسي</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => updateProfile({ focusArea: a.id })}
                className={
                  "h-10 px-4 rounded-xl border text-ui transition " +
                  (profile.focusArea === a.id
                    ? "bg-brand-soft border-brand/40 text-brand font-medium"
                    : "border-line text-ink-2 hover:border-ink-3")
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card as="section" className="p-5 sm:p-7 divide-y divide-line">
        <Row
          title="المظهر"
          description="الوضع النهاري الورقي، أو الليلي الدافئ."
          control={
            <SegmentedControl
              size="sm"
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: "light", label: "نهاري" },
                { value: "dark", label: "ليلي" },
              ]}
            />
          }
        />
        <Row
          title="المحتوى الإيماني"
          description="آية يومية للتثبيت، والتاريخ الهجري، واقتراح عادات الصلاة والورد في أداة العادات."
          control={<Switch label="المحتوى الإيماني" checked={settings.faithContent} onChange={setFaithContent} />}
        />
        <Row
          title="الأصوات"
          description="نغمة خفيفة عند بدء المؤقت، وجرس واضح عند انتهائه، وإشارات التنفّس في تهيئة الصباح."
          control={<Switch label="الأصوات" checked={settings.sound !== false} onChange={setSound} />}
        />
        <Row
          title="البناء التدريجي"
          description="تُفتح أدوات النظام مرحلة بعد مرحلة كلما رسخ ما قبلها. أطفئه لترى كل شيء الآن."
          control={
            <Switch
              label="البناء التدريجي"
              checked={journeyMode === "guided"}
              onChange={(on) => setJourneyMode(on ? "guided" : "open")}
            />
          }
        />
        <AiConsentRow />
        <CoachConsentRow />
      </Card>

      <SyncPanel />

      <Card as="section" className="p-5 sm:p-7">
        <h2 className="font-display text-subtitle font-semibold text-ink">البيانات</h2>
        <p className="text-ui text-ink-2 mt-1">
          بياناتك محفوظة على هذا الجهاز، وتتزامن مع الهاتف إن فعّلت المزامنة. نزّل نسخة احتياطية بين حين وآخر.
        </p>
        <div className="mt-5">
          <BackupPanel />
        </div>

        <div className="mt-6 pt-5 border-t border-line">
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ui text-danger">سيُحذف كل شيء نهائياً. متأكد؟</span>
              <Button variant="danger" size="sm" onClick={resetAllData}>
                نعم، ابدأ من جديد
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                تراجع
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
              مسح البيانات والبدء من جديد
            </Button>
          )}
        </div>
      </Card>

      <Card as="section" className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-subtitle font-semibold text-ink">تقرير الاستخدام</h2>
            <p className="text-ui text-ink-2 mt-1">
              أرقام استخدامك في ملف واحد، بنفس صيغة تقارير المستخدمين، لتقارن بها.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <UsageReportPanel />
        </div>
      </Card>
    </div>
  );
}

function AiConsentRow() {
  const consent = useAiConsent();
  return (
    <Row
      title={SAFETY_TEXT.settings.title}
      description={SAFETY_TEXT.settings.description}
      control={
        <Switch
          label={SAFETY_TEXT.settings.title}
          checked={consent === "ai"}
          onChange={(on) => setAiConsent(on ? "ai" : "local")}
        />
      }
    />
  );
}

function CoachConsentRow() {
  const consent = useCoachConsent();
  return (
    <Row
      title={COACH_TEXT.settings.title}
      description={COACH_TEXT.settings.description}
      control={
        <Switch
          label={COACH_TEXT.settings.title}
          checked={consent === "ai"}
          onChange={(on) => setCoachConsent(on ? "ai" : "local")}
        />
      }
    />
  );
}

function Row({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-body font-medium text-ink">{title}</p>
        <p className="text-ui text-ink-2 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
