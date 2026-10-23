import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { createApp } from "../server/app.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(
  process.env.SCREENSHOT_DIR || join(root, "artifacts", "sample-pictures"),
);
if (!existsSync(join(root, "dist", "index.html"))) {
  throw new Error(
    "Build the frontend first with npm run build, or use npm run screenshots.",
  );
}
const temporary = await mkdtemp(join(tmpdir(), "ruangkita-picture-fixture-"));
const runtimeErrors = [];
const captures = [];
let server;
let browser;
let application;

function apiClient(base) {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.headers.get("set-cookie")) {
      cookie = response.headers.get("set-cookie").split(";")[0];
    }
    const result = await response.json();
    if (!response.ok)
      throw new Error(`${method} ${path}: ${result.error || response.status}`);
    return result;
  };
}

async function signIn(page, base, name) {
  await page.goto(base + "/login");
  await page.getByRole("button", { name: new RegExp(name, "i") }).click();
  await expect(page.locator(".sidebar-user")).toContainText(name);
}

async function capture(page, filename, title, description, fullPage = true) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".boot-state")).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (image) => image.decode()));
  });
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 7000 });
  await page.screenshot({
    path: join(output, filename),
    fullPage,
    animations: "disabled",
    caret: "hide",
  });
  captures.push({
    filename,
    title,
    description,
    width: page.viewportSize().width,
    fullPage,
  });
}

