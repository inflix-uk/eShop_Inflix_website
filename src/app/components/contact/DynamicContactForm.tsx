"use client";

import { useCallback, useMemo, useState } from "react";
import {
  submitContactWidget,
  type ContactUsWidgetPublic,
  type ContactWidgetField,
} from "@/app/services/contactUsWidgetPublicService";

function coerceAnswerString(v: unknown): string {
  if (v === true || v === "true" || v === "1" || v === "on" || v === "yes") return "true";
  if (v === false || v === "false" || v === "0" || v === "off" || v === "no") return "false";
  return String(v ?? "");
}

function isFieldVisible(field: ContactWidgetField, answers: Record<string, unknown>): boolean {
  if (!field.showWhenField) return true;
  const cur = coerceAnswerString(answers[field.showWhenField]);
  const want = coerceAnswerString(field.showWhenValue);
  return cur === want;
}

function sortedFields(widget: ContactUsWidgetPublic): ContactWidgetField[] {
  return [...(widget.fields || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}

function initialAnswers(fields: ContactWidgetField[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "checkbox") o[f.name] = false;
    else o[f.name] = "";
  }
  return o;
}

type Props = {
  widget: ContactUsWidgetPublic;
  /** Remove top padding on small screens (stacked under HTML/CSS hero on CMS pages). */
  compactTopOnMobile?: boolean;
};

export default function DynamicContactForm({
  widget,
  compactTopOnMobile = false,
}: Props) {
  const fields = useMemo(() => sortedFields(widget), [widget]);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    initialAnswers(fields)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [banner, setBanner] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setVal = useCallback((name: string, v: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: v }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("loading");
      setBanner("");
      setFieldErrors({});
      const embedded =
        widget.submitAsEmbedded === true
          ? {
              isActive: widget.isActive !== false,
              title: widget.title,
              description: widget.description,
              submitButtonLabel: widget.submitButtonLabel,
              successMessage: widget.successMessage,
              fields: widget.fields,
            }
          : undefined;

      const res = await submitContactWidget({
        widgetId: embedded ? undefined : widget._id,
        embeddedWidget: embedded,
        answers,
      });
      if (res.ok) {
        setStatus("success");
        setBanner(res.message || widget.successMessage || "Sent.");
        setAnswers(initialAnswers(fields));
        return;
      }
      setStatus("error");
      setBanner(res.message || "Something went wrong.");
      if (res.errors) setFieldErrors(res.errors);
    },
    [
      answers,
      fields,
      widget._id,
      widget.successMessage,
      widget.submitAsEmbedded,
      widget.isActive,
      widget.title,
      widget.description,
      widget.submitButtonLabel,
      widget.fields,
    ]
  );

  const renderField = (f: ContactWidgetField) => {
    if (!isFieldVisible(f, answers)) return null;
    const err = fieldErrors[f.name];
    const common =
      "block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 disabled:bg-gray-50";

    switch (f.type) {
      case "textarea":
        return (
          <div key={f.name} className="sm:col-span-2">
            <label className="block text-sm font-semibold leading-6 text-gray-900" htmlFor={f.name}>
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </label>
            {f.helpText ? (
              <p className="mt-1 text-xs text-gray-500">{f.helpText}</p>
            ) : null}
            <div className="mt-1.5">
              <textarea
                id={f.name}
                name={f.name}
                rows={4}
                required={Boolean(f.required)}
                placeholder={f.placeholder || ""}
                className={common}
                value={String(answers[f.name] ?? "")}
                onChange={(e) => setVal(f.name, e.target.value)}
                disabled={status === "loading"}
              />
            </div>
            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
          </div>
        );
      case "select":
        return (
          <div key={f.name} className="sm:col-span-2">
            <label className="block text-sm font-semibold leading-6 text-gray-900" htmlFor={f.name}>
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </label>
            <div className="mt-1.5">
              <select
                id={f.name}
                name={f.name}
                required={Boolean(f.required)}
                className={common}
                value={String(answers[f.name] ?? "")}
                onChange={(e) => setVal(f.name, e.target.value)}
                disabled={status === "loading"}
              >
                <option value="">Select…</option>
                {(f.options || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || o.value}
                  </option>
                ))}
              </select>
            </div>
            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
          </div>
        );
      case "radio":
        return (
          <div key={f.name} className="sm:col-span-2">
            <span className="block text-sm font-semibold leading-6 text-gray-900">
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </span>
            {f.helpText ? (
              <p className="mt-1 text-xs text-gray-500">{f.helpText}</p>
            ) : null}
            <div className="mt-1.5 space-y-1.5">
              {(f.options || []).map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name={f.name}
                    value={o.value}
                    checked={String(answers[f.name] ?? "") === o.value}
                    onChange={() => setVal(f.name, o.value)}
                    disabled={status === "loading"}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  {o.label || o.value}
                </label>
              ))}
            </div>
            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
          </div>
        );
      case "checkbox":
        return (
          <div key={f.name} className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                name={f.name}
                checked={Boolean(answers[f.name])}
                onChange={(e) => setVal(f.name, e.target.checked)}
                disabled={status === "loading"}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                {f.label}
                {f.required ? <span className="text-red-500"> *</span> : null}
                {f.helpText ? (
                  <span className="mt-1 block text-xs font-normal text-gray-500">{f.helpText}</span>
                ) : null}
              </span>
            </label>
            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
          </div>
        );
      default:
        return (
          <div key={f.name}>
            <label className="block text-sm font-semibold leading-6 text-gray-900" htmlFor={f.name}>
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </label>
            {f.helpText ? (
              <p className="mt-1 text-xs text-gray-500">{f.helpText}</p>
            ) : null}
            <div className="mt-1.5">
              <input
                id={f.name}
                name={f.name}
                type={f.type === "email" ? "email" : "text"}
                required={Boolean(f.required)}
                placeholder={f.placeholder || ""}
                className={common}
                value={String(answers[f.name] ?? "")}
                onChange={(e) => setVal(f.name, e.target.value)}
                disabled={status === "loading"}
              />
            </div>
            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
          </div>
        );
    }
  };

  const hasTitle = Boolean(widget.title?.trim());
  const hasDescription = Boolean(widget.description?.trim());

  return (
    <form
      onSubmit={onSubmit}
      className={`w-full max-w-7xl mx-auto px-0 pb-10 sm:pb-12 sm:pt-5 lg:pt-6 ${
        compactTopOnMobile ? "max-sm:pt-0 pt-4" : "pt-4"
      }`}
    >
      <div className="w-full">
        {hasTitle || hasDescription ? (
          <header className="mb-5 border-b border-gray-100 pb-5">
            {hasTitle ? (
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {(widget.title ?? "").trim()}
              </h2>
            ) : null}
            {hasDescription ? (
              <p
                className={`max-w-3xl text-base leading-relaxed text-gray-600 whitespace-pre-wrap ${
                  hasTitle ? "mt-2" : ""
                }`}
              >
                {widget.description}
              </p>
            ) : null}
          </header>
        ) : null}

        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {fields.map((f) => renderField(f))}
        </div>

        {(status === "success" || status === "error") && banner ? (
          <div
            className={`mt-3 rounded-md border px-3 py-2.5 text-sm ${
              status === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
            role={status === "success" ? "status" : "alert"}
          >
            {banner}
          </div>
        ) : null}

        <div
          className={`flex justify-start ${
            (status === "success" || status === "error") && banner ? "mt-3" : "mt-5"
          }`}
        >
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-md bg-primary px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {status === "loading" ? "Sending…" : widget.submitButtonLabel || "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
