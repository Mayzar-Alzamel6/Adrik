# وثيقة المواصفات الفنية: توحيد المنظومة المعمارية لـ INTJ-A في تطبيق الهاتف (Expo / React Native)
## Technical Specification: INTJ-A Core System Unification for Adrik Mobile

- **المشروع:** `adrik-mobile` (تطبيق الهاتف المحمول بنظام Expo / React Native)
- **الإصدار المستهدف:** Personal Production Build (APK عبر Expo EAS)
- **الحالة:** بانتظار الاعتماد البشري (Pending Human Review & Approval)
- **المرجعية:** وثيقة النية المعمارية `intj a system.md` ومواصفة لوحة التحكم `SPEC_INTJ_A_CORE_SYSTEM.md`

---

## 1. الهدف (Objective)

ترقية وتوحيد المنظومة التشغيلية والسلوكية لتطبيق الهاتف المحمول [`adrik-mobile`](file:///d:/all%20projeckts/growth%20methodologi/adrik-mobile) ليتطابق بنيوياً ومعمارياً مع النسخة الموحدة في [`adrik-personal`](file:///d:/all%20projeckts/growth%20methodologi/adrik-personal)، بحيث تصبح لوحة تحكم الهاتف مجسدة لنمط **INTJ-A** (المهندس المعماري الحازم) كـ **جوهر رئيسي افتراضي** لكافة شاشات التطبيق:
1. **حوكمة الأولويات الصارمة:** إلزامية شرط الاكتمال النوعي (`definitionOfDone`)، تصنيف الطاقة (`EnergyTaxonomy`)، قفل برمجي يمنع اختيار أكثر من ضفدع مستنزف واحد (`drain`) يومياً، بوابة تأكيد الإتقان (`Mastery Confirmation Gate`) قبل شطب أي مهمة، وخيار الإسقاط الواعي (`Kill/Outsource`).
2. **التعديل الطارئ الخوارزمي (`Agile Reroute`):** نافذة سريعة (30 ثانية) على الهاتف لاقتطاع وقت العوارض وتوجيه التعويض للـ Buffer المعتمد دون كسر الخطة.
3. **كتل التركيز وتشخيص الأعطال:** كتل معمارية ثابتة (90m, 60m, 45m)، عقد الانطلاق (Done When + Out of Scope)، تشخيص الأعطال في دقيقتين (2-Min RCA)، وبوابة الإتقان في بطاقة التركيز.
4. **إزالة الازدواجية والتشتت:** حذف التبويب الرابع المعزول لبروتوكول INTJ، لتعود محطات اليوم الثلاث (الصباح، التركيز، المساء) بنظام معماري موحد.
5. **مستودع الأفكار المعمارية (`Architect Sandbox`):** قفل تجميد 48 ساعة للأفكار المعمارية في صندوق النزوات مع الحقول الثلاثة الإلزامية.
6. **ضبط نبرة الموجه الذكي:** مهندس نظم خوارزمي ومصحح أعطال منطقية (`Logical Bugs ➔ Executable Patches`).
7. **الرقابة والقياس الأسبوعي:** فحص الجودة المسائي الثنائي (0 أو 1)، وحساب مؤشر الرافعة العالية (Velocity) والتوازن الطاقي في تقرير الأسبوع.
8. **التحقق والبناء السحابي:** اجتياز تدقيق الأنواع واختبارات الوحدة وإطلاق بناء حزمة أندرويد عبر Expo EAS.

---

## 2. الافتراضات الصريحة (Surfaced Assumptions)

1. **البيئة التقنية:** التطبيق يعمل على Expo SDK 57 و React Native 0.86.3 و React 19.2.3 بنظام توجيه Expo Router (في `src/app`).
2. **التخزين المحلي المستمر:** يتم حفظ البيانات محلياً عبر `@react-native-async-storage/async-storage` مع الحفاظ على التوافق الخلفي للبيانات المخزنة دون الحاجة لمسح بيانات المستخدم.
3. **الهوية البصرية:** استخدام مكونات وتوكنات التصميم الحالية في `@/theme` و `@/components/ui` مع دعم كامل للغة العربية والاتجاه من اليمين لليسار (RTL) واستجابة لمسية (Haptics).
4. **البناء والتوزيع:** استخدام ملف تكوين `eas.json` الحالي بالملف الشخصي `personal` لبناء وتوليد حزمة APK عبر `npx eas-cli build`.

---

## 3. حزمة التقنيات والأوامر (Tech Stack & Commands)

- **Framework:** Expo ~57.0.26 / Expo Router ~57.0.24 / React Native 0.86.3
- **State Management:** Zustand ^5.0.15 + AsyncStorage
- **Haptics & Audio:** `expo-haptics`, `expo-audio`
- **Commands:**
  ```bash
  # فحص الأنواع البرمجية
  npx tsc --noEmit

  # اختبارات الوحدة الآلية
  npm test

  # فحص التنسيق والجودة
  npx expo lint

  # إطلاق بناء حزمة الهاتف عبر Expo EAS
  npx eas-cli build --profile personal --platform android
  ```

---

## 4. خريطة القدرات المعمارية (Capability Map)

| معرف الوحدة (Module ID) | المسؤولية المعمارية | التبعيات |
| :--- | :--- | :---: |
| `mobile-core-types-and-store` | توسيع مخططات Zustand (`useAppStore`, `useVaultStore`) وإضافة حقول الطاقة والـ DoD والطوارئ وجودة المساء. | — |
| `mobile-priorities-governance` | تحديث `PrioritiesCard.tsx` بـ DoD الإلزامي، قفل الطاقة، بوابة الإتقان، والإسقاط الواعي. | `mobile-core-types-and-store` |
| `mobile-agile-reroute` | بناء `AgileRerouteModal.tsx` للتعامل السريع مع الطوارئ وإعادة التوجيه للـ Buffer. | `mobile-priorities-governance` |
| `mobile-focus-and-rca` | دمج الكتل (90/60/45)، عقد الانطلاق، RCA، وبوابة الإتقان في `FocusCard.tsx` وإلغاء التبويب المنفصل من `index.tsx`. | `mobile-core-types-and-store` |
| `mobile-architect-vault` | تحديث `VaultTool.tsx` بتبويب `Architect Sandbox` بـ 3 حقول إلزامية وقفل 48 ساعة. | `mobile-core-types-and-store` |
| `mobile-coach-tuning` | ضبط موجه النظام في `src/lib/ai/coach.ts` لنبرة مهندس النظم وتصحيح الأعطال المنطقية. | — |
| `mobile-audit-and-metrics` | إضافة فحص الجودة في `EveningClosure.tsx` وحساب مؤشرات الرافعة والطاقة في `CompletionPanel.tsx` و `completion.ts`. | `mobile-core-types-and-store` |
| `mobile-build-and-eas` | التحقق الشامل من الجودة (Types, Tests, Lint) وإطلاق بناء حزمة الـ APK عبر Expo EAS. | كافة الوحدات |

---

## 5. المواصفات التفصيلية للوحدات (Detailed Module Specifications)

### Module 1: `mobile-core-types-and-store`
- في `src/stores/useAppStore.ts`:
  - تعريف نوع `EnergyTaxonomy = 'genius' | 'drain' | 'neutral'`.
  - إضافة حقول `definitionOfDone?: string; energyTag?: EnergyTaxonomy; isRerouted?: boolean; isDropped?: boolean; dropReason?: string;` في `FrogTask` و `FrogDayRecord`.
  - تحديث `rolloverIfNewDay()` لترحيل وحفظ كافة حقول INTJ في `closedDay.frogs` دون فقدان تاريخي.
  - إضافة سجل `RerouteEvent`، ودالة `addRerouteEvent`.
  - إضافة حالة `eveningQualityCheck: Record<string, boolean>` ودالة `setEveningQualityCheck`.
- في `src/stores/useVaultStore.ts`:
  - دعم قفل 48 ساعة وحقول `itemType?: 'impulse' | 'architect'`, `realProblem`, `mechanism`, `roiReason`.
  - إضافة دالة `addArchitectVaultItem`.

### Module 2: `mobile-priorities-governance`
- في `src/components/today/PrioritiesCard.tsx`:
  - حقل إدخال إلزامي لـ `definitionOfDone` لكل ضفدع نشط.
  - وسم الطاقة لكل مهمة مع منع برمجي واهتزاز تحذيري (Haptics) عند محاولة اختيار أكثر من مهمة `drain` واحدة.
  - فحص القفل الطاقي عند محاولة إعادة فتح مهمة مستنزفة مغلقة.
  - بوابة تأكيد الإتقان (`Mastery Gate Sheet`) تطلب التحقق من شرط الاكتمال بنسبة 100% وزر تأكيد معطل عند فراغ الحقل.
  - زر الإلغاء الواعي (`Kill / Outsource`) مع تصفير `activeFrogId` وإعادة حالة مهمة المشروع المتصلة لـ `TODO`.

### Module 3: `mobile-agile-reroute`
- إنشاء مكون `src/components/today/AgileRerouteModal.tsx`:
  - شيت منبثق سريع مصمم للهاتف بـ 3 أسئلة: (1) ما العارض الطارئ؟ (2) الساعات المقتطعة (1-4 س) (3) توجيه التعويض (Buffer الليلة أو الغد).
  - حفظ الحدث في المتجر دون تصفير المؤقتات أو تسجيل فشل.

### Module 4: `mobile-focus-and-rca`
- في `src/components/today/FocusCard.tsx`:
  - دمج خيارات الكتل الثلاث (كتلة 1: 90 دقيقة، كتلة 2: 60 دقيقة، كتلة 3: 45 دقيقة).
  - عقد الانطلاق السريع (Done When + Out of Scope) يملأ تلقائياً من شرط الـ DoD.
  - زر ونافذة تشخيص الأعطال في دقيقتين (RCA Triage) مع الترقيع الفوري.
  - بوابة تأكيد الإتقان قبل إتمام الجلسة.
- في `src/app/(tabs)/index.tsx`:
  - إلغاء خيار `INTJ_PROTOCOL` وشريط المحطات المزدوج، ليعود شريط المحطات لثلاث محطات أصلية (`NEURO_GATE`, `DAY_FOCUS`, `EVENING_CLOSURE`).
  - إيقاف وتنظيف المكونات المعزولة في `src/components/today/intj/`.

### Module 5: `mobile-architect-vault`
- في `src/components/tools/VaultTool.tsx`:
  - إضافة تبويب `Architect Sandbox` بـ 3 حقول إلزامية: المشكلة الحقيقية، الآلية، والـ ROI.
  - قفل تجميد تلقائي لمدة 48 ساعة مع عداد تنازلي وشارة توعوية.

### Module 6: `mobile-coach-tuning`
- في `src/lib/ai/coach.ts`:
  - اعتماد شخصية `Senior Systems Architect & Algorithmic Debugger`.
  - معالجة المشاعر كأعطال منطقية (`Logical Bugs`) واستبدالها بخطوات تنفيذية مباشرة (`Executable Patches`).

### Module 7: `mobile-audit-and-metrics`
- في `src/components/today/EveningClosure.tsx`:
  - بطاقة فحص الجودة المسائي الثنائي (0 أو 1): إتقان حقيقي واستيفاء للـ DoD أم شطب سريع وتفريغ ذمة؟
- في `src/lib/completion.ts` و `src/components/review/CompletionPanel.tsx`:
  - إضافة دالة `computeIntjAuditMetrics`.
  - بطاقة مؤشرات المنظومة المعمارية: سرعة الرافعة العالية (Velocity %)، مؤشر التوازن الطاقي (Genius vs Drain)، وبوابة الجودة.
  - تنبيه استنزاف مبكر عند تجاوز نسبة الـ Drain 30%.
  - إضافة خيار "الطاقة" لشريط التصنيف.

### Module 8: `mobile-build-and-eas`
- تشغيل `npx tsc --noEmit` للتأكد من صفر أخطاء.
- كتابة اختبارات وحدة `tests/completion.test.mjs` والتأكد من نجاح `npm test` بنسبة 100%.
- تشغيل `npx expo lint`.
- تشغيل أمر البناء السحابي الشخصي عبر Expo EAS: `npx eas-cli build --profile personal --platform android`.

---

## 6. الضوابط والمعايير الحاكمة (Boundaries)

- **Always:**
  - المحافظة على سلامة بيانات `AsyncStorage` السابقة دون أي تلف.
  - الاعتماد التام على هوية Adrik البصرية ونظام الـ RTL.
  - استخدام التنبيهات اللمسية (`Haptics`) لتعزيز الإحساس ببوابات الجودة والأقفال السلوكية.
- **Ask First:**
  - تعديل تكوين `app.json` أو مفاتيح EAS المشتركة.
- **Never:**
  - استخدام مكتبات native خارجية غير مدعومة في Expo Go دون الحاجة.
  - لمس كود الويب في `adrik-personal`.

---

## 7. معايير النجاح القابلة للقياس (Success Criteria)

1. إدخال DoD إلزامي لكل أولوية في الهاتف، ومنع اختيار أكثر من مهمة `drain` واحدة برمجياً ولمسياً.
2. عمل بوابة تأكيد الإتقان قبل إنهاء أي أولوية في `PrioritiesCard` و `FocusCard`.
3. عمل معالج التعديل الطارئ الخوارزمي في 30 ثانية.
4. ظهور الكتل الثابتة وعقد الانطلاق والـ RCA في بطاقة التركيز الرئيسية، وإلغاء التبويب الرابع من الشاشة الرئيسية.
5. قفل النزوات المعمارية 48 ساعة في صندوق النزوات.
6. ظهور سؤال فحص الجودة (0 أو 1) في المساء ومؤشرات الرافعة والطاقة في المراجعة الأسبوعية.
7. اجتياز فحص TypeScript واختبارات الوحدة بصفر أخطاء.
8. نجاح بدء بناء حزمة الإنتاج عبر Expo EAS وتوثيق رابط التنزيل.

---

## 8. الأسئلة المفتوحة (Open Questions)

- هل تفضل بعد الانتهاء من فحص وتعديل الكود محلياً إطلاق بناء الحزمة على سحابة Expo EAS تلقائياً (`eas build`)، أم تفضل مراجعة التعديلات أولاً ثم إطلاق البناء بطلب منفصل؟
