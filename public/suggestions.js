import { normalize } from "./logic.js";

export function suggestCountries(query, candidates, language, limit = 5) {
  const needle = normalize(query);
  if ([...needle].length < 2) return [];
  const collator = new Intl.Collator(language, { sensitivity: "base" });
  return candidates
    .map((country) => {
      const label = normalize(country.label);
      const variants = [label, ...country.aliases.map(normalize)];
      const score = label.startsWith(needle)
        ? 0
        : label.includes(needle)
          ? 1
          : variants.some((v) => v.startsWith(needle))
            ? 2
            : variants.some((v) => v.includes(needle))
              ? 3
              : Infinity;
      return { country, score };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort(
      (a, b) =>
        a.score - b.score || collator.compare(a.country.label, b.country.label),
    )
    .slice(0, limit)
    .map((item) => item.country);
}

export function bindCountrySuggestions(
  input,
  list,
  getCandidates,
  getLanguage,
  onSelect,
) {
  let active = -1,
    results = [];
  function close() {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
    results = [];
  }
  function choose(index) {
    const result = results[index];
    if (!result) return;
    input.value = result.label;
    close();
    onSelect(result);
  }
  function highlight(index) {
    active = index;
    [...list.children].forEach((option, i) =>
      option.setAttribute("aria-selected", String(i === active)),
    );
    const option = list.children[active];
    if (option) {
      input.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  }
  function update() {
    if (input.disabled) return close();
    results = suggestCountries(input.value, getCandidates(), getLanguage());
    active = -1;
    list.replaceChildren();
    input.removeAttribute("aria-activedescendant");
    results.forEach((result, index) => {
      const option = input.ownerDocument.createElement("div");
      option.id = "country-suggestion-" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.textContent = result.label;
      option.addEventListener("pointerdown", (e) => e.preventDefault());
      option.addEventListener("click", () => choose(index));
      list.append(option);
    });
    list.hidden = !results.length;
    input.setAttribute("aria-expanded", String(!!results.length));
  }
  input.addEventListener("input", (e) => {
    if (!e.isComposing) update();
  });
  input.addEventListener("compositionend", update);
  input.addEventListener("focus", update);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (event) => {
    if (list.hidden) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      highlight(
        event.key === "ArrowDown"
          ? (active + 1) % results.length
          : active < 0
            ? results.length - 1
            : (active - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  return { close };
}
