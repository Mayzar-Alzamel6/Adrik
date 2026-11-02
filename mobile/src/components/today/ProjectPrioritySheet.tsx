import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { ROW, radius, useColors } from "@/theme";
import { Button, Chip, Input, Label, LinkButton, Row, Sheet, Txt } from "@/components/ui";

/**
 * Today's priorities come out of projects: pick an open project task, or write a new one,
 * which is added to the project too so both lists stay one.
 */
export interface PickedTask {
  title: string;
  projectId: string;
  taskId: string;
  skillId?: string;
}

/** Without `onPick` the task becomes one of today's priorities; with it, the caller decides (e.g. tomorrow's plan). */
export function ProjectPrioritySheet({
  open,
  onClose,
  onPick,
  title = "أولوية من مشاريعك",
}: {
  open: boolean;
  onClose: () => void;
  onPick?: (task: PickedTask) => void;
  title?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description="كل أولوية تخدم مشروعاً، وإنجازها يُحتسب في تقدّمه تلقائياً.">
      {open ? <Picker onDone={onClose} onPick={onPick} /> : null}
    </Sheet>
  );
}

function Picker({ onDone, onPick }: { onDone: () => void; onPick?: (task: PickedTask) => void }) {
  const c = useColors();
  const allProjects = useProjectsStore((s) => s.projects);
  const anchors = useAppStore((s) => s.anchors);
  // With anchored priorities, today only draws from their projects; the rest stay on the projects screen.
  const openAnchors = anchors.filter((a) => !a.closedAt);
  const projects = openAnchors.length ? allProjects.filter((p) => openAnchors.some((a) => a.projectId === p.id)) : allProjects;
  const values = useAppStore((s) => s.values);
  const frogs = useAppStore((s) => s.frogs);
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (projects.length === 0) {
    return (
      <View style={{ paddingVertical: 16, gap: 6, alignItems: "center" }}>
        <Feather name="folder" size={22} color={c.ink3} />
        <Txt weight="semibold" align="center">
          لا مشاريع بعد
        </Txt>
        <Txt variant="ui" color="ink2" align="center">
          أنشئ مشروعاً وقسّمه إلى مهام، ثم اختر منها أولويات يومك.
        </Txt>
        <LinkButton
          title="أنشئ أول مشروع"
          onPress={() => {
            onDone();
            router.push("/tool/projects");
          }}
        />
      </View>
    );
  }

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const inToday = new Set(onPick ? [] : frogs.filter((f) => !f.isCompleted && f.projectTaskId).map((f) => f.projectTaskId));
  const openTasks = project.tasks.filter((t) => t.status !== "DONE");
  const valueNames = (project.valueIds ?? []).map((id) => values.find((v) => v.id === id)?.title).filter(Boolean);

  const pick = (taskId: string) => {
    if (onPick) {
      const task = useProjectsStore.getState().projects.find((p) => p.id === project.id)?.tasks.find((t) => t.id === taskId);
      if (!task) return;
      onPick({ title: task.title, projectId: project.id, taskId, skillId: project.skillIds?.length === 1 ? project.skillIds[0] : undefined });
      onDone();
      return;
    }
    const anchor = openAnchors.find((a) => a.projectId === project.id);
    const res = anchor
      ? useAppStore.getState().pullAnchorTask(anchor.id, taskId)
      : useAppStore.getState().addFrogFromProjectTask(project.id, taskId);
    if (res.ok) onDone();
    else setError(res.message);
  };

  const addNew = () => {
    const taskId = useProjectsStore.getState().addTask(project.id, title);
    if (taskId) pick(taskId);
  };

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Label>المشروع</Label>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {projects.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={p.id === project.id}
              onPress={() => {
                setProjectId(p.id);
                setError(null);
              }}
            />
          ))}
        </View>
        {valueNames.length > 0 ? (
          <Txt variant="caption" color="accentStrong" style={{ marginTop: 6 }}>
            يخدم: {valueNames.join("، ")}
          </Txt>
        ) : null}
      </View>

      {error ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Txt variant="ui" color="accentStrong">
            {error}
          </Txt>
        </View>
      ) : null}

      <View>
        <Label>مهامه المفتوحة</Label>
        {openTasks.length === 0 ? (
          <Txt variant="small" color="ink3">
            لا مهام مفتوحة في هذا المشروع. أضف واحدة بالأسفل.
          </Txt>
        ) : (
          openTasks.map((t, i) => {
            const already = inToday.has(t.id);
            return (
              <Pressable
                key={t.id}
                disabled={already}
                onPress={() => pick(t.id)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: c.line,
                  opacity: already ? 0.6 : pressed ? 0.7 : 1,
                })}
              >
                <Row gap={10}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.status === "DOING" ? c.accent : c.lineStrong }} />
                  <Txt style={{ flex: 1 }}>{t.title}</Txt>
                  {already ? (
                    <Txt variant="caption" color="brand">
                      في اليوم
                    </Txt>
                  ) : (
                    <Feather name="target" size={16} color={c.ink3} />
                  )}
                </Row>
              </Pressable>
            );
          })
        )}
      </View>

      <View>
        <Label hint={onPick ? "تُضاف إلى المشروع وإلى هذه الخطة معاً." : "تُضاف إلى المشروع وإلى أولويات اليوم معاً."}>أو مهمة جديدة لهذا المشروع</Label>
        <Row>
          <View style={{ flex: 1 }}>
            <Input value={title} onChangeText={setTitle} placeholder="مثال: مسودة الفصل الثاني" maxLength={140} returnKeyType="done" onSubmitEditing={addNew} />
          </View>
          <Button title="أضف" icon="plus" disabled={!title.trim()} onPress={addNew} />
        </Row>
      </View>
    </View>
  );
}
