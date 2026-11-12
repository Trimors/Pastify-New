export const LANGUAGES: { id: string; label: string; ext: string[] }[] = [
  { id: "text", label: "Plain text", ext: ["txt", "log"] },
  { id: "javascript", label: "JavaScript", ext: ["js", "mjs", "cjs"] },
  { id: "typescript", label: "TypeScript", ext: ["ts", "mts", "cts"] },
  { id: "jsx", label: "JSX", ext: ["jsx"] },
  { id: "tsx", label: "TSX", ext: ["tsx"] },
  { id: "python", label: "Python", ext: ["py"] },
  { id: "lua", label: "Lua", ext: ["lua", "luau"] },
  { id: "json", label: "JSON", ext: ["json"] },
  { id: "html", label: "HTML", ext: ["html", "htm"] },
  { id: "css", label: "CSS", ext: ["css"] },
  { id: "scss", label: "SCSS", ext: ["scss"] },
  { id: "bash", label: "Bash", ext: ["sh", "bash", "zsh"] },
  { id: "powershell", label: "PowerShell", ext: ["ps1"] },
  { id: "go", label: "Go", ext: ["go"] },
  { id: "rust", label: "Rust", ext: ["rs"] },
  { id: "java", label: "Java", ext: ["java"] },
  { id: "kotlin", label: "Kotlin", ext: ["kt", "kts"] },
  { id: "c", label: "C", ext: ["c", "h"] },
  { id: "cpp", label: "C++", ext: ["cpp", "cc", "hpp", "cxx"] },
  { id: "csharp", label: "C#", ext: ["cs"] },
  { id: "php", label: "PHP", ext: ["php"] },
  { id: "ruby", label: "Ruby", ext: ["rb"] },
  { id: "swift", label: "Swift", ext: ["swift"] },
  { id: "dart", label: "Dart", ext: ["dart"] },
  { id: "sql", label: "SQL", ext: ["sql"] },
  { id: "yaml", label: "YAML", ext: ["yml", "yaml"] },
  { id: "toml", label: "TOML", ext: ["toml"] },
  { id: "ini", label: "INI", ext: ["ini", "cfg", "conf", "env"] },
  { id: "xml", label: "XML", ext: ["xml", "svg"] },
  { id: "markdown", label: "Markdown", ext: ["md", "markdown"] },
  { id: "dockerfile", label: "Dockerfile", ext: ["dockerfile"] },
  { id: "diff", label: "Diff", ext: ["diff", "patch"] },
];

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);

export function languageLabel(id: string) {
  return LANGUAGES.find((l) => l.id === id)?.label ?? "Plain text";
}

export function detectLanguage(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  const ext = lower.split(".").pop() ?? "";
  return LANGUAGES.find((l) => l.ext.includes(ext))?.id ?? null;
}
