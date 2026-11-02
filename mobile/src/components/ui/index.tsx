import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Feather from "@expo/vector-icons/Feather";
import { ROW, TEXT_START, fonts, radius, useColors, type ColorName } from "@/theme";

export type IconName = React.ComponentProps<typeof Feather>["name"];

/* ---------- Text ---------- */

const SIZES = {
  caption: [12, 18],
  small: [13, 21],
  ui: [14, 23],
  body: [16, 27],
  lead: [17, 29],
  subtitle: [18, 30],
  title: [20, 32],
  titleLg: [23, 36],
  heading: [27, 40],
  display: [32, 46],
  timer: [58, 66],
} as const;

export type TextVariant = keyof typeof SIZES;

export function Txt({
  variant = "body",
  weight = "regular",
  color = "ink",
  align,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  weight?: keyof typeof fonts;
  color?: ColorName;
  align?: "center" | "start";
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  const c = useColors();
  const [fontSize, lineHeight] = SIZES[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize,
          lineHeight,
          color: c[color],
          textAlign: align === "center" ? "center" : TEXT_START,
          writingDirection: "rtl",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- Layout ---------- */

export function Row({ style, children, gap = 8 }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; gap?: number }) {
  return <View style={[{ flexDirection: ROW, alignItems: "center", gap }, style]}>{children}</View>;
}

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const c = useColors();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ style, children, tone = "surface" }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; tone?: "surface" | "brand" | "accent" }) {
  const c = useColors();
  const bg = tone === "brand" ? c.brandSoft : tone === "accent" ? c.accentSoft : c.surface;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: c.line }, style]}>{children}</View>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Row style={{ alignItems: "flex-start", justifyContent: "space-between" }} gap={12}>
      <View style={{ flex: 1 }}>
        <Txt variant="subtitle" weight="semibold">
          {title}
        </Txt>
        {description ? (
          <Txt variant="ui" color="ink2" style={{ marginTop: 2 }}>
            {description}
          </Txt>
        ) : null}
      </View>
      {action}
    </Row>
  );
}

/* ---------- Badge ---------- */

export function Badge({ tone = "neutral", icon, children }: { tone?: "neutral" | "brand" | "accent" | "danger"; icon?: IconName; children: React.ReactNode }) {
  const c = useColors();
  const map = {
    neutral: [c.surface2, "ink2"],
    brand: [c.brandSoft, "brand"],
    accent: [c.accentSoft, "accentStrong"],
    danger: [c.dangerSoft, "danger"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <Row gap={5} style={{ backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "center" }}>
      {icon ? <Feather name={icon} size={13} color={c[fg]} /> : null}
      <Txt variant="caption" weight="medium" color={fg}>
        {children}
      </Txt>
    </Row>
  );
}

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const look = {
    primary: { bg: c.brand, fg: "brandInk", border: c.brand },
    secondary: { bg: c.surface, fg: "ink", border: c.line },
    ghost: { bg: "transparent", fg: "ink2", border: "transparent" },
    quiet: { bg: c.surface2, fg: "ink", border: c.surface2 },
    danger: { bg: c.dangerSoft, fg: "danger", border: c.dangerSoft },
  }[variant] as { bg: string; fg: ColorName; border: string };
  const height = size === "sm" ? 38 : size === "lg" ? 54 : 46;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === "sm" ? 12 : 18,
          borderRadius: radius.md,
          backgroundColor: look.bg,
          borderWidth: 1,
          borderColor: look.border,
          flexDirection: ROW,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={size === "sm" ? 15 : 17} color={c[look.fg]} /> : null}
      <Txt variant={size === "sm" ? "small" : "ui"} weight="semibold" color={look.fg} align="center">
        {title}
      </Txt>
    </Pressable>
  );
}

/** Small tappable text link. */
export function LinkButton({ title, onPress, icon, color = "brand" }: { title: string; onPress: () => void; icon?: IconName; color?: ColorName }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Row gap={6} style={{ justifyContent: "center" }}>
        {icon ? <Feather name={icon} size={15} color={c[color]} /> : null}
        <Txt variant="ui" weight="medium" color={color} align="center">
          {title}
        </Txt>
      </Row>
    </Pressable>
  );
}

