import { NextRequest, NextResponse } from "next/server";
import { getAddressFetch } from "@/lib/getAddressServer";

export async function GET(request: NextRequest) {
  const id = String(request.nextUrl.searchParams.get("id") || "").trim();

  if (!id || id.length < 4 || id.length > 200 || /[\s<>]/.test(id)) {
    return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
  }

  const result = await getAddressFetch(`/get/${encodeURIComponent(id)}`);

  if (!result.ok || !result.data) {
    return NextResponse.json({ error: result.message || "Address not found" }, { status: 404 });
  }

  return NextResponse.json(result.data);
}
