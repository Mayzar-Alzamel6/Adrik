# قائمة المهام التنفيذية: توحيد منظومة INTJ-A في تطبيق الهاتف (Expo)
## Task List: Mobile INTJ-A Core System Unification

## Phase 1: الأساس والمتاجر وحوكمة الأولويات (Foundation & Priorities Governance)

### Task 1: تحديث واجهات TypeScript ومتاجر Zustand المركزية (`mobile-core-types-and-store`)
* **الوصف:** توسيع واجهات `FrogTask` و `FrogDayRecord` و `VaultItem` وإضافة أنواع `EnergyTaxonomy` و `RerouteEvent` في `src/stores/useAppStore.ts` و `src/stores/useVaultStore.ts` مع دعم التخزين المحلي في `AsyncStorage` وصيانة حقول INTJ عند `rolloverIfNewDay`.
* **Acceptance Criteria:**
  - [x] تعريف نوع `EnergyTaxonomy = 'genius' | 'drain' | 'neutral'`.
  - [x] إضافة حقول `definitionOfDone` و `energyTag` و `isRerouted` و `isDropped` و `dropReason` في `FrogTask` و `FrogDayRecord`.
  - [x] صيانة كافة حقول INTJ أثناء التدحرج اليومي `rolloverIfNewDay` في `closedDay.frogs`.
  - [x] إضافة سجل `rerouteHistory` ودالة `addRerouteEvent`.
  - [x] إضافة حالة `eveningQualityCheck` ودالة `setEveningQualityCheck`.
  - [x] إضافة قفل 48 ساعة وحقول `Architect Sandbox` ودالة `addArchitectVaultItem` في `useVaultStore.ts`.
* **Verification:**
  - [x] فحص TypeScript يمر بنجاح: `npx tsc --noEmit`.
* **Dependencies:** None
* **Files likely touched:**
  - `src/stores/useAppStore.ts`
  - `src/stores/useVaultStore.ts`
* **Estimated Scope:** S (2 files)

---

### Task 2: حوكمة الأولويات الثلاث: DoD، قفل الطاقة، بوابة الإتقان، والإسقاط الواعي (`mobile-priorities-governance`)
* **الوصف:** تحديث `src/components/today/PrioritiesCard.tsx` لإلزامية إدخال معيار الاكتمال `definitionOfDone`، وإضافة وسم الطاقة (`Genius` / `Drain` / `Neutral`) مع منع اختيار أكثر من مهمة `drain` واحدة مع اهتزاز لمسي (Haptics)، وإضافة بوابة تأكيد الإتقان قبل شطب المهمة، وخيار الإسقاط الواعي (`Kill / Outsource`).
* **Acceptance Criteria:**
  - [x] حقل إدخال إلزامي لـ `definitionOfDone` لكل أولوية نشطة في المسودات والإضافة الفردية.
  - [x] وسم طاقة لكل مهمة مع قفل برمجي يمنع تفعيل أكثر من مهمة واحدة `drain` يومياً وتنبيه لمسي.
  - [x] فحص قفل الطاقة عند محاولة إعادة فتح مهمة مستنزفة مغلقة.
  - [x] بوابة تأكيد الإتقان (`Mastery Gate Sheet`) تطلب تأكيد الـ DoD وزر تأكيد معطل عند فراغ الحقل.
  - [x] زر [إلغاء واعٍ / تفويض] مع تصفير `activeFrogId` ومزامنة حالة مهمة المشروع المتصلة لـ `TODO`.
* **Verification:**
  - [x] فحص الأنواع بدون أخطاء.
  - [x] التحقق من منع اختيار مهمتين `drain` معاً.
* **Dependencies:** Task 1
* **Files likely touched:**
  - `src/components/today/PrioritiesCard.tsx`
* **Estimated Scope:** M (1 file)

---

### 🛑 Checkpoint 1: التحقق من الأساس وحوكمة الأولويات في الهاتف
- [x] واجهات الأنواع مكتملة وصحيحة في `useAppStore` و `useVaultStore`.
- [x] بطاقة الأولويات تعمل بالقواعد الصارمة وتفرض معيار الإتقان وقفل الطاقة.
- [x] اجتياز فحص الأنواع البرمجية (`npx tsc --noEmit`).

---

## Phase 2: المرونة والتركيز الموحد (Agile Reroute & Focus RCA)

### Task 3: بناء معالج التعديل الطارئ الخوارزمي في الهاتف (`mobile-agile-reroute`)
* **الوصف:** إنشاء مكون `src/components/today/AgileRerouteModal.tsx` كنافذة منبثقة سريعة (30 ثانية) تطلب وصف العارض، الساعات المقتطعة (1-4 س)، وتوجيه التعويض للـ Buffer، وتسجيل الحدث في `rerouteHistory` دون تسجيل فشل أو تصفير العدادات.
* **Acceptance Criteria:**
  - [x] زر [تعديل مسار طارئ / Agile Reroute] في بطاقة الأولويات.
  - [x] شيت تفاعلي متوافق مع الهاتف يسجل الحدث في `rerouteHistory`.
  - [x] إشعار المستخدم بنجاح تكييف المسار.
