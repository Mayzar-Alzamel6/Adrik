import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppStore, type EnergyTaxonomy, type FrogTask } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { canActivateDrain } from "@/lib/completion";
import { tapFeedback, successFeedback, warningFeedback } from "@/lib/feedback";
import { radius, useColors } from "@/theme";
import { Button, Card, IconButton, Input, Label, Row, Sheet, Txt } from "@/components/ui";
import { FrogLinkButton, FrogLinkSheet, LineageLine } from "@/components/today/FrogLinkSheet";
import { ProjectPrioritySheet } from "@/components/today/ProjectPrioritySheet";
import { AgileRerouteModal } from "@/components/today/AgileRerouteModal";

function currentFrogOf(frogs: FrogTask[], activeFrogId: string | null) {
  const active = activeFrogId ? frogs.find((f) => f.id === activeFrogId && !f.isCompleted && !f.isDropped) : undefined;
  if (active) return active;
  const byOrder = [...frogs].sort((a, b) => a.order - b.order);
  return byOrder.find((f) => !f.isCompleted && !f.isDropped) ?? byOrder[byOrder.length - 1];
}

const ENERGY_LABELS: Record<EnergyTaxonomy, { label: string; icon: "zap" | "minus" | "alert-circle" }> = {
  genius: { label: "عبقرية ⚡", icon: "zap" },
  neutral: { label: "محايدة ⚖️", icon: "minus" },
  drain: { label: "استنزاف ⏳", icon: "alert-circle" },
};

