export const highlightCopy = {
  en: "Highlight countries",
  fa: "رنگی‌کردن کشورها",
  ar: "تمييز البلدان",
  tr: "Ülkeleri vurgula",
  fr: "Mettre les pays en surbrillance",
  ru: "Подсвечивать страны",
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
