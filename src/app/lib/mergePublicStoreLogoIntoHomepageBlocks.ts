import type {
  ContentBlock,
  HomepageBlock,
  WidgetNavbarContent,
} from "@/app/services/homepageDataService";

export type PublicStoreLogoPayload = {
  logoUrl: string;
  altText: string;
};

function isNavbarWidgetBlock(
  block: ContentBlock
): block is ContentBlock & { content: WidgetNavbarContent } {
  return (
    block.type === "widget" &&
    block.content !== null &&
    typeof block.content === "object" &&
    (block.content as WidgetNavbarContent).widgetType === "navbar"
  );
}

/**
 * When a navbar CMS block has no `logoUrl`, fill it from the same public logo
 * source as the main header (`getLogo`) so SSR + first client paint match.
 */
export function mergePublicStoreLogoIntoHomepageBlocks(
  blocks: HomepageBlock[] | null | undefined,
  logo: PublicStoreLogoPayload | null | undefined
): HomepageBlock[] {
  if (!blocks?.length) return [];
  const url = logo?.logoUrl?.trim();
  if (!url) return blocks;
  const alt = logo?.altText?.trim() || "Zextons";

  return blocks.map((row) => ({
    ...row,
    columns: (row.columns ?? []).map((col) => ({
      ...col,
      blocks: (col.blocks ?? []).map((block): ContentBlock => {
        if (!isNavbarWidgetBlock(block)) return block;
        const nv = block.content as WidgetNavbarContent;
        if (String(nv.logoUrl || "").trim()) return block;
        return {
          ...block,
          content: {
            ...nv,
            logoUrl: url,
            logoText: nv.logoText?.trim() || alt,
          },
        };
      }),
    })),
  }));
}
