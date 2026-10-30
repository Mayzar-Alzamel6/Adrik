import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { isCrisis, type AiConsent } from "@/lib/safety/analysis";
import { isEmptyWeek, localReview } from "@/lib/ai/coach";
import { askReview, coachAccess } from "@/lib/ai/coachClient";
import { loadCoachConsent } from "@/lib/ai/coachConsent";
import { buildWeekSummary, useCoachWeekData } from "@/lib/ai/weekSummary";
import { readCachedReview, saveCachedReview, type CachedReview } from "@/lib/ai/reviewCache";
import { COACH_TEXT } from "@/lib/ai/texts";
import { shiftWeek, weekOf, weekRangeLabel, type WeekRef } from "@/lib/utils";
import { radius, useColors } from "@/theme";
import { Button, Card, Row, SectionHeader, Segmented, Txt } from "@/components/ui";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/tools/CrisisSupport";
import { CoachConsentSheet } from "@/components/ai/CoachConsent";

type Which = "this" | "last";
type Status = "idle" | "consent" | "loading" | "crisis" | "empty";

/**
 * The coach's weekly review on the phone (the web's CoachReviewPanel): three observations from the week's numbers
 * and one small act to send to the plan. With AI through the founder's Supabase function, otherwise the same
 * local rules, right here on the phone.
 */
export function CoachReviewPanel() {
  // On Saturday the new week has barely started, so open on the one just lived.
  const [which, setWhich] = useState<Which>(() => (new Date().getDay() === 6 ? "last" : "this"));
  const week = useMemo(() => shiftWeek(weekOf(), which === "last" ? -1 : 0), [which]);

  return (
    <Card style={{ gap: 12 }}>
      <SectionHeader title="مراجعة المدرّب" description={`ثلاث ملاحظات من أرقام ${weekRangeLabel(week)}، وفعل صغير واحد تحوّله إلى خطة.`} />
      <Segmented
        value={which}
        onChange={setWhich}
        options={[
          { value: "this", label: "هذا الأسبوع" },
          { value: "last", label: "الأسبوع الماضي" },
        ]}
      />
      {/* Keyed by week, so switching weeks starts from that week's own saved review. */}
      <CoachWeek key={`${week.year}-${week.week}`} week={week} />
    </Card>
  );
}

function CoachWeek({ week }: { week: WeekRef }) {
  const c = useColors();
  const data = useCoachWeekData();
  const [loaded, setLoaded] = useState(false);
  const [entry, setEntry] = useState<CachedReview | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  // Why the last review wasn't the AI's, when the person wanted AI: the setup step still missing.
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    readCachedReview(week).then((cached) => {
      if (!live) return;
      setEntry(cached);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [week]);

  const generate = async (consent?: AiConsent | null) => {
    const summary = buildWeekSummary(week, data);
    const reasons = summary.focus.exitReasons.join("\n");
    if (reasons && isCrisis({ automaticThought: reasons })) return setStatus("crisis");
    if (isEmptyWeek(summary)) return setStatus("empty");

    setStatus("loading");
    const access = await coachAccess();
    const choice = consent === undefined ? await loadCoachConsent() : consent;
    if (access === "ready" && choice === null) return setStatus("consent");
    setNote(access !== "ready" && choice !== "local" ? COACH_TEXT.access[access] : null);

    let next: CachedReview = { review: localReview(summary), engine: "local", createdAt: new Date().toISOString() };
    if (access === "ready" && choice === "ai") {
      try {
        const reply = await askReview(summary);
        if (reply.status === "crisis") return setStatus("crisis");
        next = { review: reply.review, engine: reply.engine, createdAt: next.createdAt };
      } catch {
        /* the function failed: the local review above stands */
      }
    }
    await saveCachedReview(week, next);
    setEntry(next);
    setStatus("idle");
  };

  if (!loaded) return null;

  return (
    <>
      {status === "crisis" ? (
        <CrisisSupport onDone={() => setStatus("idle")} />
      ) : status === "loading" ? (
        <View style={{ paddingVertical: 22, alignItems: "center", gap: 10 }}>
          <ActivityIndicator color={c.brand} />
          <Txt variant="ui" color="ink2">
            المدرّب يقرأ أسبوعك…
          </Txt>
        </View>
      ) : status === "empty" ? (
        <View style={{ gap: 4, paddingVertical: 8 }}>
          <Txt align="center">لا أرقام في هذا الأسبوع بعد: لا أولويات مخططة ولا جلسات تركيز.</Txt>
          <Txt variant="ui" color="ink2" align="center">
            اكتب أولويات يومك وأكمل جلسة واحدة، ثم ارجع هنا يوم الجمعة.
          </Txt>
        </View>
      ) : entry ? (
        <View style={{ gap: 10 }}>
          {entry.review.observations.map((o, i) => (
            <Row key={i} gap={10} style={{ alignItems: "flex-start", borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Txt variant="small" weight="semibold" color="brand">
                  {i + 1}
                </Txt>
              </View>
              <Txt style={{ flex: 1 }}>{o}</Txt>
            </Row>
          ))}
          <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.accent, backgroundColor: c.accentSoft, padding: 14, gap: 8 }}>
            <Row gap={6}>
              <Feather name="target" size={14} color={c.accentStrong} />
              <Txt variant="caption" weight="medium" color="accentStrong">
                اقتراح المدرّب
              </Txt>
            </Row>
            <Txt weight="medium">{entry.review.suggestion.title}</Txt>
            {entry.review.suggestion.why ? (
              <Txt variant="ui" color="ink2">
                {entry.review.suggestion.why}
              </Txt>
            ) : null}
            <SendTo key={entry.createdAt} title={entry.review.suggestion.title} />
          </View>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="caption" color="ink3">
              {COACH_TEXT.engine[entry.engine]}
            </Txt>
            <Button title="أعد الكتابة" icon="refresh-cw" variant="ghost" size="sm" onPress={() => generate()} />
          </Row>
          {note && entry.engine === "local" ? (
            <Txt variant="caption" color="accentStrong">
              {note}
            </Txt>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 10, alignItems: "stretch" }}>
          <Txt variant="ui" color="ink2" align="center">
            يقرأ المدرّب أرقامك فقط: الأولويات، وجلسات التركيز، والقيم، والعادات. لا يقرأ ملاحظاتك ولا أفكارك.
          </Txt>
          <Button title="اكتب مراجعتي" icon="zap" onPress={() => generate()} />
        </View>
      )}

      <CoachConsentSheet open={status === "consent"} onChoose={(choice) => generate(choice)} />
    </>
  );
}
