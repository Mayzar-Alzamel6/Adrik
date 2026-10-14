# وثيقة متطلبات المنتج (PRD)

## نظام التشغيل السلوكي والتخطيط التنفيذي: "أدرك عمرك — دوّامة الإنجاز" (Adrik Omrak OS)

* **الإصدار:** 1.0.0
* **التاريخ:** سبتمبر 2026
* **نوع التطبيق:** Progressive Web App (PWA) / Desktop & Mobile Responsive Web App
* **الحالة:** جاهز للتنفيذ البرمجي (Ready for Development)

---

## 1. نظرة عامة على المشروع (Executive Summary)

### 1.1 بيان المشكلة (Problem Statement)

أغلب تطبيقات إدارة المهام وتتبع العادات (To-Do & Habit Trackers) تفشل بعد فترة وجيزة للأسباب التالية:

1. تعتمد على "قوائم مفتوحة" تؤدي إلى الشلل التحليلي (Analysis Paralysis).
2. تفصل بين الأداء التنفيذي والحالة النفسية/العصبية للمستخدم.
3. تنهار فور حدوث أي تعثر مؤقت بسبب متلازمة جلد الذات واشتراط "البدايات المثالية".
4. تفتقر إلى مرجعية قيمية وهوية واضحة تحكم قرارات المستخدم اليومية.

### 1.2 الحل المقترح (The Solution)

بناء تطبيق ويب تشغيلي يُترجم مخرجات كورس "أدرك عمرك"، ودورة "التخطيط الفعال"، ومفكرة الذكاء العاطفي (إدراك)، ونماذج التعافي السلوكي إلى برمجية تفاعلية. التطبيق لا يكتفي بعرض المهام، بل **يفرض بروتوكولاً عصبياً وسلوكياً** للتهيئة، والتركيز، ومحاسبة النفس، مع وكيل ذكاء اصطناعي مدمج يعمل كمحلل إدراكي للأفكار المشوهة وموجّه لدوامة الإنجاز.

### 1.3 الجمهور المستهدف (Target Persona)

المهنيون، المستقلون، والطلاب الساعون لإنجاز أهداف حرجة وطموحة (مثل تعلم لغة جديدة، إدارة أعمال ناشئة، والتحول المهني) في بيئات تتطلب تركيزاً وانضباطاً عالياً وتقليلاً للمشتتات.

---

## 2. المبادئ الحاكمة للمنتج (Design & Behavioral Principles)

1. **السلوك يقود الشعور (Action Precedes Emotion):** التطبيق يركز على دفع المستخدم للحركة والبدء الصغير، ولا ينتظر توفر "المزاج".
2. **قاعدة الـ 3 أولويات (Eat That Frog):** منع تخطيط أكثر من 3 مهام كبرى في اليوم الواحد.
3. **تحديد الأوقات لا الأعمال:** الجلسات محددة بأزمنة تركيز (كتل زمنية) بدلاً من أحجام أعمال مفتوحة تسبب التسويف.
4. **التعافي دون جلد ذات (Graceful Recovery):** الانقطاع "ثقب في المسار وليس سقوطاً كلياً"؛ لا تصفير للعدادات ولا رسائل تثبيط.
5. **محاسبة الشريك الشحيح:** رقابة دقيقة بنهاية الأسبوع تواجه المستخدم بساعات التشتت ونسبة الإنجاز الحقيقية بموضوعية تامة.

---

## 3. المعمارية التقنية (Technical Stack)

* **Frontend:** Next.js 15 (App Router, TypeScript, React 19).
* **Styling & UI:** Tailwind CSS v4, Lucide React, Shadcn/ui (تصميم داكن وهادئ: Deep Slate / OLED Dark).
* **Backend:** Next.js Server Actions & API Route Handlers.
* **Database & ORM:** PostgreSQL / SQLite مع Prisma ORM.
* **State Management:** Zustand + React Hook Form + Zod.
* **AI & Agent Runtime:** Google Antigravity Agent Runtime مدمج مع Gemini 3 Flash API.
* **PWA & Storage:** Serwist (Service Worker) لتوفير تجربة Offline-First وتثبيت PWA بدون إشعارات مزعجة.

---

## 4. المواصفات الوظيفية التفصيلية (Functional Specifications)

