import {
  BrainCircuit,
  CalendarCheck,
  Eye,
  FolderKanban,
  Grid2X2,
  Layers,
  Repeat,
  Scroll,
  TrendingUp,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type ToolId =
  | "identity"
  | "cbt"
  | "vault"
  | "eisenhower"
  | "projects"
  | "calendar"
  | "meta"
  | "tawahhum"
  | "compound"
  | "habits";

export interface ToolMeta {
  id: ToolId;
  title: string;
  description: string;
  icon: LucideIcon;
  group: "plan" | "mind" | "growth";
}

export const TOOL_GROUPS: { id: ToolMeta["group"]; title: string; description: string }[] = [
  { id: "plan", title: "التخطيط", description: "رتّب ما يهم قبل أن يبتلعك العاجل." },
  { id: "mind", title: "العقل والمشاعر", description: "حين يتعثر اليوم، ابدأ من هنا." },
  { id: "growth", title: "الهوية والنمو", description: "لماذا تفعل ما تفعل، وإلى أين." },
];

export const TOOLS: ToolMeta[] = [
  {
    id: "habits",
    title: "متابعة العادات",
    description: "عادات صغيرة مربوطة بقيمك، بسلسلة لا تنقطع بيوم واحد، وخريطة لأسابيعك.",
    icon: Repeat,
    group: "growth",
  },
  {
    id: "eisenhower",
    title: "مصفوفة الأولويات",
    description: "افرز مهامك بين العاجل والمهم، واحمِ وقت المهم غير العاجل.",
    icon: Grid2X2,
    group: "plan",
  },
  {
    id: "projects",
    title: "إدارة المشاريع",
    description: "قسّم كل مشروع إلى مهام بحالات واضحة، وتابع نسبة تقدّمك نحو موعده.",
    icon: FolderKanban,
    group: "plan",
  },
  {
    id: "calendar",
    title: "المواعيد القادمة",
    description: "ثبّت التزاماتك الثابتة حتى تبني يومك حولها.",
    icon: CalendarCheck,
    group: "plan",
  },
  {
    id: "compound",
    title: "قوة القليل الدائم",
    description: "احسب ما تصنعه جلسة يومية واحدة خلال أشهر.",
    icon: TrendingUp,
    group: "plan",
  },
  {
    id: "cbt",
    title: "تفكيك الأفكار",
    description: "افصل الموقف عن الفكرة والشعور، واخرج بفكرة بديلة وخطوة صغيرة.",
    icon: BrainCircuit,
    group: "mind",
  },
  {
    id: "vault",
    title: "تأجيل الاندفاع",
    description: "أجّل الرغبة المفاجئة ساعتين أو يوماً، وافصل الانفعال عن القرار.",
    icon: Wind,
    group: "mind",
  },
  {
    id: "identity",
    title: "دستور القيم",
    description: "قيمك، وسلوكها اليومي، وخطوطها الحمراء، وسجل أصوات هويتك.",
    icon: Scroll,
    group: "growth",
  },
  {
    id: "meta",
    title: "تعلّم مهارة جديدة",
    description: "فكّك المهارة إلى مفاهيم وحقائق وإجراءات، والتزم بأول 20 ساعة.",
    icon: Layers,
    group: "growth",
  },
  {
    id: "tawahhum",
    title: "رؤية المستقبل",
    description: "دقيقة تخيّل موجّه لمشهد وصولك قبل أن تبدأ العمل.",
    icon: Eye,
    group: "growth",
  },
];

export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
