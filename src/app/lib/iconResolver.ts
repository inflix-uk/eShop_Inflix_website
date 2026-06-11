import type { IconType } from "react-icons";
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiDownload,
  FiPhone,
  FiSearch,
  FiMail,
  FiMapPin,
  FiClock,
  FiCheck,
  FiStar,
  FiArrowRight,
  FiArrowLeft,
  FiHome,
  FiSettings,
  FiLogOut,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiShare2,
  FiExternalLink,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

/** Core icons that are always available (fast load). */
export const CORE_ICONS: Record<string, IconType> = {
  FiMenu,
  FiX,
  FiChevronDown,
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiDownload,
  FiPhone,
  FiSearch,
  FiMail,
  FiMapPin,
  FiClock,
  FiCheck,
  FiStar,
  FiArrowRight,
  FiArrowLeft,
  FiHome,
  FiSettings,
  FiLogOut,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiShare2,
  FiExternalLink,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
};

/** Cache for dynamically loaded icons. */
let fullIconMapCache: Record<string, IconType> | null = null;

/** Extract IconType entries from a dynamic react-icons module (skip `default`). */
function iconsFromModule(mod: unknown): Record<string, IconType> {
  const out: Record<string, IconType> = {};
  if (!mod || typeof mod !== "object") return out;

  for (const [key, value] of Object.entries(mod as Record<string, unknown>)) {
    if (key === "default" || typeof value !== "function") continue;
    out[key] = value as IconType;
  }
  return out;
}

/** Loads full icon libraries on demand (client-side only). */
async function loadFullIconMap(): Promise<Record<string, IconType>> {
  if (fullIconMapCache) return fullIconMapCache;

  const [Fa, Fa6, Md, Io5, Ai, Bi, Bs, Ri, Gi, Tb, Hi2, Lu] = await Promise.all([
    import("react-icons/fa"),
    import("react-icons/fa6"),
    import("react-icons/md"),
    import("react-icons/io5"),
    import("react-icons/ai"),
    import("react-icons/bi"),
    import("react-icons/bs"),
    import("react-icons/ri"),
    import("react-icons/gi"),
    import("react-icons/tb"),
    import("react-icons/hi2"),
    import("react-icons/lu"),
  ]);

  fullIconMapCache = {
    ...CORE_ICONS,
    ...iconsFromModule(Fa),
    ...iconsFromModule(Fa6),
    ...iconsFromModule(Md),
    ...iconsFromModule(Io5),
    ...iconsFromModule(Ai),
    ...iconsFromModule(Bi),
    ...iconsFromModule(Bs),
    ...iconsFromModule(Ri),
    ...iconsFromModule(Gi),
    ...iconsFromModule(Tb),
    ...iconsFromModule(Hi2),
    ...iconsFromModule(Lu),
  };

  return fullIconMapCache;
}

/**
 * Resolves icon by name - uses core icons synchronously, 
 * falls back to full library lookup for unknown icons.
 */
export function resolveIconSync(
  iconName: string | undefined | null,
  fallback: IconType | null = null
): IconType | null {
  const normalized = String(iconName || "").trim();
  if (!normalized) return fallback;
  return CORE_ICONS[normalized] || fallback;
}

/**
 * Resolves icon by name - async version that loads full libraries if needed.
 */
export async function resolveIconAsync(
  iconName: string | undefined | null,
  fallback: IconType | null = null
): Promise<IconType | null> {
  const normalized = String(iconName || "").trim();
  if (!normalized) return fallback;
  
  // Try core icons first (fast)
  if (CORE_ICONS[normalized]) {
    return CORE_ICONS[normalized];
  }
  
  // Load full libraries for unknown icons
  const fullMap = await loadFullIconMap();
  return fullMap[normalized] || fallback;
}
