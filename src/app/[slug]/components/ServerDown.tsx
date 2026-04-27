"use client";

type Props = {
  onRetry: () => void;
};

export default function ServerDown({ onRetry }: Props) {
  return (
    <div className="max-w-7xl mx-auto p-6 min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">Server is unavailable</h1>
        <p className="text-gray-600 mb-6">Please check backend/database connection and retry.</p>
        <button
          onClick={onRetry}
          className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
