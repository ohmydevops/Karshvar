import fs from "node:fs";

const asset = (file) =>
  fs.readFileSync(new URL(`../public/${file}`, import.meta.url));
const logo = `data:image/svg+xml;base64,${asset("favicon.svg").toString("base64")}`;
const fonts = ["Regular", "Bold"]
  .map(
    (weight, i) =>
      `@font-face{font-family:Vazir;src:url(data:font/woff2;base64,${asset(`fonts/Vazir-${weight}.woff2`).toString("base64")});font-weight:${i ? 700 : 400}}`,
  )
  .join("");

export function socialTemplate({ lang, title, globe, article = false }) {
  const rtl = ["fa", "ar"].includes(lang);
  const brand = lang === "fa" ? "کَرشوَر" : "Karshvar";
  if (!article) return mainSocialTemplate({ lang, title, globe, rtl, brand });
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(ellipse at 20% 60%,#162b48,#0d1528 75%);color:#eef3ff;font-family:Vazir,Arial,sans-serif}
.frame{position:absolute;inset:28px;border:1px solid #2b3d5d;border-radius:24px}
.globe{position:absolute;width:500px;height:500px;left:28px;top:95px}
.brand{position:absolute;top:66px;${rtl ? "right" : "left"}:72px;display:flex;align-items:center;gap:16px;direction:${rtl ? "rtl" : "ltr"};font-size:32px;font-weight:700}
.brand img{width:64px;height:64px}
.copy{position:absolute;left:570px;right:72px;top:175px;height:340px;display:flex;flex-direction:column;justify-content:center;align-items:${rtl ? "flex-end" : "flex-start"}}
.accent{width:48px;height:4px;background:#9cbaff;border-radius:4px;margin-bottom:22px}
h1{margin:0;text-align:${rtl ? "right" : "left"};direction:${rtl ? "rtl" : "ltr"};font-size:38px;font-weight:700;line-height:1.65}
.domain{position:absolute;bottom:58px;right:72px;color:#a4b4d0;font-size:20px;letter-spacing:1px}
</style><body><div class="frame"></div><div class="brand"><img src="${logo}" alt=""/><span>${brand}</span></div><div class="globe">${globe}</div><div class="copy"><div class="accent"></div><h1>${title}</h1></div><div class="domain">karshvar.ir</div></body></html>`;
}

function mainSocialTemplate({ lang, title, globe, rtl, brand }) {
  // Draw the far side before the opaque sphere and the near side after it.
  const orbitStyle =
    'fill="none" stroke="#9cbaff" stroke-opacity=".5" stroke-width="1" transform="rotate(-25 300 300)"';
  globe = globe
    .replace(
      "</defs>",
      `</defs><ellipse cx="300" cy="300" rx="320" ry="115" ${orbitStyle}/>`,
    )
    .replace(
      "</svg>",
      `<path d="M-20 300 A320 115 0 0 0 620 300" ${orbitStyle}/><circle cx="620" cy="300" r="4" fill="#dfb65e" transform="rotate(-25 300 300)"/></svg>`,
    );
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{font-family:Vazir,Arial,sans-serif;color:#eef3ff;background:radial-gradient(ellipse at 25% 95%,#24456b 0%,#101d33 45%,#090f1d 80%)}
.stars{position:absolute;inset:0;background-image:radial-gradient(circle,#9cbaff60 1px,transparent 1.5px);background-size:86px 79px;opacity:.3;mask-image:linear-gradient(90deg,#000,transparent 90%)}
.brand{position:absolute;top:48px;right:64px;display:flex;align-items:center;gap:16px;direction:${rtl ? "rtl" : "ltr"};font-size:32px;font-weight:700}
.brand img{width:64px;height:64px}
.domain{position:absolute;top:71px;left:64px;font-size:18px;color:#a4b4d0;letter-spacing:2px}
.globe{position:absolute;left:-110px;top:150px;width:790px;height:790px;transform:rotate(-12deg)}
.globe svg{filter:drop-shadow(0 0 50px #719ed025)}
.copy{position:absolute;left:${rtl ? 620 : 680}px;right:64px;top:175px;height:310px;display:flex;justify-content:center;flex-direction:column;direction:${rtl ? "rtl" : "ltr"}}
h1{margin:0;font-size:${rtl ? 58 : 46}px;line-height:1.55;letter-spacing:${rtl ? 0 : -1}px;font-weight:700}
h1 span{color:#dfb65e}
.quiz{position:absolute;left:451px;top:232px;display:grid;place-items:center;width:80px;height:80px;border:1px solid #dfb65e88;border-radius:22px;background:#14243a;transform:rotate(9deg);color:#dfb65e;font-size:46px;font-weight:700;box-shadow:0 12px 36px #0005}
.edge{position:absolute;bottom:0;left:0;width:100%;height:5px;background:linear-gradient(90deg,#9cbaff,#9cbaff 45%,#dfb65e)}
</style><body><div class="stars"></div><div class="domain">karshvar.ir</div><div class="brand"><img src="${logo}" alt=""><span>${brand}</span></div><div class="globe">${globe}</div><div class="quiz">?</div><div class="copy"><h1>${title.replace("<br>", "<br><span>")}</span></h1></div><div class="edge"></div></body></html>`;
}
