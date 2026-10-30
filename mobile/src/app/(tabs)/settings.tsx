import React, { useState } from "react";
import { View } from "react-native";
import { FOCUS_AREAS, useAppStore } from "@/stores/useAppStore";
import { resetEverything } from "@/lib/stores";
import { ROW, useColors } from "@/theme";
import { Badge, Button, Card, Chip, Input, Label, Row, Screen, Segmented, SectionHeader, SwitchRow, Txt } from "@/components/ui";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { UsageReportPanel } from "@/components/settings/UsageReportPanel";
import { RemindersPanel } from "@/components/settings/RemindersPanel";
import { SyncPanel } from "@/components/settings/SyncPanel";
import { PERSONAL_SYNC_ENABLED } from "@/lib/sync/flag";
import { setCoachConsent, useCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import { useJourneyStore } from "@/stores/useJourneyStore";

export default function SettingsScreen() {
  const c = useColors();
  const { profile, updateProfile, settings, setFaithContent, setSound, themeMode, setThemeMode } = useAppStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const journeyMode = useJourneyStore((s) => s.mode);
  const setJourneyMode = useJourneyStore((s) => s.setMode);
  const coachConsent = useCoachConsent();

  return (
    <Screen>
      <Txt variant="heading" weight="semibold">
        الإعدادات
      </Txt>

      <Card style={{ gap: 14 }}>
        <SectionHeader title="الملف الشخصي" />
        <View>
          <Label>الاسم</Label>
          <Input value={profile.name} onChangeText={(name) => updateProfile({ name })} />
        </View>
        <View>
          <Label>مجال التركيز الرئيسي</Label>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
            {FOCUS_AREAS.map((a) => (
              <Chip key={a.id} label={a.label} selected={profile.focusArea === a.id} onPress={() => updateProfile({ focusArea: a.id })} />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Txt weight="medium">المظهر</Txt>
            <Txt variant="small" color="ink2">
              النهاري الورقي، أو الليلي الدافئ.
            </Txt>
          </View>
          <View style={{ width: 150 }}>
            <Segmented
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: "light", label: "نهاري" },
                { value: "dark", label: "ليلي" },
              ]}
            />
          </View>
        </Row>
        <SwitchRow
          title="المحتوى الإيماني"
          description="آية يومية للتثبيت، والتاريخ الهجري، واقتراح عادات الصلاة والورد في أداة العادات."
          value={settings.faithContent}
          onChange={setFaithContent}
        />
        <View style={{ height: 1, backgroundColor: c.line }} />
        <SwitchRow
          title="الأصوات والاهتزاز"
          description="نغمة واهتزاز عند بدء الجلسة وانتهائها، وإشارات التنفّس في بوابة الصباح. الأصوات تصمت إذا كان الهاتف على الصامت."
          value={settings.sound !== false}
          onChange={setSound}
        />
        <View style={{ height: 1, backgroundColor: c.line }} />
        <SwitchRow
          title="البناء التدريجي"
          description="تُفتح أدوات النظام مرحلة بعد مرحلة كلما رسخ ما قبلها. أطفئه لترى كل شيء الآن."
          value={journeyMode === "guided"}
          onChange={(on) => setJourneyMode(on ? "guided" : "open")}
        />
        {PERSONAL_SYNC_ENABLED ? (
          <>
            <View style={{ height: 1, backgroundColor: c.line }} />
            <SwitchRow
              title={COACH_TEXT.settings.title}
              description={COACH_TEXT.settings.description}
              value={coachConsent === "ai"}
              onChange={(on) => setCoachConsent(on ? "ai" : "local")}
            />
          </>
        ) : null}
      </Card>

      <Card style={{ gap: 4 }}>
        <SectionHeader title="التذكيرات" />
        <RemindersPanel />
      </Card>

      {/* The personal build is the founder's own copy: no plans to show there. */}
      {PERSONAL_SYNC_ENABLED ? null : (
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="subtitle" weight="semibold">
              الاشتراك
            </Txt>
            <Badge tone="accent">تجربة</Badge>
          </Row>
          <Txt variant="ui" color="ink2">
            أنت على تجربة الباقة الكاملة لمدة 14 يوماً، وبعدها تبقى على الباقة المجانية للأبد. الدفع متاح قريباً.
          </Txt>
        </Card>
      )}

      <SyncPanel />

      <Card style={{ gap: 12 }}>
        <SectionHeader
          title="البيانات"
          description={
            PERSONAL_SYNC_ENABLED
              ? "بياناتك محفوظة على هذا الهاتف، وتتزامن مع الكمبيوتر إن فعّلت المزامنة. صدّر نسخة احتياطية بين حين وآخر."
              : "بياناتك محفوظة على هذا الهاتف فقط حالياً. صدّر نسخة احتياطية بين حين وآخر."
          }
        />
        <BackupPanel />
        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          {confirmReset ? (
            <View style={{ gap: 8 }}>
              <Txt variant="ui" color="danger">
                سيُحذف كل شيء نهائياً. متأكد؟
              </Txt>
              <Row>
                <Button title="نعم، ابدأ من جديد" variant="danger" size="sm" onPress={() => resetEverything()} />
                <Button title="تراجع" variant="ghost" size="sm" onPress={() => setConfirmReset(false)} />
              </Row>
            </View>
          ) : (
            <Button title="مسح البيانات والبدء من جديد" variant="secondary" size="sm" onPress={() => setConfirmReset(true)} style={{ alignSelf: "flex-end" }} />
          )}
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" weight="semibold">
              شارك تجربتك معنا
            </Txt>
            <Txt variant="ui" color="ink2">
              أنت من أوائل من يجرّبون التطبيق. أرسل لنا تقرير استخدامك لنفهم ما ينفعك وما يعيقك.
            </Txt>
          </View>
          <Badge tone="brand">نسخة تجريبية</Badge>
        </Row>
        <UsageReportPanel />
      </Card>
    </Screen>
  );
}
