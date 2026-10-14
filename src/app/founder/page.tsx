import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, CircleDot, FolderKanban, Heart, Layers, Quote, Target } from "lucide-react";
import { FOUNDER_EXAMPLE as F } from "@/data/founder-example";
import { Logo } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "تجربة المؤسس",
  description: "كيف تتصل قيمي بمشاريعي، ومشاريعي بمهاراتي، ومهاراتي بمهام يومي. سلسلة واحدة واضحة.",
  openGraph: {
    title: "تجربة المؤسس · أدرك عمرك",
    description: "القيم ← المشاريع ← المهارات ← الضفادع: سلسلة واحدة تحوّل النية إلى إنجاز يومي.",
  },
};

const CHAIN = [
  { icon: Heart, label: "القيم", hint: "لماذا" },
  { icon: FolderKanban, label: "المشاريع", hint: "ماذا" },
  { icon: Layers, label: "المهارات", hint: "بماذا" },
  { icon: Target, label: "الضفادع", hint: "اليوم" },
];

const valueTitle = (key: string) => F.values.find((v) => v.key === key)?.title;
const projectOf = (key?: string) => F.projects.find((p) => p.key === key);
const skillOf = (key?: string) => F.skills.find((s) => s.key === key);

function frogPath(f: (typeof F.frogs)[number]) {
  const project = projectOf(f.projectKey);
  return [
    project?.valueKeys.map(valueTitle).filter(Boolean).join("، "),
    project?.name,
    skillOf(f.skillKey)?.title,
  ].filter((x): x is string => Boolean(x));
}

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="أدرك عمرك">
            <Logo />
          </Link>
          <ButtonLink href="/onboarding?template=founder" size="sm">
            ابدأ من هذه التجربة
          </ButtonLink>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-14 pb-12 sm:pt-20 sm:pb-16 text-center">
          <p className="text-small font-medium text-accent-strong">تجربة المؤسس</p>
          <h1 className="font-display text-display sm:text-hero-sm font-semibold text-ink mt-2 leading-tight">{F.founder.name}</h1>
          <p className="text-lead text-ink-2 mt-2">{F.founder.role}</p>
          <blockquote className="relative mt-10 max-w-2xl mx-auto rounded-4xl bg-surface border border-line shadow-soft px-6 py-8 sm:px-10">
            <Quote className="absolute -top-4 right-8 w-8 h-8 p-1.5 rounded-full bg-accent text-accent-ink" aria-hidden />
            <p className="font-display text-title sm:text-heading leading-[1.8] text-ink">{F.founder.quote}</p>
          </blockquote>
          <p className="mt-8 max-w-2xl mx-auto text-lead leading-[1.9] text-ink-2">{F.founder.story}</p>
        </section>

        {/* The chain */}
        <section aria-label="السلسلة" className="pb-14">
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CHAIN.map((c, i) => (
              <li key={c.label} className="relative rounded-xl2 bg-surface border border-line p-4 text-center">
                <c.icon className="w-5 h-5 mx-auto text-brand" strokeWidth={1.8} />
                <p className="font-display text-lead font-semibold text-ink mt-2">{c.label}</p>
                <p className="text-caption text-ink-3">{c.hint}</p>
                {i < CHAIN.length - 1 && (
                  <ArrowLeft className="hidden sm:block absolute top-1/2 -left-3 -translate-y-1/2 w-4 h-4 text-ink-3 bg-bg" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* A day */}
        <section className="pb-16">
          <h2 className="font-display text-heading sm:text-display-sm font-semibold text-ink">ضفادع يوم من أيامي</h2>
          <p className="text-ink-2 mt-1">ثلاث مهام كبرى فقط، ولكل واحدة خيط يصلها بقيمة.</p>
          <ol className="mt-6 space-y-3">
            {F.frogs.map((f, i) => {
              const path = frogPath(f);
              return (
                <li key={i} className="flex items-start gap-4 rounded-xl2 bg-surface border border-line p-4 sm:p-5">
                  <span className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full bg-brand text-brand-ink font-semibold tabular">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lead font-medium text-ink">{f.title}</p>
                    {path.length > 0 && (
                      <p className="text-small text-ink-3 mt-1">
                        {path.map((p, j) => (
                          <span key={j}>
                            {j > 0 && <span className="mx-1.5">←</span>}
                            <span className={j === 0 ? "text-accent-strong font-medium" : undefined}>{p}</span>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Values tree */}
        <section className="pb-16">
          <h2 className="font-display text-heading sm:text-display-sm font-semibold text-ink">من القيمة إلى المهمة</h2>
          <p className="text-ink-2 mt-1">كل مشروع يخدم قيمة، وكل مهارة تخدم مشروعاً.</p>

          <div className="mt-8 space-y-8">
            {F.values.map((v) => {
              const projects = F.projects.filter((p) => p.valueKeys.includes(v.key));
              return (
                <article key={v.key} className="rounded-4xl bg-surface border border-line shadow-soft overflow-hidden">
                  <header className="bg-accent-soft/60 px-5 py-5 sm:px-8">
                    <p className="inline-flex items-center gap-2 text-small text-accent-strong font-medium">
                      <Heart className="w-4 h-4 fill-current" />
                      قيمة
                    </p>
                    <h3 className="font-display text-heading font-semibold text-ink mt-1">{v.title}</h3>
                    <p className="text-body text-ink-2 mt-1 leading-relaxed">{v.definition}</p>
                    <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-ui">
                      <div className="rounded-xl bg-surface/80 px-4 py-3">
                        <dt className="text-caption text-ink-3">سلوكها اليومي</dt>
                        <dd className="text-ink mt-0.5">{v.dailyAction}</dd>
                      </div>
                      <div className="rounded-xl bg-surface/80 px-4 py-3">
                        <dt className="text-caption text-ink-3">خطها الأحمر</dt>
                        <dd className="text-ink mt-0.5">{v.redLine}</dd>
                      </div>
                    </dl>
                  </header>

                  <div className="px-5 py-5 sm:px-8 sm:py-6 space-y-5">
                    {projects.length === 0 && <p className="text-ui text-ink-3">لا مشاريع لهذه القيمة بعد.</p>}
                    {projects.map((p) => {
                      const done = p.tasks.filter((t) => t.status === "DONE").length;
                      const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
                      const skills = F.skills.filter((s) => s.projectKeys.includes(p.key));
                      const frogs = F.frogs.filter((f) => f.projectKey === p.key);
                      return (
                        <div key={p.key} className="relative border-r-2 border-line pr-4 sm:pr-6">
                          <span className="absolute -right-[7px] top-1.5 w-3 h-3 rounded-full bg-brand" aria-hidden />
                          <p className="inline-flex items-center gap-1.5 text-caption text-ink-3">
                            <FolderKanban className="w-3.5 h-3.5" />
                            مشروع
                          </p>
                          <h4 className="font-display text-title-sm font-semibold text-ink">{p.name}</h4>
                          <p className="text-ui text-ink-2 mt-0.5">{p.description}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                              <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-small text-ink-2 tabular shrink-0">
                              {done} من {p.tasks.length} مهام
                            </span>
                          </div>
                          <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                            {p.tasks.map((t) => (
                              <li key={t.title} className="flex items-center gap-2 text-small">
                                {t.status === "DONE" ? (
                                  <Check className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2.6} />
                                ) : (
                                  <CircleDot className={t.status === "DOING" ? "w-3.5 h-3.5 text-accent-strong shrink-0" : "w-3.5 h-3.5 text-ink-3/60 shrink-0"} />
                                )}
                                <span className={t.status === "DONE" ? "text-ink-3" : "text-ink-2"}>{t.title}</span>
                              </li>
                            ))}
                          </ul>

                          {skills.length > 0 && (
                            <div className="mt-4">
                              <p className="inline-flex items-center gap-1.5 text-caption text-ink-3">
                                <Layers className="w-3.5 h-3.5" />
                                مهارات يحتاجها
                              </p>
                              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                                {skills.map((s) => {
                                  const sp = Math.min(100, Math.round((s.loggedHours / 20) * 100));
                                  return (
                                    <div key={s.key} className="rounded-xl bg-surface-2 px-3.5 py-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-ui font-medium text-ink">{s.title}</span>
                                        <span className="text-caption text-ink-3 tabular">{s.loggedHours} ساعة</span>
                                      </div>
                                      <div className="mt-1.5 h-1.5 rounded-full bg-line overflow-hidden">
                                        <div className="h-full bg-accent rounded-full" style={{ width: `${sp}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {frogs.length > 0 && (
                            <div className="mt-4">
                              <p className="inline-flex items-center gap-1.5 text-caption text-ink-3">
                                <Target className="w-3.5 h-3.5" />
                                أولويات اليوم
                              </p>
                              <ul className="mt-1.5 space-y-1">
                                {frogs.map((f) => (
                                  <li key={f.title} className="text-ui text-ink">
                                    {f.title}
                                    {f.skillKey && <span className="text-ink-3"> · يدرّب {skillOf(f.skillKey)?.title}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="rounded-4xl bg-brand text-brand-ink px-6 py-10 sm:px-12 text-center">
            <h2 className="font-display text-heading sm:text-display font-semibold">ابدأ من هذه السلسلة، ثم اجعلها سلسلتك</h2>
            <p className="mt-2 opacity-85 max-w-xl mx-auto">
              تُنسخ القيم والمشاريع والمهارات والضفادع إلى تطبيقك نسخةً مستقلة، تعدّل فيها وتحذف وتضيف كما تشاء.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/onboarding?template=founder"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface text-ink font-medium hover:opacity-90 transition w-full sm:w-auto"
              >
                ابدأ من تجربة المؤسس
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-brand-ink/30 font-medium hover:bg-brand-ink/10 transition w-full sm:w-auto"
              >
                ابدأ من الصفر
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
