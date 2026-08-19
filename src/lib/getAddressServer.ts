const GETADDRESS_BASE = "https://api.getAddress.io";

export function getAddressApiKey(): string | null {
  return process.env.GETADDRESS_API_KEY || process.env.NEXT_PUBLIC_GETADDRESS_API_KEY || null;
}

export async function getAddressFetch(path: string, search: Record<string, string> = {}) {
  const apiKey = getAddressApiKey();
  if (!apiKey) {
    return { ok: false as const, status: 503, data: null, message: "Address lookup is not configured" };
  }

  const params = new URLSearchParams(search);
  const url = `${GETADDRESS_BASE}${path}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "api-key": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data, message: response.ok ? undefined : "Address lookup failed" };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false as const,
      status: aborted ? 504 : 502,
      data: null,
      message: aborted ? "Address lookup timed out" : "Address lookup failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
