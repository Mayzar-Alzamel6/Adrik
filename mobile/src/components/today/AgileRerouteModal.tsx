import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Sheet, Button, Input, Label, Txt, Row } from "@/components/ui";
import { useAppStore } from "@/stores/useAppStore";
import { radius, useColors } from "@/theme";
import { successFeedback, tapFeedback } from "@/lib/feedback";

interface AgileRerouteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AgileRerouteModal({ open, onClose, onSuccess }: AgileRerouteModalProps) {
  const c = useColors();
  const { currentDay, addRerouteEvent } = useAppStore();
  const [incident, setIncident] = useState("");
  const [negotiatedHours, setNegotiatedHours] = useState<number>(2);
  const [bufferTarget, setBufferTarget] = useState<"tonight" | "tomorrow">("tomorrow");

  const handleSubmit = () => {
    if (!incident.trim()) return;

    addRerouteEvent({
      date: currentDay,
      incident: incident.trim(),
      negotiatedHours,
      bufferTarget,
    });

    successFeedback();
    setIncident("");
    setNegotiatedHours(2);
    setBufferTarget("tomorrow");
    onSuccess?.();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="بروتوكول التعديل الطارئ (Agile Reroute)"
      description="استيعاب الطوارئ بمرونة دون كسر النظام أو تصفير العدادات أو جلد الذات."
    >
      <View style={{ gap: 16 }}>
        {/* Callout */}
        <Row
          gap={10}
          style={{
            backgroundColor: c.accentSoft,
            borderRadius: radius.md,
            padding: 12,
            alignItems: "flex-start",
          }}
        >
          <Feather name="alert-triangle" size={18} color={c.accentStrong} style={{ marginTop: 2 }} />
          <Txt variant="small" color="accentStrong" style={{ flex: 1, lineHeight: 20 }}>
            الـ INTJ-A ينهار يومه عند انكسار الخطة الصارمة. هذا البروتوكول يُعيد توجيه المسار خوارزمياً: اقتطاع وقت
            للطارئ وترحيل الباقي لـ Buffer معتمد دون احتساب أي «فشل».
          </Txt>
        </Row>

        {/* 1. Incident */}
        <View>
          <Label hint="ما الذي حدث في سطر واحد؟">1. المتغير الطارئ</Label>
          <Input
            value={incident}
            onChangeText={setIncident}
            placeholder="مثال: اجتماع غير مجدول مع عميل / عطل تقني طارئ"
            returnKeyType="done"
          />
        </View>

        {/* 2. Negotiated Hours */}
        <View>
          <Label hint="كم ساعة سيستغرق التعامل معه؟">2. الشريحة الزمنية المتفاوض عليها</Label>
          <Row gap={8}>
            {[1, 2, 3, 4].map((hours) => {
              const active = negotiatedHours === hours;
              return (
                <Pressable
                  key={hours}
                  onPress={() => {
                    tapFeedback();
                    setNegotiatedHours(hours);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    minHeight: 42,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: active ? c.brand : c.line,
                    backgroundColor: active ? c.brand : c.surface2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt
                    variant="small"
                    weight={active ? "semibold" : "medium"}
                    color={active ? "brandInk" : "ink2"}
                  >
                    {hours} {hours === 1 ? "ساعة" : "ساعات"}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>
        </View>

        {/* 3. Buffer Target */}
        <View>
          <Label hint="إلى أين يُعاد توجيه الساعات المتبقية؟">3. كتلة التعويض المعتمدة</Label>
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => {
                tapFeedback();
                setBufferTarget("tonight");
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: bufferTarget === "tonight" }}
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: bufferTarget === "tonight" ? c.brand : c.line,
                backgroundColor: bufferTarget === "tonight" ? c.brandSoft : c.surface2,
                padding: 12,
              }}
            >
              <Txt weight="semibold" color={bufferTarget === "tonight" ? "brand" : "ink"}>
                مساء اليوم (Buffer المساء)
              </Txt>
              <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                تمديد خفيف أو تركيز مسائي هادئ
              </Txt>
            </Pressable>

            <Pressable
              onPress={() => {
                tapFeedback();
                setBufferTarget("tomorrow");
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: bufferTarget === "tomorrow" }}
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: bufferTarget === "tomorrow" ? c.brand : c.line,
                backgroundColor: bufferTarget === "tomorrow" ? c.brandSoft : c.surface2,
                padding: 12,
              }}
            >
              <Txt weight="semibold" color={bufferTarget === "tomorrow" ? "brand" : "ink"}>
                احتياط الغد (Tomorrow Buffer)
              </Txt>
              <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                ترحيل منظم لأولويات الغد دون جلد للذات
              </Txt>
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <Button title="إلغاء" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="تكييف المسار 🔄"
            disabled={!incident.trim()}
            onPress={handleSubmit}
            style={{ flex: 2 }}
          />
        </Row>
      </View>
    </Sheet>
  );
}
