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
  const res = handleLan({ method: req.method, key: req.headers.get("x-sync-key"), host: req.headers.get("host"), body });
  return NextResponse.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;
export const PUT = run;
