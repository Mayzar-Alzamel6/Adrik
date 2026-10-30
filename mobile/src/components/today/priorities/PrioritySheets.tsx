import React, { useState } from "react";
import { View } from "react-native";
import type { FrogTask } from "@/stores/useAppStore";
import { radius, useColors } from "@/theme";
import { Button, Input, Label, Row, Sheet, Txt } from "@/components/ui";
import { ReasonPicker } from "@/components/today/priorities/shared";

/**
 * The three confirmations around a task: closing it against its definition of done, dropping it on purpose,
 * and removing it after the morning lock. Each body mounts with its task, so its text starts fresh every time.
 */

export function MasteryGateSheet({
  frog,
  onClose,
  onConfirm,
}: {
  frog: FrogTask | null;
  onClose: () => void;
  onConfirm: (dod: string) => void;
}) {
  return (
    <Sheet
      open={Boolean(frog)}
      onClose={onClose}
      title="بوابة تأكيد الإتقان (Mastery Gate)"
      description="التحقق من إغلاق الدائرة بالكامل قبل شطب الأولوية."
    >
      {frog ? <MasteryBody key={frog.id} frog={frog} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Sheet>
  );
}

function MasteryBody({ frog, onClose, onConfirm }: { frog: FrogTask; onClose: () => void; onConfirm: (dod: string) => void }) {
  const c = useColors();
  const [dod, setDod] = useState(frog.definitionOfDone || "");
  return (
    <View style={{ gap: 14 }}>
      <View style={{ backgroundColor: c.surface2, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: c.line }}>
        <Txt variant="caption" color="ink2">
          المهمة المراد إغلاقها:
        </Txt>
        <Txt weight="bold" style={{ marginTop: 2 }}>
          {frog.title}
        </Txt>
      </View>

      <View>
        <Label hint="هل تم تسليم الأثر بالكامل وفق هذا المعيار؟">شرط الاكتمال (Definition of Done)</Label>
        <Input value={dod} onChangeText={setDod} placeholder="اكتب ما تم تسليمه فعلياً للتحقق من الإتقان..." multiline />
      </View>

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
        <Button title="إلغاء" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button title="تأكيد الإتقان وإغلاق الدائرة 🎯" disabled={!dod.trim()} onPress={() => onConfirm(dod.trim())} style={{ flex: 2 }} />
      </Row>
    </View>
  );
}

const DROP_REASONS = ["منخفضة الرافعة ولا تستحق الاستمرار", "تفويض لطرف آخر / أتمتة", "تغيرت المعطيات والأولويات الاستراتيجية"];

export function DropSheet({
  drop,
  onClose,
  onConfirm,
}: {
  /** The task, and the reason to start from (a third rollover suggests its own). */
  drop: { frog: FrogTask; reason: string } | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Sheet
      open={Boolean(drop)}
      onClose={onClose}
      title="الإسقاط الواعي للأولوية (Conscious Drop)"
      description="التخلي الاستراتيجي عن مهمة منخفضة الرافعة لحماية طاقتك."
    >
      {drop ? <DropBody key={drop.frog.id} frog={drop.frog} initial={drop.reason} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Sheet>
  );
}

function DropBody({
  frog,
  initial,
  onClose,
  onConfirm,
}: {
  frog: FrogTask;
  initial: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const c = useColors();
  const [reason, setReason] = useState(initial);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: 12 }}>
        <Txt variant="caption" color="danger">
          المهمة المراد إسقاطها:
        </Txt>
        <Txt weight="bold" color="danger">
          {frog.title}
        </Txt>
      </View>

      <View>
        <Label hint="اختر أو اكتب سبب الإسقاط الواعي:">مبرر الإسقاط الاستراتيجي</Label>
        <View style={{ marginBottom: 8 }}>
          <ReasonPicker reasons={DROP_REASONS} value={reason} onChange={setReason} />
        </View>
        <Input value={reason} onChangeText={setReason} placeholder="أو اكتب سبباً مخصصاً..." />
      </View>

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
        <Button title="تراجع" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button title="تأكيد الإسقاط الواعي 🚫" variant="danger" onPress={() => onConfirm(reason.trim())} style={{ flex: 2 }} />
      </Row>
    </View>
  );
}

const REMOVE_REASONS = ["طارئ خارجي ملح", "إعادة ترتيب الأولويات", "المهمة غير واضحة", "مهمة غير مجدية اليوم"];

export function RemoveLockedSheet({
  frog,
  onClose,
  onConfirm,
}: {
  frog: FrogTask | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Sheet
      open={Boolean(frog)}
      onClose={onClose}
      title="قفل الضفدع الصباحي (Morning Frog Lock)"
      description="بعد اعتماد الأولويات أو بعد 10:00 صباحاً، النظام يمنع التسويف المقنع. يرجى توثيق سبب الاستبعاد لتسجيله في مسار التوجيه (Agile Reroute)."
    >
      {frog ? <RemoveBody key={frog.id} frog={frog} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Sheet>
  );
}

function RemoveBody({ frog, onClose, onConfirm }: { frog: FrogTask; onClose: () => void; onConfirm: (reason: string) => void }) {
  const c = useColors();
  const [reason, setReason] = useState("طارئ خارجي أو إعادة ترتيب أولويات");
  return (
    <View style={{ gap: 14 }}>
      <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12, gap: 4 }}>
        <Txt variant="caption" weight="medium" color="ink3">
          الأولوية المراد حذفها:
        </Txt>
        <Txt weight="bold">{frog.title}</Txt>
      </View>

      <View style={{ gap: 8 }}>
        <Label>سبب الحذف أو الاستبعاد:</Label>
        <ReasonPicker reasons={REMOVE_REASONS} value={reason} onChange={setReason} wrap />
        <Input value={reason} onChangeText={setReason} placeholder="أو اكتب سبباً مخصصاً..." />
      </View>

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
        <Button title="تراجع" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button
          title="تأكيد الحذف والتوثيق"
          variant="danger"
          disabled={!reason.trim()}
          onPress={() => onConfirm(reason.trim())}
          style={{ flex: 2 }}
        />
      </Row>
    </View>
  );
}
