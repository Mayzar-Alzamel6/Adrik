// Supabase Edge Function "coach": deploy with
//   npx supabase functions deploy coach --project-ref eazyazzgtrblnfbvlfoo --use-api --no-verify-jwt
// (the sign-in is checked inside, see handler.ts). Secrets: GEMINI_API_KEY (required for AI), GEMINI_MODEL (optional).
import { handleCoach } from "./handler.ts";

Deno.serve((req) => handleCoach(req, { env: (name) => Deno.env.get(name), fetch }));
