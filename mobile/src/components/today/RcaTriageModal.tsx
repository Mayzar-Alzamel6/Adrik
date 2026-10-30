import React, { useState } from "react";
import { View, Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Sheet, Txt, Row, Button, Input } from "@/components/ui";
import { useColors, radius } from "@/theme";
import { tapFeedback, successFeedback } from "@/lib/feedback";

export type BugType = "BUG_A" | "BUG_B" | "BUG_C";

export interface BugData {
  title: string;
  iconName: "compass" | "alert-triangle" | "cpu";
  desc: string;
  patch: string;
}

export const BUGS_DATA: Record<BugType, BugData> = {
  BUG_A: {
    title: "Bug A: هندسة مفرطة وتشعب جانبي (Rabbit Hole)",
    iconName: "compass",
    desc: "غرقت في تفاصيل معمارية، بحث جانبي، أو تحسينات تجميلية خارج العقد الأصلي.",
    patch: "قص الفرع المفتوح فوراً ونقله لمستودع الأفكار المعمارية، والعودة للحد الأدنى الصارم للـ DoD.",
  },
  BUG_B: {
    title: "Bug B: ضبابية شرط الإنجاز (Vague Definition of Done)",
    iconName: "alert-triangle",
    desc: "الشرط كان كبيراً جداً، غامضاً، أو غير ثنائي، مما شل القدرة على الإغلاق والحسم.",
    patch: "تقسيم المهمة لنصفين، وصياغة خطوة مجهرية تنتهي خلال 15 دقيقة فقط.",
  },
  BUG_C: {
    title: "Bug C: انهيار الطاقة الإدراكية (Cognitive Crash)",
    iconName: "cpu",
    desc: "محاولة الاستمرار والتركيز مستنزف تماماً؛ التشتت ناتج عن إرهاق عصبي وليس نقص إرادة.",
    patch: "إيقاف إجباري فوري لمدة 20 دقيقة (ماء، حركة، ابتعاد تام عن أي شاشات أو أجهزة).",
  },
};

interface RcaTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPatch?: (bugType: BugType, patch: string) => void;
}

export function RcaTriageModal({ isOpen, onClose, onApplyPatch }: RcaTriageModalProps) {
  const c = useColors();
  const [selectedBug, setSelectedBug] = useState<BugType>("BUG_A");
  const [customPatch, setCustomPatch] = useState("");

  const activeBug = BUGS_DATA[selectedBug];

  const handleApply = () => {
    const finalPatch = customPatch.trim() || activeBug.patch;
    successFeedback();
    onApplyPatch?.(selectedBug, finalPatch);
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="معالج الأعطال السريع (2-Min RCA Triage)"
      description="تشخيص فوري خوارزمي: تحديد السطر الفكري المعطوب وتطبيق الترقيع التنفيذي."
    >
      <View style={{ gap: 14 }}>
        {/* Bug Selector */}
        <View style={{ gap: 8 }}>
          {(Object.keys(BUGS_DATA) as BugType[]).map((type) => {
            const item = BUGS_DATA[type];
            const isSelected = selectedBug === type;

            return (
              <Pressable
                key={type}
                onPress={() => {
                  tapFeedback();
                  setSelectedBug(type);
                  setCustomPatch("");
                }}
                style={{
                  padding: 12,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: isSelected ? c.brand : c.line,
                  backgroundColor: isSelected ? c.brandSoft : c.surface2,
                }}
              >
                <Row gap={8} style={{ marginBottom: 4, alignItems: "center" }}>
                  <Feather
                    name={item.iconName}
                    size={16}
                    color={isSelected ? c.brand : c.ink2}
                  />
                  <Txt
                    variant="small"
                    weight="bold"
                    color={isSelected ? "brand" : "ink"}
                    style={{ flex: 1 }}
                  >
                    {item.title}
                  </Txt>
                </Row>
                <Txt variant="caption" color="ink2" style={{ lineHeight: 18 }}>
                  {item.desc}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Executable Patch Box */}
        <View
          style={{
            padding: 14,
            borderRadius: radius.md,
            backgroundColor: c.accentSoft,
            borderWidth: 1,
            borderColor: c.accent,
            gap: 8,
          }}
        >
          <Row gap={6}>
            <Feather name="tool" size={16} color={c.accentStrong} />
            <Txt variant="small" weight="bold" color="accentStrong">
              الترقيع التنفيذي المباشر (Executable Patch):
            </Txt>
          </Row>
          <View
            style={{
              backgroundColor: c.surface,
              padding: 10,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Txt variant="ui" color="ink">
              {activeBug.patch}
            </Txt>
          </View>
          <Input
            value={customPatch}
            onChangeText={setCustomPatch}
            placeholder="أو اكتب ترقيعاً مخصصاً لجلسة الآن..."
            style={{ minHeight: 40, fontSize: 13 }}
          />
        </View>

        {/* Footer actions */}
        <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 4 }}>
          <Button title="إلغاء" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="تطبيق الترقيع واستئناف العمل"
            onPress={handleApply}
            style={{ flex: 2 }}
          />
        </Row>
      </View>
    </Sheet>
  );
}
