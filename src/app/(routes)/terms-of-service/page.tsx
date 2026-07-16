import { redirect } from "next/navigation";

/** Legacy URL — canonical Terms page is `/terms-and-conditions`. */
export default function TermsOfServiceRedirectPage() {
  redirect("/terms-and-conditions/");
}
