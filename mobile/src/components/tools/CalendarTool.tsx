import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore, type CalendarEventItem } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { sendToInbox } from "@/lib/flow";
import { toLocalDateString } from "@/lib/utils";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Chip, IconButton, Input, Label, Row, SectionHeader, Sheet, SwitchRow, Txt } from "@/components/ui";

function dayLabel(date: string) {
  const today = toLocalDateString();
  const tomorrow = toLocalDateString(new Date(Date.now() + 86_400_000));
  if (date === today) return "اليوم";
  if (date === tomorrow) return "غداً";
  const [y, m, d] = date.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
  } catch {
    return date;
  }
}

/** The next three weeks as tappable days (no native date picker needed). */
const nextDays = (count = 21) =>
  Array.from({ length: count }, (_, i) => toLocalDateString(new Date(Date.now() + i * 86_400_000)));

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** A project's target date, shown among the appointments without being stored twice. */
type EventRow = CalendarEventItem & { deadline?: boolean };

/** Fixed future commitments. Kept off the Today screen; surfaced in the evening when planning tomorrow. */
export function CalendarTool() {
  const c = useColors();
  const { events, addEvent, deleteEvent } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toLocalDateString());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const projects = useProjectsStore((s) => s.projects);
  const [projectId, setProjectId] = useState("");
  const [prepared, setPrepared] = useState<Record<string, string>>({});
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;

  /** Preparing for an appointment is work: it goes to the project's tasks, or the inbox. */
  const prepare = (ev: EventRow) => {
    const res = sendToInbox(ev.deadline ? "إنهاء ما تبقّى قبل موعد التسليم" : `التحضير لـ: ${ev.title}`, ev.projectId);
    setPrepared((p) => ({ ...p, [ev.id]: res.message }));
  };

  const timeValid = !time || TIME_RE.test(time.trim());

  const save = () => {
    if (!title.trim() || !date || !timeValid) return;
    addEvent({
      title: title.trim(),
      date,
      time: time.trim() || undefined,
      location: location.trim() || undefined,
      isMandatory,
      ...(projectId ? { projectId } : {}),
    });
    setProjectId("");
    setTitle("");
    setTime("");
    setLocation("");
    setIsMandatory(false);
    setOpen(false);
  };

  const today = toLocalDateString();
  const deadlines: EventRow[] = projects
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
  const upcoming: EventRow[] = [...events.filter((e) => e.date >= today), ...deadlines].sort((a, b) =>
    (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))
  );
  const past = events.filter((e) => e.date < today);
  const groups = upcoming.reduce<Record<string, EventRow[]>>((acc, ev) => {
    (acc[ev.date] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 12 }}>
        <SectionHeader
          title="القادم"
          description="لا تزدحم بها شاشة اليوم؛ ستظهر لك مساءً وأنت تخطط للغد. مواعيد تسليم مشاريعك تظهر هنا تلقائياً."
          action={<Button title="موعد جديد" icon="plus" size="sm" onPress={() => setOpen(true)} />}
        />
        {upcoming.length === 0 ? (
          <View style={{ paddingVertical: 18, gap: 4 }}>
            <Txt weight="semibold" align="center">
              لا مواعيد قادمة
            </Txt>
            <Txt variant="ui" color="ink2" align="center">
              أضف اختباراً، أو تسليماً، أو موعداً ثابتاً، لتبني أولوياتك حوله بواقعية.
            </Txt>
          </View>
        ) : (
          Object.entries(groups).map(([day, list]) => (
            <View key={day} style={{ gap: 6 }}>
              <Txt variant="small" weight="medium" color="ink3">
                {dayLabel(day)}
              </Txt>
              {list.map((ev) => (
                <View key={ev.id} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 10, gap: 4 }}>
                  <Row gap={10}>
                    <View style={{ width: 48, alignItems: "center" }}>
                      {ev.deadline ? (
                        <Feather name="flag" size={16} color={c.danger} />
                      ) : (
                        <Txt variant="ui" weight="medium">
                          {ev.time || "—"}
                        </Txt>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt weight="medium" numberOfLines={1}>
                        {ev.title}
                      </Txt>
                      {ev.location ? (
                        <Txt variant="small" color="ink2" numberOfLines={1}>
                          {ev.location}
                        </Txt>
                      ) : null}
                      {!ev.deadline && projectName(ev.projectId) ? (
                        <Row gap={4}>
                          <Feather name="folder" size={12} color={c.ink3} />
                          <Txt variant="small" color="ink3" numberOfLines={1}>
                            {projectName(ev.projectId)}
                          </Txt>
                        </Row>
                      ) : null}
                    </View>
                    {ev.deadline ? <Badge tone="danger">مشروع</Badge> : ev.isMandatory ? <Badge tone="accent">لا يُؤجَّل</Badge> : null}
                    <IconButton icon="list" label={`أضف مهمة تحضير لـ ${ev.title}`} onPress={() => prepare(ev)} />
                    {!ev.deadline ? <IconButton icon="trash-2" label="حذف" onPress={() => deleteEvent(ev.id)} /> : null}
                  </Row>
                  {prepared[ev.id] ? (
                    <Txt variant="small" color="brand">
                      {prepared[ev.id]}
                    </Txt>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}
        {past.length > 0 ? (
          <Txt variant="small" color="ink3">
            {past.length} موعد مضى
          </Txt>
        ) : null}
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="موعد جديد">
        <View>
          <Label>ما هو؟</Label>
          <Input value={title} onChangeText={setTitle} placeholder="مثال: تسليم المرحلة الأولى" />
        </View>
        <View>
          <Label>{`التاريخ: ${dayLabel(date)}`}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: ROW, gap: 8 }}>
            {nextDays().map((d) => (
              <Chip key={d} label={d === today ? "اليوم" : d.slice(5).replace("-", "/")} selected={date === d} onPress={() => setDate(d)} />
            ))}
          </ScrollView>
        </View>
        <View>
          <Label hint="اختياري، بصيغة 14:30">الوقت</Label>
          <Input value={time} onChangeText={setTime} placeholder="14:30" keyboardType="numbers-and-punctuation" />
          {!timeValid ? (
            <Txt variant="small" color="danger">
              اكتب الوقت بصيغة ساعة:دقيقة، مثل 09:00.
            </Txt>
          ) : null}
        </View>
        <View>
          <Label hint="اختياري">المكان أو الرابط</Label>
          <Input value={location} onChangeText={setLocation} />
        </View>
        {projects.length > 0 ? (
          <View>
            <Label hint="اختياري — يظهر الموعد في خريطة مشروعه، وتذهب مهام التحضير إليه.">المشروع</Label>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
              <Chip label="بلا مشروع" selected={!projectId} onPress={() => setProjectId("")} />
              {projects.map((p) => (
                <Chip key={p.id} label={p.name} selected={projectId === p.id} onPress={() => setProjectId(p.id)} />
              ))}
            </View>
          </View>
        ) : null}
        <SwitchRow title="التزام لا يقبل التأجيل" value={isMandatory} onChange={setIsMandatory} />
        <Row>
          <Button title="حفظ" onPress={save} disabled={!title.trim() || !timeValid} />
          <Button title="إلغاء" variant="ghost" onPress={() => setOpen(false)} />
        </Row>
      </Sheet>
    </View>
  );
}
