import { typographyThemeStyleCss, type TypographyConfig } from "@/app/lib/typographyThemeUtils";

/** SSR: CMS typography variables + h1–h3, p rules (after globals for correct cascade). */
export default function TypographyThemeStyles({
  typography,
}: {
  typography: TypographyConfig;
}) {
  return (
    <style
      id="cms-typography-theme"
      dangerouslySetInnerHTML={{ __html: typographyThemeStyleCss(typography) }}
    />
  );
}