* **Verification:**
  - [x] فحص TypeScript سليم وبناء المكون بسلاسة.
* **Dependencies:** Task 1, Task 2
* **Files likely touched:**
  - `src/components/today/AgileRerouteModal.tsx` (جديد)
  - `src/components/today/PrioritiesCard.tsx`
* **Estimated Scope:** S (2 files)

---

### Task 4: دمج كتل التركيز وعقد الانطلاق والـ RCA في `FocusCard.tsx` وإلغاء التبويب المنفصل (`mobile-focus-and-rca`)
* **الوصف:** دمج خيارات كتل التركيز (90m, 60m, 45m) وعقد الانطلاق السريع (Done When + Out of Scope) ونافذة تشخيص الأعطال في دقيقتين (RCA Triage) وبوابة تأكيد الإتقان داخل `FocusCard.tsx`، وإلغاء خيار `INTJ_PROTOCOL` من شريط المحطات في `src/app/(tabs)/index.tsx`.
* **Acceptance Criteria:**
  - [x] ظهور خيارات الكتل الثلاث (90m / 60m / 45m) في بطاقة التركيز.
  - [x] ملء التزام الجلسة تلقائياً من شرط الـ DoD للضفدع الحالي.
  - [x] نافذة تشخيص الأعطال (Bug A / Bug B / Bug C) مع الترقيع الفوري.
  - [x] بوابة تأكيد الإتقان قبل إتمام الجلسة مباشرة من شاشة التركيز.
  - [x] إزالة تبويب `INTJ_PROTOCOL` وشريط المحطات المزدوج في `index.tsx`، والاعتماد على المحطات الثلاث الأصلية.
* **Verification:**
  - [x] خلو شاشة اليوم من التبويب المزدوج الزائد.
  - [x] اجتياز فحص `npx tsc --noEmit`.
* **Dependencies:** Task 1, Task 2
* **Files likely touched:**
  - `src/components/today/FocusCard.tsx`
  - `src/components/today/RcaTriageModal.tsx` (تحديث/نقل)
  - `src/app/(tabs)/index.tsx`
* **Estimated Scope:** M (3 files)

---

### 🛑 Checkpoint 2: التدفق اليومي الموحد ومرونة الطوارئ في الهاتف
- [x] دورة اليوم (الصباح والتركيز والأولويات) تعمل كوحدة متكاملة واحدة وفق مواصفات INTJ-A.
- [x] معالج الطوارئ الخوارزمي يعمل ويوثق التعديلات.
- [x] اجتياز فحص الأنواع `npx tsc --noEmit`.

---

## Phase 3: الأدوات الإدراكية والرقابة (Architect Vault, AI Coach & Metrics)

### Task 5: بناء مسار «مستودع الأفكار المعمارية» وقفل الـ 48 ساعة في `VaultTool.tsx` (`mobile-architect-vault`)
* **الوصف:** تحديث `src/components/tools/VaultTool.tsx` لإضافة مسار `Architect Sandbox` بـ 3 حقول إلزامية (المشكلة الحقيقية، الآلية، والـ ROI)، مع قفل تجميد تلقائي لمدة 48 ساعة وشارة توعوية واضحة.
* **Acceptance Criteria:**
  - [x] تبويب `Architect Sandbox` نشط داخل أداة المستودع في الهاتف.
  - [x] نموذج إدخال صارم يلزم بتحديد المشكلة والآلية وحساب الـ ROI.
  - [x] قفل زمني 48 ساعة مع عداد تنازلي وشارة توعوية.
* **Verification:**
  - [x] اختبار إيداع فكرة معمارية وتأكيد ظهور القفل الزمني وتخزينها في المتجر.
* **Dependencies:** Task 1
* **Files likely touched:**
  - `src/components/tools/VaultTool.tsx`
* **Estimated Scope:** S (1 file)

---

### Task 6: ضبط نبرة الموجه الذكي لنظام مهندس النظم وتصحيح الأعطال في `coach.ts` (`mobile-coach-tuning`)
* **الوصف:** تحديث System Prompt المسؤول عن استدعاء الذكاء الاصطناعي في الهاتف لتبني شخصية `Senior Systems Architect & Algorithmic Debugger`، مع صياغة المشاكل كأعطال منطقية (`Logical Bugs`) واستبدالها بحلول تنفيذية مجردة (`Executable Patches`).
* **Acceptance Criteria:**
  - [x] تحديث موجه النظام في `src/lib/ai/coach.ts`.
  - [x] توجيه الذكاء الاصطناعي لحظر التعاطف الشكلي وتقديم الترقيع التنفيذي المباشر.
* **Verification:**
  - [x] مراجعة نص الموجه والتأكد من صرامته وتوافقه مع معايير الـ prompt engineering.
* **Dependencies:** None
* **Files likely touched:**
  - `src/lib/ai/coach.ts`
* **Estimated Scope:** S (1 file)

---

