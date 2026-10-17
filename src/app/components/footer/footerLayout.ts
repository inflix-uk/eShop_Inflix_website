import type {
  FooterBaseColumnKey,
  FooterColors,
  FooterColumnKey,
  FooterContactItem,
  FooterCustomPlacement,
  FooterLayout,
  FooterPaymentLogo,
  FooterSectionCustom,
} from "./footerTypes";

/** Built-in footer columns, in their default left-to-right order. */
export const FOOTER_BASE_COLUMNS: FooterBaseColumnKey[] = [
  "section1",
  "section2",
  "section3",
  "sectionNewsletter",
  "sectionContact",
];

const PLACEMENT_AFTER: Record<FooterCustomPlacement, FooterBaseColumnKey> = {
  after_logo: "section1",
  after_useful_links: "section2",
  after_customer_care: "section3",
  after_newsletter: "sectionNewsletter",
  after_contact: "sectionContact",
};

/** Admin order first, then any built-in column it does not mention. */
export function resolveBaseColumnOrder(
  layout: FooterLayout | undefined
): FooterBaseColumnKey[] {
  const requested = Array.isArray(layout?.columnOrder) ? layout.columnOrder : [];
  const order: FooterBaseColumnKey[] = [];
  for (const key of [...requested, ...FOOTER_BASE_COLUMNS]) {
    if (FOOTER_BASE_COLUMNS.includes(key) && !order.includes(key)) {
      order.push(key);
    }
  }
  return order;
}

/**
 * Built-in columns in the admin's order, each followed by the enabled custom
 * link columns placed after it. Hidden / empty columns are filtered by the caller.
 */
export function buildFooterColumnOrder(
  customSections: FooterSectionCustom[],
  layout?: FooterLayout
): FooterColumnKey[] {
  const enabled = customSections
    .map((section, index) => ({ section, index }))
    .filter(
      ({ section }) =>
        section.isEnabled === true && Boolean(section.title?.trim())
    )
    .sort(
      (a, b) => (a.section.order ?? a.index) - (b.section.order ?? b.index)
    );

  const byBaseColumn = new Map<FooterBaseColumnKey, number[]>();
  for (const { section, index } of enabled) {
    const after =
      PLACEMENT_AFTER[section.placement as FooterCustomPlacement] ?? "section2";
    const list = byBaseColumn.get(after) || [];
    list.push(index);
    byBaseColumn.set(after, list);
  }

  const columns: FooterColumnKey[] = [];
  for (const key of resolveBaseColumnOrder(layout)) {
    columns.push(key);
    for (const customIndex of byBaseColumn.get(key) || []) {
      columns.push(`custom:${customIndex}`);
    }
  }
  return columns;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const COLOR_VARS: Record<keyof FooterColors, string> = {
  background: "--footer-bg",
  text: "--footer-text",
  heading: "--footer-heading",
  linkHover: "--footer-hover",
  border: "--footer-border",
};

/** CSS variables for the colours the admin set; unset colours keep the theme default. */
export function footerColorVars(
  colors: FooterColors | undefined
): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!colors) return vars;
  for (const key of Object.keys(COLOR_VARS) as (keyof FooterColors)[]) {
    const value = String(colors[key] ?? "").trim();
    if (HEX_COLOR.test(value)) vars[COLOR_VARS[key]] = value;
  }
  return vars;
}

/** Active rows only, in admin order. */
export function activeInOrder<T extends { isActive?: boolean; order?: number }>(
  items: T[] | undefined
): T[] {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item?.isActive !== false)
    .sort((a, b) => (a.item.order ?? a.index) - (b.item.order ?? b.index))
    .map(({ item }) => item);
}

/** Link target for a contact row; `null` = plain text (e.g. a postal address). */
export function contactHref(item: FooterContactItem): string | null {
  const value = String(item?.value ?? "").trim();
  if (!value) return null;

  switch (item.type) {
    case "phone": {
      const number = value.replace(/[^\d+]/g, "");
      return number ? `tel:${number}` : null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+$/.test(value) ? `mailto:${value}` : null;
    case "whatsapp": {
      if (/^https?:\/\//i.test(value)) return value;
      const digits = value.replace(/\D/g, "").replace(/^00/, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    default:
      return null;
  }
}

/** "American Express" / "amex" / "Apple Pay" → key of a built-in payment icon. */
export function paymentIconKey(logo: FooterPaymentLogo): string {
  const name = String(logo?.name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (name === "amex") return "americanexpress";
  if (name === "gpay") return "googlepay";
  return name;
}
