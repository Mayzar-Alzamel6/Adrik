"use client";

import React, { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  FolderKanban,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  useProjectsStore,
  type TaskHorizon,
  type TimelineTask,
  type ProjectTaskStatus,
} from "@/stores/useProjectsStore";
import { useAppStore, type EnergyTaxonomy } from "@/stores/useAppStore";
import { cn, toLocalDateString, weekOf, weekRangeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SegmentedControl } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

const WEEKDAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const HORIZON_LABELS: Record<TaskHorizon, { label: string; badge: string }> = {
  DAILY: { label: "يومية", badge: "bg-surface-2 text-ink-2 border-line" },
  WEEKLY: { label: "أسبوعية", badge: "bg-brand/10 text-brand border-brand/20 font-semibold" },
  MONTHLY: { label: "شهرية (معلم)", badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 font-semibold" },
};

type ViewMode = "MONTH" | "WEEK" | "DAY";

export function InteractiveTimeline({ initialProjectId }: { initialProjectId?: string } = {}) {
  const {
    projects,
    timelineTasks = [],
    addTimelineTask,
    updateTimelineTask,
    setTimelineTaskStatus,
    deleteTimelineTask,
  } = useProjectsStore(
    useShallow((s) => ({
      projects: s.projects,
      timelineTasks: s.timelineTasks,
      addTimelineTask: s.addTimelineTask,
      updateTimelineTask: s.updateTimelineTask,
      setTimelineTaskStatus: s.setTimelineTaskStatus,
      deleteTimelineTask: s.deleteTimelineTask,
    }))
  );

  const currentDay = useAppStore((s) => s.currentDay);
  const appendFrog = useAppStore((s) => s.appendFrog);
  const updateFrog = useAppStore((s) => s.updateFrog);

  // Active view & navigation
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH");
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [filterHorizon, setFilterHorizon] = useState<"ALL" | TaskHorizon>("ALL");
  const [filterProject, setFilterProject] = useState<string>(initialProjectId || "ALL");
  const [notice, setNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialProjectId) {
      setFilterProject(initialProjectId);
    }
  }, [initialProjectId]);

  // Modal Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TimelineTask | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskHorizon, setTaskHorizon] = useState<TaskHorizon>("DAILY");
  const [taskDate, setTaskDate] = useState(toLocalDateString());
  const [taskProject, setTaskProject] = useState<string>("");
  const [taskDod, setTaskDod] = useState("");
  const [taskEnergy, setTaskEnergy] = useState<EnergyTaxonomy>("genius");

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const todayStr = currentDay || toLocalDateString();
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "MONTH") {
      setActiveDate(new Date(year, month - 1, 1));
    } else if (viewMode === "WEEK") {
      setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() - 7));
    } else {
      setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() - 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "MONTH") {
      setActiveDate(new Date(year, month + 1, 1));
    } else if (viewMode === "WEEK") {
      setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() + 7));
    } else {
      setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() + 1));
    }
  };

  const handleToday = () => {
    setActiveDate(new Date());
  };

  // Open modal to add or edit
  const openNewTask = (dateStr?: string, defaultHorizon: TaskHorizon = "DAILY") => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskHorizon(defaultHorizon);
    setTaskDate(dateStr || toLocalDateString(activeDate));
    setTaskProject("");
    setTaskDod("");
    setTaskEnergy("genius");
    setSheetOpen(true);
  };

  const openEditTask = (task: TimelineTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskHorizon(task.horizon);
    setTaskDate(task.scheduledDate);
    setTaskProject(task.projectId || "");
    setTaskDod(task.definitionOfDone || "");
    setTaskEnergy(task.energyTag || "genius");
    setSheetOpen(true);
  };

  const saveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDate) return;

    const [y, m] = taskDate.split("-");
    const dObj = new Date(taskDate);
    const wInfo = weekOf(dObj);

    if (editingTask) {
      updateTimelineTask(editingTask.id, {
        title: taskTitle.trim(),
        horizon: taskHorizon,
        scheduledDate: taskDate,
        weekNumber: wInfo.week,
        monthYear: `${y}-${m}`,
        projectId: taskProject || undefined,
        definitionOfDone: taskDod.trim() || undefined,
        energyTag: taskEnergy,
      });
      flash("تم تحديث المهمة بنجاح ✅");
    } else {
      addTimelineTask({
        title: taskTitle.trim(),
        horizon: taskHorizon,
        scheduledDate: taskDate,
        weekNumber: wInfo.week,
        monthYear: `${y}-${m}`,
        projectId: taskProject || undefined,
        definitionOfDone: taskDod.trim() || undefined,
        energyTag: taskEnergy,
      });
      flash("تمت جدولة المهمة على المسار الزمني 📅");
    }

    setSheetOpen(false);
  };

  // Promote task to Today's Frog
  const promoteToToday = (task: TimelineTask) => {
    const res = appendFrog(task.title, "QUALITY");
    if (res.ok) {
      updateFrog(res.id, {
        definitionOfDone: task.definitionOfDone,
        energyTag: task.energyTag,
        projectId: task.projectId,
      });
      flash("تم تصعيد المهمة بنجاح إلى أولويات اليوم الثلاث 🐸");
    } else {
      flash(res.message);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return (timelineTasks || []).filter((t) => {
      if (filterHorizon !== "ALL" && t.horizon !== filterHorizon) return false;
      if (filterProject !== "ALL" && t.projectId !== filterProject) return false;
      return true;
    });
  }, [timelineTasks, filterHorizon, filterProject]);

  // Group tasks by scheduled date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TimelineTask[]>();
    for (const t of filteredTasks) {
      if (!t.scheduledDate) continue;
      const list = map.get(t.scheduledDate) || [];
      list.push(t);
      map.set(t.scheduledDate, list);
    }
    return map;
  }, [filteredTasks]);

  // Month grid calculations
  const monthData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const satIndex = (firstDay.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, ...
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = satIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const d = new Date(year, month - 1, dNum);
      cells.push({ dateStr: toLocalDateString(d), dayNum: dNum, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({ dateStr: toLocalDateString(d), dayNum: i, isCurrentMonth: true });
    }

    // Next month padding to complete row
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remainder; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ dateStr: toLocalDateString(d), dayNum: i, isCurrentMonth: false });
    }

    return cells;
  }, [year, month]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const satOffset = (activeDate.getDay() + 1) % 7;
    const saturday = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() - satOffset);
    const days: { dateStr: string; dateObj: Date; dayName: string }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + i);
      days.push({
        dateStr: toLocalDateString(d),
        dateObj: d,
        dayName: WEEKDAYS[i],
      });
    }
    return days;
  }, [activeDate]);

  // Monthly milestones for the active month
  const activeMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthMilestones = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.horizon === "MONTHLY" && (t.monthYear === activeMonthStr || (t.scheduledDate && t.scheduledDate.startsWith(activeMonthStr)))
    );
  }, [filteredTasks, activeMonthStr]);

  // Weekly deliverables for the active week
  const activeWeekInfo = weekOf(activeDate);
  const weekDeliverables = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.horizon === "WEEKLY" && (t.weekNumber === activeWeekInfo.week || weekDays.some((w) => w.dateStr === t.scheduledDate))
    );
  }, [filteredTasks, activeWeekInfo.week, weekDays]);

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div
          role="status"
          className="rounded-xl bg-accent-soft text-accent-strong border border-accent/20 px-4 py-2.5 text-ui flex items-center justify-between animate-rise-in shadow-sm"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Header */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 transition"
                title="السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-caption font-semibold text-ink hover:text-brand transition"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 transition"
                title="التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="font-display font-semibold text-subtitle text-ink min-w-[140px]">
              {viewMode === "MONTH" && `${MONTH_NAMES[month]} ${year}`}
              {viewMode === "WEEK" && `أسبوع: ${weekRangeLabel(activeWeekInfo)}`}
              {viewMode === "DAY" &&
                new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(activeDate)}
            </div>
          </div>

          {/* View Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<ViewMode>
              value={viewMode}
              onChange={(v) => setViewMode(v)}
              options={[
                { value: "MONTH", label: "شهري 🗓️" },
                { value: "WEEK", label: "أسبوعي 📅" },
                { value: "DAY", label: "يومي ☀️" },
              ]}
              size="sm"
            />

            <Button onClick={() => openNewTask(toLocalDateString(activeDate))} size="sm">
              <Plus className="w-4 h-4 ml-1" />
              مهمة مجدولة
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-small">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-ink-3" />
            <span className="text-caption text-ink-3">الأفق:</span>
            <select
              value={filterHorizon}
              onChange={(e) => setFilterHorizon(e.target.value as "ALL" | TaskHorizon)}
              className="h-7 text-caption rounded-lg border border-line bg-surface px-2 text-ink focus:outline-none"
            >
              <option value="ALL">كافة الآفاق (الكل)</option>
              <option value="DAILY">يومية فقط</option>
              <option value="WEEKLY">أسبوعية فقط</option>
              <option value="MONTHLY">شهرية فقط</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5 text-ink-3" />
            <span className="text-caption text-ink-3">المشروع:</span>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="h-7 text-caption rounded-lg border border-line bg-surface px-2 text-ink focus:outline-none max-w-[200px]"
            >
              <option value="ALL">كافة المشاريع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ---------------- 1. MONTH VIEW ---------------- */}
      {viewMode === "MONTH" && (
        <div className="space-y-4">
          {/* Monthly Milestones Banner */}
          {monthMilestones.length > 0 && (
            <Card className="p-4 border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-small font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  معالم الشهر الكبرى (Monthly Milestones):
                </span>
                <span className="text-caption text-indigo-700 dark:text-indigo-400">
                  {monthMilestones.filter((m) => m.status === "DONE").length} من {monthMilestones.length} منجز
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {monthMilestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => openEditTask(m)}
                    className={cn(
                      "p-2.5 rounded-lg border text-small cursor-pointer transition flex items-start justify-between gap-2",
                      m.status === "DONE"
                        ? "bg-surface/60 border-line line-through text-ink-3"
                        : "bg-surface border-indigo-500/30 text-ink shadow-2xs hover:border-indigo-500"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{m.title}</div>
                      {m.definitionOfDone && (
                        <div className="text-[11px] text-ink-3 truncate mt-0.5">DoD: {m.definitionOfDone}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimelineTaskStatus(m.id, m.status === "DONE" ? "TODO" : "DONE");
                      }}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition",
                        m.status === "DONE" ? "bg-indigo-600 border-indigo-600 text-white" : "border-line"
                      )}
                    >
                      {m.status === "DONE" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Month Calendar Grid */}
          <Card className="p-3 sm:p-5 overflow-hidden">
            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 pb-2 border-b border-line text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-caption font-semibold text-ink-3">
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
              {monthData.map((cell, idx) => {
                const dayTasks = tasksByDate.get(cell.dateStr) || [];
                const isToday = cell.dateStr === todayStr;

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => openNewTask(cell.dateStr)}
                    className={cn(
                      "min-h-[92px] sm:min-h-[115px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer group",
                      cell.isCurrentMonth
                        ? isToday
                          ? "border-brand bg-brand-soft/40 shadow-xs ring-1 ring-brand/30"
                          : "border-line/70 bg-surface hover:border-brand/40 hover:bg-surface-2"
                        : "border-line/30 bg-surface/30 opacity-50 hover:opacity-80"
                    )}
                  >
                    {/* Header of cell */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full inline-flex items-center justify-center text-caption font-medium tabular",
                          isToday
                            ? "bg-brand text-brand-ink font-bold"
                            : cell.isCurrentMonth
                            ? "text-ink"
                            : "text-ink-3"
                        )}
                      >
                        {cell.dayNum}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewTask(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-brand transition"
                        title="أضف مهمة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task chips */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTask(t);
                          }}
                          className={cn(
                            "text-[11px] leading-tight px-1.5 py-0.5 rounded truncate border transition flex items-center justify-between gap-1",
                            t.status === "DONE"
                              ? "bg-surface-2 text-ink-3 border-line line-through"
                              : t.energyTag === "genius"
                              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
                              : t.energyTag === "drain"
                              ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
                              : "bg-surface text-ink border-line"
                          )}
                          title={t.title}
                        >
                          <span className="truncate">{t.title}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimelineTaskStatus(t.id, t.status === "DONE" ? "TODO" : "DONE");
                            }}
                            className={cn(
                              "w-3 h-3 rounded-full border shrink-0 inline-flex items-center justify-center",
                              t.status === "DONE" ? "bg-brand border-brand text-white" : "border-ink-3/40"
                            )}
                          >
                            {t.status === "DONE" && <Check className="w-2 h-2 stroke-[3]" />}
                          </span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-ink-3 text-center">+{dayTasks.length - 3} مهام</div>
                      )}
                    </div>

                    {/* Footer indicator */}
                    <div className="text-[10px] text-ink-3 text-left tabular">
                      {dayTasks.length > 0 && `${dayTasks.filter((t) => t.status === "DONE").length}/${dayTasks.length}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- 2. WEEK VIEW ---------------- */}
      {viewMode === "WEEK" && (
        <div className="space-y-4">
          {/* Weekly Deliverables Horizon Banner */}
          {weekDeliverables.length > 0 && (
            <Card className="p-4 border-brand/30 bg-brand-soft/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-small font-bold text-ink flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-brand" />
                  تسليمات الأسبوع المصيرية (Weekly Deliverables):
                </span>
                <span className="text-caption text-ink-2">
                  {weekDeliverables.filter((w) => w.status === "DONE").length} من {weekDeliverables.length} منجز
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {weekDeliverables.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => openEditTask(w)}
                    className={cn(
                      "p-2.5 rounded-lg border text-small cursor-pointer transition flex items-start justify-between gap-2",
                      w.status === "DONE"
                        ? "bg-surface/60 border-line line-through text-ink-3"
                        : "bg-surface border-brand/30 text-ink shadow-2xs hover:border-brand"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{w.title}</div>
                      {w.definitionOfDone && (
                        <div className="text-[11px] text-ink-3 truncate mt-0.5">DoD: {w.definitionOfDone}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteToToday(w);
                        }}
                        className="text-[10px] bg-brand-soft text-brand font-semibold px-1.5 py-0.5 rounded border border-brand/30 hover:bg-brand hover:text-white transition"
                        title="إرسال لأولويات اليوم 🐸"
                      >
                        اليوم 🐸
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineTaskStatus(w.id, w.status === "DONE" ? "TODO" : "DONE");
                        }}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition",
                          w.status === "DONE" ? "bg-brand border-brand text-white" : "border-line"
                        )}
                      >
                        {w.status === "DONE" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Week Columns */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 items-start">
            {weekDays.map((col) => {
              const dayTasks = tasksByDate.get(col.dateStr) || [];
              const isToday = col.dateStr === todayStr;

              return (
                <Card
                  key={col.dateStr}
                  className={cn(
                    "p-3 space-y-3 flex flex-col justify-between min-h-[300px]",
                    isToday ? "border-brand ring-1 ring-brand/30 bg-surface shadow-xs" : "border-line bg-surface"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <div>
                        <span className="block text-small font-bold text-ink">{col.dayName}</span>
                        <span className="text-[11px] text-ink-3">
                          {col.dateObj.getDate()} {MONTH_NAMES[col.dateObj.getMonth()]}
                        </span>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                          اليوم
                        </span>
                      )}
                    </div>

                    {/* Task list for this day */}
                    <div className="mt-3 space-y-2">
                      {dayTasks.map((t) => {
                        const project = projects.find((p) => p.id === t.projectId);
                        return (
                          <div
                            key={t.id}
                            onClick={() => openEditTask(t)}
                            className={cn(
                              "p-2.5 rounded-xl border text-small transition cursor-pointer space-y-1.5",
                              t.status === "DONE"
                                ? "bg-surface-2 border-line text-ink-3 line-through"
                                : "bg-surface border-line hover:border-brand/50 shadow-2xs"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-semibold text-ink leading-snug">{t.title}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTimelineTaskStatus(t.id, t.status === "DONE" ? "TODO" : "DONE");
                                }}
                                className={cn(
                                  "w-4 h-4 mt-0.5 rounded border shrink-0 inline-flex items-center justify-center transition",
                                  t.status === "DONE" ? "bg-brand border-brand text-white" : "border-line"
                                )}
                              >
                                {t.status === "DONE" && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                            </div>

                            {t.definitionOfDone && (
                              <div className="text-[11px] text-ink-2 flex items-center gap-1">
                                <Target className="w-3 h-3 text-ink-3 shrink-0" />
                                <span className="truncate">{t.definitionOfDone}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[10px]">
                              {project ? (
                                <span className="text-brand font-medium truncate max-w-[100px]">
                                  📁 {project.name}
                                </span>
                              ) : (
                                <span className="text-ink-3">مستقلة</span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  promoteToToday(t);
                                }}
                                className="text-brand font-bold hover:underline"
                                title="إرسال لأولويات اليوم 🐸"
                              >
                                اليوم 🐸
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {dayTasks.length === 0 && (
                        <div className="text-center py-6 text-caption text-ink-3">لا مهام مجدولة</div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openNewTask(col.dateStr)}
                    className="w-full text-caption"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    أضف مهمة
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 3. DAY VIEW ---------------- */}
      {viewMode === "DAY" && (
        <Card className="p-5 sm:p-7 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div>
              <h3 className="font-display text-title font-bold text-ink">
                مهام يوم{" "}
                {new Intl.DateTimeFormat("ar", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(activeDate)}
              </h3>
              <p className="text-small text-ink-2 mt-0.5">الجدول الزمني والمهام المرتبطة بهذا التاريخ المحدد.</p>
            </div>
            <Button size="sm" onClick={() => openNewTask(toLocalDateString(activeDate))}>
              <Plus className="w-4 h-4 ml-1" />
              أضف مهمة
            </Button>
          </div>

          {/* List of Tasks for this Day */}
          <div className="space-y-3">
            {(tasksByDate.get(toLocalDateString(activeDate)) || []).map((t) => {
              const project = projects.find((p) => p.id === t.projectId);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "p-4 rounded-xl border flex items-start justify-between gap-3 transition",
                    t.status === "DONE" ? "bg-surface-2 border-line opacity-70" : "bg-surface border-line shadow-xs"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setTimelineTaskStatus(t.id, t.status === "DONE" ? "TODO" : "DONE")}
                      className={cn(
                        "w-6 h-6 mt-0.5 rounded-full border flex items-center justify-center shrink-0 transition",
                        t.status === "DONE" ? "bg-brand border-brand text-white" : "border-ink-3/50"
                      )}
                    >
                      {t.status === "DONE" && <Check className="w-4 h-4 stroke-[2.5]" />}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-body font-bold",
                            t.status === "DONE" ? "line-through text-ink-3" : "text-ink"
                          )}
                        >
                          {t.title}
                        </span>
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", HORIZON_LABELS[t.horizon].badge)}>
                          {HORIZON_LABELS[t.horizon].label}
                        </span>
                        {t.energyTag && (
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border",
                              t.energyTag === "genius"
                                ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                                : t.energyTag === "drain"
                                ? "bg-amber-500/10 text-amber-800 border-amber-500/20"
                                : "bg-surface-2 text-ink-3 border-line"
                            )}
                          >
                            {t.energyTag === "genius" ? "🧠 عبقرية" : t.energyTag === "drain" ? "⚡ استنزاف" : "⚪ محايد"}
                          </span>
                        )}
                      </div>

                      {t.definitionOfDone && (
                        <p className="text-small text-ink-2 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-brand shrink-0" />
                          <span>DoD: {t.definitionOfDone}</span>
                        </p>
                      )}

                      {project && (
                        <p className="text-caption text-ink-3 flex items-center gap-1">
                          <FolderKanban className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                          <span>المشروع: {project.name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => promoteToToday(t)}>
                      أولوية لليوم 🐸
                    </Button>
                    <button
                      type="button"
                      onClick={() => openEditTask(t)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTimelineTask(t.id)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-danger hover:bg-danger-soft"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {(tasksByDate.get(toLocalDateString(activeDate)) || []).length === 0 && (
              <EmptyState
                icon={CalendarIcon}
                title="لا توجد مهام مجدولة لهذا اليوم"
                description="استفد من هذا اليوم في مهام التركيز العميقة أو أضف مهمة جديدة."
                className="py-8"
              />
            )}
          </div>
        </Card>
      )}

      {/* Task Creation & Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingTask ? "تعديل المهمة المجدولة" : "إضافة مهمة على المسار الزمني"}
        description="مهام يومية، أسبوعية، أو معالم شهرية مستقلة مع إمكانية ربطها بالمشاريع."
        size="md"
      >
        <form onSubmit={saveTask} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="timeline-task-title">عنوان المهمة</Label>
            <Input
              id="timeline-task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="مثال: تسليم المخطط الهندسي / مراجعة كود المنظومة"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>أفق المهمة (Horizon)</Label>
              <select
                value={taskHorizon}
                onChange={(e) => setTaskHorizon(e.target.value as TaskHorizon)}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-small text-ink focus:outline-none focus:border-brand"
              >
                <option value="DAILY">☀️ مهمة يومية (Daily Task)</option>
                <option value="WEEKLY">📅 تسليم أسبوعي (Weekly Deliverable)</option>
                <option value="MONTHLY">🗓️ معلم شهري رئيسي (Monthly Milestone)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="timeline-task-date">تاريخ الاستحقاق أو الجدولة</Label>
              <Input
                id="timeline-task-date"
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>الربط بمشروع قائم (اختياري)</Label>
            <select
              value={taskProject}
              onChange={(e) => setTaskProject(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-small text-ink focus:outline-none focus:border-brand"
            >
              <option value="">بلا مشروع (مهمة مستقلة)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="timeline-task-dod" hint="ما المعيار الصريح لاعتبار هذه المهمة منجزة بنسبة 100%؟">
              معيار الاكتمال النوعي (Definition of Done)
            </Label>
            <Input
              id="timeline-task-dod"
              value={taskDod}
              onChange={(e) => setTaskDod(e.target.value)}
              placeholder="مثال: اجتياز فحص الكود واختبارات الوحدة بنسبة 100%"
            />
          </div>

          <div>
            <Label>تصنيف الطاقة الإدراكية (Energy Taxonomy)</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { tag: "genius" as EnergyTaxonomy, label: "🧠 عبقرية فطرية" },
                { tag: "neutral" as EnergyTaxonomy, label: "⚪ محايد / تشغيلي" },
                { tag: "drain" as EnergyTaxonomy, label: "⚡ استنزاف طاقي" },
              ].map((opt) => (
                <button
                  key={opt.tag}
                  type="button"
                  onClick={() => setTaskEnergy(opt.tag)}
                  className={cn(
                    "p-2 rounded-lg border text-caption font-semibold transition text-center",
                    taskEnergy === opt.tag
                      ? "border-brand bg-brand-soft text-brand shadow-2xs"
                      : "border-line text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-line">
            {editingTask ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  deleteTimelineTask(editingTask.id);
                  setSheetOpen(false);
                  flash("تم حذف المهمة من المسار الزمني");
                }}
                className="text-danger hover:bg-danger-soft"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                حذف المهمة
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={!taskTitle.trim() || !taskDate}>
                {editingTask ? "حفظ التعديلات" : "إضافة للمسار الزمني"}
              </Button>
            </div>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