### Task 7: فحص الجودة المسائي ومؤشرا الرافعة والتوازن الطاقي في المراجعة الأسبوعية (`mobile-audit-and-metrics`)
* **الوصف:** إضافة سؤال فحص الجودة الثنائي (0 أو 1) في محطة المساء (`EveningClosure.tsx`)، وحساب مؤشر سرعة الرافعة العالية (`High-Leverage Velocity`) ومؤشر التوازن الطاقي (`Energy Flow Index`) في `CompletionPanel.tsx` و `completion.ts` للهاتف.
* **Acceptance Criteria:**
  - [x] سؤال فحص الجودة المسائي حاضر ويؤكد الإتقان الحقيقي مقابل الشطب السريع.
  - [x] حساب نسبة مهام الرافعة العالية مقارنة بإجمالي المهام المنجزة في تقرير الأسبوع.
  - [x] حساب نسبة مهام العبقرية الفطرية (`Genius`) مقابل الاستنزاف (`Drain`) لإطلاق تنبيه مبكر إذا تجاوز الاستنزاف 30%.
  - [x] إضافة خيار تصنيف الطاقة ("الطاقة") في Segmented Control.
* **Verification:**
  - [x] تجربة إنهاء المساء ورؤية المؤشرات في لوحة المراجعة الأسبوعية.
* **Dependencies:** Task 1, Task 2
* **Files likely touched:**
  - `src/components/today/EveningClosure.tsx`
  - `src/components/review/CompletionPanel.tsx`
  - `src/lib/completion.ts`
* **Estimated Scope:** M (3 files)

---

### 🛑 Checkpoint 3: تحييد النزوات وانضباط المراجعة الأسبوعية
- [x] مستودع الأفكار المعمارية يحمي التركيز بقفل 48 ساعة في الهاتف.
- [x] فحص الجودة ومؤشرات الرافعة والتوازن الطاقي تعمل في المراجعة الأسبوعية.
- [x] فحص TypeScript سليم.

---

## Phase 4: التحقق الشامل ومراجعة الكود قبل البناء (Verification, Tests & Code Review)

### Task 8: اختبارات الوحدة وفحص الجودة الآلي (`mobile-tests-and-lint`)
* **الوصف:** إضافة اختبارات الوحدة `tests/completion.test.mjs` لاختبار دوال القياس الطاقي وفحص الجودة، وتشغيل `npm test` و `npx tsc --noEmit` و `npx expo lint`.
* **Acceptance Criteria:**
  - [x] اختبارات حساب مؤشر الرافعة والتوازن الطاقي وتنبيه الاستنزاف تمر بنجاح.
  - [x] اجتياز `npx tsc --noEmit` بصفر أخطاء.
  - [x] اجتياز `npm test` بنسبة 100%.
* **Verification:**
  - [x] إخراج نظيف من كافة أدوات الفحص الآلي.
* **Dependencies:** Tasks 1-7
* **Files likely touched:**
  - `tests/completion.test.mjs` (جديد)
  - `tests/ts-resolve.mjs` (إن لزم لدعم مسارات `@/`)
* **Estimated Scope:** S (2 files)

---

### Task 9: المراجعة الخماسية الشاملة وعرض التقرير للاعتماد المسبق (`mobile-code-review-and-approval`)
* **الوصف:** إجراء مراجعة الأكواد المتخصصة خماسية المحاور (الصحة، المقروئية، المعمارية، الأمان، الأداء) عبر وكيل المراجعة المستقل، وإعداد تقرير التسليم وعرضه على المستخدم لاعتماده قبل إطلاق بناء الحزمة السحابي.
* **Acceptance Criteria:**
  - [x] تقرير مراجعة شامل ومعالجة أي ملاحظات نقدية (حصول الكود على APPROVE بعد معالجة كافة النقاط).
  - [x] عرض الكود والتقرير على المستخدم بانتظار موافقته الصريحة على إطلاق البناء السحابي.
* **Verification:**
  - [x] اجتياز مراجعة الكود بنجاح تام (107/107 اختبارات ناجحة، صفر أخطاء TypeScript، وصفر أخطاء Linter).
* **Dependencies:** Tasks 1-8
* **Files likely touched:** —
* **Estimated Scope:** S (Review & Approval)

---

### 🛑 Checkpoint 4 (Final): جاهزية التطبيق الكاملة للاعتماد والبناء السحابي
- [x] كافة المهام الـ 9 مكتملة ومختبرة بنسبة 100%.
- [x] التطبيق مجرب ومستقر ومطابق لمواصفات INTJ-A ومصدّق من مراجع الكود (APPROVE).
- [x] تم اعتماد المستخدم وإطلاق بناء حزمة الـ APK بنجاح عبر Expo EAS (Build ID: e266c66a-0b86-4eb7-8b6e-2fb5e3f12eee).
- [x] مزامنة مهام المسار الزمني (Timeline Tasks) وتوحيد مخزن المشاريع بنسبة 100% مع 112 اختباراً ناجحاً.
- [ ] إطلاق بناء حزمة الـ APK الشخصية المحدثة عبر Expo EAS (`personal` profile).
