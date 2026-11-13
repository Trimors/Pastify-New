import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Rich pastes are stored as HTML from the editor. Everything is sanitized on save AND on render,
 * so a crafted API request can't inject scripts, styles, iframes or event handlers.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "blockquote", "ul", "ol", "li", "hr", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    p: ["style"],
    h1: ["style"],
    h2: ["style"],
    h3: ["style"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|right|center|justify)$/] },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { href: attribs.href ?? "#", target: "_blank", rel: "nofollow ugc noopener noreferrer" },
    }),
  },
};

export function sanitizeRich(html: string) {
  return sanitizeHtml(html, OPTIONS);
}

/** Plain-text version of a rich paste, for raw view, downloads, search and link previews. */
export function richToText(html: string) {
  const withBreaks = html
    .replace(/<\/p>\s*<\/li>/gi, "</li>")
    .replace(/<li([^>]*)>\s*<p[^>]*>/gi, "<li$1>")
    .replace(/<\/(p|h1|h2|h3|blockquote|pre|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<hr[^>]*>/gi, "\n---\n");
  const text = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
