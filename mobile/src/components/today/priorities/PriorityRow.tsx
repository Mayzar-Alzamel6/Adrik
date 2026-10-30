import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore, type EnergyTaxonomy, type FrogTask } from "@/stores/useAppStore";
import { radius, useColors } from "@/theme";
import { IconButton, Input, Row, Txt } from "@/components/ui";
import { FrogLinkButton, LineageLine } from "@/components/today/FrogLinkSheet";
import { EnergyPills, OrderDot } from "@/components/today/priorities/shared";

export interface PriorityRowProps {
  frog: FrogTask;
  /** Position in today's sorted list. */
  index: number;
  count: number;
  isCurrent: boolean;
  /** Another task holds the lock: this one can't be ticked yet. */
  blocked: boolean;
  isActive: boolean;
  canReorder: boolean;
  canLink: boolean;
  onToggle: () => void;
  onEnergy: (tag: EnergyTaxonomy) => void;
  onStartWith: () => void;
  onDrop: (reason: string) => void;
  onLink: () => void;
  onRemove: () => void;
}

const quietPill = (line: string) => ({ borderWidth: 1, borderColor: line, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 });

/** One task on today's list: tick, inline edits of the title and definition of done, energy, order and actions. */
export function PriorityRow(p: PriorityRowProps) {
  const { frog, index } = p;
  const c = useColors();
  const updateFrog = useAppStore((s) => s.updateFrog);
  const reorderFrog = useAppStore((s) => s.reorderFrog);
  const anchorTitle = useAppStore((s) => (frog.anchorId ? s.anchors.find((a) => a.id === frog.anchorId)?.title ?? "أولوية مغلقة" : null));
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editDod, setEditDod] = useState<string | null>(null);
  const rollovers = frog.rolloverCount ?? 0;

  const saveTitle = () => {
    if (editTitle?.trim()) updateFrog(frog.id, { title: editTitle.trim() });
    setEditTitle(null);
  };
  const saveDod = () => {
    if (editDod?.trim()) updateFrog(frog.id, { definitionOfDone: editDod.trim() });
    setEditDod(null);
  };

  return (
    <View style={{ paddingVertical: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line, opacity: frog.isDropped ? 0.6 : 1 }}>
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <Pressable
          onPress={p.onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: frog.isCompleted, disabled: p.blocked }}
          accessibilityLabel={frog.isCompleted ? "إلغاء الإتمام" : "إتمام المهمة"}
          hitSlop={8}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: frog.isCompleted ? (frog.isDropped ? c.danger : c.brand) : "transparent",
            borderColor: frog.isCompleted ? (frog.isDropped ? c.danger : c.brand) : p.blocked ? c.line : c.lineStrong,
            marginTop: 2,
          }}
        >
          {frog.isCompleted ? <Feather name={frog.isDropped ? "slash" : "check"} size={16} color={c.brandInk} /> : null}
        </Pressable>

        <View style={{ flex: 1, gap: 4 }}>
          {editTitle !== null ? (
            <Input autoFocus value={editTitle} onChangeText={setEditTitle} onBlur={saveTitle} onSubmitEditing={saveTitle} style={{ minHeight: 40 }} />
          ) : (
            <Pressable onPress={() => !frog.isCompleted && setEditTitle(frog.title)}>
              <Txt
                numberOfLines={2}
                weight="medium"
                color={frog.isCompleted ? "ink3" : "ink"}
                style={frog.isCompleted ? { textDecorationLine: "line-through" } : undefined}
              >
                {frog.title}
              </Txt>
            </Pressable>
          )}

          {anchorTitle || rollovers > 0 ? (
            <Row gap={6} style={{ flexWrap: "wrap" }}>
              {anchorTitle ? (
                <Txt variant="caption" color="brand" weight="medium">
                  🎯 {anchorTitle} ›
                </Txt>
              ) : null}
              {rollovers > 0 && !frog.isCompleted ? (
                <Txt variant="caption" color={rollovers >= 3 ? "danger" : "accentStrong"} weight="medium">
                  مُرحّلة ×{rollovers}
                </Txt>
              ) : null}
              {rollovers >= 3 && !frog.isCompleted && !frog.isDropped ? (
                <Pressable onPress={() => p.onDrop("رُحّلت 3 مرات: لا تستحق مكانها اليوم")} accessibilityRole="button" hitSlop={6}>
                  <Txt variant="caption" color="danger" style={{ textDecorationLine: "underline" }}>
                    إسقاط واعٍ؟
                  </Txt>
                </Pressable>
              ) : null}
            </Row>
          ) : null}

          {frog.isDropped ? (
            <Row gap={4} style={{ alignItems: "center" }}>
              <View style={{ backgroundColor: c.dangerSoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm }}>
                <Txt variant="caption" color="danger" weight="medium">
                  مُسقطة واعياً 🚫
                </Txt>
              </View>
              {frog.dropReason ? (
                <Txt variant="caption" color="ink3" numberOfLines={1}>
                  ({frog.dropReason})
                </Txt>
              ) : null}
            </Row>
          ) : editDod !== null ? (
            <Input
              autoFocus
              value={editDod}
              onChangeText={setEditDod}
              onBlur={saveDod}
              onSubmitEditing={saveDod}
              placeholder="شرط الإتقان (DoD)"
              style={{ minHeight: 36, fontSize: 13 }}
            />
          ) : (
            <Pressable onPress={() => !frog.isCompleted && setEditDod(frog.definitionOfDone || "")}>
              <Txt variant="caption" color={frog.definitionOfDone ? "ink2" : "accentStrong"}>
                {frog.definitionOfDone ? `🎯 الإتقان: ${frog.definitionOfDone}` : "⚠️ بلا شرط إتقان (DoD) · اضغط للتحديد"}
              </Txt>
            </Pressable>
          )}

          {frog.projectId || frog.skillId ? (
            <LineageLine links={frog} />
          ) : p.canLink && !frog.isCompleted ? (
            <Pressable onPress={p.onLink} accessibilityRole="button" hitSlop={6}>
              <Txt variant="caption" color="ink3">
                بلا مشروع · اربطها
              </Txt>
            </Pressable>
          ) : null}

          {!frog.isCompleted ? (
            <Row gap={6} style={{ marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
              <EnergyPills value={frog.energyTag || "neutral"} onChange={p.onEnergy} round />

              <Row gap={2} style={{ alignItems: "center" }}>
                {!p.isCurrent && p.canReorder ? (
                  <Pressable onPress={p.onStartWith} accessibilityRole="button" style={quietPill(c.line)}>
                    <Txt variant="caption" weight="medium" color="ink2">
                      ابدأ بها
                    </Txt>
                  </Pressable>
                ) : null}
                {p.canReorder && index > 0 ? (
                  <IconButton icon="chevron-up" label={`ارفع «${frog.title}»`} onPress={() => reorderFrog(frog.id, index - 1)} />
                ) : null}
                {p.canReorder && index < p.count - 1 ? (
                  <IconButton icon="chevron-down" label={`أنزل «${frog.title}»`} onPress={() => reorderFrog(frog.id, index + 1)} />
                ) : null}
                <Pressable
                  onPress={() => p.onDrop("منخفضة الرافعة ولا تستحق الاستمرار")}
                  accessibilityRole="button"
                  accessibilityLabel={`إسقاط واعٍ لـ «${frog.title}»`}
                  hitSlop={6}
                  style={quietPill(c.line)}
                >
                  <Txt variant="caption" color="ink3">
                    إسقاط واعٍ
                  </Txt>
                </Pressable>
                {p.canLink ? <FrogLinkButton links={frog} label={`ربط «${frog.title}» بمشروع أو مهارة`} onPress={p.onLink} /> : null}
                {!p.isActive ? <IconButton icon="x" label={`إزالة «${frog.title}»`} onPress={p.onRemove} /> : null}
              </Row>
            </Row>
          ) : null}
        </View>

        {p.isCurrent ? (
          <View style={{ borderRadius: radius.full, backgroundColor: c.brandSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Txt variant="caption" weight="medium" color="brand">
              الآن
            </Txt>
          </View>
        ) : !frog.isCompleted ? (
          <OrderDot n={index + 1} small />
        ) : null}
      </Row>
    </View>
  );
}
