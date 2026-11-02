import { NextResponse, type NextRequest } from "next/server";
import { handleLan } from "@/lib/sync/lanServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(req: NextRequest) {
  let body: unknown = null;
  if (req.method !== "GET") {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "bad body" }, { status: 400 });
    }
  }
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  let device: string | null = null;
  try {
    device = decodeURIComponent(req.headers.get("x-sync-device") ?? "") || null;
  } catch {
    /* a malformed name just shares the anonymous lockout bucket */
  }
  const res = handleLan({
    method: req.method,
    device,
    local: host === "localhost" || host === "127.0.0.1" || host === "[::1]",
    body,
  });
  return NextResponse.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;
