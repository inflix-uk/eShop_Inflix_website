import type { FooterSettings } from "./footerTypes";

export const DEFAULT_FOOTER: FooterSettings = {
  section1: {
    description: "",
    socialMedia: [],
  },
  section2: {
    title: "",
    links: [],
  },
  section3: {
    title: "",
    links: [],
  },
  sectionNewsletter: {
    isEnabled: false,
    heading: "",
    description: "",
    placeholder: "",
    buttonLabel: "",
    imageUrl: "",
  },
  bottomBar: {
    textBeforeCredit: "",
    creditLabel: "",
    creditUrl: "",
    showCookieSettingsButton: true,
  },
  sectionCustom: [],
  sectionPayments: {
    isEnabled: false,
    heading: "",
    description: "",
    logos: [],
  },
  sectionContact: {
    isEnabled: false,
    title: "",
    items: [],
  },
  customHtml: {
    isEnabled: false,
    position: "below_columns",
    html: "",
    css: "",
  },
  layout: {
    columnOrder: [
      "section1",
      "section2",
      "section3",
      "sectionNewsletter",
      "sectionContact",
    ],
    hiddenColumns: [],
    colors: {},
  },
  section4: {
    title: "",
    links: [],
  },
  section5: {
    title: "",
    text: "",
    ecologiLink: "",
    paymentMethods: {
      heading: "",
      logos: [],
    },
  },
};
