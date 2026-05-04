/**
 * Widget visibility shape + defaults only (no fetch).
 * Keeps `HomeClient` and other client shells from importing `siteWidgetSettingsService`
 * (which pulls CMS fetch helpers) until a lazy `import()` runs.
 */
export type SiteWidgetVisibility = {
  sliderEnabled: boolean;
  newsletterEnabled: boolean;
  faqEnabled: boolean;
  videoEnabled: boolean;
  mapEnabled: boolean;
  galleryEnabled: boolean;
  iconBoxEnabled: boolean;
  testimonialsEnabled: boolean;
  trustpilotWidgetEnabled: boolean;
  siteBannersEnabled: boolean;
  categoryCardsEnabled: boolean;
  promotionalSectionsEnabled: boolean;
  latestBlogsEnabled: boolean;
  htmlCssEnabled: boolean;
  contactUsEnabled: boolean;
};

export const DEFAULT_SITE_WIDGET_VISIBILITY: SiteWidgetVisibility = {
  sliderEnabled: true,
  newsletterEnabled: true,
  faqEnabled: true,
  videoEnabled: true,
  mapEnabled: true,
  galleryEnabled: true,
  iconBoxEnabled: true,
  testimonialsEnabled: true,
  trustpilotWidgetEnabled: true,
  siteBannersEnabled: true,
  categoryCardsEnabled: true,
  promotionalSectionsEnabled: true,
  latestBlogsEnabled: true,
  htmlCssEnabled: true,
  contactUsEnabled: true,
};