try {
  await mkdir(output, { recursive: true });
  application = createApp({ dbPath: join(temporary, "pictures.sqlite") });
  server = await new Promise((accept, reject) => {
    const listener = application.app.listen(0, "127.0.0.1", () =>
      accept(listener),
    );
    listener.once("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const installedChromium =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    headless: true,
    ...(installedChromium ? { executablePath: installedChromium } : {}),
  });
  async function pageFor(viewport = { width: 1440, height: 1000 }) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    return page;
  }
  const visitor = await pageFor();
  await visitor.goto(base);
  await expect(
    visitor.getByRole("heading", { name: /Your township/ }),
  ).toBeVisible();
  await expect(visitor.locator(".activity-card")).toHaveCount(3);
  await capture(
    visitor,
    "01-home-desktop.png",
    "Discover your community",
    "Desktop discovery page with the source-backed township directory and clearly labelled sample activities.",
  );

  const mobile = await pageFor({ width: 390, height: 844 });
  await mobile.goto(base);
  await expect(
    mobile.getByRole("heading", { name: /Your township/ }),
  ).toBeVisible();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await capture(
    mobile,
    "02-home-mobile.png",
    "Community on a smaller screen",
    "The actual 390 × 844 mobile viewport; this is the first screen, rather than a stretched full-page image.",
    false,
  );

  await visitor.goto(base + "/facilities/lyra-park");
  await expect(
    visitor.getByRole("heading", { name: "Lyra communal park", exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole("link", { name: "Read official source", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://www.simedarbyproperty.com/bandar-bukit-raja/lyra/",
  );
  await capture(
    visitor,
    "03-facility-access.png",
    "Know the space before you make plans",
    "Lyra communal park’s documented amenities, source metadata and residents-only access conditions. A directory entry is not a booking.",
  );

  const maya = await pageFor();
  await signIn(maya, base, "Maya");
  await maya.goto(base + "/create");
  await maya
    .getByLabel("Activity title", { exact: true })
    .fill("Saturday badminton with neighbours");
  await maya
    .getByLabel("What do you have in mind?")
    .fill(
      "A friendly sample badminton session for neighbours. Bring a racquet and enjoy a relaxed morning together. Venue and costs are simulated.",
    );
  await maya.getByRole("button", { name: "Continue", exact: true }).click();
  await maya
    .getByRole("combobox", { name: "Township", exact: true })
    .selectOption("bandar-bukit-raja");
  await maya
    .getByRole("combobox", { name: "Proposed facility", exact: true })
    .selectOption("lyra-park");
  await maya
    .getByRole("combobox", { name: /^Demonstration venue slot/ })
    .selectOption("lyra-demo-court");
  await maya.getByRole("button", { name: "Continue", exact: true }).click();
  await maya.getByLabel(/^Start date and time/).fill("2030-06-08T10:00");
  await maya.getByLabel(/^End date and time/).fill("2030-06-08T11:30");
  await maya.getByLabel("Minimum participants", { exact: true }).fill("2");
  await maya.getByLabel("Maximum participants", { exact: true }).fill("12");
  await maya.getByRole("button", { name: "Continue", exact: true }).click();
  await maya.getByRole("radio", { name: /Participant cost-sharing/ }).check();
  await maya.getByLabel(/^Estimated total cost \(RM\)/).fill("120.00");
  await expect(
    maya.getByText(/RM\s?60\.00 estimated per participant/),
  ).toBeVisible();
  await capture(
    maya,
    "04-proposal-cost-sharing.png",
    "Keep the costs clear",
    "The working proposal form calculates an illustrative RM60 per person from RM120 and a minimum of two paying participants. No money is collected.",
  );

  const residentApi = apiClient(base);
  const organizerApi = apiClient(base);
  const mayaApi = apiClient(base);
  await residentApi("/session", "POST", { profile_id: "resident-2" });
  await organizerApi("/session", "POST", { profile_id: "organizer-1" });
  await mayaApi("/session", "POST", { profile_id: "resident-1" });
  const joined = await residentApi(
    "/activities/activity-badminton/registrations",
    "POST",
    { eligibility_confirmed: true },
  );
  expect(joined.registration.registration_status).toBe("registered");
  let residentData = await residentApi("/bootstrap");
  expect(
    residentData.points.reduce(
      (total, entry) => total + entry.points_change,
      0,
    ),
  ).toBe(0);
  const daniel = await pageFor();
  await signIn(daniel, base, "Daniel");
  await daniel.goto(base + "/activities/activity-badminton");
  await expect(
    daniel.getByText("You’re on the list!", { exact: true }),
  ).toBeVisible();
  await expect(
    daniel.getByText(`Reference: ${joined.registration.reference}`, {
      exact: true,
    }),
  ).toBeVisible();
  await capture(
    daniel,
    "05-persisted-registration.png",
    "A real prototype registration",
    "Daniel’s registration was stored in the isolated SQLite database and has its own reference. Joining alone has awarded zero points.",
  );

  await organizerApi("/activities/activity-badminton/attendance", "POST", {
    user_id: "resident-2",
  });
  const aina = await pageFor();
  await signIn(aina, base, "Aina");
  await aina.goto(base + "/organizer");
  const badmintonCard = aina.locator(".manage-card").filter({
    has: aina.getByRole("link", {
      name: "Weekend badminton, better together",
      exact: true,
    }),
  });
  await badmintonCard
    .getByRole("button", { name: "Manage participants", exact: true })
    .click();
  await expect(
    badmintonCard
      .getByRole("row")
      .filter({ hasText: "Daniel" })
      .getByText("Verified", { exact: true }),
  ).toBeVisible();
  await capture(
    aina,
    "06-organizer-attendance.png",
    "Show up, then verify",
    "The organizer view shows Daniel’s stored registration and verified demo attendance. Verification is simulated for this local rehearsal.",
  );
  await organizerApi("/activities/activity-badminton/complete", "POST");
  residentData = await residentApi("/bootstrap");
  expect(
    residentData.points.reduce(
      (total, entry) => total + entry.points_change,
      0,
    ),
  ).toBe(30);
  await daniel.goto(base + "/profile?tab=rewards");
  await expect(
    daniel.getByRole("heading", { name: "30 RuangPoints", exact: true }),
  ).toBeVisible();
  await expect(
    daniel.getByText("Verified Demo Attendance", { exact: true }),
  ).toBeVisible();
  await expect(
    daniel.getByText("First Verified Activity Bonus", { exact: true }),
  ).toBeVisible();
  await capture(
    daniel,
    "07-verified-rewards.png",
    "Points for participating",
    "Daniel’s ledger contains 20 points for verified attendance and a 10-point first-activity bonus. These prototype points have no monetary value.",
  );

  const proposal = await mayaApi("/activities", "POST", {
    title: "Neighbourhood badminton mornings",
    description:
      "A sample proposal to bring neighbours together for a friendly weekend match. All venue arrangements and contributions are illustrative.",
    category: "Badminton",
    target_audience: "Demo residents of Bandar Bukit Raja",
    age_suitability: "Adults 18+",
    township_id: "bandar-bukit-raja",
    facility_id: "lyra-park",
    facility_resource_id: "lyra-demo-court",
    start_time: "2030-06-09T02:00:00.000Z",
    end_time: "2030-06-09T03:30:00.000Z",
    minimum_participants: 2,
    maximum_participants: 12,
    funding_model: "cost_sharing",
    total_estimated_cost_sen: 12000,
    organizer_contribution_sen: 0,
    sponsorship_amount_sen: 0,
  });
  await residentApi(`/activities/${proposal.activity.id}/interest`, "POST");
  await organizerApi(`/activities/${proposal.activity.id}/interest`, "POST");
  const administrator = await pageFor();
  await signIn(administrator, base, "Township team");
  await administrator.goto(base + "/admin");
  await expect(
    administrator.locator(".stat").filter({ hasText: "Completed activities" }),
  ).toContainText("1");
  await expect(
    administrator.locator(".stat").filter({ hasText: "Verified attendance" }),
  ).toContainText("1");
  await expect(
    administrator.getByRole("link", {
      name: "Neighbourhood badminton mornings",
      exact: true,
    }),
  ).toBeVisible();
  await capture(
    administrator,
    "08-admin-demand.png",
    "Turn neighbour interest into action",
    "The dashboard reflects actual fixture actions: one completed event, one verified attendee and a pending proposal with two unique supporters.",
  );

  await visitor.goto(base + "/townships");
  await expect(visitor.locator(".township-card")).toHaveCount(6);
  await capture(
    visitor,
    "09-township-explorer.png",
    "Explore the six townships",
    "The township explorer links documented facilities and community activity ideas across six real townships. Park visuals are illustrative.",
  );

  await visitor.goto(base + "/activities");
  await expect(
    visitor.getByRole("heading", {
      name: "Find your people. Do your thing.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(visitor.locator(".activity-card")).toHaveCount(3);
  await capture(
    visitor,
    "10-activity-explorer.png",
    "Find an activity together",
    "The searchable activity explorer shows three open sample events after the completed badminton fixture closes. Filters, capacity and cost labels reflect stored demonstration records.",
  );

  expect(runtimeErrors, "Browser runtime errors during sample capture").toEqual(
    [],
  );
  const recordedAt =
    new Date().toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      dateStyle: "long",
      timeStyle: "short",
    }) + " MYT";
  const note =
    "Actual screenshots of RUANGKITA running only on localhost with an isolated temporary SQLite database. No public hosting deployment was created. Accounts, participation, payments, venue confirmations and rewards are demonstrations. The existing workspace database was not changed.";
  await writeFile(
    join(output, "README.md"),
    `# RUANGKITA sample pictures\n\n${note}\n\nCaptured: ${recordedAt}.\n\n${captures.map((item, index) => `${index + 1}. [${item.title}](${item.filename}) — ${item.description}`).join("\n")}\n\nAll ${captures.length} captures completed with no browser runtime errors. The isolated fixture database and server are removed when capture ends.\n`,
  );
  await writeFile(
    join(output, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RUANGKITA · Local sample pictures</title><style>body{margin:0;background:#f5f7f5;color:#14283f;font:15px/1.7 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:40px 24px}h1{font-size:36px;line-height:1.2;letter-spacing:-1px}header p{max-width:900px;color:#52645a}small{color:#6a786f}section{margin:38px 0;background:white;border:1px solid #dce4dc;border-radius:12px;padding:24px}h2{margin:0 0 8px;font-size:23px}section p{color:#617265}a{color:#9f4328}img{display:block;max-width:100%;height:auto;margin:20px auto 0;border:1px solid #e4e9e3;border-radius:8px}img.mobile{max-width:390px}@media(max-width:600px){main{padding:24px 14px}h1{font-size:28px}section{padding:16px}h2{font-size:20px}}</style></head><body><main><header><small>LOCALHOST ONLY · WORKING PROTOTYPE CAPTURES</small><h1>RUANGKITA sample pictures</h1><p>${note}</p><small>Captured ${recordedAt}. All ${captures.length} captures completed without browser runtime errors.</small></header>${captures.map((item, index) => `<section><h2>${String(index + 1).padStart(2, "0")} · ${item.title}</h2><p>${item.description}</p><a href="${item.filename}" download>Download original PNG</a><img class="${item.width < 700 ? "mobile" : ""}" src="${item.filename}" alt="${item.title}" loading="lazy"></section>`).join("")}</main></body></html>`,
  );
  console.log(
    `Captured ${captures.length} actual localhost screenshots in ${output}.`,
  );
  console.log(
    "Gallery: index.html; descriptions: README.md; browser runtime errors: 0.",
  );
  for (const item of captures) console.log(item.filename);
} finally {
  await browser?.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  application?.close();
  await rm(temporary, { recursive: true, force: true });
}
