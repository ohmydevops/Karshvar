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
  document.dispatchEvent(new Event("page-ready"));
}
