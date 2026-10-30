import { NextResponse, type NextRequest } from "next/server";

/**
 * The app listens on the Wi-Fi for phone sync, so the AI routes (which spend the Gemini key) answer only
 * requests addressed to this computer itself. The Host header can be faked by a determined device on the
 * network; this stops other browsers and casual calls, not an attacker. Wi-Fi sync has its own password.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return NextResponse.next();
  return NextResponse.json({ error: "متاح من الكمبيوتر نفسه فقط." }, { status: 403 });
}

export const config = { matcher: ["/api/ai/:path*", "/api/cbt/:path*"] };
