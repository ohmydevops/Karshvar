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
      });
    } else {
      details.forEach((control, index) => {
        control.checked = previous?.[index] ?? control.checked;
        control.disabled = false;
      });
    }
    onChange();
  };
  const enableLabels = (event) => {
    if (input.checked || !event.currentTarget.checked) return;
    const selected = event.currentTarget;
    input.checked = true;
    details.forEach((control, index) => {
      control.checked = control === selected || (previous?.[index] ?? false);
    });
    onChange();
  };
  details.forEach((control) =>
    control.addEventListener?.("change", enableLabels, true),
  );
  return () => {
    details.forEach((control) =>
      control.removeEventListener?.("change", enableLabels, true),
    );
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
