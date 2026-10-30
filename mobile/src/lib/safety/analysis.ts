/**
 * The order of a safe analysis, shared by the server route and every screen of the thought-reframing tool:
 * 1. local crisis check (nothing is sent anywhere if it fires),
 * 2. AI consent (asked once, only when AI is available),
 * 3. the analysis itself, AI or local,
 * 4. the AI's own risk flag, treated as a crisis too.
 * Part of the portable safety kit (see README.md): copy verbatim; the only import is the detector.
 */
import { detectCrisis } from "./crisis-detector";

export interface ThoughtFields {
  event?: string;
  automaticThought: string;
  emotion?: string;
  bodyLocation?: string;
  actionTendency?: string;
}

export interface Reframe {
  distortionType: string;
  reframedThought: string;
  nextSmallAction: string;
  engine?: "ai" | "local";
}

/** What the analysis answers: a crisis carries no analysis at all. */
export type CbtReply = { risk: true; source: "local" | "ai" } | ({ risk: false } & Reframe);

export type AiConsent = "ai" | "local";

export const isCrisis = (f: ThoughtFields) =>
  detectCrisis(f.event, f.automaticThought, f.emotion, f.bodyLocation, f.actionTendency).risk;

/** Added to the AI instructions so every reply carries a risk judgement before any analysis. */
export const AI_RISK_INSTRUCTION = `قبل أي تحليل: قيّم إن كان في كلام المستخدم أي إشارة إلى التفكير في الانتحار أو إيذاء النفس أو يأس شديد من الحياة، ولو بشكل غير مباشر أو بلهجة عامية.
إن وُجدت إشارة كهذه أو شككت فيها، فاجعل "risk" تساوي true واترك باقي الحقول نصوصاً فارغة، ولا تحلل الفكرة ولا تعِد صياغتها.
وإلا فاجعل "risk" تساوي false وأكمل التحليل.`;

/**
 * Reads the AI's JSON reply. Anything but an explicit `risk: false` counts as a crisis;
 * null means the reply is unusable and the caller should fall back to the local engine.
 */
export function readAiReply(parsed: unknown): CbtReply | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (p.risk !== false) return { risk: true, source: "ai" };
  const { distortionType, reframedThought, nextSmallAction } = p;
  if (typeof distortionType !== "string" || typeof reframedThought !== "string" || typeof nextSmallAction !== "string") return null;
  if (!distortionType || !reframedThought || !nextSmallAction) return null;
  return { risk: false, engine: "ai", distortionType, reframedThought, nextSmallAction };
}

export type AnalysisOutcome =
  | { kind: "crisis" }
  | { kind: "needs-consent" }
  | { kind: "result"; result: Reframe };

/**
 * One analysis, in the safe order. Platform pieces are passed in:
 * - consent: the saved choice (null = not asked yet),
 * - aiAvailable: whether AI exists at all here (the phone passes () => false),
 * - analyze: runs the analysis; throws on network failure.
 * On "needs-consent", ask, save the answer, and call again with it.
 */
export async function analyzeSafely(
  fields: ThoughtFields,
  deps: { consent: AiConsent | null; aiAvailable: () => Promise<boolean> | boolean; analyze: (useAI: boolean) => Promise<CbtReply> }
): Promise<AnalysisOutcome> {
  if (isCrisis(fields)) return { kind: "crisis" };
  if (deps.consent === null && (await deps.aiAvailable())) return { kind: "needs-consent" };
  const reply = await deps.analyze(deps.consent === "ai");
  if (reply.risk) return { kind: "crisis" };
  const { distortionType, reframedThought, nextSmallAction, engine } = reply;
  return { kind: "result", result: { distortionType, reframedThought, nextSmallAction, engine } };
}
