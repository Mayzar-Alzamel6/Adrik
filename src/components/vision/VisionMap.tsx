"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, Check, Circle, Flame, FolderKanban, Heart, Layers, Link2Off, Plus, Repeat, Target } from "lucide-react";
import { habitStats } from "@/lib/habits";
import { useAppStore, type CalendarEventItem, type CoreValueItem, type FrogTask, type SkillProjectItem } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";
import { projectProgress, type Project } from "@/stores/useProjectsStore";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { cn } from "@/lib/utils";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";

const WINDOW_DAYS = 28;
const DATE_FORMAT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" });

/**
 * Values → projects → skills → today's priorities, as one tree. The point is to see the threads,
 * and especially where they break: a value with no project, a project with no value, a day with no lineage.
 */
export function VisionMap() {
  const data = useValueData();
  const { values, projects, skills, frogs } = data;
  const minutes = useMemo(() => projectMinutesSince(WINDOW_DAYS, data), [data]);
  const events = useAppStore((s) => s.events);
  const today = toLocalDateString();
  /** The project's next appointment, if any. */
  const nextEvent = (projectId: string) =>
    events
      .filter((e) => e.projectId === projectId && e.date >= today)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];

  const projectsOf = (v: CoreValueItem) => projects.filter((p) => p.valueIds?.includes(v.id));
  const orphanProjects = projects.filter((p) => !p.valueIds?.some((id) => values.some((v) => v.id === id)));
  const usedSkillIds = new Set(projects.flatMap((p) => p.skillIds ?? []));
  const orphanSkills = skills.filter((s) => !usedSkillIds.has(s.id));
  const unlinkedFrogs = frogs.filter((f) => !f.projectId && !f.skillId);
  const livedByHabit = (v: CoreValueItem) => data.binaryHabits.some((h) => !h.archived && h.valueId === v.id);
  const valuesWithoutProject = values.filter((v) => projectsOf(v).length === 0 && !livedByHabit(v));

  const threads = values.length + projects.length;
  const connected = values.length - valuesWithoutProject.length + projects.length - orphanProjects.length;
  const health = threads ? Math.round((connected / threads) * 100) : 0;

  if (values.length === 0 && projects.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Heart}
          title="خريطتك فارغة بعد"
          description="ابدأ بقيمة واحدة في دستور القيم، ثم مشروع يخدمها. ستُرسم الخريطة وحدها."
          action={
            <Link href="/app/tools/identity" className="text-ui font-medium text-brand hover:underline underline-offset-4">
              اكتب أول قيمة
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Summary icon={Heart} label="قيم" value={values.length} />
        <Summary icon={FolderKanban} label="مشاريع" value={projects.length} />
        <Summary icon={Layers} label="مهارات" value={skills.length} />
        <Card className="p-4">
          <p className="text-small text-ink-3">خيوط موصولة</p>
          <p className={cn("font-display text-heading font-medium tabular mt-2 leading-none", health >= 70 ? "text-brand" : "text-accent-strong")}>
            {health}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className={cn("h-full rounded-full", health >= 70 ? "bg-brand" : "bg-accent")} style={{ width: `${health}%` }} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {values.map((v) => (
          <ValueBranch
            key={v.id}
            value={v}
            projects={projectsOf(v)}
            skills={skills}
            frogs={frogs}
            byProject={minutes.byProject}
            bySkill={minutes.bySkill}
            nextEvent={nextEvent}
            habits={data.binaryHabits
              .filter((h) => !h.archived && h.valueId === v.id)
              .map((h) => ({ id: h.id, title: h.title, streak: habitStats(h, data.habitHistory, data.currentDay).streak }))}
          />
        ))}
      </div>

      {(orphanProjects.length > 0 || orphanSkills.length > 0 || unlinkedFrogs.length > 0) && (
        <Card as="section" className="p-5 sm:p-6 border-dashed">
          <p className="font-display text-subtitle font-semibold text-ink inline-flex items-center gap-2">
            <Link2Off className="w-5 h-5 text-accent-strong" strokeWidth={1.8} />
            خيوط مقطوعة
          </p>
          <p className="text-ui text-ink-2 mt-1">ما لا يتصل بقيمة يسهل تأجيله. صِله أو تخلّص منه.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {orphanProjects.length > 0 && (
              <Loose title="مشاريع بلا قيمة" href="/app/tools/projects" items={orphanProjects.map((p) => p.name)} cta="اربطها بقيمة" />
            )}
            {orphanSkills.length > 0 && (
              <Loose title="مهارات بلا مشروع" href="/app/tools/projects" items={orphanSkills.map((s) => s.title)} cta="أضفها لمشروع" />
            )}
            {unlinkedFrogs.length > 0 && (
              <Loose title="أولويات اليوم بلا مسار" href="/app" items={unlinkedFrogs.map((f) => f.title)} cta="اربطها من صفحة اليوم" />
            )}
          </div>
        </Card>
      )}

      <p className="text-caption text-ink-3">الوقت المعروض هو وقت التركيز في آخر {WINDOW_DAYS} يوماً.</p>
    </div>
  );
}

