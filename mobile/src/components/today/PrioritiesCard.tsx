import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore, type EnergyTaxonomy, type FrogTask } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { canActivateDrain } from "@/lib/completion";
import { tapFeedback, successFeedback, warningFeedback } from "@/lib/feedback";
import { radius, useColors } from "@/theme";
import { Card, Row, Txt } from "@/components/ui";
import { FrogLinkSheet } from "@/components/today/FrogLinkSheet";
import { ProjectPrioritySheet } from "@/components/today/ProjectPrioritySheet";
import { AgileRerouteModal } from "@/components/today/AgileRerouteModal";
import { AnchorsSection } from "@/components/today/AnchorsSection";
import { PriorityRow } from "@/components/today/priorities/PriorityRow";
import { AddOnePriority, DraftPriorities } from "@/components/today/priorities/AddPriority";
import { DropSheet, MasteryGateSheet, RemoveLockedSheet } from "@/components/today/priorities/PrioritySheets";

function currentFrogOf(frogs: FrogTask[], activeFrogId: string | null) {
  const active = activeFrogId ? frogs.find((f) => f.id === activeFrogId && !f.isCompleted && !f.isDropped) : undefined;
  if (active) return active;
  const byOrder = [...frogs].sort((a, b) => a.order - b.order);
  return byOrder.find((f) => !f.isCompleted && !f.isDropped) ?? byOrder[byOrder.length - 1];
}

/**
 * Today's priorities: the fixed priorities folded at the head, the list (rows in ./priorities/PriorityRow),
 * the add forms, and the confirmations around closing, dropping and removing a task.
 */
