import React, { useState } from "react";
import { View } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { useColors } from "@/theme";
import { Button, IconButton, Input, LinkButton, Row, Sheet, Txt } from "@/components/ui";

/** Quick capture for stray thoughts during focus: write it down, close, keep going. */
export function ScratchpadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const distractions = useAppStore((s) => s.distractions);
  const addDistraction = useAppStore((s) => s.addDistraction);
  const removeDistraction = useAppStore((s) => s.removeDistraction);
  const clearDistractions = useAppStore((s) => s.clearDistractions);
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);

  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [focusFeedback, setFocusFeedback] = useState<string | null>(null);

  const toInbox = (idx: number, thought: string) => {
    usePlannerStore.getState().addTask(thought, "INBOX");
    removeDistraction(idx);
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  };

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addDistraction(trimmed);
    setText("");
    if (isFocusRunning) {
      setFocusFeedback("تم الحجز لما بعد الجلسة ✓");
      setTimeout(() => {
        setFocusFeedback(null);
        onClose();
      }, 1000);
    }
  };

  const handleClose = () => {
    setFocusFeedback(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={isFocusRunning ? "⚡ تفريغ خاطرة سريعة" : "تفريغ خاطرة"}
      description={
        isFocusRunning
          ? "احجز الفكرة أو التشتت فوراً لتفرغ ذهنك وتواصل جلستك."
          : "فكرة طارئة أو رغبة في البحث؟ اكتبها هنا وعد لعملك. ستجدها بعد الجلسة."
      }
    >
      {isFocusRunning ? (
        focusFeedback ? (
          <View style={{ borderRadius: 12, backgroundColor: c.brandSoft, padding: 20, alignItems: "center" }}>
            <Txt variant="heading" weight="semibold" color="brand">
              {focusFeedback}
            </Txt>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Input
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="اكتب الخاطرة هنا وعد لتركيزك..."
              returnKeyType="done"
              onSubmitEditing={add}
            />
            <Button title="احجز الفكرة" onPress={add} disabled={!text.trim()} size="lg" />
          </View>
        )
      ) : (
        <>
          <Row gap={8}>
            <Input
              style={{ flex: 1 }}
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="اكتب الخاطرة"
              returnKeyType="done"
              onSubmitEditing={add}
            />
            <Button title="حفظ" onPress={add} disabled={!text.trim()} />
          </Row>

          {sent ? (
            <View style={{ borderRadius: 12, backgroundColor: c.brandSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Txt variant="ui" color="brand">
                نُقلت إلى صندوق المهام في مصفوفة الأولويات.
              </Txt>
            </View>
          ) : null}

          {distractions.length === 0 ? (
            <Txt variant="ui" color="ink3" align="center" style={{ paddingVertical: 24 }}>
              لا شيء مؤجل. ذهنك صافٍ.
            </Txt>
          ) : (
            <View>
              {distractions.map((thought, idx) => (
                <Row key={`${idx}-${thought}`} gap={8} style={{ paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: c.line }}>
                  <Txt style={{ flex: 1 }}>{thought}</Txt>
                  <IconButton icon="inbox" label="انقلها إلى صندوق المهام" onPress={() => toInbox(idx, thought)} />
                  <IconButton icon="trash-2" label="حذف" onPress={() => removeDistraction(idx)} />
                </Row>
              ))}
              <Row style={{ justifyContent: "space-between", marginTop: 8 }}>
                <Txt variant="small" color="ink3">
                  {distractions.length} خاطرة مؤجلة
                </Txt>
                <LinkButton title="مسح الكل" color="danger" onPress={clearDistractions} />
              </Row>
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}
