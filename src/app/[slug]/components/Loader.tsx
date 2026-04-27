"use client";

export default function Loader() {
  return (
    <div className="max-w-7xl mx-auto p-6 animate-pulse space-y-4">
      <div className="h-8 w-1/3 bg-gray-200 rounded" />
      <div className="h-40 w-full bg-gray-200 rounded" />
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-5/6 bg-gray-200 rounded" />
    </div>
  );
}
