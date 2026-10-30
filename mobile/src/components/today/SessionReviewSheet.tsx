import React, { useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { breakMinutesFor, useAppStore, type FocusSessionLog, type SessionOutcome } from "@/stores/useAppStore";
import { fullSessions, minutesAr } from "@/lib/utils";
import { radius, useColors } from "@/theme";
import { Button, Row, Sheet, Txt } from "@/components/ui";

const OUTCOMES: { value: SessionOutcome; label: string; variant: "primary" | "secondary" | "ghost" }[] = [
  { value: "DONE", label: "أنهيته", variant: "primary" },
  { value: "PARTIAL", label: "جزئياً", variant: "secondary" },
  { value: "NOT", label: "لا", variant: "ghost" },
];

const OUTCOME_NOTE: Record<SessionOutcome, string> = {
  DONE: "عقد مُنجز. أحسنت.",
  PARTIAL: "تقدّم حقيقي، والباقي للجلسة القادمة.",
  NOT: "سجّلناها بصدق. الجلسة القادمة فرصة جديدة.",
};

/** Shown on any screen when a session runs to the end: rate it, then repeat or rest. */
export function SessionReviewSheet() {
  const { pendingSessionReviewId, focusSessions, rateFocusSession } = useAppStore();
  const session = pendingSessionReviewId ? focusSessions.find((s) => s.id === pendingSessionReviewId) : undefined;
  return (
    <Sheet open={Boolean(session)} onClose={() => rateFocusSession(null)}>
      {/* Keyed by session so each review starts with no answer picked. */}
      {session ? <ReviewContent key={session.id} session={session} /> : null}
    </Sheet>
  );
}

function ReviewContent({ session }: { session: FocusSessionLog }) {
  const c = useColors();
  const { focusStreak, bestFocusStreak, rateFocusSession, repeatLastSession, startBreak, frogs, toggleFrog } = useAppStore();
  const newRecord = focusStreak > 1 && focusStreak === bestFocusStreak;
  const [picked, setPicked] = useState<SessionOutcome | null>(null);
  const breakLen = breakMinutesFor(session.plannedMinutes);
  const openPriority = session.taskId ? frogs.find((f) => f.id === session.taskId && !f.isCompleted) : undefined;
  const finishPriority = () => {
    rateFocusSession(picked);
    if (openPriority) toggleFrog(openPriority.id);
  };

  return (
        <View style={{ gap: 12 }}>
          <View style={{ alignSelf: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Feather name={newRecord ? "award" : "zap"} size={24} color={c.brand} />
          </View>
          <Txt variant="titleLg" weight="semibold" align="center">
            أكملت الجلسة كاملة
          </Txt>
          <Txt color="ink2" align="center">
            {session.plannedMinutes} دقيقة دون انسحاب.{" "}
            {newRecord ? `رقم قياسي جديد: ${fullSessions(focusStreak)} متتالية.` : focusStreak > 1 ? `سلسلتك الآن ${fullSessions(focusStreak)} متتالية.` : ""}
          </Txt>

          {session.commitment ? (
            <View style={{ borderRadius: radius.lg, backgroundColor: c.surface2, padding: 14 }}>
              <Txt variant="small" color="ink3">
                عقدك كان
              </Txt>
              <Txt variant="subtitle">{session.commitment}</Txt>
            </View>
          ) : null}

          {picked === null ? (
            <>
              <Txt weight="medium" align="center">
                هل أنهيته؟
              </Txt>
              <Row gap={8}>
                {OUTCOMES.map((o) => (
                  <Button key={o.value} title={o.label} variant={o.variant} style={{ flex: 1 }} onPress={() => setPicked(o.value)} />
                ))}
              </Row>
              <Txt variant="small" color="ink3" align="center">
                الجواب الصادق يجعل عقودك القادمة أدق.
              </Txt>
            </>
          ) : (
            <>
              <Txt weight="medium" color="brand" align="center">
                {OUTCOME_NOTE[picked]}
              </Txt>
              <Txt variant="ui" color="ink2" align="center">
                ماذا بعد؟
              </Txt>
              <Row gap={8}>
                <Button
                  title="كرر الجلسة"
                  icon="repeat"
                  style={{ flex: 1 }}
                  onPress={() => {
                    rateFocusSession(picked);
                    repeatLastSession();
                  }}
                />
                <Button
                  title={`استراحة ${minutesAr(breakLen)}`}
                  icon="coffee"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    rateFocusSession(picked);
                    startBreak(breakLen);
                  }}
                />
              </Row>
              {picked === "DONE" && openPriority ? (
                <Button title={`الأولوية كلها تمّت: «${openPriority.title}»`} icon="check" variant="ghost" onPress={finishPriority} />
              ) : null}
              <Txt variant="small" color="ink3" align="center">
                التكرار يبدأ فوراً بنفس المدة ({session.plannedMinutes} د) ونفس العقد والمهمة.
              </Txt>
            </>
          )}
        </View>
  );
}
