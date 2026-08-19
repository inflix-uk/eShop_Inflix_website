import { NextRequest, NextResponse } from "next/server";
import { getAddressFetch } from "@/lib/getAddressServer";

export async function GET(request: NextRequest) {
  const postcode = String(request.nextUrl.searchParams.get("postcode") || "")
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(postcode)) {
    return NextResponse.json(
      { addresses: [], success: false, message: "Enter a valid UK postcode" },
      { status: 400 }
    );
  }

  const result = await getAddressFetch(`/find/${encodeURIComponent(postcode)}`);

  if (!result.ok || !result.data?.addresses) {
    return NextResponse.json({
      addresses: [],
      success: false,
      message: result.status === 404 ? "Postcode not found" : "No addresses found for this postcode",
    });
  }

  return NextResponse.json({
    addresses: result.data.addresses,
    success: true,
  });
}
