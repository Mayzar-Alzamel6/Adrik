import React from "react";
import { Pressable, View } from "react-native";
import type { EnergyTaxonomy } from "@/stores/useAppStore";
import { radius, useColors } from "@/theme";
import { Row, Txt } from "@/components/ui";

export const ENERGY_LABELS: Record<EnergyTaxonomy, string> = {
  genius: "عبقرية ⚡",
  neutral: "محايدة ⚖️",
  drain: "استنزاف ⏳",
};

const ENERGIES: EnergyTaxonomy[] = ["genius", "neutral", "drain"];

/** The three energy tags as pills: square in the add forms, round on a task's row. */
export function EnergyPills({
  value,
  onChange,
  round,
}: {
  value: EnergyTaxonomy;
  onChange: (e: EnergyTaxonomy) => void;
  round?: boolean;
}) {
  const c = useColors();
  return (
    <Row gap={round ? 4 : 6}>
      {ENERGIES.map((e) => {
        const active = value === e;
        const neutralBorder = round ? c.lineStrong : c.ink;
        const neutralFill = round ? c.surface2 : c.surface;
        return (
          <Pressable
            key={e}
            onPress={() => onChange(e)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: round ? 6 : 8,
              paddingVertical: round ? 2 : 3,
              borderRadius: round ? radius.full : radius.sm,
              borderWidth: 1,
              borderColor: active ? (e === "drain" ? c.danger : e === "genius" ? c.brand : neutralBorder) : c.line,
              backgroundColor: active ? (e === "drain" ? c.dangerSoft : e === "genius" ? c.brandSoft : neutralFill) : "transparent",
            }}
          >
            <Txt
              variant="caption"
              weight={active ? "semibold" : "regular"}
              color={active ? (e === "drain" ? "danger" : e === "genius" ? "brand" : "ink") : "ink3"}
            >
              {ENERGY_LABELS[e]}
            </Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function OrderDot({ n, small }: { n: number; small?: boolean }) {
  const c = useColors();
  const size = small ? 24 : 28;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.surface2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="small" weight="semibold" color="ink2" align="center">
        {n}
      </Txt>
    </View>
  );
}

/** Preset reasons to pick from, used by the drop and remove sheets above their free-text field. */
export function ReasonPicker({
  reasons,
  value,
  onChange,
  wrap,
}: {
  reasons: string[];
  value: string;
  onChange: (r: string) => void;
  wrap?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <View style={wrap ? { flexDirection: "row", flexWrap: "wrap", gap: 6 } : { gap: 6 }}>
        {reasons.map((reason) => {
          const selected = value === reason;
          return (
            <Pressable
              key={reason}
              onPress={() => onChange(reason)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                borderRadius: wrap ? radius.md : radius.sm,
                borderWidth: 1,
                borderColor: selected ? c.brand : c.line,
                backgroundColor: selected ? c.brandSoft : c.surface2,
                ...(wrap ? { paddingHorizontal: 10, paddingVertical: 6 } : { padding: 10 }),
              }}
            >
              <Txt variant="small" weight={selected ? "semibold" : "regular"} color={selected ? "brand" : "ink2"}>
                {reason}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
