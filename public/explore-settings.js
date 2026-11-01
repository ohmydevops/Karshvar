export const highlightCopy = {
  en: "Highlight",
  fa: "هایلایت",
  ar: "تمييز",
  tr: "Vurgu",
  fr: "Surbrillance",
  ru: "Подсветка",
};

export function bindHighlightSwitch(
  input,
  onChange,
  getStorage = () => localStorage,
) {
  input.checked = false;
  try {
    input.checked =
      getStorage().getItem("atlas-highlight-countries") === "true";
  } catch {}
  input.onchange = () => {
    try {
      getStorage().setItem("atlas-highlight-countries", String(input.checked));
    } catch {}
    onChange(input.checked);
  };
}
