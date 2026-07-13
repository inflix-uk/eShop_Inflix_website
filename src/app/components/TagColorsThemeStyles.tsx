import { tagColorsThemeStyleCss, type TagColorsConfig } from "@/app/lib/tagColorsThemeUtils";

/** SSR: CMS tag colors — uses `!important` so Tailwind `text-gray-*` on headings does not win. */
export default function TagColorsThemeStyles({
  tagColors,
  enabled = true,
}: {
  tagColors: TagColorsConfig;
  enabled?: boolean;
}) {
  if (!enabled) return null;

  return (
    <style
      id="cms-tag-colors-theme"
      dangerouslySetInnerHTML={{ __html: tagColorsThemeStyleCss(tagColors) }}
    />
  );
}
