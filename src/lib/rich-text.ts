const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h3"]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(value: string) {
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return escapeHtml(trimmed);
  return "";
}

export function sanitizeRichText(input: string) {
  if (!input) return "";

  let output = "";
  let cursor = 0;
  const tagPattern = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;

  for (const match of input.matchAll(tagPattern)) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const attrs = match[2] ?? "";
    const index = match.index ?? 0;

    output += escapeHtml(input.slice(cursor, index));
    cursor = index + fullTag.length;

    if (!ALLOWED_TAGS.has(tagName)) continue;

    const isClosing = fullTag.startsWith("</");
    if (tagName === "br") {
      output += "<br>";
      continue;
    }

    if (isClosing) {
      output += `</${tagName}>`;
      continue;
    }

    if (tagName === "a") {
      const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = safeHref(hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "");
      output += href
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
        : "<a>";
      continue;
    }

    output += `<${tagName}>`;
  }

  output += escapeHtml(input.slice(cursor));
  return output
    .replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, "")
    .trim();
}

export function isRichText(value: string) {
  return /<\/?(p|br|strong|b|em|i|u|ul|ol|li|a|h3)(\s|>|\/)/i.test(value);
}

export function richTextToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h3)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function normalizePostContent(value: string) {
  return isRichText(value) ? sanitizeRichText(value) : plainTextToHtml(value);
}
