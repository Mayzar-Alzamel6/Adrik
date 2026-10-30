# خطة التنفيذ: توحيد المنظومة المعمارية لـ INTJ-A في تطبيق الهاتف (Expo)
## Implementation Plan: Mobile INTJ-A Core System Unification

- **المشروع:** `adrik-mobile`
- **المواصفة المرجعية:** [`docs/SPEC_INTJ_A_MOBILE_CORE_UNIFICATION.md`](file:///d:/all%20projeckts/growth%20methodologi/adrik-mobile/docs/SPEC_INTJ_A_MOBILE_CORE_UNIFICATION.md)
- **تاريخ الخطة:** 2026-10-12
- **الحالة:** جاهزة للتنفيذ (Ready for Execution)

---

## 1. النظرة المعمارية والقرارات التصميمية (Architecture Decisions)

1. **توحيد النواة بدلاً من العزل (Core Unification over Isolation):**
   - إلغاء التبويب الرابع المعزول `INTJ_PROTOCOL` في `adrik-mobile/src/app/(tabs)/index.tsx`.
   - دمج بروتوكول INTJ-A مباشرة في تدفق بطاقات اليوم الأساسية (`PrioritiesCard` و `FocusCard` و `EveningClosure` و `CompletionPanel`) تماماً كما تم في `adrik-personal`.
2. **التوافق التام مع التخزين المحلي (`AsyncStorage`):**
   - جميع الحقول الموسعة في `useAppStore` و `useVaultStore` اختيارية (`optional`) مع قيم افتراضية متوافقة خلفياً لمنع أي تلف في بيانات الجلسات السابقة.
3. **صيانة التاريخ عند التدحرج اليومي (`Daily Rollover`):**
   - تضمين `energyTag` و `definitionOfDone` و `isRerouted` و `isDropped` و `dropReason` في `closedDay.frogs` لمنع تشوه مؤشر التوازن الطاقي في تقارير الأسبوع.
4. **حوكمة الإغلاق ومكافحة الشطب المتسرع (Zeigarnik Mitigation):**
   - بوابة تأكيد الإتقان (`Mastery Confirmation Gate`) ملزمة في كل من بطاقة الأولويات وبطاقة التركيز قبل شطب أي أولوية.
5. **استقلالية البناء ومراجعة الكود المسبقة:**
   - استكمال التنفيذ والتحقق المحلي واختبارات الوحدة ومراجعة الأكواد بالكامل وعرض التقرير على المستخدم للاعتماد قبل بدء بناء السحابة (`EAS Build`).

---

## 2. جدول المراحل والتحقق (Phased Implementation & Checkpoints)

### Phase 1: الأساس والمتجر وحوكمة الأولويات (Foundation & Priorities Governance)
- **Task 1 (`mobile-core-types-and-store`):** توسيع مخططات `useAppStore.ts` و `useVaultStore.ts`.
- **Task 2 (`mobile-priorities-governance`):** تحديث `PrioritiesCard.tsx` بـ DoD الإلزامي، قفل الطاقة (max 1 drain)، بوابة الإتقان، والإسقاط الواعي.
- 🛑 **Checkpoint 1:** فحص TypeScript يمر بنجاح `npx tsc --noEmit`.

### Phase 2: الطوارئ والتركيز الموحد (Agile Reroute & Focus RCA)
- **Task 3 (`mobile-agile-reroute`):** إنشاء `AgileRerouteModal.tsx` وربطه بشاشة الأولويات.
- **Task 4 (`mobile-focus-and-rca`):** دمج الكتل (90/60/45) وعقد الانطلاق والـ RCA وبوابة الإتقان في `FocusCard.tsx` وإلغاء التبويب المنفصل من `index.tsx`.
- 🛑 **Checkpoint 2:** استقرار التنقل في شاشة اليوم وفحص الأنواع البرمجية.

### Phase 3: الأدوات الإدراكية والرقابة (Architect Vault, AI Coach & Metrics)
- **Task 5 (`mobile-architect-vault`):** إضافة `Architect Sandbox` وقفل 48 ساعة في `VaultTool.tsx`.
- **Task 6 (`mobile-coach-tuning`):** ضبط موجه الذكاء الاصطناعي في `coach.ts` لنبرة مهندس النظم.
- **Task 7 (`mobile-audit-and-metrics`):** فحص الجودة في `EveningClosure.tsx` وحساب مؤشرات الرافعة والتوازن الطاقي في `CompletionPanel.tsx` و `completion.ts`.
- 🛑 **Checkpoint 3:** عمل دورة اليوم والمراجعة الأسبوعية كاملة.

### Phase 4: التحقق والمراجعة والاعتماد (Verification, Tests & Code Review)
- **Task 8 (`mobile-tests-and-lint`):** إضافة اختبارات `tests/completion.test.mjs` واجتياز `npm test` و `npx expo lint`.
- **Task 9 (`mobile-code-review-and-approval`):** مراجعة الأكواد الشاملة خماسية المحاور وعرضها على المستخدم للاعتماد.
- 🛑 **Checkpoint 4 (Final):** اعتماد المستخدم للكود وجاهزية إطلاق بناء الـ APK عبر Expo EAS.
