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
  | "after_newsletter"
  | "after_contact";

export interface FooterSectionCustom {
  isEnabled?: boolean;
  title?: string;
  placement?: FooterCustomPlacement;
  order?: number;
  links?: FooterLink[];
}

/** Payment icons row shown under the footer columns. */
export interface FooterPaymentLogo {
  _id?: string;
  name: string;
  /** Uploaded path or full URL. Empty = use the built-in icon for a well-known name. */
  image?: string;
  isActive?: boolean;
  order?: number;
}

export interface FooterSectionPayments {
  isEnabled?: boolean;
  heading?: string;
  description?: string;
  logos?: FooterPaymentLogo[];
}

export type FooterContactType = "phone" | "email" | "whatsapp" | "address";

export interface FooterContactItem {
  _id?: string;
  type: FooterContactType;
  /** Text shown next to the icon; falls back to `value`. */
  label?: string;
  /** Phone number, email address, WhatsApp number or postal address. */
  value: string;
  isActive?: boolean;
  order?: number;
}

export interface FooterSectionContact {
  isEnabled?: boolean;
  title?: string;
  items?: FooterContactItem[];
}

export type FooterCustomHtmlPosition =
  | "above_columns"
  | "below_columns"
  | "replace_columns";

/** Admin-written HTML + CSS block. CSS is scoped to the block on render. */
export interface FooterCustomHtml {
  isEnabled?: boolean;
  position?: FooterCustomHtmlPosition;
  html?: string;
  css?: string;
}

export type FooterBaseColumnKey =
  | "section1"
  | "section2"
  | "section3"
  | "sectionNewsletter"
  | "sectionContact";

export type FooterColumnKey = FooterBaseColumnKey | `custom:${number}`;

/** Hex colours; an empty value keeps the theme default. */
export interface FooterColors {
  background?: string;
  text?: string;
  heading?: string;
  linkHover?: string;
  border?: string;
}

export interface FooterLayout {
  /** Left-to-right order of the built-in columns. */
  columnOrder?: FooterBaseColumnKey[];
  hiddenColumns?: FooterBaseColumnKey[];
  colors?: FooterColors;
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
  sectionPayments?: FooterSectionPayments;
  sectionContact?: FooterSectionContact;
  customHtml?: FooterCustomHtml;
  layout?: FooterLayout;
}
