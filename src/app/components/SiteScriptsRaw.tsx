import parse from "html-react-parser";
import { Children, type ReactNode } from "react";
import {
  normalizeBareHeadLine,
  normalizeHeadScriptsHtml,
} from "@/app/lib/normalizeHeadScriptsHtml";

type Props = {
  html: string;
  /** When true, bare verification tokens are wrapped as `<meta>` (valid in `<head>`). */
  forHead?: boolean;
};

function headSafeParsedNodes(source: string): ReactNode {
  const parsed = parse(source, { trim: true });
  return Children.toArray(parsed).flatMap((child) => {
    if (typeof child !== "string") return [child];
    const trimmed = child.trim();
    if (!trimmed) return [];
    const normalized = normalizeBareHeadLine(trimmed);
    if (!normalized.startsWith("<")) return [];
    return Children.toArray(parse(normalized, { trim: true }));
  });
}

/**
 * Renders trusted admin-provided HTML (Semrush / Ahrefs / GSC / custom).
 */
export default function SiteScriptsRaw({ html, forHead = false }: Props) {
  if (!html?.trim()) return null;
  const source = forHead ? normalizeHeadScriptsHtml(html) : html.trim();
  // `trim: true` drops whitespace-only text nodes. Without it, newlines between
  // tags in admin HTML become React text children — invalid inside `<head>` and
  // trigger hydration warnings (parser root is not `head`, so the library's
  // head-specific skip does not run for those nodes).
  if (forHead) {
    return <>{headSafeParsedNodes(source)}</>;
  }
  return <>{parse(source, { trim: true })}</>;
}
