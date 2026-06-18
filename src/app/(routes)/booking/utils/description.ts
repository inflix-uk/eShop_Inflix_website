export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDescriptionPreview(
  description: string | undefined | null,
  fallback: string,
  maxLength = 140
): string {
  const plain = stripHtml(description || '');
  const value = plain || fallback;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function hasRichDescription(description: string | undefined | null): boolean {
  return stripHtml(description || '').length > 0;
}
