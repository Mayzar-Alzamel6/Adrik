# قائمة المهام التنفيذية (Task List: INTJ-A Core System Unification)

## Phase 1: الأساس والمتجر والأولويات (Foundation & Priorities Governance)

### Task 1: تحديث واجهات TypeScript ومخطط متجر Zustand المركزي (`core-types-and-store`)
* **الوصف:** توسيع واجهات `PriorityItem` و `VaultItem` وإضافة أنواع `EnergyTaxonomy` و `ArchitectVaultItem` و `RerouteEvent` و `AuditMetrics` في متجر التطبيق المركزي `useAppStore.ts` أو الأنواع المشتركة، مع ضمان الحفظ المتوافق خلفياً في `localStorage`.
* **Acceptance Criteria:**
  - [x] تعريف نوع `EnergyTaxonomy = 'genius' | 'drain' | 'neutral'`.
  - [x] إضافة حقول `definitionOfDone` و `energyTag` و `isRerouted` و `isDropped` و `dropReason` في `PriorityItem` (اختيارية لتجنب كسر البيانات القديمة).
  - [x] إضافة نوع وحالة `ArchitectVaultItem` مع قفل 48 ساعة وسجل `RerouteEvent`.
  - [x] تحديث دوال المتجر لإدارة هذه الحقول بنظافة.
* **Verification:**
  - [x] تدقيق TypeScript يمر بنجاح: `npx tsc --noEmit`.
* **Dependencies:** None
* **Files likely touched:**
  - `src/stores/useAppStore.ts`
  - `src/types/index.ts` (إن وجد)
* **Estimated Scope:** S (1-2 files)

---

### Task 2: حوكمة الأولويات الثلاث: DoD، قفل الطاقة، بوابة الإتقان، والإلغاء الواعي (`priorities-and-governance`)
* **الوصف:** تحديث مكون `PrioritiesCard.tsx` لإلزامية إدخال معيار الاكتمال `definitionOfDone`، وإضافة خيارات وسم الطاقة (`Genius` / `Drain`)، وفرض قفل برمجي يمنع اختيار أكثر من ضفدع `drain` واحد يومياً، وإضافة خيار [إلغاء واعٍ / تفويض]، وإظهار بوابة تأكيد الإتقان (`Mastery Confirmation Gate`) قبل شطب أي مهمة.
* **Acceptance Criteria:**
  - [x] حقل إدخال إلزامي لـ `definitionOfDone` لكل ضفدع نشط.
  - [x] وسم طاقة لكل مهمة مع منع تفعيل أكثر من مهمة واحدة موسومة كـ `drain` وإظهار تنبيه توعوي لحماية الطاقة الإدراكية.
  - [x] بوابة تأكيد عند النقر على إتمام المهمة: تطلب تأكيد استيفاء معيار الـ DoD بنسبة 100%.
  - [x] زر [إلغاء واعٍ / تفويض] لإسقاط المهام غير المجدية رسمياً دون ذنب.
* **Verification:**
  - [x] لا أخطاء في الـ TypeScript.
  - [x] التحقق من منع اختيار مهمتين `drain` معاً.
* **Dependencies:** Task 1
* **Files likely touched:**
  - `src/components/today/PrioritiesCard.tsx`
* **Estimated Scope:** M (1-2 files)

---

### 🛑 Checkpoint 1: التحقق من الأساس وحوكمة الأولويات
- [x] واجهات الأنواع مكتملة وصحيحة.
- [x] مكون الأولويات يعمل بالقواعد الصارمة ويمتثل لمعايير الجودة وقفل الطاقة.
- [x] التطبيق يمر من تدقيق الأنواع (`npx tsc --noEmit`).

---

## Phase 2: المرونة والتركيز الموحد (Agile Reroute & Focus RCA)

### Task 3: بناء معالج التعديل الطارئ الخوارزمي (`AgileRerouteModal.tsx`)
* **الوصف:** إنشاء نافذة منبثقة سريعة (30 ثانية) تستوعب الحوادث والظروف الطارئة دون كسر الخطة أو تصفير العدادات، تطلب (وصف العارض، الساعات المقتطعة، وتوجيه التعويض للـ Buffer)، وتضع شارة [مسار مُعاد تكييفه 🔄] على أولويات اليوم.
* **Acceptance Criteria:**
  - [x] زر واضح في شريط الأولويات اليومية [تعديل مسار طارئ / Agile Reroute].
  - [x] معالج سريع بـ 3 مدخلات فقط يسجل الحدث في `rerouteHistory`.
  - [x] إعادة تكييف مؤقتات اليوم بنعومة دون تسجيل فشل.
* **Verification:**
  - [x] تشغيل النموذج واختبار تسجيل حدث إعادة التوجيه وحفظه.
* **Dependencies:** Task 2
* **Files likely touched:**
  - `src/components/today/AgileRerouteModal.tsx` (جديد)
  - `src/components/today/PrioritiesCard.tsx`
