export interface FooterLink {
  _id?: string;
  text: string;
  link: string;
  isActive: boolean;
  order: number;
  ariaLabel?: string;
}

export interface SocialMediaItem {
  _id?: string;
  name: string;
  link: string;
  icon?: string;
  isActive: boolean;
  order: number;
  ariaLabel?: string;
}

export interface PaymentLogo {
  _id?: string;
  name: string;
  logo: string;
  isActive: boolean;
  order: number;
}

export interface PaymentMethods {
  heading?: string;
  logos: PaymentLogo[];
}

export interface FooterSection2 {
  title: string;
  links: FooterLink[];
}

export interface FooterSection5 {
  title: string;
  text: string;
  ecologiLogo?: string;
  ecologiLink?: string;
  paymentMethods: PaymentMethods;
}

export interface FooterSectionNewsletter {
  isEnabled?: boolean;
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  imageUrl?: string;
}

/** Footer strip below the main columns (copyright + optional credit link). Use {{year}} in text for the current year. */
export interface FooterBottomBar {
  textBeforeCredit?: string;
  creditLabel?: string;
  creditUrl?: string;
}

/** Extra link column with placement relative to the built-in footer columns. */
export type FooterCustomPlacement =
  | "after_logo"
  | "after_useful_links"
  | "after_customer_care"
  | "after_newsletter";

export interface FooterSectionCustom {
  isEnabled?: boolean;
  title?: string;
  placement?: FooterCustomPlacement;
  order?: number;
  links?: FooterLink[];
}

export interface FooterSettings {
  section1: {
    logo?: string | { image?: string; altText?: string; link?: string };
    description?: string;
    socialMedia: SocialMediaItem[];
  };
  section2: FooterSection2;
  section3: FooterSection2;
  section4: FooterSection2;
  section5: FooterSection5;
  sectionNewsletter?: FooterSectionNewsletter;
  bottomBar?: FooterBottomBar;
  /** Multiple custom link columns. Legacy single-object shape is normalized client-side. */
  sectionCustom?: FooterSectionCustom[] | FooterSectionCustom;
}