function ValueBranch({
  value,
  projects,
  skills,
  frogs,
  byProject,
  bySkill,
  nextEvent,
  habits,
}: {
  habits: { id: string; title: string; streak: number }[];
  value: CoreValueItem;
  projects: Project[];
  skills: SkillProjectItem[];
  frogs: FrogTask[];
  byProject: Map<string, number>;
  bySkill: Map<string, number>;
  nextEvent: (projectId: string) => CalendarEventItem | undefined;
}) {
  const total = projects.reduce((a, p) => a + (byProject.get(p.id) ?? 0), 0);
  return (
    <Card as="section" className="p-5 sm:p-6" aria-label={value.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-medium text-accent-strong inline-flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            قيمة
          </p>
          <h2 className="font-display text-title-sm font-semibold text-ink mt-1">{value.title}</h2>
          {value.dailyAction && <p className="text-small text-ink-2 mt-1 max-w-prose leading-relaxed">سلوكها اليومي: {value.dailyAction}</p>}
        </div>
        {total > 0 && <Badge tone="brand">{formatMinutes(total)} تركيز</Badge>}
      </div>

      {habits.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-ink-3 inline-flex items-center gap-1 ml-1">
            <Repeat className="w-3.5 h-3.5" />
            عاداتها:
          </span>
          {habits.map((h) => (
            <Link
              key={h.id}
              href="/app/tools/habits"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-surface-2 text-caption text-ink hover:text-brand"
            >
              {h.title}
              {h.streak > 0 && (
                <span className="inline-flex items-center text-accent-strong tabular">
                  <Flame className="w-3 h-3" />
                  {h.streak}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        habits.length > 0 ? (
          <p className="mt-4 text-small text-ink-3">تعيشها كل يوم بعاداتك. وإن احتاجت هدفاً له موعد، أضف لها مشروعاً.</p>
        ) : (
          <Link
            href="/app/tools/projects"
            className="mt-4 flex items-center gap-3 rounded-xl2 border border-dashed border-line-strong px-4 py-3 text-ui text-ink-2 hover:border-brand hover:text-brand transition"
          >
            <Plus className="w-4 h-4 shrink-0" />
            قيمة بلا مشروع ولا عادة بعد. ما الذي يجعلها واقعاً؟
          </Link>
        )
      ) : (
        <ul className="mt-4 space-y-3 border-r-2 border-line pr-4 mr-1.5">
          {projects.map((p) => (
            <ProjectNode
              key={p.id}
              project={p}
              skills={skills}
              frogs={frogs}
              minutes={byProject.get(p.id) ?? 0}
              bySkill={bySkill}
              event={nextEvent(p.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProjectNode({
  project,
  skills,
  frogs,
  minutes,
  bySkill,
  event,
}: {
  project: Project;
  skills: SkillProjectItem[];
  frogs: FrogTask[];
  minutes: number;
  bySkill: Map<string, number>;
  event?: CalendarEventItem;
}) {
  const { done, total, percent } = projectProgress(project);
  const projectSkills = (project.skillIds ?? []).map((id) => skills.find((s) => s.id === id)).filter((s): s is SkillProjectItem => Boolean(s));
  const todays = frogs.filter((f) => f.projectId === project.id || (f.skillId && project.skillIds?.includes(f.skillId) && !f.projectId));
  const daysLeft = project.targetDate ? Math.ceil((Date.parse(project.targetDate) - Date.now()) / 86400000) : undefined;

  return (
    <li className="relative">
      <span className="absolute -right-[23px] top-4 w-3 h-3 rounded-full bg-surface border-2 border-brand" aria-hidden />
      <div className="rounded-xl2 bg-surface-2/60 border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body font-semibold text-ink inline-flex items-center gap-2 min-w-0">
            <FolderKanban className="w-4 h-4 text-brand shrink-0" />
            <span className="truncate">{project.name}</span>
          </p>
          <div className="flex items-center gap-2 text-caption text-ink-3">
            {minutes > 0 && <span className="tabular">{formatMinutes(minutes)}</span>}
            {project.targetDate && (
              <span className={cn("inline-flex items-center gap-1 tabular", daysLeft !== undefined && daysLeft < 0 && "text-danger")}>
                <CalendarClock className="w-3.5 h-3.5" />
                {DATE_FORMAT.format(new Date(project.targetDate))}
              </span>
            )}
          </div>
        </div>
        {event && (
          <p className="mt-2 text-caption text-accent-strong inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            الموعد القادم: {event.title} · {DATE_FORMAT.format(new Date(`${event.date}T12:00:00`))}
            {event.time ? ` · ${event.time}` : ""}
          </p>
        )}
        {total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-caption text-ink-3 tabular">
              {done}/{total}
            </span>
          </div>
        )}
        {projectSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {projectSkills.map((s) => {
              const pct = Math.min(100, Math.round((s.loggedHours / (s.targetHours || 20)) * 100));
              const recent = bySkill.get(s.id) ?? 0;
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface border border-line text-caption text-ink"
                  title={`${s.loggedHours} من ${s.targetHours} ساعة`}
                >
                  <Layers className="w-3 h-3 text-ink-3" />
                  {s.title}
                  <span className="text-ink-3 tabular">{recent ? formatMinutes(recent) : `${pct}%`}</span>
                </span>
              );
            })}
          </div>
        )}
        {todays.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-line space-y-1">
            {todays.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-small">
                {f.isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2.6} />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                )}
                <span className={cn("truncate", f.isCompleted ? "text-ink-3 line-through" : "text-ink")}>{f.title}</span>
                <span className="text-caption text-accent-strong shrink-0 inline-flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  اليوم
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: number }) {
  return (
    <Card className="p-4">
      <Icon className="w-4 h-4 text-ink-3" strokeWidth={1.8} />
      <p className="font-display text-heading font-medium text-ink tabular mt-2 leading-none">{value}</p>
      <p className="text-small text-ink-2 mt-1.5">{label}</p>
    </Card>
  );
}

function Loose({ title, items, href, cta }: { title: string; items: string[]; href: string; cta: string }) {
  return (
    <div>
      <p className="text-small font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.slice(0, 5).map((t, i) => (
          <li key={`${t}-${i}`} className="flex items-center gap-2 text-small text-ink-2 min-w-0">
            <span className="w-1 h-1 rounded-full bg-ink-3 shrink-0" aria-hidden />
            <span className="truncate">{t}</span>
          </li>
        ))}
        {items.length > 5 && <li className="text-caption text-ink-3">و{items.length - 5} غيرها</li>}
      </ul>
      <Link href={href} className="inline-block mt-2 text-small font-medium text-brand hover:underline underline-offset-4">
        {cta}
      </Link>
    </div>
  );
}