* **Estimated Scope:** S (2 files)

---

### Task 4: دمج كتل التركيز والـ RCA في `FocusCard.tsx` وإلغاء التبويب المنفصل من `TodayView.tsx`
* **الوصف:** دمج نظام كتل التركيز الثلاث (90m للضفدع الأساسي، 60m للثانوي، 45m للإغلاق) وعقد الانطلاق السريع (Done When + Out of Scope) ونافذة تشخيص الأعطال في دقيقتين (2-Min RCA Triage) مباشرة داخل `FocusCard.tsx`، وإلغاء خيار التبويب الرابع المعزول من شريط محطات `TodayView.tsx`.
* **Acceptance Criteria:**
  - [x] ظهور خيارات الكتل الثلاث (90m / 60m / 45m) في محطة التركيز الرئيسية.
  - [x] ظهور نافذة تشخيص الأعطال (Bug A / Bug B / Bug C) بزر مباشر عند تعثر أي كتلة زمنية مع الترقيع الفوري.
  - [x] إزالة تبويب "بروتوكول INTJ" المزدوج من شريط محطات `TodayView.tsx`، ليصبح هذا التدفق هو الأصل الافتراضي لليوم.
* **Verification:**
  - [x] التحقق من عمل المؤقت وعقد الانطلاق والـ RCA بسلاسة داخل بطاقة التركيز.
  - [x] خلو شريط محطات `TodayView` من التبويب المزدوج الزائد.
* **Dependencies:** Task 1, Task 2
* **Files likely touched:**
  - `src/components/today/FocusCard.tsx`
  - `src/components/today/TodayView.tsx`
* **Estimated Scope:** M (2-3 files)

---

### 🛑 Checkpoint 2: اكتمال التدفق اليومي الموحد ومرونة الطوارئ
- [x] دورة اليوم (الصباح والتركيز) تعمل كوحدة متكاملة واحدة وفق مواصفات INTJ-A.
- [x] معالج الطوارئ الخوارزمي يعمل ويوثق التعديلات.
- [x] التطبيق يبني بسلاسة بدون أخطاء.

---

## Phase 3: الأدوات الإدراكية ومستودع الأفكار (Cognitive Tools & Architect Vault)

### Task 5: بناء مسار «مستودع الأفكار المعمارية» وقفل الـ 48 ساعة في `DelayVaultModal.tsx`
* **الوصف:** إضافة تبويب ثالث مخصص باسم `Architect Sandbox` داخل صندوق تجميد النزوات (`DelayVaultModal.tsx`)، يفرض الحقول الثلاثة (المشكلة الحقيقية، الآلية المختصرة، وعائد الاستثمار ROI)، مع قفل تجميد تلقائي لمدة 48 ساعة لمنع التشتت والهروب لمشاريع جانبية غير مجدولة.
* **Acceptance Criteria:**
  - [x] تبويب `Architect Sandbox` نشط داخل صندوق النزوات.
  - [x] نموذج إدخال صارم يلزم بتحديد المشكلة والآلية وحساب الـ ROI.
  - [x] قفل زمني 48 ساعة مع عداد تنازلي وشارة توعوية واضحة.
* **Verification:**
  - [x] اختبار إيداع فكرة وتأكيد ظهور القفل الزمني وتخزينها في المتجر.
* **Dependencies:** Task 1
* **Files likely touched:**
  - `src/components/vault/DelayVaultModal.tsx`
* **Estimated Scope:** S (1-2 files)

---

### Task 6: ضبط موجه الذكاء الاصطناعي لنبرة مهندس النظم وتصحيح الأعطال في `coach.ts`
* **الوصف:** تحديث System Prompt المسؤول عن استدعاء الذكاء الاصطناعي في تفكيك المشاعر والتعثر المعرفي؛ ليتبنى شخصية `Senior Systems Architect & Algorithmic Debugger`، مع صياغة المشاكل النفسية كأعطال منطقية (`Logical Bugs`) واستبدالها بحلول تنفيذية مجردة (`Executable Patches`) دون أي مواساة شكلية.
* **Acceptance Criteria:**
  - [x] تحديث موجه النظام في `src/lib/ai/coach.ts` ومثلث الإدراك.
  - [x] توجيه الذكاء الاصطناعي لاستخراج "السطر البرمجي المشوه فكرياً" وتقديم "الترقيع التنفيذي المباشر".
* **Verification:**
  - [x] مراجعة نص الموجه والتأكد من صرامته وتوافقه مع معايير الـ prompt engineering.
* **Dependencies:** None
* **Files likely touched:**
  - `src/lib/ai/coach.ts`
  - `src/components/cbt/CbtTriangleModal.tsx` (إن لزم لتكييف الواجهة)
* **Estimated Scope:** S (1-2 files)

---

