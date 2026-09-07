import { useId } from "react";
import {
  extractHtmlDocumentFragment,
  scopeCssToHost,
} from "@/app/(routes)/blogs/lib/blogHtmlCssUtils";

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

  const host = `[data-cms-html-css="${scopeToken}"]`;
  /**
   * Prefix selectors onto the widget host. Do not wrap with `@scope`:
   * iOS WebKit ignores that at-rule, so admin colours never reached the text.
   */
  const scopedCss = hasCss
    ? scopeCssToHost(sanitizeCssForStyleElement(rawCss), host)
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
