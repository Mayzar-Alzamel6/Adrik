# مواصفات تكامل بروتوكول INTJ-A في تطبيق الهاتف (Expo / React Native)
## Specification: INTJ-A Behavioral Operating Protocol for Adrik Mobile

- **المشروع:** تطبيق الهاتف أدرك عمرك (`adrik-mobile`)
- **الإصدار المستهدف:** Personal Build (حزمة APK مخصصة للهاتف عبر Expo / EAS)
- **الحالة:** بانتظار الاعتماد (Pending Human Approval)

---

## 1. الهدف (Objective)

نقل بروتوكول التشغيل السلوكي لشخصية **INTJ-A** من لوحة التحكم المكتبية إلى تطبيق الهاتف بنظام Expo / React Native، بحيث يمتلك المستخدم نفس الانضباط الذهني والتنفيذي على الهاتف:
1. **الكتل الثلاث الثابتة (3 Fixed Blocks):**
   - كتلة عميقة (90 دقيقة)
   - كتلة تكتيكية (60 دقيقة)
   - كتلة صيانة (45 دقيقة)
   - مؤقت تنازلي حي بالثواني مع إمكانية البدء والإيقاف والإنجاز أو الفشل.
2. **عقد ما قبل الانطلاق (Preflight Contract):**
   - حقل مخرج التسليم (Deliverable).
   - شرط الإنجاز الثنائي الصارم (Done When).
   - حظر الاستطراد والتوسع (Out of Scope).
3. **سلة الأفكار والمشتتات (Distraction Parking Lot):**
   - تفريغ فوري للأفكار الطارئة لحماية التركيز، مع إمكانية الحذف أو التحويل.
4. **نافذة فحص الأعطال في دقيقتين (2-Min RCA Triage):**
   - تشخيص فوري للأعطال السلوكية (Bug A: متلازمة الأرانب، Bug B: الشلل التحليلي، Bug C: استنزاف الطاقة) مع الترقيع الفوري.
5. **بناء حزمة التحديث (EAS Build):**
   - تجهيز حزمة APK شخصية عبر Expo EAS (`eas build --profile personal --platform android`) مع الحفاظ على التوقيع ومزامنة البيانات.

---

## 2. الافتراضات الصريحة (Surfaced Assumptions)

1. تطبيق الهاتف مبني باستخدام Expo SDK 57 و React Native 0.86.3 و TypeScript.
2. متجر الحالة لبروتوكول INTJ سيكون معزولاً تماماً في `src/stores/useIntjProtocolStore.ts` ومحفوظاً محلياً عبر `@react-native-async-storage/async-storage`.
3. لا يتم المساس بمحطات اليوم الأصلية (`NEURO_GATE`, `DAY_FOCUS`, `EVENING_CLOSURE`) أو متجر `useAppStore.ts` الأصلي، بل يضاف خيار رابع في شريط المحطات باسم "بروتوكول INTJ".
4. يتم استدعاء بناء الحزمة عبر Expo EAS باستخدام الملف التكويني الحالي `eas.json` بملف التعريف `personal`.

---

## 3. حزمة التقنيات والأوامر (Tech Stack & Commands)

- **Framework:** Expo ~57.0.26 / Expo Router ~57.0.24 / React Native 0.86.3
- **State Management:** Zustand ^5.0.15 + AsyncStorage
- **Design Tokens:** `src/theme/index.ts` (نفس ألوان Adrik: brand, surface, ink, line, danger)
- **UI Primitives:** `src/components/ui/index.tsx` (Screen, Card, Txt, Row, Button, Input, Modal/Sheet)
- **Commands:**
  ```bash
  # فحص الأنواع البرمجية
  npx tsc --noEmit

  # اختبارات الوحدة
  npm test

  # فحص الجودة والتنسيق
  npx expo lint

  # إطلاق بناء حزمة أندرويد الشخصية عبر EAS
  npx eas-cli build --profile personal --platform android
  ```

---

## 4. الهيكل المعماري للملفات (Project Structure)

