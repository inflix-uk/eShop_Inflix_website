export type ContactWidgetFieldType =
  | "text"
  | "email"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox";

export type ContactWidgetOption = { label: string; value: string };

export type ContactWidgetField = {
  name: string;
  label: string;
  type: ContactWidgetFieldType;
  placeholder?: string;
  required?: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string;
  helpText?: string;
  options?: ContactWidgetOption[];
  showWhenField?: string;
  showWhenValue?: string;
  sortOrder?: number;
};

export type ContactUsWidgetPublic = {
  _id: string;
  isActive: boolean;
  title: string;
  description: string;
  submitButtonLabel: string;
  successMessage: string;
  fields: ContactWidgetField[];
  /** When true, POST sends `embeddedWidget` + answers (CMS block); no Mongo widget id. */
  submitAsEmbedded?: boolean;
};

export type EmbeddedContactUsSubmitShape = {
  isActive?: boolean;
  title?: string;
  description?: string;
  submitButtonLabel?: string;
  successMessage?: string;
  fields: ContactWidgetField[];
};

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  return raw ? `${raw}/` : "/";
}

export async function getContactUsWidgetPublic(): Promise<ContactUsWidgetPublic | null> {
  const url = `${apiBase()}contact-us-widget/public`;
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) return null;
    if (!json.data) return null;
    const d = json.data as ContactUsWidgetPublic;
    if (!d.fields?.length) return null;
    return d;
  } catch {
    return null;
  }
}

export async function submitContactWidget(payload: {
  widgetId?: string;
  embeddedWidget?: EmbeddedContactUsSubmitShape;
  answers: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string; errors?: Record<string, string> }> {
  const url = `${apiBase()}contact-us-widget/submit`;
  const body =
    payload.embeddedWidget && Array.isArray(payload.embeddedWidget.fields)
      ? { embeddedWidget: payload.embeddedWidget, answers: payload.answers }
      : { widgetId: payload.widgetId, answers: payload.answers };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      return { ok: true, message: typeof json.message === "string" ? json.message : undefined };
    }
    return {
      ok: false,
      message: typeof json.message === "string" ? json.message : "Submission failed",
      errors: json.errors && typeof json.errors === "object" ? json.errors : undefined,
    };
  } catch {
    return { ok: false, message: "Network error" };
  }
}
