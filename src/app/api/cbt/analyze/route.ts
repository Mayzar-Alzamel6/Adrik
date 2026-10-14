import { NextRequest, NextResponse } from "next/server";
import { AI_RISK_INSTRUCTION, isCrisis, readAiReply, type CbtReply } from "@/lib/safety/analysis";

interface CbtRequest {
  event: string;
  automaticThought: string;
  emotion: string;
  bodyLocation?: string;
  actionTendency?: string;
  /** True only after the person agreed to send their text to Gemini; anything else means local analysis. */
  useAI?: boolean;
}

/** Every answer is a CbtReply (lib/safety/analysis): a crisis carries no analysis at all. */
const reply = (r: CbtReply) => NextResponse.json(r);

const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

/** Lets the tool know whether to ask for AI consent at all. Never reveals the key. */
export async function GET() {
  return NextResponse.json({ aiAvailable: hasGeminiKey() });
}

const MAX_FIELD_LENGTH = 2000;

// Fold spelling variants (tashkeel, tanween, hamza forms, ta marbuta / alef maqsura)
// so that "دائما" and "دائماً" or "انا فاشل" and "أنا فاشل" match the same keywords.
const normalizeArabic = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

export async function POST(req: NextRequest) {
  let body: CbtRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const clip = (v?: string) => (typeof v === "string" ? v.slice(0, MAX_FIELD_LENGTH) : v);
    const event = clip(body.event) ?? "";
    const automaticThought = clip(body.automaticThought) ?? "";
    const emotion = clip(body.emotion) ?? "";
    const bodyLocation = clip(body.bodyLocation);
    const actionTendency = clip(body.actionTendency);

    if (!automaticThought.trim()) {
      return NextResponse.json(
        { error: "Automatic thought is required" },
        { status: 400 }
      );
    }

    // 0. Safety first: the local detector runs before anything is sent anywhere, in both modes.
    if (isCrisis({ event, automaticThought, emotion, bodyLocation, actionTendency })) {
      return reply({ risk: true, source: "local" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Gemini, only when the key is configured AND the person agreed to it
    if (body.useAI === true && apiKey && apiKey.trim() !== "") {
      try {
        const systemPrompt = `أنت مهندس نظم أول ومصحح خوارزمي (Senior Systems Architect & Algorithmic Debugger) متخصص في تفكيك أنماط التفكير لنمط INTJ-A ومنهجية «أدرك عمرك».
المستخدم يمر بتعثر تشغيلي أو انفعالي في يومه. مهمتك الهندسية هي فحص المدخلات وتحديد العطل المنطقي بدقة وتطبيق الترقيع البرمجي الفوري.

القواعد الصارمة:
1. صياغة التعثر كعطل منطقي (Logical Bug / Cognitive Glitch) مع تحديد السطر الفكري المعطوب بدقة.
2. استبدال التشوه المعرفي بترقيع تنفيذي منطقي ومجرد (Executable Patch / Actionable Logic) يستند للحقائق والبيانات دون أي مواساة شكلية أو عبارات تعاطف إنشائية.
3. الخطوة التالية (nextSmallAction) يجب أن تكون الخطوة الإجرائية الفيزيائية المباشرة (The Next Physical Action) التي تستغرق من دقيقة إلى 3 دقائق لاستئناف التدفق.
4. استخدم العربية السليمة الرصينة والمصطلحات الهندسية الدقيقة.

${AI_RISK_INSTRUCTION}

قم بالرد بصيغة JSON حصراً على هذا النحو دون أي نصوص إضافية:
{
  "risk": false,
  "distortionType": "العطل المنطقي (Logical Bug): تحديد الخلل والسطر المعطوب في الفكرة",
  "reframedThought": "الترقيع التنفيذي (Executable Patch): المنطق الموضوعي المجرد الذي يعيد الاستقرار للنظام",
  "nextSmallAction": "الخطوة الإجرائية الفيزيائية التالية مباشرة (دقيقة إلى 3 دقائق)"
}`;

        const userPrompt = `الموقف: ${event}
الفكرة التلقائية: ${automaticThought}
الشعور وموضعه في الجسد: ${emotion} (${bodyLocation || "غير محدد"})
السلوك أو الرغبة الناتجة: ${actionTendency || "تسويف / هروب"}`;

        const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
              },
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (contentText && typeof contentText === "string") {
            const cleanText = contentText.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
            // Second safety layer: Gemini's own risk judgement (anything but an explicit false is a crisis).
            const aiReply = readAiReply(JSON.parse(cleanText));
            if (aiReply) return reply(aiReply);
            console.warn("Gemini reply was missing fields; falling back to behavioral engine");
          }
        } else {
          console.warn(
            `Gemini API returned HTTP ${response.status}; falling back to behavioral engine`
          );
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to behavioral engine:", geminiError);
      }
    }

    // 2. Behavioral Fallback Engine (Runs reliably offline / without API key)
    const thoughtNormalized = normalizeArabic(automaticThought);
    const has = (keyword: string) => thoughtNormalized.includes(normalizeArabic(keyword));
    let distortionType = "التفكير القطبي (الكل أو لا شيء)";
    let reframedThought = "التعثر المؤقت ليس فشلاً شاملاً؛ النتيجة التراكمية تُبنى بالاستئناف السريع وليس بالبدايات الخالية من الأخطاء.";
    let nextSmallAction = "إتمام خطوة واحدة فقط لمدة دقيقتين (مثال: فتح الملف أو قراءة فقرة واحدة).";

    if (
      has("كارثة") ||
      has("ضياع") ||
      has("ضاع") ||
      has("مستحيل") ||
      has("انتهيت")
    ) {
      distortionType = "التضخيم والتهويل الكارثي";
      reframedThought = "الموقف الحالي غير مريح ومربك، لكنه ليس نهاية المطاف. دماغك يبالغ في استشعار الخطر بينما الواقع يمكن معالجته خطوة بخطوة.";
      nextSmallAction = "خذ 3 أنفاس عميقة واكتب أصغر مهمة ممكنة في سطر واحد ثم باشرها فوراً.";
    } else if (
      has("دائماً") ||
      has("أبداً") ||
      has("كل مرة") ||
      has("عاداتي")
    ) {
      distortionType = "التعميم المفرط";
      reframedThought = "حقيقة أنك تعثرت في هذه اللحظة لا تعني أنك تتعثر 'دائماً'. هذا حدث منفصل، ولديك اليوم فرصة جديدة للاختيار السليم.";
      nextSmallAction = "افصل هذا الموقف عن ماضيك وابدأ في كتلة عمل مصغرة مدتها 15 دقيقة فقط.";
    } else if (
      has("أنا فاشل") ||
      has("ذنبي") ||
      has("أنا السبب") ||
      has("لا أستحق")
    ) {
      distortionType = "الشخصنة وجلد الذات";
      reframedThought = "أنت كائن بشري يواجه تحديات بيئية وعصبية طبيعية؛ سلوكك اللحظي لا يُعرّف قيمتك الذاتية ولا هويتك كمهني أو كمتعلم.";
      nextSmallAction = "ذكّر نفسك بقيمتك النواة وأكمل دقيقة عمل واحدة فقط الآن.";
    } else if (
      has("أشعر") ||
      has("حاسس") ||
      has("مزاجي") ||
      has("لست في المود")
    ) {
      distortionType = "الاستدلال الانفعالي";
      reframedThought = "المشاعر مؤشرات كيميائية عابرة وليست حقائق مطلقة؛ السلوك هو ما يقود الشعور وليس العكس، والبدء بالحركة يغير المزاج تدريجياً.";
      nextSmallAction = "قف وغيّر وضعية جسدك، وابدأ العمل الفعلي دون انتظار أن تصبح متحمساً.";
    }

    return reply({ risk: false, engine: "local", distortionType, reframedThought, nextSmallAction });
  } catch (error) {
    console.error("CBT API route error:", error);
    return NextResponse.json(
      { error: "Failed to analyze cognitive distortion" },
      { status: 500 }
    );
  }
}
