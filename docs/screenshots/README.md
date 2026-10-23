# RUANGKITA — 10 individual screenshots

These PNGs show the working localhost prototype with the larger interface text. Accounts, activities, venue confirmations, costs, attendance and points are demonstration records. No public deployment was created.

After pulling the repository in VS Code, open `docs/screenshots` to find the images directly on your computer. On Windows, run `explorer .\docs\screenshots` from the project terminal. No ZIP extraction is needed.

1. [Desktop homepage](01-home-desktop.png)
2. [Mobile homepage](02-home-mobile.png)
3. [Facility details and access conditions](03-facility-access.png)
4. [Activity proposal and cost sharing](04-proposal-cost-sharing.png)
5. [Confirmed sample registration](05-persisted-registration.png)
6. [Organizer attendance verification](06-organizer-attendance.png)
7. [RuangPoints and participation ledger](07-verified-rewards.png)
8. [Administration and community demand](08-admin-demand.png)
9. [Township explorer](09-township-explorer.png)
10. [Activity explorer](10-activity-explorer.png)

To regenerate the sample pictures, run `npm run screenshots` with Playwright Chromium installed. That command uses a temporary database and writes new captures to `artifacts/sample-pictures/`, preserving your existing demo records.
