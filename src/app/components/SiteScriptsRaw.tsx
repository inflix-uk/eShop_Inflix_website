import parse from "html-react-parser";

type Props = { html: string };

/**
 * Renders trusted admin-provided HTML (Semrush / Ahrefs / GSC / custom).
 */
export default function SiteScriptsRaw({ html }: Props) {
  if (!html?.trim()) return null;
  // `trim: true` drops whitespace-only text nodes. Without it, newlines between
  // tags in admin HTML become React text children — invalid inside `<head>` and
  // trigger hydration warnings (parser root is not `head`, so the library's
  // head-specific skip does not run for those nodes).
  return <>{parse(html.trim(), { trim: true })}</>;
}
