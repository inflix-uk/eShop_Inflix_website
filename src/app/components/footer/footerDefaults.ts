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
