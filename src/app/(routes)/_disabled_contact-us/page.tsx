"use client";

import React, { useEffect, useState } from "react";
import NavBar from "@/app/components/navbar/Nav";
import DynamicContactForm from "@/app/components/contact/DynamicContactForm";
import {
  getContactUsWidgetPublic,
  type ContactUsWidgetPublic,
} from "@/app/services/contactUsWidgetPublicService";

export default function ContactUs() {
  const [widget, setWidget] = useState<ContactUsWidgetPublic | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const w = await getContactUsWidgetPublic();
      if (!cancelled) setWidget(w);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="relative">
        <NavBar />
      </header>
      <div className="relative isolate bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 md:py-10 lg:px-8 lg:py-12">
          <div className="border-b border-gray-100 pb-8 lg:pb-10">
            <div className="max-w-2xl">
              {widget && widget._id && widget.title?.trim() ? (
                <h2 className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
                  {widget.title.trim()}
                </h2>
              ) : null}
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We would love to speak with you. Use the form below to send a message, or reach us using the
                details here.
              </p>
              <h2 className="mt-8 text-xl font-bold text-primary md:mt-10 md:text-2xl">Get In Touch</h2>
              <div className="mt-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 24 24">
                  <path
                    fill="green"
                    d="M19 17.47c-.88-.07-1.75-.22-2.6-.45l-1.19 1.19c1.2.41 2.48.67 3.8.75v-1.49zM5.03 5c.09 1.32.35 2.59.75 3.8l1.2-1.2c-.23-.84-.38-1.71-.44-2.6z"
                    opacity="0.3"
                  />
                  <path
                    fill="green"
                    d="M9.07 7.57A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1c0 9.39 7.61 17 17 17c.55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1c-1.24 0-2.45-.2-3.57-.57a.84.84 0 0 0-.31-.05c-.26 0-.51.1-.71.29l-2.2 2.2a15.149 15.149 0 0 1-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02m7.33 9.45c.85.24 1.72.39 2.6.45v1.49c-1.32-.09-2.59-.35-3.8-.75zM5.79 8.8c-.41-1.21-.67-2.48-.76-3.8h1.5a13 13 0 0 0 .46 2.59z"
                  />
                </svg>
                <p className="ps-2">0333 344 8541</p>
              </div>
              <div className="mt-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 16 16">
                  <path
                    fill="green"
                    d="M4 3a2 2 0 0 0-2 2v.201l6 3.231l6-3.23V5a2 2 0 0 0-2-2zm10 3.337L8.237 9.44a.5.5 0 0 1-.474 0L2 6.337V11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2z"
                  />
                </svg>
                <p className="ps-2">
                  <a href="mailto:hello@" className="hover:underline">
                    hello@
                  </a>
                </p>
              </div>
              <div className="mt-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32">
                  <path
                    fill="green"
                    d="M16 2C8.4 2 2 8.4 2 16s6.4 14 14 14s14-6.4 14-14S23.6 2 16 2m4.587 20L15 16.41V7h2v8.582l5 5.004z"
                  />
                </svg>
                <div>
                  <p className="ps-2">
                    <span className="font-bold">Mon to Fri:</span> Our lines are open from 10:00 AM to 6:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {widget === undefined ? (
            <div className="flex justify-center py-12 text-gray-500">Loading form…</div>
          ) : widget && widget._id ? (
            <div className="w-full pt-6 sm:pt-8 lg:pt-10">
              <DynamicContactForm widget={widget} />
            </div>
          ) : (
            <div className="px-0 pb-12 pt-8 sm:pb-16">
              <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                <p className="font-semibold">Contact form not available yet</p>
                <p className="mt-2">
                  The contact form is not configured yet. An administrator can add a{" "}
                  <strong>Contact form</strong> widget where the block editor is available, or configure the
                  global contact form via the site API. Until then, please email{" "}
                  <a href="mailto:hello@" className="font-medium underline">
                    hello@
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
