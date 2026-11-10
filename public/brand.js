// Canonical display names. Use brandName(language) for new interface copy.
export const brandNames = Object.freeze({ en: "Karshvar", fa: "کَرشوَر" });

export function brandName(language) {
  return brandNames[language] || brandNames.en;
}
