// Shared native dialog shell for both map settings menus. Native <dialog>
// supplies focus containment, Escape dismissal and focus restoration.
export function createSettingsDialog({
  id,
  title,
  closeLabel,
  className = "",
}) {
  const dialog = document.createElement("dialog");
  dialog.className = `explore-mobile-dialog ${className}`.trim();
  const heading = document.createElement("h2");
  heading.id = id;
  heading.textContent = title;
  dialog.setAttribute("aria-labelledby", id);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "explore-dialog-close";
  close.textContent = "×";
  close.setAttribute("aria-label", closeLabel);
  close.onclick = () => dialog.close();
  const content = document.createElement("div");
  content.className = "explore-dialog-content";
  const footer = document.createElement("div");
  footer.className = "explore-dialog-footer";
  const done = document.createElement("button");
  done.type = "button";
  done.className = "primary";
  done.textContent = closeLabel;
  done.onclick = () => dialog.close();
  footer.append(done);
  dialog.append(heading, close, content, footer);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
  document.body.append(dialog);
  return { dialog, heading, content };
}
