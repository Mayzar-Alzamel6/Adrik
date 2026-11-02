import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore, type EnergyTaxonomy } from "@/stores/useAppStore";
import { canActivateDrain } from "@/lib/completion";
import { successFeedback, tapFeedback, warningFeedback } from "@/lib/feedback";
import { radius, useColors } from "@/theme";
import { Button, Input, Row, Txt } from "@/components/ui";
import { EnergyPills, OrderDot } from "@/components/today/priorities/shared";

const DRAIN_LOCK = "قفل الطاقة الإدراكية: لا يُسمح بأكثر من مهمة استنزاف واحدة (Drain) يومياً.";

type Draft = { title: string; dod: string; energy: EnergyTaxonomy };
const emptyDrafts = (): Draft[] => [
  { title: "", dod: "", energy: "genius" },
  { title: "", dod: "", energy: "neutral" },
  { title: "", dod: "", energy: "drain" },
];

/** Adds a task with its definition of done and energy tag; false (after a notice) when a rule refuses it. */
function addTaskWith(flash: (msg: string) => void) {
  return (title: string, dod: string, energy: EnergyTaxonomy) => {
    const s = useAppStore.getState();
    const res = s.appendFrog(title.trim(), "QUALITY");
    if (!res.ok) {
      warningFeedback();
      flash(res.message);
      return false;
    }
    s.updateFrog(res.id, { definitionOfDone: dod.trim(), energyTag: energy });
    return true;
  };
}

/** An empty day: up to three priorities at once, each with its definition of done and energy. */
export function DraftPriorities({ flash, onPickProjects }: { flash: (msg: string) => void; onPickProjects?: () => void }) {
  const c = useColors();
  const [drafts, setDrafts] = useState(emptyDrafts);
  const add = addTaskWith(flash);
  const edit = (i: number, patch: Partial<Draft>) => setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = () => {
    const active = drafts.filter((d) => d.title.trim());
    if (!active.length) return;
    if (active.some((d) => !d.dod.trim())) {
      warningFeedback();
      flash("شرط الاكتمال (DoD) إلزامي لكل أولوية نشطة: حدد معيار تسليم واضحاً.");
      return;
    }
    const drains = active.filter((d) => d.energy === "drain").length;
    if (drains > 1 || (drains === 1 && !canActivateDrain(useAppStore.getState().frogs))) {
      warningFeedback();
      flash(DRAIN_LOCK);
      return;
    }
    active.forEach((d) => add(d.title, d.dod, d.energy));
    successFeedback();
    setDrafts(emptyDrafts());
  };

  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <View>
        <Txt variant="subtitle" weight="semibold" align="center">
          ما أهم ثلاثة أشياء اليوم؟
        </Txt>
        <Txt variant="ui" color="ink2" align="center" style={{ marginTop: 4 }}>
          حدد معيار الإتقان (DoD) وصنف استهلاك الطاقة لحماية تركيزك.
        </Txt>
      </View>

      {drafts.map((d, i) => (
        <View key={i} style={{ backgroundColor: c.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 12, gap: 8 }}>
          <Row gap={8} style={{ alignItems: "center" }}>
            <OrderDot n={i + 1} />
            <View style={{ flex: 1 }}>
              <Input
                value={d.title}
                onChangeText={(title) => edit(i, { title })}
                placeholder={i === 0 ? "الأولوية الكبرى (ما يصعب تأجيله)" : `أولوية إضافية ${i + 1}`}
                accessibilityLabel={`الأولوية ${i + 1}`}
              />
            </View>
          </Row>
          <Input
            value={d.dod}
            onChangeText={(dod) => edit(i, { dod })}
            placeholder="شرط الإتقان (DoD): تم عند تسليم..."
            accessibilityLabel={`شرط الإتقان للأولوية ${i + 1}`}
            style={{ fontSize: 13, minHeight: 40 }}
          />
          <EnergyPills
            value={d.energy}
            onChange={(e) => {
              if (e === "drain" && drafts.some((dr, j) => j !== i && dr.energy === "drain" && dr.title.trim())) {
                warningFeedback();
                flash("قفل الطاقة: مسموح بمهمة استنزاف واحدة فقط يومياً.");
                return;
              }
              tapFeedback();
              edit(i, { energy: e });
            }}
          />
        </View>
      ))}

      <Button title="اعتماد الأولويات وحوكمة الإتقان" disabled={!drafts.some((d) => d.title.trim())} onPress={save} />
      {onPickProjects ? <Button title="اختر من مشاريعك" icon="folder" variant="secondary" onPress={onPickProjects} /> : null}
    </View>
  );
}

/** One more priority under a non-empty list: a dashed trigger that opens a small form. */
export function AddOnePriority({ flash, onPickProjects }: { flash: (msg: string) => void; onPickProjects?: () => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dod, setDod] = useState("");
  const [energy, setEnergy] = useState<EnergyTaxonomy>("genius");
  const add = addTaskWith(flash);

  const reset = () => {
    setOpen(false);
    setTitle("");
    setDod("");
    setEnergy("genius");
  };

  const save = () => {
    if (!title.trim()) return;
    if (!dod.trim()) {
      warningFeedback();
      flash("شرط الاكتمال (DoD) إلزامي: حدد معيار تسليم واضحاً للضفدع.");
      return;
    }
    if (energy === "drain" && !canActivateDrain(useAppStore.getState().frogs)) {
      warningFeedback();
      flash(DRAIN_LOCK);
      return;
    }
    if (!add(title, dod, energy)) return;
    successFeedback();
    reset();
  };

  if (!open) {
    return (
      <Row gap={8} style={{ justifyContent: "space-between", marginTop: 10 }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.line,
            borderStyle: "dashed",
            borderRadius: radius.md,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Row gap={6}>
            <Feather name="plus" size={16} color={c.ink2} />
            <Txt variant="ui" color="ink2">
              أضف أولوية جديدة
            </Txt>
          </Row>
        </Pressable>
        {onPickProjects ? <Button title="من المشاريع" icon="folder" variant="secondary" onPress={onPickProjects} /> : null}
      </Row>
    );
  }

  return (
    <View style={{ marginTop: 10, backgroundColor: c.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 12, gap: 10 }}>
      <Input value={title} onChangeText={setTitle} placeholder="عنوان الأولوية..." accessibilityLabel="عنوان الأولوية الجديدة" maxLength={140} />
      <Input
        value={dod}
        onChangeText={setDod}
        placeholder="شرط الاكتمال (DoD): تم عند تسليم..."
        accessibilityLabel="شرط الاكتمال للأولوية الجديدة"
        style={{ fontSize: 13, minHeight: 40 }}
      />
      <EnergyPills
        value={energy}
        onChange={(e) => {
          if (e === "drain" && !canActivateDrain(useAppStore.getState().frogs)) {
            warningFeedback();
            flash("قفل الطاقة: مسموح بمهمة استنزاف واحدة فقط يومياً.");
            return;
          }
          tapFeedback();
          setEnergy(e);
        }}
      />
      <Row gap={8} style={{ justifyContent: "flex-end" }}>
        <Button title="إلغاء" variant="secondary" onPress={reset} />
        <Button title="إضافة وتثبيت" disabled={!title.trim()} onPress={save} />
      </Row>
    </View>
  );
}
