/* Clean previews of the unmodified demo. Requires puppeteer-core + local Chrome. */
const pp = require("puppeteer-core"),
  path = require("path"),
  fs = require("fs");
const base = "file://" + path.resolve(__dirname, "../index.html"),
  out = path.resolve(__dirname, "../screenshots");
(async () => {
  const b = await pp.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const p = await b.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  fs.mkdirSync(out, { recursive: true });
  await p.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1 });
  const shot = async (name, route = "", theme = "light") => {
    await p.goto(base + route);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate((t) => setTheme(t), theme);
    await new Promise((r) => setTimeout(r, 500));
    await p.evaluate(() =>
      document.querySelectorAll(".toast").forEach((t) => t.remove()),
    );
    await p.screenshot({ path: path.join(out, name + ".png"), fullPage: true });
    console.log(name + ".png");
  };
  try {
    await shot("login");
    await shot("dashboard", "#/dashboard");
    await shot("leads", "#/leads");
    await shot("kanban", "#/pipeline");
    await shot("lead-detail", "#/lead/1048");
    await shot("dashboard-dark", "#/dashboard", "dark");
    await shot("lead-detail-dark", "#/lead/1048", "dark");
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await shot("mobile-dashboard", "#/dashboard");
    await shot("mobile-lead-detail", "#/lead/1048");
    if (errors.length) throw Error(errors.join("\n"));
    console.log("All previews captured with zero console errors.");
  } finally {
    await b.close();
  }
})();
