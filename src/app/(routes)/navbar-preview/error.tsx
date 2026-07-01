"use client";

export default function NavbarPreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-medium text-gray-900">Preview could not load</p>
      <p className="mt-2 text-sm text-red-600">
        {error?.message || "Internal server error"}
      </p>
      <p className="mt-3 text-xs text-gray-500">
        Stop the website dev server, run <code className="rounded bg-gray-100 px-1">npm run clean</code>{" "}
        then <code className="rounded bg-gray-100 px-1">npm run dev</code>, and open preview again from
        admin.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  );
}
