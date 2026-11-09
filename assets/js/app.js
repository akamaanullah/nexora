"use strict";
const D = window.DEMO;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const S = {
  role: "Admin",
  loginRole: "Admin",
  route: "dashboard",
  leadTab: "all",
  leadView: "table",
  query: "",
  status: "",
  campaign: "",
  agent: "",
  date: "",
  page: 1,
  pageSize: 10,
  selected: new Set(),
  taskTab: "today",
  taskView: "list",
  calendarOffset: 0,
  calendarDate: "",
  leadId: null,
  leadReturn: "leads",
  detailTab: "timeline",
  theme: (() => {
    try {
      return localStorage.getItem("nexora-theme") || "light";
    } catch {
      return "light";
    }
  })(),
  period: "week",
  rule: "round-robin",
  autoAssign: true,
  slaEnabled: true,
  settingsTab: "profile",
  reportTab: "overview",
  teamFilter: "",
  notificationsRead: false,
  call: null,
  connections: {
    facebook: true,
    whatsapp: false,
    sheets: false,
    webhook: true,
  },
  ruleEnabled: { roundrobin: true, campaign: false, workload: false },
  users: [],
};
let callInterval = null,
  lastFocus = null;
const I = (name, cls = "") =>
  `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ""}></i>`;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
const av = (person, size = "") =>
  `<span class="avatar ${person.color || "violet"} ${size} ${person.online ? "online" : ""}">${esc(person.initials || initials(person.name))}</span>`;
const money = (n, full = false) =>
  full
    ? "PKR " + Number(n).toLocaleString("en-PK")
    : "PKR " +
      (n >= 1e6
        ? (n / 1e6).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + "M"
        : n >= 1e3
          ? (n / 1000).toFixed(0) + "k"
          : n);
const currency = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : (n / 1000).toFixed(0) + "k";
const number = (n) => Number(n).toLocaleString();
const campaign = (id) => D.campaigns.find((c) => c.id === id) || D.campaigns[0];
const agent = (id) => D.agents.find((a) => a.id === id);
const lead = (id) => D.leads.find((l) => l.id === Number(id));
const current = () =>
  S.profile?.[S.role] ||
  (S.role === "Agent"
    ? D.agents[0]
    : {
        name: S.role === "Manager" ? "Ali Hassan" : "Muhammad Zain",
        initials: S.role === "Manager" ? "AH" : "MZ",
        color: "violet",
        role: S.role,
        email: S.role === "Manager" ? "ali@example.com" : "zain@example.com",
        team: "Leadership",
      });
const canManage = () => S.role !== "Agent";
const visibleLeads = () =>
  S.role === "Agent" ? D.leads.filter((l) => l.agent === "a1") : D.leads;
const stages = D.stages;
const stageColors = [
  "#7048e8",
  "#267fe4",
  "#d99112",
  "#ab4ac9",
  "#e26d45",
  "#099e7c",
  "#d65370",
];
const statusClass = {
  New: "purple",
  Contacted: "blue",
  Interested: "orange",
  "Follow-up": "purple",
  Negotiation: "orange",
  Won: "green",
  Lost: "gray",
};
const statusBadge = (s) =>
  `<span class="badge ${statusClass[s] || "gray"}" data-status="${esc(s)}"><span class="dot"></span>${esc(s)}</span>`;
const scoreBadge = (l) =>
  `<span class="score ${l.temp.toLowerCase()}">${I(l.temp === "Hot" ? "flame" : l.temp === "Warm" ? "zap" : "snowflake")}${l.score}<span class="temp">${l.temp}</span></span>`;
const timeShort = (date) =>
  new Date(date).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
const dateShort = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
  });
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const dateKey = (date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const taskLead = (t) => lead(t.lead);
const myTasks = () =>
  D.tasks.filter((t) => S.role !== "Agent" || taskLead(t)?.agent === "a1");
const options = (list, selected = "", blank = "") =>
  `${blank ? `<option value="">${blank}</option>` : ""}${list
    .map((v) => {
      let [val, label] = Array.isArray(v) ? v : [v, v];
      return `<option value="${esc(val)}" ${val === selected ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("")}`;
function icons() {
  if (window.lucide) lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  requestAnimationFrame(sizeCharts);
}
/* SVG coordinate fonts otherwise shrink on narrow cards. Keep their rendered
   labels at 13 CSS pixels, regardless of the viewBox scale. */
function sizeCharts() {
  $$("svg.area-chart").forEach((svg) => {
    const width = svg.getBoundingClientRect().width;
    if (!width) return;
    const matrix = svg.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a, matrix.b) : width / 650;
    const font = 13 / scale;
    $$("text", svg).forEach((t) =>
      t.style.setProperty("font-size", font + "px", "important"),
    );
    $$('text[x="8"]', svg).forEach(
      (t) => (t.style.display = width < 480 ? "none" : ""),
    );
    $$(".chart-tooltip", svg).forEach(
      (t) => (t.style.display = width < 560 ? "none" : ""),
    );
  });
}
window.addEventListener("resize", () => requestAnimationFrame(sizeCharts));
function toast(text, warn = false) {
  const n = document.createElement("div");
  n.className = "toast" + (warn ? " warn" : "");
  n.innerHTML =
    I(warn ? "info" : "circle-check") +
    `<span>${esc(text)}</span><button class="icon-btn" aria-label="Dismiss notification">${I("x")}</button>`;
  while ($("#toast-root").children.length >= 2)
    $("#toast-root").firstElementChild.remove();
  $("#toast-root").append(n);
  n.querySelector("button").onclick = () => n.remove();
  icons();
  setTimeout(() => n.remove(), 4500);
}
function go(route) {
  closePanels();
  if (location.hash === `#/${route}`) render();
  else location.hash = "/" + route;
}
const button = (text, action, icon = "", cls = "btn-outline", extra = "") =>
  `<button class="btn ${cls}" data-action="${action}" ${extra}>${icon ? I(icon) : ""}${text}</button>`;
function heading(title, sub, actions = "", eyebrow = "YOUR GROWTH, IN FOCUS") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div><div class="page-actions">${actions}</div></div>`;
}
function miniStat(label, value, icon, color = "", sub = "") {
  return `<div class="mini-stat"><div class="stat-icon ${color}">${I(icon)}</div><div><small>${label}</small><b>${value}</b>${sub ? `<span class="muted" style="font-size:12.5px">${sub}</span>` : ""}</div></div>`;
}
function stat(
  label,
  value,
  icon,
  trend,
  color = "",
  detail = "vs. last week",
  spark = 0,
) {
  const paths = [
    "M1 23L8 18 15 21 22 13 29 17 36 10 43 13 50 7 57 10 65 2 74 4",
    "M1 23L9 23 17 18 25 19 33 10 41 14 49 9 57 10 65 5 74 3",
    "M1 24L10 21 18 22 25 15 33 18 41 9 49 12 57 7 65 10 74 3",
    "M1 5L9 9 17 5 25 13 33 9 41 16 49 13 57 19 65 17 74 24",
  ];
  return `<div class="card stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${I(icon)}</span></div><div class="stat-value">${value}</div><div class="stat-sub"><span class="trend">${I(spark === 3 ? "arrow-down-right" : "arrow-up-right")} ${trend}</span><span>${detail}</span></div><svg class="spark" viewBox="0 0 76 28"><path stroke="${["#9276ec", "#5596e5", "#48b698", "#dfa653"][spark]}" d="${paths[spark]}"/></svg></div>`;
}
function footer() {
  return `<footer class="footer"><span>© 2026 Nexora. Built for the next generation of sales.</span><span><span class="dot"></span> All systems operational <span style="margin:0 7px">·</span>Demo workspace · PKT</span></footer>`;
}
const roleHint = (r) =>
  ({
    Admin: "Full workspace access, every team and opportunity.",
    Manager: "A clear view of your team’s leads and performance.",
    Agent: "Your leads, conversations and daily momentum.",
  })[r];