export function PrioritiesCard() {
  const c = useColors();
  const frogs = useAppStore((s) => s.frogs);
  const activeFrogId = useAppStore((s) => s.activeFrogId);
  const currentDay = useAppStore((s) => s.currentDay);
  const rerouteHistory = useAppStore((s) => s.rerouteHistory);
  const toggleFrog = useAppStore((s) => s.toggleFrog);
  const updateFrog = useAppStore((s) => s.updateFrog);
  const appendFrog = useAppStore((s) => s.appendFrog);
  const deleteFrog = useAppStore((s) => s.deleteFrog);
  const reorderFrog = useAppStore((s) => s.reorderFrog);
  const addRerouteEvent = useAppStore((s) => s.addRerouteEvent);

  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const hasSkills = useAppStore((s) => s.skills.length > 0);
  const hasProjects = useProjectsStore((s) => s.projects.length > 0);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDod, setNewDod] = useState("");
  const [newEnergy, setNewEnergy] = useState<EnergyTaxonomy>("genius");
  const [showAddForm, setShowAddForm] = useState(false);

  // Drafts for empty day
  const [drafts, setDrafts] = useState<{ title: string; dod: string; energy: EnergyTaxonomy }[]>([
    { title: "", dod: "", energy: "genius" },
    { title: "", dod: "", energy: "neutral" },
    { title: "", dod: "", energy: "drain" },
  ]);

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingDodId, setEditingDodId] = useState<string | null>(null);
  const [editDodText, setEditDodText] = useState("");

  // Modals & Sheets
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rerouteOpen, setRerouteOpen] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const linking = frogs.find((f) => f.id === linkingId);

  // Mastery Confirmation Gate
  const [masteryFrog, setMasteryFrog] = useState<FrogTask | null>(null);
  const [masteryDodInput, setMasteryDodInput] = useState("");

  // Conscious Drop
  const [droppingFrog, setDroppingFrog] = useState<FrogTask | null>(null);
  const [dropReason, setDropReason] = useState("منخفضة الرافعة ولا تستحق الاستمرار");

  // Morning Frog Lock
  const [deletingFrog, setDeletingFrog] = useState<FrogTask | null>(null);
  const [deleteReason, setDeleteReason] = useState("طارئ خارجي أو إعادة ترتيب أولويات");

  const [notice, setNotice] = useState<string | null>(null);

  const hasFreeSlot = frogs.filter((f) => !f.isCompleted && !f.isDropped).length < 3;
  const canLink = hasProjects || hasSkills;
  const current = currentFrogOf(frogs, activeFrogId);
  const isLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted && !f.isDropped));
  const done = frogs.filter((f) => f.isCompleted && !f.isDropped).length;
  const sorted = [...frogs].sort((a, b) => a.order - b.order);
  const canReorder = !isLocked && !isFocusRunning && frogs.filter((f) => !f.isCompleted && !f.isDropped).length > 1;
  const hasRerouteToday = rerouteHistory?.some((r) => r.date === currentDay);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const startWith = (frog: FrogTask) => reorderFrog(frog.id, sorted.findIndex((f) => !f.isCompleted && !f.isDropped));

  // Morning Frog Lock handlers
  const isMorningLockActive = frogs.length >= 3 || new Date().getHours() >= 10;

  const handleDeleteClick = (frog: FrogTask) => {
    if (!frog.isCompleted && isMorningLockActive) {
      setDeletingFrog(frog);
      setDeleteReason("طارئ خارجي أو إعادة ترتيب أولويات");
    } else {
      deleteFrog(frog.id);
    }
  };

  const confirmDeleteWithReroute = () => {
    if (!deletingFrog) return;
    const finalReason = deleteReason.trim() || "تعديل مسار";
    addRerouteEvent({
      date: currentDay,
      incident: `حذف أولوية «${deletingFrog.title}»: ${finalReason}`,
      negotiatedHours: 0,
      bufferTarget: "tonight",
    });
    deleteFrog(deletingFrog.id);
    setDeletingFrog(null);
    setDeleteReason("");
    flash("تم توثيق الحذف في مسار التوجيه (Agile Reroute)");
  };

  // Handle frog completion toggle with Mastery Gate
  const handleToggle = (frog: FrogTask) => {
    if (isLocked && !frog.isCompleted && frog.id !== activeFrogId) {
      warningFeedback();
      flash("أنهِ المهمة الجارية أولاً — تركيز واحد في كل مرة.");
      return;
    }

    if (frog.isCompleted) {
      // Reopening check
      if (frog.energyTag === "drain" && !canActivateDrain(frogs, frog.id)) {
        warningFeedback();
        flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) نشطة.");
        return;
      }
      toggleFrog(frog.id);
      if (frog.isDropped) {
        updateFrog(frog.id, { isDropped: false, dropReason: undefined });
      }
    } else {
      // Open Mastery Gate Sheet before closing
      setMasteryDodInput(frog.definitionOfDone || "");
      setMasteryFrog(frog);
    }
  };

  const confirmMasteryCompletion = () => {
    if (!masteryFrog || !masteryDodInput.trim()) return;

    if (masteryDodInput.trim() !== masteryFrog.definitionOfDone) {
      updateFrog(masteryFrog.id, { definitionOfDone: masteryDodInput.trim() });
    }

    toggleFrog(masteryFrog.id);
    successFeedback();
    flash("أُغلقت الدائرة بنجاح وإتقان تام 🎯");
    setMasteryFrog(null);
  };

  // Change energy tag with max 1 drain check
  const handleEnergyChange = (frogId: string, newTag: EnergyTaxonomy) => {
    if (newTag === "drain" && !canActivateDrain(frogs, frogId)) {
      warningFeedback();
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.");
      return;
    }
    tapFeedback();
    updateFrog(frogId, { energyTag: newTag });
  };

  // Conscious Drop confirmation
  const confirmDrop = () => {
    if (!droppingFrog) return;
    updateFrog(droppingFrog.id, {
      isDropped: true,
      isCompleted: true,
      dropReason: dropReason.trim() || "إلغاء واعٍ / رافعة استراتيجية",
      completedAt: new Date().toISOString(),
    });

    if (useAppStore.getState().activeFrogId === droppingFrog.id) {
      useAppStore.setState({ activeFrogId: null });
    }

    if (droppingFrog.projectId && droppingFrog.projectTaskId) {
      useProjectsStore.getState().setTaskStatus(droppingFrog.projectId, droppingFrog.projectTaskId, "TODO");
    }

    warningFeedback();
    flash("تم الإسقاط الواعي للمهمة — الرافعة هي معرفة ما تتخلى عنه.");
    setDroppingFrog(null);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) updateFrog(id, { title: editText.trim() });
    setEditingId(null);
  };

  const saveDodEdit = (id: string) => {
    if (editDodText.trim()) updateFrog(id, { definitionOfDone: editDodText.trim() });
    setEditingDodId(null);
  };

  // Save drafts with DoD validation and max 1 drain
  const saveDrafts = () => {
    const activeDrafts = drafts.filter((d) => d.title.trim());
    if (activeDrafts.length === 0) return;

    const missingDod = activeDrafts.some((d) => !d.dod.trim());
    if (missingDod) {
      warningFeedback();
      flash("شرط الاكتمال (DoD) إلزامي لكل أولوية نشطة: حدد معيار تسليم واضحاً.");
      return;
    }

    const drainCount = activeDrafts.filter((d) => d.energy === "drain").length;
    if (drainCount > 1 || (drainCount === 1 && !canActivateDrain(frogs))) {
      warningFeedback();
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.");
      return;
    }

    activeDrafts.forEach((d) => {
      const res = appendFrog(d.title.trim(), "QUALITY");
      if (res.ok) {
        updateFrog(res.id, {
          definitionOfDone: d.dod.trim(),
          energyTag: d.energy,
        });
      }
    });

    successFeedback();
    setDrafts([
      { title: "", dod: "", energy: "genius" },
      { title: "", dod: "", energy: "neutral" },
      { title: "", dod: "", energy: "drain" },
    ]);
  };

  // Add single priority
  const addOne = () => {
    if (!newTitle.trim()) return;

    if (!newDod.trim()) {
      warningFeedback();
      flash("شرط الاكتمال (DoD) إلزامي: حدد معيار تسليم واضحاً للضفدع.");
      return;
    }

    if (newEnergy === "drain" && !canActivateDrain(frogs)) {
      warningFeedback();
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.");
      return;
    }

    const res = appendFrog(newTitle.trim(), "QUALITY");
    if (res.ok) {
      updateFrog(res.id, {
        definitionOfDone: newDod.trim(),
        energyTag: newEnergy,
      });
      successFeedback();
      setNewTitle("");
      setNewDod("");
      setNewEnergy("genius");
      setShowAddForm(false);
    } else {
      warningFeedback();
      flash(res.message);
    }
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

      {/* Notice Callout */}
      {notice ? (
        <Row gap={8} style={{ marginTop: 10, borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 10 }}>
          <Feather name="info" size={15} color={c.accentStrong} />
          <Txt variant="ui" color="accentStrong" style={{ flex: 1 }}>
            {notice}
          </Txt>
        </Row>
      ) : null}

      {/* Drafts when empty */}
      {frogs.length === 0 ? (
        <View style={{ marginTop: 14, gap: 14 }}>
          <View>
            <Txt variant="subtitle" weight="semibold" align="center">
              ما أهم ثلاثة أشياء اليوم؟
            </Txt>
            <Txt variant="ui" color="ink2" align="center" style={{ marginTop: 4 }}>
              حدد معيار الإتقان (DoD) وصنف استهلاك الطاقة لحماية تركيزك.
            </Txt>
          </View>

          {drafts.map((d, i) => (
            <View
              key={i}
              style={{
                backgroundColor: c.surface2,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
                padding: 12,
                gap: 8,
              }}
            >
              <Row gap={8} style={{ alignItems: "center" }}>
                <OrderDot n={i + 1} />
                <View style={{ flex: 1 }}>
                  <Input
                    value={d.title}
                    onChangeText={(t) => setDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, title: t } : p)))}
                    placeholder={i === 0 ? "الأولوية الكبرى (ما يصعب تأجيله)" : `أولوية إضافية ${i + 1}`}
                    accessibilityLabel={`الأولوية ${i + 1}`}
                  />
                </View>
              </Row>

              <Input
                value={d.dod}
                onChangeText={(t) => setDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, dod: t } : p)))}
                placeholder="شرط الإتقان (DoD): تم عند تسليم..."
                accessibilityLabel={`شرط الإتقان للأولوية ${i + 1}`}
                style={{ fontSize: 13, minHeight: 40 }}
              />

              <Row gap={6}>
                {(["genius", "neutral", "drain"] as EnergyTaxonomy[]).map((e) => {
                  const active = d.energy === e;
                  return (
                    <Pressable
                      key={e}
                      onPress={() => {
                        if (e === "drain") {
                          const otherDrain = drafts.some((dr, idx) => idx !== i && dr.energy === "drain" && dr.title.trim());
                          if (otherDrain) {
                            warningFeedback();
                            flash("قفل الطاقة: مسموح بمهمة استنزاف واحدة فقط يومياً.");
                            return;
                          }
                        }
                        tapFeedback();
                        setDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, energy: e } : p)));
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: radius.sm,
                        borderWidth: 1,
                        borderColor: active ? (e === "drain" ? c.danger : e === "genius" ? c.brand : c.ink) : c.line,
                        backgroundColor: active
                          ? e === "drain"
                            ? c.dangerSoft
                            : e === "genius"
                            ? c.brandSoft
                            : c.surface
                          : "transparent",
                      }}
                    >
                      <Txt
                        variant="caption"
                        weight={active ? "semibold" : "regular"}
                        color={active ? (e === "drain" ? "danger" : e === "genius" ? "brand" : "ink") : "ink3"}
                      >
                        {ENERGY_LABELS[e].label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          ))}

          <Button
            title="اعتماد الأولويات وحوكمة الإتقان"
            disabled={!drafts.some((d) => d.title.trim())}
            onPress={saveDrafts}
          />
          {hasProjects ? (
            <Button
              title="اختر من مشاريعك"
              icon="folder"
              variant="secondary"
              onPress={() => setPickerOpen(true)}
            />
          ) : null}
        </View>
      ) : (
        /* Active priorities list */
        <View style={{ marginTop: 10 }}>
          {sorted.map((frog, idx) => {
            const isCurrent = frog.id === current?.id && !frog.isCompleted && !frog.isDropped;
            const blocked = isLocked && !frog.isCompleted && !frog.isDropped && frog.id !== activeFrogId;
            const energy = frog.energyTag || "neutral";

            return (
              <View
                key={frog.id}
                style={{
                  paddingVertical: 12,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: c.line,
                  opacity: frog.isDropped ? 0.6 : 1,
                }}
              >
                <Row gap={12} style={{ alignItems: "flex-start" }}>
                  {/* Completion / Toggle Checkbox */}
                  <Pressable
                    onPress={() => handleToggle(frog)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: frog.isCompleted, disabled: blocked }}
                    accessibilityLabel={frog.isCompleted ? "إلغاء الإتمام" : "إتمام المهمة"}
                    hitSlop={8}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: 1.5,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: frog.isCompleted ? (frog.isDropped ? c.danger : c.brand) : "transparent",
                      borderColor: frog.isCompleted
                        ? frog.isDropped
                          ? c.danger
                          : c.brand
                        : blocked
                        ? c.line
                        : c.lineStrong,
                      marginTop: 2,
                    }}
                  >
                    {frog.isCompleted ? (
                      <Feather name={frog.isDropped ? "slash" : "check"} size={16} color={c.brandInk} />
                    ) : null}
                  </Pressable>

                  <View style={{ flex: 1, gap: 4 }}>
                    {/* Title input or label */}
                    {editingId === frog.id ? (
                      <Input
                        autoFocus
                        value={editText}
                        onChangeText={setEditText}
                        onBlur={() => saveEdit(frog.id)}
                        onSubmitEditing={() => saveEdit(frog.id)}
                        style={{ minHeight: 40 }}
                      />
                    ) : (
                      <Pressable
                        onPress={() => {
                          if (!frog.isCompleted) {
                            setEditingId(frog.id);
                            setEditText(frog.title);
                          }
                        }}
                      >
                        <Txt
                          numberOfLines={2}
                          weight="medium"
                          color={frog.isCompleted ? "ink3" : "ink"}
                          style={frog.isCompleted ? { textDecorationLine: "line-through" } : undefined}
                        >
                          {frog.title}
                        </Txt>
                      </Pressable>
                    )}

                    {/* Dropped status or DoD display */}
                    {frog.isDropped ? (
                      <Row gap={4} style={{ alignItems: "center" }}>
                        <View
                          style={{
                            backgroundColor: c.dangerSoft,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: radius.sm,
                          }}
                        >
                          <Txt variant="caption" color="danger" weight="medium">
                            مُسقطة واعياً 🚫
                          </Txt>
                        </View>
                        {frog.dropReason ? (
                          <Txt variant="caption" color="ink3" numberOfLines={1}>
                            ({frog.dropReason})
                          </Txt>
                        ) : null}
                      </Row>
                    ) : (
                      <View>
                        {editingDodId === frog.id ? (
                          <Input
                            autoFocus
                            value={editDodText}
                            onChangeText={setEditDodText}
                            onBlur={() => saveDodEdit(frog.id)}
                            onSubmitEditing={() => saveDodEdit(frog.id)}
                            placeholder="شرط الإتقان (DoD)"
                            style={{ minHeight: 36, fontSize: 13 }}
                          />
                        ) : (
                          <Pressable
                            onPress={() => {
                              if (!frog.isCompleted) {
                                setEditingDodId(frog.id);
                                setEditDodText(frog.definitionOfDone || "");
                              }
                            }}
                          >
                            <Txt variant="caption" color={frog.definitionOfDone ? "ink2" : "accentStrong"}>
                              {frog.definitionOfDone ? `🎯 الإتقان: ${frog.definitionOfDone}` : "⚠️ بلا شرط إتقان (DoD) · اضغط للتحديد"}
                            </Txt>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {/* Lineage links */}
                    {frog.projectId || frog.skillId ? (
                      <LineageLine links={frog} />
                    ) : canLink && !frog.isCompleted ? (
                      <Pressable onPress={() => setLinkingId(frog.id)} accessibilityRole="button" hitSlop={6}>
                        <Txt variant="caption" color="ink3">
                          بلا مشروع · اربطها
                        </Txt>
                      </Pressable>
                    ) : null}

                    {/* Energy tag switcher & Actions */}
                    {!frog.isCompleted ? (
                      <Row gap={6} style={{ marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {/* Energy Pills */}
                        <Row gap={4}>
                          {(["genius", "neutral", "drain"] as EnergyTaxonomy[]).map((e) => {
                            const isSelected = energy === e;
                            return (
                              <Pressable
                                key={e}
                                onPress={() => handleEnergyChange(frog.id, e)}
                                style={{
                                  borderRadius: radius.full,
                                  borderWidth: 1,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderColor: isSelected
                                    ? e === "drain"
                                      ? c.danger
                                      : e === "genius"
                                      ? c.brand
                                      : c.lineStrong
                                    : c.line,
                                  backgroundColor: isSelected
                                    ? e === "drain"
                                      ? c.dangerSoft
                                      : e === "genius"
                                      ? c.brandSoft
                                      : c.surface2
                                    : "transparent",
                                }}
                              >
                                <Txt
                                  variant="caption"
                                  weight={isSelected ? "semibold" : "regular"}
                                  color={
                                    isSelected
                                      ? e === "drain"
                                        ? "danger"
                                        : e === "genius"
                                        ? "brand"
                                        : "ink"
                                      : "ink3"
                                  }
                                >
                                  {ENERGY_LABELS[e].label}
                                </Txt>
                              </Pressable>
                            );
                          })}
                        </Row>

                        {/* Action buttons */}
                        <Row gap={2} style={{ alignItems: "center" }}>
                          {!isCurrent && canReorder ? (
                            <Pressable
                              onPress={() => startWith(frog)}
                              accessibilityRole="button"
                              style={{
                                borderWidth: 1,
                                borderColor: c.line,
                                borderRadius: radius.full,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              }}
                            >
                              <Txt variant="caption" weight="medium" color="ink2">
                                ابدأ بها
                              </Txt>
                            </Pressable>
                          ) : null}

                          {canReorder && idx > 0 ? (
                            <IconButton
                              icon="chevron-up"
                              label={`ارفع «${frog.title}»`}
                              onPress={() => reorderFrog(frog.id, idx - 1)}
                            />
                          ) : null}
                          {canReorder && idx < sorted.length - 1 ? (
                            <IconButton
                              icon="chevron-down"
                              label={`أنزل «${frog.title}»`}
                              onPress={() => reorderFrog(frog.id, idx + 1)}
                            />
                          ) : null}

                          {/* Conscious drop */}
                          <Pressable
                            onPress={() => {
                              setDroppingFrog(frog);
                              setDropReason("منخفضة الرافعة ولا تستحق الاستمرار");
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`إسقاط واعٍ لـ «${frog.title}»`}
                            hitSlop={6}
                            style={{
                              borderWidth: 1,
                              borderColor: c.line,
                              borderRadius: radius.full,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Txt variant="caption" color="ink3">
                              إسقاط واعٍ
                            </Txt>
                          </Pressable>

                          {canLink ? (
                            <FrogLinkButton
                              links={frog}
                              label={`ربط «${frog.title}» بمشروع أو مهارة`}
                              onPress={() => setLinkingId(frog.id)}
                            />
                          ) : null}

                          {frog.id !== activeFrogId ? (
                            <IconButton
                              icon="x"
                              label={`إزالة «${frog.title}»`}
                              onPress={() => handleDeleteClick(frog)}
                            />
                          ) : null}
                        </Row>
                      </Row>
                    ) : null}
                  </View>

                  {/* Status badge: 'الآن' or Order Dot */}
                  {isCurrent ? (
                    <View
                      style={{
                        borderRadius: radius.full,
                        backgroundColor: c.brandSoft,
                        paddingHorizontal: 10,
                        paddingVertical: 2,
                      }}
                    >
                      <Txt variant="caption" weight="medium" color="brand">
                        الآن
                      </Txt>
                    </View>
                  ) : !frog.isCompleted ? (
                    <OrderDot n={idx + 1} small />
                  ) : null}
                </Row>
              </View>
            );
          })}

          {/* Add single priority form / trigger */}
          {hasFreeSlot ? (
            <View style={{ marginTop: 10 }}>
              {!showAddForm ? (
                <Row gap={8} style={{ justifyContent: "space-between" }}>
                  <Pressable
                    onPress={() => setShowAddForm(true)}
                    accessibilityRole="button"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: c.line,
                      borderStyle: "dashed",
                      borderRadius: radius.md,
                      paddingVertical: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Row gap={6}>
                      <Feather name="plus" size={16} color={c.ink2} />
                      <Txt variant="ui" color="ink2">
                        أضف أولوية جديدة
                      </Txt>
                    </Row>
                  </Pressable>

                  {hasProjects ? (
                    <Button
                      title="من المشاريع"
                      icon="folder"
                      variant="secondary"
                      onPress={() => setPickerOpen(true)}
                    />
                  ) : null}
                </Row>
              ) : (
                <View
                  style={{
                    backgroundColor: c.surface2,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: c.line,
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Input
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="عنوان الأولوية..."
                    accessibilityLabel="عنوان الأولوية الجديدة"
                    maxLength={140}
                  />

                  <Input
                    value={newDod}
                    onChangeText={setNewDod}
                    placeholder="شرط الاكتمال (DoD): تم عند تسليم..."
                    accessibilityLabel="شرط الاكتمال للأولوية الجديدة"
                    style={{ fontSize: 13, minHeight: 40 }}
                  />

                  <Row gap={6}>
                    {(["genius", "neutral", "drain"] as EnergyTaxonomy[]).map((e) => {
                      const active = newEnergy === e;
                      return (
                        <Pressable
                          key={e}
                          onPress={() => {
                            if (e === "drain") {
                              const activeDrainCount = frogs.filter(
                                (f) => !f.isCompleted && !f.isDropped && f.energyTag === "drain"
                              ).length;
                              if (activeDrainCount >= 1) {
                                warningFeedback();
                                flash("قفل الطاقة: مسموح بمهمة استنزاف واحدة فقط يومياً.");
                                return;
                              }
                            }
                            tapFeedback();
                            setNewEnergy(e);
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: radius.sm,
                            borderWidth: 1,
                            borderColor: active
                              ? e === "drain"
                                ? c.danger
                                : e === "genius"
                                ? c.brand
                                : c.ink
                              : c.line,
                            backgroundColor: active
                              ? e === "drain"
                                ? c.dangerSoft
                                : e === "genius"
                                ? c.brandSoft
                                : c.surface
                              : "transparent",
                          }}
                        >
                          <Txt
                            variant="caption"
                            weight={active ? "semibold" : "regular"}
                            color={active ? (e === "drain" ? "danger" : e === "genius" ? "brand" : "ink") : "ink3"}
                          >
                            {ENERGY_LABELS[e].label}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </Row>

                  <Row gap={8} style={{ justifyContent: "flex-end" }}>
                    <Button
                      title="إلغاء"
                      variant="secondary"
                      onPress={() => {
                        setShowAddForm(false);
                        setNewTitle("");
                        setNewDod("");
                      }}
                    />
                    <Button
                      title="إضافة وتثبيت"
                      disabled={!newTitle.trim()}
                      onPress={addOne}
                    />
                  </Row>
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* Sheets & Dialogs */}
      <ProjectPrioritySheet open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <AgileRerouteModal
        open={rerouteOpen}
        onClose={() => setRerouteOpen(false)}
        onSuccess={() => flash("تم تكييف المسار الطارئ بنجاح 🔄")}
      />

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

      {/* Mastery Confirmation Gate Sheet */}
      <Sheet
        open={Boolean(masteryFrog)}
        onClose={() => setMasteryFrog(null)}
        title="بوابة تأكيد الإتقان (Mastery Gate)"
        description="التحقق من إغلاق الدائرة بالكامل قبل شطب الأولوية."
      >
        {masteryFrog ? (
          <View style={{ gap: 14 }}>
            <View
              style={{
                backgroundColor: c.surface2,
                borderRadius: radius.md,
                padding: 12,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Txt variant="caption" color="ink2">
                المهمة المراد إغلاقها:
              </Txt>
              <Txt weight="bold" style={{ marginTop: 2 }}>
                {masteryFrog.title}
              </Txt>
            </View>

            <View>
              <Label hint="هل تم تسليم الأثر بالكامل وفق هذا المعيار؟">شرط الاكتمال (Definition of Done)</Label>
              <Input
                value={masteryDodInput}
                onChangeText={setMasteryDodInput}
                placeholder="اكتب ما تم تسليمه فعلياً للتحقق من الإتقان..."
                multiline
              />
            </View>

            <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <Button
                title="إلغاء"
                variant="secondary"
                onPress={() => setMasteryFrog(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="تأكيد الإتقان وإغلاق الدائرة 🎯"
                disabled={!masteryDodInput.trim()}
                onPress={confirmMasteryCompletion}
                style={{ flex: 2 }}
              />
            </Row>
          </View>
        ) : null}
      </Sheet>

      {/* Conscious Drop Sheet */}
      <Sheet
        open={Boolean(droppingFrog)}
        onClose={() => setDroppingFrog(null)}
        title="الإسقاط الواعي للأولوية (Conscious Drop)"
        description="التخلي الاستراتيجي عن مهمة منخفضة الرافعة لحماية طاقتك."
      >
        {droppingFrog ? (
          <View style={{ gap: 14 }}>
            <View
              style={{
                backgroundColor: c.dangerSoft,
                borderRadius: radius.md,
                padding: 12,
              }}
            >
              <Txt variant="caption" color="danger">
                المهمة المراد إسقاطها:
              </Txt>
              <Txt weight="bold" color="danger">
                {droppingFrog.title}
              </Txt>
            </View>

            <View>
              <Label hint="اختر أو اكتب سبب الإسقاط الواعي:">مبرر الإسقاط الاستراتيجي</Label>
              <View style={{ gap: 6, marginBottom: 8 }}>
                {[
                  "منخفضة الرافعة ولا تستحق الاستمرار",
                  "تفويض لطرف آخر / أتمتة",
                  "تغيرت المعطيات والأولويات الاستراتيجية",
                ].map((reason) => {
                  const selected = dropReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => setDropReason(reason)}
                      style={{
                        padding: 10,
                        borderRadius: radius.sm,
                        borderWidth: 1,
                        borderColor: selected ? c.brand : c.line,
                        backgroundColor: selected ? c.brandSoft : c.surface2,
                      }}
                    >
                      <Txt variant="small" weight={selected ? "semibold" : "regular"} color={selected ? "brand" : "ink2"}>
                        {reason}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>

              <Input
                value={dropReason}
                onChangeText={setDropReason}
                placeholder="أو اكتب سبباً مخصصاً..."
              />
            </View>

            <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <Button
                title="تراجع"
                variant="secondary"
                onPress={() => setDroppingFrog(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="تأكيد الإسقاط الواعي 🚫"
                variant="danger"
                onPress={confirmDrop}
                style={{ flex: 2 }}
              />
            </Row>
          </View>
        ) : null}
      </Sheet>

      {/* Morning Frog Lock Sheet */}
      <Sheet
        open={Boolean(deletingFrog)}
        onClose={() => setDeletingFrog(null)}
        title="قفل الضفدع الصباحي (Morning Frog Lock)"
        description="بعد اعتماد الأولويات أو بعد 10:00 صباحاً، النظام يمنع التسويف المقنع. يرجى توثيق سبب الاستبعاد لتسجيله في مسار التوجيه (Agile Reroute)."
      >
        {deletingFrog ? (
          <View style={{ gap: 14 }}>
            <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12, gap: 4 }}>
              <Txt variant="caption" weight="medium" color="ink3">
                الأولوية المراد حذفها:
              </Txt>
              <Txt weight="bold">{deletingFrog.title}</Txt>
            </View>

            <View style={{ gap: 8 }}>
              <Label>سبب الحذف أو الاستبعاد:</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["طارئ خارجي ملح", "إعادة ترتيب الأولويات", "المهمة غير واضحة", "مهمة غير مجدية اليوم"].map((reason) => {
                  const selected = deleteReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => setDeleteReason(reason)}
                      style={{
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selected ? c.brand : c.line,
                        backgroundColor: selected ? c.brandSoft : c.surface2,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Txt variant="small" weight={selected ? "semibold" : "regular"} color={selected ? "brand" : "ink2"}>
                        {reason}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>

              <Input
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="أو اكتب سبباً مخصصاً..."
              />
            </View>

            <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <Button
                title="تراجع"
                variant="secondary"
                onPress={() => setDeletingFrog(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="تأكيد الحذف والتوثيق"
                variant="danger"
                disabled={!deleteReason.trim()}
                onPress={confirmDeleteWithReroute}
                style={{ flex: 2 }}
              />
            </Row>
          </View>
        ) : null}
      </Sheet>
    </Card>
  );
}

function OrderDot({ n, small }: { n: number; small?: boolean }) {
  const c = useColors();
  const size = small ? 24 : 28;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.surface2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="small" weight="semibold" color="ink2" align="center">
        {n}
      </Txt>
    </View>
  );
}
