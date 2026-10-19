export function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ـ/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function matches(value, aliases) {
  const answer = normalize(value);
  return !!answer && aliases.some((name) => normalize(name) === answer);
}
export function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const persianNumbers = new Intl.NumberFormat("fa-IR-u-nu-arabext", {
  useGrouping: false,
});
export function formatNumber(value, language) {
  return language === "fa" ? persianNumbers.format(value) : String(value);
}

export function formatRatio(answered, total, language) {
  return (
    "\u2066" +
    formatNumber(answered, language) +
    " / " +
    formatNumber(total, language) +
    "\u2069"
  );
}
