import { redirect } from "next/navigation";

/** Legacy URL — canonical Terms page is `/terms-conditions`. */
export default function TermsOfServiceRedirectPage() {
  redirect("/terms-conditions/");
}
