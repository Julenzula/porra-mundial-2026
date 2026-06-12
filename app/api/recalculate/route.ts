import { NextRequest, NextResponse } from "next/server";
import { recalculatePorra } from "./engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = authorizeRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await recalculatePorra();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error recalculando la porra.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function authorizeRequest(request: NextRequest) {
  const configuredSecret = process.env.RECALCULATE_SECRET;
  const providedSecret =
    request.headers.get("x-recalculate-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  if (!configuredSecret && process.env.NODE_ENV === "development") return null;

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
