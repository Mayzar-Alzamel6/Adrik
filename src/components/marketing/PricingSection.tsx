"use client";

import { useEffect, useState } from "react";
import { Check, Crown, GraduationCap, Users, type LucideIcon } from "lucide-react";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Badge, SegmentedControl } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  BOOKING_URL,
  COMING_SOON_FREE,
  DEFAULT_ZONE,
  FREE_FEATURES,
  PLUS_FEATURES,
  PRICE_ZONES,
  PROGRAM_FEATURES,
  formatAmount,
  formatPrice,
  getZone,
  yearlyPerMonth,
  yearlySavingPercent,
  zoneFromTimeZone,
  type Billing,
  type PriceZone,
  type ZoneId,
} from "@/data/pricing";

const ZONE_KEY = "adrik-pricing-zone";

/** Big number for the price; "$" stays attached, local units move to the suffix. */
const bigAmount = (zone: PriceZone, amount: number) =>
  zone.unitAttached ? formatPrice(zone, amount) : formatAmount(amount);
const unitPrefix = (zone: PriceZone) => (zone.unitAttached ? "" : `${zone.unit} `);

function FeatureList({ items, tone = "brand" }: { items: string[]; tone?: "brand" | "neutral" }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 items-start text-body">
          <span
            className={cn(
              "mt-0.5 w-5 h-5 shrink-0 rounded-full inline-flex items-center justify-center",
              tone === "brand" ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-2"
            )}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function BookingButton({ label, size = "lg", className }: { label: string; size?: "md" | "lg"; className?: string }) {
  if (BOOKING_URL) {
    return (
      <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", size, className)}>
        {label}
      </a>
    );
  }
  return (
    <Button variant="secondary" size={size} className={className} disabled>
      يُفتح الحجز قريباً
    </Button>
  );
}

function Price({ value, suffix, ready }: { value: string; suffix: string; ready: boolean }) {
  return (
    <div className={cn("mt-6 flex items-end gap-2 transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
      <span className="font-display text-timer font-semibold leading-none tabular">{value}</span>
      <span className="text-ink-2 mb-2">{suffix}</span>
    </div>
  );
}

function Offer({
  icon: Icon,
  title,
  badge,
  price,
  text,
  cta,
  ready,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  price: string;
  text: string;
  cta: string;
  ready: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl2 border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-display text-subtitle font-semibold">
          <Icon className="w-4 h-4 text-brand" aria-hidden />
          {title}
        </span>
        {badge ? <Badge tone="accent">{badge}</Badge> : null}
      </div>
      <p className={cn("text-lead font-semibold text-ink mt-3 tabular transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
        {price}
      </p>
      <p className="text-small text-ink-2 mt-1 leading-relaxed flex-1">{text}</p>
      <BookingButton label={cta} size="md" className="w-full mt-4" />
    </div>
  );
}

export function PricingSection() {
  const [zoneId, setZoneId] = useState<ZoneId>(DEFAULT_ZONE);
  const [billing, setBilling] = useState<Billing>("yearly");
  // Prices fade in once the visitor's zone is known, so they never flash the wrong currency.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(ZONE_KEY);
    } catch {
      /* storage unavailable: fall back to the time zone */
    }
    const isZone = PRICE_ZONES.some((z) => z.id === saved);
    setZoneId(isZone ? (saved as ZoneId) : zoneFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
    setReady(true);
  }, []);

  const chooseZone = (id: ZoneId) => {
    setZoneId(id);
    try {
      window.localStorage.setItem(ZONE_KEY, id);
    } catch {
      /* the choice just won't be remembered */
    }
  };

  const zone = getZone(zoneId);
  const saving = yearlySavingPercent(zone);
  const yearly = billing === "yearly";
  const plusAmount = yearly ? zone.plus.yearly : zone.plus.monthly;

  return (
    <div className="mt-10">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <label className="flex items-center gap-2 text-ui text-ink-2">
          <span>الأسعار لـ</span>
          <select
            value={zoneId}
            onChange={(e) => chooseZone(e.target.value as ZoneId)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-ui text-ink shadow-soft focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {PRICE_ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <SegmentedControl<Billing>
          ariaLabel="مدة الاشتراك"
          value={billing}
          onChange={setBilling}
          options={[
            { value: "monthly", label: "شهري" },
            {
              value: "yearly",
              label: (
                <>
                  سنوي <span className="text-accent-strong">وفّر {saving}%</span>
                </>
              ),
            },
          ]}
        />
      </div>
      <p className="text-small text-ink-3 text-center mt-2">{zone.hint}</p>

      <p className="mt-6 mx-auto max-w-2xl rounded-xl2 bg-brand-soft px-5 py-3 text-ui text-ink text-center leading-relaxed">
        <span className="font-semibold text-brand">الإطلاق التجريبي:</span> التطبيق كله مفتوح ومجاني الآن، بما فيه مزايا الكاملة. الدفع لم
        يبدأ بعد، وسنخبرك قبل أن يبدأ.
      </p>

      {/* Plans */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3 items-stretch">
        <article className="flex flex-col rounded-4xl border border-line bg-surface p-7 shadow-soft">
          <h3 className="font-display text-title font-semibold">المجانية</h3>
          <p className="text-ui text-ink-2 mt-1">أنجز يومك، مجاناً للأبد.</p>
          <Price value="0" suffix="للأبد" ready />
          <FeatureList items={FREE_FEATURES} tone="neutral" />
          <div className="mt-auto pt-8">
            <ButtonLink href="/onboarding" variant="secondary" size="lg" className="w-full">
              ابدأ مجاناً
            </ButtonLink>
          </div>
        </article>

        <article className="flex flex-col rounded-4xl border-2 border-brand bg-surface p-7 shadow-lift">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-title font-semibold">الكاملة</h3>
            <Badge tone="accent">موصى بها</Badge>
          </div>
          <p className="text-ui text-ink-2 mt-1">وجّه أسابيعك وسنتك كاملة.</p>
          <Price
            value={bigAmount(zone, plusAmount)}
            suffix={`${unitPrefix(zone)}/ ${yearly ? "سنوياً" : "شهرياً"}`}
            ready={ready}
          />
          <p className={cn("text-ui text-ink-3 mt-2 transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
            {yearly
              ? `≈ ${yearlyPerMonth(zone)} شهرياً · ${zone.dailyNote}`
              : `أو ${formatPrice(zone, zone.plus.yearly)} سنوياً ووفّر ${saving}%`}
          </p>
          <FeatureList items={PLUS_FEATURES} />
          <div className="mt-auto pt-8">
            <ButtonLink href="/onboarding" size="lg" className="w-full">
              ابدأ بها مجاناً الآن
            </ButtonLink>
            <p className="text-small text-ink-3 text-center mt-3">مفتوحة كلها خلال الإطلاق التجريبي · بلا بطاقة</p>
          </div>
        </article>

        <article className="flex flex-col rounded-4xl border border-line bg-surface p-7 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-title font-semibold">برنامج الـ30 يوماً</h3>
            <Badge tone="brand">بالعربية</Badge>
          </div>
          <p className="text-ui text-ink-2 mt-1">شهر مع المؤسس ومجموعة صغيرة.</p>
          <Price value={bigAmount(zone, zone.program)} suffix={`${unitPrefix(zone)}دفعة واحدة`} ready={ready} />
          <FeatureList items={PROGRAM_FEATURES} />
          <div className="mt-auto pt-8">
            <BookingButton label="احجز مقعدك" className="w-full" />
          </div>
        </article>
      </div>

      <p className="text-small text-ink-3 text-center mt-5">{COMING_SOON_FREE}</p>

      {/* Other offers */}
      <div className={cn("mt-10 grid gap-4", zone.studentFrom ? "md:grid-cols-3" : "md:grid-cols-2")}>
        <Offer
          icon={Users}
          title="العائلة"
          price={`${formatPrice(zone, zone.family)} سنوياً`}
          text="الباقة الكاملة لحتى 4 أفراد، ولكل فرد مساحته الخاصة."
          cta="احجز"
          ready={ready}
        />
        <Offer
          icon={Crown}
          title="العضوية المؤسِّسة"
          badge="عدد محدود"
          price={`${formatPrice(zone, zone.lifetime.price)} مرة واحدة`}
          text={`الباقة الكاملة مدى الحياة، لأول ${zone.lifetime.seats} عضو فقط.`}
          cta="احجز"
          ready={ready}
        />
        {zone.studentFrom ? (
          <Offer
            icon={GraduationCap}
            title="للطلاب"
            price={`من ${formatPrice(zone, zone.studentFrom)} سنوياً`}
            text="ادفع ما تستطيع. اطلبه منا مباشرة، ونثق بك."
            cta="اطلبه"
            ready={ready}
          />
        ) : null}
      </div>

      {/* Every zone, in text, so every visitor (and every AI assistant) can read all prices */}
      <details className="mt-10 rounded-xl2 border border-line bg-surface px-5 py-4">
        <summary className="cursor-pointer text-ui font-medium text-ink">الأسعار في كل المناطق</summary>
        <p className="text-small text-ink-2 mt-3 leading-relaxed">
          نسعّر حسب القوة الشرائية في كل منطقة، حتى يكون التطبيق في متناول الطالب في القاهرة كما هو في متناول الموظف في
          الرياض أو برلين.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-small">
            <thead className="text-ink-3">
              <tr className="border-b border-line">
                <th className="py-2 font-medium text-start">المنطقة</th>
                <th className="py-2 font-medium text-start">الكاملة شهرياً</th>
                <th className="py-2 font-medium text-start">الكاملة سنوياً</th>
                <th className="py-2 font-medium text-start">العائلة سنوياً</th>
                <th className="py-2 font-medium text-start">البرنامج</th>
                <th className="py-2 font-medium text-start">مدى الحياة</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_ZONES.map((z) => (
                <tr key={z.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-medium text-ink">{z.label}</td>
                  <td className="py-2 tabular">{formatPrice(z, z.plus.monthly)}</td>
                  <td className="py-2 tabular">{formatPrice(z, z.plus.yearly)}</td>
                  <td className="py-2 tabular">{formatPrice(z, z.family)}</td>
                  <td className="py-2 tabular">{formatPrice(z, z.program)}</td>
                  <td className="py-2 tabular">{formatPrice(z, z.lifetime.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
