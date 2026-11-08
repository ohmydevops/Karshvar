// Wait for visible page illustrations, without depending on offscreen/lazy images.
export async function revealPage() {
  const images = [...document.querySelectorAll("main img")].filter((image) => {
    const bounds = image.getBoundingClientRect();
    return (
      !image.complete &&
      image.loading !== "lazy" &&
      bounds.width > 0 &&
      bounds.top < window.innerHeight &&
      bounds.bottom > 0
    );
  });
  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          const finish = () => {
            clearTimeout(timeout);
            image.removeEventListener("load", finish);
            image.removeEventListener("error", finish);
            resolve();
          };
          const timeout = setTimeout(finish, 4000);
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          if (image.complete) finish();
        }),
    ),
  );
  // Keep the existing skeleton while text is still using temporary font metrics.
  await document.fonts?.ready;
  const root = document.documentElement;
  const skeleton = document.getElementById("pageSkeleton");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (root.hasAttribute("data-loading") && skeleton && !reduceMotion) {
    // Fade the placeholder on the compositor before releasing its layout.
    await skeleton
      .animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 120,
        easing: "ease-out",
        fill: "forwards",
      })
      .finished.catch(() => {});
    root.setAttribute("data-revealing", "");
    setTimeout(() => root.removeAttribute("data-revealing"), 200);
  }
  document.dispatchEvent(new Event("page-ready"));
}
