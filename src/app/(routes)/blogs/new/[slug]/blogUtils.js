// Utility functions for blog components

export function getFullImageUrl(imagePath) {
  if (!imagePath) return "/placeholder-blog.jpg";
  if (typeof imagePath !== "string") return "/placeholder-blog.jpg";

  const trimmedPath = imagePath.trim();
  if (!trimmedPath) return "/placeholder-blog.jpg";

  // Already-resolved and browser-safe URLs
  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://") ||
    trimmedPath.startsWith("data:") ||
    trimmedPath.startsWith("blob:")
  ) {
    return trimmedPath;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const normalizedPath = trimmedPath.replace(/^\/?uploads\//, "");

  return `${baseUrl}/uploads/${normalizedPath}`;
}