/** Round icon-only button. */
export function IconButton({ icon, onPress, label, color = "ink3", active }: { icon: IconName; onPress: () => void; label: string; color?: ColorName; active?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? c.brandSoft : pressed ? c.surface2 : "transparent",
      })}
    >
      <Feather name={icon} size={18} color={c[color]} />
    </Pressable>
  );
}

/* ---------- Inputs ---------- */

export function Input(props: TextInputProps & { multiline?: boolean }) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.ink3}
      {...props}
      style={[
        {
          minHeight: props.multiline ? 88 : 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: props.editable === false ? c.surface2 : c.surface,
          paddingHorizontal: 14,
          paddingVertical: props.multiline ? 10 : 0,
          fontFamily: fonts.regular,
          fontSize: 16,
          color: props.editable === false ? c.ink2 : c.ink,
          textAlign: TEXT_START,
          textAlignVertical: props.multiline ? "top" : "center",
          writingDirection: "rtl",
        },
        props.style,
      ]}
    />
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Txt variant="ui" weight="medium">
        {children}
      </Txt>
      {hint ? (
        <Txt variant="small" color="ink3">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Pill option used for quick picks (reasons, minutes, focus areas). */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        minHeight: 38,
        paddingHorizontal: 14,
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? c.ink : c.line,
        backgroundColor: selected ? c.ink : c.surface,
      }}
    >
      <Txt variant="small" weight="medium" color={selected ? "bg" : "ink2"} align="center">
        {label}
      </Txt>
    </Pressable>
  );
}

/** Compact action chip with an optional icon, for "send it somewhere" rows and quick sorting. */
export function MiniChip({
  label,
  icon,
  onPress,
  selected,
  dot,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  selected?: boolean;
  /** A small colour dot before the label (e.g. a quadrant's colour). */
  dot?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: 34,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.line,
        backgroundColor: selected ? c.brandSoft : pressed ? c.surface2 : c.surface,
        flexDirection: ROW,
        alignItems: "center",
        gap: 6,
      })}
    >
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      {icon ? <Feather name={icon} size={14} color={selected ? c.brand : c.ink2} /> : null}
      <Txt variant="small" weight="medium" color={selected ? "brand" : "ink2"}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: IconName }[];
}) {
  const c = useColors();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: ROW, gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: ROW,
              gap: 5,
              paddingHorizontal: 6,
              backgroundColor: active ? c.surface : "transparent",
              ...(active ? styles.softShadow : null),
            }}
          >
            {o.icon ? <Feather name={o.icon} size={14} color={active ? c.ink : c.ink2} /> : null}
            <Txt variant="small" weight={active ? "semibold" : "medium"} color={active ? "ink" : "ink2"} align="center">
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Row gap={14} style={{ paddingVertical: 12, justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{title}</Txt>
        {description ? (
          <Txt variant="small" color="ink2">
            {description}
          </Txt>
        ) : null}
      </View>
      <RNSwitch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.brand, false: c.line }}
        thumbColor={Platform.OS === "android" ? c.surface : undefined}
        accessibilityLabel={title}
      />
    </Row>
  );
}

/* ---------- Progress ---------- */

export function ProgressRing({ value, size = 220, stroke = 5, tone = "brand", children }: { value: number; size?: number; stroke?: number; tone?: "brand" | "accent"; children?: React.ReactNode }) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone === "accent" ? c.accent : c.brand}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "accent" }) {
  const c = useColors();
  return (
    <View style={{ height: 8, borderRadius: radius.full, backgroundColor: c.surface2, overflow: "hidden", flexDirection: ROW }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: tone === "accent" ? c.accent : c.brand, borderRadius: radius.full }} />
    </View>
  );
}

/* ---------- Sheet ---------- */

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel="إغلاق" />
        <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={[styles.grabber, { backgroundColor: c.line }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
            {title ? (
              <View>
                <Txt variant="title" weight="semibold">
                  {title}
                </Txt>
                {description ? (
                  <Txt variant="ui" color="ink2" style={{ marginTop: 4 }}>
                    {description}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    shadowColor: "#1C1B19",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  softShadow: {
    shadowColor: "#1C1B19",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, marginBottom: 14 },
});
