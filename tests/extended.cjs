const pp = require("puppeteer-core"),
  fs = require("fs"),
  path = require("path"),
  os = require("os");
const downloadPath = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-qa-"));
const delay = (n) => new Promise((r) => setTimeout(r, n));
(async () => {
  const b = await pp.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: 1440, height: 1000 });
  const session = await p.createCDPSession();
  await session.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath,
  });
  await p.goto(
    "file://" + path.resolve(__dirname, "../index.html") + "#/leads",
  );
  const click = async (sel) => {
    await p.click(sel);
    await delay(260);
  };
  const assert = async (name, fn) => {
    if (!(await p.evaluate(fn))) throw new Error(name);
    console.log("PASS", name);
  };
  await click('[data-action="add-lead"]');
  await p.type("#new-name", "Mariam Test");
  await p.type("#new-phone", "+92 300 0001000");
  await p.type('[name="email"]', "mariam.test@example.com");
  await click('[form="add-lead-form"]');
  await assert(
    "Create lead and detect duplicate",
    () =>
      lead(1049).duplicate &&
      lead(1049).name === "Mariam Test" &&
      S.leadId === 1049 &&
      location.hash === "#/lead/1049",
  );
  await click('[data-action="resolve-duplicate"]');
  await assert("Duplicate review", () => !lead(1049).duplicate);
  await click('[data-action="lead-back"]');
  await click('[data-select="1049"]');
  await click('[data-action="bulk-status"]');
  await p.select('#bulk-status-form [name="stage"]', "Won");
  await click('[form="bulk-status-form"]');
  await assert("Bulk status update", () => lead(1049).stage === "Won");
  await click('[data-action="lead-view"][data-view="board"]');
  await assert("Inline board toggle", () => !!$(".board"));
  await click('[data-action="lead-view"][data-view="table"]');
  await click('[data-action="export-leads"]');
  await delay(500);
  console.log(
    "PASS CSV export:",
    fs.existsSync(path.join(downloadPath, "nexora-leads.csv")),
    fs
      .readFileSync(path.join(downloadPath, "nexora-leads.csv"), "utf8")
      .split("\n").length,
    "lines",
  );
  await p.evaluate(() => go("team"));
  await delay(300);
  await click('[data-action="edit-user"][data-id="a1"]');
  await p.select('#user-form [name="team"]', "Enterprise");
  await p.select('#user-form [name="status"]', "away");
  await click('[form="user-form"]');
  await assert(
    "Edit user team and status",
    () => agent("a1").team === "Enterprise" && !agent("a1").online,
  );
  await p.evaluate(() => go("distribution"));
  await delay(300);
  await click('[data-action="rule-toggle"][data-rule="campaign"]');
  await click('[data-action="rule-config"][data-rule="campaign"]');
  await p.select('#rule-form [name="c1"]', "Enterprise");
  await click('[form="rule-form"]');
  await assert(
    "Campaign routing config",
    () => S.campaignTeams.c1 === "Enterprise",
  );
  await click('[data-action="run-distribution"]');
  await assert(
    "Campaign routing honors teams",
    () => lead(1048).agent && agent(lead(1048).agent).team === "Enterprise",
  );
  await click('[data-action="theme"]');
  for (const route of [
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
  ]) {
    await p.evaluate((r) => go(r), route);
    await delay(70);
    await assert(
      "Dark route " + route,
      () =>
        document.documentElement.dataset.theme === "dark" && !!$(".main h1"),
    );
  }
  await p.setViewport({ width: 390, height: 844 });
  await p.evaluate(() => go("followups"));
  await delay(250);
  await click('[data-action="task-view"][data-view="calendar"]');
  await assert(
    "Mobile full calendar horizontally contained",
    () => document.body.scrollWidth <= innerWidth,
  );
  await p.evaluate(() => go("login"));
  await delay(250);
  await assert(
    "Mobile login without page overflow",
    () => document.body.scrollWidth <= innerWidth && !!$("#login-role"),
  );
  console.log("errors:", errs);
  await b.close();
})();
