import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, name: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name, "i") }).click();
  await expect(page.locator(".sidebar-user")).toContainText(name);
}

// Every role has a separate cookie jar. The same SQLite API must persist and share
// changes; a frontend-only state mutation cannot satisfy this journey.
test("resident proposal → admin review → registration → verified attendance → points ledger", async ({
  browser,
}) => {
  const proposerContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const participantContext = await browser.newContext();
  const proposer = await proposerContext.newPage();
  const admin = await adminContext.newPage();
  const participant = await participantContext.newPage();
  const runtimeErrors: string[] = [];
  for (const p of [proposer, admin, participant])
    p.on("pageerror", (e) => runtimeErrors.push(e.message));

  try {
    await signIn(proposer, "Maya");
    await proposer.goto("/create");
    const title = "Neighbourhood Badminton · browser journey";
    await proposer.getByLabel("Activity title").fill(title);
    await proposer
      .getByLabel("What do you have in mind?")
      .fill(
        "A friendly demonstration match for neighbours. Bring your own racquet and join us for an easy morning of badminton.",
      );
    await proposer
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    await proposer
      .getByRole("combobox", { name: "Township", exact: true })
      .selectOption("bandar-bukit-raja");
    await proposer
      .getByRole("combobox", { name: "Proposed facility", exact: true })
      .selectOption("lyra-park");
    await proposer
      .getByRole("combobox", { name: /^Demonstration venue slot/ })
      .selectOption("lyra-demo-court");
    await expect(
      proposer.getByText("A proposal is not a booking.", { exact: true }),
    ).toBeVisible();
    await proposer
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    const day = new Date(Date.now() + 9 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    await proposer.getByLabel(/^Start date and time/).fill(day + "T10:00");
    await proposer.getByLabel(/^End date and time/).fill(day + "T11:00");
    await proposer
      .getByLabel("Minimum participants", { exact: true })
      .fill("2");
    await proposer
      .getByLabel("Maximum participants", { exact: true })
      .fill("2");
    await proposer
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    await proposer
      .getByRole("radio", { name: /Participant cost-sharing/ })
      .check();
    await proposer.getByLabel(/^Estimated total cost \(RM\)/).fill("120.00");
    await expect(
      proposer.getByText(/RM\s?60\.00 estimated per participant/),
    ).toBeVisible();
    await proposer
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await proposer
      .getByRole("checkbox", { name: /I understand this is a sample proposal/ })
      .check();
    await proposer
      .getByRole("button", { name: "Submit proposal", exact: true })
      .click();
    await expect(proposer).toHaveURL(/\/organizer$/);
    const activityLink = proposer.getByRole("link", {
      name: title,
      exact: true,
    });
    await expect(activityLink).toBeVisible();
    const activityPath = await activityLink.getAttribute("href");
    expect(activityPath).toMatch(/^\/activities\/.+/);

    await signIn(admin, "Township team");
    await admin.goto("/admin");
    const reviewCard = admin
      .locator(".manage-card")
      .filter({ has: admin.getByRole("link", { name: title, exact: true }) });
    await reviewCard
      .getByLabel("Review note")
      .fill(
        "Sample proposal reviewed. Venue access remains a separate demonstration check.",
      );
    await reviewCard
      .getByRole("button", { name: "Approve proposal", exact: true })
      .click();
    await expect(
      reviewCard.getByText("Pending Facility Confirmation", { exact: true }),
    ).toBeVisible();
    await reviewCard
      .getByRole("button", {
        name: "Confirm simulated venue & open registration",
        exact: true,
      })
      .click();
    await expect(reviewCard).toHaveCount(0);

    await signIn(participant, "Daniel");
    await participant.goto(activityPath!);
    await expect(
      participant.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      participant.getByText("0 / 2 registered", { exact: true }),
    ).toBeVisible();
    await participant
      .getByRole("button", { name: "Count me in", exact: true })
      .click();
    const dialog = participant.getByRole("dialog");
    await expect(
      dialog.getByRole("button", {
        name: "Confirm sample registration",
        exact: true,
      }),
    ).toBeDisabled();
    await dialog
      .getByRole("checkbox", { name: /I understand the access conditions/ })
      .check();
    await dialog
      .getByRole("button", { name: "Confirm sample registration", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      participant.getByText("1 / 2 registered", { exact: true }),
    ).toBeVisible();
    await expect(
      participant.getByText("You’re on the list!", { exact: true }),
    ).toBeVisible();
    await expect(participant.getByText(/Reference: RK-/)).toBeVisible();

    // Persisted registration survives a full page reload; joining earns no points.
    await participant.reload();
    await expect(
      participant.getByText("You’re on the list!", { exact: true }),
    ).toBeVisible();
    await participant.goto("/profile?tab=rewards");
    await expect(participant.locator(".sidebar-points")).toContainText(
      "0 RuangPoints",
    );

    await proposer.goto("/organizer");
    const ownCard = proposer
      .locator(".manage-card")
      .filter({
        has: proposer.getByRole("link", { name: title, exact: true }),
      });
    await ownCard
      .getByRole("button", { name: "Manage participants", exact: true })
      .click();
    const participantRow = ownCard
      .getByRole("row")
      .filter({ hasText: "Daniel" });
    await participantRow
      .getByRole("button", { name: "Verify demo attendance", exact: true })
      .click();
    await expect(
      participantRow.getByText("Verified", { exact: true }),
    ).toBeVisible();
    await expect(
      participantRow.getByRole("button", {
        name: "Verify demo attendance",
        exact: true,
      }),
    ).toHaveCount(0);
    proposer.once("dialog", (dialog) => dialog.accept());
    await ownCard
      .getByRole("button", { name: "Complete activity", exact: true })
      .click();
    await expect(ownCard.getByText("Completed", { exact: true })).toBeVisible();
    await expect(proposer.locator(".sidebar-points")).toContainText(
      "30 RuangPoints",
    );

    await participant.goto("/profile?tab=rewards");
    await expect(participant.locator(".sidebar-points")).toContainText(
      "30 RuangPoints",
    );
    await expect(
      participant.getByText(/^Verified demo attendance$/i),
    ).toBeVisible();
    await expect(
      participant.getByText(/^First verified activity bonus$/i),
    ).toBeVisible();
    await participant.reload();
    await expect(participant.locator(".sidebar-points")).toContainText(
      "30 RuangPoints",
    );
    await expect(
      participant.getByText(/^Verified demo attendance$/i),
    ).toHaveCount(1);

    await admin.goto("/admin");
    const completedStat = admin
      .locator(".stat")
      .filter({ hasText: "Completed activities" });
    await expect(completedStat).toContainText("1");
    await expect(
      admin.getByText("Activity Completed", { exact: true }),
    ).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  } finally {
    await Promise.all([
      proposerContext.close(),
      adminContext.close(),
      participantContext.close(),
    ]);
  }
});

test("mobile navigation, township filtering and facility source/access information work at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors: string[] = [];
  page.on("pageerror", (e) => runtimeErrors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your township/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Explore facilities", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "A space for your next idea.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Selected township", { exact: true })
    .selectOption("bandar-bukit-raja");
  await expect(page.locator(".facility-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Lyra communal park", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lyra communal park", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Before you visit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read official source", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://www.simedarbyproperty.com/bandar-bukit-raja/lyra/",
  );
  await expect(
    page.locator(".facility-info dd").filter({ hasText: /^22 Oct 2026$/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  expect(runtimeErrors).toEqual([]);
});
