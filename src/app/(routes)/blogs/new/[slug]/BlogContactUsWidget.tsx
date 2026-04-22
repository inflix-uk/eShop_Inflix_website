"use client";

import { useMemo } from "react";
import DynamicContactForm from "@/app/components/contact/DynamicContactForm";
import type {
  ContactUsWidgetPublic,
  ContactWidgetField,
} from "@/app/services/contactUsWidgetPublicService";
import type { WidgetContactUsContent } from "@/app/services/homepageDataService";

type Props = { content: WidgetContactUsContent };

export default function BlogContactUsWidget({ content }: Props) {
  const fingerprint = JSON.stringify({
    isActive: content.isActive,
    title: content.title,
    description: content.description,
    submitButtonLabel: content.submitButtonLabel,
    successMessage: content.successMessage,
    fields: content.fields,
  });

  const widget: ContactUsWidgetPublic = useMemo(
    () => ({
      _id: "",
      isActive: content.isActive !== false,
      title: typeof content.title === "string" ? content.title : "",
      description: typeof content.description === "string" ? content.description : "",
      submitButtonLabel: content.submitButtonLabel || "Send",
      successMessage:
        content.successMessage || "Your message has been sent. We will get back to you soon.",
      fields: (content.fields || []) as ContactWidgetField[],
      submitAsEmbedded: true,
    }),
    [fingerprint]
  );

  if (!widget.fields?.length) return null;

  return (
    <section className="my-6 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-5 sm:px-6 sm:py-6">
      <DynamicContactForm widget={widget} />
    </section>
  );
}
