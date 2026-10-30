import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { habitStats } from "@/lib/habits";
import { useAppStore, type CalendarEventItem, type CoreValueItem, type FrogTask, type SkillProjectItem } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";
import { projectProgress, type Project } from "@/stores/useProjectsStore";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { useJourney } from "@/lib/journey";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Card, LinkButton, Row, Txt, type IconName } from "@/components/ui";
import { StageGate } from "@/components/journey/Journey";

const WINDOW_DAYS = 28;
const DATE_FORMAT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" });

/** The map waits for its stage, like the web app. */
export function VisionScreen() {
  const { isFeatureOpen, stageOfFeature } = useJourney();
  const stage = stageOfFeature("vision");
  if (!isFeatureOpen("vision") && stage) return <StageGate stage={stage} what="خريطة الرؤية" />;
  return <VisionMap />;
}

/**
 * Values → projects → skills → today's priorities, as one tree. The point is to see the threads,
 * and especially where they break: a value with no project, a project with no value, a day with no lineage.
 */
function VisionMap() {
  const c = useColors();
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
      <Card style={{ gap: 6, alignItems: "center" }}>
        <Feather name="heart" size={22} color={c.ink3} />
        <Txt weight="semibold" align="center">
          خريطتك فارغة بعد
        </Txt>
        <Txt variant="ui" color="ink2" align="center">
          ابدأ بقيمة واحدة في دستور القيم، ثم مشروع يخدمها. ستُرسم الخريطة وحدها.
        </Txt>
        <LinkButton title="اكتب أول قيمة" onPress={() => router.push("/tool/identity")} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 10 }}>
        <Summary icon="heart" label="قيم" value={values.length} />
        <Summary icon="folder" label="مشاريع" value={projects.length} />
        <Summary icon="layers" label="مهارات" value={skills.length} />
        <Card style={{ flexGrow: 1, flexBasis: "45%", padding: 14, gap: 6 }}>
          <Txt variant="small" color="ink3">
            خيوط موصولة
          </Txt>
          <Txt variant="heading" weight="medium" color={health >= 70 ? "brand" : "accentStrong"}>
            {health}%
          </Txt>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: "hidden", flexDirection: ROW }}>
            <View style={{ width: `${health}%`, backgroundColor: health >= 70 ? c.brand : c.accent, borderRadius: 3 }} />
          </View>
        </Card>
      </View>

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

      {orphanProjects.length > 0 || orphanSkills.length > 0 || unlinkedFrogs.length > 0 ? (
        <Card style={{ gap: 12, borderStyle: "dashed" }}>
          <Row gap={8}>
            <Feather name="link-2" size={18} color={c.accentStrong} />
            <Txt variant="subtitle" weight="semibold">
              خيوط مقطوعة
            </Txt>
          </Row>
          <Txt variant="ui" color="ink2">
            ما لا يتصل بقيمة يسهل تأجيله. صِله أو تخلّص منه.
          </Txt>
          {orphanProjects.length > 0 ? (
            <Loose title="مشاريع بلا قيمة" href="/tool/projects" items={orphanProjects.map((p) => p.name)} cta="اربطها بقيمة" />
          ) : null}
          {orphanSkills.length > 0 ? (
            <Loose title="مهارات بلا مشروع" href="/tool/projects" items={orphanSkills.map((s) => s.title)} cta="أضفها لمشروع" />
          ) : null}
          {unlinkedFrogs.length > 0 ? (
            <Loose title="أولويات اليوم بلا مسار" href="/" items={unlinkedFrogs.map((f) => f.title)} cta="اربطها من صفحة اليوم" />
          ) : null}
        </Card>
      ) : null}

      <Txt variant="caption" color="ink3">
        الوقت المعروض هو وقت التركيز في آخر {WINDOW_DAYS} يوماً.
      </Txt>
    </View>
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
  const c = useColors();
  const total = projects.reduce((a, p) => a + (byProject.get(p.id) ?? 0), 0);
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }} gap={10}>
        <View style={{ flex: 1 }}>
          <Row gap={4}>
            <Feather name="heart" size={12} color={c.accentStrong} />
            <Txt variant="caption" weight="medium" color="accentStrong">
              قيمة
            </Txt>
          </Row>
          <Txt variant="subtitle" weight="semibold">
            {value.title}
          </Txt>
          {value.dailyAction ? (
            <Txt variant="small" color="ink2">
              سلوكها اليومي: {value.dailyAction}
            </Txt>
          ) : null}
        </View>
        {total > 0 ? <Badge tone="brand">{`${formatMinutes(total)} تركيز`}</Badge> : null}
      </Row>

      {habits.length > 0 ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <Row gap={4}>
            <Feather name="repeat" size={13} color={c.ink3} />
            <Txt variant="caption" color="ink3">
              عاداتها:
            </Txt>
          </Row>
          {habits.map((h) => (
            <Pressable key={h.id} onPress={() => router.push("/tool/habits")} accessibilityRole="button">
              <Row gap={4} style={{ borderRadius: radius.full, backgroundColor: c.surface2, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Txt variant="caption">{h.title}</Txt>
                {h.streak > 0 ? (
                  <Row gap={1}>
                    <Feather name="zap" size={11} color={c.accentStrong} />
                    <Txt variant="caption" color="accentStrong">
                      {h.streak}
                    </Txt>
                  </Row>
                ) : null}
              </Row>
            </Pressable>
          ))}
        </View>
      ) : null}

      {projects.length === 0 ? (
        habits.length > 0 ? (
          <Txt variant="small" color="ink3">
            تعيشها كل يوم بعاداتك. وإن احتاجت هدفاً له موعد، أضف لها مشروعاً.
          </Txt>
        ) : (
          <Pressable
            onPress={() => router.push("/tool/projects")}
            accessibilityRole="button"
            style={({ pressed }) => ({ borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: pressed ? c.brand : c.lineStrong, padding: 12 })}
          >
            <Row gap={8}>
              <Feather name="plus" size={15} color={c.ink2} />
              <Txt variant="ui" color="ink2" style={{ flex: 1 }}>
                قيمة بلا مشروع ولا عادة بعد. ما الذي يجعلها واقعاً؟
              </Txt>
            </Row>
          </Pressable>
        )
      ) : (
        <View style={{ gap: 10, borderRightWidth: 2, borderRightColor: c.line, paddingRight: 12, marginRight: 4 }}>
          {projects.map((p) => (
            <ProjectNode key={p.id} project={p} skills={skills} frogs={frogs} minutes={byProject.get(p.id) ?? 0} bySkill={bySkill} event={nextEvent(p.id)} />
          ))}
        </View>
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
  const c = useColors();
  const { done, total, percent } = projectProgress(project);
  const projectSkills = (project.skillIds ?? []).map((id) => skills.find((s) => s.id === id)).filter((s): s is SkillProjectItem => Boolean(s));
  const todays = frogs.filter((f) => f.projectId === project.id || (f.skillId && project.skillIds?.includes(f.skillId) && !f.projectId));
  const [now] = useState(() => Date.now());
  const daysLeft = project.targetDate ? Math.ceil((Date.parse(project.targetDate) - now) / 86400000) : undefined;

  return (
    <View style={{ borderRadius: radius.lg, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line, padding: 12, gap: 8 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }} gap={6}>
        <Row gap={6} style={{ flexShrink: 1 }}>
          <Feather name="folder" size={15} color={c.brand} />
          <Txt weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {project.name}
          </Txt>
        </Row>
        <Row gap={8}>
          {minutes > 0 ? (
            <Txt variant="caption" color="ink3">
              {formatMinutes(minutes)}
            </Txt>
          ) : null}
          {project.targetDate ? (
            <Row gap={3}>
              <Feather name="calendar" size={12} color={daysLeft !== undefined && daysLeft < 0 ? c.danger : c.ink3} />
              <Txt variant="caption" color={daysLeft !== undefined && daysLeft < 0 ? "danger" : "ink3"}>
                {DATE_FORMAT.format(new Date(project.targetDate))}
              </Txt>
            </Row>
          ) : null}
        </Row>
      </Row>
      {event ? (
        <Txt variant="caption" color="accentStrong">
          الموعد القادم: {event.title} · {DATE_FORMAT.format(new Date(`${event.date}T12:00:00`))}
          {event.time ? ` · ${event.time}` : ""}
        </Txt>
      ) : null}
      {total > 0 ? (
        <Row gap={8}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.line, overflow: "hidden", flexDirection: ROW }}>
            <View style={{ width: `${percent}%`, backgroundColor: c.brand, borderRadius: 3 }} />
          </View>
          <Txt variant="caption" color="ink3">
            {done}/{total}
          </Txt>
        </Row>
      ) : null}
      {projectSkills.length > 0 ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {projectSkills.map((s) => {
            const pct = Math.min(100, Math.round((s.loggedHours / (s.targetHours || 20)) * 100));
            const recent = bySkill.get(s.id) ?? 0;
            return (
              <Row key={s.id} gap={4} style={{ borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Feather name="layers" size={11} color={c.ink3} />
                <Txt variant="caption">{s.title}</Txt>
                <Txt variant="caption" color="ink3">
                  {recent ? formatMinutes(recent) : `${pct}%`}
                </Txt>
              </Row>
            );
          })}
        </View>
      ) : null}
      {todays.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, gap: 4 }}>
          {todays.map((f) => (
            <Row key={f.id} gap={6}>
              <Feather name={f.isCompleted ? "check" : "circle"} size={13} color={f.isCompleted ? c.brand : c.ink3} />
              <Txt variant="small" numberOfLines={1} color={f.isCompleted ? "ink3" : "ink"} style={[{ flex: 1 }, f.isCompleted ? { textDecorationLine: "line-through" } : null]}>
                {f.title}
              </Txt>
              <Row gap={3}>
                <Feather name="target" size={11} color={c.accentStrong} />
                <Txt variant="caption" color="accentStrong">
                  اليوم
                </Txt>
              </Row>
            </Row>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Summary({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  const c = useColors();
  return (
    <Card style={{ flexGrow: 1, flexBasis: "45%", padding: 14, gap: 4 }}>
      <Feather name={icon} size={16} color={c.ink3} />
      <Txt variant="heading" weight="medium">
        {value}
      </Txt>
      <Txt variant="small" color="ink2">
        {label}
      </Txt>
    </Card>
  );
}

function Loose({ title, items, href, cta }: { title: string; items: string[]; href: string; cta: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Txt variant="small" weight="medium">
        {title}
      </Txt>
      {items.slice(0, 5).map((t, i) => (
        <Row key={`${t}-${i}`} gap={6}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.ink3 }} />
          <Txt variant="small" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
            {t}
          </Txt>
        </Row>
      ))}
      {items.length > 5 ? (
        <Txt variant="caption" color="ink3">
          و{items.length - 5} غيرها
        </Txt>
      ) : null}
      <View style={{ alignItems: "flex-end" }}>
        <LinkButton title={cta} onPress={() => router.navigate(href as never)} />
      </View>
    </View>
  );
}
