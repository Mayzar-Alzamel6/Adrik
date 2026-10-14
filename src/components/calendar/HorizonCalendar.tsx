"use client";

import React, { useState } from "react";
import { CalendarCheck, Clock, FolderKanban, Flag, ListPlus, MapPin, Plus, Trash2 } from "lucide-react";
import { useAppStore, type CalendarEventItem } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { sendToInbox } from "@/lib/flow";
import { toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SectionHeader } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

function dayLabel(date: string) {
  const today = toLocalDateString();
  const tomorrow = toLocalDateString(new Date(Date.now() + 86_400_000));
  if (date === today) return "اليوم";
  if (date === tomorrow) return "غداً";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

/** A project's target date, shown among the appointments without being stored twice. */
type Row = CalendarEventItem & { deadline?: boolean };

/** Fixed future commitments. Kept off the Today screen; surfaced in the evening when planning tomorrow. */
export const HorizonCalendar: React.FC = () => {
  const events = useAppStore((s) => s.events);
  const addEvent = useAppStore((s) => s.addEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const projects = useProjectsStore((s) => s.projects);
  const [projectId, setProjectId] = useState("");
  const [prepared, setPrepared] = useState<Record<string, string>>({});
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;

  /** Preparing for an appointment is work: it goes to the project's tasks, or the inbox. */
  const prepare = (ev: Row) => {
    const res = sendToInbox(ev.deadline ? `إنهاء ما تبقّى قبل موعد التسليم` : `التحضير لـ: ${ev.title}`, ev.projectId);
    setPrepared((p) => ({ ...p, [ev.id]: res.message }));
  };
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addEvent({
      title: title.trim(),
      date,
      time: time || undefined,
      location: location.trim() || undefined,
      isMandatory,
      ...(projectId ? { projectId } : {}),
    });
    setProjectId("");
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setIsMandatory(false);
    setOpen(false);
  };

  const today = toLocalDateString();
  const deadlines: Row[] = projects
    .filter((p) => p.targetDate && p.targetDate >= today)
    .map((p) => ({
      id: `deadline-${p.id}`,
      title: `موعد تسليم: ${p.name}`,
      date: p.targetDate!,
      isMandatory: true,
      createdAt: p.createdAt,
      projectId: p.id,
      deadline: true,
    }));
  const upcoming: Row[] = [...events.filter((e) => e.date >= today), ...deadlines].sort((a, b) =>
    (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))
  );
  const past = events.filter((e) => e.date < today);
  const groups = upcoming.reduce<Record<string, Row[]>>((acc, ev) => {
    (acc[ev.date] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title="القادم"
          description="لا تزدحم بها شاشة اليوم؛ ستظهر لك مساءً وأنت تخطط للغد. مواعيد تسليم مشاريعك تظهر هنا تلقائياً."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" />
              موعد جديد
            </Button>
          }
        />

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="لا مواعيد قادمة"
            description="أضف اختباراً، أو تسليماً، أو موعداً ثابتاً، لتبني أولوياتك حوله بواقعية."
          />
        ) : (
          <div className="mt-6 space-y-6">
            {Object.entries(groups).map(([day, list]) => (
              <div key={day}>
                <p className="text-small font-medium text-ink-3 mb-2">{dayLabel(day)}</p>
                <ul className="space-y-2">
                  {list.map((ev) => (
                    <li key={ev.id} className="group rounded-xl2 border border-line px-4 py-3">
                      <div className="flex items-center gap-4">
                        <span className="w-14 shrink-0 font-display text-body text-ink tabular" dir="ltr" style={{ textAlign: "right" }}>
                          {ev.deadline ? <Flag className="w-4 h-4 text-danger inline" /> : ev.time || "—"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-body text-ink font-medium truncate">{ev.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {ev.location && (
                              <span className="text-small text-ink-2 inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {ev.location}
                              </span>
                            )}
                            {!ev.deadline && projectName(ev.projectId) && (
                              <span className="text-small text-ink-3 inline-flex items-center gap-1">
                                <FolderKanban className="w-3.5 h-3.5" />
                                {projectName(ev.projectId)}
                              </span>
                            )}
                          </div>
                        </div>
                        {ev.deadline ? <Badge tone="danger">مشروع</Badge> : ev.isMandatory && <Badge tone="accent">لا يُؤجَّل</Badge>}
                        <button
                          type="button"
                          onClick={() => prepare(ev)}
                          title="أضف مهمة تحضير له"
                          aria-label={`أضف مهمة تحضير لـ ${ev.title}`}
                          className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand hover:bg-brand-soft transition"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                        {!ev.deadline && (
                          <button
                            type="button"
                            onClick={() => deleteEvent(ev.id)}
                            aria-label="حذف"
                            className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft sm:opacity-0 sm:group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {prepared[ev.id] && (
                        <p role="status" className="text-small text-brand mt-1.5 pr-[72px]">
                          {prepared[ev.id]}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <p className="mt-6 text-small text-ink-3 inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {past.length} موعد مضى
          </p>
        )}
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="موعد جديد" size="sm">
        <form onSubmit={save} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="ev-title">ما هو؟</Label>
            <Input id="ev-title" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تسليم المرحلة الأولى" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-date">التاريخ</Label>
              <Input id="ev-date" type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ev-time" hint="اختياري">
                الوقت
              </Label>
              <Input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ev-loc" hint="اختياري">
              المكان أو الرابط
            </Label>
            <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          {projects.length > 0 && (
            <div>
              <Label htmlFor="ev-project" hint="اختياري — يظهر الموعد في خريطة مشروعه، وتذهب مهام التحضير إليه.">
                المشروع
              </Label>
              <select
                id="ev-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-11 bg-surface border border-line-strong rounded-xl px-3 text-body text-ink focus:outline-none focus:border-brand"
              >
                <option value="">بلا مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-3 text-ui text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="w-4 h-4 accent-[rgb(var(--brand))]"
            />
            التزام لا يقبل التأجيل
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};
