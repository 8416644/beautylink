// A link a pro typed, made into a full web address: "instagram.com/x" gets https://.
export function normalizeLink(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Only web addresses are opened, so a saved link can never run code or open another app.
export function isWebLink(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url);
}
