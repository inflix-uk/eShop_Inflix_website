import { useId } from "react";
import { extractHtmlDocumentFragment } from "@/app/(routes)/blogs/lib/blogHtmlCssUtils";

/** Strip scripts and external stylesheets; keep fragment-only markup safe for innerHTML. */
function sanitizeHtmlFragment(html: string): string {
  let s = extractHtmlDocumentFragment(html);
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  s = s.replace(/<\/?script\b[^>]*>/gi, "");
  s = s.replace(/<link\b[^>]*>/gi, "");
  s = s.replace(/<meta\b[^>]*>/gi, "");
  s = s.replace(/<title\b[^<]*(?:(?!<\/title>)<[^<]*)*<\/title>/gi, "");
  return s;
}

/**
 * Prevent `</style`-like sequences in admin CSS from closing the surrounding
 * &lt;style&gt; tag when emitted in HTML.
 */
function sanitizeCssForStyleElement(css: string): string {
  return String(css ?? "").replace(/<\/style/gi, "<\u200c/style");
}

/**
 * Admin previews run in an iframe where `:root`, `html`, and `body` selectors are valid.
 * On storefront we scope CSS to the widget subtree, so remap those selectors to `:scope`
 * to preserve variables/base styles and keep visual parity with admin preview.
 */
function normalizeCssForScopedWidget(css: string): string {
  return String(css ?? "")
    .replace(/(^|[,{]\s*):root\b/gm, "$1:scope")
    .replace(/(^|[,{]\s*)html\b/gm, "$1:scope")
    .replace(/(^|[,{]\s*)body\b/gm, "$1:scope");
}

export default function BlogHtmlCssWidget({
  html = "",
  css = "",
}: {
  html?: string;
  css?: string;
}) {
  const reactId = useId();
  const scopeToken =
    reactId.replace(/[^a-zA-Z0-9]/g, "") || "cmshtmlcss";

  const cleanHtml = sanitizeHtmlFragment(html);
  const hasHtml = cleanHtml.trim().length > 0;
  const rawCss = String(css ?? "");
  const hasCss = rawCss.trim().length > 0;

  if (!hasHtml && !hasCss) {
    return null;
  }

  const safeCss = sanitizeCssForStyleElement(normalizeCssForScopedWidget(rawCss));
  /** Limits admin rules to this subtree (evergreen browsers; same isolation idea as shadow DOM). */
  const scopedCss = hasCss
    ? `@scope ([data-cms-html-css="${scopeToken}"]) {\n${safeCss}\n}`
    : "";

  return (
    <div
      className="cms-html-css-widget w-full"
      data-widget="html-css"
      data-cms-html-css={scopeToken}
      suppressHydrationWarning
    >
      {hasCss ? (
        <style
          dangerouslySetInnerHTML={{
            __html: scopedCss,
          }}
          suppressHydrationWarning
        />
      ) : null}
      {hasHtml ? (
        <div
          className="max-w-none blog-content cms-html-css-widget-inner"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
          suppressHydrationWarning
        />
      ) : null}
    </div>
  );
}
