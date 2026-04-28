import { notFound } from "next/navigation";

/** Intentionally no contact page here — reserved URL returns 404. */
export default function ContactUsNotFound() {
  notFound();
}
