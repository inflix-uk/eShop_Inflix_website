"use client";

import { useEffect, useMemo, useState } from "react";
import { scopeCssToHost } from "@/app/(routes)/blogs/lib/blogHtmlCssUtils";
import { sanitizeFooterHtml, type CleanFooterHtml } from "./footerHtmlSanitize";
import { rewriteInternalHrefsInHtml } from "@/lib/siteTrailingSlash";

const HOST_SELECTOR = "[data-footer-custom-html]";

/** Keep admin CSS from closing the surrounding <style> tag. */
function sanitizeCssForStyleElement(css: string): string {
  return String(css ?? "").replace(/<\/style/gi, "<‌/style");
}

type Props = {
  html?: string;
  css?: string;
};

/**
 * Admin-written footer block (Footer Settings → Custom HTML/CSS).
 * The HTML is cleaned in the browser and the CSS only applies inside this block,
 * so it cannot restyle the rest of the page.
 */
export default function FooterCustomHtml({ html = "", css = "" }: Props) {
  const [clean, setClean] = useState<CleanFooterHtml | null>(null);

  useEffect(() => {
    setClean(sanitizeFooterHtml(html));
  }, [html]);

  const scopedCss = useMemo(() => {
    const combined = [clean?.css ?? "", String(css ?? "")]
      .filter((part) => part.trim())
      .join("\n");
    return combined
      ? scopeCssToHost(sanitizeCssForStyleElement(combined), HOST_SELECTOR)
      : "";
  }, [clean, css]);

  if (!clean || (!clean.html && !scopedCss)) return null;

  return (
    <div data-footer-custom-html="" className="w-full min-w-0">
      {scopedCss ? (
        <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      ) : null}
      {clean.html ? (
        <div dangerouslySetInnerHTML={{ __html: rewriteInternalHrefsInHtml(clean.html) }} />
      ) : null}
    </div>
  );
}
