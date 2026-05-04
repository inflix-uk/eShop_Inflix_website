/**
 * Public navbar header settings (e.g. support phone) — no auth.
 */

const apiBase = (): string =>
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export const DEFAULT_HEADER_SUPPORT_PHONE = "";
export const DEFAULT_HEADER_SUPPORT_EMAIL = "";

export async function fetchNavbarHeaderPublic(): Promise<{
  supportPhone: string;
  supportEmail: string;
}> {
  const base = apiBase();
  if (!base) {
    return {
      supportPhone: DEFAULT_HEADER_SUPPORT_PHONE,
      supportEmail: DEFAULT_HEADER_SUPPORT_EMAIL,
    };
  }
  try {
    const res = await fetch(`${base}/navbar-header/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return {
        supportPhone: DEFAULT_HEADER_SUPPORT_PHONE,
        supportEmail: DEFAULT_HEADER_SUPPORT_EMAIL,
      };
    }
    const json = await res.json();
    const raw = json?.data?.supportPhone;
    const phone =
      typeof raw === "string" && raw.trim()
        ? raw.trim()
        : DEFAULT_HEADER_SUPPORT_PHONE;
    const rawEmail = json?.data?.supportEmail;
    const email =
      typeof rawEmail === "string" && rawEmail.trim()
        ? rawEmail.trim()
        : DEFAULT_HEADER_SUPPORT_EMAIL;
    return { supportPhone: phone, supportEmail: email };
  } catch {
    return {
      supportPhone: DEFAULT_HEADER_SUPPORT_PHONE,
      supportEmail: DEFAULT_HEADER_SUPPORT_EMAIL,
    };
  }
}
