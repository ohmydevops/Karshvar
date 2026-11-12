// The numerical counter remains the accessible source of ammunition state.
// This cutaway magazine is decorative; all movement uses compositor properties.
export function createMagazineHUD(root) {
  if (!root) return { update() {} };
  const rounds = [...root.querySelectorAll("[data-cartridge]")];
  const body = root.querySelector(".magazine-body");
  const shell = root.querySelector(".magazine-eject");
  const view = root.ownerDocument.defaultView;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  let previousAmmo;
  let wasReloading = false;
  let bodyAnimation;
  let shellAnimation;
  const cancel = () => {
    bodyAnimation?.cancel();
    shellAnimation?.cancel();
  };
  const reducedChanged = () => {
    if (reduced.matches) cancel();
  };
  reduced.addEventListener("change", reducedChanged);

  return {
    update(ammo, reloading) {
      const remaining = Math.max(0, Math.min(30, Math.floor(ammo)));
      const loading = Boolean(reloading);
      root.dataset.ammoWarning = loading
        ? "none"
        : remaining === 0
          ? "empty"
          : remaining <= 6
            ? "low"
            : "none";
      if (remaining !== previousAmmo) {
        for (let index = 0; index < rounds.length; index++) {
          rounds[index].classList.toggle("is-loaded", index < remaining);
        }
        root.dataset.rounds = String(remaining);
      }

      if (reduced.matches) {
        cancel();
      } else if (body?.animate) {
        if (loading && !wasReloading) {
          bodyAnimation?.cancel();
          shellAnimation?.cancel();
          bodyAnimation = body.animate(
            [
              { transform: "translateY(0) rotate(-7deg)", opacity: 1 },
              { transform: "translateY(54px) rotate(-17deg)", opacity: 0.12 },
            ],
            {
              duration: 260,
              easing: "cubic-bezier(.4,0,.8,.3)",
              fill: "forwards",
            },
          );
        } else if (!loading && wasReloading) {
          bodyAnimation?.cancel();
          bodyAnimation = body.animate(
            [
              { transform: "translateY(48px) rotate(-12deg)", opacity: 0.12 },
              {
                transform: "translateY(-3px) rotate(-7deg)",
                opacity: 1,
                offset: 0.76,
              },
              { transform: "translateY(0) rotate(-7deg)", opacity: 1 },
            ],
            { duration: 300, easing: "cubic-bezier(.16,.7,.3,1)" },
          );
        } else if (
          !loading &&
          previousAmmo !== undefined &&
          remaining < previousAmmo
        ) {
          shellAnimation?.cancel();
          shellAnimation = shell?.animate(
            [
              { transform: "translate(0,0) rotate(-5deg)", opacity: 1 },
              {
                transform: "translate(19px,-14px) rotate(45deg)",
                opacity: 0.9,
                offset: 0.45,
              },
              { transform: "translate(32px,-6px) rotate(105deg)", opacity: 0 },
            ],
            { duration: 210, easing: "ease-out" },
          );
        }
      }
      previousAmmo = remaining;
      wasReloading = loading;
    },
    dispose() {
      cancel();
      reduced.removeEventListener("change", reducedChanged);
    },
  };
}
