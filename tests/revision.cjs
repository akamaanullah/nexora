/* Revision 2: full-page routing, sign-in, readable typography and responsive regressions. */
const pp = require("puppeteer-core"),
  path = require("path"),
  fs = require("fs");
const base = "file://" + path.resolve(__dirname, "../index.html");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await pp.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const p = await b.newPage(),
    errors = [],
    checks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("requestfailed", (r) => errors.push(r.url()));
  const check = async (name, fn) => {
    if (!(await p.evaluate(fn))) throw Error(name);
    checks.push(name);
    console.log("PASS", name);
  };
  const click = async (s) => {
    await p.click(s);
    await wait(120);
  };
  const nav = async (r) => {
    await p.evaluate((r) => go(r), r);
    await wait(140);
  };
  try {
    await p.setViewport({ width: 1440, height: 1000 });
    await p.goto(base);
    await p.evaluate(() => document.fonts.ready);
    await check(
      "Role demo cards have been removed",
      () => !$(".login-role") && $$("#login-role option").length === 3,
    );
    await click('[data-action="toggle-password"]');
    await check(
      "Password visibility can be toggled",
      () => $("#login-password").type === "text",
    );
    await click('[data-action="toggle-password"]');
    await p.$eval("#login-email", (el) => (el.value = "invalid-address"));
    await click('#login-form [type="submit"]');
    await check(
      "Sign-in respects native email validation",
      () => !!$("#login-form") && !$("#login-email").validity.valid,
    );
    for (const role of ["Agent", "Manager", "Admin"]) {
      await nav("login");
      await p.select("#login-role", role);
      await click('#login-form [type="submit"]');
      await check(
        role + " dropdown role determines post-login view",
        () => S.role === S.loginRole && S.route === "dashboard",
      );
    }
    for (const [name, route, sel] of [
      ["Leads table", "leads", '[data-action="open-lead"]'],
      ["Kanban card", "pipeline", ".kanban-card"],
      [
        "Follow-up lead name",
        "followups",
        '.task-sub[data-action="open-lead"]',
      ],
      ["Calling queue", "workspace", '.queue-card [data-action="open-lead"]'],
      ["Activity feed", "dashboard", '.activity-item[data-action="open-lead"]'],
    ]) {
      await nav(route);
      await click(sel);
      await check(
        name + " navigates to full lead route",
        () =>
          S.route === "lead" &&
          /^#\/lead\/\d+$/.test(location.hash) &&
          !!$(".lead-page") &&
          !$(".drawer") &&
          !$(".overlay"),
      );
      await click('[data-action="lead-back"]');
      await check(
        name + " back button restores context",
        () => S.route === S.leadReturn,
      );
    }
    await nav("lead/1048");
    await p.reload();
    await wait(170);
    await check(
      "Lead route is bookmarkable and reloadable",
      () =>
        S.route === "lead" && $(".lead-hero h1").textContent === "Ahmed Raza",
    );
    await p.evaluate(() => go("lead/999999"));
    await wait(100);
    await check(
      "Unknown lead has a friendly full-page empty state",
      () =>
        !!$(".lead-not-found") &&
        $(".lead-not-found").textContent.includes("couldn’t find"),
    );
    await nav("lead/1048");
    await p.select("#role-switch", "Agent");
    await wait(150);
    await check(
      "Role switch from lead page resets to safe workspace",
      () => S.route === "dashboard",
    );
    await nav("lead/1048");
    await check(
      "Agent cannot open another agent’s record",
      () => !!$(".lead-not-found"),
    );
    await p.select("#role-switch", "Admin");
    await wait(120);
    const routes = [
      "dashboard",
      "leads",
      "pipeline",
      "followups",
      "workspace",
      "team",
      "distribution",
      "reports",
      "integrations",
      "settings",
      "lead/1048",
    ];
    const fontResults = [];
    for (const width of [1600, 1440, 1024, 768, 390, 320]) {
      await p.setViewport({ width, height: 1000 });
      for (const route of routes) {
        await nav(route);
        await check(
          width + "px /" + route + " contains page overflow",
          () => document.body.scrollWidth <= innerWidth,
        );
        const small = await p.evaluate(() => {
          const root = $(".main"),
            els = [...root.querySelectorAll("*")].filter(
              (el) =>
                !el.closest("svg") &&
                el.getClientRects().length &&
                el.childNodes.length &&
                [...el.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent.trim(),
                ),
            );
          return els
            .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12.5)
            .map((el) => ({
              tag: el.tagName,
              cls: el.className,
              size: getComputedStyle(el).fontSize,
              text: el.textContent.slice(0, 40),
            }));
        });
        const svgLabels = await p.evaluate(() =>
          [...document.querySelectorAll("svg.area-chart text")]
            .filter(
              (t) =>
                t.getClientRects().length &&
                getComputedStyle(t).display !== "none",
            )
            .map((t) => {
              const m = t.getScreenCTM();
              return (
                parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)
              );
            }),
        );
        if (svgLabels.some((n) => n < 12.5))
          throw Error(
            "Undersized rendered SVG label at " + width + " " + route,
          );
        if (small.length)
          throw Error(
            "Undersized text at " +
              width +
              " " +
              route +
              ": " +
              JSON.stringify(small),
          );
        fontResults.push({ width, route, minTextSize: "12.5px or greater" });
      }
    }
    await p.setViewport({ width: 1440, height: 1000 });
    await nav("leads");
    await check(
      "Table text is comfortably readable",
      () =>
        parseFloat(getComputedStyle($("td")).fontSize) >= 14 &&
        parseFloat(getComputedStyle(document.body).fontSize) >= 15,
    );
    await nav("lead/1048");
    await p.evaluate(() => setTheme("dark"));
    await check(
      "Dark-mode lead workspace renders rich surfaces",
      () =>
        document.documentElement.dataset.theme === "dark" &&
        !!$(".intelligence-panel"),
    );
    await p.evaluate(() => setTheme("light"));
    await check("No errors or failed assets in revision suite", () => true);
    if (errors.length) throw Error(errors.join("\n"));
    fs.writeFileSync(
      path.join(__dirname, "revision-report.json"),
      JSON.stringify(
        {
          checkedAt:
            new Date().toLocaleString("sv-SE", { timeZone: "Asia/Karachi" }) +
            " PKT (UTC+05:00)",
          checks: checks.length,
          results: checks,
          fontResults,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      checks.length +
        " revision assertions passed; " +
        fontResults.length +
        " route/viewport typography audits; zero errors.",
    );
  } catch (e) {
    console.error(e);
    await p.screenshot({
      path: path.join(__dirname, "revision-failure.png"),
      fullPage: true,
    });
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
