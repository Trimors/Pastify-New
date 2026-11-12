import "server-only";
import { createHighlighter, type Highlighter, type ThemeRegistration } from "shiki";
import { LANGUAGE_IDS } from "./languages";

const theme: ThemeRegistration = {
  name: "pastify",
  type: "dark",
  colors: { "editor.background": "#140C1B", "editor.foreground": "#F7F2FA" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#7E6F8C", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control"], settings: { foreground: "#EF3B98" } },
    { scope: ["string", "string.quoted", "string.template"], settings: { foreground: "#F07CC4" } },
    { scope: ["constant.numeric", "constant.language", "constant.character"], settings: { foreground: "#C79BFF" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#E7A6FF" } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"], settings: { foreground: "#A34DFF" } },
    { scope: ["variable.parameter"], settings: { foreground: "#F3C6E3" } },
    { scope: ["entity.name.tag"], settings: { foreground: "#EF3B98" } },
    { scope: ["entity.other.attribute-name", "support.type.property-name", "meta.object-literal.key"], settings: { foreground: "#D13BD0" } },
    { scope: ["punctuation", "meta.brace"], settings: { foreground: "#A99BB5" } },
    { scope: ["markup.heading"], settings: { foreground: "#EF3B98", fontStyle: "bold" } },
    { scope: ["markup.inserted"], settings: { foreground: "#7EE0A8" } },
    { scope: ["markup.deleted"], settings: { foreground: "#FF7A8A" } },
  ],
};

let hl: Promise<Highlighter> | null = null;

function getHighlighter() {
  hl ??= createHighlighter({ themes: [theme], langs: LANGUAGE_IDS.filter((l) => l !== "text") });
  return hl;
}

const MAX_HIGHLIGHT = 300_000;

/** Returns highlighted HTML (one <span class="line"> per line), or null for plain text. */
export async function highlight(code: string, lang: string): Promise<string | null> {
  if (lang === "text" || code.length > MAX_HIGHLIGHT) return null;
  try {
    const h = await getHighlighter();
    return h.codeToHtml(code, { lang, theme: "pastify" });
  } catch {
    return null;
  }
}
