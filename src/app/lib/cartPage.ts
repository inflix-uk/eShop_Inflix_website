import type { FooterPage } from "@/app/services/footerPageService";

/** The navbar basket icon links here by default, so this path always shows the cart. */
export const CART_PAGE_SLUG = "cart";

/** A page-builder row holding only the Shopping Cart widget. */
function cartWidgetRow() {
  return {
    id: "builtin-cart-row",
    type: "row",
    columns: [
      {
        id: "builtin-cart-column",
        width: 100,
        blocks: [
          {
            id: "builtin-cart-widget",
            type: "widget",
            content: { widgetType: "cart" },
          },
        ],
      },
    ],
  };
}

function hasCartWidget(page: FooterPage): boolean {
  return (page.blocks || []).some((row: any) =>
    (row?.columns || []).some((column: any) =>
      (column?.blocks || []).some(
        (block: any) =>
          block?.type === "widget" && block?.content?.widgetType === "cart"
      )
    )
  );
}

/**
 * The page to render at /cart.
 *
 * A store's own Cart page (banner, text) keeps its design and gets the cart
 * under it, unless the page already places the Shopping Cart widget itself.
 * A store with no published Cart page still gets a working cart page instead
 * of "Page Not Found" behind the basket icon.
 */
export function resolveCartPage(publishedPage: FooterPage | null): FooterPage {
  if (!publishedPage) {
    return {
      _id: "builtin-cart-page",
      title: "Shopping Cart",
      slug: CART_PAGE_SLUG,
      blocks: [cartWidgetRow()] as unknown as FooterPage["blocks"],
      publishStatus: "published",
    };
  }
  if (hasCartWidget(publishedPage)) return publishedPage;
  return {
    ...publishedPage,
    blocks: [
      ...(publishedPage.blocks || []),
      cartWidgetRow(),
    ] as unknown as FooterPage["blocks"],
  };
}
