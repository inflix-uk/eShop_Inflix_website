type SuperadminPublicControls = {
  routeBlockingEnabled: boolean;
  disabledMarketingRoutes: string[];
};

const DEFAULT_CONTROLS: SuperadminPublicControls = {
  routeBlockingEnabled: true,
  disabledMarketingRoutes: [],
};

let cache: {
  value: SuperadminPublicControls;
  expiresAt: number;
} = {
  value: DEFAULT_CONTROLS,
  expiresAt: 0,
};

const normalizeRouteList = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return [...new Set(items
    .map((item) => String(item || "").trim().replace(/^\/+|\/+$/g, "").toLowerCase())
    .filter(Boolean))];
};

export async function getSuperadminControlsPublic(): Promise<SuperadminPublicControls> {
  const now = Date.now();
  if (cache.expiresAt > now) {
    return cache.value;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return DEFAULT_CONTROLS;
  }

  try {
    const response = await fetch(`${apiUrl}/superadmin/controls/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return DEFAULT_CONTROLS;
    }

    const json = await response.json();
    const data = json?.data || {};
    const nextValue: SuperadminPublicControls = {
      routeBlockingEnabled: data?.routeBlockingEnabled !== false,
      disabledMarketingRoutes: normalizeRouteList(data?.disabledMarketingRoutes),
    };

    cache = {
      value: nextValue,
      expiresAt: now + 30000,
    };
    return nextValue;
  } catch {
    return DEFAULT_CONTROLS;
  }
}
