/**
 * Stock and on/off rules for product variants on the product page:
 *  - A variant switched off in the admin (status false) is not shown at all.
 *  - Quantity 0: shown, marked "Out of Stock", cannot be bought.
 *  - Quantity blank: shown without an "Out of Stock" label, but cannot be bought
 *    until stock is added.
 *  - Quantity above 0: can be bought.
 */

/** Stock as a number, or null when the quantity field is blank. */
export function variantQuantity(variant: any): number | null {
  const q = variant?.Quantity;
  if (q === null || q === undefined || (typeof q === "string" && q.trim() === "")) return null;
  const n = Number(q);
  return Number.isFinite(n) ? n : null;
}

/** Variants are on unless switched off; older variants have no status field. */
export function isVariantOn(variant: any): boolean {
  return !!variant && variant.status !== false && variant.status !== "false";
}

export function isPurchasable(variant: any): boolean {
  const q = variantQuantity(variant);
  return isVariantOn(variant) && q !== null && q > 0;
}

/** Only an explicit quantity of 0 is "Out of Stock". */
export function isOutOfStock(variant: any): boolean {
  return !!variant && variantQuantity(variant) === 0;
}

const words = (text: unknown) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/\s*\(#\w+\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const optionText = (option: any) =>
  option && typeof option === "object" ? option.slug || option.value || option.name || "" : option;

/**
 * The product with switched-off variants removed, and each picker (condition,
 * colour, storage, ...) limited to options that a remaining variant uses, so a
 * switched-off "Excellent" never shows as a button. When every variant is off the
 * product is returned unchanged; nothing can be bought because isPurchasable is false.
 */
export function withOnlyActiveVariants<T extends { variantValues?: any[]; variantNames?: any[] }>(product: T): T {
  if (!product || !Array.isArray(product.variantValues)) return product;
  const active = product.variantValues.filter(isVariantOn);
  if (active.length === 0 || active.length === product.variantValues.length) return product;

  const activeNames = active.map((v) => ` ${words(v?.name)} `);
  const variantNames = Array.isArray(product.variantNames)
    ? product.variantNames.map((picker: any) => {
        if (!picker || !Array.isArray(picker.options)) return picker;
        const options = picker.options.filter((o: any) => {
          const w = words(optionText(o));
          if (!w) return true;
          // "128 GB" vs "128gb": sizes are also compared without spaces.
          const squashed = /\d/.test(w) ? w.replace(/ /g, "") : null;
          return activeNames.some(
            (name) => name.includes(` ${w} `) || (squashed !== null && name.replace(/ /g, "").includes(squashed))
          );
        });
        // Option names that don't appear in variant names can't be matched; keep them.
        return options.length > 0 ? { ...picker, options } : picker;
      })
    : product.variantNames;

  return { ...product, variantValues: active, variantNames };
}
