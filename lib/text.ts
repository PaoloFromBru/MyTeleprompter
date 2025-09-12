export function normalizeToken(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

