/* Optional development QA. Requires puppeteer-core and a local Chrome executable.
   Run: NODE_PATH=/path/to/node_modules CHROME_PATH=/usr/bin/google-chrome node tests/smoke.cjs
   The application itself has no dependencies or build step. */
const puppeteer = require("puppeteer-core");
const path = require("path"),
  fs = require("fs");
const base = "file://" + path.resolve(__dirname, "../index.html");
const results = [],
  errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--allow-file-access-from-files",
    ],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("requestfailed", (r) => errors.push("Request failed: " + r.url()));
  const check = async (name, condition) => {
    if (!(await condition())) throw new Error(name);
    results.push({ name, status: "PASS" });
    console.log("PASS", name);
  };
  const click = async (s) => {
    await p.click(s);
    await wait(80);
  };
  const state = (fn) => p.evaluate(fn);
  const nav = async (route) => {
    await p.evaluate((r) => go(r), route);
    await p.waitForSelector(".main");
    await wait(100);
  };
  try {
    await p.goto(base);
    await p.evaluate(() => document.fonts.ready);
    await check("Opens directly from file:// with local fonts/icons", () =>
      state(
        () =>
          !!window.lucide &&
          document.fonts.status === "loaded" &&
          location.protocol === "file:",
      ),
    );
    await p.select("#login-role", "Manager");
    await check("Styled role dropdown, email and password fields", () =>
      state(
        () =>
          !!$("#login-email") &&
          $("#login-password").type === "password" &&
          $("#login-role-hint").textContent.includes("team"),
      ),
    );
    await p.select("#login-role", "Admin");
    await click('#login-form [type="submit"]');
    await check("Admin dashboard renders", () =>
      state(() => S.role === "Admin" && !!$(".welcome-banner")),
    );
    await click('[data-action="period"][data-period="month"]');
    await check("30-day lead acquisition chart toggle", () =>
      state(
        () =>
          S.period === "month" &&
          $(".chart-summary").textContent.includes("4,862"),
      ),
    );
    await nav("leads");
    await p.type("#lead-search", "Ahmed Raza");
    await wait(260);
    await check("Lead search filters names", () =>
      state(
        () =>
          filteredLeads().length === 1 &&
          $("tbody").textContent.includes("Ahmed Raza"),
      ),
    );
    await click('[data-action="reset-filters"]');
    await p.select("#filter-status", "Won");
    await check("Status filter returns matching leads", () =>
      state(
        () =>
          filteredLeads().every((l) => l.stage === "Won") &&
          filteredLeads().length > 0,
      ),
    );
    await p.select("#filter-campaign", "c1");
    await check("Campaign filter combines with status", () =>
      state(() =>
        filteredLeads().every((l) => l.campaign === "c1" && l.stage === "Won"),
      ),
    );
    await click('[data-action="reset-filters"]');
    await p.select("#filter-agent", "a1");
    await check("Agent filter works", () =>
      state(() => filteredLeads().every((l) => l.agent === "a1")),
    );
    await p.select("#filter-date", "today");
    await check("Date filter works in PKT", () =>
      state(() =>
        filteredLeads().every((l) => dateKey(l.created) === todayKey()),
      ),
    );
    await click('[data-action="reset-filters"]');
    await click('[data-action="page"][data-page="2"]');
    await check("Lead pagination changes page", () =>
      state(() => S.page === 2),
    );
    await p.select("#page-size", "20");
    await check("Page-size selector changes table", () =>
      state(() => S.pageSize === 20 && $$("tbody tr").length === 20),
    );
    await p.select("#page-size", "10");
    await click("#select-all");
    await check("Bulk select tracks all filtered leads", () =>
      state(() => S.selected.size === 48),
    );
    await click('[data-action="bulk-assign"]');
    await p.select("#assign-to", "a1");
    await click('[form="assign-form"]');
    await check("Bulk assignment mutates lead owners", () =>
      state(
        () => D.leads.every((l) => l.agent === "a1") && S.selected.size === 0,
      ),
    );
    await click('[data-action="open-lead"][data-id="1048"]');
    await check("Lead details show Facebook form answers", () =>
      state(
        () =>
          !!$(".lead-page") &&
          location.hash === "#/lead/1048" &&
          !$(".drawer") &&
          $(".form-answers").textContent.includes("Residential plot"),
      ),
    );
    await p.type(
      "#comment-form textarea",
      "Client prefers a late-afternoon site visit.",
    );
    await click('#comment-form [type="submit"]');
    await check("Comment is added to lead timeline", () =>
      state(
        () =>
          lead(1048).timeline.some((t) => t.text.includes("late-afternoon")) &&
          $(".lead-page").textContent.includes("late-afternoon"),
      ),
    );
    await click('[data-action="change-stage"]');
    await p.select("#detail-status", "Interested");
    await click('[data-action="close-modal"]');
    await check("Lead status update mutates pipeline", () =>
      state(() => lead(1048).stage === "Interested"),
    );
    await p.select("#detail-agent", "a2");
    await check("Lead reassignment updates owner", () =>
      state(() => lead(1048).agent === "a2"),
    );
    await click('[data-action="schedule"][data-id="1048"]');
    await p.type('#schedule-form [name="title"]', "Confirm private viewing");
    await click('[form="schedule-form"]');
    await check("Follow-up created and appears in timeline", () =>
      state(
        () =>
          D.tasks.some((t) => t.title === "Confirm private viewing") &&
          lead(1048).timeline.some((t) => t.type === "task"),
      ),
    );
    await click('[data-action="whatsapp"][data-id="1048"]');
    await click('[data-action="choose-template"][data-template="1"]');
    await check("Personalized WhatsApp template preview", () =>
      state(
        () =>
          $("#message-text").value.includes("Hi Ahmed") &&
          $("#message-text").value.includes("Luxury Living"),
      ),
    );
    await click('[data-action="close-modal"]');
    await click('[data-action="call"][data-id="1048"]');
    await wait(1150);
    await check("Simulated call timer runs", () =>
      state(() => $("#call-timer").textContent !== "00:00"),
    );
    await click('[data-action="call-mute"]');
    await check("Simulated call mute toggles", () => state(() => S.call.muted));
    await p.keyboard.down("Control");
    await p.keyboard.press("k");
    await p.keyboard.up("Control");
    await check("Command search cannot interrupt active call", () =>
      state(() => !!$("#call-timer") && !$("#command-input")),
    );
    await click('[data-action="end-call"]');
    await p.type(
      '#log-call-form [name="notes"]',
      "Site visit agreed for Friday.",
    );
    await click('[form="log-call-form"]');
    await check("Call disposition and notes saved", () =>
      state(() =>
        lead(1048).timeline.some(
          (t) => t.type === "call" && t.text.includes("Site visit agreed"),
        ),
      ),
    );
    await click('[data-action="detail-tab"][data-tab="calls"]');
    await check("Dedicated Calls tab shows saved disposition", () =>
      state(() =>
        $(".lead-center-column").textContent.includes("Site visit agreed"),
      ),
    );
    await click('[data-action="detail-tab"][data-tab="notes"]');
    await p.type(
      "#comment-form textarea",
      "Discuss a flexible installment plan.",
    );
    await click('#comment-form [type="submit"]');
    await check("Separate Notes tab persists an internal note", () =>
      state(() =>
        lead(1048).timeline.some(
          (t) => t.type === "note" && t.text.includes("installment"),
        ),
      ),
    );
    await click('[data-action="detail-tab"][data-tab="comments"]');
    await check("Comments tab excludes private notes", () =>
      state(
        () =>
          $(".lead-center-column").textContent.includes("late-afternoon") &&
          !$(".lead-center-column").textContent.includes(
            "flexible installment",
          ),
      ),
    );
    await click('[data-action="detail-tab"][data-tab="tasks"]');
    await check("Lead Follow-ups tab shows scheduled task", () =>
      state(() =>
        $(".lead-center-column").textContent.includes(
          "Confirm private viewing",
        ),
      ),
    );
    await p.type("#new-tag", "Priority client");
    await p.keyboard.press("Enter");
    await check("Lead tags can be added", () =>
      state(() => lead(1048).tags.includes("Priority client")),
    );
    await click('[data-action="remove-tag"][data-tag="Priority client"]');
    await check("Lead tags can be removed", () =>
      state(() => !lead(1048).tags.includes("Priority client")),
    );
    await click('[data-action="email-preview"]');
    await check("Email quick action is a safe local preview", () =>
      state(
        () =>
          $("#email-body").value.includes("Hi Ahmed") &&
          $(".modal").textContent.includes("nothing will be sent"),
      ),
    );
    await click('[data-action="close-modal"]');
    await click('[data-action="lead-stage"][data-stage="Follow-up"]');
    await check("Lead stage progress bar updates status", () =>
      state(
        () =>
          lead(1048).stage === "Follow-up" &&
          $(".stage-step.current").textContent.includes("Follow-up"),
      ),
    );
    await click('[data-action="next-lead"]');
    await check("Next lead changes the bookmarkable route", () =>
      state(() => location.hash === "#/lead/1047"),
    );
    await p.goBack();
    await wait(120);
    await check("Browser back restores the previous lead page", () =>
      state(() => location.hash === "#/lead/1048" && !!$(".lead-page")),
    );
    await click('[data-action="lead-back"]');
    await check("Lead back button returns to original inbox", () =>
      state(() => location.hash === "#/leads"),
    );
    await nav("pipeline");
    await p.evaluate(() => {
      const c = $('.kanban-card[data-id="1048"]'),
        col = $('.kanban-column[data-stage="Negotiation"]'),
        dt = new DataTransfer();
      c.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }),
      );
      col.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, dataTransfer: dt }),
      );
      col.dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer: dt }),
      );
    });
    await wait(100);
    await check("Kanban drag/drop updates stage and totals", () =>
      state(
        () =>
          lead(1048).stage === "Negotiation" &&
          !!$(
            '.kanban-column[data-stage="Negotiation"] .kanban-card[data-id="1048"]',
          ),
      ),
    );
    await nav("followups");
    await click('[data-action="task-tab"][data-tab="overdue"]');
    await click('[data-action="complete-task"]');
    await check("Task can be completed", () =>
      state(() => D.tasks.some((t) => t.done)),
    );
    await click('[data-action="task-tab"][data-tab="completed"]');
    await check("Completed task tab renders", () =>
      state(() => $$(".task-row.done").length > 0),
    );
    await click('[data-action="task-view"][data-view="calendar"]');
    await check("Full month calendar displays tasks", () =>
      state(() => !!$(".calendar-full") && $$(".calendar-event").length > 0),
    );
    await click('[data-action="calendar-next"]');
    await check("Calendar month navigation works", () =>
      state(() => S.calendarOffset === 1),
    );
    await nav("team");
    await click('[data-action="add-user"]');
    await p.type('#user-form [name="name"]', "Mariam Shah");
    await p.type('#user-form [name="email"]', "mariam@example.com");
    await click('[form="user-form"]');
    await check("Adding a team member updates cards", () =>
      state(
        () =>
          D.agents.some((a) => a.name === "Mariam Shah") &&
          $(".main").textContent.includes("Mariam Shah"),
      ),
    );
    await p.evaluate(() => {
      D.leads[0].agent = "";
      D.leads[1].agent = "";
    });
    await nav("distribution");
    await click('[data-action="run-distribution"]');
    await check("Round-robin distribution assigns unassigned leads", () =>
      state(() => !D.leads.some((l) => !l.agent)),
    );
    await click('[data-action="rule-toggle"][data-rule="workload"]');
    await check("Assignment strategy switch is mutually exclusive", () =>
      state(() => S.ruleEnabled.workload && !S.ruleEnabled.roundrobin),
    );
    await click('[data-action="rule-config"][data-rule="workload"]');
    await p.$eval('#rule-form [name="max"]', (el) => (el.value = "12"));
    await click('[form="rule-form"]');
    await check("Workload configuration saves", () =>
      state(() => S.maxWorkload === 12),
    );
    await nav("integrations");
    await click('[data-action="integration"][data-integration="whatsapp"]');
    await click('[data-action="toggle-integration"]');
    await check("Mock integration connect changes status", () =>
      state(() => S.connections.whatsapp),
    );
    await click('[data-action="connect-page"]');
    await p.type('#page-form [name="name"]', "Zain Properties · Islamabad");
    await click('[form="page-form"]');
    await check("Synthetic page can be added", () =>
      state(() => S.extraPages.includes("Zain Properties · Islamabad")),
    );
    await nav("reports");
    await click('[data-action="report-tab"][data-tab="calls"]');
    await check("Call analytics includes logged call", () =>
      state(() => $(".main").textContent.includes("Site visit agreed")),
    );
    await nav("settings");
    await p.$eval(
      '#profile-form [name="name"]',
      (el) => (el.value = "Zain Demo"),
    );
    await click('#profile-form [type="submit"]');
    await check("Profile preference is reflected in sidebar", () =>
      state(() => $(".sidebar-profile").textContent.includes("Zain Demo")),
    );
    await click('[data-action="theme"]');
    await check("Dark mode toggles and persists preference", () =>
      state(
        () =>
          document.documentElement.dataset.theme === "dark" &&
          localStorage.getItem("nexora-theme") === "dark",
      ),
    );
    await click('[data-action="theme"]');
    await click('[data-action="notifications"]');
    await check("Notifications panel opens", () =>
      state(() => !!$(".side-panel")),
    );
    await click('[data-action="mark-read"]');
    await check("Mark all read clears unread indicator", () =>
      state(() => S.notificationsRead && !$(".notification-dot")),
    );
    await p.keyboard.down("Control");
    await p.keyboard.press("k");
    await p.keyboard.up("Control");
    await p.type("#command-input", "Mariam");
    await check("Global search respects searchable data", () =>
      state(() => $("#command-results").textContent.includes("No matches")),
    );
    await p.$eval("#command-input", (el) => {
      el.value = "Ahmed";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click('[data-action="command-lead"]');
    await check("Command palette navigates to a matching lead page", () =>
      state(
        () =>
          !!$(".lead-page") &&
          location.hash.startsWith("#/lead/") &&
          !$(".command-modal"),
      ),
    );
    await p.keyboard.press("Escape");
    await p.select("#role-switch", "Agent");
    await check("Agent sidebar hides team and integrations", () =>
      state(
        () =>
          !$('.nav-item[href="#/team"]') &&
          !$('.nav-item[href="#/integrations"]'),
      ),
    );
    await nav("leads");
    await check("Agent only sees assigned leads", () =>
      state(
        () =>
          visibleLeads().every((l) => l.agent === "a1") &&
          filteredLeads().every((l) => l.agent === "a1"),
      ),
    );
    await click('[data-action="open-lead"]');
    await check("Agent cannot reassign leads", () =>
      state(() => $("#detail-agent").disabled),
    );
    await p.keyboard.press("Escape");
    await nav("dashboard");
    await check("Agent sees personal performance dashboard", () =>
      state(
        () =>
          $(".main").textContent.includes("Ayesha") &&
          $(".main").textContent.includes("My revenue"),
      ),
    );
    await p.select("#role-switch", "Manager");
    await check("Manager gets management without team admin", () =>
      state(
        () =>
          !!$('.nav-item[href="#/distribution"]') &&
          !$('.nav-item[href="#/team"]'),
      ),
    );
    await nav("team");
    await check("Restricted routes resolve to overview", () =>
      state(() => S.route === "dashboard"),
    );
    await p.select("#role-switch", "Admin");
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
    for (const route of routes) {
      await nav(route);
      await check("Desktop route /" + route, () =>
        state(() => !!$(".main h1") && document.body.scrollWidth <= innerWidth),
      );
    }
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    for (const route of routes) {
      await nav(route);
      await check("Mobile route /" + route + " has no page overflow", () =>
        state(() => document.body.scrollWidth <= innerWidth),
      );
    }
    await nav("dashboard");
    await click('[data-action="menu"]');
    await check("Mobile sidebar opens", () =>
      state(() => $(".sidebar").classList.contains("open")),
    );
    await click('[data-action="close-menu"]');
    await check(
      "No browser console or page errors",
      async () => errors.length === 0,
    );
    fs.writeFileSync(
      path.resolve(__dirname, "report.json"),
      JSON.stringify(
        {
          checkedAt:
            new Date().toLocaleString("sv-SE", { timeZone: "Asia/Karachi" }) +
            " PKT (UTC+05:00)",
          browser: "Headless Google Chrome",
          url: base,
          checks: results.length,
          results,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      `\n${results.length} checks passed; ${errors.length} browser errors.`,
    );
  } catch (e) {
    console.error(e);
    console.error("Browser errors:", errors);
    await p.screenshot({
      path: path.resolve(__dirname, "failure.png"),
      fullPage: true,
    });
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