```
                                  [ Neuro-Gate ]
                      (30 تنفس عميق + 60 ثانية تحديق)
                                        │
                                        ▼
                           [ Daily 3-Frog Workspace ]
                        (الأولويات الـ 3 المخططة مساءً)
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
    [ Hyper-Focus Mode ]      [ Impulse Delay Vault ]      [ Perception Triangle ]
 (جلسات 90 د + Scratchpad)   (مؤقت تجميد النزوة 2-24h)     (تفكيك الأفكار عبر AI)
            │                           │                           │
            └───────────────────────────┼───────────────────────────┘
                                        │
                                        ▼
                         [ Evening Check-in & Audit ]
                         (تقييم 0/1 + جرد الأربع ثلاثات)
                                        │
                                        ▼
                          [ 52-Week Mastery Matrix ]
                       (محاسبة الشريك الشحيح + تقييم 1-4)
```

### 4.1 بوابة التهيئة العصبية (Module 1: The Neuro-Gate)

* **المسار:** شاشة تظهر إلزامياً عند أول فتح للتطبيق يومياً، وتحجب لوحة التحكم حتى الإكمال:
  * **تمرين الأدرينالين (Breathwork):** عداد بصري تفاعلي لـ 30 دورة تنفس عميق (شهيق وزفير منتظم) مع أصوات خافتة.
  * **تمرين الأسيتيل كولين (Fixed-Point Gaze):** شاشة كاملة بنقطة مركزية مضيئة مع مؤقت 60 ثانية لمنع حركة الماوس وتثبيت الانتباه.
  * **زر التجاوز:** خيار "تجاوز اضطراري" يظهر بعد 10 ثوانٍ، لكنه يسجل "تجاوز" في مؤشرات الأداء.

### 4.2 مساحة التخطيط اليومي (Module 2: Daily 3-Frog Planner)

* **الأولويات الثلاث:** 3 خانات فقط للمهام الكبرى اليومية.
* **قفل التخطيط المسائي:** تُقفل إمكانية كتابة مهام جديدة في الصباح؛ يجب اعتمادها في مساء اليوم السابق لفرض الجاهزية.
* **التنفيذ التتابعي:** لا توجد أوقات صارمة بالساعات (مثلاً لا نكتب 10:00 - 11:30)؛ بل ترتيب متسلسل: إنهاء الخطوة الأولى والانتقال للتي تليها.
* **مصفوفة أيزنهاور المصغرة:** تصنيف سريع للمهام الفرعية (طوارئ، جودة، تفويض، هروب).

### 4.3 وضع التركيز العميق ومفكرة العوارض (Module 3: Hyper-Focus & Scratchpad)

* **جلسات الـ 90 دقيقة (Ultradian Rhythm):** مؤقت Zen Mode يملأ الشاشة مع شريط تقدم هادئ.
* **مفكرة العوارض الجانبية (Distraction Scratchpad):** نافذة سريعة بزر اختصار (Shortcut) لتفريغ أي رغبة مفاجئة بالتصفح أو فكرة طارئة دون الخروج من حالة التدفق (Flow State).
* **استراحات الـ 10 ثوانٍ (Micro-Breaks):** وميض بصري خفيف كل 15 دقيقة يطلب من المستخدم النظر بعيداً لمدة 10 ثوانٍ لإعادة المعالجة العصبية.

### 4.4 صندوق تجميد النزوات (Module 4: Impulse Delay Vault)

* **الهدف:** تفعيل القشرة الجبهية وكسر قرارات الجهاز الحوفي الاندفاعية.
* **الوظيفة:**
  * زر سريع عند الشعور برغبة تسويفية، شراء غير مخطط، أو تصفح عشوائي.
  * يطلب التطبيق كتابة ما يريد فعله واختيار مدة التجميد: **ساعتان أو 24 ساعة**.
  * خلال فترة التجميد، يُقفل السجل تماماً وتظهر رسالة: *"أنت لم تحرم نفسك، لقد أجلت القرار فقط لتفصل الانفعال عن السلوك"*.

### 4.5 مثلث الإدراك ومحلل الأفكار المشوهة (Module 5: CBT Triangle & AI Reframer)

