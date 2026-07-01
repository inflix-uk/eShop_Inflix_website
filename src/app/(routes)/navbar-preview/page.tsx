import { Suspense } from "react";
import NavbarPreviewClient from "./NavbarPreviewClient";

export const metadata = {
  title: "Navbar preview",
  robots: { index: false, follow: false },
};

export default function NavbarPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Loading navbar preview…
        </div>
      }
    >
      <NavbarPreviewClient />
    </Suspense>
  );
}
