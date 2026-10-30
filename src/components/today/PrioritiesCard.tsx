"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FrogLinkSheet, LineageLine } from "@/components/lineage/Lineage";
import { useAppStore, type EnergyTaxonomy, type FrogTask } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Input, Label, SectionHeader } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { canActivateDrain } from "@/lib/completion";
import { ProjectPrioritySheet } from "./ProjectPrioritySheet";
import { AgileRerouteModal } from "./AgileRerouteModal";

export function PrioritiesCard() {
  const {
    frogs,
    activeFrogId,
    getCurrentFrog,
    toggleFrog,
    updateFrog,
    appendFrog,
    deleteFrog,
    reorderFrog,
    currentDay,
    rerouteHistory,
    addRerouteEvent,
  } = useAppStore(
    useShallow((s) => ({
      frogs: s.frogs,
      activeFrogId: s.activeFrogId,
      getCurrentFrog: s.getCurrentFrog,
      toggleFrog: s.toggleFrog,
      updateFrog: s.updateFrog,
      appendFrog: s.appendFrog,
      deleteFrog: s.deleteFrog,
      reorderFrog: s.reorderFrog,
      currentDay: s.currentDay,
      rerouteHistory: s.rerouteHistory,
      addRerouteEvent: s.addRerouteEvent,
    }))
  );

  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const hasSkills = useAppStore((s) => s.skills.length > 0);
  const [newTitle, setNewTitle] = useState("");
  const [newDod, setNewDod] = useState("");
  const [newEnergy, setNewEnergy] = useState<EnergyTaxonomy>("genius");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingDodId, setEditingDodId] = useState<string | null>(null);
  const [editDodText, setEditDodText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Initial drafts for empty day
  const [drafts, setDrafts] = useState([
    { title: "", dod: "", energy: "genius" as EnergyTaxonomy },
    { title: "", dod: "", energy: "neutral" as EnergyTaxonomy },
    { title: "", dod: "", energy: "drain" as EnergyTaxonomy },
  ]);

  // Modal states
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const linking = frogs.find((f) => f.id === linkingId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rerouteOpen, setRerouteOpen] = useState(false);

  // Mastery Confirmation Gate state
  const [masteryFrog, setMasteryFrog] = useState<FrogTask | null>(null);
  const [masteryDodInput, setMasteryDodInput] = useState("");

  // Conscious Drop / Outsource state
  const [droppingFrog, setDroppingFrog] = useState<FrogTask | null>(null);
  const [dropReason, setDropReason] = useState("منخفضة الرافعة ولا تستحق الاستمرار");

  // Morning Frog Lock state
  const [deletingFrog, setDeletingFrog] = useState<FrogTask | null>(null);
  const [deleteReason, setDeleteReason] = useState("طارئ خارجي أو إعادة ترتيب أولويات");

  const hasProjects = useProjectsStore((s) => s.projects.length > 0);
  const hasFreeSlot = frogs.filter((f) => !f.isCompleted).length < 3;
  const canLink = hasProjects || hasSkills;

  const current = getCurrentFrog();
  const isLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
  const done = frogs.filter((f) => f.isCompleted).length;
  const sorted = [...frogs].sort((a, b) => a.order - b.order);
  const canReorder = !isLocked && !isFocusRunning && frogs.filter((f) => !f.isCompleted).length > 1;
  const startWith = (frog: FrogTask) => reorderFrog(frog.id, sorted.findIndex((f) => !f.isCompleted));

  const hasRerouteToday = rerouteHistory?.some((r) => r.date === currentDay);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Toggle complete with Mastery Confirmation Gate
  const handleToggleClick = (frog: FrogTask) => {
    if (isLocked && !frog.isCompleted && frog.id !== activeFrogId) {
      flash("أنهِ المهمة الجارية أولاً — تركيز واحد في كل مرة.");
      return;
    }

    if (frog.isCompleted) {
      // Reopening check: if reopening a drain frog, verify active drain limit
      if (frog.energyTag === "drain" && !canActivateDrain(frogs, frog.id)) {
        flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) نشطة.");
        return;
      }
      toggleFrog(frog.id);
      if (frog.isDropped) {
        updateFrog(frog.id, { isDropped: false, dropReason: undefined });
      }
    } else {
      // Gate check before closing
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
    flash("أُغلقت الدائرة بنجاح وإتقان تام 🎯");
    setMasteryFrog(null);
  };

  // Energy tag handler with max 1 drain constraint
  const handleEnergyChange = (frogId: string, newTag: EnergyTaxonomy) => {
    if (newTag === "drain" && !canActivateDrain(frogs, frogId)) {
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً لحماية طاقتك من الانهيار.");
      return;
    }
    updateFrog(frogId, { energyTag: newTag });
  };

  // Conscious drop confirm
  const confirmDrop = () => {
    if (!droppingFrog) return;
    updateFrog(droppingFrog.id, {
      isDropped: true,
      isCompleted: true,
      dropReason: dropReason.trim() || "إلغاء واعٍ / رافعة استراتيجية",
      completedAt: new Date().toISOString(),
    });
    // Clear activeFrogId if this was the active frog
    if (useAppStore.getState().activeFrogId === droppingFrog.id) {
      useAppStore.setState({ activeFrogId: null });
    }
    // Sync linked project task if any
    if (droppingFrog.projectId && droppingFrog.projectTaskId) {
      useProjectsStore.getState().setTaskStatus(droppingFrog.projectId, droppingFrog.projectTaskId, "TODO");
    }
    flash("تم الإسقاط الواعي للمهمة — الرافعة هي معرفة ما تتخلى عنه.");
    setDroppingFrog(null);
  };

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
    flash("تم توثيق الحذف في مسار التوجيه المرن (Agile Reroute)");
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) updateFrog(id, { title: editText.trim() });
    setEditingId(null);
  };

  const saveDodEdit = (id: string) => {
    if (editDodText.trim()) updateFrog(id, { definitionOfDone: editDodText.trim() });
    setEditingDodId(null);
  };

  const saveDrafts = (e: React.FormEvent) => {
    e.preventDefault();
    const activeDrafts = drafts.filter((d) => d.title.trim());
    const missingDod = activeDrafts.some((d) => !d.dod.trim());
    if (missingDod) {
      flash("شرط الاكتمال (DoD) إلزامي لكل أولوية نشطة: حدد معيار تسليم واضحاً.");
      return;
    }

    // Validate max 1 drain among drafts
    const drainCount = activeDrafts.filter((d) => d.energy === "drain").length;
    if (drainCount > 1) {
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

    setDrafts([
      { title: "", dod: "", energy: "genius" },
      { title: "", dod: "", energy: "neutral" },
      { title: "", dod: "", energy: "drain" },
    ]);
  };

  const addOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (!newDod.trim()) {
      flash("شرط الاكتمال (DoD) إلزامي: حدد معيار تسليم واضحاً للضفدع.");
      return;
    }

    if (newEnergy === "drain" && !canActivateDrain(frogs)) {
      flash("قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.");
      return;
    }

    const res = appendFrog(newTitle.trim(), "QUALITY");
    if (res.ok) {
      updateFrog(res.id, {
        definitionOfDone: newDod.trim(),
        energyTag: newEnergy,
      });
      setNewTitle("");
      setNewDod("");
      setNewEnergy("genius");
    } else {
      flash(res.message);
    }
  };

  return (
    <Card as="section" className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="text-h3 font-bold text-ink flex items-center gap-2">
            أولويات اليوم
            {hasRerouteToday && (
              <span className="text-caption font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin-reverse" />
                مسار مُعاد تكييفه 🔄
              </span>
            )}
          </h2>
          <p className="text-small text-ink-2 mt-0.5">
            {frogs.length ? "حوكمة الإتقان (DoD) · قفل الطاقة الإدراكية · مسار طارئ مرن" : "ثلاث مهام كبرى فقط. واحدة في كل مرة."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {frogs.length > 0 && (
            <span className="text-ui text-ink-2 tabular ml-2">
              <span className="font-semibold text-ink">{done}</span> من {frogs.length}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRerouteOpen(true)}
            className="text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            title="تعديل مسار خوارزمي عند حدوث طارئ"
          >
            <RefreshCw className="w-3.5 h-3.5 ml-1" />
            تعديل مسار طارئ
          </Button>
        </div>
      </div>

      {notice && (
        <div role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-accent-soft text-accent-strong px-3.5 py-2.5 text-ui animate-rise-in">
          <Lock className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}

      {/* Initial Empty State Form */}
      {frogs.length === 0 ? (
        <form onSubmit={saveDrafts} className="mt-4">
          <EmptyState
            icon={Target}
            title="ما أهم ثلاث أولويات اليوم؟"
            description="حدد أولوياتك مع معيار الاكتمال النوعي (DoD) ونطاق الطاقة لتفادي الاستنزاف."
            className="py-4"
          />
          <div className="space-y-4 max-w-xl mx-auto">
            {drafts.map((d, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-line bg-surface/50 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full bg-surface-2 text-small font-semibold text-ink-2 tabular">
                    {i + 1}
                  </span>
                  <Input
                    value={d.title}
                    onChange={(e) =>
                      setDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))
                    }
                    placeholder={i === 0 ? "الأولوية الكبرى (الأثقل والأهم)" : `الأولوية ${i + 1} (اختياري)`}
                    className="flex-1"
                  />
                  <select
                    value={d.energy}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, energy: e.target.value as EnergyTaxonomy } : p))
                      )
                    }
                    className="h-9 px-2.5 rounded-lg border border-line bg-surface text-small text-ink focus:outline-none focus:border-brand"
                    title="تصنيف الطاقة"
                  >
                    <option value="genius">🧠 عبقرية فطرية</option>
                    <option value="neutral">⚪ محايد</option>
                    <option value="drain">⚡ استنزاف تشغيلي</option>
                  </select>
                </div>
                <Input
                  value={d.dod}
                  onChange={(e) =>
                    setDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, dod: e.target.value } : p)))
                  }
                  placeholder="معيار الاكتمال الإلزامي (Definition of Done) — متى تعتبر المهمة منجزة بدقة؟"
                  className="text-small text-ink-2"
                />
              </div>
            ))}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              {hasProjects ? (
                <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                  <FolderKanban className="w-4 h-4 ml-1.5" />
                  اختر من مشاريعك
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={!drafts.some((d) => d.title.trim())}>
                اعتماد الأولويات وحوكمة اليوم
              </Button>
            </div>
          </div>
        </form>
      ) : (
        /* List of Active Frogs */
        <ol className="mt-4 divide-y divide-line">
          {sorted.map((frog, idx) => {
            const isCurrent = frog.id === current?.id && !frog.isCompleted;
            const blocked = isLocked && !frog.isCompleted && frog.id !== activeFrogId;

            return (
              <li key={frog.id} className="py-3.5 first:pt-2 last:pb-2 space-y-2">
                <div className="flex items-start gap-3">
                  {/* Mastery Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleClick(frog)}
                    aria-label={frog.isCompleted ? "إلغاء الإتمام" : "إتمام المهمة مع فحص الإتقان"}
                    aria-disabled={blocked}
                    className={cn(
                      "w-7 h-7 mt-0.5 shrink-0 inline-flex items-center justify-center rounded-full border-[1.5px] transition",
                      frog.isCompleted
                        ? frog.isDropped
                          ? "bg-amber-600 border-amber-600 text-white"
                          : "bg-brand border-brand text-brand-ink"
                        : blocked
                        ? "border-line text-transparent cursor-not-allowed"
                        : "border-ink-3/60 text-transparent hover:border-brand hover:text-brand/40"
                    )}
                  >
                    {frog.isDropped ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" strokeWidth={2.6} />}
                  </button>

                  {/* Title & Details */}
                  <div className="flex-1 min-w-0">
                    {editingId === frog.id ? (
                      <Input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => saveEdit(frog.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(frog.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-9"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(frog.id);
                            setEditText(frog.title);
                          }}
                          title="تعديل العنوان"
                          className={cn(
                            "text-right text-body font-medium leading-relaxed truncate transition",
                            frog.isCompleted
                              ? "text-ink-3 line-through decoration-ink-3/50"
                              : "text-ink hover:text-brand"
                          )}
                        >
                          {frog.title}
                        </button>

                        {/* Energy Tag Badge */}
                        {!frog.isCompleted && (
                          <div className="inline-flex items-center">
                            <select
                              value={frog.energyTag || "neutral"}
                              onChange={(e) => handleEnergyChange(frog.id, e.target.value as EnergyTaxonomy)}
                              className={cn(
                                "text-caption font-semibold px-2 py-0.5 rounded-full border bg-transparent cursor-pointer transition",
                                frog.energyTag === "genius"
                                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                  : frog.energyTag === "drain"
                                  ? "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                                  : "border-line text-ink-3"
                              )}
                            >
                              <option value="genius">🧠 عبقرية فطرية</option>
                              <option value="neutral">⚪ محايد</option>
                              <option value="drain">⚡ استنزاف تشغيلي</option>
                            </select>
                          </div>
                        )}

                        {frog.isDropped && (
                          <span className="text-caption font-semibold bg-stone-200 dark:bg-stone-800 text-ink-2 px-2 py-0.5 rounded-full border border-line">
                            🎯 إسقاط واعٍ: {frog.dropReason}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Definition of Done display / edit */}
                    <div className="mt-1 flex items-center gap-2 text-caption">
                      {editingDodId === frog.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            autoFocus
                            value={editDodText}
                            onChange={(e) => setEditDodText(e.target.value)}
                            onBlur={() => saveDodEdit(frog.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDodEdit(frog.id);
                              if (e.key === "Escape") setEditingDodId(null);
                            }}
                            placeholder="حدد معيار الاكتمال النوعي (DoD)"
                            className="h-7 text-caption"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDodId(frog.id);
                            setEditDodText(frog.definitionOfDone || "");
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 transition",
                            frog.definitionOfDone
                              ? "text-ink-2 hover:text-brand"
                              : "text-amber-600 dark:text-amber-400 font-medium hover:underline"
                          )}
                          title="تعديل معيار الاكتمال"
                        >
                          <Target className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {frog.definitionOfDone ? `DoD: ${frog.definitionOfDone}` : "+ حدد معيار الـ DoD الإلزامي"}
                          </span>
                        </button>
                      )}

                      {frog.projectId || frog.skillId ? (
                        <LineageLine links={frog} className="inline-block" />
                      ) : (
                        canLink &&
                        !frog.isCompleted && (
                          <button
                            type="button"
                            onClick={() => setLinkingId(frog.id)}
                            className="text-ink-3 hover:text-brand transition"
                          >
                            · بلا مشروع
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Conscious Drop / Outsource Button */}
                    {!frog.isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setDroppingFrog(frog);
                          setDropReason("منخفضة الرافعة ولا تستحق الاستمرار");
                        }}
                        aria-label="إلغاء واعٍ أو تفويض"
                        title="إلغاء واعٍ / تفويض (Kill/Outsource)"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-amber-600 hover:bg-amber-500/10 transition"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {canLink && (
                      <button
                        type="button"
                        onClick={() => setLinkingId(frog.id)}
                        aria-label={`ربط «${frog.title}» بمشروع أو مهارة`}
                        title="ربط بمشروع أو مهارة"
                        className={cn(
                          "w-8 h-8 inline-flex items-center justify-center rounded-full transition",
                          frog.projectId || frog.skillId
                            ? "text-brand hover:bg-brand-soft"
                            : "text-ink-3 hover:text-ink hover:bg-surface-2"
                        )}
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    )}

                    {!frog.isCompleted && frog.id !== activeFrogId && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(frog)}
                        aria-label={`إزالة «${frog.title}» من أولويات اليوم`}
                        title="إزالة من اليوم"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isCurrent && (
                      <span className="text-caption font-medium text-brand bg-brand-soft rounded-full px-2.5 py-0.5">
                        الآن
                      </span>
                    )}

                    {!isCurrent && !frog.isCompleted && (
                      canReorder ? (
                        <button
                          type="button"
                          onClick={() => startWith(frog)}
                          title="اجعلها الأولوية التي تعمل عليها الآن"
                          className="text-caption font-medium text-ink-2 border border-line rounded-full px-2.5 py-0.5 hover:border-brand hover:text-brand transition"
                        >
                          ابدأ بها
                        </button>
                      ) : (
                        <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-surface-2 text-caption text-ink-3 tabular">
                          {idx + 1}
                        </span>
                      )
                    )}

                    {canReorder && !frog.isCompleted && (
                      <span className="flex flex-col -my-1">
                        <button
                          type="button"
                          onClick={() => reorderFrog(frog.id, idx - 1)}
                          disabled={idx === 0}
                          aria-label={`ارفع «${frog.title}»`}
                          className="w-6 h-4 inline-flex items-center justify-center rounded text-ink-3 hover:text-ink disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorderFrog(frog.id, idx + 1)}
                          disabled={idx === sorted.length - 1}
                          aria-label={`أنزل «${frog.title}»`}
                          className="w-6 h-4 inline-flex items-center justify-center rounded text-ink-3 hover:text-ink disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Add new frog input */}
      {frogs.length > 0 && hasFreeSlot && (
        <form onSubmit={addOne} className="mt-4 p-3 rounded-xl border border-dashed border-line-strong space-y-2">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-ink-3 shrink-0" />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="عنوان أولوية جديدة..."
              aria-label="أضف أولوية لليوم"
              maxLength={140}
              className="flex-1 bg-transparent text-ui text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <select
              value={newEnergy}
              onChange={(e) => setNewEnergy(e.target.value as EnergyTaxonomy)}
              className="text-caption font-medium h-7 px-2 rounded border border-line bg-surface text-ink focus:outline-none"
            >
              <option value="genius">🧠 عبقرية فطرية</option>
              <option value="neutral">⚪ محايد</option>
              <option value="drain">⚡ استنزاف تشغيلي</option>
            </select>
            {hasProjects && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                <FolderKanban className="w-3.5 h-3.5 ml-1" />
                مشاريعك
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 pr-6">
            <input
              value={newDod}
              onChange={(e) => setNewDod(e.target.value)}
              placeholder="معيار الـ DoD: ما الدليل القاطع على انتهاء المهمة؟ (اضغط Enter للحفظ)"
              className="flex-1 bg-transparent text-caption text-ink placeholder:text-ink-3/70 focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={!newTitle.trim()}>
              إضافة
            </Button>
          </div>
        </form>
      )}

      {/* Mastery Confirmation Gate Modal */}
      <Sheet
        open={Boolean(masteryFrog)}
        onClose={() => setMasteryFrog(null)}
        size="md"
        title="بوابة تأكيد الإتقان وحوكمة الإغلاق"
        description="فحص جودة إدراكي: منع الشطب السريع والدوبامين الرخيص لنمط INTJ-A."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1">
            <div className="text-caption font-semibold text-ink-3">المهمة المراد شطبها:</div>
            <div className="text-body font-bold text-ink">{masteryFrog?.title}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mastery-dod" className="font-medium text-ink flex items-center gap-1.5">
              <Target className="w-4 h-4 text-brand" />
              معيار الاكتمال النوعي (Definition of Done):
            </Label>
            <Input
              id="mastery-dod"
              value={masteryDodInput}
              onChange={(e) => setMasteryDodInput(e.target.value)}
              placeholder="مثال: إنهاء 5 تمارين وحل الاختبار بنسبة ≥ 80%"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-small text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              هل تم استيفاء معيار الـ DoD أعلاه بنسبة 100% بإتقان حقيقي؟ أم أن الرغبة القهرية في شطب المهمة وإغلاق
              الدائرة (Zeigarnik Effect) هي التي تدفعك للإنهاء السريع؟
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <Button variant="secondary" onClick={() => setMasteryFrog(null)}>
              متابعة العمل والتدقيق ⏳
            </Button>
            <Button onClick={confirmMasteryCompletion} disabled={!masteryDodInput.trim()}>
              <Check className="w-4 h-4 ml-1.5" />
              أؤكد الإتقان واستيفاء الـ DoD بنسبة 100% ✅
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Conscious Drop / Outsource Protocol Modal */}
      <Sheet
        open={Boolean(droppingFrog)}
        onClose={() => setDroppingFrog(null)}
        size="md"
        title="بروتوكول الإلغاء الواعي أو التفويض (Kill / Outsource)"
        description="إسقاط المهام غير المجدية بوعي هو أعلى درجات الرافعة الاستراتيجية (High Leverage)."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line">
            <div className="text-caption font-semibold text-ink-3">المهمة المستهدفة:</div>
            <div className="text-body font-bold text-ink">{droppingFrog?.title}</div>
          </div>

          <div className="space-y-2">
            <Label className="font-medium text-ink">سبب الإسقاط أو التفويض:</Label>
            <div className="space-y-1.5">
              {[
                "منخفضة الرافعة ولا تستحق استنزاف الطاقة",
                "تم تفويضها بالكامل لطرف خارجي",
                "انتفت الحاجة إليها ولا تؤثر على الأهداف المصيرية",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDropReason(reason)}
                  className={cn(
                    "w-full text-right p-2.5 rounded-lg border text-small transition",
                    dropReason === reason
                      ? "border-brand bg-brand-soft text-brand-ink font-semibold"
                      : "border-line text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              value={dropReason}
              onChange={(e) => setDropReason(e.target.value)}
              placeholder="أو اكتب سبباً مخصصاً..."
              className="mt-2 text-small"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <Button variant="secondary" onClick={() => setDroppingFrog(null)}>
              تراجع
            </Button>
            <Button onClick={confirmDrop} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Ban className="w-4 h-4 ml-1.5" />
              تأكيد الإسقاط الواعي دون ذنب
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Morning Frog Lock Modal */}
      <Sheet
        open={Boolean(deletingFrog)}
        onClose={() => setDeletingFrog(null)}
        size="md"
        title="قفل الضفدع الصباحي (Morning Frog Lock)"
        description="بعد اعتماد الأولويات أو بعد 10:00 صباحاً، النظام يمنع التسويف المقنع. يرجى توثيق سبب الاستبعاد لتسجيله في مسار التوجيه (Agile Reroute)."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line">
            <div className="text-caption font-semibold text-ink-3">الأولوية المراد حذفها:</div>
            <div className="text-body font-bold text-ink">{deletingFrog?.title}</div>
          </div>

          <div>
            <Label className="mb-1.5 block font-medium">سبب الحذف أو الاستبعاد:</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {["طارئ خارجي ملح", "إعادة ترتيب الأولويات", "المهمة غير واضحة", "مهمة غير مجدية اليوم"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDeleteReason(reason)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-caption border transition",
                    deleteReason === reason
                      ? "border-brand bg-brand-soft text-brand font-medium"
                      : "border-line text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="اكتب سبباً مختصراً..."
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <Button variant="secondary" onClick={() => setDeletingFrog(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              disabled={!deleteReason.trim()}
              onClick={confirmDeleteWithReroute}
            >
              تأكيد الحذف والتوثيق
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Agile Reroute Modal */}
      <AgileRerouteModal
        open={rerouteOpen}
        onClose={() => setRerouteOpen(false)}
        onSuccess={() => flash("تم تكييف المسار وإعادة الجدولة بنجاح 🔄")}
      />

      <ProjectPrioritySheet open={pickerOpen} onClose={() => setPickerOpen(false)} />

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
    </Card>
  );
}
