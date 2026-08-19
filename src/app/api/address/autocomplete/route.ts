import { NextRequest, NextResponse } from "next/server";
import { getAddressFetch } from "@/lib/getAddressServer";

export async function GET(request: NextRequest) {
  const term = String(request.nextUrl.searchParams.get("term") || "").trim();
  const topRaw = Number(request.nextUrl.searchParams.get("top") || 6);
  const top = Number.isFinite(topRaw) ? Math.min(10, Math.max(1, Math.floor(topRaw))) : 6;

  if (term.length < 3 || term.length > 100) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await getAddressFetch(`/autocomplete/${encodeURIComponent(term)}`, {
    top: String(top),
  });

  if (!result.ok) {
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json({
    suggestions: Array.isArray(result.data?.suggestions) ? result.data.suggestions : [],
  });
}