### 🛑 Checkpoint 3: تحييد النزوات وانضباط الموجه الذكي
- [x] مستودع الأفكار المعمارية يحمي التركيز بقفل 48 ساعة.
- [x] الموجه الذكي يعمل بنبرة تصحيح خوارزمية جافة تناسب النمط العقلي.
- [x] فحص TypeScript سليم.

---

## Phase 4: المراجعة والقياس والاعتماد النهائي (Audit, Metrics & Build Verification)

### Task 7: فحص الجودة المسائي ومؤشرا الرافعة والتوازن الطاقي في مراجعة الجمعة
* **الوصف:** إضافة سؤال فحص الجودة الثنائي (0 أو 1) في محطة المساء (`EveningClosure.tsx`)، وحساب مؤشر سرعة الرافعة العالية (`High-Leverage Velocity`) ومؤشر التوازن الطاقي (`Energy Flow Index`) في مراجعة الجمعة (`CompletionPanel.tsx` / `ValueWeekPanel.tsx`).
* **Acceptance Criteria:**
  - [x] سؤال فحص الجودة المسائي حاضر ويؤكد الإتقان الحقيقي مقابل الشطب السريع.
  - [x] حساب نسبة مهام الرافعة العالية مقارنة بإجمالي المهام اليومية في تقرير الأسبوع.
  - [x] حساب نسبة مهام العبقرية الفطرية (`Zone of Genius`) مقابل مهام الاستنزاف (`Drain`) لإطلاق تنبيه مبكر إذا تجاوز الاستنزاف الحد الآمن.
* **Verification:**
  - [x] تجربة إنهاء المساء ورؤية المؤشرات في لوحة المراجعة الأسبوعية.
* **Dependencies:** Task 1, Task 2
* **Files likely touched:**
  - `src/components/stations/EveningClosure.tsx`
  - `src/components/review/CompletionPanel.tsx`
* **Estimated Scope:** M (2 files)

---

### Task 8: التحقق الشامل واجتياز بناء الإنتاج (`npm run build`)
* **الوصف:** إجراء اختبار كامل لدورة التطبيق: تهيئة الصباح ➔ كتل التركيز ➔ التعديل الطارئ ➔ صندوق النزوات ➔ المساء ➔ مراجعة الجمعة، مع تشغيل فحص البناء النهائي (`npm run build`).
* **Acceptance Criteria:**
  - [x] اجتياز `npx tsc --noEmit` بصفر أخطاء.
  - [x] اجتياز `npm run build` بنجاح وإنتاج حزم الإنتاج بسلاسة.
  - [x] استقرار كافة شاشات لوحة التحكم وتوافق التصميم مع الهوية البصرية.
* **Verification:**
  - [x] اكتمال أمر البناء بدون أي تحذيرات أو أخطاء حرجة.
* **Dependencies:** Tasks 1-7
* **Files likely touched:** —
* **Estimated Scope:** S (Verification & Test)

---

### Task 9: المراجعة الخماسية الشاملة واعتماد الكود (`code-review-and-quality`)
* **الوصف:** إجراء مراجعة الأكواد المتخصصة خماسية المحاور (الصحة، المقروئية، المعمارية، الأمان، الأداء)، ومعالجة الملاحظات، والتحقق من سلامة كافة المقاييس البرمجية.
* **Acceptance Criteria:**
  - [x] تقرير مراجعة خماسي شامل للمشروع.
  - [x] معالجة احتساب المهام المسقطة (`isDropped`) في مقاييس الإنجاز وحساب الرافعة بـ `src/lib/completion.ts`.
  - [x] توحيد دالة فحص قفل الطاقة `canActivateDrain` بين المكونات والاختبارات.
  - [x] استبدال الدالة القديمة `substr` بـ `slice` في `useVaultStore.ts`.
  - [x] إضافة 4 اختبارات وحدة تغطي حالات الإسقاط وحساب التدفق الطاقي وقفل الاستنزاف بنجاح (107/107 اختبارات ناجحة).
  - [x] اجتياز تدقيق الأنواع `npx tsc --noEmit` واجتياز بناء الإنتاج `npm run build` بنجاح تام.
* **Verification:**
  - [x] 107/107 اختبارات ناجحة، صفر أخطاء TypeScript، بناء إنتاج سليم بنسبة 100%.
* **Dependencies:** Tasks 1-8
* **Files touched:**
  - `src/lib/completion.ts`
  - `src/components/today/PrioritiesCard.tsx`
  - `src/stores/useVaultStore.ts`
  - `tests/completion.test.mjs`
* **Estimated Scope:** S (Completed)

---

### 🛑 Checkpoint 4 (Final): اكتمال ترقية النظام الموحد بالكامل والمصادقة عليه
- [x] جميع المهام الـ 9 مكتملة ومختبرة بنسبة 100%.
- [x] نظام INTJ-A يعمل بنجاح كجوهر لوحة التحكم.
- [x] تمت المراجعة البرمجية بنجاح وحصل الكود على تقييم **APPROVE**.
- [x] جاهز للإطلاق النهائي (`shipping-and-launch`).
