import React, { useState } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useAppStore, type FrogLinks } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { lineageParts, useLineageResolver } from "@/lib/lineage";
import { radius, useColors, ROW } from "@/theme";
import { Button, Chip, IconButton, Label, LinkButton, Row, Sheet, Txt } from "@/components/ui";

/** "الحرية ← مشروع التطبيق ← البرمجة", showing only the parts that exist; the value is highlighted. */
export function LineageLine({ links, wrap }: { links: FrogLinks; wrap?: boolean }) {
  const resolve = useLineageResolver();
  const parts = lineageParts(resolve(links));
  if (parts.length === 0) return null;
  return (
    <Txt variant="caption" color="ink3" numberOfLines={wrap ? undefined : 1}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? " ← " : null}
          <Txt variant="caption" color={i === 0 ? "accentStrong" : "ink3"}>
            {p}
          </Txt>
        </React.Fragment>
      ))}
    </Txt>
  );
}

/** Small link icon next to a priority; brand-colored once it is linked. */
export function FrogLinkButton({ links, onPress, label, disabled }: { links: FrogLinks; onPress: () => void; label: string; disabled?: boolean }) {
  const linked = Boolean(links.projectId || links.skillId);
  return (
    <View style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <IconButton icon="link-2" label={label} color={linked ? "brand" : "ink3"} active={linked} onPress={onPress} />
    </View>
  );
}

/** Sheet for linking a priority to a project and/or skill, which ties it to the values it serves. */
export function FrogLinkSheet({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title?: string;
  initial: FrogLinks;
  onClose: () => void;
  onSave: (links: FrogLinks) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="ربط الأولوية" description={title}>
      {open ? <FrogLinkForm initial={initial} onCancel={onClose} onSave={onSave} /> : null}
    </Sheet>
  );
}

function FrogLinkForm({ initial, onCancel, onSave }: { initial: FrogLinks; onCancel: () => void; onSave: (links: FrogLinks) => void }) {
  const c = useColors();
  const projects = useProjectsStore((s) => s.projects);
  const skills = useAppStore((s) => s.skills);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [skillId, setSkillId] = useState(initial.skillId);

  // Skills the chosen project needs come first.
  const project = projects.find((p) => p.id === projectId);
  const skillOrder = [...skills].sort(
    (a, b) => Number(Boolean(project?.skillIds?.includes(b.id))) - Number(Boolean(project?.skillIds?.includes(a.id)))
  );

  const openTool = (id: string) => {
    onCancel();
    router.push({ pathname: "/tool/[id]", params: { id } });
  };

  return (
    <View style={{ gap: 18 }}>
      <View>
        <Label hint="أي مشروع تتقدّم فيه هذه الأولوية؟">المشروع</Label>
        {projects.length === 0 ? (
          <Row style={{ flexWrap: "wrap" }}>
            <Txt variant="small" color="ink3">
              لا مشاريع بعد.
            </Txt>
            <LinkButton title="أنشئ مشروعاً" icon="folder" onPress={() => openTool("projects")} />
          </Row>
        ) : (
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
            <Chip label="بلا مشروع" selected={!projectId} onPress={() => setProjectId(undefined)} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} selected={projectId === p.id} onPress={() => setProjectId(p.id)} />
            ))}
          </View>
        )}
      </View>

      <View>
        <Label hint="أي مهارة تتدرّب عليها وأنت تنجزها؟">المهارة</Label>
        {skills.length === 0 ? (
          <Row style={{ flexWrap: "wrap" }}>
            <Txt variant="small" color="ink3">
              لا مهارات بعد.
            </Txt>
            <LinkButton title="أضف مهارة" icon="layers" onPress={() => openTool("meta")} />
          </Row>
        ) : (
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
            <Chip label="بلا مهارة" selected={!skillId} onPress={() => setSkillId(undefined)} />
            {skillOrder.map((s) => (
              <Chip key={s.id} label={s.title} selected={skillId === s.id} onPress={() => setSkillId(s.id)} />
            ))}
          </View>
        )}
      </View>

      <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, paddingHorizontal: 14, paddingVertical: 12, gap: 4 }}>
        <Row gap={6}>
          <Feather name="heart" size={13} color={c.accentStrong} />
          <Txt variant="caption" color="ink3">
            المسار
          </Txt>
        </Row>
        {projectId || skillId ? (
          <LineageLine links={{ projectId, skillId }} wrap />
        ) : (
          <Txt variant="small" color="ink3">
            اربطها بمشروع لترى القيمة التي تخدمها.
          </Txt>
        )}
      </View>

      <Row style={{ justifyContent: "flex-end" }}>
        <Button title="إلغاء" variant="ghost" onPress={onCancel} />
        <Button title="حفظ الربط" icon="link-2" onPress={() => onSave({ projectId, skillId })} />
      </Row>
    </View>
  );
}
