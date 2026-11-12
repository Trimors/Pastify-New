const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string) {
  if (!code || code === "XX" || code === "unknown") return "Unknown";
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

export function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