export function PrioritiesCard() {
  const c = useColors();
  const frogs = useAppStore((s) => s.frogs);
  const activeFrogId = useAppStore((s) => s.activeFrogId);
  const currentDay = useAppStore((s) => s.currentDay);
  const rerouteHistory = useAppStore((s) => s.rerouteHistory);
  const toggleFrog = useAppStore((s) => s.toggleFrog);
  const updateFrog = useAppStore((s) => s.updateFrog);
  const deleteFrog = useAppStore((s) => s.deleteFrog);
  const reorderFrog = useAppStore((s) => s.reorderFrog);
  const addRerouteEvent = useAppStore((s) => s.addRerouteEvent);
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const hasSkills = useAppStore((s) => s.skills.length > 0);
  const hasProjects = useProjectsStore((s) => s.projects.length > 0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [rerouteOpen, setRerouteOpen] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const linking = frogs.find((f) => f.id === linkingId);
  const [masteryFrog, setMasteryFrog] = useState<FrogTask | null>(null);
  const [dropping, setDropping] = useState<{ frog: FrogTask; reason: string } | null>(null);
  const [removingFrog, setRemovingFrog] = useState<FrogTask | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const open = frogs.filter((f) => !f.isCompleted && !f.isDropped);
  const hasFreeSlot = open.length < 3;
  const canLink = hasProjects || hasSkills;
  const current = currentFrogOf(frogs, activeFrogId);
  const isLocked = Boolean(activeFrogId && open.some((f) => f.id === activeFrogId));
  const done = frogs.filter((f) => f.isCompleted && !f.isDropped).length;
  const sorted = [...frogs].sort((a, b) => a.order - b.order);
  const canReorder = !isLocked && !isFocusRunning && open.length > 1;
  const hasRerouteToday = rerouteHistory?.some((r) => r.date === currentDay);
  // After the plan is set (three tasks) or after 10:00, removing an open task needs a written reason.
  const isMorningLockActive = frogs.length >= 3 || new Date().getHours() >= 10;
  const pickProjects = hasProjects ? () => setPickerOpen(true) : undefined;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const handleToggle = (frog: FrogTask) => {
    if (isLocked && !frog.isCompleted && frog.id !== activeFrogId) {
      warningFeedback();
      flash("أنهِ المهمة الجارية أولاً — تركيز واحد في كل مرة.");
      return;
    }
    if (!frog.isCompleted) {
      setMasteryFrog(frog);
      return;
    }
    if (frog.energyTag === "drain" && !canActivateDrain(frogs, frog.id)) {
      warningFeedback();
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) نشطة.");
      return;
    }
    toggleFrog(frog.id);
    if (frog.isDropped) updateFrog(frog.id, { isDropped: false, dropReason: undefined });
  };

  const confirmMastery = (dod: string) => {
    if (!masteryFrog) return;
    if (dod !== masteryFrog.definitionOfDone) updateFrog(masteryFrog.id, { definitionOfDone: dod });
    toggleFrog(masteryFrog.id);
    successFeedback();
    flash("أُغلقت الدائرة بنجاح وإتقان تام 🎯");
    setMasteryFrog(null);
  };

  const handleEnergyChange = (frogId: string, tag: EnergyTaxonomy) => {
    if (tag === "drain" && !canActivateDrain(frogs, frogId)) {
      warningFeedback();
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.");
      return;
    }
    tapFeedback();
    updateFrog(frogId, { energyTag: tag });
  };

  const confirmDrop = (reason: string) => {
    if (!dropping) return;
    const { frog } = dropping;
    updateFrog(frog.id, {
      isDropped: true,
      isCompleted: true,
      dropReason: reason || "إلغاء واعٍ / رافعة استراتيجية",
      completedAt: new Date().toISOString(),
    });
    if (useAppStore.getState().activeFrogId === frog.id) useAppStore.setState({ activeFrogId: null });
    if (frog.projectId && frog.projectTaskId) useProjectsStore.getState().setTaskStatus(frog.projectId, frog.projectTaskId, "TODO");
    warningFeedback();
    flash("تم الإسقاط الواعي للمهمة — الرافعة هي معرفة ما تتخلى عنه.");
    setDropping(null);
  };

  const handleRemove = (frog: FrogTask) => {
    if (!frog.isCompleted && isMorningLockActive) setRemovingFrog(frog);
    else deleteFrog(frog.id);
  };

  const confirmRemove = (reason: string) => {
    if (!removingFrog) return;
    addRerouteEvent({
      date: currentDay,
      incident: `حذف أولوية «${removingFrog.title}»: ${reason || "تعديل مسار"}`,
      negotiatedHours: 0,
      bufferTarget: "tonight",
    });
    deleteFrog(removingFrog.id);
    setRemovingFrog(null);
    flash("تم توثيق الحذف في مسار التوجيه (Agile Reroute)");
  };

  return (
    <Card>
      {/* Header with Agile Reroute trigger */}
      <View style={{ gap: 8, paddingBottom: 6 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Row gap={8} style={{ alignItems: "center" }}>
              <Txt variant="subtitle" weight="bold">
                أولويات اليوم
              </Txt>
              {hasRerouteToday ? (
                <View
                  style={{
                    backgroundColor: c.accentSoft,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: c.accent,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Txt variant="caption" weight="medium" color="accentStrong">
                    مسار مُعاد تكييفه 🔄
                  </Txt>
                </View>
              ) : null}
            </Row>
            <Txt variant="small" color="ink2" style={{ marginTop: 2 }}>
              {frogs.length
                ? "حوكمة الإتقان (DoD) · قفل الطاقة الإدراكية · مسار طارئ مرن"
                : "ثلاث مهام كبرى فقط. واحدة في كل مرة."}
            </Txt>
          </View>

          <Row gap={6}>
            <Pressable
              onPress={() => setRerouteOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="تعديل مسار طارئ"
              hitSlop={6}
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.surface2,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Feather name="refresh-cw" size={12} color={c.ink2} />
              <Txt variant="caption" weight="medium" color="ink2">
                تعديل مسار
              </Txt>
            </Pressable>
            {frogs.length > 0 ? (
              <Txt variant="ui" color="ink2" style={{ alignSelf: "center", marginLeft: 4 }}>
                {done} من {frogs.length}
              </Txt>
            ) : null}
          </Row>
        </Row>
      </View>

      <AnchorsSection />

      {/* Notice Callout */}
      {notice ? (
        <Row gap={8} style={{ marginTop: 10, borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 10 }}>
          <Feather name="info" size={15} color={c.accentStrong} />
          <Txt variant="ui" color="accentStrong" style={{ flex: 1 }}>
            {notice}
          </Txt>
        </Row>
      ) : null}

      {frogs.length === 0 ? (
        <DraftPriorities flash={flash} onPickProjects={pickProjects} />
      ) : (
        <View style={{ marginTop: 10 }}>
          {sorted.map((frog, idx) => (
            <PriorityRow
              key={frog.id}
              frog={frog}
              index={idx}
              count={sorted.length}
              isCurrent={frog.id === current?.id && !frog.isCompleted && !frog.isDropped}
              blocked={isLocked && !frog.isCompleted && !frog.isDropped && frog.id !== activeFrogId}
              isActive={frog.id === activeFrogId}
              canReorder={canReorder}
              canLink={canLink}
              onToggle={() => handleToggle(frog)}
              onEnergy={(tag) => handleEnergyChange(frog.id, tag)}
              onStartWith={() => reorderFrog(frog.id, sorted.findIndex((f) => !f.isCompleted && !f.isDropped))}
              onDrop={(reason) => setDropping({ frog, reason })}
              onLink={() => setLinkingId(frog.id)}
              onRemove={() => handleRemove(frog)}
            />
          ))}
          {hasFreeSlot ? <AddOnePriority flash={flash} onPickProjects={pickProjects} /> : null}
        </View>
      )}

      <ProjectPrioritySheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <AgileRerouteModal open={rerouteOpen} onClose={() => setRerouteOpen(false)} onSuccess={() => flash("تم تكييف المسار الطارئ بنجاح 🔄")} />
      <FrogLinkSheet
        open={Boolean(linking)}
        title={linking?.title}
        initial={{ projectId: linking?.projectId, skillId: linking?.skillId }}
        onClose={() => setLinkingId(null)}
        onSave={(links) => {
          if (linking) updateFrog(linking.id, links);
          setLinkingId(null);
        }}
      />
      <MasteryGateSheet frog={masteryFrog} onClose={() => setMasteryFrog(null)} onConfirm={confirmMastery} />
      <DropSheet drop={dropping} onClose={() => setDropping(null)} onConfirm={confirmDrop} />
      <RemoveLockedSheet frog={removingFrog} onClose={() => setRemovingFrog(null)} onConfirm={confirmRemove} />
    </Card>
  );
}
