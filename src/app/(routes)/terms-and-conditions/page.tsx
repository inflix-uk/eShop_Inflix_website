import { redirect } from "next/navigation";

/** Legacy URL — CMS / canonical Terms page is `/terms-conditions`. */
export default function TermsAndConditionsRedirectPage() {
  redirect("/terms-conditions/");
}
