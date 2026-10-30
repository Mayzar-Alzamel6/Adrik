import type { IconName } from "@/components/ui";

export type ToolId = "eisenhower" | "projects" | "calendar" | "compound" | "cbt" | "vault" | "identity" | "meta" | "tawahhum" | "habits";
export type ToolInfo = { id: ToolId; title: string; description: string; icon: IconName };

// Same tools and ids as the web app (/app/tools/<id>).
export const TOOL_GROUPS: { title: string; description: string; tools: ToolInfo[] }[] = [
  {
    title: "التخطيط",
    description: "رتّب ما يهم قبل أن يبتلعك العاجل.",
    tools: [
      { id: "eisenhower", title: "مصفوفة الأولويات", description: "افرز مهامك بين العاجل والمهم، واحمِ وقت المهم غير العاجل.", icon: "grid" },
      { id: "projects", title: "إدارة المشاريع", description: "قسّم كل مشروع إلى مهام بحالات واضحة، وتابع تقدّمك نحو موعده.", icon: "folder" },
      { id: "calendar", title: "المواعيد القادمة", description: "ثبّت التزاماتك الثابتة حتى تبني يومك حولها.", icon: "calendar" },
      { id: "compound", title: "قوة القليل الدائم", description: "احسب ما تصنعه جلسة يومية واحدة خلال أشهر.", icon: "trending-up" },
    ],
  },
  {
    title: "العقل والمشاعر",
    description: "حين يتعثر اليوم، ابدأ من هنا.",
    tools: [
      { id: "cbt", title: "تفكيك الأفكار", description: "افصل الموقف عن الفكرة والشعور، واخرج بفكرة بديلة وخطوة صغيرة.", icon: "cpu" },
      { id: "vault", title: "تأجيل الاندفاع", description: "أجّل الرغبة المفاجئة ساعتين أو يوماً، وافصل الانفعال عن القرار.", icon: "wind" },
    ],
  },
  {
    title: "الهوية والنمو",
    description: "لماذا تفعل ما تفعل، وإلى أين.",
    tools: [
      { id: "habits", title: "متابعة العادات", description: "عادات صغيرة مربوطة بقيمك، بسلسلة لا تنقطع بيوم واحد، وخريطة لأسابيعك.", icon: "repeat" },
      { id: "identity", title: "دستور القيم", description: "قيمك، وسلوكها اليومي، وخطوطها الحمراء، وسجل أصوات هويتك.", icon: "book" },
      { id: "meta", title: "تعلّم مهارة جديدة", description: "فكّك المهارة إلى مفاهيم وحقائق وإجراءات، والتزم بأول 20 ساعة.", icon: "layers" },
      { id: "tawahhum", title: "رؤية المستقبل", description: "دقيقة تخيّل موجّه لمشهد وصولك قبل أن تبدأ العمل.", icon: "eye" },
    ],
  },
];

export const findTool = (id: string | undefined) => TOOL_GROUPS.flatMap((g) => g.tools).find((t) => t.id === id);
