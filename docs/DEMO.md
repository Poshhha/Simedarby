# A complete RUANGKITA demonstration

Use sample records only. A single browser is sufficient: sign out and choose the next prepared identity at each role change. Separate browser profiles can also exercise the shared server, but identities and data remain deliberately public demonstration fixtures.

## Rehearsal setup

Run `npm ci`, `npm run build` and `npm start`, or use `npm run dev` during development. Verify that an activity action succeeds, not only that the homepage loads. Use a new `DATABASE_PATH` if you need an untouched rehearsal; do not delete a database containing work you want to keep.

For a recording, choose a future weekend in Malaysia time and a slot that does not overlap the seeded Lyra activity. Every proposal, venue confirmation and cost in this walkthrough is simulated.

## Suggested recording: under five minutes

**0:00–0:35 — Discover a real place.** Show the RUANGKITA discovery page and select Bandar Bukit Raja. Open the Lyra communal park entry. Point to the official source, verification date and residents-only access label. Explain that a listing does not grant access or a booking.

**0:35–1:35 — Turn an idea into a proposal.** Choose the Maya resident identity and create an activity. Use a clear title such as “Saturday Badminton Buddies” and a description of at least 20 characters. Select Badminton, Bandar Bukit Raja and Lyra communal park. Choose “Illustrative court A — simulated schedule” so conflict validation applies. Set a future start and end in MYT, a minimum of **2** and maximum of **12**. Choose participant cost-sharing with an illustrative total of **RM120**. The initial estimate is **RM60 per participant** based on the minimum; RM120 divided by 12 would be RM10 if twelve paying participants registered. Acknowledge the simulation and submit.

**1:35–2:10 — Review, then confirm separately.** Switch to Township team. Open Administration and approve the new proposal. Show that approval leaves it pending facility confirmation. Confirm the simulated venue arrangement as a separate step. A conflicting exclusive slot is rejected; choose a different time if this rehearsal clashes. This workflow is not official permission from Sime Darby Property or the venue.

**2:10–2:45 — Join as a different resident.** Switch to Daniel. Find the approved activity and register. Read and acknowledge the restricted-facility demo eligibility statement. Daniel's home township must match Bandar Bukit Raja. Show the registration reference, capacity decreasing and saved illustrative contribution. Refresh the page to demonstrate persistence. Joining gives **zero** RuangPoints.

**2:45–3:35 — Verify attendance and complete.** Switch back to Maya, who owns this newly created proposal. Open Organizer workspace and its participant controls. Verify Daniel's attendance and complete the activity. The prototype allows early attendance simulation for presentation; it is not a real-world check-in. Repeating the same attendance request cannot duplicate an award.

**3:35–4:15 — Show the outcomes.** Switch to Daniel and view RuangPoints. A first badminton attendance earns **30 points**: 20 for verified attendance plus the first-activity bonus of 10. If Daniel already attended an earlier rehearsal event, expect 20 instead. Maya receives 30 organizer points on completion. Switch to Township team and show the completed event and verified attendance in the database-derived dashboard.

**4:15–4:40 — Close honestly.** State that this prototype connects documented places to resident demand and participation. Its identities, event records, funding and venue schedules are demonstrations. It has no live payment collection, real booking integration, official sponsorship or redeemable reward partnership.

## Acceptance checklist

These are checks to perform; this list alone is not a test result.

- [ ] The built homepage loads and each primary navigation route works.
- [ ] Township selection filters the relevant content; mobile navigation remains usable.
- [ ] Facility entries show official source links, verification dates and honest access/pricing labels.
- [ ] Choosing a demo identity creates a session; signing out removes its access.
- [ ] A resident can submit a valid proposal and see it in their organizer workspace.
- [ ] Bad times, participant limits and negative or fractional-sen costs are rejected.
- [ ] A resident cannot approve activities or manage another organizer's participants through the API.
- [ ] Administrator approval and simulated venue confirmation remain separate actions.
- [ ] Overlapping exclusive simulated resources are blocked; adjacent slots and non-exclusive areas are allowed.
- [ ] Registering changes the database count and survives refresh/server restart with the same database.
- [ ] Duplicate registration is rejected; full activities waitlist rather than exceed capacity.
- [ ] Cancelling a registration promotes the next waitlisted participant where applicable.
- [ ] Restricted facilities require matching demo township and explicit eligibility confirmation.
- [ ] Cost estimates use integer sen and previous recorded participant estimates are preserved.
- [ ] Joining gives no points; authorized attendance verification does, exactly once.
- [ ] A sustainability category adds its bonus; cancellation retains ledger history with reversals.
- [ ] Completing an event requires verified attendance and awards the organizer once.
- [ ] Statistics reflect stored events, registrations and verified attendance.
- [ ] `npm run build`, `npm test` and `npm run test:e2e` complete successfully for the current code.
- [ ] The deployed website is checked separately using its actual public address.
- [ ] The submitted repository is accessible to reviewers and the recording stays below five minutes.

## Useful edge-case rehearsal

For capacity testing, create a free activity with a maximum of one participant. Register Maya, then Daniel: Daniel should be waitlisted. Cancel Maya's registration and verify Daniel is promoted. Use an unrestricted or matching-township demonstration venue.

For booking conflicts, create two proposals using the same exclusive illustrative resource and overlapping times. Approve both; only one simulated venue confirmation should succeed. A non-exclusive park area can overlap. These tests say nothing about real venue availability.

Avoid altering a confirmed event's financial basis during a recording. Sponsorship decisions must be resolved before registration for a sponsorship-funded sample activity. Participant contributions are illustrative, recorded once, and never real charges.
