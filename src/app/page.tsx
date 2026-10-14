import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarRange,
  Check,
  HeartHandshake,
  Moon,
  Scroll,
  ShieldCheck,
  Sun,
  SunMedium,
  Timer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/primitives";
import { ProductPreview } from "@/components/marketing/ProductPreview";

const PROBLEMS = [
  "قوائم مهام مفتوحة تكبر كل يوم حتى تشلّك.",
  "تطبيقات تفصل الإنجاز عن حالتك النفسية وطاقتك الحقيقية.",
  "عدّاد أيام متتالية يُصفَّر عند أول تعثّر، فتترك كل شيء.",
  "لا مرجعية قيمية تحسم بين ما يجب وما تشتهي.",
];

const FLOW: { icon: LucideIcon; time: string; title: string; text: string }[] = [
  {
    icon: SunMedium,
    time: "الصباح",
    title: "تهيئة في ثلاث دقائق",
    text: "تمرين تنفّس وتركيز بصري قصير يُدخلك حالة العمل قبل أن تلمس أي مهمة.",
  },
  {
    icon: Sun,
    time: "النهار",
    title: "ثلاث أولويات، واحدة في كل مرة",
    text: "جلسات تركيز عميق محمية، والمهمة الجارية تبقى مقفلة حتى تنهيها.",
  },
  {
    icon: Moon,
    time: "المساء",
    title: "إغلاق هادئ وتخطيط للغد",
    text: "جرد صادق لليوم، وعادات نعم/لا، واعتماد أولويات الغد قبل النوم.",
  },
  {
    icon: CalendarRange,
    time: "الجمعة",
    title: "مراجعة أسبوعية صريحة",
    text: "عامك في 52 أسبوعاً: نسبة إنجاز حقيقية ووقت تشتت بلا تجميل.",
  },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Timer, title: "تركيز عميق محمي", text: "مؤقت 90 أو 25 دقيقة، واستراحة عين كل ربع ساعة، وتفريغ فوري للخواطر بزر واحد." },
  { icon: HeartHandshake, title: "تعافٍ بلا جلد للذات", text: "انقطعت يومين؟ لا أرقام حمراء. خطوة صغيرة واحدة تعيدك إلى الدوران." },
  { icon: BrainCircuit, title: "تفكيك الأفكار المعطّلة", text: "حين تقول لنفسك «ضاع اليوم»، يساعدك التطبيق على رؤية الفكرة كما هي واقتراح خطوة تالية." },
  { icon: Wind, title: "تأجيل الاندفاع", text: "رغبة مفاجئة في التصفح أو الشراء؟ أجّلها ساعتين أو يوماً بدل أن تصارعها." },
  { icon: Scroll, title: "دستور قيمك", text: "قيمك وسلوكها اليومي وخطوطها الحمراء — مرجعك حين يتعارض الواجب مع الرغبة." },
  { icon: ShieldCheck, title: "خصوصيتك أولاً", text: "بلا إعلانات وبلا بيع بيانات. سجلات أفكارك ومشاعرك ملكك وحدك." },
];

const INCLUDED = [
  "محطات اليوم الثلاث: الصباح، التركيز، المساء",
  "جلسات تركيز غير محدودة وسجل للوقت",
  "المراجعة الأسبوعية وخريطة الـ 52 أسبوعاً",
  "كل الأدوات: الأولويات، تفكيك الأفكار، تأجيل الاندفاع، دستور القيم، وتعلّم المهارات",
  "محتوى إيماني اختياري",
  "تحديثات مستمرة ودعم مباشر بالعربية",
];