function renderLogin() {
  document.title = "Welcome to Nexora";
  $("#app").innerHTML =
    `<div class="login-page"><section class="login-left"><a class="brand" href="#/login"><span class="brand-mark">${I("layers")}</span>nexora<span class="brand-dot">.</span></a><div class="login-content"><div class="eyebrow">LESS BUSYWORK. MORE BREAKTHROUGHS.</div><h1>Your next big win<br>starts here.</h1><p>Welcome to your growth workspace. Bring every lead,<br>conversation, and opportunity together.</p><form id="login-form" class="login-form" autocomplete="off"><div class="form-group"><label class="field-label" for="login-role">Workspace role</label><div class="login-input">${I("shield-check")}<select id="login-role" name="role" required>${options(["Admin", "Manager", "Agent"], S.loginRole)}</select>${I("chevron-down")}</div><p class="login-role-hint" id="login-role-hint">${roleHint(S.loginRole)}</p></div><div class="form-group"><label class="field-label" for="login-email">Email address</label><div class="login-input">${I("mail")}<input id="login-email" name="email" type="email" autocomplete="off" value="demo@example.com" placeholder="you@company.com" required></div></div><div class="form-group"><label class="field-label" for="login-password">Password</label><div class="login-input">${I("lock-keyhole")}<input id="login-password" name="password" type="password" autocomplete="off" value="demo1234" minlength="4" required><button type="button" data-action="toggle-password" class="icon-btn" aria-label="Show password">${I("eye")}</button></div></div><div class="login-options"><label><input type="checkbox" name="remember" checked> Remember role this session</label><span class="badge purple">DEMO ACCESS</span></div><button type="submit" class="btn btn-primary login-continue">Sign in ${I("arrow-right")}</button><div class="login-disclaimer">${I("shield-check")} UI demo only. Use the prefilled test credentials.<br>Nothing is sent or stored. Please don’t enter a real password.</div></form></div><div class="login-footer"><span>© 2026 Nexora</span><span>Made for meaningful connections ✦</span></div></section><section class="login-right"><span class="pill"><span class="dot" style="color:#b6a0ed"></span> YOUR PIPELINE. REIMAGINED.</span><h2>Every lead is a possibility.<br><span>Make it a success story.</span></h2><p>From the first Facebook click to the final handshake. One beautiful place to grow.</p><div class="login-art"><div class="orbit"></div><div class="orbit two"></div><div class="login-mini">${I("zap")} New Facebook lead captured</div><div class="login-mock-card"><div class="row between"><small>YOUR NEXT OPPORTUNITY</small><span class="badge orange">${I("flame")} 96 · High intent</span></div><div class="person" style="margin-top:20px">${av({ name: "Ahmed Raza" })}<div><div class="lead-name">Ahmed Raza</div><small>DHA Phase 9 · Luxury Living</small></div></div><div class="mock-grid"><div><small>DEAL VALUE</small><b>PKR 1.2M</b></div><div><small>WIN PROBABILITY</small><b>87% <span style="font-size:12.5px;color:#9be9b9">↗</span></b></div></div><div class="row between"><small>Ready for the next step</small><small>78%</small></div><div class="mock-progress"><span></span></div></div><div class="login-mini two">${I("party-popper")} Another deal. Another milestone.</div></div><div class="login-review"><div class="stars">★★★★★</div><p>“Less chasing spreadsheets.<br>More building relationships that convert.”</p><small>THE NEXORA WAY OF WORKING</small></div></section></div>`;
  icons();
}
const navGroups = () => [
  {
    label: "WORKSPACE",
    items: [
      ["dashboard", "Overview", "layout-dashboard"],
      [
        "leads",
        S.role === "Agent" ? "My leads" : "Leads inbox",
        "inbox",
        visibleLeads().length,
      ],
      ["pipeline", "Sales pipeline", "columns-3"],
      [
        "followups",
        "Follow-ups",
        "calendar-check",
        myTasks().filter((t) => !t.done && dateKey(t.due) <= todayKey()).length,
      ],
      ["workspace", "Calling workspace", "headset"],
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [["reports", "Reports & analytics", "chart-no-axes-combined"]],
  },
  ...(canManage()
    ? [
        {
          label: "MANAGEMENT",
          items: [
            ...(S.role === "Admin"
              ? [["team", "Team & members", "users"]]
              : []),
            ["distribution", "Lead distribution", "workflow"],
            ["integrations", "Integrations", "blocks"],
          ],
        },
      ]
    : []),
  { label: "PREFERENCES", items: [["settings", "Settings", "settings-2"]] },
];
const routeNames = {
  dashboard: "Overview",
  leads: "Leads inbox",
  pipeline: "Sales pipeline",
  followups: "Follow-ups",
  workspace: "Calling workspace",
  reports: "Reports & analytics",
  team: "Team & members",
  distribution: "Lead distribution",
  integrations: "Integrations",
  settings: "Settings",
  lead: "Lead details",
};
function renderShell(content) {
  const u = current(),
    animate = S.lastRoute !== S.route;
  S.lastRoute = S.route;
  $("#app").innerHTML =
    `<aside class="sidebar"><a href="#/dashboard" class="brand"><span class="brand-mark">${I("layers")}</span>nexora<span class="brand-dot">.</span></a><div class="workspace-chip"><span class="ws-icon">${I("building-2")}</span><span class="flex-1">${esc(S.workspaceName || "Zain Properties")}<small>Growth workspace</small></span><span class="badge purple" style="font-size:12.5px;padding:1px 4px">PRO</span></div><nav class="nav-links">${navGroups()
      .map(
        (g) =>
          `<div class="nav-label">${g.label}</div>${g.items.map(([r, label, icon, count]) => `<a href="#/${r}" class="nav-item ${r === S.route || (S.route === "lead" && r === "leads") ? "active" : ""}" ${r === S.route ? 'aria-current="page"' : ""}>${I(icon)}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ""}${r === "integrations" ? '<span class="badge green">LIVE</span>' : ""}</a>`).join("")}`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="upgrade-card">${I("sparkles")}<b>A little smarter. A lot further.</b><p>Meet your unfair advantage.<br>Explore Nexora Intelligence.</p><button data-action="ai-info">Discover Intelligence ${I("arrow-up-right")}</button></div><div class="sidebar-profile">${av(u)}<span class="flex-1"><span class="user-name">${esc(u.name)}</span><small style="display:block;margin-top:4px">${S.role} account</small></span><button class="icon-btn" data-action="logout" title="Back to role selection" aria-label="Back to login">${I("log-out")}</button></div></div></aside><div class="shell"><header class="topbar"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Open menu">${I("menu")}</button><div class="breadcrumb">Workspace ${I("chevron-right")} <span>${routeNames[S.route]}</span></div><button class="global-search" data-action="search">${I("search")}<span>Search anything...</span><span class="key">⌘ K</span></button><div class="topbar-right"><div class="demo-role" title="Switch demo role">${I("shield-check")}<select id="role-switch" aria-label="Demo role">${options(["Admin", "Manager", "Agent"], S.role)}</select></div><span class="topbar-sep"></span><button class="icon-btn" data-action="help" aria-label="Help & shortcuts">${I("circle-help")}</button><button class="icon-btn" data-action="theme" aria-label="Toggle ${S.theme === "light" ? "dark" : "light"} theme">${I(S.theme === "light" ? "moon" : "sun")}</button><button class="icon-btn" data-action="notifications" aria-label="Open notifications">${I("bell")}${!S.notificationsRead ? '<span class="notification-dot"></span>' : ""}</button><span class="topbar-sep"></span><button data-action="profile" title="Account settings">${av(u)}</button></div></header><main class="main ${animate ? "" : "no-motion"}">${content}${footer()}</main></div>`;
  icons();
}
function render() {
  const path = location.hash.replace(/^#\/?/, "").split("?")[0];
  const [route, id] = path.split("/");
  if (route === "lead") S.leadId = Number(id);
  if (!route || route === "login") {
    S.route = "login";
    renderLogin();
    return;
  }
  S.route = routeNames[route] ? route : "dashboard";
  if (
    (S.role === "Agent" &&
      ["team", "distribution", "integrations"].includes(S.route)) ||
    (S.role === "Manager" && S.route === "team")
  )
    S.route = "dashboard";
  document.title = `${routeNames[S.route]} · Nexora`;
  const view = {
    lead: renderLeadPage,
    dashboard: renderDashboard,
    leads: renderLeads,
    pipeline: renderPipeline,
    followups: renderFollowups,
    workspace: renderWorkspace,
    team: renderTeam,
    distribution: renderDistribution,
    reports: renderReports,
    integrations: renderIntegrations,
    settings: renderSettings,
  };
  renderShell(view[S.route]());
  if (
    S.route === "lead" &&
    lead(S.leadId) &&
    (S.role !== "Agent" || lead(S.leadId).agent === "a1")
  )
    document.title = lead(S.leadId).name + " · Nexora";
  bindDrag();
}
function areaChart(period = "week") {
  const month = period === "month";
  const labels = month
    ? [
        "Oct 14",
        "Oct 18",
        "Oct 22",
        "Oct 26",
        "Oct 30",
        "Nov 03",
        "Nov 07",
        "Nov 10",
      ]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `<svg class="area-chart" viewBox="0 0 650 215" role="img" aria-label="Leads trend: this period compared to last period"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9671ed" stop-opacity=".2"/><stop offset="1" stop-color="#9671ed" stop-opacity=".01"/></linearGradient></defs>${[25, 65, 105, 145, 185].map((y, i) => `<line class="grid" x1="38" y1="${y}" x2="630" y2="${y}"/><text x="8" y="${y + 3}">${[200, 150, 100, 50, 0][i]}</text>`).join("")}<path d="M38 155C68 155 85 133 115 143S165 170 200 132S250 133 285 105S331 143 370 114S418 139 455 101S500 115 540 85S587 106 630 65" fill="none" stroke="#d4c7f0" stroke-width="2" stroke-dasharray="5 5"/><path d="M38 152C72 155 89 105 122 117S173 146 208 103S252 118 290 74S335 98 372 56S421 83 457 47S504 58 542 25S589 60 630 20L630 185L38 185Z" fill="url(#chartFill)"/><path d="M38 152C72 155 89 105 122 117S173 146 208 103S252 118 290 74S335 98 372 56S421 83 457 47S504 58 542 25S589 60 630 20" fill="none" stroke="#8962e4" stroke-width="2.5" stroke-linecap="round"/><line x1="457" y1="25" x2="457" y2="185" stroke="#bda7ed" stroke-dasharray="4 4"/><circle cx="457" cy="47" r="5" fill="#8962e4" stroke="white" stroke-width="3"/><rect class="chart-tooltip" x="391" y="6" rx="5" width="132" height="25" fill="#2f2941"/><text class="chart-tooltip" x="457" y="22" text-anchor="middle" style="fill:white;font-size:12.5px">${month ? "Nov 01" : "Friday"} · 168 leads</text>${labels.map((d, i) => `<text x="${38 + (i * 592) / (labels.length - 1)}" y="207" text-anchor="${i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}">${d}</text>`).join("")}</svg>`;
}
function donut() {
  return `<div class="donut-container"><svg viewBox="0 0 140 140" role="img" aria-label="Leads by campaign: Luxury Living 42%, Bahria 28%, Business Bay 18%, Other 12%"><circle cx="70" cy="70" r="53" fill="none" stroke="var(--bg)" stroke-width="14"/>${[
    [42, "#8661e9", 0],
    [28, "#b8a0ed", 42],
    [18, "#64bec2", 70],
    [12, "#edbd7a", 88],
  ]
    .map(
      ([p, c, o]) =>
        `<circle cx="70" cy="70" r="53" fill="none" stroke="${c}" stroke-width="14" stroke-dasharray="${p * 3.33 - 3} ${333 - p * 3.33 + 3}" stroke-dashoffset="${-o * 3.33}" stroke-linecap="round"/>`,
    )
    .join(
      "",
    )}</svg><div class="donut-text"><b>1,284</b><small>TOTAL LEADS</small></div></div>`;
}
function renderDashboard() {
  if (S.role === "Agent") return renderAgentDashboard();
  let totals = visibleLeads();
  return (
    heading(
      "A little clarity. A lot of possibility.",
      "Here’s what’s happening with your leads today, " +
        (S.role === "Manager" ? "Ali" : "Muhammad") +
        ".",
      button("This week", "date-picker", "calendar-days") +
        button("Export report", "export", "download") +
        button("Add lead", "add-lead", "plus", "btn-primary"),
    ) +
    `<div class="welcome-banner"><div><h2>Your pipeline is looking promising. ✨</h2><p>You have <b>${totals.filter((l) => l.temp === "Hot" && l.stage !== "Won").length} high-intent leads</b> ready for a conversation.<br>Your team is one great connection away from its next win.</p></div><div class="banner-graphic"><div class="float-badge"><span class="check">${I("check")}</span><span>Deal successfully closed<small>A little progress, every day.</small></span></div><div class="float-badge two">${I("trending-up")} <b>+24.8%</b> more possibilities</div><span class="banner-star">${I("sparkles")}</span></div><button class="btn btn-white" data-action="hot-leads">Explore hot leads ${I("arrow-right")}</button></div><div class="stats-grid">${stat("New leads today", "128", "inbox", "18.6%", "", "vs. yesterday", 0)}${stat("Conversion rate", "24.8%", "chart-no-axes-combined", "4.2%", "blue", "vs. last week", 1)}${stat("Revenue generated", "PKR 8.42M", "wallet", "12.8%", "teal", "vs. last week", 2)}${stat("Avg. response time", "2m 34s", "timer", "32%", "orange", "faster this week", 3)}</div><div class="insight-strip"><span class="insight-icon">${I("alarm-clock")}</span><span><b>Let’s not keep opportunity waiting.</b> <span class="red">5 leads</span> have exceeded the 15-minute response SLA.</span><span class="spacer"></span><button class="text-btn" data-action="sla-leads">Review leads ${I("arrow-right")}</button></div><div class="analytics-grid"><section class="card"><div class="card-head"><div><h3>Lead acquisition</h3><p>More connections. More opportunities.</p></div><div class="row"><div class="chart-legend"><span><i class="dot" style="color:#8962e4"></i>This week</span><span><i class="dot" style="color:#d4c7f0"></i>Last week</span></div><div class="segmented"><button data-action="period" data-period="week" class="${S.period === "week" ? "active" : ""}">7D</button><button data-action="period" data-period="month" class="${S.period === "month" ? "active" : ""}">30D</button></div></div></div><div class="chart-summary"><div><b>${S.period === "month" ? "4,862" : "1,284"}</b><small>Total leads</small></div><div><b class="green">+18.6%</b><small>Growth</small></div></div><div style="padding:0 18px 0 8px">${areaChart(S.period)}</div><div class="chart-bottom"><span>${I("info")} All connected Facebook pages · PKT</span><button class="text-btn" data-action="nav" data-route="reports">View report ${I("arrow-up-right")}</button></div></section><section class="card"><div class="card-head"><div><h3>Your pipeline, at a glance</h3><p>Every stage is a step forward.</p></div><button class="icon-btn" data-action="nav" data-route="pipeline" aria-label="Open pipeline">${I("arrow-up-right")}</button></div><div class="funnel">${[
      ["New leads", 1284, 100],
      ["Contacted", 982, 83],
      ["Interested", 746, 67],
      ["Follow-up", 524, 52],
      ["Negotiation", 386, 39],
      ["Won", 318, 28],
    ]
      .map(
        ([label, n, p], i) =>
          `<div class="funnel-row"><span class="secondary">${label}</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${p}%;background:${["#8d6ce5", "#4e91df", "#d5a03e", "#ad67c4", "#de8767", "#159c7d"][i]}">${Math.round((n / 1284) * 100)}%</div></div><b>${number(n)}</b></div>`,
      )
      .join(
        "",
      )}</div><div class="conversion-note"><span>${I("trending-up")} 24.8% lead-to-win conversion</span><b>+4.2% ↗</b></div></section></div><div class="bottom-grid"><section class="card"><div class="card-head"><div><h3>The people making it happen ${I("trophy")}</h3><p>A little healthy competition goes a long way.</p></div><button class="text-btn" data-action="nav" data-route="reports">View all</button></div><div class="leader-list">${[D.agents[2], D.agents[0], D.agents[4], D.agents[1]].map((a, i) => `<div class="leader-row"><span class="leader-rank ${i === 0 ? "gold" : ""}">${i === 0 ? I("crown") : String(i + 1).padStart(2, "0")}</span>${av(a)}<div><div class="user-name">${a.name}</div><small style="font-size:12.5px">${[28, 24, 21, 18][i]} deals won <span style="margin:0 3px">·</span><span class="green">${[32, 28, 25, 22][i]}% conversion</span></small></div><div class="leader-score">${["2.8", "2.4", "1.9", "1.6"][i]}M<small>PKR revenue</small></div></div>`).join("")}</div></section><section class="card"><div class="card-head"><div><h3>Momentum, in real time</h3><p>The latest from your workspace.</p></div><span class="badge green" style="font-size:12.5px"><span class="dot pulse"></span> LIVE</span></div><div class="activity-list">${D.activity
      .slice(0, 4)
      .map(
        (a) =>
          `<button class="activity-item" data-action="open-lead" data-id="${a.lead}" style="text-align:left;width:100%"><span class="activity-icon ${a.type}">${I({ won: "trophy", task: "calendar-check", new: "inbox", call: "phone" }[a.type] || "message-square")}</span><span><p><b>${esc(a.name)}</b> ${esc(a.action)} <b>${esc(a.subject)}</b>${a.amount ? ` <span class="green">${a.amount}</span>` : ""}</p><small>${a.time}</small></span></button>`,
      )
      .join(
        "",
      )}</div></section><section class="card sources-card"><div class="card-head"><div><h3>Where possibilities begin</h3><p>Leads by campaign</p></div>${I("pie-chart")}</div>${donut()}<div class="source-legend">${[
      ["Luxury Living", "42%", "#8661e9"],
      ["Bahria New Launch", "28%", "#b8a0ed"],
      ["Business Bay", "18%", "#64bec2"],
      ["Other campaigns", "12%", "#edbd7a"],
    ]
      .map(
        ([n, p, c]) =>
          `<div class="source-item"><span class="dot" style="color:${c}"></span>${n}<b>${p}</b></div>`,
      )
      .join(
        "",
      )}</div></section></div><div class="sync-strip"><span class="fb-logo">f</span><b style="font-weight:500">Facebook Lead Ads</b><span class="dot pulse"></span><span>Connected · Last synced just now</span><span class="muted">|</span><span class="muted">3 pages · 6 active lead forms</span><span class="flex-1"></span><button class="text-btn" data-action="sync">${I("refresh-cw")} Sync now</button></div><div class="content-note">${I("info")} Dashboard charts show illustrative historical demo data. Leads, tasks and pipeline views reflect your live demo edits.</div>`
  );
}
function filteredLeads() {
  return visibleLeads().filter((l) => {
    if (S.leadTab === "unassigned" && l.agent) return false;
    if (S.leadTab === "hot" && l.temp !== "Hot") return false;
    if (S.leadTab === "duplicates" && !l.duplicate) return false;
    if (
      S.leadTab === "sla" &&
      (l.stage !== "New" || (Date.now() - new Date(l.created)) / 60000 <= 15)
    )
      return false;
    const q = S.query.toLowerCase();
    return (
      (!q ||
        `${l.name} ${l.email} ${l.phone} ${l.id} ${campaign(l.campaign).name}`
          .toLowerCase()
          .includes(q)) &&
      (!S.status || l.stage === S.status) &&
      (!S.campaign || l.campaign === S.campaign) &&
      (!S.agent || (S.agent === "none" ? !l.agent : l.agent === S.agent)) &&
      (!S.date ||
        (S.date === "today"
          ? dateKey(l.created) === todayKey()
          : Date.now() - new Date(l.created) <= Number(S.date) * 86400000))
    );
  });
}
function filters(board = false) {
  return `<div class="${board ? "pipeline-toolbar" : "filters"}"><label class="search-field">${I("search")}<input id="lead-search" placeholder="Search by name, phone or email..." value="${esc(S.query)}" aria-label="Search leads"></label><select class="filter-select" id="filter-status" aria-label="Filter by status">${options(stages, S.status, "All statuses")}</select><select class="filter-select" id="filter-campaign" aria-label="Filter by campaign">${options(
    D.campaigns.map((c) => [c.id, c.short]),
    S.campaign,
    "All campaigns",
  )}</select>${canManage() ? `<select class="filter-select" id="filter-agent" aria-label="Filter by agent">${options([["none", "Unassigned"], ...D.agents.map((a) => [a.id, a.name])], S.agent, "All agents")}</select>` : ""}${
    !board
      ? `<select class="filter-select" id="filter-date" aria-label="Filter by date">${options(
          [
            ["today", "Today"],
            ["7", "Last 7 days"],
            ["30", "Last 30 days"],
          ],
          S.date,
          "Any date",
        )}</select>`
      : ""
  }${S.query || S.status || S.campaign || S.agent || S.date ? '<button class="filter-reset" data-action="reset-filters" title="Clear filters">Reset</button>' : ""}${!board ? `<div class="view-toggle"><button class="${S.leadView === "table" ? "active" : ""}" data-action="lead-view" data-view="table">${I("list")} Table</button><button class="${S.leadView === "board" ? "active" : ""}" data-action="lead-view" data-view="board">${I("columns-3")} Board</button></div>` : '<span class="flex-1"></span><span class="mobile-board-hint">' + I("move") + " Drag leads to move stages</span>"}</div>`;
}
function renderLeads() {
  const all = visibleLeads(),
    rows = filteredLeads();
  return (
    heading(
      S.role === "Agent"
        ? "Your next great conversation."
        : "Every connection starts here.",
      "Capture, qualify, and nurture. Give every lead the attention it deserves.",
      button("Export leads", "export-leads", "download") +
        button("Add lead", "add-lead", "plus", "btn-primary"),
      "LEADS INBOX",
    ) +
    `<div class="lead-summary">${miniStat("Total leads", all.length, "users-round")}${miniStat("High-intent leads", all.filter((l) => l.temp === "Hot").length, "flame", "orange")}${miniStat(canManage() ? "Awaiting assignment" : "Follow-ups due", canManage() ? all.filter((l) => !l.agent).length : myTasks().filter((t) => !t.done).length, canManage() ? "user-round-plus" : "calendar-clock", "blue")}${miniStat("Active pipeline", money(all.filter((l) => !["Won", "Lost"].includes(l.stage)).reduce((v, l) => v + l.value, 0)), "wallet", "teal")}</div><div class="tabs">${[["all", "All leads", all.length], ...(canManage() ? [["unassigned", "Unassigned", all.filter((l) => !l.agent).length]] : []), ["hot", "High intent", all.filter((l) => l.temp === "Hot").length], ["duplicates", "Possible duplicates", all.filter((l) => l.duplicate).length], ...(S.leadTab === "sla" ? [["sla", "SLA breached", all.filter((l) => l.stage === "New").length]] : [])].map(([id, label, count]) => `<button class="tab ${S.leadTab === id ? "active" : ""}" data-action="lead-tab" data-tab="${id}">${label}<span class="tab-count">${count}</span></button>`).join("")}</div><section class="card">${filters()}${S.selected.size ? `<div class="bulk-bar">${I("check-check")}<b>${S.selected.size} leads selected</b><span class="spacer"></span>${canManage() ? button("Assign to agent", "bulk-assign", "user-round-plus", "btn-primary btn-sm") : ""}${button("Update status", "bulk-status", "refresh-cw", "btn-soft btn-sm")}<button class="text-btn" data-action="clear-selected">Clear</button></div>` : ""}${S.leadView === "board" ? `<div style="padding:17px">${boardHTML(rows)}</div>` : leadTable(rows)}</section><div class="content-note">${I("shield-check")} Your demo data stays in this browser session. Actions don’t contact real people or external services.</div>`
  );
}
function leadTable(rows) {
  const start = (S.page - 1) * S.pageSize,
    pages = Math.max(1, Math.ceil(rows.length / S.pageSize));
  if (S.page > pages) S.page = pages;
  const list = rows.slice((S.page - 1) * S.pageSize, S.page * S.pageSize);
  return `<div class="table-toolbar"><span><b>${rows.length} leads</b><small> · Keep the right conversations moving</small></span><span class="row"><span class="muted" style="font-size:12.5px">Sorted by newest</span><button class="icon-btn" data-action="sort-leads" title="Toggle newest / oldest" aria-label="Toggle lead sort">${I("arrow-down-up")}</button></span></div><div class="table-scroll"><table><thead><tr><th><input type="checkbox" id="select-all" aria-label="Select all filtered leads" ${rows.length && rows.every((l) => S.selected.has(l.id)) ? "checked" : ""}></th><th>Lead name ${I("chevron-down")}</th><th>Lead score</th><th>Campaign / source</th><th>Status</th><th>Assigned to</th><th>Deal value</th><th>Created</th><th></th></tr></thead><tbody>${
    list.length
      ? list
          .map((l) => {
            const a = agent(l.agent),
              c = campaign(l.campaign);
            return `<tr class="${S.selected.has(l.id) ? "selected" : ""}"><td><input type="checkbox" data-select="${l.id}" aria-label="Select ${esc(l.name)}" ${S.selected.has(l.id) ? "checked" : ""}></td><td><button class="person lead-link" data-action="open-lead" data-id="${l.id}" style="text-align:left;padding:0">${av({ name: l.name, color: ["violet", "pink", "blue", "orange", "teal"][l.id % 5] })}<span><span class="lead-name">${esc(l.name)}${l.duplicate ? `<span class="duplicate-icon" title="Possible duplicate detected">${I("copy")}</span>` : ""}</span><small>${esc(l.phone)}</small></span></button></td><td>${scoreBadge(l)}</td><td><div class="campaign-name">${c.short}</div><div class="campaign-sub"><span class="tag"><i>${l.source === "Facebook" ? "f" : "◎"}</i> ${l.source} Lead Ads</span></div></td><td>${statusBadge(l.stage)}</td><td>${a ? `<span class="person">${av(a, "sm")}<span class="user-name" style="font-size:12.5px">${a.name.split(" ")[0]} ${a.name.split(" ")[1][0]}.</span></span>` : `<button class="unassigned" data-action="assign-lead" data-id="${l.id}" ${!canManage() ? "disabled" : ""}>${I("user-round-plus")} Assign lead</button>`}</td><td style="font-weight:600;color:var(--text)">${money(l.value)}</td><td><span style="font-size:12.5px">${dateShort(l.created)}</span>${l.stage === "New" ? slaBadge(l) : `<div style="font-size:12.5px;color:var(--muted);margin-top:5px">${timeShort(l.created)} PKT</div>`}</td><td><button class="icon-btn" data-action="open-lead" data-id="${l.id}" aria-label="View ${esc(l.name)}">${I("arrow-up-right")}</button></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="9"><div class="empty">${I("search-x")}<h3>No leads found</h3><p>Try a different search or clear your filters.</p><button class="btn btn-soft mt-16" data-action="reset-filters">Clear filters</button></div></td></tr>`
  }</tbody></table></div><div class="table-footer"><span>Showing ${rows.length ? (S.page - 1) * S.pageSize + 1 : 0}–${Math.min(S.page * S.pageSize, rows.length)} of ${rows.length} leads</span><div class="pagination"><button data-action="page" data-page="${S.page - 1}" ${S.page <= 1 ? "disabled" : ""} aria-label="Previous page">${I("chevron-left")}</button>${Array.from({ length: pages }, (_, i) => `<button data-action="page" data-page="${i + 1}" class="${S.page === i + 1 ? "active" : ""}" aria-label="Page ${i + 1}">${i + 1}</button>`).join("")}<button data-action="page" data-page="${S.page + 1}" ${S.page >= pages ? "disabled" : ""} aria-label="Next page">${I("chevron-right")}</button></div><select class="filter-select" id="page-size" aria-label="Rows per page" style="padding:6px 9px;font-size:12.5px">${options(
    [
      [10, "10 / page"],
      [20, "20 / page"],
      [50, "50 / page"],
    ],
    S.pageSize,
  )}</select></div>`;
}
function slaBadge(l) {
  const mins = Math.max(
    1,
    Math.floor((Date.now() - new Date(l.created)) / 60000),
  );
  return `<span class="sla ${mins > 15 ? "overdue" : ""}">${I("timer")} ${mins > 15 ? mins - 15 + "m overdue" : 15 - mins + "m SLA left"}</span>`;
}
function boardHTML(rows) {
  return `<div class="board-scroll"><div class="board">${stages
    .map((s, i) => {
      const ls = rows.filter((l) => l.stage === s);
      return `<section class="kanban-column" data-stage="${s}" style="--stage-color:${stageColors[i]}"><div class="column-head"><span class="dot" style="color:${stageColors[i]}"></span>${s}<span class="count">${ls.length}</span><span class="flex-1"></span><button class="icon-btn" data-action="add-lead" data-stage="${s}" style="height:20px;width:20px" aria-label="Add lead to ${s}">${I("plus")}</button></div><div class="column-total"><b>${money(ls.reduce((t, l) => t + l.value, 0))}</b> · total value</div><div class="column-cards">${ls
        .map((l) => {
          const a = agent(l.agent);
          return `<article class="kanban-card" draggable="true" data-id="${l.id}" data-action="open-lead" tabindex="0" role="button" aria-label="Open ${esc(l.name)} lead page; use the stage selector to move stage"><div class="row between"><span class="tag"><i>${l.source === "Facebook" ? "f" : "◎"}</i>${l.source}</span>${scoreBadge(l)}</div><div class="person">${av({ name: l.name, color: ["violet", "pink", "blue", "orange", "teal"][l.id % 5] })}<div><span class="lead-name">${esc(l.name)}</span><small>${esc(l.city)}</small></div></div><div class="kanban-value">${money(l.value)}</div><div class="campaign-sub">${campaign(l.campaign).short}</div>${l.stage === "New" ? slaBadge(l) : ""}${l.duplicate ? `<span class="badge orange" style="font-size:12.5px;margin-top:8px">${I("copy")} Possible duplicate</span>` : ""}<div class="kanban-bottom"><span>${I("message-square")} ${l.timeline.filter((t) => t.type === "comment").length} <span style="margin:0 3px">·</span> ${I("calendar-clock")} ${D.tasks.filter((t) => t.lead === l.id && !t.done).length}</span><span class="row" style="gap:5px">${a ? av(a) : I("user-round-plus")}${a ? a.name.split(" ")[0] : "Unassigned"}</span></div></article>`;
        })
        .join(
          "",
        )}</div><button class="add-board" data-action="add-lead" data-stage="${s}">${I("plus")} Add opportunity</button></section>`;
    })
    .join("")}</div></div>`;
}
function renderPipeline() {
  const all = visibleLeads(),
    active = all.filter((l) => !["Won", "Lost"].includes(l.stage));
  return (
    heading(
      "Good things are moving forward.",
      "A clear view of every opportunity, from first hello to final handshake.",
      button("Pipeline guide", "pipeline-guide", "circle-help") +
        button("New opportunity", "add-lead", "plus", "btn-primary"),
      "SALES PIPELINE",
    ) +
    `<div class="pipeline-top"><div class="card"><span class="stat-icon">${I("layers-2")}</span><span><small>Active opportunities</small><b>${active.length}</b></span></div><div class="card"><span class="stat-icon teal">${I("wallet")}</span><span><small>Pipeline value</small><b>${money(active.reduce((t, l) => t + l.value, 0))}</b></span></div><div class="card"><span class="stat-icon orange">${I("trophy")}</span><span><small>Won this period</small><b>${money(all.filter((l) => l.stage === "Won").reduce((t, l) => t + l.value, 0))}</b></span></div><div class="card"><span class="stat-icon blue">${I("target")}</span><span><small>Average deal size</small><b>${money(active.reduce((t, l) => t + l.value, 0) / (active.length || 1))}</b></span></div></div>${filters(true)}${boardHTML(filteredLeads())}<div class="kanban-footer"><span class="row">${I("move")} Drag a card between stages to update it instantly.</span><span>${visibleLeads().length} opportunities · Values in PKR</span></div>`
  );
}
/* Lead detail is a genuine, bookmarkable page. No overlay or drawer. */
function openLead(id) {
  const l = lead(id);
  if (!l || (S.role === "Agent" && l.agent !== "a1")) {
    toast("This lead is outside your demo workspace.", true);
    return;
  }
  if (S.route !== "lead")
    S.leadReturn = S.route === "login" ? "leads" : S.route;
  S.detailTab = "timeline";
  go("lead/" + l.id);
}
function leadTimeline(items) {
  return items
    .slice()
    .reverse()
    .map(
      (t) =>
        `<article class="timeline-item"><span class="activity-icon ${t.type}">${I({ new: "inbox", score: "sparkles", comment: "message-square", note: "sticky-note", call: "phone", status: "arrow-right-left", assign: "user-round-plus", task: "calendar-check", won: "trophy" }[t.type] || "circle-dot")}</span><div class="flex-1"><div class="timeline-title">${{ new: "A new connection", score: "Lead intelligence", comment: "Comment added", note: "Private note", call: "Call logged", status: "Pipeline updated", assign: "Owner updated", task: "Follow-up activity", won: "A milestone worth celebrating" }[t.type] || "Workspace activity"}</div><p>${esc(t.text)}</p><small>${esc(t.by || "Nexora automation")} <span>·</span> ${dateShort(t.at)}, ${timeShort(t.at)} PKT</small></div></article>`,
    )
    .join("");
}
function detailComposer() {
  return `<form id="comment-form" class="composer"><div class="composer-label">${av(current(), "sm")}<b>${S.detailTab === "notes" ? "Capture a useful detail" : "Keep the conversation in context"}</b></div><textarea name="comment" aria-label="${S.detailTab === "notes" ? "Add a note" : "Add a comment"}" placeholder="${S.detailTab === "notes" ? "What would you like to remember about this lead?" : "Share an update, a thought, or the next step…"}" required maxlength="1500"></textarea><div class="composer-footer"><span>${I(S.detailTab === "notes" ? "lock-keyhole" : "users")} ${S.detailTab === "notes" ? "Internal workspace note" : "Visible to your team"}</span><button type="submit" class="btn btn-primary btn-sm">${S.detailTab === "notes" ? "Save note" : "Add comment"} ${I("arrow-up")}</button></div></form>`;
}
function renderLeadPage() {
  const l = lead(S.leadId);
  if (!l || (S.role === "Agent" && l.agent !== "a1"))
    return `<section class="card empty lead-not-found">${I("file-question")}<h1>${l ? "This lead belongs to another workspace." : "We couldn’t find that lead."}</h1><p>${l ? "Switch roles to explore the full team pipeline." : "Try another lead from your inbox."}</p>${button("Back to leads", "nav", "arrow-left", "btn-primary mt-16", 'data-route="leads"')}</section>`;
  const c = campaign(l.campaign),
    a = agent(l.agent),
    idx = stages.indexOf(l.stage),
    tasks = D.tasks.filter((t) => t.lead === l.id),
    calls = l.timeline.filter((t) => t.type === "call"),
    tags =
      l.tags || (l.tags = [l.temp + " intent", l.source, "Property investor"]);
  const items = l.timeline.filter(
    (t) =>
      S.detailTab === "timeline" ||
      (S.detailTab === "comments"
        ? t.type === "comment"
        : S.detailTab === "notes"
          ? t.type === "note"
          : S.detailTab === "calls"
            ? t.type === "call"
            : false),
  );
  return `<div class="lead-page"><div class="lead-page-crumb"><button data-action="lead-back" class="lead-back">${I("arrow-left")} Back to ${esc(routeNames[S.leadReturn] || "leads")}</button><span class="crumb-slash">/</span><span>LEAD-${l.id}</span><span class="flex-1"></span><button class="icon-btn" data-action="previous-lead" aria-label="Previous lead">${I("chevron-left")}</button><button class="icon-btn" data-action="next-lead" aria-label="Next lead">${I("chevron-right")}</button></div>
 <section class="card lead-hero"><div class="lead-hero-main"><div class="person">${av({ name: l.name, color: "violet" }, "lg")}<div><div class="eyebrow">ONE CONNECTION. A WORLD OF POSSIBILITY.</div><h1>${esc(l.name)}</h1><p>${esc(l.company)} <span>·</span> ${esc(l.city)} <span>·</span> Captured ${dateShort(l.created)}</p></div></div><div class="lead-hero-metrics"><div class="lead-value"><small>Opportunity value</small><strong>${money(l.value)}</strong>${statusBadge(l.stage)}</div><div class="lead-score-ring" style="--score:${l.score}%;background:conic-gradient(var(--primary) 0% ${l.score}%,var(--border) ${l.score}%)"><div>${l.score}<small>SCORE</small></div></div></div></div><div class="lead-quick-actions">${button("Start call", "call", "phone", "btn-primary", `data-id="${l.id}"`)}${button("WhatsApp", "whatsapp", "message-circle", "whatsapp", `data-id="${l.id}"`)}${button("Email", "email-preview", "mail", "btn-outline", `data-id="${l.id}"`)}${button("Follow-up", "schedule", "calendar-plus", "btn-outline", `data-id="${l.id}"`)}<span class="flex-1"></span>${button("Change status", "change-stage", "arrow-right-left", "btn-outline")}${canManage() ? button(a ? "Reassign" : "Assign lead", "assign-lead", "user-round-plus", "btn-soft", `data-id="${l.id}"`) : ""}</div></section>
 <div class="lead-stage-track" aria-label="Sales pipeline stage progress">${stages.map((stage, i) => `<button data-action="lead-stage" data-stage="${stage}" class="stage-step ${i < idx && idx !== 6 ? "complete" : ""} ${stage === l.stage ? "current" : ""}" style="--step-color:${stageColors[i]}" ${stage === l.stage ? 'aria-current="step"' : ""}><span class="stage-step-icon">${I(i < idx && idx !== 6 ? "check" : stage === "Won" ? "trophy" : stage === "Lost" ? "x" : "circle")}</span><span>${stage}</span>${i < 6 ? I("chevron-right") : ""}</button>`).join("")}</div>
 <div class="lead-page-grid"><aside class="lead-left-column"><section class="card detail-panel"><div class="panel-heading"><h3>${I("contact-round")} Contact profile</h3><span class="badge ${l.temp === "Hot" ? "red" : l.temp === "Warm" ? "orange" : "blue"}">${I(l.temp === "Hot" ? "flame" : "zap")} ${l.temp}</span></div><dl class="profile-list"><div><dt>Phone number</dt><dd>${esc(l.phone)}</dd></div><div><dt>Email address</dt><dd>${esc(l.email)}</dd></div><div><dt>Location</dt><dd>${esc(l.city)}</dd></div><div><dt>Lead type</dt><dd>${esc(l.company)}</dd></div></dl></section><section class="card detail-panel"><div class="panel-heading"><h3><span class="fb-logo">f</span> Facebook form</h3></div><div class="form-origin">${esc(c.form)}<span class="badge green">Submitted</span></div><dl class="profile-list form-answers"><div><dt>Interested in</dt><dd>${esc(l.interest)}</dd></div><div><dt>Budget range</dt><dd>${esc(l.budget)}</dd></div><div><dt>Purchase timeline</dt><dd>${esc(l.purchase)}</dd></div><div><dt>Preferred contact</dt><dd>Phone / WhatsApp</dd></div></dl></section><section class="card detail-panel campaign-panel"><div class="panel-heading"><h3>${I("megaphone")} Campaign attribution</h3></div><div class="campaign-art"><span class="campaign-orbit"></span>${I("building-2")}<span>${esc(c.short)}</span></div><dl class="profile-list"><div><dt>Campaign</dt><dd>${esc(c.name)}</dd></div><div><dt>Ad creative</dt><dd>${esc(c.ad)}</dd></div><div><dt>Lead source</dt><dd><span class="tag"><i>${l.source === "Facebook" ? "f" : "◎"}</i>${l.source} Lead Ads</span></dd></div></dl></section></aside>
 <section class="card lead-center-column"><div class="lead-content-heading"><div><h2>The story so far.</h2><p>Every touchpoint, in one thoughtful place.</p></div><span class="badge gray">${l.timeline.length} updates</span></div><nav class="lead-content-tabs" aria-label="Lead activity sections">${[
   ["timeline", "Activity timeline", "activity"],
   ["comments", "Comments", "message-square"],
   ["calls", "Calls", "phone"],
   ["tasks", "Follow-ups", "calendar-clock"],
   ["notes", "Notes", "sticky-note"],
 ]
   .map(
     ([id, title, ic]) =>
       `<button class="${S.detailTab === id ? "active" : ""}" data-action="detail-tab" data-tab="${id}" ${S.detailTab === id ? 'aria-current="page"' : ""}>${I(ic)}${title}${id === "calls" && calls.length ? `<span>${calls.length}</span>` : ""}</button>`,
   )
   .join(
     "",
   )}</nav><div class="lead-center-body">${["timeline", "comments", "notes"].includes(S.detailTab) ? detailComposer() : `<div class="detail-tab-intro"><div><h3>${S.detailTab === "calls" ? "Better conversations start with context." : "A little planning goes a long way."}</h3><p>${S.detailTab === "calls" ? "Call outcomes, notes, and the moments that matter." : "Keep every promise and next step in view."}</p></div>${S.detailTab === "calls" ? button("Log call", "log-call", "plus", "btn-soft", `data-id="${l.id}"`) : button("Schedule", "schedule", "plus", "btn-soft", `data-id="${l.id}"`)}</div>`}${S.detailTab === "tasks" ? (tasks.length ? `<div class="lead-task-list">${tasks.map(taskRow).join("")}</div>` : leadEmpty("calendar-check", "A clear calendar. A fresh start.", "Schedule your next conversation and keep the momentum going.", "Schedule a follow-up", "schedule", l.id)) : `<div class="timeline-date">${S.detailTab === "timeline" ? "RECENT ACTIVITY" : S.detailTab === "calls" ? "CALL HISTORY" : S.detailTab === "notes" ? "INTERNAL NOTES" : "TEAM CONVERSATIONS"}</div>${items.length ? leadTimeline(items) : leadEmpty(S.detailTab === "calls" ? "phone" : S.detailTab === "notes" ? "sticky-note" : "messages-square", S.detailTab === "calls" ? "Your next hello starts here." : S.detailTab === "notes" ? "Make room for a useful detail." : "Start a meaningful conversation.", S.detailTab === "calls" ? "Log your first call to start building the story." : "Add your first update using the box above.", S.detailTab === "calls" ? "Log a call" : "", S.detailTab === "calls" ? "log-call" : "", l.id)}`}</div></section>
 <aside class="lead-right-column"><section class="card detail-panel"><div class="panel-heading"><h3>${I("user-round-check")} Lead owner</h3>${canManage() ? `<button class="text-btn" data-action="assign-lead" data-id="${l.id}">${a ? "Change" : "Assign"}</button>` : ""}</div>${a ? `<div class="person owner-person">${av(a)}<div><b>${esc(a.name)}</b><small>${esc(a.team)} team <span>·</span> ${a.online ? "Available" : "Away"}</small></div></div>` : `<div class="unassigned-owner">${I("user-round-plus")} This lead is waiting for its person.</div>`}<label class="field-label" for="detail-agent">Assigned to</label><select class="field" id="detail-agent" ${!canManage() ? "disabled" : ""}>${options(
   D.agents.map((a) => [a.id, a.name]),
   l.agent,
   "Unassigned",
 )}</select></section><section class="card intelligence-panel"><div class="intelligence-mark">${I("sparkles")}</div><div class="eyebrow">NEXORA INTELLIGENCE</div><h3>A smarter next step.</h3><p>${l.stage === "Won" ? "Celebrate the win. Send a thoughtful thank-you and ask about a referral." : l.temp === "Hot" ? `${esc(l.name.split(" ")[0])} is showing strong purchase intent. Offer a personalized site visit and a payment plan.` : "Keep the relationship warm. Share a helpful property guide and ask about their ideal timeline."}</p><div class="suggestion-reason">${I("badge-check")} ${l.score}/100 intent score <span>·</span> ${l.purchase}</div><button class="btn btn-primary" data-action="whatsapp" data-id="${l.id}">Use quick message ${I("arrow-up-right")}</button><small>Rule-based demo suggestion</small></section><section class="card detail-panel"><div class="panel-heading"><h3>${I("timer")} Response health</h3><span class="dot ${l.stage === "New" ? "orange" : "green"}"></span></div>${l.stage === "New" ? `<div class="sla-readout">${slaBadge(l)}</div><p class="panel-copy">First response target: 15 minutes. A timely hello makes all the difference.</p>` : `<div class="sla-healthy">${I("circle-check")} Conversation started</div><p class="panel-copy">Keep the momentum going with a thoughtful next step.</p>`}<div class="response-progress"><span style="width:${l.stage === "New" ? "78" : "100"}%"></span></div></section><section class="card detail-panel"><div class="panel-heading"><h3>${I("fingerprint")} Lead quality</h3></div>${l.duplicate ? `<div class="duplicate-warning">${I("copy")} Possible duplicate detected</div><p class="panel-copy">A similar phone number exists on another record. Review before contacting.</p><button class="btn btn-outline btn-sm" data-action="resolve-duplicate" data-id="${l.id}">Mark as unique ${I("check")}</button>` : `<div class="sla-healthy">${I("shield-check")} No duplicates flagged</div><p class="panel-copy">This lead is ready for a personal connection.</p>`}</section><section class="card detail-panel"><div class="panel-heading"><h3>${I("tags")} Tags & segments</h3></div><div class="lead-tags">${tags.map((t) => `<span class="lead-tag">${esc(t)}<button data-action="remove-tag" data-tag="${esc(t)}" aria-label="Remove ${esc(t)} tag">${I("x")}</button></span>`).join("")}</div><div class="tag-input"><input id="new-tag" aria-label="New lead tag" placeholder="Add a tag…" maxlength="30"><button class="icon-btn" data-action="add-tag" aria-label="Add tag">${I("plus")}</button></div></section></aside></div></div>`;
}
function leadEmpty(icon, title, copy, cta = "", action = "", id = "") {
  return `<div class="empty detail-empty"><span class="empty-illustration">${I(icon)}</span><h3>${title}</h3><p>${copy}</p>${cta ? button(cta, action, "plus", "btn-soft mt-16", `data-id="${id}"`) : ""}</div>`;
}
function emailPreview(id) {
  const l = lead(id);
  modal(
    "A thoughtful note. Ready when you are.",
    "Email preview only — nothing will be sent.",
    `<div class="form-group"><label class="field-label">To</label><input class="field" value="${esc(l.name)} &lt;${esc(l.email)}&gt;" readonly></div><div class="form-group"><label class="field-label">Subject</label><input class="field" value="Your next step with ${esc(campaign(l.campaign).short)}"></div><label class="field-label" for="email-body">Message</label><textarea id="email-body" class="field" style="min-height:200px">${esc(`Hi ${l.name.split(" ")[0]},\n\nThank you for your interest in ${campaign(l.campaign).short}. I would love to help you find the right opportunity. Shall we arrange a quick conversation or a private site visit?\n\nBest,\n${current().name}\nZain Properties`)}</textarea><p class="form-help">Local demo composition. Copy the message if you’d like to use it elsewhere.</p>`,
    button("Close", "close-modal") +
      button("Copy message", "copy-email", "copy", "btn-primary"),
  );
}
async function copyLocalText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Nothing has been sent.");
  } catch {
    const el = $("#email-body");
    el?.select();
    toast("Select the text and press Ctrl/⌘+C to copy.", true);
  }
}

function record(l, type, text) {
  l.timeline.push({
    type,
    text,
    at: new Date().toISOString(),
    by: current().name,
  });
  D.activity.unshift({
    name: current().name,
    action: text,
    lead: l.id,
    subject: l.name,
    time: "Just now",
    type,
  });
}
function setStage(l, stage) {
  if (l.stage === stage) return;
  const old = l.stage;
  l.stage = stage;
  record(
    l,
    stage === "Won" ? "won" : "status",
    `Stage changed from ${old} → ${stage}`,
  );
  if (stage === "Won") toast("A new win. A new milestone. Congratulations! 🎉");
  else toast(`${l.name} moved to ${stage}`);
}
function bindDrag() {
  let dragged = false;
  $$(".kanban-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragged = true;
      S.dragged = Number(card.dataset.id);
      e.dataTransfer.setData("text/plain", card.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      $$(".drag-over").forEach((c) => c.classList.remove("drag-over"));
      setTimeout(() => (dragged = false), 100);
    });
    card.addEventListener("click", (e) => {
      if (dragged) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    });
  });
  $$(".kanban-column").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove("drag-over");
    });
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      const l = lead(e.dataTransfer.getData("text/plain"));
      if (l && (S.role !== "Agent" || l.agent === "a1")) {
        setStage(l, col.dataset.stage);
        render();
      }
      S.dragged = null;
    });
  });
}
function taskRow(t) {
  const l = taskLead(t);
  if (!l) return "";
  const overdue = !t.done && dateKey(t.due) < todayKey();
  return `<div class="task-row ${t.done ? "done" : ""}"><button class="task-check" data-action="complete-task" data-id="${t.id}" aria-label="${t.done ? "Reopen" : "Complete"} ${esc(t.title)}">${t.done ? I("check") : ""}</button><div class="flex-1"><div class="task-title">${esc(t.title)}</div><button class="task-sub lead-link" data-action="open-lead" data-id="${l.id}">${esc(l.name)} <span style="margin:0 5px">·</span>${campaign(l.campaign).short}</button></div>${t.priority === "High" ? '<span class="badge orange">High</span>' : ""}<span class="task-time ${overdue ? "red" : ""}">${overdue ? "Overdue · " : ""}${timeShort(t.due)} PKT</span><button class="icon-btn" data-action="call" data-id="${l.id}" aria-label="Call ${esc(l.name)}">${I("phone")}</button></div>`;
}
function renderFollowups() {
  const ts = myTasks(),
    counts = {
      today: ts.filter((t) => !t.done && dateKey(t.due) === todayKey()).length,
      overdue: ts.filter((t) => !t.done && dateKey(t.due) < todayKey()).length,
      upcoming: ts.filter((t) => !t.done && dateKey(t.due) > todayKey()).length,
      completed: ts.filter((t) => t.done).length,
    };
  const filter = ts
    .filter((t) =>
      S.calendarDate
        ? dateKey(t.due) === S.calendarDate
        : S.taskTab === "completed"
          ? t.done
          : !t.done &&
            (S.taskTab === "today"
              ? dateKey(t.due) === todayKey()
              : S.taskTab === "overdue"
                ? dateKey(t.due) < todayKey()
                : dateKey(t.due) > todayKey()),
    )
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  return (
    heading(
      "Show up at the right moment.",
      "A thoughtful follow-up can turn a possibility into a partnership.",
      button("New follow-up", "schedule", "plus", "btn-primary"),
      "FOLLOW-UPS & TASKS",
    ) +
    `<div class="lead-summary">${miniStat("Due today", counts.today, "calendar-check")}${miniStat("Need a little attention", counts.overdue, "alarm-clock", "orange")}${miniStat("Coming up next", counts.upcoming, "calendar-clock", "blue")}${miniStat("Small wins completed", counts.completed, "circle-check", "teal")}</div><div class="row between mb-16"><div class="tabs" style="margin:0;flex:1">${[
      ["today", "Today"],
      ["overdue", "Overdue"],
      ["upcoming", "Upcoming"],
      ["completed", "Completed"],
    ]
      .map(
        ([id, n]) =>
          `<button class="tab ${S.taskTab === id && !S.calendarDate ? "active" : ""}" data-action="task-tab" data-tab="${id}">${n}<span class="tab-count">${counts[id]}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="view-toggle" style="margin-bottom:8px"><button class="${S.taskView === "list" ? "active" : ""}" data-action="task-view" data-view="list">${I("list")} List</button><button class="${S.taskView === "calendar" ? "active" : ""}" data-action="task-view" data-view="calendar">${I("calendar-days")} Calendar</button></div></div>${S.taskView === "calendar" ? `<section class="card calendar-full"><div class="card-head"><h3>Your month, thoughtfully planned</h3><div class="row"><button class="icon-btn" data-action="calendar-prev" aria-label="Previous month">${I("chevron-left")}</button><b style="font-size:12.5px">${calendarMonth()}</b><button class="icon-btn" data-action="calendar-next" aria-label="Next month">${I("chevron-right")}</button></div></div>${calendarHTML(true)}</section>` : `<div class="task-layout"><section class="card"><div class="card-head"><div><h3>${S.calendarDate ? dateShort(S.calendarDate + "T12:00:00") : S.taskTab === "today" ? "Today’s little priorities" : S.taskTab === "overdue" ? "Let’s pick up where we left off" : S.taskTab === "completed" ? "Progress worth celebrating" : "A little forward thinking"}</h3><p>${filter.length} ${S.taskTab === "completed" ? "completed" : "scheduled"} follow-ups · All times PKT</p></div>${S.calendarDate ? '<button class="text-btn" data-action="clear-task-date">Clear date</button>' : I("list-checks")}</div>${filter.length ? filter.map(taskRow).join("") : `<div class="empty">${I("calendar-check")}<h3>You’re all caught up.</h3><p>A little breathing room for your next big win.</p>${button("Create a follow-up", "schedule", "plus", "btn-soft mt-16")}</div>`}</section><div class="stack" style="gap:20px"><section class="card"><div class="card-head"><h3>${calendarMonth()}</h3><span class="row"><button class="icon-btn" data-action="calendar-prev" aria-label="Previous month">${I("chevron-left")}</button><button class="icon-btn" data-action="calendar-next" aria-label="Next month">${I("chevron-right")}</button></span></div>${calendarHTML()}</section><section class="card"><div class="card-head"><h3>A little rhythm goes a long way.</h3>${I("sparkles")}</div><div class="card-body"><p class="secondary" style="font-size:12.5px;line-height:1.9">Follow up within 24 hours of your first conversation. The best relationships start with consistency.</p><div class="ai-card" style="margin-bottom:0"><div class="row">${I("trending-up")} Keep your momentum</div><p>Your follow-ups are the bridge between “interested” and “let’s do this.”</p></div></div></section></div></div>`}`
  );
}
function calDate() {
  let n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + S.calendarOffset, 1);
}
function calendarMonth() {
  return calDate().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
function calendarHTML(full = false) {
  const d = calDate(),
    pad = (d.getDay() + 6) % 7,
    max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `<div class="calendar"><div class="calendar-week">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => `<span>${w}</span>`).join("")}</div><div class="calendar-grid">${Array.from({ length: pad }, () => '<div class="calendar-day blank"></div>').join("")}${Array.from(
    { length: max },
    (_, i) => {
      const day = i + 1,
        dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        ts = myTasks().filter((t) => dateKey(t.due) === dt && !t.done);
      return `<button class="calendar-day ${dt === todayKey() ? "today" : ""} ${ts.length ? "has-task" : ""}" data-action="calendar-day" data-date="${dt}" title="${ts.length} follow-ups"><span>${day}</span>${
        full
          ? ts
              .slice(0, 3)
              .map(
                (t) =>
                  `<span class="calendar-event">${esc(taskLead(t)?.name)} · ${timeShort(t.due)}</span>`,
              )
              .join("")
          : ""
      }</button>`;
    },
  ).join("")}</div></div>`;
}
function targetCard() {
  const a = D.agents[0];
  return `<section class="card"><div class="card-head"><div><h3>Your daily north star</h3><p>A little progress, every conversation.</p></div><span class="stat-icon orange">${I("target")}</span></div><div class="card-body">${[
    ["Calls made", a.calls, 60, "#8661e9"],
    ["Meaningful conversations", 18, 25, "#5b9dde"],
    [
      "Follow-ups completed",
      myTasks().filter((t) => t.done).length + 6,
      10,
      "#48b59c",
    ],
  ]
    .map(
      ([n, v, t, c]) =>
        `<div class="target-row"><div class="row"><span>${n}</span><b>${v}<small> / ${t}</small></b></div><div class="progress"><span style="width:${Math.min(100, (v / t) * 100)}%;background:${c}"></span></div></div>`,
    )
    .join(
      "",
    )}<div class="ai-card" style="margin-bottom:0"><div class="row">${I("flame")} 5-day momentum streak</div><p>Keep showing up. Your next milestone is just around the corner.</p></div></div></section>`;
}
function queuePanel() {
  const queue = visibleLeads()
      .filter((l) => !["Won", "Lost"].includes(l.stage))
      .sort((a, b) => {
        const skips = S.skipIds || [];
        return skips.includes(a.id) - skips.includes(b.id) || b.score - a.score;
      }),
    l = queue[0];
  if (!l)
    return `<section class="card"><div class="empty">${I("party-popper")}<h3>Your queue is clear.</h3><p>New opportunities will appear here.</p></div></section>`;
  return `<section class="card queue-card"><div class="row between"><span class="badge purple">${I("sparkles")} YOUR NEXT BEST CONVERSATION</span><span class="muted" style="font-size:12.5px">${queue.length} in queue</span></div><div class="lead-profile">${av({ name: l.name }, "lg")}<div><h2>${esc(l.name)}</h2><p>${esc(l.city)} · ${esc(l.company)}</p></div><span class="flex-1"></span>${scoreBadge(l)}</div><div class="value-tiles"><div><small>Deal potential</small><b>${money(l.value)}</b></div><div><small>Pipeline stage</small><b>${l.stage}</b></div><div><small>Purchase timeline</small><b>${l.purchase}</b></div></div><div class="ai-card"><div class="row">${I("lightbulb")} Here’s your conversation starter</div><p>“Hi ${esc(l.name.split(" ")[0])}, thank you for your interest in ${campaign(l.campaign).short}. I’d love to understand what you’re looking for.”</p></div><div class="row">${button("Start a conversation", "call", "phone", "btn-primary", `data-id="${l.id}"`)}${button("View lead", "open-lead", "arrow-up-right", "btn-outline", `data-id="${l.id}"`)}<button class="text-btn" style="margin-left:auto" data-action="skip-queue" data-id="${l.id}">Skip for now ${I("skip-forward")}</button></div></section>`;
}
function renderWorkspace() {
  const q = visibleLeads()
    .filter((l) => !["Won", "Lost"].includes(l.stage))
    .sort((a, b) => {
      const skips = S.skipIds || [];
      return skips.includes(a.id) - skips.includes(b.id) || b.score - a.score;
    });
  return (
    heading(
      "One conversation can change everything.",
      "Your focused calling space. The right lead, the right context, the right moment.",
      button("Call history", "call-history", "history"),
      "CALLING WORKSPACE",
    ) +
    `${canManage() ? '<div class="role-banner">' + I("info") + " Team queue preview. Switch to Agent in the top bar to see a personal calling workspace.</div>" : ""}<div class="workspace-layout"><div class="stack" style="gap:20px">${queuePanel()}<section class="card"><div class="card-head"><div><h3>Up next in your queue</h3><p>Prioritized by lead score and purchase intent</p></div><span class="badge gray">${q.length} leads</span></div><div class="queue-list">${q
      .slice(1, 6)
      .map(
        (l, i) =>
          `<div class="queue-item"><span class="muted" style="font-size:12.5px;width:12px">${i + 2}</span>${av({ name: l.name, color: ["blue", "pink", "teal", "orange"][i % 4] })}<div><button class="lead-name lead-link" data-action="open-lead" data-id="${l.id}">${esc(l.name)}</button><small>${campaign(l.campaign).short} · ${l.stage}</small></div>${scoreBadge(l)}<button class="icon-btn" data-action="call" data-id="${l.id}" aria-label="Call ${esc(l.name)}">${I("phone")}</button></div>`,
      )
      .join(
        "",
      )}</div></section></div><div class="stack" style="gap:20px">${targetCard()}<section class="card"><div class="card-head"><h3>Quick conversation templates</h3>${I("messages-square")}</div><div class="card-body">${[
      ["An introduction", "Make a warm first impression."],
      ["A thoughtful follow-up", "Pick up the conversation, naturally."],
      ["The next step", "Invite them to a site visit."],
    ]
      .map(
        ([t, s], i) =>
          `<button class="template-option" data-action="template-preview" data-template="${i}"><b>${t}</b><p>${s} ${I("arrow-up-right")}</p></button>`,
      )
      .join("")}</div></section></div></div>`
  );
}
function renderAgentDashboard() {
  return (
    heading(
      "Make today a little more remarkable, Ayesha.",
      "Your conversations, your progress, your next great opportunity.",
      button("My leads", "nav", "inbox", "btn-outline", 'data-route="leads"') +
        button(
          "Start calling",
          "nav",
          "phone",
          "btn-primary",
          'data-route="workspace"',
        ),
      "YOUR PERSONAL WORKSPACE",
    ) +
    `<div class="welcome-banner"><div><h2>Great relationships start with showing up. ✨</h2><p>You have <b>${visibleLeads().filter((l) => l.temp === "Hot").length} high-intent leads</b> ready for your attention.<br>One thoughtful conversation at a time. You’ve got this.</p></div><button class="btn btn-white" data-action="nav" data-route="workspace">Let’s make a connection ${I("arrow-right")}</button></div><div class="stats-grid">${stat("My active leads", visibleLeads().filter((l) => !["Won", "Lost"].includes(l.stage)).length, "inbox", "12.4%", "", "this week", 0)}${stat("Calls made today", D.agents[0].calls, "phone", "8 more", "blue", "than yesterday", 1)}${stat("My revenue", "PKR 2.4M", "wallet", "18.2%", "teal", "vs. last week", 2)}${stat("Follow-ups due", myTasks().filter((t) => !t.done).length, "calendar-clock", "On track", "orange", "keep it going", 3)}</div><div class="workspace-layout"><div class="stack" style="gap:20px">${queuePanel()}<section class="card"><div class="card-head"><h3>Your next little priorities</h3><button class="text-btn" data-action="nav" data-route="followups">View all</button></div>${
      myTasks()
        .filter((t) => !t.done)
        .slice(0, 3)
        .map(taskRow)
        .join("") || '<div class="empty">You’re all caught up.</div>'
    }</section></div>${targetCard()}</div>`
  );
}
function renderTeam() {
  const users = [...D.agents, ...S.users],
    visible = users.filter(
      (a) =>
        (!S.teamFilter || a.team === S.teamFilter) &&
        (!S.teamQuery ||
          `${a.name} ${a.email}`
            .toLowerCase()
            .includes(S.teamQuery.toLowerCase())),
    );
  return (
    heading(
      "Great things happen together.",
      "A shared vision. A little individual brilliance. One exceptional team.",
      button("Add member", "add-user", "user-round-plus", "btn-primary"),
      "TEAM & MEMBERS",
    ) +
    `<div class="lead-summary">${miniStat("Team members", users.length + 2, "users")}${miniStat("Online right now", users.filter((a) => a.online).length, "radio", "teal")}${miniStat("Active teams", 2, "network", "blue")}${miniStat("Team conversion", "24.8%", "trending-up", "orange")}</div><div class="tabs"><button class="tab active" data-action="noop">All members <span class="tab-count">${users.length}</span></button><button class="tab" data-action="team-leadership">Leadership <span class="tab-count">2</span></button></div><div class="team-filter"><label class="search-field" style="max-width:300px;flex:1">${I("search")}<input id="team-search" value="${esc(S.teamQuery || "")}" placeholder="Find a teammate..." aria-label="Search team"></label><select class="filter-select" id="team-filter" aria-label="Filter by team">${options(["Growth", "Enterprise"], S.teamFilter, "All teams")}</select></div><div class="team-grid">${
      visible
        .map((a) => {
          const ls = D.leads.filter((l) => l.agent === a.id);
          return `<section class="card team-card"><div class="row between">${av(a)}<span class="badge ${a.online ? "green" : "gray"}"><span class="dot"></span>${a.online ? "Active" : "Away"}</span><button class="icon-btn" data-action="edit-user" data-id="${a.id}" aria-label="Edit ${esc(a.name)}">${I("ellipsis")}</button></div><h3>${esc(a.name)}</h3><p>${esc(a.email)}</p><div class="row" style="gap:6px;margin-top:12px"><span class="badge purple">${esc(a.role)}</span><span class="badge gray">${esc(a.team)}</span></div><div class="team-metrics"><div><b>${ls.length}</b><small>Assigned leads</small></div><div><b>${ls.filter((l) => l.stage === "Won").length}</b><small>Won deals</small></div><div><b>${a.calls || 0}</b><small>Calls today</small></div></div><div class="row between"><small style="font-size:12.5px">Daily call target</small><b style="font-size:12.5px">${Math.round(((a.calls || 0) / (a.target || 60)) * 100)}%</b></div><div class="progress" style="margin-top:9px"><span style="width:${Math.min(100, ((a.calls || 0) / (a.target || 60)) * 100)}%"></span></div><button class="btn btn-outline btn-sm" style="width:100%;margin-top:19px" data-action="agent-leads" data-id="${a.id}">View assigned leads ${I("arrow-up-right")}</button></section>`;
        })
        .join("") ||
      `<section class="card empty" style="grid-column:1/-1">${I("users")}<h3>No teammates match this search.</h3></section>`
    }</div>`
  );
}
function renderDistribution() {
  return (
    heading(
      "The right lead. The right person.",
      "Let thoughtful rules do the busywork, so your team can do what it does best.",
      button("Run distribution", "run-distribution", "play", "btn-primary"),
      "LEAD DISTRIBUTION",
    ) +
    `<div class="role-banner">${I("info")} Demo rules apply locally when you click “Run distribution.” No external lead routing is active.</div><div class="report-grid"><div><div class="card mb-16"><div class="card-head"><div><h3>Your assignment strategy</h3><p>Choose one strategy for incoming, unassigned leads.</p></div><span class="badge green">${D.leads.filter((l) => !l.agent).length} awaiting assignment</span></div></div>${[
      [
        "roundrobin",
        "Round-robin",
        "rotate-cw",
        "Give everyone a fair share. Distribute new leads evenly across available agents.",
        "Available agents only · Balanced rotation",
      ],
      [
        "campaign",
        "Campaign-based routing",
        "megaphone",
        "Match leads with specialists. Route the right campaigns to the teams that know them best.",
        "Luxury Living → Growth · Overseas → Enterprise",
      ],
      [
        "workload",
        "Workload balancing",
        "scale",
        "Protect your team’s focus. Assign new opportunities to agents with the lightest active pipeline.",
        "Active leads considered · Maximum 15 per agent",
      ],
    ]
      .map(
        ([id, t, ic, desc, meta]) =>
          `<section class="card rule-card"><span class="rule-icon">${I(ic)}</span><div class="flex-1"><h3>${t}</h3><p>${desc}</p><div class="rule-meta">${I("sliders-horizontal")} ${meta}</div><button class="text-btn" style="margin-top:14px" data-action="rule-config" data-rule="${id}">Configure rule ${I("arrow-right")}</button></div><button class="switch ${S.ruleEnabled[id] ? "on" : ""}" role="switch" aria-checked="${S.ruleEnabled[id]}" data-action="rule-toggle" data-rule="${id}" aria-label="Enable ${t}"></button></section>`,
      )
      .join(
        "",
      )}</div><div class="stack" style="gap:20px"><section class="card"><div class="card-head"><h3>A balanced team is a better team.</h3>${I("chart-no-axes-column-increasing")}</div><div class="card-body">${D.agents
      .map((a) => {
        const n = D.leads.filter(
          (l) => l.agent === a.id && !["Won", "Lost"].includes(l.stage),
        ).length;
        return `<div class="target-row"><div class="row">${av(a, "sm")}<span>${a.name}</span><b style="margin-left:auto">${n}<small> / 15</small></b></div><div class="progress"><span style="width:${(n / 15) * 100}%"></span></div></div>`;
      })
      .join(
        "",
      )}</div></section><section class="card"><div class="card-head"><h3>A little safety net</h3>${I("shield-check")}</div><div class="card-body"><div class="setting-row" style="padding-top:0"><div><h4>SLA reminder</h4><p>Flag uncontacted leads after 15 minutes.</p></div><button class="switch ${S.slaEnabled ? "on" : ""}" data-action="sla-toggle" role="switch" aria-checked="${S.slaEnabled}" aria-label="SLA reminder"></button></div><div class="setting-row"><div><h4>Skip unavailable agents</h4><p>Only assign to active team members.</p></div><button class="switch ${S.autoAssign ? "on" : ""}" data-action="auto-toggle" role="switch" aria-checked="${S.autoAssign}" aria-label="Skip unavailable agents"></button></div><p class="form-help" style="margin-top:17px">All rule changes take effect on the next demo distribution run.</p></div></section></div></div>`
  );
}
function renderReports() {
  const own = S.role === "Agent";
  return (
    heading(
      own
        ? "Your impact, beautifully clear."
        : "A little insight. A smarter next move.",
      own
        ? "Your performance, your wins, and the conversations that make a difference."
        : "Go beyond the numbers. Understand what’s working and where to grow.",
      button("Last 30 days", "report-range", "calendar-days") +
        button("Export report", "export", "download", "btn-primary"),
      "REPORTS & ANALYTICS",
    ) +
    `<div class="tabs">${[
      ["overview", "Performance overview"],
      ["campaigns", "Campaign ROI"],
      ["calls", "Call analytics"],
    ]
      .map(
        ([id, t]) =>
          `<button class="tab ${S.reportTab === id ? "active" : ""}" data-action="report-tab" data-tab="${id}">${t}</button>`,
      )
      .join(
        "",
      )}</div><div class="stats-grid">${stat("Total conversions", own ? "24" : "318", "trophy", "18.4%", "", "vs. previous period", 0)}${stat("Revenue generated", own ? "PKR 2.4M" : "PKR 8.42M", "wallet", "12.8%", "teal", "vs. previous period", 2)}${stat("Cost per acquisition", "PKR 2,154", "mouse-pointer-2", "14.6%", "blue", "lower than last month", 3)}${stat("Return on ad spend", "12.3×", "trending-up", "2.4×", "orange", "vs. previous period", 1)}</div>${S.reportTab === "calls" ? renderCallAnalytics() : S.reportTab === "campaigns" ? campaignReport() : `<div class="report-grid"><section class="card"><div class="card-head"><div><h3>${own ? "Your weekly rhythm" : "Your team, moving forward"}</h3><p>Calls and meaningful conversations</p></div><div class="chart-legend"><span><i class="dot purple"></i>Calls</span><span><i class="dot" style="color:#d8ccf7"></i>Connected</span></div></div><div class="bar-chart">${(own ? ["Mon", "Tue", "Wed", "Thu", "Fri"] : D.agents.map((a) => a.name.split(" ")[0])).map((a, i) => `<div class="bar-group"><div class="bar" style="height:${[76, 62, 89, 49, 71][i]}%" title="${[48, 36, 52, 29, 41][i]} calls"></div><div class="bar second" style="height:${[44, 37, 64, 29, 48][i]}%" title="${[28, 22, 38, 18, 29][i]} conversations"></div><small>${a}</small></div>`).join("")}</div><div class="chart-bottom"><span>Connected conversations up 18.6%</span><span class="green">Keep the momentum ↗</span></div></section><section class="card"><div class="card-head"><div><h3>Acquisition, with a little perspective</h3><p>Historical lead volume · Last 30 days</p></div>${I("chart-spline")}</div><div style="padding:16px 18px 12px 5px">${areaChart("month")}</div></section></div>${agentPerformance()}${campaignReport()}`}<div class="content-note">${I("info")} Historical charts are illustrative demo data. Export downloads the current filtered mock leads as CSV.</div>`
  );
}
function agentPerformance() {
  const as = S.role === "Agent" ? [D.agents[0]] : D.agents;
  return `<section class="card mb-16"><div class="card-head"><div><h3>Great conversations. Measurable impact.</h3><p>${S.role === "Agent" ? "Your" : "Agent"} performance · Current demo snapshot</p></div><button class="text-btn" data-action="export-performance">Download CSV ${I("download")}</button></div><div class="table-scroll"><table class="report-table"><thead><tr><th>Agent</th><th>Assigned leads</th><th>Calls made</th><th>Deals won</th><th>Conversion</th><th>Pipeline value</th><th>Performance</th></tr></thead><tbody>${as
    .map((a) => {
      const ls = D.leads.filter((l) => l.agent === a.id),
        won = ls.filter((l) => l.stage === "Won").length;
      return `<tr><td><span class="person">${av(a)}<b class="user-name">${a.name}</b></span></td><td>${ls.length}</td><td>${a.calls}</td><td>${won}</td><td><span class="green">${Math.round((won / (ls.length || 1)) * 100)}%</span></td><td>${money(ls.reduce((t, l) => t + l.value, 0))}</td><td><span class="badge ${a.calls > 40 ? "green" : "blue"}">${I(a.calls > 40 ? "trending-up" : "activity")} ${a.calls > 40 ? "Exceeding targets" : "On track"}</span></td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}
function campaignReport() {
  return `<section class="card mt-16"><div class="card-head"><div><h3>The campaigns creating possibility</h3><p>Illustrative historical performance · Attribution: 7-day click</p></div><span class="badge purple">Facebook Ads</span></div><div class="table-scroll"><table class="report-table"><thead><tr><th>Campaign</th><th>Ad spend</th><th>Leads</th><th>Cost per lead</th><th>Revenue attributed</th><th>Return on spend</th></tr></thead><tbody>${D.campaigns.map((c, i) => `<tr><td><div class="row"><span class="dot" style="color:${c.color}"></span><b class="user-name" style="font-size:12.5px">${c.short}</b></div></td><td>${money(c.budget)}</td><td>${[438, 318, 206, 146, 104, 72][i]}</td><td>PKR ${Math.round(c.budget / [438, 318, 206, 146, 104, 72][i])}</td><td>${money([2800000, 2100000, 1400000, 980000, 740000, 400000][i])}</td><td class="green"><b>${[15.6, 17.5, 15.6, 12.3, 5.3, 5.3][i]}×</b><span class="roi-meter"><span style="width:${[80, 90, 80, 65, 35, 35][i]}%"></span></span></td></tr>`).join("")}</tbody></table></div></section>`;
}
function renderCallAnalytics() {
  const calls = visibleLeads().flatMap((l) =>
    l.timeline.filter((t) => t.type === "call").map((t) => ({ ...t, lead: l })),
  );
  return `<div class="report-grid"><section class="card"><div class="card-head"><h3>Every conversation counts</h3><span class="badge green">Live demo call logs</span></div>${calls.length ? calls.map((c) => `<div class="task-row"><span class="activity-icon call">${I("phone")}</span><div class="flex-1"><button class="lead-name" data-action="open-lead" data-id="${c.lead.id}">${esc(c.lead.name)}</button><p class="task-sub">${esc(c.text)}</p></div><small>${timeShort(c.at)} PKT</small></div>`).join("") : `<div class="empty">${I("phone")}<h3>Start with a hello.</h3><p>Calls you log in this demo will appear here.</p>${button("Open calling workspace", "nav", "arrow-right", "btn-soft mt-16", 'data-route="workspace"')}</div>`}</section><section class="card"><div class="card-head"><h3>Historical call outcomes</h3><small>Sample data</small></div><div class="card-body">${[
    ["Connected", 72, "#8661e9"],
    ["No answer", 18, "#b8a0ed"],
    ["Busy", 6, "#edbd7a"],
    ["Invalid number", 4, "#e889ac"],
  ]
    .map(
      ([n, v, c]) =>
        `<div class="target-row"><div class="row"><span>${n}</span><b>${v}%</b></div><div class="progress"><span style="width:${v}%;background:${c}"></span></div></div>`,
    )
    .join("")}</div></section></div>`;
}
function renderIntegrations() {
  return (
    heading(
      "Your tools. Better together.",
      "Connect the dots between your campaigns, conversations, and customers.",
      button("Sync all", "sync", "refresh-cw", "btn-primary"),
      "CONNECTED WORKSPACE",
    ) +
    `<div class="role-banner">${I("shield-check")} This is a front-end integration preview. No Facebook, WhatsApp, or Google account is accessed.</div><div class="integration-grid">${[
      [
        "facebook",
        "Facebook Lead Ads",
        "Bring new possibilities straight into your pipeline. 3 pages and 6 lead forms, beautifully in sync.",
        "f",
        "",
      ],
      [
        "whatsapp",
        "WhatsApp Business",
        "Keep conversations going with quick templates and thoughtful, timely messages.",
        "message-circle",
        "wa",
      ],
      [
        "sheets",
        "Google Sheets",
        "Keep a familiar backup. Send new leads and status updates to your team’s spreadsheet.",
        "sheet",
        "sheet",
      ],
      [
        "webhook",
        "Webhooks & API",
        "Your workflow, your way. Connect custom tools with reliable event delivery.",
        "webhook",
        "webhook",
      ],
    ]
      .map(
        ([id, t, p, ic, cl]) =>
          `<section class="card integration-card"><div class="row between"><span class="integration-logo ${cl}">${id === "facebook" ? "f" : I(ic)}</span><span class="badge ${S.connections[id] ? "green" : "gray"}"><span class="dot"></span>${S.connections[id] ? "Connected" : "Not connected"}</span></div><h3>${t}</h3><p>${p}</p><div class="row between"><small style="font-size:12.5px">${id === "webhook" ? "99.9% delivery rate" : id === "facebook" ? "Last synced just now" : "Demo integration"}</small><button class="btn ${S.connections[id] ? "btn-outline" : "btn-soft"} btn-sm" data-action="integration" data-integration="${id}">${S.connections[id] ? "Manage" : "Connect"} ${I("arrow-up-right")}</button></div></section>`,
      )
      .join(
        "",
      )}</div><section class="card mt-24"><div class="card-head"><div><h3>Where your Facebook leads come from</h3><p>Connected pages & lead forms</p></div><button class="text-btn" data-action="connect-page">Add a page ${I("plus")}</button></div>${["Zain Properties · Lahore", "Zain Properties · Investments", "Zain Properties · Overseas", ...(S.extraPages || [])].map((p, i) => `<div class="connected-page"><span class="fb-logo">f</span><div class="flex-1"><h4>${esc(p)}</h4><p>${i < 3 ? "2 active forms · Auto-capture enabled" : "1 active form · Demo page"}</p></div><span class="badge ${S.connections.facebook ? "green" : "gray"}"><span class="dot"></span>${S.connections.facebook ? "Healthy" : "Disconnected"}</span><button class="btn btn-outline btn-sm" data-action="view-forms" data-page="${i}">View forms ${I("chevron-right")}</button></div>`).join("")}</section><section class="card mt-24"><div class="card-head"><div><h3>A reliable connection, behind the scenes.</h3><p>Webhook delivery monitor · Synthetic events</p></div><span class="badge green">All systems operational</span></div><div class="table-scroll"><table><thead><tr><th>Event</th><th>Delivery ID</th><th>Timestamp (PKT)</th><th>Response</th><th>Latency</th></tr></thead><tbody>${["lead.created", "lead.assigned", "lead.status_updated", "lead.created"].map((t, i) => `<tr><td><b style="font-weight:500">${t}</b></td><td style="font-family:monospace;color:var(--muted)">evt_nx_${9208 - i}</td><td>${timeShort(new Date(Date.now() - i * 76000))}</td><td><span class="badge green">200 OK</span></td><td>${[142, 98, 126, 108][i]}ms</td></tr>`).join("")}</tbody></table></div></section>`
  );
}
function renderSettings() {
  return (
    heading(
      "Make this space feel like yours.",
      "A few thoughtful preferences for a workspace that works the way you do.",
      "",
      "WORKSPACE SETTINGS",
    ) +
    `<div class="settings-layout"><nav class="settings-nav">${[
      ["profile", "Your profile"],
      ["workspace", "Workspace"],
      ["notifications", "Notifications"],
      ["appearance", "Appearance"],
    ]
      .map(
        ([id, t]) =>
          `<button class="${S.settingsTab === id ? "active" : ""}" data-action="settings-tab" data-tab="${id}">${t}</button>`,
      )
      .join("")}</nav><section class="card settings-form">${
      S.settingsTab === "profile"
        ? `<h3>A little about you</h3><p>How you show up in your team’s workspace.</p><div class="person mb-16">${av(current(), "lg")}<span class="badge purple">${S.role} demo</span></div><form id="profile-form"><div class="detail-grid"><div class="form-group"><label class="field-label">Full name</label><input class="field" name="name" value="${esc(current().name)}" required></div><div class="form-group"><label class="field-label">Display email (synthetic)</label><input class="field" name="email" type="email" value="${esc(current().email)}" required></div></div><div class="form-group"><label class="field-label">Job title</label><input class="field" name="title" value="${esc(current().title || S.role)}"></div><div class="form-group"><label class="field-label">Timezone</label><select class="field"><option>Asia/Karachi (UTC+05:00)</option></select><p class="form-help">All demo timestamps are displayed in Pakistan Standard Time (PKT).</p></div><button class="btn btn-primary" type="submit">Save preferences ${I("check")}</button></form>`
        : S.settingsTab === "workspace"
          ? `<h3>A shared place to grow</h3><p>Workspace-wide defaults for your team.</p><form id="workspace-form"><div class="form-group"><label class="field-label">Workspace name</label><input class="field" name="workspace" value="${esc(S.workspaceName || "Zain Properties")}" required></div><div class="detail-grid"><div class="form-group"><label class="field-label">Currency</label><select class="field"><option>PKR — Pakistani Rupee</option></select></div><div class="form-group"><label class="field-label">Response SLA</label><select class="field" name="sla"><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option></select></div></div><div class="alert-box mb-16">Demo preferences only. No billing, production routing, or security settings are changed.</div><button type="submit" class="btn btn-primary">Save workspace ${I("check")}</button></form>`
          : S.settingsTab === "appearance"
            ? `<h3>A different kind of clarity</h3><p>A light space for fresh ideas. A dark space for deep focus.</p><div class="grid-2">${["light", "dark"].map((t) => `<button class="card" style="padding:22px;text-align:center;border-color:${S.theme === t ? "var(--primary)" : "var(--border)"}" data-action="set-theme" data-theme="${t}"><div style="background:${t === "light" ? "#f4f3f9" : "#151522"};height:90px;border-radius:7px;display:flex;gap:7px;padding:10px;margin-bottom:15px"><div style="background:${t === "light" ? "white" : "#252435"};width:20%;border-radius:4px"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px"><div style="height:20%;border-radius:3px;background:${t === "light" ? "white" : "#252435"}"></div><div style="height:50%;border-radius:3px;background:#8962e455"></div></div></div>${I(t === "light" ? "sun" : "moon")} <b style="font-size:12.5px;margin-left:7px;text-transform:capitalize">${t} mode</b></button>`).join("")}</div>`
            : `<h3>Stay in the loop, not in the noise.</h3><p>Choose the updates that matter to your work.</p>${[
                [
                  "newleads",
                  "New lead assignments",
                  "Know when a new opportunity needs your attention.",
                ],
                [
                  "followups",
                  "Follow-up reminders",
                  "A gentle nudge before your next conversation.",
                ],
                [
                  "sla",
                  "SLA alerts",
                  "Stay ahead of response-time expectations.",
                ],
                [
                  "wins",
                  "Team milestones",
                  "Celebrate the wins, big and small.",
                ],
              ]
                .map(
                  ([id, t, p]) =>
                    `<div class="setting-row"><div><h4>${t}</h4><p>${p}</p></div><button class="switch ${S["notify_" + id] !== false ? "on" : ""}" data-action="notify-setting" data-setting="${id}" role="switch" aria-checked="${S["notify_" + id] !== false}" aria-label="${t}"></button></div>`,
                )
                .join("")}`
    }</section></div>`
  );
}
/* Reusable dialogs, simulated call session and local commands. */
function modal(title, sub, body, footer = "", wide = false) {
  lastFocus = document.activeElement;
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop" data-dismiss="modal"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><div><h2>${title}</h2><p>${sub}</p></div><button class="icon-btn" data-action="close-modal" aria-label="Close dialog">${I("x")}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}</section></div>`;
  icons();
  setTimeout(
    () =>
      $(
        ".modal input:not([type=hidden]),.modal select,.modal textarea,.modal button",
      )?.focus(),
    80,
  );
}
function closeModal() {
  if (S.call?.active) {
    toast("End the simulated call before closing.", true);
    return;
  }
  $("#modal-root").innerHTML = "";
  lastFocus?.focus?.();
}
function closePanels() {
  $("#panel-root").innerHTML = "";
  if (!S.call?.active) $("#modal-root").innerHTML = "";
}
function refresh() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
function assignModal(ids) {
  if (!canManage()) return;
  S.assignIds = ids;
  const rows = ids.map((id) => lead(id)).filter(Boolean);
  modal(
    ids.length > 1
      ? "A little teamwork starts here."
      : "Find the right person for this lead.",
    `Assign ${rows.length} ${rows.length === 1 ? "lead" : "leads"} to a teammate.`,
    `<form id="assign-form"><div class="form-group"><label class="field-label" for="assign-to">Assign to</label><select class="field" name="agent" id="assign-to" required>${options(
      D.agents.map((a) => [
        a.id,
        `${a.name} · ${a.team} · ${D.leads.filter((l) => l.agent === a.id).length} leads`,
      ]),
      rows.length === 1 ? rows[0].agent : "",
      "Choose a teammate",
    )}</select></div><div class="form-group"><label class="field-label">A little context (optional)</label><textarea class="field" name="note" placeholder="Share a helpful handover note..."></textarea></div><div class="alert-box">${rows
      .map((l) => esc(l.name))
      .slice(0, 4)
      .join(
        ", ",
      )}${rows.length > 4 ? ` and ${rows.length - 4} more` : ""}</div></form>`,
    button("Cancel", "close-modal") +
      '<button class="btn btn-primary" type="submit" form="assign-form">' +
      I("user-check") +
      " Assign " +
      (ids.length > 1 ? "leads" : "lead") +
      "</button>",
  );
}
function addLeadModal(stage = "New") {
  modal(
    "A new possibility.",
    "Add a lead to your demo pipeline.",
    `<form id="add-lead-form"><input type="hidden" name="stage" value="${esc(stage)}"><div class="detail-grid"><div class="form-group"><label class="field-label" for="new-name">Full name</label><input class="field" id="new-name" name="name" placeholder="e.g. Ahmed Raza" required maxlength="70"></div><div class="form-group"><label class="field-label" for="new-phone">Phone number</label><input class="field" id="new-phone" name="phone" placeholder="e.g. +92 300 0000000" required maxlength="25"></div></div><div class="form-group"><label class="field-label">Email address</label><input class="field" name="email" type="email" placeholder="ahmed@example.com"></div><div class="detail-grid"><div class="form-group"><label class="field-label">Campaign</label><select class="field" name="campaign">${options(D.campaigns.map((c) => [c.id, c.short]))}</select></div><div class="form-group"><label class="field-label">Deal value (PKR)</label><input class="field" type="number" min="0" max="1000000000" step="1000" name="value" value="450000" required></div></div><div class="detail-grid"><div class="form-group"><label class="field-label">City</label><input class="field" name="city" value="Lahore, PK" required></div><div class="form-group"><label class="field-label">Assign to</label><select class="field" name="agent" ${!canManage() ? "disabled" : ""}>${options(
      D.agents.map((a) => [a.id, a.name]),
      S.role === "Agent" ? "a1" : "",
      "Unassigned",
    )}</select></div></div><div class="content-note">${I("info")} Use synthetic contact details. This demo never contacts anyone.</div></form>`,
    button("Cancel", "close-modal") +
      '<button class="btn btn-primary" type="submit" form="add-lead-form">' +
      I("plus") +
      " Create lead</button>",
    true,
  );
}
function scheduleModal(id) {
  const dt = new Date(Date.now() + 3600000),
    local = localInputDate(dt);
  modal(
    "Give the next step a little space.",
    "A timely follow-up makes all the difference.",
    `<form id="schedule-form"><div class="form-group"><label class="field-label">Lead</label><select class="field" name="lead" required>${options(
      visibleLeads().map((l) => [String(l.id), l.name]),
      String(id || ""),
      "Choose a lead",
    )}</select></div><div class="form-group"><label class="field-label">What’s the next step?</label><input class="field" name="title" placeholder="e.g. Share payment plan and confirm site visit" required maxlength="120"></div><div class="detail-grid"><div class="form-group"><label class="field-label">When (PKT)</label><input class="field" type="datetime-local" name="due" value="${local}" required></div><div class="form-group"><label class="field-label">Priority</label><select class="field" name="priority"><option>Normal</option><option>High</option></select></div></div><div class="form-group"><label class="field-label">Helpful context (optional)</label><textarea class="field" name="note" placeholder="Anything you’d like to remember..."></textarea></div><p class="form-help">Dates are interpreted as Asia/Karachi (UTC+05:00). No real reminders are sent.</p></form>`,
    button("Cancel", "close-modal") +
      '<button class="btn btn-primary" type="submit" form="schedule-form">' +
      I("calendar-check") +
      " Schedule follow-up</button>",
  );
}
function localInputDate(date) {
  const d = new Date(new Date(date).getTime() + 5 * 3600000);
  return d.toISOString().slice(0, 16);
}
function logCallModal(id, duration = 0) {
  const l = lead(id);
  if (!l) return;
  S.callLead = id;
  S.callDuration = duration;
  modal(
    "A good conversation deserves context.",
    `Log your call with ${esc(l.name)}.`,
    `<form id="log-call-form"><div class="detail-grid"><div class="form-group"><label class="field-label">Call outcome</label><select name="outcome" class="field"><option>Connected · Interested</option><option>Connected · Follow up later</option><option>No answer</option><option>Busy</option><option>Not interested</option><option>Invalid number</option></select></div><div class="form-group"><label class="field-label">Duration (seconds)</label><input name="duration" class="field" type="number" min="0" max="86400" value="${duration}" required></div></div><div class="form-group"><label class="field-label">Update pipeline stage</label><select class="field" name="stage">${options(stages, l.stage === "New" ? "Contacted" : l.stage)}</select></div><div class="form-group"><label class="field-label">What did you learn?</label><textarea class="field" name="notes" placeholder="Budget, timeline, questions, or a little personal context..."></textarea></div><label class="row" style="font-size:12.5px;color:var(--secondary)"><input type="checkbox" name="followup"> Schedule a follow-up after saving</label></form>`,
    button("Cancel", "close-modal") +
      '<button class="btn btn-primary" type="submit" form="log-call-form">' +
      I("check") +
      " Save call log</button>",
  );
}
function startCall(id) {
  const l = lead(id);
  if (!l) return;
  if (S.call?.active) return;
  S.call = { id: l.id, start: Date.now(), active: true, muted: false };
  modal(
    "A little hello goes a long way.",
    "Simulated call · No phone number is dialed.",
    `<div class="call-person">${av({ name: l.name })}<h3>${esc(l.name)}</h3><p>${esc(l.phone)}</p></div><div class="call-status"><span class="dot pulse"></span> Connected · Demo call</div><div class="call-time" id="call-timer">00:00</div><div class="call-controls"><button data-action="call-mute" aria-label="Mute simulated call" title="Mute">${I("mic")}</button><button data-action="end-call" class="hangup" aria-label="End simulated call" title="End call">${I("phone-off")}</button><button data-action="call-speaker" aria-label="Toggle simulated speaker" title="Speaker">${I("volume-2")}</button></div><div class="call-note">No audio is recorded or transmitted.<br>End the call to add your notes and the next step.</div>`,
  );
  clearInterval(callInterval);
  callInterval = setInterval(() => {
    if (!S.call?.active) return;
    const sec = Math.floor((Date.now() - S.call.start) / 1000);
    const el = $("#call-timer");
    if (el)
      el.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }, 1000);
}
const messageTemplates = (l) => [
  {
    title: "A warm introduction",
    text: `Hi ${l.name.split(" ")[0]}! Thank you for your interest in ${campaign(l.campaign).short}. I’m ${current().name.split(" ")[0]} from Zain Properties. I’d love to help you find the right opportunity. Is now a good time for a quick conversation?`,
  },
  {
    title: "A thoughtful follow-up",
    text: `Hi ${l.name.split(" ")[0]}, just following up on our conversation about ${campaign(l.campaign).short}. Have you had a chance to review the details? Happy to answer any questions or walk you through the payment plan.`,
  },
  {
    title: "Invite to a site visit",
    text: `Hi ${l.name.split(" ")[0]}, seeing it in person makes all the difference. Would you like to book a private site visit for ${campaign(l.campaign).short} this week? Let me know a time that works for you.`,
  },
];
function whatsappModal(id, template = -1) {
  const l = lead(id);
  if (!l) return;
  S.messageLead = l.id;
  S.messageTemplate = template;
  modal(
    "Keep the conversation going.",
    "WhatsApp template preview · No message will be sent.",
    template < 0
      ? `<div class="content-note">${I("message-circle")} Choose a little help with your next message.</div>${messageTemplates(
          l,
        )
          .map(
            (t, i) =>
              `<button class="template-option" data-action="choose-template" data-id="${l.id}" data-template="${i}"><b>${t.title} ${I("arrow-up-right")}</b><p>${esc(t.text)}</p></button>`,
          )
          .join("")}`
      : `<div class="form-group"><label class="field-label">To: ${esc(l.name)} · ${esc(l.phone)}</label><textarea class="field" id="message-text" style="min-height:180px">${esc(messageTemplates(l)[template].text)}</textarea></div><div class="alert-box">Preview only. Copy the text if you’d like to use it elsewhere. This demo does not open WhatsApp or send a message.</div>`,
    template < 0
      ? button("Close", "close-modal")
      : button(
          "Back to templates",
          "whatsapp",
          "",
          "btn-outline",
          `data-id="${l.id}"`,
        ) + button("Copy message", "copy-message", "copy", "btn-primary"),
  );
}
function userModal(id = "") {
  const a =
    D.agents.find((a) => a.id === id) || S.users.find((a) => a.id === id);
  S.editUser = id;
  modal(
    a ? "A little update. A better fit." : "A new teammate. New possibilities.",
    a
      ? "Update this member’s demo profile."
      : "Add a member locally. No invitation email will be sent.",
    `<form id="user-form"><div class="form-group"><label class="field-label">Full name</label><input name="name" class="field" required maxlength="70" value="${esc(a?.name || "")}" placeholder="e.g. Mariam Shah"></div><div class="form-group"><label class="field-label">Email (synthetic)</label><input name="email" class="field" type="email" required value="${esc(a?.email || "")}" placeholder="mariam@example.com"></div><div class="detail-grid"><div class="form-group"><label class="field-label">Role</label><select name="role" class="field">${options(["Agent", "Manager", "Admin"], a?.role || "Agent")}</select></div><div class="form-group"><label class="field-label">Team</label><select name="team" class="field">${options(["Growth", "Enterprise"], a?.team || "Growth")}</select></div></div><div class="form-group"><label class="field-label">Status</label><select name="status" class="field"><option value="active" ${a?.online !== false ? "selected" : ""}>Active</option><option value="away" ${a?.online === false ? "selected" : ""}>Away</option></select></div></form>`,
    button("Cancel", "close-modal") +
      `<button class="btn btn-primary" type="submit" form="user-form">${I("check")} ${a ? "Save changes" : "Add member"}</button>`,
  );
}
function ruleConfig(id) {
  S.configRule = id;
  modal(
    "A little logic. A better flow.",
    "Configure your demo assignment strategy.",
    `<form id="rule-form">${id === "roundrobin" ? `<div class="alert-box mb-16">Leads rotate through eligible agents in order. Unavailable agents are ${S.autoAssign ? "excluded" : "included"}.</div><label class="field-label">Participating agents</label>${D.agents.map((a) => `<label class="row" style="padding:10px 0;font-size:12.5px"><input type="checkbox" name="agents" value="${a.id}" ${!(S.ruleAgents || D.agents.map((a) => a.id)).includes(a.id) ? "" : "checked"}>${av(a, "sm")} ${a.name}<small style="margin-left:auto">${a.online ? "Available" : "Away"}</small></label>`).join("")}` : id === "campaign" ? `<p class="form-help mb-16">Campaigns route to matching specialists. Other campaigns rotate across all available agents.</p>${D.campaigns.map((c) => `<div class="form-group"><label class="field-label">${c.short}</label><select class="field" name="${c.id}">${options(["Growth", "Enterprise"], (S.campaignTeams || {})[c.id] || (c.id === "c5" ? "Enterprise" : "Growth"))}</select></div>`).join("")}` : `<div class="form-group"><label class="field-label">Maximum active leads per agent</label><input class="field" name="max" type="number" min="1" max="100" value="${S.maxWorkload || 15}" required></div><p class="form-help">New leads go to the least-loaded eligible agent. Won and Lost leads don’t count toward active workload.</p>`}</form>`,
    button("Cancel", "close-modal") +
      '<button type="submit" form="rule-form" class="btn btn-primary">' +
      I("check") +
      " Save rule</button>",
  );
}
function runDistribution() {
  const type = Object.keys(S.ruleEnabled).find((k) => S.ruleEnabled[k]);
  if (!type) {
    toast("Choose an assignment strategy first.", true);
    return;
  }
  let pool = D.agents.filter(
    (a) =>
      (!S.autoAssign || a.online) &&
      (type !== "roundrobin" ||
        (S.ruleAgents || D.agents.map((a) => a.id)).includes(a.id)),
  );
  const unassigned = D.leads.filter((l) => !l.agent);
  let count = 0;
  unassigned.forEach((l, i) => {
    let eligible = pool;
    if (type === "campaign") {
      const team =
        (S.campaignTeams || {})[l.campaign] ||
        (l.campaign === "c5" ? "Enterprise" : "Growth");
      eligible = pool.filter((a) => a.team === team);
    }
    if (type === "workload")
      eligible = pool
        .filter(
          (a) =>
            D.leads.filter(
              (x) => x.agent === a.id && !["Won", "Lost"].includes(x.stage),
            ).length < (S.maxWorkload || 15),
        )
        .sort(
          (a, b) =>
            D.leads.filter(
              (x) => x.agent === a.id && !["Won", "Lost"].includes(x.stage),
            ).length -
            D.leads.filter(
              (x) => x.agent === b.id && !["Won", "Lost"].includes(x.stage),
            ).length,
        );
    const a = eligible[type === "workload" ? 0 : i % eligible.length];
    if (a) {
      l.agent = a.id;
      record(l, "assign", `Assigned to ${a.name} via ${type} routing`);
      count++;
    }
  });
  render();
  toast(
    count
      ? `${count} leads found their next teammate.`
      : "No eligible leads or available agents to assign.",
    !count,
  );
}
function integrationModal(id) {
  S.integration = id;
  const titles = {
    facebook: "Facebook Lead Ads",
    whatsapp: "WhatsApp Business",
    sheets: "Google Sheets",
    webhook: "Webhooks & API",
  };
  const active = S.connections[id];
  modal(
    `${titles[id]}, a little closer.`,
    active
      ? "Your demo connection is healthy."
      : "Preview a connected workflow. No account sign-in required.",
    `<div class="alert-box mb-16">Mock integration only. This preview doesn’t connect to an external service or store access tokens.</div>${id === "facebook" ? `<div class="answers"><div><small>Connected workspace</small><b>Zain Properties</b></div><div><small>Sync status</small><b class="green">${active ? "Healthy" : "Paused"}</b></div><div><small>Connected pages</small><b>${3 + (S.extraPages || []).length} demo pages</b></div><div><small>Active forms</small><b>6 demo forms</b></div></div>` : id === "webhook" ? `<label class="field-label">Demo endpoint (not sent)</label><input class="field" readonly value="https://example.com/webhooks/nexora"><div class="answers"><div><small>Events</small><b>lead.created, lead.updated</b></div><div><small>Last response</small><b class="green">200 OK · 142ms</b></div></div>` : id === "sheets" ? `<div class="form-group"><label class="field-label">Demo spreadsheet</label><input class="field" value="Zain Properties — Leads 2026" id="integration-target"></div><p class="form-help">Columns: Name, Phone, Campaign, Agent, Status, Value. Changes stay inside this prototype.</p>` : `<div class="form-group"><label class="field-label">Business display name</label><input class="field" value="Zain Properties" id="integration-target"></div><p class="form-help">Preview quick templates and follow-up messages. Sending is disabled in this front-end demo.</p>`}`,
    button("Close", "close-modal") +
      button(
        active ? "Disconnect demo" : "Connect demo",
        "toggle-integration",
        active ? "unplug" : "plug",
        active ? "btn-danger" : "btn-primary",
        `data-integration="${id}"`,
      ),
  );
}
function notifications() {
  if ($("#panel-root").innerHTML) {
    $("#panel-root").innerHTML = "";
    return;
  }
  const ls = visibleLeads();
  $("#panel-root").innerHTML =
    `<section class="side-panel" aria-label="Notifications"><div class="card-head"><div><h3>A little heads-up</h3><p>Your workspace notifications</p></div><button class="text-btn" data-action="mark-read">Mark all read</button></div>${[
      {
        title: "New opportunities are waiting.",
        text: `${ls.filter((l) => l.stage === "New").length} new leads need a thoughtful first hello.`,
        icon: "inbox",
        id: ls[0]?.id,
      },
      {
        title: "A timely follow-up makes a difference.",
        text: "You have follow-ups ready for your attention.",
        icon: "calendar-clock",
        route: "followups",
      },
      {
        title: "Your team is finding its rhythm.",
        text: "Conversion is up 4.2% this week. Keep going!",
        icon: "trending-up",
        route: "reports",
      },
    ]
      .map(
        (n) =>
          `<button class="notification-item ${S.notificationsRead ? "" : "unread"}" data-action="${n.id ? "open-lead" : "nav"}" ${n.id ? `data-id="${n.id}"` : `data-route="${n.route}"`} style="text-align:left;width:100%"><span class="activity-icon">${I(n.icon)}</span><span><p><b>${n.title}</b><br>${n.text}</p><small>A few moments ago · PKT</small></span></button>`,
      )
      .join(
        "",
      )}<div style="padding:14px 20px;font-size:12.5px;color:var(--muted)">You’re in a demo workspace. No real notifications are sent.</div></section>`;
  icons();
}
function commandPalette() {
  if (S.call?.active) {
    toast("Finish the demo call to search the workspace.", true);
    return;
  }
  modal("", "", "");
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop" data-dismiss="modal"><section class="modal command-modal" role="dialog" aria-modal="true" aria-label="Search workspace"><div class="command-input">${I("search")}<input placeholder="Find a lead, page, or next step..." id="command-input" autocomplete="off" aria-label="Search workspace"><button class="key" data-action="close-modal">ESC</button></div><div class="command-results" id="command-results"></div><div class="command-footer"><span>A little shortcut to your next step.</span><span>↑ ↓ to navigate · ↵ to open</span></div></section></div>`;
  commandResults("");
  icons();
  setTimeout(() => $("#command-input").focus(), 60);
}
function commandResults(q) {
  const str = q.toLowerCase(),
    nav = navGroups()
      .flatMap((g) => g.items)
      .filter(([r, t]) => t.toLowerCase().includes(str)),
    leads = visibleLeads()
      .filter((l) =>
        `${l.name} ${l.phone} ${l.email}`.toLowerCase().includes(str),
      )
      .slice(0, 6);
  $("#command-results").innerHTML =
    `${nav.length ? '<div class="command-label">GO SOMEWHERE</div>' : ""}${nav.map(([r, t, ic]) => `<button class="command-result" data-action="nav" data-route="${r}">${I(ic)}${t}<small>Open page ${I("arrow-up-right")}</small></button>`).join("")}${leads.length ? '<div class="command-label">FIND SOMEONE</div>' : ""}${leads.map((l) => `<button class="command-result" data-action="command-lead" data-id="${l.id}">${av({ name: l.name }, "sm")}<span>${esc(l.name)}</span><small>${l.stage} · ${campaign(l.campaign).short}</small></button>`).join("")}${!nav.length && !leads.length ? '<div class="empty">No matches yet. Try a name, phone, or page.</div>' : ""}`;
  icons();
}
function csvDownload(rows, name) {
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Your CSV export is ready. A little clarity, on the go.");
}
function exportLeads() {
  const ls = filteredLeads();
  csvDownload(
    [
      [
        "Lead ID",
        "Name",
        "Phone",
        "Email",
        "Campaign",
        "Status",
        "Score",
        "Assigned Agent",
        "Value PKR",
        "Created PKT",
      ],
      ...ls.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.email,
        campaign(l.campaign).name,
        l.stage,
        l.score,
        agent(l.agent)?.name || "Unassigned",
        l.value,
        dateShort(l.created) + " " + timeShort(l.created) + " PKT",
      ]),
    ],
    "nexora-leads.csv",
  );
}
function syncDemo(btn) {
  if (!S.connections.facebook) {
    toast(
      "Facebook demo connection is paused. Reconnect it in Integrations.",
      true,
    );
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = I("refresh-cw", "spin") + " Syncing...";
    icons();
  }
  setTimeout(() => {
    if (btn?.isConnected) {
      btn.disabled = false;
      btn.innerHTML = I("refresh-cw") + " Sync now";
      icons();
    }
    toast("All caught up. Your 6 demo lead forms are in sync.");
  }, 900);
}
/* Event delegation keeps every view interactive without a framework. */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    if (e.target.matches('[data-dismiss="modal"]')) closeModal();
    else if (
      !e.target.closest(".side-panel") &&
      !e.target.closest('[data-action="notifications"]')
    )
      $("#panel-root").innerHTML = "";
    return;
  }
  const act = el.dataset.action,
    id = el.dataset.id;
  switch (act) {
    case "noop":
      break;
    case "logout":
      if (!S.rememberRole) S.loginRole = "Admin";
      closePanels();
      go("login");
      break;
    case "menu":
      $(".sidebar").classList.toggle("open");
      if ($(".sidebar").classList.contains("open")) {
        const sh = document.createElement("div");
        sh.className = "mobile-shade";
        sh.dataset.action = "close-menu";
        document.body.append(sh);
      } else $(".mobile-shade")?.remove();
      break;
    case "close-menu":
      $(".sidebar").classList.remove("open");
      $(".mobile-shade")?.remove();
      break;
    case "nav":
      go(el.dataset.route);
      break;
    case "profile":
      S.settingsTab = "profile";
      go("settings");
      break;
    case "theme":
      setTheme(S.theme === "light" ? "dark" : "light");
      break;
    case "set-theme":
      setTheme(el.dataset.theme);
      break;
    case "search":
      commandPalette();
      break;
    case "close-modal":
      closeModal();
      break;
    case "lead-back":
      go(S.leadReturn || "leads");
      break;
    case "lead-stage":
      setStage(lead(S.leadId), el.dataset.stage);
      refresh();
      break;
    case "change-stage":
      modal(
        "Keep the opportunity moving.",
        "Update the lead’s pipeline stage.",
        `<label class="field-label" for="detail-status">Pipeline stage</label><select class="field" id="detail-status">${options(stages, lead(S.leadId).stage)}</select>`,
        button("Done", "close-modal", "check", "btn-primary"),
      );
      break;
    case "email-preview":
      emailPreview(Number(id));
      break;
    case "copy-email":
      copyLocalText($("#email-body").value);
      break;
    case "add-tag": {
      const l = lead(S.leadId),
        input = $("#new-tag"),
        t = input.value.trim();
      if (t) {
        l.tags = l.tags || [];
        if (!l.tags.includes(t)) l.tags.push(t);
        refresh();
        toast("Lead tag added.");
      }
      break;
    }
    case "remove-tag": {
      const l = lead(S.leadId);
      l.tags = (l.tags || []).filter((t) => t !== el.dataset.tag);
      refresh();
      break;
    }
    case "toggle-password": {
      const p = $("#login-password");
      p.type = p.type === "password" ? "text" : "password";
      el.innerHTML = I(p.type === "password" ? "eye" : "eye-off");
      el.setAttribute(
        "aria-label",
        p.type === "password" ? "Show password" : "Hide password",
      );
      icons();
      break;
    }
    case "open-lead":
      $("#panel-root").innerHTML = "";
      openLead(id);
      break;
    case "command-lead":
      closeModal();
      openLead(id);
      break;
    case "next-lead":
    case "previous-lead": {
      const ls = visibleLeads(),
        i = ls.findIndex((l) => l.id === S.leadId);
      openLead(
        ls[(i + (act === "next-lead" ? 1 : -1) + ls.length) % ls.length].id,
      );
      break;
    }
    case "detail-tab":
      S.detailTab = el.dataset.tab;
      refresh();
      break;
    case "lead-tab":
      S.leadTab = el.dataset.tab;
      S.page = 1;
      S.selected.clear();
      render();
      break;
    case "lead-view":
      S.leadView = el.dataset.view;
      render();
      break;
    case "period":
      S.period = el.dataset.period;
      render();
      break;
    case "hot-leads":
      S.leadTab = "hot";
      resetFilters();
      go("leads");
      break;
    case "sla-leads":
      S.leadTab = "sla";
      resetFilters();
      go("leads");
      break;
    case "reset-filters":
      resetFilters();
      render();
      break;
    case "page":
      S.page = Number(el.dataset.page);
      render();
      break;
    case "sort-leads":
      D.leads.reverse();
      render();
      toast("Lead order updated.");
      break;
    case "clear-selected":
      S.selected.clear();
      render();
      break;
    case "bulk-assign":
      assignModal([...S.selected]);
      break;
    case "assign-lead":
      assignModal([Number(id)]);
      break;
    case "bulk-status":
      modal(
        "A little progress, together.",
        "Update the pipeline stage for " + S.selected.size + " selected leads.",
        `<form id="bulk-status-form"><label class="field-label">Pipeline stage</label><select class="field" name="stage">${options(stages)}</select></form>`,
        button("Cancel", "close-modal") +
          '<button class="btn btn-primary" type="submit" form="bulk-status-form">Update leads</button>',
      );
      break;
    case "add-lead":
      addLeadModal(el.dataset.stage || "New");
      break;
    case "resolve-duplicate":
      lead(id).duplicate = false;
      record(
        lead(id),
        "comment",
        "Possible duplicate reviewed and marked unique.",
      );
      refresh();
      toast("Lead marked as unique.");
      break;
    case "call":
      startCall(Number(id));
      break;
    case "call-mute":
      S.call.muted = !S.call.muted;
      el.classList.toggle("active", S.call.muted);
      el.innerHTML = I(S.call.muted ? "mic-off" : "mic");
      el.setAttribute(
        "aria-label",
        S.call.muted ? "Unmute simulated call" : "Mute simulated call",
      );
      icons();
      break;
    case "call-speaker":
      el.classList.toggle("active");
      toast(
        el.classList.contains("active")
          ? "Demo speaker enabled."
          : "Demo speaker disabled.",
      );
      break;
    case "end-call": {
      const c = S.call;
      clearInterval(callInterval);
      const duration = Math.max(1, Math.floor((Date.now() - c.start) / 1000));
      c.active = false;
      S.call = null;
      D.agents[0].calls++;
      logCallModal(c.id, duration);
      break;
    }
    case "log-call":
      logCallModal(Number(id));
      break;
    case "schedule":
      scheduleModal(id ? Number(id) : S.leadId);
      break;
    case "complete-task": {
      const t = D.tasks.find((t) => t.id === Number(id));
      t.done = !t.done;
      if (t.done)
        record(taskLead(t), "task", `Completed follow-up: ${t.title}`);
      refresh();
      toast(
        t.done
          ? "One thoughtful follow-up. One step forward."
          : "Follow-up reopened.",
      );
      break;
    }
    case "task-tab":
      S.taskTab = el.dataset.tab;
      S.calendarDate = "";
      render();
      break;
    case "task-view":
      S.taskView = el.dataset.view;
      render();
      break;
    case "calendar-prev":
      S.calendarOffset--;
      render();
      break;
    case "calendar-next":
      S.calendarOffset++;
      render();
      break;
    case "calendar-day":
      S.calendarDate = el.dataset.date;
      S.taskView = "list";
      render();
      break;
    case "clear-task-date":
      S.calendarDate = "";
      render();
      break;
    case "whatsapp":
      whatsappModal(Number(id));
      break;
    case "choose-template":
      whatsappModal(Number(id), Number(el.dataset.template));
      break;
    case "copy-message": {
      const text = $("#message-text").value;
      try {
        if (navigator.clipboard?.writeText)
          await navigator.clipboard.writeText(text);
        else {
          const ta = $("#message-text");
          ta.select();
          if (!document.execCommand("copy")) throw Error("copy");
        }
        toast("Message copied. Nothing has been sent.");
      } catch {
        toast("Select and copy the preview text with Ctrl+C.", true);
        $("#message-text").select();
      }
      break;
    }
    case "template-preview": {
      const l = visibleLeads()[0];
      if (l) whatsappModal(l.id, Number(el.dataset.template));
      else toast("Add a lead to personalize your template.", true);
      break;
    }
    case "skip-queue":
      S.skipIds = S.skipIds || [];
      S.skipIds.push(Number(id));
      render();
      toast("A little later. Showing the next opportunity.");
      break;
    case "call-history":
      S.reportTab = "calls";
      go("reports");
      break;
    case "add-user":
      userModal();
      break;
    case "edit-user":
      userModal(id);
      break;
    case "agent-leads":
      S.agent = id;
      S.leadTab = "all";
      S.query = "";
      S.status = "";
      S.campaign = "";
      S.date = "";
      S.page = 1;
      go("leads");
      break;
    case "team-leadership":
      modal(
        "A little direction. A shared vision.",
        "Your demo leadership team.",
        `<div class="person mb-16">${av({ name: "Muhammad Zain" })}<div><b class="user-name">Muhammad Zain</b><small style="display:block;margin-top:5px">Admin · Workspace owner</small></div></div><div class="person">${av({ name: "Ali Hassan", color: "blue" })}<div><b class="user-name">Ali Hassan</b><small style="display:block;margin-top:5px">Manager · Sales operations</small></div></div>`,
        button("Close", "close-modal"),
      );
      break;
    case "rule-toggle": {
      const r = el.dataset.rule,
        enabled = !S.ruleEnabled[r];
      Object.keys(S.ruleEnabled).forEach((k) => (S.ruleEnabled[k] = false));
      S.ruleEnabled[r] = enabled;
      render();
      toast(
        enabled
          ? "Assignment strategy updated."
          : "Assignment strategy paused.",
      );
      break;
    }
    case "rule-config":
      ruleConfig(el.dataset.rule);
      break;
    case "run-distribution":
      runDistribution();
      break;
    case "sla-toggle":
      S.slaEnabled = !S.slaEnabled;
      render();
      toast("SLA preference updated.");
      break;
    case "auto-toggle":
      S.autoAssign = !S.autoAssign;
      render();
      break;
    case "report-tab":
      S.reportTab = el.dataset.tab;
      render();
      break;
    case "report-range":
      modal(
        "A little perspective over time.",
        "Historical charts in this prototype show an illustrative 30-day period.",
        `<div class="alert-box">Chart date-range switching is a visual preview. Current lead data is available through CSV export.</div><div class="mt-16">${button("Export current leads", "export-leads", "download", "btn-soft")}</div>`,
        button("Got it", "close-modal"),
      );
      break;
    case "date-picker":
      modal(
        "Your week, at a glance.",
        "Dashboard snapshot · Illustrative historical metrics.",
        `<p class="secondary" style="font-size:12.5px;line-height:1.9">The overview shows a sample weekly performance snapshot. Use the 7D / 30D toggle on Lead acquisition to explore both views, or filter live demo leads by date.</p><div class="mt-16">${button("Explore lead filters", "nav", "filter", "btn-soft", 'data-route="leads"')}</div>`,
        button("Close", "close-modal"),
      );
      break;
    case "export":
    case "export-leads":
      exportLeads();
      break;
    case "export-performance": {
      const as = S.role === "Agent" ? [D.agents[0]] : D.agents;
      csvDownload(
        [
          ["Agent", "Team", "Leads", "Calls", "Won", "Revenue PKR"],
          ...as.map((a) => {
            const ls = D.leads.filter((l) => l.agent === a.id);
            return [
              a.name,
              a.team,
              ls.length,
              a.calls,
              ls.filter((l) => l.stage === "Won").length,
              ls
                .filter((l) => l.stage === "Won")
                .reduce((t, l) => t + l.value, 0),
            ];
          }),
        ],
        "nexora-agent-performance.csv",
      );
      break;
    }
    case "integration":
      integrationModal(el.dataset.integration);
      break;
    case "toggle-integration": {
      const id = el.dataset.integration;
      S.connections[id] = !S.connections[id];
      closeModal();
      render();
      toast(
        S.connections[id]
          ? "Demo connection is ready. No live account was accessed."
          : "Demo integration disconnected.",
      );
      break;
    }
    case "sync":
      syncDemo(el);
      break;
    case "connect-page":
      modal(
        "Another source of possibility.",
        "Add a synthetic Facebook page to the demo workspace.",
        `<form id="page-form"><label class="field-label">Demo page name</label><input class="field" name="name" placeholder="e.g. Zain Properties · Islamabad" required maxlength="70"><p class="form-help">No Facebook permission or account access is requested.</p></form>`,
        button("Cancel", "close-modal") +
          '<button class="btn btn-primary" type="submit" form="page-form">Add demo page</button>',
      );
      break;
    case "view-forms": {
      const i = Number(el.dataset.page);
      modal(
        "Small forms. Big possibilities.",
        "Lead forms for this demo Facebook page.",
        `${D.campaigns
          .slice((i % 3) * 2, (i % 3) * 2 + 2)
          .map(
            (c) =>
              `<div class="template-option"><div class="row between"><b>${esc(c.form)}</b><span class="badge green">Active</span></div><p>${esc(c.name)}<br>${D.leads.filter((l) => l.campaign === c.id).length} demo leads captured</p></div>`,
          )
          .join("")}`,
        button("Close", "close-modal"),
      );
      break;
    }
    case "settings-tab":
      S.settingsTab = el.dataset.tab;
      render();
      break;
    case "notify-setting":
      S["notify_" + el.dataset.setting] =
        S["notify_" + el.dataset.setting] === false;
      render();
      toast("Notification preference saved for this session.");
      break;
    case "notifications":
      notifications();
      break;
    case "mark-read":
      S.notificationsRead = true;
      $("#panel-root").innerHTML = "";
      refresh();
      toast("A little quieter. All notifications marked read.");
      break;
    case "help":
      modal(
        "A little help, right on time.",
        "Your guide to the Nexora demo workspace.",
        `<div class="help-grid"><div class="help-item"><b>⌘ / Ctrl + K</b>Find any lead, page, or next step.</div><div class="help-item"><b>Escape</b>Close an open dialog.</div><div class="help-item"><b>Switch roles</b>Use the top bar to explore Admin, Manager, and Agent views.</div><div class="help-item"><b>Move a lead</b>Drag pipeline cards, or change stage in a lead’s details.</div></div><div class="alert-box mt-16">Front-end demo only. All edits live in memory and reset on refresh. Calls, integrations and messages are simulated.</div>`,
        button("Got it", "close-modal", "", "btn-primary"),
      );
      break;
    case "ai-info":
      modal(
        "A little intelligence. A human advantage.",
        "AI-style suggestions, thoughtfully placed.",
        `<div class="help-grid"><div class="help-item"><b>${I("sparkles")} Next best action</b>Contextual conversation starters based on lead intent.</div><div class="help-item"><b>${I("flame")} Lead scoring</b>Know which opportunities deserve a timely hello.</div><div class="help-item"><b>${I("copy")} Duplicate detection</b>A little heads-up before you double the outreach.</div><div class="help-item"><b>${I("timer")} SLA awareness</b>Keep your first response timely and thoughtful.</div></div><p class="form-help mt-16">Suggestions are rule-based demo text, not a connected AI service.</p>`,
        button(
          "Explore leads",
          "nav",
          "arrow-right",
          "btn-primary",
          'data-route="leads"',
        ),
      );
      break;
    case "pipeline-guide":
      modal(
        "Every stage is a step forward.",
        "A simple guide to a thoughtful sales journey.",
        stages
          .map(
            (s, i) =>
              `<div class="row" style="padding:11px 0;border-bottom:1px solid var(--border)"><span class="dot" style="color:${stageColors[i]}"></span><b style="font-size:12.5px;min-width:85px">${s}</b><small>${["Fresh from a campaign. Say a warm hello.", "You’ve made the first connection.", "A genuine interest. Understand their needs.", "Keep the conversation moving.", "Find a solution that works for everyone.", "A shared success. Celebrate the milestone.", "Not this time. Learn, and keep growing."][i]}</small></div>`,
          )
          .join(""),
        button("Let’s go", "close-modal", "", "btn-primary"),
      );
      break;
  }
});
function resetFilters() {
  S.query = "";
  S.status = "";
  S.campaign = "";
  S.agent = "";
  S.date = "";
  S.page = 1;
  S.selected.clear();
}
function resetViewState() {
  resetFilters();
  S.leadTab = "all";
  S.leadView = "table";
  S.leadId = null;
  S.taskTab = "today";
  S.taskView = "list";
  S.calendarDate = "";
  S.reportTab = "overview";
  S.skipIds = [];
  closePanels();
}
function setTheme(theme) {
  S.theme = theme;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("nexora-theme", theme);
  } catch {
    /* Some private/file browser modes block storage; theme still works in memory. */
  }
  if (S.route === "login") renderLogin();
  else refresh();
}
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "login-role") {
    S.loginRole = el.value;
    $("#login-role-hint").textContent = roleHint(el.value);
    return;
  }
  if (el.id === "role-switch") {
    const wasLead = S.route === "lead";
    S.role = el.value;
    S.loginRole = S.role;
    resetViewState();
    if (wasLead || ["team", "distribution", "integrations"].includes(S.route))
      go("dashboard");
    else render();
    toast(`Now exploring as ${S.role}.`);
    return;
  }
  if (el.dataset.select) {
    const id = Number(el.dataset.select);
    el.checked ? S.selected.add(id) : S.selected.delete(id);
    render();
    return;
  }
  if (el.id === "select-all") {
    filteredLeads().forEach((l) =>
      el.checked ? S.selected.add(l.id) : S.selected.delete(l.id),
    );
    render();
    return;
  }
  if (el.id.startsWith("filter-")) {
    S[el.id.slice(7)] = el.value;
    S.page = 1;
    render();
    return;
  }
  if (el.id === "page-size") {
    S.pageSize = Number(el.value);
    S.page = 1;
    render();
    return;
  }
  if (el.id === "detail-status") {
    setStage(lead(S.leadId), el.value);
    refresh();
    return;
  }
  if (el.id === "detail-agent" && canManage()) {
    const l = lead(S.leadId);
    l.agent = el.value;
    record(
      l,
      "assign",
      el.value
        ? `Assigned to ${agent(el.value).name}`
        : "Lead moved to unassigned queue",
    );
    refresh();
    toast("Assignment updated.");
    return;
  }
  if (el.id === "team-filter") {
    S.teamFilter = el.value;
    render();
    return;
  }
});
let searchDebounce;
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "command-input") {
    commandResults(el.value);
    return;
  }
  if (el.id === "lead-search" || el.id === "team-search") {
    clearTimeout(searchDebounce);
    const pos = el.selectionStart;
    searchDebounce = setTimeout(() => {
      const id = el.id;
      if (id === "lead-search") {
        S.query = el.value;
        S.page = 1;
      } else S.teamQuery = el.value;
      render();
      const input = $("#" + id);
      input?.focus();
      input?.setSelectionRange(pos, pos);
    }, 160);
  }
});
document.addEventListener("submit", (e) => {
  const form = e.target;
  if (!form.id) return;
  e.preventDefault();
  const f = new FormData(form),
    v = Object.fromEntries(f.entries());
  switch (form.id) {
    case "login-form": {
      S.rememberRole = Boolean(v.remember);
      S.role = v.role;
      S.loginRole = v.role;
      form.reset();
      resetViewState();
      go("dashboard");
      toast(`Welcome to your ${S.role.toLowerCase()} workspace.`);
      break;
    }
    case "comment-form": {
      const text = v.comment?.trim();
      if (!text) return;
      record(
        lead(S.leadId),
        S.detailTab === "notes" ? "note" : "comment",
        text,
      );
      refresh();
      toast("Your note is part of the story now.");
      break;
    }
    case "assign-form": {
      const a = agent(v.agent);
      if (!a) return;
      S.assignIds.forEach((id) => {
        const l = lead(id);
        l.agent = a.id;
        record(
          l,
          "assign",
          `Assigned to ${a.name}${v.note.trim() ? " · " + v.note.trim() : ""}`,
        );
      });
      S.selected.clear();
      closeModal();
      refresh();
      toast(
        `${S.assignIds.length} ${S.assignIds.length === 1 ? "lead assigned" : "leads assigned"} to ${a.name}.`,
      );
      break;
    }
    case "bulk-status-form": {
      let n = 0;
      S.selected.forEach((id) => {
        const l = lead(id);
        if (l) {
          const old = l.stage;
          l.stage = v.stage;
          record(l, "status", `Stage changed from ${old} → ${v.stage}`);
          n++;
        }
      });
      S.selected.clear();
      closeModal();
      refresh();
      toast(`${n} leads moved to ${v.stage}.`);
      break;
    }
    case "add-lead-form": {
      const id = Math.max(...D.leads.map((l) => l.id)) + 1,
        name = v.name.trim();
      if (!name) return;
      const score = 73,
        created = new Date().toISOString();
      const l = {
        id,
        name,
        email:
          v.email || name.toLowerCase().replaceAll(" ", ".") + "@example.com",
        phone: v.phone,
        city: v.city,
        campaign: v.campaign,
        agent: S.role === "Agent" ? "a1" : v.agent || "",
        stage: v.stage,
        score,
        temp: "Warm",
        value: Number(v.value),
        created,
        duplicate: D.leads.some(
          (x) => x.phone.replace(/\s/g, "") === v.phone.replace(/\s/g, ""),
        ),
        source: "Facebook",
        company: "New prospect",
        budget: "To be discussed",
        interest: "Investment property",
        purchase: "Exploring options",
        timeline: [],
      };
      D.leads.unshift(l);
      record(l, "new", "Lead added manually to the demo workspace.");
      closeModal();
      refresh();
      openLead(id);
      toast("A new possibility. Lead created.");
      break;
    }
    case "schedule-form": {
      const l = lead(v.lead);
      if (!l) return;
      const due = new Date(v.due + ":00+05:00").toISOString();
      D.tasks.push({
        id: Math.max(0, ...D.tasks.map((t) => t.id)) + 1,
        lead: l.id,
        title: v.title.trim(),
        due,
        priority: v.priority,
        done: false,
        note: v.note,
      });
      record(
        l,
        "task",
        `Follow-up scheduled: ${v.title} · ${dateShort(due)}, ${timeShort(due)} PKT${v.note ? " · " + v.note : ""}`,
      );
      closeModal();
      refresh();
      toast("The next step has a little space in your day.");
      break;
    }
    case "log-call-form": {
      const l = lead(S.callLead);
      const duration = Math.max(0, Number(v.duration));
      record(
        l,
        "call",
        `${v.outcome} · ${Math.floor(duration / 60)}m ${duration % 60}s${v.notes ? "\n" + v.notes : ""}`,
      );
      if (l.stage !== v.stage) {
        const old = l.stage;
        l.stage = v.stage;
        record(l, "status", `Stage changed from ${old} → ${v.stage}`);
      }
      closeModal();
      refresh();
      toast("Conversation logged. Context kept.");
      if (v.followup) scheduleModal(l.id);
      break;
    }
    case "user-form": {
      const a =
        D.agents.find((a) => a.id === S.editUser) ||
        S.users.find((a) => a.id === S.editUser);
      const info = {
        name: v.name.trim(),
        initials: initials(v.name),
        email: v.email,
        role: v.role,
        team: v.team,
        online: v.status === "active",
      };
      if (a) Object.assign(a, info);
      else {
        const user = {
          ...info,
          id: "u" + Date.now(),
          color: "teal",
          calls: 0,
          target: 60,
        };
        S.users.push(user);
        if (v.role === "Agent") {
          D.agents.push(user);
          S.users = S.users.filter((u) => u.id !== user.id);
        }
      }
      closeModal();
      render();
      toast(
        a
          ? "Member profile updated."
          : "A new teammate. A warm welcome. No email was sent.",
      );
      break;
    }
    case "rule-form":
      if (S.configRule === "roundrobin") {
        S.ruleAgents = f.getAll("agents");
        if (!S.ruleAgents.length) {
          toast("Choose at least one participating agent.", true);
          return;
        }
      } else if (S.configRule === "campaign") S.campaignTeams = v;
      else S.maxWorkload = Number(v.max);
      closeModal();
      render();
      toast("A little logic, saved.");
      break;
    case "profile-form":
      S.profile = S.profile || {};
      S.profile[S.role] = {
        ...current(),
        name: v.name,
        email: v.email,
        title: v.title,
        initials: initials(v.name),
      };
      toast("Profile preferences saved for this demo session.");
      render();
      break;
    case "workspace-form":
      S.workspaceName = v.workspace;
      S.workspaceSla = v.sla;
      toast("Workspace preferences saved for this demo session.");
      render();
      break;
    case "page-form":
      S.extraPages = S.extraPages || [];
      S.extraPages.push(v.name.trim());
      closeModal();
      render();
      toast("A new demo page is ready. No Facebook access was requested.");
      break;
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    commandPalette();
    return;
  }
  if (e.key === "Escape") {
    if ($("#modal-root").innerHTML) closeModal();
    else if ($("#panel-root").innerHTML) $("#panel-root").innerHTML = "";
    else {
      $(".sidebar")?.classList.remove("open");
      $(".mobile-shade")?.remove();
    }
    return;
  }
  if ($("#command-input")) {
    const results = $$(".command-result");
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      let i = results.indexOf(document.activeElement);
      results[
        (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length
      ]?.focus();
    } else if (
      e.key === "Enter" &&
      document.activeElement === $("#command-input")
    ) {
      e.preventDefault();
      results[0]?.click();
    }
  }
  const dialog = $(".modal");
  if (e.key === "Tab" && dialog) {
    const fs = $$(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,a[href],[tabindex="0"]',
      dialog,
    ).filter((el) => el.offsetParent !== null);
    if (fs.length) {
      const first = fs[0],
        last = fs[fs.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  if (e.key === "Enter" && e.target.id === "new-tag") {
    e.preventDefault();
    $('[data-action="add-tag"]')?.click();
  }
  if (e.key === "Enter" && e.target.matches(".kanban-card"))
    openLead(e.target.dataset.id);
});
window.addEventListener("hashchange", () => {
  $(".mobile-shade")?.remove();
  render();
  window.scrollTo(0, 0);
});
document.documentElement.dataset.theme = S.theme;
render();
