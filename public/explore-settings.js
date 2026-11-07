export const highlightCopy = {
  en: "Highlight",
  fa: "هایلایت",
  ar: "تمييز",
  tr: "Vurgu",
  fr: "Surbrillance",
  ru: "Подсветка",
};

export function bindLabelsSwitch(input, details, onChange) {
  input.checked = true;
  let previous;
  input.onchange = () => {
    if (!input.checked) {
      previous = details.map((control) => control.checked);
      details.forEach((control) => {
        control.checked = false;
        control.disabled = true;
      });
    } else {
      details.forEach((control, index) => {
        control.checked = previous?.[index] ?? control.checked;
        control.disabled = false;
      });
    }
    onChange();
  };
  return () => {
    if (!input.checked) {
      input.checked = true;
      input.onchange();
    }
    input.onchange = null;
  };
}

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