* **المدخلات:** نموذج تفاعلي عند التعثر أو التوتر:
  1. الموقف الخارجي (Event).
  2. الفكرة التلقائية السلبية (Automatic Thought).
  3. اسم الشعور وتحديده في الجسد (Emotion & Body Location).
  4. السلوك الذي تدفعك الفكرة لفعله (Action Tendency).
* **معالجة الذكاء الاصطناعي (Gemini 3 Flash):**
  * يقوم الوكيل بفحص الفكرة واكتشاف نوع التشويه من بين الستة: (التفكير القطبي، التعميم، التضخيم، الشخصنة، الاستدلال الانفعالي، والتهوين).
  * صياغة "الفكرة البديلة الواقعية" وتحديد "الفعل الصحيح التالي" بخطوة صغيرة واحدة.

### 4.6 الدستور الشخصي وسجل تصويت الهوية (Module 6: Identity Constitution & Votes)

* **بطاقات القيم الخمس:** عرض القيم الأساسية (الأمان، الإتقان، الاعتماد على الذات، الانضباط، المثابرة) وسلوكياتها اليومية وخطوطها الحمراء.
* **سجل أصوات الهوية (Identity Votes):** تسجيل مسائي لإجابة سؤال: *"ما هو السلوك الملموس الذي كان تصويتاً لصالح هويتك الجديدة اليوم؟"*.
* **تنبيه التنافر المعرفي (Cognitive Dissonance Alert):** تنبيه يظهر أوتوماتيكياً عندما تتجاوز ساعات التشتت الحد المسموح به مقارنة بقيمة "الانضباط".

### 4.7 لوحة التحكم وتقويم الـ 52 أسبوعاً (Module 7: The 52-Week Strict Audit)

* **مصفوفة الدوائر (Dot Matrix):** واجهة SVG تتكون من 52 دائرة تمثل أسابيع العام (4 صفوف × 13 عموداً).
* **طقس مساء الجمعة (محاسبة الشريك الشحيح):**
  * رصد ساعات "مربع الهروب" (مواقع التواصل والتشتت).
  * احتساب نسبة إنجاز الأسبوع آلياً (المستهدف $\ge 70\%$).
  * تحديد مؤشر الفعل الأسبوعي (1: لا فعل، 2: تراجع، 3: عادي، 4: فعل هائل).
  * تلوين دائرة الأسبوع:
    * أخضر: إنجاز $\ge 70\%$ مع فعل هائل.
    * أصفر: إنجاز 50–69% فعل عادي.
    * رمادي/أحمر: تراجع أو لا فعل.
  * فتح صندوق المكافأة الأسبوعية حصراً في حال تحقيق اللون الأخضر.

### 4.8 محرك التعافي الفوري (Module 8: Flywheel Recovery Engine)

* في حال انقطاع المستخدم عن التسجيل ليوم كامل أو أكثر:
  * يمنع التطبيق ظهور أرقام الأيام الضائعة أو تصفير الـ Streaks.
  * شاشة استقبال بعبارة: *"التعثر ثقب وليس سقوطاً — العودة الفورية هي جوهر الدوامة"*.
  * زر واحد: **"خطوة كايزن للتعافي (دقيقة واحدة)"**، يطلب من المستخدم مهمة مصغرة جداً (مثلاً: قراءة صفحة واحدة، أو حل عقدة الوضوء والصلاة) لإعادة الدوران فوراً.

---

## 5. مخطط قاعدة البيانات (Prisma Schema Data Model)