const FAQ = [
  {
    q: "بماذا يختلف عن تطبيقات المهام العادية؟",
    a: "لا يعطيك قائمة مفتوحة. يفرض ثلاث أولويات فقط، ويربط التنفيذ بطاقتك وحالتك النفسية، ويتعامل مع التعثّر كجزء طبيعي من الطريق لا كفشل.",
  },
  {
    q: "هل أحتاج وقتاً طويلاً لإعداده؟",
    a: "دقيقتان. تكتب اسمك وتختار قيمك الثلاث وأولويات اليوم، ثم تبدأ أول جلسة تركيز مباشرة.",
  },
  {
    q: "هل المحتوى الديني إلزامي؟",
    a: "لا. هو اختياري بالكامل: تفعّله أو توقفه من الإعدادات متى شئت.",
  },
  {
    q: "هل يمكنني الإلغاء في أي وقت؟",
    a: "نعم، بضغطة واحدة ودون أسئلة. وإن لم يفدك في أول 14 يوماً فلن تدفع شيئاً.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-bg text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="أدرك عمرك">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-ui text-ink-2">
            <a href="#how" className="hover:text-ink transition">كيف يعمل</a>
            <a href="#features" className="hover:text-ink transition">المزايا</a>
            <a href="#pricing" className="hover:text-ink transition">السعر</a>
            <a href="#faq" className="hover:text-ink transition">أسئلة شائعة</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/app" className="hidden sm:inline text-ui text-ink-2 hover:text-ink px-3">
              دخول
            </Link>
            <ButtonLink href="/onboarding" size="sm">
              جرّبه مجاناً
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 paper-grain opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-small text-ink-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              نظام يومي عربي للتركيز والإنجاز
            </span>
            <h1 className="font-display text-display-lg sm:text-hero leading-[1.2] font-semibold tracking-tight mt-5">
              حوّل النيّة إلى إنجاز،
              <br />
              <span className="text-brand">يوماً بعد يوم.</span>
            </h1>
            <p className="text-subtitle sm:text-title text-ink-2 leading-relaxed mt-5 max-w-xl">
              ليس قائمة مهام أخرى. بل نظام تشغيل ليومك: ثلاث أولويات فقط، وتركيز عميق محمي، وإغلاق مسائي هادئ —
              وتعافٍ فوري حين تتعثّر، بلا جلد للذات.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/onboarding" size="lg">
                ابدأ تجربة 14 يوماً مجاناً
                <ArrowLeft className="w-4 h-4" />
              </ButtonLink>
              <ButtonLink href="#how" size="lg" variant="ghost">
                كيف يعمل؟
              </ButtonLink>
            </div>
            <p className="text-small text-ink-3 mt-4">بلا بطاقة ائتمان للتجربة · إلغاء في أي وقت</p>
          </div>
          <div className="lg:-ml-8">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <p className="text-small font-medium text-accent-strong">المشكلة</p>
            <h2 className="font-display text-display-sm sm:text-display-lg font-semibold leading-tight mt-2">
              لماذا تتركُ تطبيقات الإنتاجية بعد أسبوعين؟
            </h2>
            <p className="text-ink-2 text-lead leading-relaxed mt-4 max-w-md">
              لأنها صُمّمت لآلة لا تتعب. نحن صمّمنا لإنسان يمرّ بأيام جيدة وأيام ثقيلة، ويحتاج نظاماً يعيده بعد كل تعثّر.
            </p>
          </div>
          <ul className="space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex gap-3 items-start rounded-xl2 border border-line bg-bg px-5 py-4">
                <span className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-danger" />
                <span className="text-lead text-ink">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-small font-medium text-accent-strong">كيف يعمل</p>
          <h2 className="font-display text-display-sm sm:text-display-lg font-semibold leading-tight mt-2">
            إيقاع يومي واحد، يتكرر حتى يصبح أنت.
          </h2>
        </div>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.title} className="relative rounded-xl2 border border-line bg-surface p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <IconTile icon={f.icon} tone={i === 3 ? "accent" : "brand"} />
                <span className="text-small text-ink-3 tabular">0{i + 1}</span>
              </div>
              <p className="text-small text-ink-3 mt-5">{f.time}</p>
              <h3 className="font-display text-title-sm font-semibold mt-1">{f.title}</h3>
              <p className="text-body text-ink-2 leading-relaxed mt-2">{f.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-surface border-y border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-small font-medium text-accent-strong">المزايا</p>
            <h2 className="font-display text-display-sm sm:text-display-lg font-semibold leading-tight mt-2">
              كل ما تحتاجه، ولا شيء يشتّتك.
            </h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <IconTile icon={f.icon} tone="neutral" />
                <h3 className="font-display text-title-sm font-semibold mt-4">{f.title}</h3>
                <p className="text-body text-ink-2 leading-relaxed mt-2">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="rounded-4xl bg-brand text-brand-ink px-6 sm:px-14 py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full border-[28px] border-white/5" aria-hidden />
          <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <p className="text-small font-medium text-accent-soft/90">المنهجية</p>
              <h2 className="font-display text-heading-lg sm:text-display-md font-semibold leading-snug mt-2">
                مبني على منهجية، لا على موضة إنتاجية.
              </h2>
              <p className="text-lead leading-relaxed mt-4 opacity-85 max-w-xl">
                كل أداة في التطبيق ترجمة عملية لمبدأ مدروس: من «كُل الضفدع» ومصفوفة أيزنهاور، إلى إيقاع الـ 90 دقيقة،
                والعلاج المعرفي السلوكي، والذكاء العاطفي، ومحاسبة النفس.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-ui">
              {["الفعل يسبق الشعور", "ثلاث أولويات لا أكثر", "حدّد الأوقات لا الأعمال", "التعثّر ثقب لا سقوط"].map((p) => (
                <li key={p} className="rounded-xl2 bg-white/[0.07] border border-white/10 px-4 py-4 leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-small font-medium text-accent-strong">السعر</p>
          <h2 className="font-display text-display-sm sm:text-display-lg font-semibold leading-tight mt-2">
            سعر واحد. كل شيء مشمول.
          </h2>
          <p className="text-ink-2 text-lead mt-3">أقل من دولار في اليوم، مقابل ساعات تركيز حقيقية كل يوم.</p>
        </div>

        <div className="mt-12 max-w-lg mx-auto rounded-4xl border border-line bg-surface shadow-lift p-7 sm:p-10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-title font-semibold">الاشتراك الكامل</h3>
            <span className="text-caption font-medium rounded-full bg-accent-soft text-accent-strong px-3 py-1">14 يوماً مجاناً</span>
          </div>
          <div className="mt-6 flex items-end gap-2">
            <span className="font-display text-timer font-semibold leading-none tabular">20$</span>
            <span className="text-ink-2 mb-2">/ شهرياً</span>
          </div>
          <p className="text-ui text-ink-3 mt-2">أو 192$ سنوياً — وفّر 48$</p>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 items-start text-body">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-brand-soft text-brand inline-flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <ButtonLink href="/onboarding" size="lg" className="w-full mt-9">
            ابدأ التجربة المجانية
          </ButtonLink>
          <p className="text-small text-ink-3 text-center mt-3">إلغاء بضغطة واحدة، في أي وقت.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="font-display text-display-sm sm:text-display-md font-semibold text-center">أسئلة شائعة</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-subtitle font-medium">
                  {f.q}
                  <span className="w-7 h-7 shrink-0 rounded-full border border-line inline-flex items-center justify-center text-ink-3 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-body text-ink-2 leading-relaxed mt-3 max-w-2xl">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="font-display text-display sm:text-hero-sm font-semibold leading-tight">
          يومك القادم يمكن أن يكون مختلفاً.
        </h2>
        <p className="text-ink-2 text-subtitle mt-3">ابدأ الآن، وأنجز أول أولوية خلال دقائق.</p>
        <ButtonLink href="/onboarding" size="lg" className="mt-8">
          ابدأ مجاناً
          <ArrowLeft className="w-4 h-4" />
        </ButtonLink>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-small text-ink-3">
          <Logo />
          <p>© 2026 أدرك عمرك. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