```text
adrik-mobile/
├── src/
│   ├── stores/
│   │   └── useIntjProtocolStore.ts       # متجر Zustand معزول مع AsyncStorage
│   ├── components/
│   │   └── today/
│   │       └── intj/
│   │           ├── FixedBlockCard.tsx    # بطاقة الكتل الثلاث مع العداد التنازلي التفاعلي
│   │           ├── PreflightContract.tsx # عقد ما قبل الانطلاق (Done When & Out of Scope)
│   │           ├── ParkingLotSection.tsx # سلة تفريغ الأفكار والمشتتات
│   │           ├── RcaTriageModal.tsx    # نافذة تشخيص الأعطال وترقيعها في دقيقتين
│   │           └── IntjProtocolStation.tsx # الحاوية التجميعية للمحطة في الهاتف
│   └── app/
│       └── (tabs)/
│           └── index.tsx                 # إضافة التبويب في Segmented وتوجيه العرض
├── tests/
│   └── intj-protocol.test.mjs            # اختبارات منطق المؤقت والعقود وسلة الأفكار
└── docs/
    └── SPEC_INTJ_MOBILE.md               # هذه المواصفة المعتمدة
```

---

## 5. أسلوب الكود والواجهات (Code Style & UI Conventions)

- استخدام المكونات القياسية من `@/components/ui` (`Screen`, `Card`, `Txt`, `Row`, `Button`, `Input`).
- استخدام الرموز من `@expo/vector-icons` (`Feather`).
- توافق كامل مع الوضع الليلي والنهاري عبر `useColors()`.
- تخطيط RTL متوافق تماماً مع اللغة العربية.
- مثال كودي لنمط المكون:
```tsx
import React from "react";
import { View } from "react-native";
import { Card, Txt, Row, Button } from "@/components/ui";
import { useColors, radius } from "@/theme";
import { useIntjProtocolStore } from "@/stores/useIntjProtocolStore";

export function MiniContractCard() {
  const c = useColors();
  const contract = useIntjProtocolStore((s) => s.contract);
  return (
    <Card tone="surface">
      <Txt variant="subtitle" weight="medium">عقد ما قبل الانطلاق</Txt>
      <Txt variant="small" color="ink2">{contract.doneWhen || "لم يُحدد شرط الإنجاز بعد"}</Txt>
    </Card>
  );
}
```

---

## 6. استراتيجية الاختبار والتحقق (Testing Strategy)

1. **Unit Tests (`tests/intj-protocol.test.mjs`):**
   - حساب الوقت المتبقي وصيغة الدقائق والثواني (MM:SS).
   - تحديث حالات الكتل الثلاث (pending, running, paused, completed, failed).
   - إضافة وحذف عناصر سلة الأفكار.
   - تسجيل إدخالات الـ RCA.
2. **Typecheck (`npx tsc --noEmit`):** خلو كامل من أي أخطاء نوعية.
3. **Regression Tests (`npm test`):** نجاح كافة الاختبارات الـ 92 الحالية دون أي كسر.
4. **Build Verification (`eas build`):** التحقق من توليد حزمة APK بنجاح للبروفايل الشخصي.

---

## 7. الحدود والضوابط (Boundaries)

- **Always (دائماً):**
  - عزل متجر حالة INTJ تماماً عن المتاجر الأخرى.
  - إبقاء المحطات الأصلية (`NEURO_GATE`, `DAY_FOCUS`, `EVENING_CLOSURE`) تعمل دون أي تغيير.
  - دعم حفظ البيانات محلياً على الهاتف بحيث لا تضيع عند إغلاق التطبيق.
- **Ask First (استشر أولاً):**
  - تغيير أي إعدادات في `app.json` أو `eas.json` بخلاف زيادة رقم الإصدار إذا لزم الأمر.
- **Never (إياك أن تفعل):**
  - كسر اختبارات الوحدة الحالية (92 اختباراً).
  - إدخال مكتبات غير متوافقة مع Expo SDK 57.

---

## 8. معايير النجاح (Success Criteria)

- [ ] ظهور تبويب "بروتوكول INTJ" كخيار رابع في شاشة اليوم على الهاتف.
- [ ] إمكانية إدخال عقد المهمة (المخرج، شرط الإنجاز الثنائي، ما هو خارج النطاق).
- [ ] عمل المؤقت التنازلي للكتل الثلاث (90 د، 60 د، 45 د) بنقرة زر وبسلاسة.
- [ ] إمكانية تفريغ المشتتات في سلة الأفكار وحفظها على الهاتف.
- [ ] ظهور نافذة تشخيص الأعطال الفورية (RCA) عند تعثر أي كتلة.
- [ ] نجاح فحص الأنواع (`npx tsc --noEmit`) واختبارات المشروع بالكامل.
- [ ] إطلاق عملية البناء عبر Expo EAS وإنتاج ملف التحديث (APK).

---

## 9. الأسئلة المفتوحة (Open Questions)

- هل تفضل أن يبدأ بناء الحزمة على سحابة Expo (EAS Cloud) فور اكتمال البرمجة والاختبار؟ (حساب EAS مسجل ومربوط بالفعل باسم `adraak`).