```prisma
datasource db {
  provider = "postgresql" // أو "sqlite" للتطوير المحلي
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id              String           @id @default(uuid())
  email           String           @unique
  name            String?
  constitution    CoreValue[]
  dailyLogs       DailyLog[]
  tasks           Task[]
  cbtLogs         CbtLog[]
  vaultItems      DelayVaultItem[]
  weeklyAudits    WeeklyAudit[]
  createdAt       DateTime         @default(now())
}

model CoreValue {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String   // مثل: الأمان والاستقرار، الإتقان والنمو
  definition      String
  dailyAction     String   // السلوك اليومي المثبت
  redLine         String   // الخط الأحمر المخالف
  order           Int      @default(0)
}

model Task {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String
  date            DateTime @db.Date
  isTopPriority   Boolean  @default(false) // واحدة من أولويات الضفادع الـ 3
  priorityOrder   Int?     // 1, 2, 3
  category        String   // EMERGENCY, QUALITY, DELEGATE, ESCAPE
  isCompleted     Boolean  @default(false)
  createdAt       DateTime @default(now())
}

model DailyLog {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date            DateTime @db.Date @unique
  neuroGatePassed Boolean  @default(false)
  deepWorkMinutes Int      @default(0)
  escapeMinutes   Int      @default(0)
  identityVote    String?  // تصويت الهوية المكتوب
  scoreRatio      Float    @default(0.0) // نسبة الالتزام لليوم
  createdAt       DateTime @default(now())
}

model DelayVaultItem {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  impulseTitle    String
  delayHours      Int      // 2 أو 24
  unlockTime      DateTime
  isResolved      Boolean  @default(false)
  actionTaken     String?  // هل نفذ النزوة أم تراجع عنها
  createdAt       DateTime @default(now())
}

model CbtLog {
  id                 String   @id @default(uuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  event              String
  automaticThought   String
  emotion            String
  bodyLocation       String?
  distortionType     String?  // نوع التشويه المكتشف بـ AI
  reframedThought    String?  // الفكرة البديلة المقترحة من AI
  nextSmallAction    String?  // الفعل الصحيح التالي
  createdAt          DateTime @default(now())
}

model WeeklyAudit {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekNumber      Int      // 1 to 52
  year            Int
  completionRate  Float    // نسبة الإنجاز المئوية
  escapeHoursTotal Float
  actionLevel     Int      // 1 (لا فعل) إلى 4 (فعل هائل)
  colorStatus     String   // GREEN, YELLOW, RED
  rewardClaimed   Boolean  @default(false)
  notes           String?
  createdAt       DateTime @default(now())
}
```

---

## 6. المتطلبات غير الوظيفية (Non-Functional Requirements)

1. **السرعة والاستجابة (Performance):** زمن استجابة واجهة المستخدم أقل من 100ms، وتحميل الشاشات دون وميض (No layout shift).
2. **العمل دون إنترنت (Offline Capability):** دعم كامل لحفظ المهام والطقوس محلياً، والمزامنة التلقائية عند عودة الاتصال.
3. **أمان البيانات والخصوصية:** تشفير النصوص الشخصية (سجلات التفكير ومشاعر مثلث الإدراك) وحمايتها محلياً.
4. **جماليات الواجهة وتفادي الإجهاد العصبي (Zen Aesthetics):**
  * خطوط عربية حديثة وعالية المقروئية (مثل: *IBM Plex Sans Arabic* أو *Tajawal*).
  * إبعاد العدادات الحمراء الصارخة والتنبيهات المزعجة واستبدالها بنغمات لونية هادئة.

---

## 7. خطة الإطلاق ومراحل التنفيذ (Milestones)

| المرحلة | الأهداف والمخرجات | التقدير الزمني |
| --- | --- | --- |
| **M1: الأساس المعماري وقاعدة البيانات** | إعداد مشروع Next.js 15، توليد جداول Prisma، وإعداد المصادقة وإدارة الحالة. | الأسبوع 1 |
| **M2: محرك التركيز والطقس العصبي** | برمجة مكونات بوابة التهيئة (التنفس والتحديق)، ومؤقت الـ 90 دقيقة ونافذة المشتتات. | الأسبوع 2 |
| **M3: التخطيط وصندوق تجميد النزوات** | بناء مساحة الأولويات الثلاث (3-Frogs)، وقفل التخطيط المسائي، ومؤقت تجميد النزوة (Vault). | الأسبوع 3 |
| **M4: الذكاء العاطفي والتكامل مع Gemini** | بناء نموذج مثلث الإدراك، وربط Prompt تشخيص التشويه المعرفي مع Gemini API. | الأسبوع 4 |
| **M5: تقويم الـ 52 أسبوعاً ومحاسبة النفس** | تطوير مصفوفة الـ 52 أسبوعاً، ونموذج إغلاق الجمعة (الشريك الشحيح)، وتدفقات التعافي. | الأسبوع 5 |
| **M6: اختبارات الأداء وتفعيل PWA** | تفعيل Service Workers، مراجعة تجربة الاستخدام، واختبار وضع عدم الاتصال بالكامل. | الأسبوع 6 |
